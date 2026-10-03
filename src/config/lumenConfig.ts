// Configuration contract with the Lumen platform.
//
// On the glasses the platform injects `window.lumen.config`, backed by the
// fields declared under `lumen_config` in manifest.webmanifest and filled in on
// the phone companion. The Reddit session is a `secret` field: it stays on the
// glasses and is never bundled, logged or typed in the app.
//
// The session is the `token_v2` cookie of a signed-in reddit.com browser
// session. It is accepted as the bare value, as `token_v2=<value>`, or as a
// whole pasted Cookie header; only token_v2 is kept. It is sent as a Bearer
// token to oauth.reddit.com.
//
// In a regular browser (development only) `window.lumen` does not exist, so the
// values come from `?reddit.token=…` (and `?reddit.api=…` to point the app at a
// mock server) and are kept in localStorage. The parameters are removed from
// the address bar right after they are read.
//
// Demo mode: the optional `demo` field set to exactly `demo-captures` replaces
// Reddit with built-in fictional content (src/demo).

export const TOKEN_KEY = 'reddit.token';
/** Development and test only: another API origin (a mock server). Not in the manifest. */
export const API_BASE_KEY = 'reddit.api';
/** Optional `lumen_config` field that turns on demo mode. */
export const DEMO_KEY = 'demo';
/** The only value of DEMO_KEY that turns on demo mode. */
export const DEMO_ACTIVATION = 'demo-captures';
export const DEFAULT_API_BASE = 'https://oauth.reddit.com';

const URL_KEYS: readonly string[] = [TOKEN_KEY, API_BASE_KEY, DEMO_KEY];

export type ConfigValues = Record<string, string>;

export type RedditConfig = {
  token: string;
  /** API origin without a trailing slash. */
  apiBase: string;
  /** Expiry of the session from the token itself, in ms since the epoch, when it says. */
  expiresAt: number | null;
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
 * Extracts the token_v2 value from what was pasted: the bare value,
 * `token_v2=<value>`, or a Cookie header with other cookies around it.
 * Returns null when nothing usable is there.
 */
export function extractToken(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  let value = raw.trim().replace(/^cookie:\s*/i, '');
  const named = /(?:^|[;\s])token_v2=([^;\s]+)/.exec(value);
  if (named) {
    value = named[1];
  } else if (value.includes('=') && value.includes(';')) {
    // Other cookies but no token_v2.
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

function apiBaseFrom(values: ConfigValues | null | undefined): string | null {
  const raw = values?.[API_BASE_KEY]?.trim();
  if (!raw) {
    return DEFAULT_API_BASE;
  }
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

export function parseConfig(values: ConfigValues | null | undefined): ConfigState {
  if (isDemoActivation(values)) {
    return {status: 'demo'};
  }
  const raw = values?.[TOKEN_KEY];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {status: 'missing'};
  }
  const token = extractToken(raw);
  const apiBase = apiBaseFrom(values);
  if (token == null || apiBase == null) {
    return {status: 'invalid'};
  }
  return {status: 'ready', config: {token, apiBase, expiresAt: tokenExpiry(token)}};
}

export function sameConfig(a: ConfigState, b: ConfigState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'ready' && b.status === 'ready') {
    return a.config.token === b.config.token && a.config.apiBase === b.config.apiBase;
  }
  return true;
}
