#!/usr/bin/env node
// Generate placeholder images for SEO
// Run: node scripts/generate-images.js

const fs = require('fs');
const path = require('path');

// Create a simple 1x1 PNG as placeholder (will be replaced with real images)
// PNG header + IHDR + IDAT + IEND for a 1200x630 blue image

function createPNG(width, height, r, g, b) {
  // This creates a minimal valid PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  
  // Create raw image data (uncompressed)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Create a gradient effect
      const factor = 1 - (y / height) * 0.3;
      rawData.push(Math.floor(r * factor));
      rawData.push(Math.floor(g * factor));
      rawData.push(Math.floor(b * factor));
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ (-1)) >>> 0;
  }
  
  function makeChunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
  }
  
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(__dirname, '..', 'public');

// Create og-default.jpg (actually PNG, browsers handle it fine)
const ogDefault = createPNG(1200, 630, 37, 99, 235); // Blue (#2563eb)
fs.writeFileSync(path.join(publicDir, 'og-default.jpg'), ogDefault);
console.log('Created og-default.jpg (1200x630)');

// Create logo.png
const logo = createPNG(512, 512, 37, 99, 235); // Blue (#2563eb)
fs.writeFileSync(path.join(publicDir, 'logo.png'), logo);
console.log('Created logo.png (512x512)');

console.log('\nDone! Replace these with proper branded images.');
