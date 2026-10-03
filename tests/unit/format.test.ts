import {describe, expect, it} from 'vitest';
import {cardAspect, formatAge, initials, snippet} from '../../src/format';

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);
const ago = (seconds: number) => NOW / 1000 - seconds;

describe('format', () => {
  it('shows ages compactly', () => {
    expect(formatAge(ago(20), NOW)).toBe('now');
    expect(formatAge(ago(5 * 60), NOW)).toBe('5m');
    expect(formatAge(ago(3 * 3600), NOW)).toBe('3h');
    expect(formatAge(ago(2 * 86400), NOW)).toBe('2d');
    expect(formatAge(ago(40 * 86400), NOW)).toBe('Aug 24');
    expect(formatAge(0, NOW)).toBe('');
  });

  it('builds initials and snippets', () => {
    expect(initials('augmentedreality')).toBe('AU');
    expect(initials('sam.rivera')).toBe('SA');
    expect(initials('Jane_Doe')).toBe('JD');
    expect(snippet(['a'.repeat(200)], 20)).toHaveLength(20);
  });

  it('keeps card shapes between square and 2:1', () => {
    expect(cardAspect({width: 4000, height: 1000})).toBe('2.000 / 1');
    expect(cardAspect({width: 1000, height: 3000})).toBe('1.000 / 1');
    expect(cardAspect(null)).toBe('4 / 3');
  });
});
