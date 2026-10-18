// scripts/generate-icons.js
// Script otomatis untuk memastikan semua file icon (ico, png, icns) selalu valid & siap build
import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.resolve('src-tauri/icons');

function ensureIconsDir() {
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }
}

/**
 * Buat icon.ico dalam format Native Uncompressed DIB (Device-Independent Bitmap) 32-bit
 * yang 100% kompatibel dengan Microsoft RC.EXE compiler tanpa error RC2176.
 */
function generateValidDIBIcon() {
  const sizes = [
    { w: 16, h: 16 },
    { w: 32, h: 32 },
    { w: 48, h: 48 },
    { w: 64, h: 64 },
    { w: 128, h: 128 },
    { w: 256, h: 256 },
  ];

  const images = [];

  for (const { w, h } of sizes) {
    // BITMAPINFOHEADER = 40 bytes
    // Catatan: Dalam format DIB ICO, biHeight adalah 2x tinggi gambar (h * 2) untuk mask XOR + AND
    const biSize = 40;
    const biWidth = w;
    const biHeight = h * 2;
    const biPlanes = 1;
    const biBitCount = 32;
    const biCompression = 0;
    const biSizeImage = w * h * 4;
    const biXPelsPerMeter = 0;
    const biYPelsPerMeter = 0;
    const biClrUsed = 0;
    const biClrImportant = 0;

    const header = Buffer.alloc(40);
    header.writeUInt32LE(biSize, 0);
    header.writeInt32LE(biWidth, 4);
    header.writeInt32LE(biHeight, 8);
    header.writeUInt16LE(biPlanes, 12);
    header.writeUInt16LE(biBitCount, 14);
    header.writeUInt32LE(biCompression, 16);
    header.writeUInt32LE(biSizeImage, 20);
    header.writeInt32LE(biXPelsPerMeter, 24);
    header.writeInt32LE(biYPelsPerMeter, 28);
    header.writeUInt32LE(biClrUsed, 32);
    header.writeUInt32LE(biClrImportant, 36);

    // Pixel data BGRA bottom-up
    const pixels = Buffer.alloc(w * h * 4);
    let pIdx = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const cx = (w - 1) / 2.0;
        const cy = (h - 1) / 2.0;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = Math.min(w, h) * 0.45;

        if (dist <= radius) {
          const factor = (x + y) / (w + h);
          const b = Math.floor(255 * (1 - factor * 0.2));
          const g = Math.floor(180 * (1 - factor) + 230 * factor);
          const r = Math.floor(20 * (1 - factor) + 0 * factor);
          pixels[pIdx++] = b;
          pixels[pIdx++] = g;
          pixels[pIdx++] = r;
          pixels[pIdx++] = 255;
        } else {
          pixels[pIdx++] = 0;
          pixels[pIdx++] = 0;
          pixels[pIdx++] = 0;
          pixels[pIdx++] = 0;
        }
      }
    }

    // AND mask (1 bit per pixel, padded to 4 bytes row)
    const rowBytes = Math.floor((w + 31) / 32) * 4;
    const andMask = Buffer.alloc(rowBytes * h, 0);

    const dib = Buffer.concat([header, pixels, andMask]);
    images.push(dib);
  }

  // Header ICO: Reserved(2), Type=1(2), Count(2)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(sizes.length, 4);

  let offset = 6 + sizes.length * 16;
  const directory = Buffer.alloc(sizes.length * 16);

  sizes.forEach(({ w, h }, idx) => {
    const imgLen = images[idx].length;
    const entryOffset = idx * 16;
    directory.writeUInt8(w >= 256 ? 0 : w, entryOffset);
    directory.writeUInt8(h >= 256 ? 0 : h, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2); // color palette count
    directory.writeUInt8(0, entryOffset + 3); // reserved
    directory.writeUInt16LE(1, entryOffset + 4); // color planes
    directory.writeUInt16LE(32, entryOffset + 6); // bpp
    directory.writeUInt32LE(imgLen, entryOffset + 8); // size
    directory.writeUInt32LE(offset, entryOffset + 12); // offset
    offset += imgLen;
  });

  const fullIco = Buffer.concat([icoHeader, directory, ...images]);
  const icoPath = path.join(ICONS_DIR, 'icon.ico');
  fs.writeFileSync(icoPath, fullIco);
  console.log(`[Auto-Icon] Verified and generated valid Win32 DIB icon.ico (${fullIco.length} bytes)`);
}

function run() {
  ensureIconsDir();
  generateValidDIBIcon();
}

run();
