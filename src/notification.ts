/** Where a Reddit notification on the phone opens the app. */
export type NotificationTarget = {kind: 'post'; postId: string; commentId: string | null} | {kind: 'inbox'};

/** A Reddit fullname (`t1_` comment, `t3_` post, `t4_` message) standing on its own inside the tag. */
const FULLNAME = /(?:^|[^a-z0-9])(t[134])_([a-z0-9]{1,13})(?![a-z0-9])/gi;

function decoded(tag: string): string {
  try {
    return decodeURIComponent(tag);
  } catch {
    return tag;
  }
}

/**
 * Reads the notification's tag on the phone, as the Lumen host sends it in
 * `/notification/{tag}`: activity on a post (`agg:t2_<user>:t3_<post>:<n>`)
 * opens the post, or its comment when the tag names one too; a message
 * (`t4_`), a UUID or anything else opens the Inbox.
 */
export function notificationTarget(tag: string): NotificationTarget {
  const ids: Record<string, string> = {};
  for (const [, kind, id] of decoded(tag).matchAll(FULLNAME)) {
    const key = kind.toLowerCase();
    ids[key] ??= id.toLowerCase();
  }
  if (ids.t3) {
    return {kind: 'post', postId: ids.t3, commentId: ids.t1 ?? null};
  }
  return {kind: 'inbox'};
}
