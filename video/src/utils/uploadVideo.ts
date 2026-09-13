import fs from 'fs';
import path from 'path';

interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

async function uploadToStaticAssets(filePath: string): Promise<UploadResult> {
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const fileSize = fileBuffer.length;

  const publicDir = path.resolve(__dirname, '../../../public/videos');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const destinationPath = path.join(publicDir, filename);
  fs.copyFileSync(filePath, destinationPath);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const url = `${baseUrl}/videos/${filename}`;

  return {
    url,
    filename,
    size: fileSize,
  };
}

async function uploadVideo(filePath: string): Promise<UploadResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }

  console.log(`📤 Uploading video: ${path.basename(filePath)}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  const result = await uploadToStaticAssets(filePath);

  console.log(`✅ Upload complete: ${result.url}`);

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: tsx uploadVideo.ts <path-to-video>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);

  try {
    const result = await uploadVideo(resolvedPath);
    console.log('\n📋 Upload Summary:');
    console.log(`   URL: ${result.url}`);
    console.log(`   Filename: ${result.filename}`);
    console.log(`   Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

main();
