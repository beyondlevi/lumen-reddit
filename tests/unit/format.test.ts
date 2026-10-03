import {describe, expect, it} from 'vitest';
import {cardAspect, formatWhen, initials, snippet} from '../../src/format';


describe('format', () => {
  it('shows when, as a point in time', () => {
    const local = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min).getTime() / 1000;
    const now = new Date(2026, 9, 3, 15, 0).getTime();
    expect(formatWhen(local(2026, 9, 3, 9, 5), now)).toBe('9:05 AM');
    expect(formatWhen(local(2026, 9, 2, 23, 0), now)).toBe('Yesterday');
    expect(formatWhen(local(2026, 8, 29, 12, 0), now)).toBe('Tue');
    expect(formatWhen(local(2026, 7, 24, 12, 0), now)).toBe('Aug 24');
    expect(formatWhen(local(2025, 11, 31, 12, 0), now)).toBe('Dec 31, 2025');
    expect(formatWhen(0, now)).toBe('');
  });

  it('builds initials and snippets', () => {
    expect(initials('augmentedreality')).toBe('AU');
    expect(initials('sam.rivera')).toBe('SA');
    expect(initials('Jane_Doe')).toBe('JD');
    expect(snippet(['a'.repeat(200)], 20)).toHaveLength(20);
  });

  it('keeps card shapes between 4:3 and 2:1', () => {
    expect(cardAspect({width: 4000, height: 1000})).toBe('2.000 / 1');
    expect(cardAspect({width: 1000, height: 3000})).toBe('1.333 / 1');
    expect(cardAspect(null)).toBe('4 / 3');
  });
});
