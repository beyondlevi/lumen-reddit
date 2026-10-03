import {Toast} from '@wearables-ui-toolkit/mrbd';
import clockFilled from '@wearables-ui-toolkit/icons/svg/clock__filled.svg';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ConfigState} from '../config/lumenConfig';
import {createDemoClient} from '../demo/demoClient';
import {formatDuration} from '../format';
import {setLocaleOverride, t} from '../i18n/strings';
import {RedditClient, type RedditApi} from '../reddit/client';
import {fixedToken, RenewingToken} from '../reddit/session';
import type {Account} from '../reddit/types';
import {asRedditError, type Runner} from './storeTypes';
import {useLumenConfig} from './useLumenConfig';
import {useSessionChange} from './useSessionChange';

/** What the whole app shows: the session's state decides before any screen. */
export type Phase =
  | {kind: 'loading'}
  | {kind: 'setup'}
  | {kind: 'invalid'}
  /** `renewing`: reddit_session is set, so it is the session that ended, not just token_v2. */
  | {kind: 'expired'; renewing: boolean}
  | {kind: 'ready'};

/** Warn when the session ends within this long (token_v2 lives about 24 h). */
const SESSION_WARNING_MS = 2 * 60 * 60 * 1000;

function phaseFor(config: ConfigState, expired: boolean): Phase {
  switch (config.status) {
    case 'loading':
      return {kind: 'loading'};
    case 'missing':
      return {kind: 'setup'};
    case 'invalid':
      return {kind: 'invalid'};
    case 'demo':
      return {kind: 'ready'};
    case 'ready':
      return expired ? {kind: 'expired', renewing: config.config.renewal != null} : {kind: 'ready'};
  }
}

export type Session = {
  phase: Phase;
  /** Changes whenever the session does; stores reset on it. */
  api: RedditApi | null;
  account: Account | null;
  setAccount: (update: (previous: Account | null) => Account | null) => void;
  run: Runner;
  reloadConfig(): Promise<void>;
};

/** The configured Reddit session: its client, its account, and the request runner every store uses. */
export function useSession(): Session {
  const [config, reload] = useLumenConfig();
  const [expired, setExpired] = useState(false);
  const [account, setAccountState] = useState<Account | null>(null);
  const inflight = useRef(new Set<string>());

  const api: RedditApi | null = useMemo(() => {
    if (config.status === 'demo') {
      return createDemoClient();
    }
    if (config.status !== 'ready') {
      return null;
    }
    const {token, expiresAt, renewal, apiBase} = config.config;
    // With reddit_session set, token_v2 is renewed as needed; otherwise it is used until it ends.
    const credentials = renewal ? new RenewingToken(renewal, {token, expiresAt}) : fixedToken(token ?? '');
    return new RedditClient(credentials, apiBase);
  }, [config]);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    setLocaleOverride(config.status === 'demo' ? 'en' : null);
  }, [config.status]);
  useSessionChange(api, () => {
    setExpired(false);
    setAccountState(null);
    inflight.current.clear();
  });

  // An expired session switches the whole app to its sign-in state.
  const run = useCallback<Runner>(async (key, request) => {
    const client = apiRef.current;
    if (!client || inflight.current.has(key)) {
      return null;
    }
    inflight.current.add(key);
    try {
      return await request(client);
    } catch (error) {
      const failure = asRedditError(error);
      if (failure.kind === 'auth') {
        setExpired(true);
      }
      throw failure;
    } finally {
      inflight.current.delete(key);
    }
  }, []);

  // The account: the inbox count, and a first check that the session works.
  useEffect(() => {
    if (!api) {
      return;
    }
    let alive = true;
    api.account().then(
      next => alive && setAccountState(next),
      error => alive && asRedditError(error).kind === 'auth' && setExpired(true),
    );
    if (config.status === 'ready' && config.config.renewal == null && config.config.expiresAt != null) {
      const left = config.config.expiresAt - Date.now();
      if (left > 0 && left < SESSION_WARNING_MS) {
        Toast.show(t('sessionEnding', {time: formatDuration(left)}), t('sessionEndingMeta'), clockFilled);
      }
    }
    return () => {
      alive = false;
    };
  }, [api, config]);

  const reloadConfig = useCallback(async () => {
    setExpired(false);
    await reload();
  }, [reload]);

  return {phase: phaseFor(config, expired), api, account, setAccount: setAccountState, run, reloadConfig};
}
