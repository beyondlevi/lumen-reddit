// Deploys worker/index.mjs to Cloudflare as `lumen-reddit-session` on the
// account's workers.dev subdomain, through the Cloudflare API (no wrangler).
//
//   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… node scripts/deploy-worker.mjs
//   … RENEW_KEY=<new key> node scripts/deploy-worker.mjs     (also sets the key)
//
// The token needs the "Edit Cloudflare Workers" permissions.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const NAME = process.env.WORKER_NAME ?? 'lumen-reddit-session';
const {CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, RENEW_KEY: renewKey} = process.env;
if (!token || !account) {
  console.error('deploy-worker: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID');
  process.exit(1);
}
const api = `https://api.cloudflare.com/client/v4/accounts/${account}/workers`;
const auth = {Authorization: `Bearer ${token}`};

async function call(method, url, body, headers = {}) {
  const response = await fetch(url, {method, headers: {...auth, ...headers}, body});
  const data = await response.json().catch(() => ({}));
  if (!data.success) {
    throw new Error(`${method} ${url.replace(account, '<account>')}: ${JSON.stringify(data.errors ?? response.status)}`);
  }
  return data.result;
}

const form = new FormData();
form.append('metadata', new Blob([JSON.stringify({main_module: 'index.mjs', compatibility_date: '2026-09-01'})], {type: 'application/json'}));
form.append('index.mjs', new Blob([fs.readFileSync(path.join(root, 'worker/index.mjs'))], {type: 'application/javascript+module'}), 'index.mjs');
await call('PUT', `${api}/scripts/${NAME}`, form);
await call('POST', `${api}/scripts/${NAME}/subdomain`, JSON.stringify({enabled: true}), {'Content-Type': 'application/json'});
if (renewKey) {
  await call('PUT', `${api}/scripts/${NAME}/secrets`, JSON.stringify({name: 'RENEW_KEY', text: renewKey, type: 'secret_text'}), {'Content-Type': 'application/json'});
}
const {subdomain} = await call('GET', `${api}/subdomain`);
console.log(`deploy-worker: https://${NAME}.${subdomain}.workers.dev/token${renewKey ? ' (RENEW_KEY set)' : ''}`);
