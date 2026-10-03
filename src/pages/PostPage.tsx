import bookmarkFilled from '@wearables-ui-toolkit/icons/svg/bookmark__filled.svg';
import speechBubbleFilled from '@wearables-ui-toolkit/icons/svg/speechbubble__filled.svg';
import {
  Button,
  ButtonDivider,
  ButtonRail,
  Card,
  CardBelowScrim,
  Page,
  Panel,
  ScrollView,
  Tag,
  TextColor,
  TextStyle,
  TextView,
} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {ErrorContent, LoadingContent} from '../components/StateContent';
import {VoteButtons} from '../components/VoteRail';
import {cardAspect, formatAge} from '../format';
import {formatCount, t, tp} from '../i18n/strings';
import {commentsPath, picturePath} from '../paths';
import type {Post} from '../reddit/types';
import {useReddit} from '../RedditProvider';

function tags(post: Post): string[] {
  const list: string[] = [];
  if (post.pinned) list.push(t('tagPinned'));
  if (post.nsfw) list.push(t('tagNsfw'));
  if (post.spoiler) list.push(t('tagSpoiler'));
  if (post.kind === 'video') list.push(t('tagVideo'));
  if (post.kind === 'gallery') list.push(t('tagGallery'));
  if (post.flair) list.push(post.flair);
  return list;
}

function PostHeading({post}: {post: Post}) {
  const labels = tags(post);
  const note = post.kind === 'video' ? t('videoNote') : post.kind === 'gallery' ? t('galleryNote') : null;
  return (
    <div className="post-heading">
      <TextView as="h2" textStyle={TextStyle.BODY2_EMPHASIZED}>
        {post.title}
      </TextView>
      <div className="post-meta">
        <TextView as="span" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
          {t('byAuthor', {author: post.author})}
        </TextView>
        {labels.map(label => (
          <Tag key={label} text={label} />
        ))}
      </div>
      {post.domain ? (
        <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
          {t('linkDomain', {domain: post.domain})}
        </TextView>
      ) : null}
      {note ? (
        <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
          {note}
        </TextView>
      ) : null}
    </div>
  );
}

function PostBody({post}: {post: Post}) {
  return (
    <>
      {post.body.map((paragraph, index) => (
        <TextView key={index} as="p" textStyle={TextStyle.LABEL}>
          {paragraph}
        </TextView>
      ))}
    </>
  );
}

/** A text post reads on one Panel; a picture post leads with its Card. */
function PostContent({post}: {post: Post}) {
  const navigate = useNavigate();
  if (!post.image) {
    return (
      <ScrollView insetForHeader tabIndex={0} ariaLabel={t('postLabel')}>
        <Panel width="100%">
          <div className="panel-text">
            <PostHeading post={post} />
            <PostBody post={post} />
          </div>
        </Panel>
      </ScrollView>
    );
  }
  return (
    <ScrollView insetForHeader ariaLabel={t('postLabel')}>
      <div className="content-inset">
        <Card
          className="post-card"
          style={{aspectRatio: cardAspect(post.image)}}
          width="100%"
          height="auto"
          aria-label={t('imageLabel', {title: post.title})}
          onClick={() => navigate(picturePath(post.id))}>
          <CardBelowScrim style={{position: 'absolute', inset: 0}}>
            <img className="post-card-image" src={post.image.url} alt="" decoding="async" />
          </CardBelowScrim>
        </Card>
        <PostHeading post={post} />
        <PostBody post={post} />
      </div>
    </ScrollView>
  );
}

/** A post: picture or text, then Upvote, Downvote, Comments and Save in the dock. */
export function PostPage() {
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const {post: getPost, thread, loadThread, votePost, toggleSave} = useReddit();
  const post = getPost(id);
  const state = thread(id);

  // The thread brings the post's current score, vote and save state.
  useEffect(() => {
    loadThread(id);
  }, [id, loadThread]);

  if (!post) {
    return (
      <Page headerText={t('postLabel')} headerIsLoading={state.status !== 'error'} enableSystemBarInset={false}>
        {state.status === 'error' ? (
          <ErrorContent error={state.error} onRetry={() => loadThread(id, {refresh: true})} />
        ) : <LoadingContent />}
      </Page>
    );
  }

  return (
    <Page headerText={t('subredditName', {name: post.subreddit})} headerMetadata={formatAge(post.created)} enableSystemBarInset={false}>
      <div className="action-page-shell">
        <PostContent post={post} />
        <div className="action-dock">
          <ButtonRail>
            <VoteButtons vote={post.vote} score={post.score} hideScore={post.hideScore} onVote={direction => votePost(post.id, direction)} />
            <ButtonDivider />
            <Button
              title={formatCount(post.comments)}
              icon={speechBubbleFilled}
              alwaysShowText
              aria-label={tp('commentsCount', post.comments)}
              initialFocusEligible={false}
              onClick={() => navigate(commentsPath(post.id))}
            />
            <Button
              icon={bookmarkFilled}
              showIconActiveIndicator={post.saved}
              aria-label={post.saved ? t('unsave') : t('save')}
              aria-pressed={post.saved}
              initialFocusEligible={false}
              onClick={() => toggleSave(post.id)}
            />
          </ButtonRail>
        </div>
      </div>
    </Page>
  );
}

