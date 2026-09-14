import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function uploadToYouTube() {
  const videoPath = process.env.VIDEO_PATH || './out/video.mp4';
  const title = process.env.VIDEO_TITLE || 'Review Tech - Vetor Blog';
  const description = process.env.VIDEO_DESCRIPTION || 'Review completo no vetor.blog';
  const tags = process.env.VIDEO_TAGS ? process.env.VIDEO_TAGS.split(',') : ['tech', 'review'];

  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(videoPath);
  console.log(`📤 Uploading video: ${path.basename(videoPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Title: ${title}`);
  console.log(`   Tags: ${tags.join(', ')}`);

  const { OAuth2Client } = google.auth;
  const oauth2Client = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  try {
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: tags.slice(0, 30),
          categoryId: '28',
          defaultLanguage: 'pt',
          defaultAudioLanguage: 'pt',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
          publishAt: new Date().toISOString(),
        },
      },
      media: {
        body: fs.createReadStream(videoPath),
      },
    });

    const videoId = response.data.id;
    const videoUrl = `https://youtube.com/watch?v=${videoId}`;
    
    console.log(`✅ Video uploaded successfully!`);
    console.log(`   Video ID: ${videoId}`);
    console.log(`   URL: ${videoUrl}`);

    // Save log
    const logPath = path.join(__dirname, '../logs/upload-log.json');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      videoId,
      videoUrl,
      title,
      filePath: videoPath,
      fileSize: stats.size,
    };

    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));

    console.log(`📋 Log saved to: ${logPath}`);

  } catch (error: any) {
    console.error('❌ Upload failed:', error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

uploadToYouTube();