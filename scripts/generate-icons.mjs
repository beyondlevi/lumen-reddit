// Renders the monochrome app icon (white glyph on a transparent background,
// as the Meta docs recommend for glasses icons) into public/icon-*.png.
// Usage: npm run icons
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// A thread: a speech bubble holding an upvote arrow.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path fill="#ffffff" fill-rule="evenodd" d="
    M256 56c-117.4 0-212 84.2-212 188 0 55.7 27.4 105.8 71 140.3L96 456l92.6-41.2
    c21.3 6.3 44 9.7 67.4 9.7 117.4 0 212-84.2 212-188S373.4 56 256 56z
    M256 132l-92 100h56v88h72v-88h56z"/>
</svg>`;

for (const size of [192, 512]) {
  const out = path.join(root, 'public', `icon-${size}.png`);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`icon: ${path.relative(root, out)}`);
}
