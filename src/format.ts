import {formatCount, locale, t, tp} from './i18n/strings';

/** Age of a post or comment for list rows: "now", "5m", "3h", "2d", then a date. */
export function formatAge(createdSeconds: number, now = Date.now()): string {
  if (!createdSeconds) {
    return '';
  }
  const seconds = Math.max(0, Math.floor(now / 1000 - createdSeconds));
  if (seconds < 60) {
    return t('timeNow');
  }
  if (seconds < 3600) {
    return t('timeMinutes', {n: Math.floor(seconds / 60)});
  }
  if (seconds < 86400) {
    return t('timeHours', {n: Math.floor(seconds / 3600)});
  }
  if (seconds < 7 * 86400) {
    return t('timeDays', {n: Math.floor(seconds / 86400)});
  }
  const date = new Date(createdSeconds * 1000);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(locale === 'pt' ? 'pt-BR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : {year: 'numeric'}),
  }).format(date);
}

/** A wait or a remaining time, rounded to its largest unit: "45 seconds", "12 minutes", "3 hours". */
export function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) {
    return tp('durationSeconds', seconds);
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return tp('durationMinutes', minutes);
  }
  return tp('durationHours', Math.round(minutes / 60));
}

/** Score shown on the vote button; hidden scores show the action instead. */
export function formatScore(score: number, hidden: boolean): string {
  return hidden ? t('scoreHidden') : formatCount(score);
}

/** "Jane Doe" → "JD", "augmentedreality" → "AU". */
export function initials(name: string): string {
  const clean = name.replace(/^[ru]\//i, '').replace(/[^\p{L}\p{N}\s_-]/gu, '').trim();
  const words = clean.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || '?';
}

/** First paragraph, cut for a list row. */
export function snippet(paragraphs: string[], max = 160): string {
  const text = paragraphs.join(' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Card shape for a post picture: wide ones keep their shape, tall ones are cropped to a square. */
export function cardAspect(image: {width: number; height: number} | null): string {
  if (!image || image.height <= 0) {
    return '4 / 3';
  }
  const ratio = Math.min(2, Math.max(1, image.width / image.height));
  return `${ratio.toFixed(3)} / 1`;
}
