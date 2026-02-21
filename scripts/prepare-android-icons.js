/**
 * Prepares icon for @capacitor/assets from public/logo.png.
 * Creates assets/icon-only.png and icon-foreground.png (1024x1024) for Android adaptive icon.
 * Run: node scripts/prepare-android-icons.js
 */
const path = require('path');
const fs = require('fs');

async function main() {
  const sharp = require('sharp');
  const projectRoot = path.resolve(__dirname, '..');
  const srcPath = path.join(projectRoot, 'public', 'logo.png');
  const assetsDir = path.join(projectRoot, 'assets');

  if (!fs.existsSync(srcPath)) {
    console.error('public/logo.png not found. Add your Transcribe Pro logo there first.');
    process.exit(1);
  }

  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const resized = await sharp(srcPath).resize(1024, 1024).png().toBuffer();
  await sharp(resized).toFile(path.join(assetsDir, 'icon-only.png'));
  await sharp(resized).toFile(path.join(assetsDir, 'icon-foreground.png'));

  // Solid dark background (#0a0a0a) for adaptive icon - capacitor-assets expects icon-background.png
  await sharp({
    create: { width: 1024, height: 1024, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .png()
    .toFile(path.join(assetsDir, 'icon-background.png'));

  console.log('Created assets/icon-only.png, icon-foreground.png, icon-background.png (1024x1024)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
