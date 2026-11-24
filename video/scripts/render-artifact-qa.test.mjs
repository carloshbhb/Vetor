import assert from "node:assert/strict";
import {
  parseFrameRate,
  parseProbePayload,
  parseBlackSegments,
  parseVolume,
  evaluateRenderArtifact,
} from "./render-artifact-qa.mjs";

assert.equal(parseFrameRate("30/1"), 30);
assert.equal(parseFrameRate("30000/1001"), 29.97002997002997);

const probe = parseProbePayload({
  streams: [
    { codec_type: "video", codec_name: "h264", width: 1080, height: 1920, avg_frame_rate: "30/1", pix_fmt: "yuv420p" },
    { codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2 },
  ],
  format: { duration: "12.5", size: "2500000" },
});
assert.equal(probe.video.width, 1080);
assert.equal(probe.audio.sampleRate, 48000);
assert.equal(probe.duration, 12.5);

const black = parseBlackSegments("black_start:2.000 black_end:3.250 black_duration:1.250");
assert.equal(black.length, 1);
assert.equal(black[0].duration, 1.25);

const volume = parseVolume("[Parsed_volumedetect] mean_volume: -18.0 dB\n[Parsed_volumedetect] max_volume: -2.0 dB");
assert.equal(volume.meanDb, -18);
assert.equal(volume.peakDb, -2);

const good = evaluateRenderArtifact({
  probe, profile: "shorts", blackSegments: [], volume, requireAudio: true,
});
assert.equal(good.ok, true);

const wrongSize = evaluateRenderArtifact({
  probe: { ...probe, video: { ...probe.video, width: 720 } },
  profile: "shorts", volume, requireAudio: true,
});
assert.equal(wrongSize.ok, false);
assert.match(wrongSize.errors.join(" "), /Resolução incorreta/);

const silence = evaluateRenderArtifact({
  probe, profile: "shorts", volume: { meanDb: -Infinity, peakDb: -Infinity }, requireAudio: true,
});
assert.equal(silence.ok, false);
assert.match(silence.errors.join(" "), /inaudível/);

const longBlack = evaluateRenderArtifact({
  probe, profile: "shorts", volume, blackSegments: [{ start: 1, end: 3, duration: 2 }],
});
assert.equal(longBlack.ok, false);
assert.match(longBlack.errors.join(" "), /Trecho preto contínuo/);

const missingAudio = evaluateRenderArtifact({
  probe: { ...probe, audio: null }, profile: "shorts", requireAudio: true,
});
assert.equal(missingAudio.ok, false);
assert.match(missingAudio.errors.join(" "), /faixa de áudio/);

console.log("[render-artifact-qa] media streams, resolution, fps, audio, black frames and policy checks passed.");
