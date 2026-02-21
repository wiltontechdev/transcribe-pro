/**
 * Generates public/icon.icns from public/logo.png using sharp + icon-gen.
 * Works on Windows, macOS, Linux - no native sips/iconutil needed.
 * Run: node scripts/generate-mac-icon.js
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const logoPath = path.join(projectRoot, 'public', 'logo.png');
  const publicDir = path.join(projectRoot, 'public');
  const iconsetDir = path.join(projectRoot, 'icon.iconset.tmp');

  if (!fs.existsSync(logoPath)) {
    console.error('public/logo.png not found.');
    process.exit(1);
  }

  const sharp = require('sharp');
  const icongen = require('icon-gen');

  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  if (!fs.existsSync(iconsetDir)) fs.mkdirSync(iconsetDir, { recursive: true });

  for (const size of sizes) {
    await sharp(logoPath).resize(size, size).png().toFile(path.join(iconsetDir, `${size}.png`));
  }

  await icongen(iconsetDir, publicDir, {
    report: false,
    icns: { name: 'icon', sizes }
  });

  for (const size of sizes) {
    try { fs.unlinkSync(path.join(iconsetDir, `${size}.png`)); } catch (_) {}
  }
  try { fs.rmdirSync(iconsetDir); } catch (_) {}

  console.log('Created public/icon.icns');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
