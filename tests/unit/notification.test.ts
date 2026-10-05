import {describe, expect, it} from 'vitest';
import {notificationTarget} from '../../src/notification';

describe('notificationTarget', () => {
  it('opens the post of activity on a post', () => {
    expect(notificationTarget('agg:t2_8xk2v:t3_1nq4zk7:3')).toEqual({kind: 'post', postId: '1nq4zk7', commentId: null});
    expect(notificationTarget('agg:t2_x:t3_dm1:0')).toEqual({kind: 'post', postId: 'dm1', commentId: null});
  });

  it('reads a tag that is still URL-encoded', () => {
    expect(notificationTarget('agg%3At2_x%3At3_dm1%3A3')).toEqual({kind: 'post', postId: 'dm1', commentId: null});
  });

  it('opens the comment when the tag names its post too', () => {
    expect(notificationTarget('reply:t3_dm1:t1_c11')).toEqual({kind: 'post', postId: 'dm1', commentId: 'c11'});
    expect(notificationTarget('t1_c2/t3_DM1')).toEqual({kind: 'post', postId: 'dm1', commentId: 'c2'});
  });

  it('opens the Inbox for a comment without its post, a message, a UUID or a summary', () => {
    expect(notificationTarget('t1_c11')).toEqual({kind: 'inbox'});
    expect(notificationTarget('pm:t4_3h9za1')).toEqual({kind: 'inbox'});
    expect(notificationTarget('34ac9ceb-fd6f-4d72-af1c-8a91aedf11ab')).toEqual({kind: 'inbox'});
    expect(notificationTarget('ranker_group')).toEqual({kind: 'inbox'});
  });

  it('opens the Inbox for an empty or garbage tag', () => {
    for (const tag of ['', ' ', '%E0%A4%A', 'null', 't3_', 'xt3_abc', 't3_' + 'a'.repeat(40), 'agg:t2_x::4', 't3-abc', '%%%', 'T3 abc']) {
      expect(notificationTarget(tag), tag).toEqual({kind: 'inbox'});
    }
  });

  it('takes the first post when a tag names several', () => {
    expect(notificationTarget('agg:t3_aa1:t3_bb2:1')).toEqual({kind: 'post', postId: 'aa1', commentId: null});
  });
});
