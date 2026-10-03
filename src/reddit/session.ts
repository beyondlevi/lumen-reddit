// The token_v2 the client sends, and its renewal through the session Worker
// (worker/index.mjs) when reddit_session is configured.
import type {Renewal} from '../config/lumenConfig';
import {RedditError} from './client';

/** Renew this long before the token's own expiry. */
export const RENEW_MARGIN_MS = 10 * 60 * 1000;
const RENEW_TIMEOUT_MS = 20_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type Credentials = {
  /** A token for the next request, renewed first when it is missing or about to expire. */
  token(): Promise<string>;
  /** Whether a rejected token can be replaced. */
  readonly canRenew: boolean;
  /** Gets a new token now (after Reddit rejected the current one). */
  renew(): Promise<string>;
};

/** A fixed token_v2: when it ends, the person pastes a new one. */
export function fixedToken(token: string): Credentials {
  return {token: async () => token, canRenew: false, renew: () => Promise.reject(new RedditError('auth', 401))};
}

/**
 * token_v2 renewed from reddit_session. One renewal runs at a time; every
 * request waiting for a token shares it.
 */
export class RenewingToken implements Credentials {
  readonly canRenew = true;
  private current: string | null;
  private expiresAt: number | null;
  private pending: Promise<string> | null = null;
  private readonly renewal: Renewal;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;

  constructor(
    renewal: Renewal,
    initial: {token: string | null; expiresAt: number | null},
    fetchImpl: FetchLike = (input, init) => fetch(input, init),
    now: () => number = Date.now,
  ) {
    this.renewal = renewal;
    this.current = initial.token;
    this.expiresAt = initial.expiresAt;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  /** When the token in use ends, in ms, when known. */
  get expiry(): number | null {
    return this.expiresAt;
  }

  async token(): Promise<string> {
    const fresh = this.current != null && (this.expiresAt == null || this.expiresAt - this.now() > RENEW_MARGIN_MS);
    return fresh ? (this.current as string) : this.renew();
  }

  renew(): Promise<string> {
    this.pending ??= this.fetchToken().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async fetchToken(): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RENEW_TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetchImpl(this.renewal.url, {
        method: 'POST',
        // text/plain keeps the session out of any URL and logs.
        headers: {'Content-Type': 'text/plain', 'X-Renew-Key': this.renewal.key},
        body: this.renewal.session,
        credentials: 'omit',
        signal: controller.signal,
      });
    } catch {
      throw new RedditError('network');
    } finally {
      clearTimeout(timer);
    }
    const body = (await response.json().catch(() => ({}))) as {token?: unknown; expiresAt?: unknown; error?: unknown};
    if (response.ok && typeof body.token === 'string' && body.token) {
      this.current = body.token;
      this.expiresAt = typeof body.expiresAt === 'number' ? body.expiresAt : null;
      return body.token;
    }
    if (response.status === 401) {
      // Reddit sent no token_v2: reddit_session ended (or was signed out).
      throw new RedditError('auth', 401);
    }
    // A wrong key, a blocked or failing Reddit: the renewal itself is broken.
    throw new RedditError('renewal', response.status);
  }
}
