import {IndeterminateLoader, Page, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {t} from '../i18n/strings';
import {useReddit} from '../RedditProvider';

/** A post's picture, as large as the display allows, on the window background. */
export function PhotoPage() {
  const {id = ''} = useParams();
  const {post: getPost} = useReddit();
  const post = getPost(id);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  if (!post?.image) {
    return <Navigate to="/" replace />;
  }
  return (
    <Page showHeader={false} enableSystemBarInset={false} aria-label={t('imageLabel', {title: post.title})}>
      <div className="photo-frame" tabIndex={0} aria-label={t('imageLabel', {title: post.title})}>
        {status === 'loading' ? <IndeterminateLoader aria-label={t('photoLoading')} /> : null}
        {status === 'error' ? (
          <TextView as="p" role="alert" textStyle={TextStyle.BODY2} textColor={TextColor.SECONDARY}>
            {t('photoFailed')}
          </TextView>
        ) : null}
        <img
          className="photo-image"
          src={post.image.url}
          alt=""
          hidden={status !== 'ready'}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      </div>
    </Page>
  );
}
