import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TTSOptions {
  voice?: string;
  rate?: string;
  volume?: string;
  pitch?: string;
}

export interface TTSResult {
  audioPath: string;
  duration: number;
  voice: string;
}

const BRAZILIAN_VOICES = [
  'pt-BR-AntonioNeural',
  'pt-BR-FranciscaNeural',
  'pt-BR-ThiagoNeural',
  'pt-BR-IsabelaNeural',
];

const DEFAULT_VOICE = 'pt-BR-FranciscaNeural';

function getPythonScriptPath(): string {
  const possiblePaths = [
    path.resolve(__dirname, '../../../scripts/tts.py'),
    path.resolve(__dirname, '../../scripts/tts.py'),
    path.resolve(__dirname, '../../../scripts/tts.py'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'scripts/tts.py';
}

export async function generateVoiceover(
  text: string,
  outputPath: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const voice = options.voice || DEFAULT_VOICE;
  const scriptPath = getPythonScriptPath();

  const args = [scriptPath, text, outputPath, voice];

  return new Promise((resolve, reject) => {
    const child = spawn('python', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`TTS failed with code ${code}: ${stderr}`));
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(new Error('Audio file was not created'));
        return;
      }

      const stats = fs.statSync(outputPath);
      if (stats.size === 0) {
        reject(new Error('Audio file is empty'));
        return;
      }

      const duration = estimateDuration(text);
      resolve({
        audioPath: outputPath,
        duration,
        voice,
      });
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn python: ${err.message}`));
    });
  });
}

function estimateDuration(text: string): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  return Math.ceil((words / wordsPerMinute) * 60);
}

export async function generateVoiceoverFromScript(
  script: { hook: string; scenes: Array<{ text: string; duration: number }>; callToAction: string },
  outputDir: string,
  options: TTSOptions = {}
): Promise<TTSResult[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: TTSResult[] = [];

  const hookPath = path.join(outputDir, 'hook.mp3');
  await generateVoiceover(script.hook, hookPath, options);
  results.push({ audioPath: hookPath, duration: estimateDuration(script.hook), voice: options.voice || DEFAULT_VOICE });

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const scenePath = path.join(outputDir, `scene-${i + 1}.mp3`);
    await generateVoiceover(scene.text, scenePath, options);
    results.push({ audioPath: scenePath, duration: scene.duration, voice: options.voice || DEFAULT_VOICE });
  }

  const ctaPath = path.join(outputDir, 'cta.mp3');
  await generateVoiceover(script.callToAction, ctaPath, options);
  results.push({ audioPath: ctaPath, duration: estimateDuration(script.callToAction), voice: options.voice || DEFAULT_VOICE });

  return results;
}

export async function combineAudioFiles(inputPaths: string[], outputPath: string): Promise<void> {
  const ffmpegPath = findFfmpeg();
  
  const fileListPath = path.join(path.dirname(outputPath), 'filelist.txt');
  const fileListContent = inputPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(fileListPath, fileListContent);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c', 'copy',
      '-y',
      outputPath,
    ];

    const child = spawn(ffmpegPath, args);
    
    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      fs.unlinkSync(fileListPath);
      if (code !== 0) {
        reject(new Error(`FFmpeg failed: ${stderr}`));
        return;
      }
      resolve();
    });

    child.on('error', (err) => {
      fs.unlinkSync(fileListPath);
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

function findFfmpeg(): string {
  const possiblePaths = [
    path.resolve(__dirname, '../../../node_modules/.bin/ffmpeg'),
    path.resolve(__dirname, '../../node_modules/.bin/ffmpeg'),
    'ffmpeg',
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p) || p === 'ffmpeg') {
        return p;
      }
    } catch {
      continue;
    }
  }
  return 'ffmpeg';
}

export async function getAudioDuration(audioPath: string): Promise<number> {
  const ffprobePath = findFfprobe();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ];

    const child = spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }
      const duration = parseFloat(stdout.trim());
      resolve(isNaN(duration) ? 0 : duration);
    });
  });
}

function findFfprobe(): string {
  const possiblePaths = [
    path.resolve(__dirname, '../../../node_modules/.bin/ffprobe'),
    path.resolve(__dirname, '../../node_modules/.bin/ffprobe'),
    'ffprobe',
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p) || p === 'ffprobe') {
        return p;
      }
    } catch {
      continue;
    }
  }
  return 'ffprobe';
}

export function listVoices(): Promise<string[]> {
  return new Promise((resolve) => {
    resolve(BRAZILIAN_VOICES);
  });
}