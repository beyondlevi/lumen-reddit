import {ListItem, Page, TimestampPosition, VerticalList} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {avatarFallback} from '../components/avatarFallback';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {formatWhen, snippet} from '../format';
import {t, tp} from '../i18n/strings';
import {commentPath} from '../paths';
import type {Comment} from '../reddit/types';
import {useReddit} from '../RedditProvider';

export function findComment(comments: Comment[], id: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    const found = findComment(comment.replies, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * The comments of a post (`/post/:id/comments`) or the replies to one comment
 * (`/post/:id/comment/:commentId/replies`). Each row opens that comment.
 */
export function CommentsPage() {
  const {id = '', commentId} = useParams();
  const navigate = useNavigate();
  const {thread, loadThread} = useReddit();
  const state = thread(id);

  useEffect(() => {
    loadThread(id);
  }, [id, loadThread]);

  const parent = commentId ? findComment(state.comments, commentId) : null;
  const comments = commentId ? parent?.replies ?? [] : state.comments;
  const more = commentId ? parent?.moreReplies ?? 0 : 0;
  const header = commentId ? t('repliesHeader') : t('commentsHeader');

  if (state.status === 'error' && state.comments.length === 0) {
    return (
      <Page headerText={header} enableSystemBarInset={false}>
        <ErrorContent error={state.error} onRetry={() => loadThread(id, {refresh: true})} />
      </Page>
    );
  }
  if (state.status !== 'ready') {
    return (
      <Page headerText={header} headerIsLoading enableSystemBarInset={false}>
        <LoadingContent />
      </Page>
    );
  }
  if (comments.length === 0) {
    return (
      <Page headerText={header} enableSystemBarInset={false}>
        <StateContent
          title={commentId ? t('noRepliesTitle') : t('noCommentsTitle')}
          body={more > 0 ? tp('moreOnReddit', more) : commentId ? t('noRepliesBody') : t('noCommentsBody')}
          ariaLabel={t('emptyLabel')}
        />
      </Page>
    );
  }

  return (
    <Page headerText={header} enableSystemBarInset={false}>
      <VerticalList insetForHeader ariaLabel={commentId ? t('repliesHeader') : t('commentsLabel')}>
        {comments.map(comment => (
          <ListItem
            key={comment.id}
            title={t('byAuthor', {author: comment.author})}
            subtitle={snippet(comment.body, 240) || t('deletedBody')}
            subtitleMaxLines={3}
            timestamp={formatWhen(comment.created)}
            timestampPosition={TimestampPosition.ACCESSORY_TOP}
            avatarPrimaryContent={avatarFallback(comment.author)}
            avatarAlt={comment.author}
            onClick={() => navigate(commentPath(id, comment.id))}
          />
        ))}
      </VerticalList>
    </Page>
  );
}
