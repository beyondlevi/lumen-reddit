// Renders the demo pictures (simple illustrated scenes, no photos of anyone)
// into src/demo/assets/*.webp. Usage: node scripts/generate-demo-media.mjs
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const scenes = {
  coast: `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c58a"/><stop offset="0.55" stop-color="#c9d6e3"/><stop offset="1" stop-color="#7f97ad"/></linearGradient></defs>
    <rect width="1280" height="960" fill="url(#s)"/>
    <circle cx="930" cy="330" r="70" fill="#fff4dc" opacity="0.9"/>
    <path d="M0 520 C200 470 360 540 560 500 S920 470 1280 520 V960 H0Z" fill="#5d7489"/>
    <path d="M0 610 C240 580 420 640 700 600 S1080 590 1280 630 V960 H0Z" fill="#3f5366"/>
    <path d="M0 760 C180 700 300 760 420 720 S640 700 760 760 S1060 720 1280 780 V960 H0Z" fill="#26333f"/>
    <rect y="470" width="1280" height="120" fill="#ffffff" opacity="0.18"/>
  </svg>`,
  desk: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <rect width="1200" height="800" fill="#2b2f36"/>
    <rect x="0" y="520" width="1200" height="280" fill="#6b4f3a"/>
    <rect x="300" y="140" width="600" height="340" rx="18" fill="#111418"/>
    <rect x="320" y="160" width="560" height="300" rx="8" fill="#1f6f8b"/>
    <rect x="560" y="480" width="80" height="50" fill="#111418"/>
    <rect x="420" y="600" width="360" height="40" rx="10" fill="#d9d9d9"/>
    <path d="M820 620 h150 a30 30 0 0 1 0 60 h-150z" fill="#1b1b1b"/>
    <circle cx="845" cy="650" r="24" fill="#3a3a3a"/><circle cx="950" cy="650" r="24" fill="#3a3a3a"/>
  </svg>`,
  street: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5c6b7a"/><stop offset="1" stop-color="#20262d"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#r)"/>
    <path d="M0 300 h260 v500 H0z M940 260 h260 v540 H940z" fill="#2c333b"/>
    <path d="M520 800 L590 380 h20 L680 800z" fill="#3b4652"/>
    <circle cx="300" cy="360" r="14" fill="#ffd27a"/><circle cx="900" cy="330" r="14" fill="#ffd27a"/>
    <path d="M300 374 L250 800 h100z M900 344 L850 800 h100z" fill="#ffd27a" opacity="0.18"/>
  </svg>`,
};

for (const [name, svg] of Object.entries(scenes)) {
  const out = path.join(root, 'src', 'demo', 'assets', `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({quality: 80}).toFile(out);
  console.log(`demo: ${path.relative(root, out)}`);
}
