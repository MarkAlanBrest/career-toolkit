// Generates icon16.png, icon48.png, icon128.png in the icons/ directory.
// Run once: node generate-icons.js
// No dependencies — uses built-in zlib only.

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcIn = Buffer.concat([t, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcIn));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, drawFn) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // RGB

  // Raw pixel rows: 1 filter byte + size*3 RGB bytes per row
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const base = y * (1 + size * 3);
    raw[base] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = drawFn(x, y, size);
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Brand colors
const BG   = [0x2d, 0x3b, 0x45]; // #2d3b45 — Canvas dark
const BLUE = [0x07, 0x70, 0xa3]; // #0770a3 — Canvas blue
const WHITE = [0xff, 0xff, 0xff];

// Draw function: dark bg, rounded blue border, white pencil line in center
function draw(x, y, s) {
  const cx = s / 2, cy = s / 2;
  const r = s / 2 - 1;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  // Outer circle clip
  if (dist > r) return BG;

  // Blue ring (outer ~15% of radius)
  if (dist > r * 0.82) return BLUE;

  // White diagonal pencil stroke
  const thick = Math.max(1, Math.floor(s * 0.08));
  const diag = Math.abs((x - s * 0.25) - (y - s * 0.25));
  if (diag <= thick && x > s * 0.2 && x < s * 0.75 && y > s * 0.2 && y < s * 0.75) return WHITE;

  // Pencil tip dot
  if (x >= s * 0.7 && x <= s * 0.82 && y >= s * 0.7 && y <= s * 0.82) return WHITE;

  return BG;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

for (const size of [16, 48, 128]) {
  const png = makePNG(size, draw);
  const out = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon${size}.png (${png.length} bytes)`);
}
