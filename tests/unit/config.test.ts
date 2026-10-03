import {describe, expect, it} from 'vitest';
import {DEFAULT_API_BASE, extractToken, parseConfig, tokenExpiry} from '../../src/config/lumenConfig';

// A JWT-shaped value with exp = 1791043637 (no real session).
const payload = btoa(JSON.stringify({sub: 'user', exp: 1791043637.5})).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const TOKEN = `eyJhbGciOiJSUzI1NiJ9.${payload}.c2lnbmF0dXJlLXNpZ25hdHVyZQ`;

describe('extractToken', () => {
  it('takes the bare value, a named cookie or a whole Cookie header', () => {
    expect(extractToken(TOKEN)).toBe(TOKEN);
    expect(extractToken(`  token_v2=${TOKEN}  `)).toBe(TOKEN);
    expect(extractToken(`Cookie: loid=abc; token_v2=${TOKEN}; session_tracker=xyz`)).toBe(TOKEN);
    expect(extractToken(`"${TOKEN}"`)).toBe(TOKEN);
    expect(extractToken(`Bearer ${TOKEN}`)).toBe(TOKEN);
    expect(extractToken(encodeURIComponent(TOKEN))).toBe(TOKEN);
  });

  it('refuses what is not a token', () => {
    expect(extractToken('')).toBeNull();
    expect(extractToken('short')).toBeNull();
    expect(extractToken('loid=abc; session_tracker=xyz')).toBeNull();
    expect(extractToken('has spaces in the middle of it all')).toBeNull();
    expect(extractToken(null)).toBeNull();
  });
});

describe('tokenExpiry', () => {
  it('reads exp from a JWT and ignores anything else', () => {
    expect(tokenExpiry(TOKEN)).toBe(1791043637500);
    expect(tokenExpiry('opaque-value-without-dots')).toBeNull();
    expect(tokenExpiry('a.b.c')).toBeNull();
  });
});

describe('parseConfig', () => {
  it('needs a session', () => {
    expect(parseConfig({})).toEqual({status: 'missing'});
    expect(parseConfig({'reddit.token': '  '})).toEqual({status: 'missing'});
    expect(parseConfig({'reddit.token': 'loid=1; x=2'})).toEqual({status: 'invalid'});
  });

  it('is ready with the default API origin', () => {
    expect(parseConfig({'reddit.token': `token_v2=${TOKEN}`})).toEqual({
      status: 'ready',
      config: {token: TOKEN, apiBase: DEFAULT_API_BASE, expiresAt: 1791043637500},
    });
  });

  it('accepts another API origin for tests', () => {
    const state = parseConfig({'reddit.token': TOKEN, 'reddit.api': 'http://127.0.0.1:8090/'});
    expect(state.status === 'ready' && state.config.apiBase).toBe('http://127.0.0.1:8090');
    expect(parseConfig({'reddit.token': TOKEN, 'reddit.api': 'ftp://x'})).toEqual({status: 'invalid'});
  });

  it('turns on demo mode only with the exact value', () => {
    expect(parseConfig({demo: 'demo-captures'})).toEqual({status: 'demo'});
    expect(parseConfig({demo: 'yes'})).toEqual({status: 'missing'});
  });
});
