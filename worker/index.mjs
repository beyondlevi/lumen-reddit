// lumen-reddit session Worker (Cloudflare): turns a reddit_session cookie into a
// fresh token_v2, so the glasses app keeps working past token_v2's 24 hours.
//
//   POST /token
//   X-Renew-Key: <RENEW_KEY secret>
//   Content-Type: text/plain        body: the reddit_session value
//   → 200 {"token": "<token_v2>", "expiresAt": <ms>}
//   → 401 {"error": "session_rejected"}   Reddit sent no token_v2: the session ended
//   → 403 {"error": "bad_key"}            wrong or missing X-Renew-Key
//   → 502 {"error": "blocked" | "upstream", "status": <n>}
//
// Reddit hands a signed-in browser a new token_v2 cookie when it loads
// www.reddit.com with the reddit_session cookie (~180 days). Browsers can't
// send a Cookie header, and Reddit blocks the cookie-authenticated JSON
// endpoints from datacenter networks, but the HTML page is served, so this
// Worker loads only that page's headers and returns the token_v2 it sets. It
// keeps nothing and logs nothing about the request.

const REDDIT_HOME = 'https://www.reddit.com/';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0';
const SESSION_CHARS = /^[A-Za-z0-9._~+/=-]{20,4096}$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Renew-Key',
  'Access-Control-Max-Age': '86400',
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
  });
}

/** The `exp` claim of a JWT, in ms, or null. */
export function jwtExpiry(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4))).exp;
    return typeof exp === 'number' ? Math.round(exp * 1000) : null;
  } catch {
    return null;
  }
}

/** The value of one cookie among Set-Cookie headers, or null. */
export function setCookieValue(headers, name) {
  const all = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') ?? ''];
  for (const cookie of all) {
    const pair = cookie.split(';', 1)[0];
    const index = pair.indexOf('=');
    if (index > 0 && pair.slice(0, index).trim() === name) {
      const value = pair.slice(index + 1).trim();
      return value || null;
    }
  }
  return null;
}

/** Constant-time comparison, so the key can't be guessed byte by byte. */
function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function renew(session, fetchImpl = fetch) {
  const response = await fetchImpl(REDDIT_HOME, {
    redirect: 'manual',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: `reddit_session=${session}`,
    },
  });
  const token = setCookieValue(response.headers, 'token_v2');
  // Only the headers matter; don't download the page.
  await response.body?.cancel?.();
  if (token) {
    return json(200, {token, expiresAt: jwtExpiry(token)});
  }
  if (response.status === 403) {
    return json(502, {error: 'blocked', status: 403});
  }
  if (response.status >= 500) {
    return json(502, {error: 'upstream', status: response.status});
  }
  return json(401, {error: 'session_rejected'});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: CORS});
    }
    if (url.pathname !== '/token' || request.method !== 'POST') {
      return json(404, {error: 'not_found'});
    }
    if (!sameKey(request.headers.get('x-renew-key') ?? '', env.RENEW_KEY ?? '')) {
      return json(403, {error: 'bad_key'});
    }
    const session = (await request.text()).trim().replace(/^reddit_session=/, '');
    if (!SESSION_CHARS.test(session)) {
      return json(400, {error: 'bad_session'});
    }
    try {
      return await renew(session);
    } catch {
      return json(502, {error: 'upstream', status: 0});
    }
  },
};
