import flameFilled from '@wearables-ui-toolkit/icons/svg/flame__filled.svg';
import squareArrowsUpDownFilled from '@wearables-ui-toolkit/icons/svg/squarearrowsupdown__filled.svg';
import {
  Button,
  ButtonRail,
  getVerticalMenuAnchorProps,
  Page,
  TooltipMode,
  VerticalMenu,
  VerticalMenuButton,
  VerticalMenuCorner,
  type ButtonHandle,
} from '@wearables-ui-toolkit/mrbd';
import {useLayoutEffect, useMemo, useRef, useState, type MouseEvent} from 'react';
import {useParams} from 'react-router-dom';
import {t, type StringKey} from '../i18n/strings';
import type {FeedSource} from '../reddit/client';
import type {FeedSort} from '../reddit/types';
import {FeedPosts} from './FeedPosts';

const SORTS: {sort: FeedSort; label: StringKey}[] = [
  {sort: 'hot', label: 'sortHot'},
  {sort: 'new', label: 'sortNew'},
  {sort: 'top', label: 'sortTop'},
  {sort: 'rising', label: 'sortRising'},
];

/** One community's posts, in the order picked from the Sort menu. */
export function SubredditPage() {
  const {name = ''} = useParams();
  const [sort, setSort] = useState<FeedSort>('hot');
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<ButtonHandle>(null);
  const restoreFocus = useRef(false);
  const source = useMemo<FeedSource>(() => ({kind: 'subreddit', name, sort}), [name, sort]);
  const sortLabel = t(SORTS.find(entry => entry.sort === sort)?.label ?? 'sortHot');

  // After the menu closes, focus goes back to Sort before the next paint.
  useLayoutEffect(() => {
    if (!menuOpen && restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.getElement()?.focus();
    }
  }, [menuOpen, sort]);

  const closeMenu = () => {
    restoreFocus.current = true;
    setMenuOpen(false);
  };
  const pick = (next: FeedSort) => (event: MouseEvent) => {
    event.stopPropagation();
    setSort(next);
    closeMenu();
  };

  return (
    <Page headerText={t('subredditName', {name})} headerMetadata={sortLabel} enableSystemBarInset={false}>
      <div className="action-page-shell">
        <FeedPosts
          key={`${name}/${sort}`}
          source={source}
          ariaLabel={t('subredditName', {name})}
          empty={{title: 'feedEmptyTitle', body: 'feedEmptyBody'}}
          showAuthor
        />
        <div className="action-dock">
          <ButtonRail>
            <Button
              ref={triggerRef}
              title={sortLabel}
              icon={sort === 'hot' ? flameFilled : squareArrowsUpDownFilled}
              alwaysShowText
              aria-label={t('sortMenuLabel')}
              initialFocusEligible={false}
              onClick={() => setMenuOpen(true)}
              tooltipMode={menuOpen ? TooltipMode.ALWAYS : TooltipMode.NONE}
              tooltipContent={
                <VerticalMenu aria-label={t('sortMenuLabel')} onDismissRequest={closeMenu}>
                  {SORTS.map(entry => (
                    <VerticalMenuButton key={entry.sort} text={t(entry.label)} onClick={pick(entry.sort)} />
                  ))}
                </VerticalMenu>
              }
              {...getVerticalMenuAnchorProps(VerticalMenuCorner.ABOVE_LEFT)}
            />
          </ButtonRail>
        </div>
      </div>
    </Page>
  );
}
