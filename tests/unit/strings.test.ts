import {describe, expect, it} from 'vitest';
import {resolveLocale, translate, translatePlural} from '../../src/i18n/strings';

describe('strings', () => {
  it('picks Portuguese for any pt-* language and English otherwise', () => {
    expect(resolveLocale(['pt-PT'])).toBe('pt');
    expect(resolveLocale(['pt-BR'])).toBe('pt');
    expect(resolveLocale(['de-DE'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });

  it('fills placeholders and plural forms', () => {
    expect(translate('en', 'byAuthor', {author: 'maya'})).toBe('u/maya');
    expect(translatePlural('en', 'commentsCount', 1)).toBe('1 comment');
    expect(translatePlural('en', 'commentsCount', 1500)).toBe('1.5K comments');
    expect(translatePlural('pt', 'repliesCount', 1)).toBe('1 resposta');
    expect(translatePlural('pt', 'repliesCount', 2)).toBe('2 respostas');
  });

  it('keeps every tab label to one word', () => {
    for (const locale of ['en', 'pt'] as const) {
      for (const key of ['tabHome', 'tabPopular', 'tabCommunities', 'tabInbox'] as const) {
        expect(translate(locale, key).split(/\s+/)).toHaveLength(1);
      }
    }
  });
});
