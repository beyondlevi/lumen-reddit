import {RedditError} from '../reddit/client';
import type {Comment, Vote} from '../reddit/types';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type FeedState = {
  status: LoadStatus;
  ids: string[];
  after: string | null;
  loadingMore: boolean;
  error: RedditError | null;
};

export type CollectionState<T> = {
  status: LoadStatus;
  items: T[];
  after: string | null;
  loadingMore: boolean;
  error: RedditError | null;
};

export type ThreadState = {status: LoadStatus; comments: Comment[]; error: RedditError | null};

export const EMPTY_FEED: FeedState = {status: 'idle', ids: [], after: null, loadingMore: false, error: null};
export const EMPTY_THREAD: ThreadState = {status: 'idle', comments: [], error: null};

export function emptyCollection<T>(): CollectionState<T> {
  return {status: 'idle', items: [], after: null, loadingMore: false, error: null};
}

export function asRedditError(error: unknown): RedditError {
  return error instanceof RedditError ? error : new RedditError('server');
}

/** Runs a request once per key at a time; resolves null when it was skipped. */
export type Runner = <T>(key: string, request: (client: import('../reddit/client').RedditApi) => Promise<T>) => Promise<T | null>;

export function mapComments(comments: Comment[], name: string, update: (comment: Comment) => Comment): Comment[] {
  return comments.map(comment =>
    comment.name === name
      ? update(comment)
      : comment.replies.length
        ? {...comment, replies: mapComments(comment.replies, name, update)}
        : comment,
  );
}

export function findCommentByName(comments: Comment[], name: string): Comment | null {
  for (const comment of comments) {
    if (comment.name === name) {
      return comment;
    }
    const found = findCommentByName(comment.replies, name);
    if (found) {
      return found;
    }
  }
  return null;
}

/** The item with a new vote and its score moved by the difference. */
export function rescore<T extends {score: number; vote: Vote}>(item: T, direction: Vote): T {
  return {...item, vote: direction, score: item.score - item.vote + direction};
}
