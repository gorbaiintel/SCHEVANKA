import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((1 + rowBytes) * height);

  const cx = width / 2;
  const cy = height / 2;
  const rMax = Math.min(width, height) / 2;
  const safeMargin = isMaskable ? 0.75 : 0.92;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base dark sleek background #0b0e14
      let r = 11;
      let g = 14;
      let b = 20;
      let a = 255;

      // Subtle radial center gradient
      const centerFactor = Math.max(0, 1 - dist);
      r += Math.round(18 * centerFactor);
      g += Math.round(22 * centerFactor);
      b += Math.round(35 * centerFactor);

      // Outer ring border
      if (dist >= 0.88 * safeMargin && dist <= 0.94 * safeMargin) {
        // Gold accent border
        r = 245;
        g = 158;
        b = 11;
      }

      // Golden diamond/hexagon node & Schevanka symbol
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      // Diamond node
      if (adx * 1.2 + ady <= 0.45 * safeMargin && adx * 1.2 + ady >= 0.38 * safeMargin) {
        r = 251;
        g = 191;
        b = 36;
      }

      // Center core gold dot
      if (dist <= 0.12 * safeMargin) {
        r = 254;
        g = 240;
        b = 138;
      }

      // Horizontal & vertical node signal cross
      if (Math.abs(dy) < 0.02 * safeMargin && dist < 0.65 * safeMargin) {
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 80);
        b = Math.min(255, b + 20);
      }
      if (Math.abs(dx) < 0.02 * safeMargin && dist < 0.65 * safeMargin) {
        r = Math.min(255, r + 90);
        g = Math.min(255, g + 80);
        b = Math.min(255, b + 20);
      }

      rawData[offset++] = Math.min(255, Math.max(0, r));
      rawData[offset++] = Math.min(255, Math.max(0, g));
      rawData[offset++] = Math.min(255, Math.max(0, b));
      rawData[offset++] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
fs.writeFileSync(path.join(outDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('Successfully generated all PWA PNG icons in /public!');
