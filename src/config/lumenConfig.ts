// Configuration contract with the Lumen platform.
//
// On the glasses the platform injects `window.lumen.config`, backed by the
// fields declared under `lumen_config` in manifest.webmanifest and filled in on
// the phone companion. The Reddit session is a `secret` field: it stays on the
// glasses and is never bundled, logged or typed in the app.
//
// Two cookies of a signed-in reddit.com browser session can be set:
// - `reddit.token`: token_v2, sent as a Bearer token to oauth.reddit.com. It
//   lives about 24 hours.
// - `reddit.session`: reddit_session (about 180 days), with `reddit.renewUrl`
//   and `reddit.renewKey`: the session Worker (worker/index.mjs) turns it into
//   a fresh token_v2 whenever one is needed, so the app keeps working without
//   pasting token_v2 every day. With these three, `reddit.token` is optional.
// Each cookie is accepted as the bare value, as `name=<value>`, or inside a
// whole pasted Cookie header; only the named cookie is kept.
//
// In a regular browser (development only) `window.lumen` does not exist, so the
// values come from `?reddit.token=…` (and the other keys, plus `?reddit.api=…`
// to point the app at a mock server) and are kept in localStorage. The
// parameters are removed from the address bar right after they are read.
//
// Demo mode: the optional `demo` field set to exactly `demo-captures` replaces
// Reddit with built-in fictional content (src/demo).

export const TOKEN_KEY = 'reddit.token';
export const SESSION_KEY = 'reddit.session';
export const RENEW_URL_KEY = 'reddit.renewUrl';
export const RENEW_KEY_KEY = 'reddit.renewKey';
/** Development and test only: another API origin (a mock server). Not in the manifest. */
export const API_BASE_KEY = 'reddit.api';
/** Optional `lumen_config` field that turns on demo mode. */
export const DEMO_KEY = 'demo';
/** The only value of DEMO_KEY that turns on demo mode. */
export const DEMO_ACTIVATION = 'demo-captures';
export const DEFAULT_API_BASE = 'https://oauth.reddit.com';

const URL_KEYS: readonly string[] = [TOKEN_KEY, SESSION_KEY, RENEW_URL_KEY, RENEW_KEY_KEY, API_BASE_KEY, DEMO_KEY];

export type ConfigValues = Record<string, string>;

/** What turns reddit_session into a fresh token_v2. */
export type Renewal = {
  /** The Worker's `/token` address. */
  url: string;
  key: string;
  session: string;
};

export type RedditConfig = {
  /** token_v2 as set on the phone; null when only renewal is configured. */
  token: string | null;
  /** API origin without a trailing slash. */
  apiBase: string;
  /** Expiry of `token` from the token itself, in ms since the epoch, when it says. */
  expiresAt: number | null;
  /** Set when reddit_session, the Worker address and its key are all there. */
  renewal: Renewal | null;
};

export type ConfigState =
  | {status: 'loading'}
  | {status: 'missing'}
  | {status: 'invalid'}
  | {status: 'ready'; config: RedditConfig}
  | {status: 'demo'};

type LumenConfigApi = {
  get(): Promise<ConfigValues>;
  onChange(callback: (values?: ConfigValues) => void): unknown;
};

declare global {
  /** What the Lumen host injects. */
  interface LumenHost {
    config?: LumenConfigApi;
  }
  interface Window {
    lumen?: LumenHost;
  }
}

export type ConfigSource = {
  kind: 'lumen' | 'dev';
  get(): Promise<ConfigValues>;
  /** Calls back with the new values when known, or with nothing (caller re-reads). */
  subscribe(callback: (values?: ConfigValues) => void): () => void;
};

export const DEV_STORAGE_KEY = 'lumen-reddit.dev-config';

/** The parts of `window` this module uses (lets tests pass a plain object). */
export type HostWindow = {
  location: {href: string};
  localStorage: Storage;
  history: {state: unknown; replaceState(state: unknown, unused: string, url: string): void};
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  lumen?: {config?: LumenConfigApi};
};

function readDevConfig(storage: Storage): ConfigValues {
  try {
    const raw = storage.getItem(DEV_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed == null || typeof parsed !== 'object') {
      return {};
    }
    const values: ConfigValues = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        values[key] = value;
      }
    }
    return values;
  } catch {
    return {};
  }
}

/**
 * Development fallback: moves `reddit.*` (and `demo`) URL parameters into
 * localStorage and strips them from the address bar so the session does not
 * linger in the URL or in history. An empty value removes the stored key.
 * Always strips the parameters; only stores them when `store` is true.
 */
export function captureDevConfigFromUrl(store: boolean, win: HostWindow = window): void {
  const url = new URL(win.location.href);
  const keys = URL_KEYS.filter(key => url.searchParams.has(key));
  if (keys.length === 0) {
    return;
  }
  if (store) {
    const values = readDevConfig(win.localStorage);
    for (const key of keys) {
      const value = (url.searchParams.get(key) ?? '').trim();
      if (value) {
        values[key] = value;
      } else {
        delete values[key];
      }
    }
    try {
      win.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Storage full or blocked: the values stay unavailable, which shows Setup.
    }
  }
  for (const key of keys) {
    url.searchParams.delete(key);
  }
  win.history.replaceState(win.history.state, '', url.pathname + url.search + url.hash);
}

export function getConfigSource(win: HostWindow = window): ConfigSource {
  const lumenConfig = win.lumen?.config;
  if (lumenConfig != null && typeof lumenConfig.get === 'function') {
    return {
      kind: 'lumen',
      get: () => lumenConfig.get(),
      subscribe(callback) {
        if (typeof lumenConfig.onChange !== 'function') {
          return () => {};
        }
        const unsubscribe = lumenConfig.onChange(values =>
          callback(values != null && typeof values === 'object' ? values : undefined),
        );
        return typeof unsubscribe === 'function' ? () => unsubscribe() : () => {};
      },
    };
  }

  return {
    kind: 'dev',
    get: () => Promise.resolve(readDevConfig(win.localStorage)),
    subscribe(callback) {
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === DEV_STORAGE_KEY) {
          callback();
        }
      };
      win.addEventListener('storage', onStorage);
      return () => win.removeEventListener('storage', onStorage);
    },
  };
}

export function isDemoActivation(values: ConfigValues | null | undefined): boolean {
  const value = values?.[DEMO_KEY];
  return typeof value === 'string' && value.trim() === DEMO_ACTIVATION;
}

const TOKEN_CHARS = /^[A-Za-z0-9._~+/=-]+$/;

/**
 * Extracts one cookie's value from what was pasted: the bare value,
 * `<name>=<value>`, or a Cookie header with other cookies around it.
 * Returns null when nothing usable is there.
 */
export function extractCookie(raw: string | null | undefined, name: string): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  let value = raw.trim().replace(/^cookie:\s*/i, '');
  const named = new RegExp(`(?:^|[;\\s])${name}=([^;\\s]+)`).exec(value);
  if (named) {
    value = named[1];
  } else if (value.includes('=') && value.includes(';')) {
    // Other cookies but not this one.
    return null;
  }
  value = value.replace(/^["']|["']$/g, '').replace(/^bearer\s+/i, '');
  try {
    value = decodeURIComponent(value);
  } catch {
    // Not URL-encoded.
  }
  return value.length >= 20 && TOKEN_CHARS.test(value) ? value : null;
}

/** The token_v2 value from what was pasted (see extractCookie). */
export function extractToken(raw: string | null | undefined): string | null {
  return extractCookie(raw, 'token_v2');
}

/** The `exp` claim of a JWT-shaped token, in ms, or null. Never throws. */
export function tokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const exp = claims != null && typeof claims === 'object' ? (claims as {exp?: unknown}).exp : undefined;
    return typeof exp === 'number' && Number.isFinite(exp) ? Math.round(exp * 1000) : null;
  } catch {
    return null;
  }
}

/** An http(s) address without a trailing slash, or null. */
function httpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

function apiBaseFrom(values: ConfigValues | null | undefined): string | null {
  const raw = values?.[API_BASE_KEY]?.trim();
  return raw ? httpUrl(raw) : DEFAULT_API_BASE;
}

/** The session only travels over HTTPS (plain HTTP only to this device, for tests). */
function secureUrl(raw: string): string | null {
  const url = httpUrl(raw);
  if (url == null) {
    return null;
  }
  const {protocol, hostname} = new URL(url);
  return protocol === 'https:' || hostname === '127.0.0.1' || hostname === 'localhost' ? url : null;
}

const read = (values: ConfigValues | null | undefined, key: string): string => {
  const value = values?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

export function parseConfig(values: ConfigValues | null | undefined): ConfigState {
  if (isDemoActivation(values)) {
    return {status: 'demo'};
  }
  const rawToken = read(values, TOKEN_KEY);
  const rawSession = read(values, SESSION_KEY);
  const rawRenewUrl = read(values, RENEW_URL_KEY);
  const rawRenewKey = read(values, RENEW_KEY_KEY);
  const anyRenewal = rawSession !== '' || rawRenewUrl !== '' || rawRenewKey !== '';
  if (rawToken === '' && !anyRenewal) {
    return {status: 'missing'};
  }

  const token = rawToken === '' ? null : extractToken(rawToken);
  const apiBase = apiBaseFrom(values);
  if ((rawToken !== '' && token == null) || apiBase == null) {
    return {status: 'invalid'};
  }

  let renewal: Renewal | null = null;
  if (anyRenewal) {
    const session = extractCookie(rawSession, 'reddit_session');
    const url = secureUrl(rawRenewUrl);
    if (session == null || url == null || rawRenewKey === '') {
      // Partly set: without a token there is nothing to run on.
      if (token == null) {
        return rawSession === '' || rawRenewUrl === '' || rawRenewKey === '' ? {status: 'missing'} : {status: 'invalid'};
      }
    } else {
      renewal = {url, key: rawRenewKey, session};
    }
  }
  return {status: 'ready', config: {token, apiBase, expiresAt: token ? tokenExpiry(token) : null, renewal}};
}

export function sameConfig(a: ConfigState, b: ConfigState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'ready' && b.status === 'ready') {
    const x = a.config.renewal;
    const y = b.config.renewal;
    return (
      a.config.token === b.config.token &&
      a.config.apiBase === b.config.apiBase &&
      x?.url === y?.url &&
      x?.key === y?.key &&
      x?.session === y?.session
    );
  }
  return true;
}
