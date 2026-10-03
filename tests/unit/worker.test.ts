import {describe, expect, it, vi} from 'vitest';
// @ts-expect-error: the Worker is plain JavaScript.
import worker, {jwtExpiry, renew, setCookieValue} from '../../worker/index.mjs';

const exp = 1791107711.9;
const TOKEN = `h.${btoa(JSON.stringify({exp})).replace(/=+$/, '')}.s`;
const SESSION = 'reddit-session-value-long-enough-to-pass';

function redditAnswer(status: number, cookies: string[]) {
  const headers = new Headers();
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  return new Response('<html></html>', {status, headers});
}

const post = (key: string, body: string) =>
  new Request('https://w.example/token', {method: 'POST', headers: {'X-Renew-Key': key}, body});

describe('session worker', () => {
  it('reads token_v2 among Set-Cookie headers and its expiry', () => {
    const headers = new Headers();
    headers.append('set-cookie', 'loid=1; Path=/');
    headers.append('set-cookie', `token_v2=${TOKEN}; Path=/; Secure`);
    expect(setCookieValue(headers, 'token_v2')).toBe(TOKEN);
    expect(setCookieValue(headers, 'csrf_token')).toBeNull();
    expect(jwtExpiry(TOKEN)).toBe(Math.round(exp * 1000));
  });

  it('asks www.reddit.com with only reddit_session and returns the new token', async () => {
    const fetchImpl = vi.fn(async () => redditAnswer(200, ['csrf_token=x', `token_v2=${TOKEN}; Path=/`]));
    const response = await renew(SESSION, fetchImpl);
    expect(await response.json()).toEqual({token: TOKEN, expiresAt: Math.round(exp * 1000)});
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://www.reddit.com/');
    expect((init.headers as Record<string, string>).Cookie).toBe(`reddit_session=${SESSION}`);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('tells an ended session from a blocked request', async () => {
    expect((await renew(SESSION, vi.fn(async () => redditAnswer(200, ['loid=1'])))).status).toBe(401);
    const blocked = await renew(SESSION, vi.fn(async () => redditAnswer(403, [])));
    expect([blocked.status, (await blocked.json()).error]).toEqual([502, 'blocked']);
  });

  it('refuses a wrong key, a bad session and other paths', async () => {
    const env = {RENEW_KEY: 'right-key'};
    expect((await worker.fetch(post('wrong-key', SESSION), env)).status).toBe(403);
    expect((await worker.fetch(post('right-key', 'short'), env)).status).toBe(400);
    expect((await worker.fetch(new Request('https://w.example/other'), env)).status).toBe(404);
    expect((await worker.fetch(new Request('https://w.example/token', {method: 'OPTIONS'}), env)).status).toBe(204);
    expect((await worker.fetch(post('', SESSION), {})).status).toBe(403);
  });
});
