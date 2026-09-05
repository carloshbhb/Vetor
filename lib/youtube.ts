// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Upload gratuito via YouTube Data API v3
// Custo: R$0 (cota grátis 10.000 un/dia ≈ 6 uploads/dia, upload = 1600 un)
// Requer: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
// Como gerar o refresh token: veja docs/VIDEO_AUTOMATION_FREE.md
// ─────────────────────────────────────────────────────────────────────────────
import { OAuth2Client } from 'google-auth-library';
import fs from 'node:fs';

function getOAuthClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Configure YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN no .env.local');
  }
  const oauth = new OAuth2Client(clientId, clientSecret, 'http://localhost');
  oauth.setCredentials({ refresh_token: refreshToken });
  return oauth;
}

export interface YoutubeUploadInput {
  videoPath: string;
  title: string;
  description: string;
  tags?: string[];
  privacy?: 'private' | 'unlisted' | 'public';
  madeForKids?: boolean;
}

export async function uploadToYoutube(input: YoutubeUploadInput): Promise<string> {
  const oauth = getOAuthClient();
  const { token } = await oauth.getAccessToken();
  if (!token) throw new Error('Não foi possível obter access_token do YouTube');

  const stat = fs.statSync(input.videoPath);
  const fileSize = stat.size;

  // 1. Inicia upload resumable
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(fileSize),
        'X-Upload-Content-Type': 'video/mp4',
      },
      body: JSON.stringify({
        snippet: {
          title: input.title.slice(0, 100),
          description: input.description.slice(0, 5000),
          tags: (input.tags || []).slice(0, 15),
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: input.privacy || 'unlisted', // comece como unlisted, revise e mude p/ public
          madeForKids: input.madeForKids ?? false,
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );
  if (!initRes.ok) throw new Error(`YouTube init falhou: ${initRes.status} ${await initRes.text()}`);
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube não retornou URL de upload');

  // 2. Envia o arquivo
  const fileBuffer = fs.readFileSync(input.videoPath);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Length': String(fileSize), 'Content-Type': 'video/mp4' },
    body: fileBuffer as any,
  });
  if (!putRes.ok) throw new Error(`YouTube upload falhou: ${putRes.status} ${await putRes.text()}`);
  const data = (await putRes.json()) as any;
  return `https://youtu.be/${data.id}`;
}
