import {describe, expect, it} from 'vitest';
import fixtures from '../../src/demo/fixtures.json';
import {
  parseAccount,
  parseInbox,
  parsePost,
  parsePostListing,
  parseSubreddits,
  parseThread,
  postIdFromContext,
} from '../../src/reddit/parse';

const responses = fixtures.responses as Record<string, unknown>;
const real = (key: string) => JSON.parse(JSON.stringify(responses[key]).replaceAll('demo:', 'https://i.example/'));

describe('posts', () => {
  it('reads a listing and its next-page cursor', () => {
    const listing = parsePostListing(real('/best'));
    expect(listing.after).toBe('t3_dm5');
    expect(listing.items.map(post => post.id)).toEqual(['dm1', 'dm2', 'dm3', 'dm4', 'dm5']);
  });

  it('tells post kinds apart and keeps only safe pictures', () => {
    const [text, link, image] = parsePostListing(real('/best')).items;
    expect(text).toMatchObject({kind: 'text', image: null, domain: null, flair: 'Discussion', vote: 0, saved: false});
    expect(text.body[0]).toBe('I keep buying new pairs and going back to the same one.');
    expect(link).toMatchObject({kind: 'link', domain: 'example.com'});
    expect(image).toMatchObject({kind: 'image', image: {url: 'https://i.example/coast', width: 640, height: 480}});
    const gallery = parsePostListing(real('/best?after=t3_dm5')).items[0];
    expect(gallery).toMatchObject({kind: 'gallery', image: {width: 640}});
  });

  it('hides pictures of NSFW and spoiler posts and drops non-https ones', () => {
    const base = (real('/best') as {data: {children: {data: Record<string, unknown>}[]}}).data.children[2].data;
    expect(parsePost({...base, over_18: true})?.image).toBeNull();
    expect(parsePost({...base, spoiler: true})?.image).toBeNull();
    const insecure = JSON.parse(JSON.stringify(base).replaceAll('https://i.example/', 'http://i.example/'));
    expect(parsePost(insecure)?.image).toBeNull();
  });

  it('maps likes to votes and strips flair emoji codes', () => {
    const base = (real('/best') as {data: {children: {data: Record<string, unknown>}[]}}).data.children[0].data;
    expect(parsePost({...base, likes: true})?.vote).toBe(1);
    expect(parsePost({...base, likes: false})?.vote).toBe(-1);
    expect(parsePost({...base, link_flair_text: ':discussion_2: Discussion'})?.flair).toBe('Discussion');
    expect(parsePost({id: 'x'})).toBeNull();
  });
});

describe('threads', () => {
  it('reads nested comments, OP marks and "more" counts', () => {
    const thread = parseThread(real('/comments/dm1'))!;
    expect(thread.post.id).toBe('dm1');
    expect(thread.comments.map(comment => comment.id)).toEqual(['c1', 'c2', 'c3']);
    const first = thread.comments[0];
    expect(first.moreReplies).toBe(3);
    expect(first.replies[0]).toMatchObject({id: 'c11', author: 'maya_j', byOp: true});
    expect(first.replies[0].replies[0].id).toBe('c111');
    expect(thread.comments[2].body).toEqual(['Honestly the band is what keeps me wearing them. Swipes beat any touchpad.']);
  });

  it('refuses answers that are not a thread', () => {
    expect(parseThread({})).toBeNull();
    expect(parseThread([{}, {}])).toBeNull();
  });
});

describe('inbox, communities and account', () => {
  it('reads replies with their post and private messages', () => {
    const inbox = parseInbox(real('/message/inbox')).items;
    expect(inbox[0]).toMatchObject({kind: 'comment', author: 'maya_j', unread: true, postId: 'dm1', subreddit: 'smartglasses'});
    expect(inbox[2]).toMatchObject({kind: 'message', subject: 'Battery tips', unread: false, postId: null});
    expect(postIdFromContext('/r/x/comments/abc123/slug/def456/?context=3')).toBe('abc123');
    expect(postIdFromContext('/message/messages/xyz')).toBeNull();
  });

  it('reads joined communities and the account', () => {
    const communities = parseSubreddits(real('/subreddits/mine/subscriber')).items;
    expect(communities[0]).toMatchObject({name: 'smartglasses', description: 'Daily wear, reviews and setups', icon: null});
    expect(parseAccount(real('/api/v1/me'))).toEqual({name: 'lumen_demo', inboxCount: 2});
    expect(parseAccount({})).toBeNull();
  });
});
