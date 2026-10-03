import {ListItem, VerticalList} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {avatarFallback} from '../components/avatarFallback';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {t} from '../i18n/strings';
import {subredditPath} from '../paths';
import {useReddit} from '../RedditProvider';

/** The communities the account joined, A to Z. */
export function CommunitiesTab() {
  const navigate = useNavigate();
  const {subscriptions, loadSubscriptions} = useReddit();

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  if (subscriptions.status === 'error') {
    return <ErrorContent error={subscriptions.error} onRetry={() => loadSubscriptions({refresh: true})} />;
  }
  if (subscriptions.status !== 'ready') {
    return <LoadingContent />;
  }
  if (subscriptions.items.length === 0) {
    return (
      <StateContent
        title={t('communitiesEmptyTitle')}
        body={t('communitiesEmptyBody')}
        action={{label: t('retry'), onClick: () => loadSubscriptions({refresh: true})}}
        ariaLabel={t('emptyLabel')}
      />
    );
  }
  return (
    <VerticalList insetForHeader ariaLabel={t('communitiesLabel')}>
      {subscriptions.items.map(community => {
        const name = t('subredditName', {name: community.name});
        return (
          <ListItem
            key={community.name}
            title={name}
            subtitle={community.description || community.title || undefined}
            avatarSrc={community.icon ?? undefined}
            avatarPrimaryContent={community.icon ? undefined : avatarFallback(community.name)}
            avatarAlt={name}
            onClick={() => navigate(subredditPath(community.name))}
          />
        );
      })}
    </VerticalList>
  );
}
