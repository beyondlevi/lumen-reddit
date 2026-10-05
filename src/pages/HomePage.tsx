import envelopeFilled from '@wearables-ui-toolkit/icons/svg/envelope__filled.svg';
import flameFilled from '@wearables-ui-toolkit/icons/svg/flame__filled.svg';
import grid4DotsFilled from '@wearables-ui-toolkit/icons/svg/grid4dots__filled.svg';
import houseFilled from '@wearables-ui-toolkit/icons/svg/house__filled.svg';
import {SubNavigationPager, type SubNavigationItem} from '@wearables-ui-toolkit/mrbd';
import {useMemo} from 'react';
import {t} from '../i18n/strings';
import type {FeedSource} from '../reddit/client';
import {useReddit} from '../RedditProvider';
import {CommunitiesTab} from './CommunitiesTab';
import {FeedPosts} from './FeedPosts';
import {InboxTab} from './InboxTab';

const HOME: FeedSource = {kind: 'home'};
const POPULAR: FeedSource = {kind: 'popular'};
export const INBOX_TAB = 3;

/** The app's top level: Home, Popular, Communities and Inbox as peer tabs. */
export function HomePage() {
  const {tab, setTab, feed, subscriptions, inbox} = useReddit();
  const homeLoading = feed(HOME).status === 'loading';
  const popularLoading = feed(POPULAR).status === 'loading';
  const items = useMemo<SubNavigationItem[]>(
    () => [
      {label: t('tabHome'), icon: houseFilled, isLoading: homeLoading},
      {label: t('tabPopular'), icon: flameFilled, isLoading: popularLoading},
      {label: t('tabCommunities'), icon: grid4DotsFilled, isLoading: subscriptions.status === 'loading'},
      {label: t('tabInbox'), icon: envelopeFilled, isLoading: inbox.status === 'loading'},
    ],
    [homeLoading, inbox.status, popularLoading, subscriptions.status],
  );

  return (
    <SubNavigationPager items={items} currentPageIndex={tab} onPageChange={next => setTab(next)}>
      <FeedPosts source={HOME} ariaLabel={t('homeFeedLabel')} empty={{title: 'homeEmptyTitle', body: 'homeEmptyBody'}} active={tab === 0} />
      <FeedPosts
        source={POPULAR}
        ariaLabel={t('popularFeedLabel')}
        empty={{title: 'feedEmptyTitle', body: 'feedEmptyBody'}}
        active={tab === 1}
      />
      <CommunitiesTab active={tab === 2} />
      <InboxTab active={tab === INBOX_TAB} />
    </SubNavigationPager>
  );
}
