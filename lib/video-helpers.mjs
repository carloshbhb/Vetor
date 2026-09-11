// ─────────────────────────────────────────────────────────────────────────────
// Shared video helpers — download, YouTube OAuth, upload, thumbnail, comment
// Used by: video-worker-ci.mjs, remotion-worker.mjs, video-longform.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';

let _oauth = null;
let _token = null;
let _tokenExpiry = 0;

async function getOAuth() {
  if (_oauth) return _oauth;
  const { OAuth2Client } = await import('google-auth-library');
  _oauth = new OAuth2Client(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    'http://localhost'
  );
  _oauth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return _oauth;
}

export async function getYoutubeToken() {
  // Reuse token for 5 minutes (Google tokens last 1 hour)
  if (_token && Date.now() < _tokenExpiry) return _token;
  const oauth = await getOAuth();
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Sem access_token YouTube (verifique Secrets)');
  _token = token;
  _tokenExpiry = Date.now() + 5 * 60 * 1000;
  return token;
}

export async function uploadToYoutube(videoPath, { title, description, tags, privacy = 'public' }) {
  const token = await getYoutubeToken();
  const buf = readFileSync(videoPath);
  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(buf.length),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          tags: (tags || []).slice(0, 15),
          categoryId: '22',
        },
        status: {
          privacyStatus: privacy,
          madeForKids: false,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  if (!init.ok) throw new Error(`YouTube init: ${init.status} ${await init.text()}`);
  const url = init.headers.get('location');
  const put = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Length': String(buf.length), 'Content-Type': 'video/mp4' },
    body: buf,
  });
  if (!put.ok) throw new Error(`YouTube upload: ${put.status} ${await put.text()}`);
  const data = await put.json();
  return { id: data.id, url: `https://youtu.be/${data.id}` };
}

export async function setThumbnail(videoId, thumbPath) {
  const token = await getYoutubeToken();
  const buf = readFileSync(thumbPath);
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buf.length),
      },
      body: buf,
    }
  );
  if (!res.ok) throw new Error(`thumbnail: ${res.status} ${await res.text()}`);
}

export async function postReviewComment(videoId, text) {
  const token = await getYoutubeToken();
  const initRes = await fetch(
    'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snippet: {
          videoId,
          topLevelComment: { snippet: { textOriginal: text } },
        },
      }),
    }
  );
  if (!initRes.ok) {
    const errTxt = await initRes.text();
    throw new Error(`comment create: ${initRes.status} ${errTxt.slice(0, 300)}`);
  }
  const commentData = await initRes.json();
  return commentData?.id || null;
}

export async function downloadImage(url, dest) {
  try {
    if (!url || typeof url !== 'string') return false;
    // Only accept http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    const img = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'image/*,*/*',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!img.ok) return false;
    const ct = (img.headers.get('content-type') || '').toLowerCase();
    // Reject obvious non-images (HTML error pages, JSON, etc.)
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) return false;
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length < 2048) return false;
    // Reject HTML/JSON/text payloads saved with image extension.
    // Common case: CDN returns 200 with an error page → ffmpeg "No JPEG data found".
    const head = buf.subarray(0, 512).toString('latin1').trimStart();
    if (
      head.startsWith('<') || // <html, <!DOCTYPE, <svg
      head.startsWith('{') ||
      head.startsWith('PK') // zip/apptype mislabeled
    ) return false;
    // Magic-byte check: jpeg FFD8FF, png 89504E47, gif GIF, webp RIFF....WEBP,
    // bmp BM, tiff II/MM, heic/avif ftyp, jpeg-xl FF0AFF0D
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
    const isWebp = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
    const isBmp = buf[0] === 0x42 && buf[1] === 0x4d;
    const isTiff = (buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d);
    const isHeif = buf.subarray(4, 12).toString('latin1').includes('ftyp');
    if (!(isJpeg || isPng || isGif || isWebp || isBmp || isTiff || isHeif)) return false;
    // Write raw first, then normalize to a guaranteed-decodable JPEG via ffmpeg.
    // This converts PNG/WebP/AVIF/odd-JPEG into something the concat demuxer
    // + mjpeg decoder can always read. If ffmpeg is unavailable, keep raw JPEG/PNG.
    const { execFileSync } = await import('node:child_process');
    const tmpRaw = dest + '.raw';
    writeFileSync(tmpRaw, buf);
    try {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmpRaw, '-frames:v', '1', '-q:v', '3', dest], { stdio: 'pipe' });
      const { statSync, rmSync } = await import('node:fs');
      try { rmSync(tmpRaw); } catch {}
      try {
        if (statSync(dest).size < 2048) return false;
      } catch { return false; }
      // Final decode probe: drop files ffmpeg itself cannot decode
      // (prevents "No JPEG data found in image" / "Could not find codec parameters").
      try {
        execFileSync('ffmpeg', ['-v', 'error', '-i', dest, '-frames:v', '1', '-f', 'null', '-'], { stdio: 'pipe' });
      } catch { return false; }
      return true;
    } catch {
      // ffmpeg missing or convert failed: keep raw only if plain JPEG/PNG
      try {
        const { copyFileSync, rmSync, statSync } = await import('node:fs');
        if (isJpeg || isPng) {
          copyFileSync(tmpRaw, dest);
          try { rmSync(tmpRaw); } catch {}
          return statSync(dest).size >= 2048;
        }
        try { rmSync(tmpRaw); } catch {}
      } catch {}
      return false;
    }
  } catch (e) {
    console.warn('[downloadImage] Falhou:', url?.slice(0, 60), e.message);
    return false;
  }
}
