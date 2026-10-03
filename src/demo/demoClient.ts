// Demo mode: answers every request from fictional fixtures (fixtures.json, the
// same answers the e2e mock server sends) through the real parsers. Votes,
// saves and read marks change only this in-memory copy.
import coast from './assets/coast.webp';
import desk from './assets/desk.webp';
import street from './assets/street.webp';
import fixtures from './fixtures.json';
import {feedPath, RedditError, type FeedSource, type RedditApi} from '../reddit/client';
import {parseAccount, parseInbox, parsePostListing, parseSubreddits, parseThread} from '../reddit/parse';
import type {Vote} from '../reddit/types';

const IMAGES: Record<string, string> = {coast, desk, street};

/** Resolves image placeholders to absolute URLs and moves every date to "now". */
export function prepareFixtures(raw: unknown, now: number, origin: string, images: Record<string, string>): Record<string, unknown> {
  const shift = Math.floor(now / 1000) - (fixtures as {now: number}).now;
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (value != null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        out[key] = key === 'created_utc' && typeof entry === 'number' ? entry + shift : walk(entry);
      }
      return out;
    }
    if (typeof value === 'string' && value.startsWith('demo:')) {
      return new URL(images[value.slice(5)] ?? '', origin).toString();
    }
    return value;
  };
  return walk(raw) as Record<string, unknown>;
}

type Json = Record<string, unknown>;

function* things(value: unknown): Generator<Json> {
  if (Array.isArray(value)) {
    for (const entry of value) {
      yield* things(entry);
    }
  } else if (value != null && typeof value === 'object') {
    const object = value as Json;
    if (typeof object.name === 'string' && /^t[134]_/.test(object.name)) {
      yield object;
    }
    for (const entry of Object.values(object)) {
      yield* things(entry);
    }
  }
}

export function createDemoClient(): RedditApi {
  const responses = prepareFixtures(
    (fixtures as {responses: unknown}).responses,
    Date.now(),
    typeof location === 'undefined' ? 'https://demo.invalid/' : location.href,
    IMAGES,
  );
  const answer = (key: string): unknown => {
    if (!(key in responses)) {
      return Promise.reject(new RedditError('notfound', 404));
    }
    // A short wait, so loading states show as they do with the network.
    return new Promise(resolve => setTimeout(() => resolve(responses[key]), 250));
  };
  const update = (fullname: string, change: (thing: Json) => void) => {
    for (const thing of things(responses)) {
      if (thing.name === fullname) {
        change(thing);
      }
    }
  };

  return {
    account: async () => parseAccount(await answer('/api/v1/me'))!,
    feed: async (source: FeedSource, after?: string | null) =>
      parsePostListing(await answer(after ? `${feedPath(source)}?after=${after}` : feedPath(source))),
    thread: async (postId: string) => {
      const thread = parseThread(await answer(`/comments/${postId}`));
      if (!thread) {
        throw new RedditError('notfound', 404);
      }
      return thread;
    },
    subscriptions: async () => parseSubreddits(await answer('/subreddits/mine/subscriber')),
    inbox: async () => parseInbox(await answer('/message/inbox')),
    vote: async (fullname: string, direction: Vote) => {
      update(fullname, thing => {
        const before = thing.likes === true ? 1 : thing.likes === false ? -1 : 0;
        thing.score = Number(thing.score) - before + direction;
        thing.likes = direction === 0 ? null : direction === 1;
      });
    },
    setSaved: async (fullname: string, saved: boolean) => update(fullname, thing => void (thing.saved = saved)),
    markRead: async (fullname: string) => update(fullname, thing => void (thing.new = false)),
  };
}
