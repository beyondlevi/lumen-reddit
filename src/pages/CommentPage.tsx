import speechBubbleFilled from '@wearables-ui-toolkit/icons/svg/speechbubble__filled.svg';
import {
  Button,
  ButtonDivider,
  ButtonRail,
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
import {formatAge} from '../format';
import {t, tp} from '../i18n/strings';
import {repliesPath} from '../paths';
import {useReddit} from '../RedditProvider';
import {findComment} from './CommentsPage';

/** One comment in full, with its votes and the way to its replies. */
export function CommentPage() {
  const {id = '', commentId = ''} = useParams();
  const navigate = useNavigate();
  const {thread, loadThread, voteComment} = useReddit();
  const state = thread(id);
  const comment = findComment(state.comments, commentId);

  useEffect(() => {
    loadThread(id);
  }, [id, loadThread]);

  if (!comment) {
    return (
      <Page headerText={t('commentsHeader')} headerIsLoading={state.status === 'loading'} enableSystemBarInset={false}>
        {state.status === 'loading' ? <LoadingContent /> : (
          <ErrorContent error={state.error} onRetry={() => loadThread(id, {refresh: true})} />
        )}
      </Page>
    );
  }

  const replies = comment.replies.length + comment.moreReplies;
  return (
    <Page headerText={t('byAuthor', {author: comment.author})} headerMetadata={formatAge(comment.created)} enableSystemBarInset={false}>
      <div className="action-page-shell">
        <ScrollView insetForHeader tabIndex={0} ariaLabel={t('commentLabel', {author: comment.author})}>
          <Panel width="100%">
            <div className="panel-text">
              {comment.byOp || comment.pinned ? (
                <div className="post-meta">
                  {comment.byOp ? <Tag text={t('tagOp')} /> : null}
                  {comment.pinned ? <Tag text={t('tagPinned')} /> : null}
                </div>
              ) : null}
              {(comment.body.length ? comment.body : [t('deletedBody')]).map((paragraph, index) => (
                <TextView key={index} as="p" textStyle={TextStyle.LABEL}>
                  {paragraph}
                </TextView>
              ))}
              {comment.replies.length === 0 && comment.moreReplies > 0 ? (
                <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                  {tp('moreOnReddit', comment.moreReplies)}
                </TextView>
              ) : null}
            </div>
          </Panel>
        </ScrollView>
        <div className="action-dock">
          <ButtonRail>
            <VoteButtons
              vote={comment.vote}
              score={comment.score}
              hideScore={comment.hideScore}
              onVote={direction => voteComment(id, comment.name, direction)}
            />
            {comment.replies.length > 0 ? (
              <>
                <ButtonDivider />
                <Button
                  title={tp('repliesCount', replies)}
                  icon={speechBubbleFilled}
                  alwaysShowText
                  initialFocusEligible={false}
                  onClick={() => navigate(repliesPath(id, comment.id))}
                />
              </>
            ) : null}
          </ButtonRail>
        </div>
      </div>
    </Page>
  );
}
