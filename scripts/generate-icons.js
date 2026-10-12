import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

function createPng(width, height, renderPixel) {
  const rowBytes = width * 4 + 1;
  const rawData = Buffer.alloc(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = Math.round(Math.max(0, Math.min(255, r)));
      rawData[pixelOffset + 1] = Math.round(Math.max(0, Math.min(255, b))); // wait, g
      rawData[pixelOffset + 2] = Math.round(Math.max(0, Math.min(255, b)));
      rawData[pixelOffset + 3] = Math.round(Math.max(0, Math.min(255, a)));
    }
  }

  // Fix: rawData pixel layout is RGBA
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = Math.round(Math.max(0, Math.min(255, r)));
      rawData[pixelOffset + 1] = Math.round(Math.max(0, Math.min(255, g)));
      rawData[pixelOffset + 2] = Math.round(Math.max(0, Math.min(255, b)));
      rawData[pixelOffset + 3] = Math.round(Math.max(0, Math.min(255, a)));
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function crc32(buf) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'binary');
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  return Buffer.concat([sig, chunk('IHDR', ihdrData), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// Draw glyph 's': standard smooth rendering on a 5x7 grid or parametric bezier/capsule
function renderIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Corner rounding for non-maskable (radius 22%)
  let alpha = 255;
  if (!isMaskable) {
    const cornerR = 0.22;
    let dx = 0;
    let dy = 0;
    if (nx < cornerR) dx = cornerR - nx;
    else if (nx > 1 - cornerR) dx = nx - (1 - cornerR);
    if (ny < cornerR) dy = cornerR - ny;
    else if (ny > 1 - cornerR) dy = ny - (1 - cornerR);

    if (dx > 0 && dy > 0) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > cornerR) return [0, 0, 0, 0];
      if (dist > cornerR - 0.015) {
        alpha = Math.round(255 * (cornerR - dist) / 0.015);
      }
    }
  }

  // Instagram gradient from amber (245, 158, 11) to pink (236, 72, 153) to purple (139, 92, 246)
  const t = (nx + ny) / 2;
  let bgR, bgG, bgB;
  if (t < 0.5) {
    const lt = t / 0.5;
    bgR = 245 + (236 - 245) * lt;
    bgG = 158 + (72 - 158) * lt;
    bgB = 11 + (153 - 11) * lt;
  } else {
    const lt = (t - 0.5) / 0.5;
    bgR = 236 + (139 - 236) * lt;
    bgG = 72 + (92 - 72) * lt;
    bgB = 153 + (246 - 153) * lt;
  }

  // Safe area scaling for maskable
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = 0.5;
  const cy = 0.48;
  const px = (nx - cx) / scale + 0.5;
  const py = (ny - cy) / scale + 0.5;

  // Check if pixel is inside the three 's' letters or the arrow below
  let isWhite = false;

  // Let's draw the 3 's' glyphs centered horizontally
  // s1: cx = 0.30, s2: cx = 0.50, s3: cx = 0.70.
  // Each 's' box: width 0.16, height 0.28, center y = 0.45
  function inS(lx, ly) {
    // lx in [-0.08, 0.08], ly in [-0.14, 0.14]
    if (Math.abs(lx) > 0.085 || Math.abs(ly) > 0.15) return false;
    const stroke = 0.038;
    // top bar: ly around -0.12, lx from -0.06 to 0.08
    if (ly < -0.09 && ly > -0.14 && lx > -0.07 && lx < 0.08) return true;
    // top-left spine: ly from -0.14 to 0.0, lx from -0.08 to -0.04
    if (ly >= -0.14 && ly <= 0.01 && lx < -0.04 && lx > -0.085) return true;
    // middle bar: ly around 0.0, lx from -0.07 to 0.07
    if (Math.abs(ly) < 0.026 && lx > -0.075 && lx < 0.075) return true;
    // bottom-right spine: ly from 0.0 to 0.14, lx from 0.04 to 0.085
    if (ly >= -0.01 && ly <= 0.14 && lx > 0.04 && lx < 0.085) return true;
    // bottom bar: ly around 0.12, lx from -0.08 to 0.06
    if (ly > 0.09 && ly < 0.14 && lx > -0.08 && lx < 0.07) return true;
    return false;
  }

  // Test s1
  if (inS(px - 0.31, py - 0.44)) isWhite = true;
  // Test s2
  if (inS(px - 0.50, py - 0.44)) isWhite = true;
  // Test s3
  if (inS(px - 0.69, py - 0.44)) isWhite = true;

  // Arrow below: apex at (0.50, 0.72)
  // Arrow stem: x in [0.485, 0.515], y in [0.61, 0.70]
  if (Math.abs(px - 0.50) < 0.018 && py >= 0.60 && py <= 0.71) isWhite = true;
  // Arrow head: chevron pointing down
  const headDy = py - 0.71;
  const headDx = Math.abs(px - 0.50);
  if (headDy >= -0.05 && headDy <= 0.03 && Math.abs(headDx - (headDy * -1 + 0.01)) < 0.022 && headDx < 0.08) {
    isWhite = true;
  }

  if (isWhite) {
    return [255, 255, 255, alpha];
  }

  return [bgR, bgG, bgB, alpha];
}

console.log('Generating PWA and iOS touch icons...');

const icons = [
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
];

for (const icon of icons) {
  const pngBuf = createPng(icon.size, icon.size, (x, y, w, h) => renderIcon(x, y, w, h, icon.maskable));
  const outPath = path.join(publicDir, icon.name);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Created ${icon.name} (${icon.size}x${icon.size})`);
}

console.log('Done generating icons!');
