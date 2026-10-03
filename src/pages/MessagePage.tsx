import {Button, ButtonRail, Page, Panel, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {formatAge} from '../format';
import {t} from '../i18n/strings';
import {postPath} from '../paths';
import {useReddit} from '../RedditProvider';

/** An inbox entry in full; opening it marks it read. A comment reply leads to its post. */
export function MessagePage() {
  const {name = ''} = useParams();
  const navigate = useNavigate();
  const {inbox, markRead} = useReddit();
  const item = inbox.items.find(entry => entry.name === name) ?? null;

  useEffect(() => {
    if (item?.unread) {
      markRead(item);
    }
  }, [item, markRead]);

  if (!item) {
    return <Navigate to="/" replace />;
  }

  const content = (
    <ScrollView insetForHeader tabIndex={0} ariaLabel={t('messageLabel', {author: item.author})}>
      <Panel width="100%">
        <div className="panel-text">
          {item.subject ? (
            <div className="post-heading">
              <TextView as="h2" textStyle={TextStyle.BODY2_EMPHASIZED}>
                {item.subject}
              </TextView>
              {item.subreddit ? (
                <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                  {t('subredditName', {name: item.subreddit})}
                </TextView>
              ) : null}
            </div>
          ) : null}
          {(item.body.length ? item.body : [t('deletedBody')]).map((paragraph, index) => (
            <TextView key={index} as="p" textStyle={TextStyle.LABEL}>
              {paragraph}
            </TextView>
          ))}
        </div>
      </Panel>
    </ScrollView>
  );

  return (
    <Page headerText={t('byAuthor', {author: item.author})} headerMetadata={formatAge(item.created)} enableSystemBarInset={false}>
      {item.postId ? (
        <div className="action-page-shell">
          {content}
          <div className="action-dock">
            <ButtonRail>
              <Button
                title={t('viewPost')}
                alwaysShowText
                initialFocusEligible={false}
                onClick={() => navigate(postPath(item.postId!))}
              />
            </ButtonRail>
          </div>
        </div>
      ) : (
        content
      )}
    </Page>
  );
}
