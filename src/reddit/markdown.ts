// Reddit markdown to plain-text paragraphs. The app never renders HTML from the
// API (selftext_html, body_html): text is shown through TextView, so nothing a
// post contains can run or style anything.

const MAX_PARAGRAPHS = 60;

function inline(text: string): string {
  return (
    text
      // Images and links: keep the label (or the address when there is none).
      .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, label: string) => label)
      .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_m, label: string) => label)
      .replace(/<(https?:\/\/[^>\s]+)>/g, '$1')
      // Emphasis, strike-through, code and superscript markers.
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\^\(([^)]*)\)/g, '$1')
      .replace(/>!(.+?)!</g, '$1')
      // Escaped characters.
      .replace(/\\([\\`*_{}[\]()#+\-.!>~^|])/g, '$1')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+/g, ' ')
      .trim()
  );
}

/** Splits markdown into paragraphs of plain text. Lists keep one line per item. */
export function markdownToParagraphs(markdown: string | null | undefined): string[] {
  if (!markdown) {
    return [];
  }
  const paragraphs: string[] = [];
  let current: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = inline(current.join(' '));
    if (text) {
      paragraphs.push(text);
    }
    current = [];
  };

  for (const rawLine of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(rawLine)) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      if (rawLine.trim()) {
        paragraphs.push(rawLine.trim());
      }
      continue;
    }
    const line = rawLine.replace(/^\s*(>\s?)+/, '');
    if (!line.trim()) {
      flush();
      continue;
    }
    // Horizontal rules and table separators carry no text.
    if (/^\s*([-*_]\s*){3,}$/.test(line) || /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)) {
      flush();
      continue;
    }
    const heading = /^\s*#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flush();
      current.push(heading[1]);
      flush();
      continue;
    }
    const item = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      current.push(`• ${item[1]}`);
      flush();
      continue;
    }
    // Table rows: cells separated by spaces.
    current.push(line.includes('|') ? line.split('|').map(cell => cell.trim()).filter(Boolean).join(' · ') : line);
    if (paragraphs.length >= MAX_PARAGRAPHS) {
      break;
    }
  }
  flush();
  return paragraphs.slice(0, MAX_PARAGRAPHS);
}
