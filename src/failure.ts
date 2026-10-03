import {t, type StringKey} from './i18n/strings';
import type {RedditErrorKind} from './reddit/client';

const FAILURE_REASONS: Record<RedditErrorKind, StringKey> = {
  network: 'reasonNetwork',
  auth: 'reasonAuth',
  ratelimit: 'reasonRate',
  notfound: 'reasonNotFound',
  forbidden: 'reasonForbidden',
  server: 'reasonServer',
  renewal: 'reasonRenewal',
};

/** Short reason for a failed request, for toasts. */
export function failureReason(error: unknown): string {
  const kind = error instanceof Error && 'kind' in error ? String(error.kind) : '';
  return t(kind in FAILURE_REASONS ? FAILURE_REASONS[kind as RedditErrorKind] : 'reasonServer');
}
