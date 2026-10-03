import eyeSlashFilled from '@wearables-ui-toolkit/icons/svg/eyeslash__filled.svg';
import {
  Card,
  CardAboveScrim,
  CardBelowScrim,
  ListItem,
  ScrimType,
  TextColor,
  TextStyle,
  TextView,
  TimestampPosition,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {avatarFallback} from '../components/avatarFallback';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {cardAspect, formatAge} from '../format';
import {t, type StringKey} from '../i18n/strings';
import {postPath} from '../paths';
import type {FeedSource} from '../reddit/client';
import type {Post} from '../reddit/types';
import {useReddit} from '../RedditProvider';

/** Loading the next page starts when focus gets this close to the end. */
const PREFETCH_ROWS = 4;

/** A post with a picture: one Card destination, title and source above the bottom scrim. */
function PictureRow({post, source, onOpen, onFocus}: {post: Post; source: string; onOpen(): void; onFocus?(): void}) {
  return (
    <div className="feed-card">
      <Card
        className="post-card"
        style={{aspectRatio: cardAspect(post.image)}}
        width="100%"
        height="auto"
        bottomScrim={ScrimType.MEDIUM}
        aria-label={`${post.title}, ${source}`}
        onClick={onOpen}
        onFocus={onFocus}>
        <CardBelowScrim style={{position: 'absolute', inset: 0}}>
          <img className="post-card-image" src={post.image?.url} alt="" loading="lazy" decoding="async" />
        </CardBelowScrim>
        <CardAboveScrim
          style={{position: 'absolute', insetInline: 'var(--uit-spacing-large)', insetBlockEnd: 'var(--uit-spacing-large)'}}>
          <div className="post-card-label">
            <TextView as="span" className="post-card-title" textStyle={TextStyle.BODY2_EMPHASIZED}>
              {post.title}
            </TextView>
            <TextView as="span" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {source}
            </TextView>
          </div>
        </CardAboveScrim>
      </Card>
    </div>
  );
}

type Props = {
  source: FeedSource;
  ariaLabel: string;
  empty: {title: StringKey; body: StringKey};
  /** In a community's own feed the rows name the author instead of the community. */
  showAuthor?: boolean;
  /** A pager page loads only once it is shown, so opening the app costs one feed request. */
  active?: boolean;
};

/** A feed as its route's single vertical owner, or its loading, empty or error state. */
export function FeedPosts({source: feedSource, ariaLabel, empty, showAuthor = false, active = true}: Props) {
  const navigate = useNavigate();
  const {feed, loadFeed, loadMore, post} = useReddit();
  const state = feed(feedSource);

  useEffect(() => {
    if (active) {
      loadFeed(feedSource);
    }
  }, [active, loadFeed, feedSource]);

  const posts = state.ids.map(id => post(id)).filter((entry): entry is Post => entry != null);
  if (state.status === 'error' && posts.length === 0) {
    return <ErrorContent error={state.error} onRetry={() => loadFeed(feedSource, {refresh: true})} />;
  }
  if (state.status !== 'ready' && posts.length === 0) {
    return <LoadingContent />;
  }
  if (posts.length === 0) {
    return (
      <StateContent
        title={t(empty.title)}
        body={t(empty.body)}
        action={{label: t('retry'), onClick: () => loadFeed(feedSource, {refresh: true})}}
        ariaLabel={t('emptyLabel')}
      />
    );
  }

  return (
    <VerticalList insetForHeader ariaLabel={ariaLabel}>
      {posts.map((entry, index) => {
        const label = showAuthor ? t('byAuthor', {author: entry.author}) : t('subredditName', {name: entry.subreddit});
        const open = () => navigate(postPath(entry.id));
        const prefetch = index >= posts.length - PREFETCH_ROWS ? () => loadMore(feedSource) : undefined;
        if (entry.image) {
          return <PictureRow key={entry.id} post={entry} source={label} onOpen={open} onFocus={prefetch} />;
        }
        const icon = showAuthor ? null : entry.subredditIcon;
        return (
          <ListItem
            key={entry.id}
            title={label}
            subtitle={entry.title}
            subtitleMaxLines={2}
            secondaryIcon={entry.nsfw || entry.spoiler ? eyeSlashFilled : undefined}
            timestamp={formatAge(entry.created)}
            timestampPosition={TimestampPosition.ACCESSORY_TOP}
            avatarSrc={icon ?? undefined}
            avatarPrimaryContent={icon ? undefined : avatarFallback(showAuthor ? entry.author : entry.subreddit)}
            avatarAlt={label}
            onClick={open}
            onFocus={prefetch}
          />
        );
      })}
    </VerticalList>
  );
}
