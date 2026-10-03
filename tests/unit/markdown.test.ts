import {describe, expect, it} from 'vitest';
import {markdownToParagraphs} from '../../src/reddit/markdown';

describe('markdownToParagraphs', () => {
  it('keeps text and drops markup', () => {
    expect(markdownToParagraphs('**Bold** and *italic*, ~~gone~~ `code` [a link](https://x.y) ^(tiny) >!spoiler!<')).toEqual([
      'Bold and italic, gone code a link tiny spoiler',
    ]);
  });

  it('splits paragraphs, headings and list items', () => {
    expect(markdownToParagraphs('# Title\n\nFirst line\ncontinues.\n\n- one\n- two\n\n1. first\n\n---\n\n> quoted')).toEqual([
      'Title',
      'First line continues.',
      '• one',
      '• two',
      '• first',
      'quoted',
    ]);
  });

  it('keeps fenced code lines and one line per table row', () => {
    expect(markdownToParagraphs('```\nconst a = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |')).toEqual(['const a = 1;', 'A · B', '1 · 2']);
  });

  it('never returns HTML entities or empty paragraphs', () => {
    expect(markdownToParagraphs('a &amp; b &lt;c&gt;&nbsp;d\n\n\n\n')).toEqual(['a & b <c> d']);
    expect(markdownToParagraphs('')).toEqual([]);
    expect(markdownToParagraphs(null)).toEqual([]);
  });
});
