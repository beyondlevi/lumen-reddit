import {Page} from '@wearables-ui-toolkit/mrbd';
import {useEffect, useMemo} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {LoadingContent} from '../components/StateContent';
import {t} from '../i18n/strings';
import {notificationTarget} from '../notification';
import {commentPath, postPath} from '../paths';
import {useReddit} from '../RedditProvider';
import {findComment} from './CommentsPage';
import {INBOX_TAB} from './HomePage';

function OpenInbox() {
  const navigate = useNavigate();
  const {setTab} = useReddit();
  useEffect(() => {
    setTab(INBOX_TAB);
    navigate('/', {replace: true});
  }, [navigate, setTab]);
  return null;
}

/** Opens the comment once the thread shows it is there; otherwise its post. */
function OpenComment({postId, commentId}: {postId: string; commentId: string}) {
  const {thread, loadThread} = useReddit();
  const state = thread(postId);

  useEffect(() => {
    loadThread(postId);
  }, [postId, loadThread]);

  if (state.status === 'ready' || state.status === 'error') {
    const found = state.status === 'ready' && findComment(state.comments, commentId) != null;
    return <Navigate to={found ? commentPath(postId, commentId) : postPath(postId)} replace />;
  }
  return (
    <Page headerText={t('postLabel')} headerIsLoading enableSystemBarInset={false}>
      <LoadingContent />
    </Page>
  );
}

/**
 * `/notification/:tag`, what a Reddit notification on the phone opens. It
 * replaces itself with the post, the comment or the Inbox tab, so Back from
 * there goes Home.
 */
export function NotificationPage() {
  const {tag = ''} = useParams();
  const target = useMemo(() => notificationTarget(tag), [tag]);

  if (target.kind === 'inbox') {
    return <OpenInbox />;
  }
  if (target.commentId) {
    return <OpenComment postId={target.postId} commentId={target.commentId} />;
  }
  return <Navigate to={postPath(target.postId)} replace />;
}
