// Turns Reddit API JSON (requested with raw_json=1, so URLs and text are not
// HTML-escaped) into the app's models. Every field is checked: a missing or
// odd value degrades to a default instead of throwing.
import {markdownToParagraphs} from './markdown';
import type {
  Account,
  Comment,
  Image,
  InboxItem,
  Listing,
  Post,
  PostKind,
  Subreddit,
  Thread,
  Vote,
} from './types';

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => value != null && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const optStr = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** The width the app asks for: a little over the 600 px viewport. */
export const TARGET_IMAGE_WIDTH = 640;

function vote(likes: unknown): Vote {
  return likes === true ? 1 : likes === false ? -1 : 0;
}

function httpsUrl(value: unknown): string | null {
  const url = optStr(value);
  if (url == null) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && loopback) ? url : null;
  } catch {
    return null;
  }
}

/** The smallest variant at least TARGET_IMAGE_WIDTH wide, else the largest. */
function pickVariant(variants: Image[]): Image | null {
  const sorted = variants.filter(image => image.width > 0 && image.height > 0).sort((a, b) => a.width - b.width);
  return sorted.find(image => image.width >= TARGET_IMAGE_WIDTH) ?? sorted.at(-1) ?? null;
}

function previewImage(data: Json): Image | null {
  const preview = data.preview;
  if (!isObject(preview) || !Array.isArray(preview.images) || !isObject(preview.images[0])) {
    return null;
  }
  const first = preview.images[0];
  const variants: Image[] = [];
  for (const entry of [...(Array.isArray(first.resolutions) ? first.resolutions : []), first.source]) {
    if (isObject(entry)) {
      const url = httpsUrl(entry.url);
      if (url) {
        variants.push({url, width: num(entry.width), height: num(entry.height)});
      }
    }
  }
  return pickVariant(variants);
}

function galleryImage(data: Json): Image | null {
  const metadata = data.media_metadata;
  const gallery = data.gallery_data;
  if (!isObject(metadata) || !isObject(gallery) || !Array.isArray(gallery.items)) {
    return null;
  }
  for (const item of gallery.items) {
    const media = isObject(item) ? metadata[str(item.media_id)] : null;
    if (!isObject(media) || media.status !== 'valid') {
      continue;
    }
    const variants: Image[] = [];
    for (const entry of [...(Array.isArray(media.p) ? media.p : []), media.s]) {
      if (isObject(entry)) {
        const url = httpsUrl(entry.u);
        if (url) {
          variants.push({url, width: num(entry.x), height: num(entry.y)});
        }
      }
    }
    const picked = pickVariant(variants);
    if (picked) {
      return picked;
    }
  }
  return null;
}

function postKind(data: Json): PostKind {
  if (data.is_gallery === true) {
    return 'gallery';
  }
  if (data.is_video === true || str(data.post_hint).endsWith(':video')) {
    return 'video';
  }
  if (data.post_hint === 'image') {
    return 'image';
  }
  if (data.is_self === true) {
    return 'text';
  }
  return 'link';
}

function subredditIcon(data: Json): string | null {
  const detail = data.sr_detail;
  if (!isObject(detail)) {
    return null;
  }
  return httpsUrl(detail.community_icon) ?? httpsUrl(detail.icon_img);
}

export function parsePost(data: unknown): Post | null {
  if (!isObject(data) || !str(data.id) || !str(data.name).startsWith('t3_')) {
    return null;
  }
  const kind = postKind(data);
  const nsfw = data.over_18 === true;
  const spoiler = data.spoiler === true;
  const image = nsfw || spoiler ? null : kind === 'gallery' ? galleryImage(data) ?? previewImage(data) : kind === 'text' ? null : previewImage(data);
  const domain = kind === 'link' ? optStr(data.domain) : null;
  return {
    name: str(data.name),
    id: str(data.id),
    title: str(data.title).trim(),
    subreddit: str(data.subreddit),
    author: str(data.author) || '[deleted]',
    created: num(data.created_utc),
    score: num(data.score),
    hideScore: data.hide_score === true,
    comments: num(data.num_comments),
    vote: vote(data.likes),
    saved: data.saved === true,
    kind,
    body: markdownToParagraphs(str(data.selftext)),
    image,
    domain,
    flair: optStr(data.link_flair_text)?.replace(/:[a-z0-9_-]+:/gi, '').trim() || null,
    nsfw,
    spoiler,
    pinned: data.stickied === true,
    subredditIcon: subredditIcon(data),
  };
}

function children(listing: unknown): {kind: string; data: Json}[] {
  if (!isObject(listing) || !isObject(listing.data) || !Array.isArray(listing.data.children)) {
    return [];
  }
  return listing.data.children
    .filter(isObject)
    .map(child => ({kind: str(child.kind), data: isObject(child.data) ? child.data : {}}));
}

function after(listing: unknown): string | null {
  return isObject(listing) && isObject(listing.data) ? optStr(listing.data.after) : null;
}

export function parsePostListing(listing: unknown): Listing<Post> {
  const items = children(listing)
    .filter(child => child.kind === 't3')
    .map(child => parsePost(child.data))
    .filter((post): post is Post => post != null);
  return {items, after: after(listing)};
}

export function parseComment(data: Json, opAuthor: string): Comment | null {
  if (!str(data.id) || !str(data.name).startsWith('t1_')) {
    return null;
  }
  const replies: Comment[] = [];
  let moreReplies = 0;
  for (const child of children(data.replies)) {
    if (child.kind === 't1') {
      const reply = parseComment(child.data, opAuthor);
      if (reply) {
        replies.push(reply);
      }
    } else if (child.kind === 'more') {
      moreReplies += num(child.data.count);
    }
  }
  const author = str(data.author) || '[deleted]';
  return {
    name: str(data.name),
    id: str(data.id),
    author,
    created: num(data.created_utc),
    score: num(data.score),
    hideScore: data.score_hidden === true,
    vote: vote(data.likes),
    body: markdownToParagraphs(str(data.body)),
    byOp: opAuthor !== '' && author === opAuthor && author !== '[deleted]',
    pinned: data.stickied === true,
    replies,
    moreReplies,
  };
}

/** `/comments/{id}` answers with two listings: the post, then its comment tree. */
export function parseThread(json: unknown): Thread | null {
  if (!Array.isArray(json) || json.length < 2) {
    return null;
  }
  const post = parsePostListing(json[0]).items[0];
  if (!post) {
    return null;
  }
  const comments = children(json[1])
    .filter(child => child.kind === 't1')
    .map(child => parseComment(child.data, post.author))
    .filter((comment): comment is Comment => comment != null);
  return {post, comments};
}

/** `/r/x/comments/abc123/slug/def456/?context=3` → `abc123`. */
export function postIdFromContext(context: string): string | null {
  const match = /\/comments\/([a-z0-9]+)(?:\/|$)/i.exec(context);
  return match ? match[1] : null;
}

export function parseInbox(listing: unknown): Listing<InboxItem> {
  const items: InboxItem[] = [];
  for (const child of children(listing)) {
    const data = child.data;
    if ((child.kind !== 't1' && child.kind !== 't4') || !str(data.name)) {
      continue;
    }
    const isComment = child.kind === 't1' || data.was_comment === true;
    items.push({
      name: str(data.name),
      kind: isComment ? 'comment' : 'message',
      author: str(data.author) || str(data.subreddit_name_prefixed) || 'reddit',
      subject: (isComment ? str(data.link_title) : str(data.subject)).trim(),
      body: markdownToParagraphs(str(data.body)),
      created: num(data.created_utc),
      unread: data.new === true,
      subreddit: optStr(data.subreddit),
      postId: isComment ? postIdFromContext(str(data.context)) : null,
    });
  }
  return {items, after: after(listing)};
}

export function parseSubreddits(listing: unknown): Listing<Subreddit> {
  const items: Subreddit[] = [];
  for (const child of children(listing)) {
    const data = child.data;
    if (child.kind !== 't5' || !str(data.display_name)) {
      continue;
    }
    items.push({
      name: str(data.display_name),
      title: str(data.title).trim(),
      description: str(data.public_description).replace(/\s+/g, ' ').trim(),
      icon: httpsUrl(data.community_icon) ?? httpsUrl(data.icon_img),
      subscribers: typeof data.subscribers === 'number' ? data.subscribers : null,
    });
  }
  return {items, after: after(listing)};
}

export function parseAccount(json: unknown): Account | null {
  if (!isObject(json) || !str(json.name)) {
    return null;
  }
  return {name: str(json.name), inboxCount: num(json.inbox_count)};
}
