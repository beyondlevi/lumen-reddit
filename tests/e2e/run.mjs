// Keyboard-only end-to-end tests against the mock Reddit API (mock/server.mjs).
//
//   npm run build && npm run test:e2e              (Chromium + Firefox)
//   E2E_BROWSERS=firefox npm run test:e2e
//   E2E_VIEWPORT=480x640 npm run test:e2e          (Rokid HUD size; default 600x600)
//
// The built app is served like the Lumen host serves a package (static files,
// SPA fallback) on 127.0.0.1:4173 and the mock on 127.0.0.1:8090, so every call
// is a real cross-origin request with a CORS preflight, as with Reddit. The
// offline package test unzips dist/lumen-reddit.mrbd.zip and serves that.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {chromium, firefox} from 'playwright';
import {MOCK_PORT, MOCK_RENEW_KEY, MOCK_SESSION, MOCK_TOKEN, startMockServer} from '../../mock/server.mjs';
import {startStaticServer} from './static-server.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const outDir = path.join(root, '.e2e-output');
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const APP = 'http://127.0.0.1:4173';
const PACKAGE_APP = 'http://127.0.0.1:5500';
const browsers = (process.env.E2E_BROWSERS ?? 'chromium,firefox').split(',');
const [width, height] = (process.env.E2E_VIEWPORT ?? '600x600').split('x').map(Number);
const results = [];

fs.mkdirSync(outDir, {recursive: true});

const mock = (pathname, method = 'POST') => fetch(`${MOCK}${pathname}`, {method}).then(response => response.json());
const writes = () => mock('/__mock/writes', 'GET');

async function focusLabel(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return '(body)';
    return (element.getAttribute('aria-label') || element.textContent || element.tagName).replace(/\s+/g, ' ').trim();
  });
}

async function press(page, key, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
}

/** Moves focus with `key` until its label matches, or fails. */
async function focusUntil(page, key, pattern, limit = 12) {
  for (let i = 0; i <= limit; i += 1) {
    const label = await focusLabel(page);
    if (pattern.test(label)) return label;
    await press(page, key);
  }
  throw new Error(`focus never matched ${pattern}; last: ${await focusLabel(page)}`);
}

async function waitText(page, text, timeout = 8000) {
  await page.getByText(text, {exact: false}).first().waitFor({state: 'visible', timeout});
}

async function openApp(browser, name, config, appUrl = APP) {
  const context = await browser.newContext({viewport: {width, height}, locale: 'en-US'});
  await context.addInitScript(values => {
    localStorage.setItem('lumen-reddit.dev-config', JSON.stringify(values));
  }, config);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${appUrl}/`);
  return {page, context, errors, shot: step => page.screenshot({path: path.join(outDir, `${name}-${step}.png`)})};
}

const session = {'reddit.token': `token_v2=${MOCK_TOKEN}`, 'reddit.api': MOCK};
const renewal = {
  'reddit.session': `reddit_session=${MOCK_SESSION}`,
  'reddit.renewUrl': `${MOCK}/__worker/token`,
  'reddit.renewKey': MOCK_RENEW_KEY,
  'reddit.api': MOCK,
};
const renewals = () => mock('/__mock/renewals', 'GET').then(body => body.renewals);

const scenarios = {
  async 'sign-in screen without a session'(browser, name) {
    const {page, context, shot} = await openApp(browser, name, {});
    await waitText(page, 'Sign in on your phone');
    assert.match(await focusLabel(page), /Check again/);
    await shot('setup');
    await context.close();
  },

  async 'feed, post, votes, save and Back'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, errors, shot} = await openApp(browser, name, session);
    await waitText(page, 'Which glasses are you actually wearing');
    await shot('home');
    await focusUntil(page, 'ArrowDown', /r\/smartglasses/);
    await press(page, 'Enter');
    await waitText(page, 'I keep buying new pairs');
    await shot('post');
    // Into the dock, then left to its first button.
    await focusUntil(page, 'ArrowDown', /Upvote|Downvote|comment|Save/, 4);
    await focusUntil(page, 'ArrowLeft', /Upvote/, 4);
    await press(page, 'Enter');
    await page.waitForTimeout(500);
    await press(page, 'Enter');
    await focusUntil(page, 'ArrowRight', /Save/, 6);
    await press(page, 'Enter');
    await waitText(page, 'Saved');
    await shot('saved');
    await page.waitForTimeout(500);
    const sent = (await writes()).map(write => `${write.path} ${write.id} ${write.dir ?? ''}`.trim());
    assert.deepEqual(sent, ['/api/vote t3_dm1 1', '/api/vote t3_dm1 0', '/api/save t3_dm1']);
    await press(page, 'Escape');
    await waitText(page, 'Hands-on: reading long threads');
    assert.match(await focusLabel(page), /smartglasses|Which glasses/);
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'comments, a comment and its replies'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, shot} = await openApp(browser, name, session);
    await waitText(page, 'Which glasses are you actually wearing');
    await focusUntil(page, 'ArrowDown', /r\/smartglasses/);
    await press(page, 'Enter');
    await waitText(page, 'I keep buying new pairs');
    await focusUntil(page, 'ArrowDown', /Upvote|Downvote|comment|Save/, 4);
    await focusUntil(page, 'ArrowRight', /comment/i, 4);
    await press(page, 'Enter');
    await waitText(page, 'Same pair for months');
    await shot('comments');
    await focusUntil(page, 'ArrowDown', /alexlee/);
    await press(page, 'Enter');
    await page.locator('[aria-label^="Upvote"]').first().waitFor({state: 'visible', timeout: 8000});
    await waitText(page, '1 reply');
    await shot('comment');
    await focusUntil(page, 'ArrowDown', /Upvote|Downvote|repl/i, 4);
    await focusUntil(page, 'ArrowRight', /repl/i, 4);
    await press(page, 'Enter');
    await waitText(page, 'Comfort first, then battery');
    await shot('replies');
    await press(page, 'Escape');
    await press(page, 'Escape');
    await waitText(page, 'Same pair for months');
    await context.close();
  },

  async 'tabs, a community and its Sort menu'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, shot} = await openApp(browser, name, session);
    await waitText(page, 'Which glasses are you actually wearing');
    await focusUntil(page, 'ArrowUp', /Page 1 of 4/);
    await press(page, 'ArrowRight');
    await waitText(page, 'A very quiet street');
    await shot('popular');
    await press(page, 'ArrowRight');
    await waitText(page, 'Daily wear, reviews and setups');
    await shot('communities');
    await focusUntil(page, 'ArrowDown', /r\/smartglasses/);
    await press(page, 'Enter');
    await waitText(page, 'Battery tips: what finally got me through');
    await focusUntil(page, 'ArrowDown', /Sort posts/, 6);
    await press(page, 'Enter');
    await waitText(page, 'Rising');
    await shot('sort-menu');
    await focusUntil(page, 'ArrowDown', /^New$/, 4);
    await press(page, 'Enter');
    await page.waitForTimeout(800);
    assert.match(await focusLabel(page), /Sort posts/);
    await waitText(page, 'New');
    await shot('sorted');
    // The menu opens again and Back closes it, focus returning to Sort.
    await press(page, 'Enter');
    await waitText(page, 'Rising');
    await press(page, 'Escape');
    await page.waitForTimeout(500);
    assert.match(await focusLabel(page), /Sort posts/);
    await context.close();
  },

  async 'inbox entry opens, is marked read and leads to its post'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, shot} = await openApp(browser, name, session);
    await waitText(page, 'Which glasses are you actually wearing');
    await focusUntil(page, 'ArrowUp', /Page 1 of 4/);
    await press(page, 'ArrowRight', 3);
    await waitText(page, 'Comfort first, then battery');
    await shot('inbox');
    await focusUntil(page, 'ArrowDown', /maya_j/);
    await press(page, 'Enter');
    await waitText(page, 'View post');
    await shot('message');
    await page.waitForTimeout(500);
    assert.deepEqual((await writes()).map(write => `${write.path} ${write.id}`), ['/api/read_message t1_r1']);
    await focusUntil(page, 'ArrowDown', /View post/, 4);
    await press(page, 'Enter');
    await waitText(page, 'I keep buying new pairs');
    await context.close();
  },

  async 'expired session and rate limit'(browser, name) {
    // Two requests left: the account and Home go through, then the app holds
    // its reserve and Popular says why instead of failing.
    await mock('/__mock/reset');
    await mock('/__mock/ratelimit?remaining=2&reset=90');
    const limited = await openApp(browser, `${name}-limit`, session);
    await waitText(limited.page, 'Which glasses are you actually wearing');
    await focusUntil(limited.page, 'ArrowUp', /Page 1 of 4/);
    await press(limited.page, 'ArrowRight');
    await waitText(limited.page, 'Too many requests');
    await limited.shot('ratelimit');
    await limited.context.close();
    await mock('/__mock/reset');
    await mock('/__mock/expire');
    const expired = await openApp(browser, `${name}-expired`, session);
    await waitText(expired.page, 'Session expired');
    await expired.shot('expired');
    await expired.context.close();
  },

  async 'renewal: reddit_session alone signs in'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, errors, shot} = await openApp(browser, name, renewal);
    await waitText(page, 'Which glasses are you actually wearing');
    await shot('home');
    assert.equal(await renewals(), 1);
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'renewal: a rejected token_v2 is replaced and the request repeated'(browser, name) {
    await mock('/__mock/reset');
    const {page, context} = await openApp(browser, name, {...renewal, 'reddit.token': 'token_v2=stale-token-value-from-yesterday'});
    await waitText(page, 'Which glasses are you actually wearing');
    // Two requests (account, Home) met the stale token; they shared one renewal.
    assert.equal(await renewals(), 1);
    await context.close();
  },

  async 'renewal: an ended reddit_session asks to sign in again'(browser, name) {
    await mock('/__mock/reset');
    const {page, context, shot} = await openApp(browser, name, {...renewal, 'reddit.session': 'reddit_session=an-ended-session-value-xxxx'});
    await waitText(page, 'Signed out of Reddit');
    await shot('ended');
    await context.close();
  },

  async 'offline package in demo mode'(browser, name) {
    const {page, context, errors, shot} = await openApp(browser, name, {demo: 'demo-captures'}, PACKAGE_APP);
    await waitText(page, 'Which glasses are you actually wearing');
    await focusUntil(page, 'ArrowDown', /Fog rolling in/, 6);
    await shot('demo-card');
    assert.deepEqual(errors, []);
    await context.close();
  },
};

const mockServer = await startMockServer();
const appServer = await startStaticServer(path.join(root, 'dist'), 4173);
const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-reddit-package-'));
for (const [file, data] of Object.entries(unzipSync(fs.readFileSync(path.join(root, 'dist/lumen-reddit.mrbd.zip'))))) {
  fs.mkdirSync(path.dirname(path.join(packageDir, file)), {recursive: true});
  fs.writeFileSync(path.join(packageDir, file), data);
}
const packageServer = await startStaticServer(packageDir, 5500);

try {
  for (const browserName of browsers) {
    const browser = await (browserName === 'firefox' ? firefox : chromium).launch();
    for (const [title, scenario] of Object.entries(scenarios)) {
      const name = `${browserName}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
      try {
        await scenario(browser, name);
        results.push(['pass', browserName, title]);
      } catch (error) {
        results.push(['FAIL', browserName, title, String(error?.message ?? error).split('\n')[0]]);
      }
    }
    await browser.close();
  }
} finally {
  mockServer.close();
  appServer.close();
  packageServer.close();
}

for (const [status, browserName, title, detail] of results) {
  console.log(`${status} ${browserName}: ${title}${detail ? ` — ${detail}` : ''}`);
}
if (results.some(([status]) => status === 'FAIL')) {
  process.exit(1);
}
