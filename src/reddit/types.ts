// The app's view of Reddit data, built from the API's listings by parse.ts.

/** A vote: up, down, or none (Reddit's `likes`: true, false, null). */
export type Vote = 1 | -1 | 0;

export type PostKind = 'text' | 'image' | 'gallery' | 'video' | 'link';

export type Image = {url: string; width: number; height: number};

export type Post = {
  /** Fullname, e.g. `t3_abc123`: what votes and saves take. */
  name: string;
  /** Base-36 id, e.g. `abc123`: what the comments endpoint takes. */
  id: string;
  title: string;
  /** Without the `r/` prefix. */
  subreddit: string;
  author: string;
  /** Seconds since the epoch. */
  created: number;
  score: number;
  hideScore: boolean;
  comments: number;
  vote: Vote;
  saved: boolean;
  kind: PostKind;
  /** Plain-text paragraphs of the self text (empty for link and media posts without text). */
  body: string[];
  /** Preview picture, when the post has one and it is safe to show. */
  image: Image | null;
  /** Host of an external link (`example.com`), null for self posts and Reddit media. */
  domain: string | null;
  flair: string | null;
  nsfw: boolean;
  spoiler: boolean;
  pinned: boolean;
  /** The subreddit's icon, when the listing included `sr_detail`. */
  subredditIcon: string | null;
};

export type Comment = {
  name: string;
  id: string;
  author: string;
  created: number;
  score: number;
  hideScore: boolean;
  vote: Vote;
  body: string[];
  /** The comment is by the post's author. */
  byOp: boolean;
  pinned: boolean;
  replies: Comment[];
  /** Replies the API left out of this response ("more" stubs). */
  moreReplies: number;
};

export type InboxItem = {
  name: string;
  /** `comment` for replies and mentions, `message` for private messages. */
  kind: 'comment' | 'message';
  author: string;
  subject: string;
  body: string[];
  created: number;
  unread: boolean;
  /** Without the `r/` prefix, for comment replies. */
  subreddit: string | null;
  /** The post a comment reply belongs to (base-36 id), from its context link. */
  postId: string | null;
};

export type Subreddit = {
  /** Without the `r/` prefix. */
  name: string;
  title: string;
  description: string;
  icon: string | null;
  subscribers: number | null;
};

export type Account = {
  name: string;
  inboxCount: number;
};

export type Listing<T> = {items: T[]; after: string | null};

export type Thread = {post: Post; comments: Comment[]};

/** Feeds that live under a fixed path. */
export type FeedSort = 'hot' | 'new' | 'top' | 'rising';
