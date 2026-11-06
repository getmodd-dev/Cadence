import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgPath = path.join(publicDir, 'favicon.svg');
  const maskableSvgPath = path.join(publicDir, 'pwa-maskable-512x512.svg');

  const svgBuffer = fs.readFileSync(svgPath);
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath);

  console.log('Rendering bookmark and PWA icons with sharp...');

  // 1. apple-touch-icon.png (180x180) - Critical for iOS Safari bookmarks & Home Screen
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png (180x180)');

  // 2. pwa-192x192.png - Standard Android & Chrome bookmark/home screen icon
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png (192x192)');

  // 3. pwa-512x512.png - High-res PWA splash and desktop bookmark icon
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png (512x512)');

  // 4. pwa-maskable-512x512.png - Android adaptive maskable icon with safe zone
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png (512x512)');

  // 5. favicon-32x32.png - Browser tab & bookmark bar
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created favicon-32x32.png (32x32)');

  // 6. favicon-16x16.png - Browser tab
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ Created favicon-16x16.png (16x16)');

  // 7. favicon.ico - Fallback for legacy browsers and bookmark menus
  // Using 32x32 PNG as standard modern favicon.ico
  fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
  console.log('✓ Created favicon.ico');

  console.log('All bookmark and app logo assets successfully generated!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
