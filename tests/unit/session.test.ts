import {describe, expect, it, vi} from 'vitest';
import {RedditClient} from '../../src/reddit/client';
import {RENEW_MARGIN_MS, RenewingToken} from '../../src/reddit/session';

const RENEWAL = {url: 'https://renew.example/token', key: 'k', session: 'session-cookie-value-xxxxxxxx'};

function worker(answers: Array<{status: number; body: unknown}>) {
  const calls: RequestInit[] = [];
  const fetchImpl = vi.fn(async (_url: string, init: RequestInit = {}) => {
    calls.push(init);
    const answer = answers.shift() ?? {status: 500, body: {}};
    return new Response(JSON.stringify(answer.body), {status: answer.status});
  });
  return {calls, fetchImpl};
}

describe('RenewingToken', () => {
  it('uses the configured token while it is fresh', async () => {
    const {calls, fetchImpl} = worker([]);
    const now = 1_000_000;
    const credentials = new RenewingToken(RENEWAL, {token: 'pasted', expiresAt: now + RENEW_MARGIN_MS + 1}, fetchImpl, () => now);
    await expect(credentials.token()).resolves.toBe('pasted');
    expect(calls).toHaveLength(0);
  });

  it('renews without a token, near expiry, and shares one renewal', async () => {
    const {calls, fetchImpl} = worker([{status: 200, body: {token: 'fresh', expiresAt: 9e15}}]);
    const credentials = new RenewingToken(RENEWAL, {token: 'old', expiresAt: 1000}, fetchImpl, () => 500);
    const [a, b] = await Promise.all([credentials.token(), credentials.token()]);
    expect([a, b]).toEqual(['fresh', 'fresh']);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({method: 'POST', body: RENEWAL.session, credentials: 'omit'});
    expect((calls[0].headers as Record<string, string>)['X-Renew-Key']).toBe('k');
    await expect(credentials.token()).resolves.toBe('fresh');
    expect(calls).toHaveLength(1);
  });

  it('reports an ended session as auth and a broken renewal as renewal', async () => {
    const ended = new RenewingToken(RENEWAL, {token: null, expiresAt: null}, worker([{status: 401, body: {error: 'session_rejected'}}]).fetchImpl);
    await expect(ended.token()).rejects.toMatchObject({kind: 'auth'});
    const badKey = new RenewingToken(RENEWAL, {token: null, expiresAt: null}, worker([{status: 403, body: {error: 'bad_key'}}]).fetchImpl);
    await expect(badKey.token()).rejects.toMatchObject({kind: 'renewal', status: 403});
    const offline = new RenewingToken(RENEWAL, {token: null, expiresAt: null}, vi.fn(async () => {
      throw new TypeError('offline');
    }));
    await expect(offline.token()).rejects.toMatchObject({kind: 'network'});
  });
});

describe('RedditClient with renewal', () => {
  it('renews once when Reddit rejects the token, then repeats the request', async () => {
    const calls: Array<{url: string; auth: string}> = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url === RENEWAL.url) {
        return new Response(JSON.stringify({token: 'fresh', expiresAt: 9e15}), {status: 200});
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      calls.push({url, auth});
      return auth === 'Bearer fresh'
        ? new Response(JSON.stringify({name: 'me', inbox_count: 0}), {status: 200})
        : new Response('{}', {status: 401});
    });
    const credentials = new RenewingToken(RENEWAL, {token: 'stale', expiresAt: null}, fetchImpl);
    const client = new RedditClient(credentials, 'https://oauth.example', fetchImpl);
    await expect(client.account()).resolves.toEqual({name: 'me', inboxCount: 0});
    expect(calls.map(call => call.auth)).toEqual(['Bearer stale', 'Bearer fresh']);
  });

  it('does not loop when the renewed token is rejected too', async () => {
    let apiCalls = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === RENEWAL.url) {
        return new Response(JSON.stringify({token: 'fresh', expiresAt: 9e15}), {status: 200});
      }
      apiCalls += 1;
      return new Response('{}', {status: 401});
    });
    const client = new RedditClient(new RenewingToken(RENEWAL, {token: 'stale', expiresAt: null}, fetchImpl), 'https://oauth.example', fetchImpl);
    await expect(client.account()).rejects.toMatchObject({kind: 'auth'});
    expect(apiCalls).toBe(2);
  });
});
