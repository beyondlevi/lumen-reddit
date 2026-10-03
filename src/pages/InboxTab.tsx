import {
  ListItem,
  StatusIndicatorType,
  TimestampPosition,
  TimestampTextColor,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {avatarFallback} from '../components/avatarFallback';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {formatWhen, snippet} from '../format';
import {t} from '../i18n/strings';
import {messagePath} from '../paths';
import {useReddit} from '../RedditProvider';

const PREFETCH_ROWS = 4;

/** Replies, mentions and private messages, newest first; unread ones carry the unread dot. */
export function InboxTab({active = true}: {active?: boolean}) {
  const navigate = useNavigate();
  const {inbox, loadInbox, loadMoreInbox} = useReddit();

  // Loads once the tab is shown.
  useEffect(() => {
    if (active) {
      loadInbox();
    }
  }, [active, loadInbox]);

  if (inbox.status === 'error') {
    return <ErrorContent error={inbox.error} onRetry={() => loadInbox({refresh: true})} />;
  }
  if (inbox.status !== 'ready') {
    return <LoadingContent />;
  }
  if (inbox.items.length === 0) {
    return (
      <StateContent
        title={t('inboxEmptyTitle')}
        body={t('inboxEmptyBody')}
        action={{label: t('retry'), onClick: () => loadInbox({refresh: true})}}
        ariaLabel={t('emptyLabel')}
      />
    );
  }
  return (
    <VerticalList insetForHeader ariaLabel={t('inboxLabel')}>
      {inbox.items.map((item, index) => (
        <ListItem
          key={item.name}
          title={t('byAuthor', {author: item.author})}
          subtitle={snippet(item.body) || item.subject}
          subtitleMaxLines={2}
          timestamp={formatWhen(item.created)}
          timestampPosition={TimestampPosition.ACCESSORY_TOP}
          timestampTextColor={item.unread ? TimestampTextColor.ACCENT : TimestampTextColor.PRIMARY}
          avatarPrimaryContent={avatarFallback(item.author)}
          avatarAlt={item.author}
          avatarStatusIndicator={item.unread ? StatusIndicatorType.UNREAD : undefined}
          onClick={() => navigate(messagePath(item.name))}
          onFocus={index >= inbox.items.length - PREFETCH_ROWS ? loadMoreInbox : undefined}
        />
      ))}
    </VerticalList>
  );
}
