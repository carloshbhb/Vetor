import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setJpegQuality(95);
Config.setParallelism(4);

export const remotionConfig = {
  // Enable hardware acceleration for faster encoding
  enableHardwareAcceleration: true,
  // Better video quality
  crf: 18,
  // Use H.264 High Profile for better quality
  codecOptions: {
    profile: 'high',
    level: '4.2',
  },
};