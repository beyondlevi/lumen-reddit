import circleArrowDownFilled from '@wearables-ui-toolkit/icons/svg/circlearrowdown__filled.svg';
import circleArrowUpFilled from '@wearables-ui-toolkit/icons/svg/circlearrowup__filled.svg';
import {Button} from '@wearables-ui-toolkit/mrbd';
import {formatScore} from '../format';
import {t} from '../i18n/strings';
import type {Vote} from '../reddit/types';

type Props = {
  vote: Vote;
  score: number;
  hideScore: boolean;
  onVote(direction: Vote): void;
};

/** Upvote (with the score) and Downvote for a ButtonRail; pressing an active vote takes it back. */
export function VoteButtons({vote, score, hideScore, onVote}: Props) {
  const scoreText = formatScore(score, hideScore);
  return (
    <>
      <Button
        title={scoreText}
        icon={circleArrowUpFilled}
        alwaysShowText
        showIconActiveIndicator={vote === 1}
        aria-label={hideScore ? t('upvote') : `${t('upvote')}, ${t('scoreLabel', {score: scoreText})}`}
        aria-pressed={vote === 1}
        initialFocusEligible={false}
        onClick={() => onVote(vote === 1 ? 0 : 1)}
      />
      <Button
        icon={circleArrowDownFilled}
        showIconActiveIndicator={vote === -1}
        aria-label={t('downvote')}
        aria-pressed={vote === -1}
        initialFocusEligible={false}
        onClick={() => onVote(vote === -1 ? 0 : -1)}
      />
    </>
  );
}
