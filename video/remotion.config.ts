import { Config } from '@remotion/cli/config';

// Applies to `remotion studio` / `remotion render` (CLI). The worker renders through
// src/utils/renderVideo.ts, which repeats the encode options explicitly.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
// Limited-range BT.709 4:2:0: what YouTube and every phone decode correctly.
// (Without this, JPEG frames produced full-range yuvj420p files.)
Config.setPixelFormat('yuv420p');
Config.setColorSpace('bt709');
Config.setCrf(18);
Config.setX264Preset('medium');
Config.setAudioBitrate('192k');
Config.setConcurrency(2);
