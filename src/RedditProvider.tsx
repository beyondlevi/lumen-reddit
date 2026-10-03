import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import type {Account} from './reddit/types';
import {useAccountStore, type AccountStore} from './state/useAccountStore';
import {usePostStore, type PostStore} from './state/usePostStore';
import {useSession, type Phase} from './state/useSession';

export type {Phase} from './state/useSession';

type RedditContextValue = PostStore &
  AccountStore & {
    phase: Phase;
    account: Account | null;
    /** The pager's tab, kept here so it survives opening a post and coming back. */
    tab: number;
    setTab(index: number): void;
    reloadConfig(): Promise<void>;
  };

const RedditContext = createContext<RedditContextValue | null>(null);

/** One store for the app, mounted outside the page transitions so every route sees the same state. */
export function RedditProvider({children}: {children: ReactNode}) {
  const session = useSession();
  const posts = usePostStore(session.api, session.run);
  const account = useAccountStore(session.api, session.run, session.setAccount);
  const [tab, setTab] = useState(0);

  const value = useMemo<RedditContextValue>(
    () => ({...posts, ...account, phase: session.phase, account: session.account, tab, setTab, reloadConfig: session.reloadConfig}),
    [account, posts, session.account, session.phase, session.reloadConfig, tab],
  );
  return <RedditContext.Provider value={value}>{children}</RedditContext.Provider>;
}

export function useReddit(): RedditContextValue {
  const value = useContext(RedditContext);
  if (!value) {
    throw new Error('useReddit must be used inside RedditProvider');
  }
  return value;
}
