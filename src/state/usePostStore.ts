import {Toast} from '@wearables-ui-toolkit/mrbd';
import bookmarkFilled from '@wearables-ui-toolkit/icons/svg/bookmark__filled.svg';
import circleAlertFilled from '@wearables-ui-toolkit/icons/svg/circlealert__filled.svg';
import {useCallback, useEffect, useRef, useState} from 'react';
import {failureReason} from '../failure';
import {t} from '../i18n/strings';
import {feedKey, type FeedSource, type RedditApi} from '../reddit/client';
import type {Comment, Post, Vote} from '../reddit/types';
import {
  asRedditError,
  EMPTY_FEED,
  EMPTY_THREAD,
  findCommentByName,
  mapComments,
  rescore,
  type FeedState,
  type Runner,
  type ThreadState,
} from './storeTypes';

export type PostStore = {
  post(id: string): Post | null;
  feed(source: FeedSource): FeedState;
  loadFeed(source: FeedSource, options?: {refresh?: boolean}): void;
  loadMore(source: FeedSource): void;
  thread(postId: string): ThreadState;
  loadThread(postId: string, options?: {refresh?: boolean}): void;
  votePost(postId: string, direction: Vote): void;
  voteComment(postId: string, commentName: string, direction: Vote): void;
  toggleSave(postId: string): void;
};

/** Posts, feeds and comment threads, with optimistic votes and saves. */
export function usePostStore(api: RedditApi | null, run: Runner): PostStore {
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [feeds, setFeeds] = useState<Record<string, FeedState>>({});
  const [threads, setThreads] = useState<Record<string, ThreadState>>({});
  const postsRef = useRef(posts);
  postsRef.current = posts;
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  // Nothing from another session lingers.
  useEffect(() => {
    setPosts({});
    setFeeds({});
    setThreads({});
  }, [api]);

  const storePosts = useCallback((items: Post[]) => {
    setPosts(previous => {
      const next = {...previous};
      for (const item of items) {
        next[item.id] = item;
      }
      return next;
    });
  }, []);

  const feed = useCallback((source: FeedSource) => feeds[feedKey(source)] ?? EMPTY_FEED, [feeds]);

  const loadFeed = useCallback(
    (source: FeedSource, options: {refresh?: boolean} = {}) => {
      const key = feedKey(source);
      const current = feeds[key];
      if (!options.refresh && current && (current.status === 'ready' || current.status === 'loading')) {
        return;
      }
      setFeeds(previous => ({...previous, [key]: {...(previous[key] ?? EMPTY_FEED), status: 'loading', error: null}}));
      run(`feed:${key}`, client => client.feed(source)).then(
        listing => {
          if (!listing) {
            return;
          }
          storePosts(listing.items);
          setFeeds(previous => ({
            ...previous,
            [key]: {status: 'ready', ids: listing.items.map(post => post.id), after: listing.after, loadingMore: false, error: null},
          }));
        },
        error =>
          setFeeds(previous => ({...previous, [key]: {...(previous[key] ?? EMPTY_FEED), status: 'error', error: asRedditError(error)}})),
      );
    },
    [feeds, run, storePosts],
  );

  const loadMore = useCallback(
    (source: FeedSource) => {
      const key = feedKey(source);
      const current = feeds[key];
      if (!current || current.status !== 'ready' || !current.after || current.loadingMore) {
        return;
      }
      setFeeds(previous => ({...previous, [key]: {...current, loadingMore: true}}));
      run(`more:${key}`, client => client.feed(source, current.after)).then(
        listing => {
          if (!listing) {
            return;
          }
          storePosts(listing.items);
          setFeeds(previous => {
            const base = previous[key] ?? current;
            const seen = new Set(base.ids);
            const ids = [...base.ids, ...listing.items.map(post => post.id).filter(id => !seen.has(id))];
            return {...previous, [key]: {...base, ids, after: listing.after, loadingMore: false}};
          });
        },
        () => setFeeds(previous => ({...previous, [key]: {...(previous[key] ?? current), loadingMore: false}})),
      );
    },
    [feeds, run, storePosts],
  );

  const thread = useCallback((postId: string) => threads[postId] ?? EMPTY_THREAD, [threads]);

  const loadThread = useCallback(
    (postId: string, options: {refresh?: boolean} = {}) => {
      const current = threads[postId];
      if (!options.refresh && current && (current.status === 'ready' || current.status === 'loading')) {
        return;
      }
      setThreads(previous => ({...previous, [postId]: {...(previous[postId] ?? EMPTY_THREAD), status: 'loading', error: null}}));
      run(`thread:${postId}`, client => client.thread(postId)).then(
        result => {
          if (!result) {
            return;
          }
          storePosts([result.post]);
          setThreads(previous => ({...previous, [postId]: {status: 'ready', comments: result.comments, error: null}}));
        },
        error =>
          setThreads(previous => ({
            ...previous,
            [postId]: {...(previous[postId] ?? EMPTY_THREAD), status: 'error', error: asRedditError(error)},
          })),
      );
    },
    [run, storePosts, threads],
  );

  const votePost = useCallback(
    (postId: string, direction: Vote) => {
      const before = postsRef.current[postId];
      if (!before) {
        return;
      }
      setPosts(previous => ({...previous, [postId]: rescore(previous[postId] ?? before, direction)}));
      run(`vote:${before.name}:${direction}`, client => client.vote(before.name, direction)).catch(error => {
        setPosts(previous => ({...previous, [postId]: {...(previous[postId] ?? before), vote: before.vote, score: before.score}}));
        Toast.show(t('voteFailed'), failureReason(error), circleAlertFilled);
      });
    },
    [run],
  );

  const voteComment = useCallback(
    (postId: string, commentName: string, direction: Vote) => {
      const before: Comment | null = findCommentByName(threadsRef.current[postId]?.comments ?? [], commentName);
      if (!before) {
        return;
      }
      const update = (change: (comment: Comment) => Comment) =>
        setThreads(previous => {
          const current = previous[postId];
          return current ? {...previous, [postId]: {...current, comments: mapComments(current.comments, commentName, change)}} : previous;
        });
      update(comment => rescore(comment, direction));
      run(`vote:${commentName}:${direction}`, client => client.vote(commentName, direction)).catch(error => {
        update(comment => ({...comment, vote: before.vote, score: before.score}));
        Toast.show(t('voteFailed'), failureReason(error), circleAlertFilled);
      });
    },
    [run],
  );

  const toggleSave = useCallback(
    (postId: string) => {
      const before = postsRef.current[postId];
      if (!before) {
        return;
      }
      const saved = !before.saved;
      setPosts(previous => ({...previous, [postId]: {...(previous[postId] ?? before), saved}}));
      run(`save:${before.name}`, client => client.setSaved(before.name, saved)).then(
        done => {
          if (done !== null) {
            Toast.show(t(saved ? 'saved' : 'unsaved'), t('subredditName', {name: before.subreddit}), bookmarkFilled);
          }
        },
        error => {
          setPosts(previous => ({...previous, [postId]: {...(previous[postId] ?? before), saved: before.saved}}));
          Toast.show(t('saveFailed'), failureReason(error), circleAlertFilled);
        },
      );
    },
    [run],
  );

  const post = useCallback((id: string) => posts[id] ?? null, [posts]);

  return {post, feed, loadFeed, loadMore, thread, loadThread, votePost, voteComment, toggleSave};
}
