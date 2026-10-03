import {formatCount, locale, t, tp} from './i18n/strings';

const intlLocale = () => (locale === 'pt' ? 'pt-BR' : 'en-US');

/**
 * When a post, comment or message was made, as a point in time for list rows
 * and headers: the time today, "Yesterday", the weekday within a week, then
 * the date (with the year when it is not this one).
 */
export function formatWhen(createdSeconds: number, now = Date.now()): string {
  if (!createdSeconds) {
    return '';
  }
  const date = new Date(createdSeconds * 1000);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const time = date.getTime();
  if (time >= startOfToday) {
    return new Intl.DateTimeFormat(intlLocale(), {hour: 'numeric', minute: '2-digit'}).format(date);
  }
  if (time >= startOfToday - 86_400_000) {
    return t('yesterday');
  }
  if (time >= startOfToday - 6 * 86_400_000) {
    return new Intl.DateTimeFormat(intlLocale(), {weekday: 'short'}).format(date);
  }
  return new Intl.DateTimeFormat(intlLocale(), {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : {year: 'numeric'}),
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

/** Card shape for a post picture: wide ones keep their shape up to 2:1, taller ones are cropped to 4:3. */
export function cardAspect(image: {width: number; height: number} | null): string {
  if (!image || image.height <= 0) {
    return '4 / 3';
  }
  const ratio = Math.min(2, Math.max(4 / 3, image.width / image.height));
  return `${ratio.toFixed(3)} / 1`;
}
