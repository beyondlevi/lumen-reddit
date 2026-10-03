import {useCallback, useEffect, useState} from 'react';
import type {RedditApi} from '../reddit/client';
import type {Account, InboxItem, Subreddit} from '../reddit/types';
import {asRedditError, emptyCollection, type CollectionState, type Runner} from './storeTypes';

export type AccountStore = {
  subscriptions: CollectionState<Subreddit>;
  loadSubscriptions(options?: {refresh?: boolean}): void;
  inbox: CollectionState<InboxItem>;
  loadInbox(options?: {refresh?: boolean}): void;
  loadMoreInbox(): void;
  markRead(item: InboxItem): void;
};

/** Joined communities, at most this many pages of 100. */
const MAX_SUBSCRIPTION_PAGES = 5;

/** The account's own collections: joined communities and the inbox. */
export function useAccountStore(
  api: RedditApi | null,
  run: Runner,
  setAccount: (update: (previous: Account | null) => Account | null) => void,
): AccountStore {
  const [subscriptions, setSubscriptions] = useState<CollectionState<Subreddit>>(emptyCollection);
  const [inbox, setInbox] = useState<CollectionState<InboxItem>>(emptyCollection);

  useEffect(() => {
    setSubscriptions(emptyCollection());
    setInbox(emptyCollection());
  }, [api]);

  const loadSubscriptions = useCallback(
    (options: {refresh?: boolean} = {}) => {
      if (!options.refresh && (subscriptions.status === 'ready' || subscriptions.status === 'loading')) {
        return;
      }
      setSubscriptions(previous => ({...previous, status: 'loading', error: null}));
      run('subscriptions', async client => {
        const items: Subreddit[] = [];
        let after: string | null = null;
        for (let page = 0; page < MAX_SUBSCRIPTION_PAGES; page += 1) {
          const listing = await client.subscriptions(after);
          items.push(...listing.items);
          after = listing.after;
          if (!after) {
            break;
          }
        }
        return items;
      }).then(
        items => {
          if (!items) {
            return;
          }
          items.sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}));
          setSubscriptions({status: 'ready', items, after: null, loadingMore: false, error: null});
        },
        error => setSubscriptions(previous => ({...previous, status: 'error', error: asRedditError(error)})),
      );
    },
    [run, subscriptions.status],
  );

  const loadInbox = useCallback(
    (options: {refresh?: boolean} = {}) => {
      if (!options.refresh && (inbox.status === 'ready' || inbox.status === 'loading')) {
        return;
      }
      setInbox(previous => ({...previous, status: 'loading', error: null}));
      run('inbox', client => client.inbox()).then(
        listing => listing && setInbox({status: 'ready', items: listing.items, after: listing.after, loadingMore: false, error: null}),
        error => setInbox(previous => ({...previous, status: 'error', error: asRedditError(error)})),
      );
    },
    [inbox.status, run],
  );

  const loadMoreInbox = useCallback(() => {
    if (inbox.status !== 'ready' || !inbox.after || inbox.loadingMore) {
      return;
    }
    const after = inbox.after;
    setInbox(previous => ({...previous, loadingMore: true}));
    run('inbox:more', client => client.inbox(after)).then(
      listing =>
        listing &&
        setInbox(previous => {
          const seen = new Set(previous.items.map(item => item.name));
          return {
            ...previous,
            items: [...previous.items, ...listing.items.filter(item => !seen.has(item.name))],
            after: listing.after,
            loadingMore: false,
          };
        }),
      () => setInbox(previous => ({...previous, loadingMore: false})),
    );
  }, [inbox, run]);

  const markRead = useCallback(
    (item: InboxItem) => {
      if (!item.unread) {
        return;
      }
      setInbox(previous => ({...previous, items: previous.items.map(entry => (entry.name === item.name ? {...entry, unread: false} : entry))}));
      setAccount(previous => (previous ? {...previous, inboxCount: Math.max(0, previous.inboxCount - 1)} : previous));
      // Best effort: the row is read locally even when Reddit misses this call.
      run(`read:${item.name}`, client => client.markRead(item.name)).catch(() => {});
    },
    [run, setAccount],
  );

  return {subscriptions, loadSubscriptions, inbox, loadInbox, loadMoreInbox, markRead};
}
