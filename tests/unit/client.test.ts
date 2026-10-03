import {describe, expect, it, vi} from 'vitest';
import {RATE_LIMIT_RESERVE, RedditClient, RedditError} from '../../src/reddit/client';

type Call = {url: string; init: RequestInit};

function fakeFetch(answers: Array<{status?: number; body?: unknown; headers?: Record<string, string>} | Error>) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({url, init});
    const answer = answers.shift() ?? {status: 500};
    if (answer instanceof Error) {
      throw answer;
    }
    return new Response(JSON.stringify(answer.body ?? {}), {status: answer.status ?? 200, headers: answer.headers});
  });
  return {calls, fetchImpl};
}

const ME = {name: 'someone', inbox_count: 4};

describe('RedditClient', () => {
  it('sends the session as a Bearer token, never in the URL, without cookies', async () => {
    const {calls, fetchImpl} = fakeFetch([{body: ME}]);
    const client = new RedditClient('secret-token-value', 'https://oauth.example/', fetchImpl);
    await expect(client.account()).resolves.toEqual({name: 'someone', inboxCount: 4});
    expect(calls[0].url).toBe('https://oauth.example/api/v1/me?raw_json=1');
    expect(calls[0].url).not.toContain('secret');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token-value');
    expect(calls[0].init.credentials).toBe('omit');
  });

  it('builds feed, thread and inbox requests', async () => {
    const empty = {kind: 'Listing', data: {after: null, children: []}};
    const {calls, fetchImpl} = fakeFetch([{body: empty}, {body: empty}, {body: empty}]);
    const client = new RedditClient('t', 'https://oauth.example', fetchImpl);
    await client.feed({kind: 'home'});
    await client.feed({kind: 'subreddit', name: 'smart glasses', sort: 'top'}, 't3_x');
    await client.inbox('t1_y');
    expect(calls.map(call => call.url)).toEqual([
      'https://oauth.example/best?raw_json=1&limit=25&sr_detail=1',
      'https://oauth.example/r/smart%20glasses/top?raw_json=1&limit=25&after=t3_x&sr_detail=1&t=day',
      'https://oauth.example/message/inbox?raw_json=1&limit=25&after=t1_y',
    ]);
  });

  it('posts votes and saves as forms', async () => {
    const {calls, fetchImpl} = fakeFetch([{body: {}}, {body: {}}, {body: {}}]);
    const client = new RedditClient('t', 'https://oauth.example', fetchImpl);
    await client.vote('t3_abc', -1);
    await client.setSaved('t3_abc', true);
    await client.setSaved('t3_abc', false);
    expect(calls.map(call => [call.url, call.init.method, String(call.init.body)])).toEqual([
      ['https://oauth.example/api/vote?raw_json=1', 'POST', 'id=t3_abc&dir=-1'],
      ['https://oauth.example/api/save?raw_json=1', 'POST', 'id=t3_abc'],
      ['https://oauth.example/api/unsave?raw_json=1', 'POST', 'id=t3_abc'],
    ]);
  });

  it('classifies failures', async () => {
    const {fetchImpl} = fakeFetch([{status: 401}, {status: 403}, {status: 404}, {status: 503}, new TypeError('offline')]);
    const client = new RedditClient('t', 'https://oauth.example', fetchImpl);
    const kinds: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      await client.account().catch((error: RedditError) => kinds.push(error.kind));
    }
    expect(kinds).toEqual(['auth', 'forbidden', 'notfound', 'server', 'network']);
  });

  it('stops before the rate limit runs out and reports the wait', async () => {
    const low = {'x-ratelimit-remaining': String(RATE_LIMIT_RESERVE - 1), 'x-ratelimit-reset': '120'};
    const {calls, fetchImpl} = fakeFetch([{body: ME, headers: low}, {body: {}}]);
    const client = new RedditClient('t', 'https://oauth.example', fetchImpl);
    await client.account();
    const error = await client.account().catch((failure: RedditError) => failure);
    expect(error).toMatchObject({kind: 'ratelimit', retryAfter: 120});
    expect(calls).toHaveLength(1);
    // A vote may still use the reserve.
    await expect(client.vote('t3_a', 1)).resolves.toBeUndefined();
    expect(calls).toHaveLength(2);
  });

  it('reads a CORS-less 429 (seen as a network failure) as the rate limit when the window is nearly spent', async () => {
    const low = {'x-ratelimit-remaining': String(RATE_LIMIT_RESERVE), 'x-ratelimit-reset': '30'};
    const {fetchImpl} = fakeFetch([{body: ME, headers: low}, new TypeError('Failed to fetch')]);
    const client = new RedditClient('t', 'https://oauth.example', fetchImpl);
    await client.account();
    await expect(client.account()).rejects.toMatchObject({kind: 'ratelimit', retryAfter: 30});
  });
});
