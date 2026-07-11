// Generates PWA PNG icons (no external deps) using Node's built-in zlib.
// Draws a rounded brand-colored square with a white "L" mark.
import zlib from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// brand palette
const BRAND = [226, 55, 68]; // #e23744
const BRAND_DARK = [178, 34, 45]; // gradient bottom
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function pngFromRGBA(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // filtered scanlines (filter 0)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function makeIcon(size, { maskable } = {}) {
  const px = Buffer.alloc(size * size * 4);
  // maskable icons need a safe zone; use full-bleed background, smaller mark
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const markScale = maskable ? 0.42 : 0.52;

  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  const inRounded = (x, y) => {
    if (radius <= 0) return true;
    const r = radius;
    // corners
    const cx = x < r ? r : x >= size - r ? size - r - 1 : x;
    const cy = y < r ? r : y >= size - r ? size - r - 1 : y;
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) { set(x, y, [0, 0, 0], 0); continue; }
      const bg = lerp(BRAND, BRAND_DARK, y / size);
      set(x, y, bg, 255);
    }
  }

  // Draw a white "L" mark centered
  const markW = Math.round(size * markScale);
  const markH = markW;
  const ox = Math.round((size - markW) / 2);
  const oy = Math.round((size - markH) / 2);
  const bar = Math.max(2, Math.round(markW * 0.22)); // stroke width
  for (let y = 0; y < markH; y++) {
    for (let x = 0; x < markW; x++) {
      const gx = ox + x, gy = oy + y;
      if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
      const isVertical = x < bar; // left vertical bar
      const isBottom = y > markH - bar - 1; // bottom horizontal bar
      if (isVertical || isBottom) set(gx, gy, WHITE, 255);
    }
  }

  return pngFromRGBA(size, size, px);
}

writeFileSync(path.join(outDir, "icon-192.png"), makeIcon(192));
writeFileSync(path.join(outDir, "icon-512.png"), makeIcon(512));
writeFileSync(path.join(outDir, "maskable-512.png"), makeIcon(512, { maskable: true }));
writeFileSync(path.join(outDir, "apple-touch-icon.png"), makeIcon(180));
console.log("Icons written to", outDir);
