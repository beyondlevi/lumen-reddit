import {App} from '@wearables-ui-toolkit/mrbd';
import {ReactRouterNavigationProvider, ReactRouterPageTransition} from '@wearables-ui-toolkit/mrbd/react-router';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {CommentPage} from './pages/CommentPage';
import {CommentsPage} from './pages/CommentsPage';
import {HomePage} from './pages/HomePage';
import {MessagePage} from './pages/MessagePage';
import {NotificationPage} from './pages/NotificationPage';
import {PhotoPage} from './pages/PhotoPage';
import {PostPage} from './pages/PostPage';
import {SessionPage} from './pages/SessionPage';
import {SubredditPage} from './pages/SubredditPage';
import {useReddit} from './RedditProvider';

// Back (Escape) is handled by ReactRouterNavigationProvider: each route goes
// back to the one that opened it; on the home pager, with no history left, it
// is not consumed, so the platform closes the app.
export default function RedditApp() {
  const {phase} = useReddit();
  return (
    <BrowserRouter>
      <ReactRouterNavigationProvider>
        <App>
          {phase.kind !== 'ready' ? (
            <SessionPage phase={phase} />
          ) : (
            <ReactRouterPageTransition>
              {({location}) => (
                <Routes location={location}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/r/:name" element={<SubredditPage />} />
                  <Route path="/post/:id" element={<PostPage />} />
                  <Route path="/post/:id/picture" element={<PhotoPage />} />
                  <Route path="/post/:id/comments" element={<CommentsPage />} />
                  <Route path="/post/:id/comment/:commentId" element={<CommentPage />} />
                  <Route path="/post/:id/comment/:commentId/replies" element={<CommentsPage />} />
                  <Route path="/message/:name" element={<MessagePage />} />
                  <Route path="/notification/:tag" element={<NotificationPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </ReactRouterPageTransition>
          )}
        </App>
      </ReactRouterNavigationProvider>
    </BrowserRouter>
  );
}
