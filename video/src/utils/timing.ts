/**
 * Scene timing resolution for review videos (Shorts and long).
 *
 * The queue worker measures the real narration (Edge TTS word boundaries) and sends exact
 * startFrame/endFrame per scene plus the real audio length as totalDuration. Those numbers
 * must win: they are what makes a cut land on the spoken word. The nominal per-scene
 * `duration` written by the script generator is only an estimate, so it is used when no
 * exact timing was supplied (local samples, manual runs).
 */

export type TimedSceneInput = {
  duration: number;
  startFrame?: number;
  endFrame?: number;
};

export type ResolvedTimings<T> = {
  scenes: Array<T & { startFrame: number; endFrame: number }>;
  /** Total video length in seconds. */
  totalDuration: number;
  /** Seconds the opening hook stays on screen. */
  hookDuration: number;
  /** true when the exact timings supplied by the worker were used. */
  exact: boolean;
};

type ResolveOptions = {
  /** Hook length when nothing better is known. */
  defaultHookSeconds: number;
  /** Seconds appended after the last scene for the closing card (nominal mode only). */
  tailSeconds: number;
};

type ResolveInput<T> = {
  scenes: T[];
  totalDuration?: number;
  hookDuration?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** True when every scene has a usable frame range, in order, and the total length is known. */
export function hasExactTimings(scenes: TimedSceneInput[], totalDuration: unknown, fps: number): boolean {
  if (!Array.isArray(scenes) || scenes.length === 0) return false;
  if (!isFiniteNumber(totalDuration) || totalDuration <= 0) return false;
  let previousEnd = 0;
  for (const scene of scenes) {
    if (!isFiniteNumber(scene.startFrame) || !isFiniteNumber(scene.endFrame)) return false;
    if (scene.startFrame < previousEnd - 1 || scene.endFrame <= scene.startFrame) return false;
    previousEnd = scene.endFrame;
  }
  // The last scene may not run past the audio (one frame of rounding tolerance).
  return previousEnd <= Math.ceil(totalDuration * fps) + 1;
}

export function resolveSceneTimings<T extends TimedSceneInput>(
  input: ResolveInput<T>,
  fps: number,
  options: ResolveOptions,
): ResolvedTimings<T> {
  const scenes = Array.isArray(input.scenes) ? input.scenes : [];

  if (hasExactTimings(scenes, input.totalDuration, fps)) {
    const firstStart = scenes[0].startFrame as number;
    const hookDuration = isFiniteNumber(input.hookDuration) && input.hookDuration > 0
      ? input.hookDuration
      : Math.max(0.5, firstStart / fps);
    return {
      scenes: scenes.map((scene) => ({
        ...scene,
        startFrame: scene.startFrame as number,
        endFrame: scene.endFrame as number,
      })),
      totalDuration: input.totalDuration as number,
      hookDuration,
      exact: true,
    };
  }

  const hookFrames = Math.round(options.defaultHookSeconds * fps);
  let currentFrame = hookFrames;
  const nominal = scenes.map((scene) => {
    const startFrame = currentFrame;
    const endFrame = currentFrame + Math.round(scene.duration * fps);
    currentFrame = endFrame;
    return { ...scene, startFrame, endFrame };
  });
  const contentFrames = nominal.reduce((max, scene) => Math.max(max, scene.endFrame), hookFrames) - hookFrames;
  return {
    scenes: nominal,
    totalDuration: (hookFrames + contentFrames + Math.round(options.tailSeconds * fps)) / fps,
    hookDuration: options.defaultHookSeconds,
    exact: false,
  };
}
