// A stand-in for oauth.reddit.com for the e2e tests: answers from the same
// fictional fixtures as demo mode, checks the Bearer token, sends Reddit's CORS
// headers (and, like Reddit, none on a 429), and records every write.
//
//   node mock/server.mjs            (listens on 127.0.0.1:8090)
//   GET  /__mock/writes             writes received so far
//   POST /__mock/reset              clears writes, votes and the rate limit
//   POST /__mock/ratelimit?remaining=N&reset=S
//   POST /__mock/expire             every later request answers 401
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
export const MOCK_TOKEN = 'mock-session-token-for-e2e-tests-only';
export const MOCK_PORT = 8090;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Reddit-Web-Client',
  'Access-Control-Expose-Headers': 'X-Ratelimit-Used, X-Ratelimit-Remaining, X-Ratelimit-Reset',
};

function loadResponses(origin) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'src/demo/fixtures.json'), 'utf8'));
  const shift = Math.floor(Date.now() / 1000) - raw.now;
  const walk = value => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, key === 'created_utc' && typeof entry === 'number' ? entry + shift : walk(entry)]),
      );
    }
    if (typeof value === 'string' && value.startsWith('demo:')) return `${origin}/img/${value.slice(5)}.webp`;
    return value;
  };
  return walk(raw.responses);
}

function* things(value) {
  if (Array.isArray(value)) {
    for (const entry of value) yield* things(entry);
  } else if (value && typeof value === 'object') {
    if (typeof value.name === 'string' && /^t[134]_/.test(value.name)) yield value;
    for (const entry of Object.values(value)) yield* things(entry);
  }
}

export function startMockServer(port = MOCK_PORT, host = '127.0.0.1') {
  const origin = `http://${host}:${port}`;
  let responses = loadResponses(origin);
  let writes = [];
  let limit = {remaining: 100, resetAt: Date.now() + 600_000};
  let expired = false;

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, {'Content-Type': 'application/json; charset=UTF-8', ...headers});
    res.end(JSON.stringify(body));
  };
  const update = (fullname, change) => {
    for (const thing of things(responses)) if (thing.name === fullname) change(thing);
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, origin);
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      if (url.pathname.startsWith('/__mock/')) {
        if (url.pathname === '/__mock/writes') return send(res, 200, writes, CORS);
        if (url.pathname === '/__mock/reset') {
          responses = loadResponses(origin);
          writes = [];
          limit = {remaining: 100, resetAt: Date.now() + 600_000};
          expired = false;
          return send(res, 200, {ok: true}, CORS);
        }
        if (url.pathname === '/__mock/ratelimit') {
          limit = {remaining: Number(url.searchParams.get('remaining') ?? 0), resetAt: Date.now() + Number(url.searchParams.get('reset') ?? 60) * 1000};
          return send(res, 200, {ok: true}, CORS);
        }
        if (url.pathname === '/__mock/expire') {
          expired = true;
          return send(res, 200, {ok: true}, CORS);
        }
      }
      if (url.pathname.startsWith('/img/')) {
        const file = path.join(root, 'src/demo/assets', path.basename(url.pathname));
        if (!fs.existsSync(file)) return send(res, 404, {}, CORS);
        res.writeHead(200, {'Content-Type': 'image/webp'});
        return fs.createReadStream(file).pipe(res);
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(200, CORS);
        return res.end();
      }
      if (req.headers.authorization !== `Bearer ${MOCK_TOKEN}` || expired) {
        return send(res, 401, {message: 'Unauthorized', error: 401}, CORS);
      }
      const resetSeconds = Math.max(0, Math.round((limit.resetAt - Date.now()) / 1000));
      if (limit.remaining <= 0) {
        // Reddit's 429 carries no CORS headers: the browser sees a network failure.
        return send(res, 429, {message: 'Too Many Requests', error: 429}, {'X-Ratelimit-Remaining': '0', 'X-Ratelimit-Reset': String(resetSeconds)});
      }
      limit.remaining -= 1;
      const headers = {...CORS, 'X-Ratelimit-Remaining': limit.remaining.toFixed(1), 'X-Ratelimit-Reset': String(resetSeconds), 'X-Ratelimit-Used': '1'};

      if (req.method === 'POST') {
        const form = Object.fromEntries(new URLSearchParams(body));
        writes.push({path: url.pathname, ...form});
        if (url.pathname === '/api/vote') {
          const direction = Number(form.dir);
          update(form.id, thing => {
            const before = thing.likes === true ? 1 : thing.likes === false ? -1 : 0;
            thing.score = Number(thing.score) - before + direction;
            thing.likes = direction === 0 ? null : direction === 1;
          });
        } else if (url.pathname === '/api/save' || url.pathname === '/api/unsave') {
          update(form.id, thing => (thing.saved = url.pathname === '/api/save'));
        } else if (url.pathname === '/api/read_message') {
          update(form.id, thing => (thing.new = false));
        } else {
          return send(res, 404, {}, headers);
        }
        return send(res, 200, {}, headers);
      }

      const after = url.searchParams.get('after');
      const key = after ? `${url.pathname}?after=${after}` : url.pathname;
      if (!(key in responses)) {
        return send(res, 404, {message: 'Not Found', error: 404}, headers);
      }
      return send(res, 200, responses[key], headers);
    });
  });
  return new Promise(resolve => server.listen(port, host, () => resolve(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  await startMockServer();
  console.log(`mock Reddit API on http://127.0.0.1:${MOCK_PORT} (token: ${MOCK_TOKEN})`);
}
