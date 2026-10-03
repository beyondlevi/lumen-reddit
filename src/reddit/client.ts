// Reddit API client. The session's token_v2 goes in an Authorization header to
// oauth.reddit.com, which answers cross-origin requests (Access-Control-Allow-
// Origin: *, Authorization allowed), so the app needs no proxy. The token is
// never put in a URL, a log line or an error message.
import {
  parseAccount,
  parseInbox,
  parsePostListing,
  parseSubreddits,
  parseThread,
} from './parse';
import type {Account, FeedSort, InboxItem, Listing, Post, Subreddit, Thread, Vote} from './types';

export type RedditErrorKind = 'network' | 'auth' | 'ratelimit' | 'notfound' | 'forbidden' | 'server';

export class RedditError extends Error {
  readonly kind: RedditErrorKind;
  readonly status: number | null;
  /** For `ratelimit`: seconds until the window resets, when the server said. */
  readonly retryAfter: number | null;

  constructor(kind: RedditErrorKind, status: number | null = null, retryAfter: number | null = null) {
    super(`Reddit request failed: ${kind}${status != null ? ` (HTTP ${status})` : ''}`);
    this.name = 'RedditError';
    this.kind = kind;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** Where a feed's posts come from. */
export type FeedSource =
  | {kind: 'home'}
  | {kind: 'popular'}
  | {kind: 'subreddit'; name: string; sort: FeedSort};

export function feedKey(source: FeedSource): string {
  return source.kind === 'subreddit' ? `r/${source.name.toLowerCase()}/${source.sort}` : source.kind;
}

/** The API path of a feed. */
export function feedPath(source: FeedSource): string {
  return source.kind === 'home'
    ? '/best'
    : source.kind === 'popular'
      ? '/r/popular/hot'
      : `/r/${encodeURIComponent(source.name)}/${source.sort}`;
}

/** What the screens need from Reddit; the demo client implements it too. */
export interface RedditApi {
  account(): Promise<Account>;
  feed(source: FeedSource, after?: string | null): Promise<Listing<Post>>;
  thread(postId: string): Promise<Thread>;
  subscriptions(after?: string | null): Promise<Listing<Subreddit>>;
  inbox(after?: string | null): Promise<Listing<InboxItem>>;
  vote(fullname: string, direction: Vote): Promise<void>;
  setSaved(fullname: string, saved: boolean): Promise<void>;
  markRead(fullname: string): Promise<void>;
}

export const PAGE_SIZE = 25;
const COMMENT_LIMIT = 60;
const COMMENT_DEPTH = 4;
const TIMEOUT_MS = 20_000;

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Rate limit state from the X-Ratelimit-* headers of the last answer. */
export type RateLimit = {remaining: number; resetAt: number};

/**
 * Requests kept in reserve: below this the client waits for the window to
 * reset. Reddit answers an exhausted window with a 429 that carries no CORS
 * headers, which a browser reports as a network failure, so the app has to
 * stop before it gets there.
 */
export const RATE_LIMIT_RESERVE = 3;

export class RedditClient implements RedditApi {
  private readonly token: string;
  private readonly base: string;
  private readonly fetchImpl: FetchLike;
  rateLimit: RateLimit | null = null;

  constructor(token: string, base: string, fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
    this.token = token;
    this.base = base.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
  }

  private url(path: string, params: Record<string, string | number | null | undefined> = {}): string {
    const url = new URL(`${this.base}${path}`);
    url.searchParams.set('raw_json', '1');
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /** The wait left in an exhausted window, in seconds, or null when requests may go. */
  private waitForWindow(reserve: number): number | null {
    const limit = this.rateLimit;
    if (!limit || Date.now() >= limit.resetAt || limit.remaining >= reserve) {
      return null;
    }
    return Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
  }

  private async request(url: string, init: RequestInit = {}): Promise<unknown> {
    // Votes and saves may use the reserve; reading may not.
    const wait = this.waitForWindow(init.method === 'POST' ? 1 : RATE_LIMIT_RESERVE);
    if (wait != null) {
      throw new RedditError('ratelimit', 429, wait);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
        credentials: 'omit',
        headers: {Authorization: `Bearer ${this.token}`, ...(init.headers ?? {})},
      });
    } catch {
      // A 429 arrives without CORS headers and looks like a network failure.
      const wait = this.waitForWindow(RATE_LIMIT_RESERVE + 1);
      throw wait != null ? new RedditError('ratelimit', 429, wait) : new RedditError('network');
    } finally {
      clearTimeout(timer);
    }
    this.readRateLimit(response.headers);
    if (!response.ok) {
      throw this.errorFor(response);
    }
    try {
      return await response.json();
    } catch {
      throw new RedditError('server', response.status);
    }
  }

  private readRateLimit(headers: Headers): void {
    const remaining = Number.parseFloat(headers.get('x-ratelimit-remaining') ?? '');
    const reset = Number.parseFloat(headers.get('x-ratelimit-reset') ?? '');
    if (Number.isFinite(remaining) && Number.isFinite(reset)) {
      this.rateLimit = {remaining, resetAt: Date.now() + reset * 1000};
    }
  }

  private errorFor(response: Response): RedditError {
    const status = response.status;
    if (status === 401) {
      return new RedditError('auth', status);
    }
    if (status === 429) {
      const reset = Number.parseFloat(response.headers.get('x-ratelimit-reset') ?? response.headers.get('retry-after') ?? '');
      return new RedditError('ratelimit', status, Number.isFinite(reset) ? Math.ceil(reset) : null);
    }
    if (status === 403) {
      return new RedditError('forbidden', status);
    }
    if (status === 404) {
      return new RedditError('notfound', status);
    }
    return new RedditError('server', status);
  }

  private async post(path: string, form: Record<string, string>): Promise<void> {
    await this.request(this.url(path), {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams(form).toString(),
    });
  }

  async account(): Promise<Account> {
    const account = parseAccount(await this.request(this.url('/api/v1/me')));
    if (!account) {
      throw new RedditError('auth');
    }
    return account;
  }

  async feed(source: FeedSource, after?: string | null): Promise<Listing<Post>> {
    const path = feedPath(source);
    const params = {limit: PAGE_SIZE, after, sr_detail: 1, t: source.kind === 'subreddit' && source.sort === 'top' ? 'day' : null};
    return parsePostListing(await this.request(this.url(path, params)));
  }

  async thread(postId: string): Promise<Thread> {
    const json = await this.request(
      this.url(`/comments/${encodeURIComponent(postId)}`, {limit: COMMENT_LIMIT, depth: COMMENT_DEPTH, sort: 'confidence', sr_detail: 1}),
    );
    const thread = parseThread(json);
    if (!thread) {
      throw new RedditError('notfound');
    }
    return thread;
  }

  async subscriptions(after?: string | null): Promise<Listing<Subreddit>> {
    return parseSubreddits(await this.request(this.url('/subreddits/mine/subscriber', {limit: 100, after})));
  }

  async inbox(after?: string | null): Promise<Listing<InboxItem>> {
    return parseInbox(await this.request(this.url('/message/inbox', {limit: PAGE_SIZE, after})));
  }

  vote(fullname: string, direction: Vote): Promise<void> {
    return this.post('/api/vote', {id: fullname, dir: String(direction)});
  }

  setSaved(fullname: string, saved: boolean): Promise<void> {
    return this.post(saved ? '/api/save' : '/api/unsave', {id: fullname});
  }

  markRead(fullname: string): Promise<void> {
    return this.post('/api/read_message', {id: fullname});
  }
}
