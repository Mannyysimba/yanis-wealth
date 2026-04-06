import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const svgPath = resolve(__dirname, '../public/logo.svg');
  const svgBuffer = readFileSync(svgPath);

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(resolve(__dirname, '../public/icon-512.png'));
  console.log('✓ Generated icon-512.png');

  // Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(resolve(__dirname, '../public/icon-192.png'));
  console.log('✓ Generated icon-192.png');

  // Generate 32x32 favicon as PNG (browsers accept PNG favicons)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(resolve(__dirname, '../public/favicon.png'));
  console.log('✓ Generated favicon.png');

  // Generate ICO-compatible 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .toFormat('png')
    .toFile(resolve(__dirname, '../public/favicon-32.png'));
  console.log('✓ Generated favicon-32.png');

  console.log('\nAll icons generated successfully!');
}

main().catch(console.error);
