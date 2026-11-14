/**
 * r2-s2-toon-kit — toon object character kit (rubber-hose style, original design) for batch S-2.
 * An everyday object (mug, box, bottle, can) becomes the body, with pie eyes, noodle arms/legs, white four-finger
 * gloves and big round shoes; ink lines boil on 3 drawings at 12 fps. Pure functions of the frame.
 * Local units: character ≈ 300 tall, origin = body centre.
 */
import React from 'react';
import {smoothClosed, smoothOpen} from './shapes';
import {h01} from './r2-x58-kit';

export type ToonBody = 'mug' | 'box3d' | 'bottle' | 'can';
export const TOON_DIMS: Record<ToonBody, {bw: number; bh: number}> = {mug: {bw: 62, bh: 72}, box3d: {bw: 66, bh: 60}, bottle: {bw: 46, bh: 92}, can: {bw: 50, bh: 78}};
export type ToonMouth = 'smile' | 'grin' | 'o' | 'wavy' | 'pucker' | 'tongue';
export type ToonBrows = 'none' | 'happy' | 'worried' | 'angry' | 'up';
export type ToonSteam = 'lazy' | 'bitter' | 'alarm' | 'wilted' | 'heart' | 'none';
export type ToonPose = {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  rot: number;
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
  bendL: number;
  bendR: number;
  wave: number;
  point: boolean;
};

const rrPts = (x0: number, y0: number, x1: number, y1: number, r: number, taper = 0) => {
  const out: [number, number][] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  arc(x1 - r, y0 + r, -Math.PI / 2);
  arc(x1 - r, y1 - r, 0);
  arc(x0 + r, y1 - r, Math.PI / 2);
  arc(x0 + r, y0 + r, Math.PI);
  if (!taper) return out;
  return out.map(([x, y]) => [x * (1 - taper * ((y - y0) / (y1 - y0))), y] as [number, number]);
};

export const toonOutline = (body: ToonBody): [number, number][] => {
  const {bw, bh} = TOON_DIMS[body];
  if (body === 'mug') return rrPts(-bw, -bh, bw, bh, 16, 0.1);
  if (body === 'can') return rrPts(-bw, -bh, bw, bh, 11, 0);
  if (body === 'box3d') return rrPts(-bw, -bh, bw, bh, 5, 0);
  // bottle: wide body, shoulder, neck
  return [[-14, -bh], [14, -bh], [15, -bh + 12], [17, -bh + 32], [34, -bh + 52], [bw, -bh + 74], [bw, bh - 12], [bw - 12, bh], [-bw + 12, bh], [-bw, bh - 12], [-bw, -bh + 74], [-34, -bh + 52], [-17, -bh + 32], [-15, -bh + 12]];
};

/** boil: displace outline points along the radial direction with a seeded value keyed on the drawing index d */
const boil = (pts: [number, number][], d: number, amp: number, seed: number) =>
  pts.map(([x, y], i) => {
    const L = Math.hypot(x, y) || 1;
    const o = (h01(i, d, seed) - 0.5) * 2 * amp;
    return [x + (x / L) * o, y + (y / L) * o] as [number, number];
  });

/** noodle limb: one smooth bend, control point = midpoint + perpendicular * bend */
const noodle = (a: [number, number], b: [number, number], bend: number): {d: string; ctrl: [number, number]} => {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  const c: [number, number] = [mx + (-dy / L) * bend, my + (dx / L) * bend];
  return {d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${c[0].toFixed(1)} ${c[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`, ctrl: c};
};

const Glove: React.FC<{x: number; y: number; ang: number; ink: string; lw: number; point?: boolean}> = ({x, y, ang, ink, lw, point}) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`} stroke={ink} strokeWidth={lw} strokeLinejoin="round" fill="#fff">
    <ellipse cx={-13} cy={0} rx={5} ry={13} />
    <circle cx={0} cy={0} r={14} />
    {[-8, 0, 8].map((o, i) => (
      <ellipse key={i} cx={point && i === 1 ? 26 : 16} cy={o} rx={point && i === 1 ? 14 : 8} ry={5.4} />
    ))}
    <ellipse cx={5} cy={-14} rx={8} ry={5.2} transform="rotate(-35 5 -14)" />
    <g strokeWidth={lw * 0.6} fill="none">
      <path d="M-3 -6 L5 -6" />
      <path d="M-3 0 L6 0" />
      <path d="M-3 6 L5 6" />
    </g>
  </g>
);

const Shoe: React.FC<{x: number; y: number; ink: string; dir: number}> = ({x, y, ink, dir}) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={dir * 7} cy={0} rx={26} ry={13} fill={ink} />
    <ellipse cx={dir * 16} cy={-5} rx={7} ry={3.2} fill="#fff" opacity={0.9} />
  </g>
);

const sstep = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v));

/** action -> pose. `t` = 0..1 progress inside the action segment */
export const toonPose = (action: string, t: number, frame: number, fps: number, bpm: number): ToonPose => {
  const beat = Math.sin((frame / fps) * (bpm / 60) * Math.PI * 2);
  const b: ToonPose = {dx: 0, dy: 0, sx: 1 - 0.01 * beat, sy: 1 + 0.018 * beat, rot: 0, armL: [-100, 40], armR: [100, 48], legL: [-24, 128], legR: [24, 128], bendL: 14, bendR: -14, wave: 0, point: false};
  if (action === 'walk' || action === 'run') {
    const sp = action === 'run' ? 0.62 : 0.4;
    const ph = frame * sp;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    return {...b, dy: -Math.abs(s) * 5, rot: s * 2.2, legL: [-24 + s * 26, 128 - Math.max(0, c) * 12], legR: [24 - s * 26, 128 - Math.max(0, -c) * 12], armL: [-98 - s * 14, 40 + c * 18], armR: [98 - s * 14, 48 - c * 18], bendL: 18, bendR: -18};
  }
  if (action === 'hop') {
    let dy = 0;
    let sy = 1;
    let sx = 1;
    let air = 0;
    if (t < 0.22) {
      const q = sstep(t / 0.22);
      sy = 1 - 0.22 * q;
      sx = 1 + 0.16 * q;
      dy = 10 * q;
    } else if (t < 0.7) {
      const q = (t - 0.22) / 0.48;
      air = Math.sin(q * Math.PI);
      dy = 10 * (1 - Math.min(1, q * 4)) - 46 * air;
      sy = 1 + 0.14 * air;
      sx = 1 - 0.08 * air;
    } else {
      const q = (t - 0.7) / 0.3;
      sy = 1 - 0.18 * Math.sin(q * Math.PI);
      sx = 1 + 0.12 * Math.sin(q * Math.PI);
    }
    return {...b, sx, sy, dy, armL: [-96 - air * 10, 40 - air * 70], armR: [96 + air * 10, 48 - air * 70], legL: [-24, 128 - air * 22], legR: [24, 128 - air * 22], bendL: 10, bendR: -10};
  }
  if (action === 'wave') {
    const w = Math.sin(frame * 0.5);
    return {...b, armR: [112 + w * 14, -62 + Math.abs(w) * 6], bendR: -16, wave: w, rot: -1.2 + beat * 0.8};
  }
  if (action === 'point') {
    const q = sstep(t * 3);
    return {...b, armR: [100 + 52 * q, 44 - 28 * q], bendR: -6, point: true, rot: 2 * q};
  }
  if (action === 'cheer') {
    const hop = Math.abs(Math.sin(frame * 0.3));
    return {...b, dy: -hop * 14, sy: 1 + (hop - 0.5) * 0.06, armL: [-112, -66 - hop * 8], armR: [112, -66 - hop * 8], bendL: -10, bendR: 10, legL: [-26, 128 - hop * 6], legR: [26, 128 - hop * 6]};
  }
  return b;
};

/** steam / flame-like mood carrier above the body */
export const ToonSteamLayer: React.FC<{kind: ToonSteam; x: number; y: number; frame: number; ink: string; lw: number; accent: string}> = ({kind, x, y, frame, ink, lw, accent}) => {
  if (kind === 'none') return null;
  return (
    <g fill="none" stroke={ink} strokeWidth={lw * 0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
      {[-22, 0, 22].map((ox, wi) => {
        const ph = frame * 0.09 + wi * 2.1;
        if (kind === 'heart') {
          const t = (((frame * 0.018 + wi * 0.34) % 1) + 1) % 1;
          const hy = y - t * 80;
          const hx = x + ox + Math.sin(t * 6 + wi) * 8;
          const s = 7 + 6 * Math.sin(t * Math.PI);
          return <path key={wi} transform={`translate(${hx} ${hy}) scale(${s / 10})`} d="M0 6 C-12 -4 -8 -14 0 -8 C8 -14 12 -4 0 6Z" fill={accent} stroke={ink} opacity={Math.sin(t * Math.PI)} />;
        }
        const pts: [number, number][] = [];
        for (let i = 0; i <= 6; i++) {
          const q = i / 6;
          let px = ox;
          let py = -q * 56;
          if (kind === 'lazy') px += Math.sin(ph + q * 5) * 7 * q;
          if (kind === 'bitter') px += (i % 2 ? 1 : -1) * 6 * q + Math.sin(ph) * 2;
          if (kind === 'alarm') {
            px += Math.sin(frame * 1.2 + wi) * 1.5;
            py *= 1.5;
          }
          if (kind === 'wilted') {
            px += q * q * 40 * (wi % 2 ? 1 : -1);
            py = -q * 34 + q * q * 20;
          }
          pts.push([x + px, y + py]);
        }
        return <path key={wi} d={smoothOpen(pts)} />;
      })}
    </g>
  );
};

export const ToonFace: React.FC<{mouth: ToonMouth; brows: ToonBrows; blink: boolean; lookX: number; lookY: number; ink: string; lw: number; body: string; cx: number; cy: number}> = ({mouth, brows, blink, lookX, lookY, ink, lw, body, cx, cy}) => {
  const eyeX = 21;
  const eyeRx = 15;
  const eyeRy = 20;
  const eye = (side: number) => {
    const ex = side * eyeX;
    const px = ex + lookX * 5;
    const py = lookY * 6;
    return (
      <g key={side}>
        <ellipse cx={ex} cy={0} rx={eyeRx} ry={eyeRy} fill="#fff" stroke={ink} strokeWidth={lw} />
        <ellipse cx={px} cy={py} rx={eyeRx * 0.64} ry={eyeRy * 0.74} fill={ink} />
        <path d={`M${px} ${py} L${px + eyeRx * 0.7} ${py - eyeRy * 0.15} L${px + eyeRx * 0.45} ${py - eyeRy * 0.8}Z`} fill="#fff" />
        {blink ? (
          <g>
            <ellipse cx={ex} cy={0} rx={eyeRx + lw * 0.5} ry={eyeRy + lw * 0.5} fill={body} />
            <path d={`M${ex - eyeRx} 2 Q${ex} ${eyeRy * 0.5} ${ex + eyeRx} 2`} fill="none" stroke={ink} strokeWidth={lw} strokeLinecap="round" />
          </g>
        ) : null}
      </g>
    );
  };
  const browPath = (side: number) => {
    const ex = side * eyeX;
    const inner = ex - side * 10;
    const outer = ex + side * 15;
    const y0 = -eyeRy - 9;
    const [yi, yo] = brows === 'happy' ? [y0 - 2, y0 - 6] : brows === 'worried' ? [y0 - 9, y0 + 1] : brows === 'angry' ? [y0 + 5, y0 - 5] : brows === 'up' ? [y0 - 8, y0 - 8] : [y0, y0];
    return `M${inner} ${yi} Q${(inner + outer) / 2} ${Math.min(yi, yo) - 3} ${outer} ${yo}`;
  };
  const my = 30;
  let mouthNode: React.ReactNode;
  if (mouth === 'grin')
    mouthNode = (
      <g>
        <path d={`M-26 ${my - 6} Q0 ${my + 4} 26 ${my - 6} Q22 ${my + 28} 0 ${my + 28} Q-22 ${my + 28} -26 ${my - 6}Z`} fill={ink} stroke={ink} strokeWidth={lw} strokeLinejoin="round" />
        <path d={`M-12 ${my + 24} Q0 ${my + 10} 12 ${my + 24} Q0 ${my + 30} -12 ${my + 24}Z`} fill="#E5788A" />
      </g>
    );
  else if (mouth === 'o') mouthNode = <ellipse cx={0} cy={my + 8} rx={10} ry={14} fill={ink} />;
  else if (mouth === 'wavy') mouthNode = <path d={`M-22 ${my + 8} q5.5 -8 11 0 t11 0 t11 0 t11 0`} fill="none" stroke={ink} strokeWidth={lw * 1.1} strokeLinecap="round" />;
  else if (mouth === 'pucker')
    mouthNode = (
      <g>
        <circle cx={0} cy={my + 6} r={6} fill="none" stroke={ink} strokeWidth={lw} />
        <path d={`M-4 ${my + 3} L4 ${my + 3}`} stroke={ink} strokeWidth={lw * 0.6} />
      </g>
    );
  else
    mouthNode = (
      <g fill="none" stroke={ink} strokeWidth={lw * 1.1} strokeLinecap="round">
        <path d={`M-24 ${my - 2} Q0 ${my + 22} 24 ${my - 2}`} />
        <path d={`M-27 ${my - 5} l-4 -3 M27 ${my - 5} l4 -3`} strokeWidth={lw * 0.8} />
        {mouth === 'tongue' ? <path d={`M2 ${my + 8} q10 2 10 12 q-1 6 -8 5 q-6 -2 -2 -17Z`} fill="#E5788A" strokeWidth={lw * 0.7} /> : null}
      </g>
    );
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {[-1, 1].map(eye)}
      {brows !== 'none' ? (
        <g fill="none" stroke={ink} strokeWidth={lw * 1.1} strokeLinecap="round">
          <path d={browPath(-1)} />
          <path d={browPath(1)} />
        </g>
      ) : null}
      {mouthNode}
    </g>
  );
};

export type ToonCharProps = {
  body: ToonBody;
  color: string;
  ink: string;
  accent: string;
  pose: ToonPose;
  mouth: ToonMouth;
  brows: ToonBrows;
  steam: ToonSteam;
  blink: boolean;
  lookX: number;
  lookY: number;
  frame: number;
  fps: number;
  boilAmp: number;
  onTwos: boolean;
  id: string;
};

/** the whole character in local units (origin = body centre); wrap in a translate/scale */
export const ToonCharacter: React.FC<ToonCharProps> = ({body, color, ink, accent, pose, mouth, brows, steam, blink, lookX, lookY, frame, fps, boilAmp, onTwos, id}) => {
  const {bw, bh} = TOON_DIMS[body];
  const d = onTwos ? Math.floor(frame / (fps / 12)) % 3 : 0;
  const lw = 6;
  const outline = boil(toonOutline(body), d, boilAmp, 3);
  const bodyPath = smoothClosed(outline);
  const shoulderL: [number, number] = [-bw + 6, 8];
  const shoulderR: [number, number] = [bw - 6, body === 'mug' ? 34 : 8];
  const hipL: [number, number] = [-24, bh - 6];
  const hipR: [number, number] = [24, bh - 6];
  const jit = (i: number, a = 1.2): [number, number] => [(h01(i, d, 11) - 0.5) * 2 * a * (onTwos ? 1 : 0), (h01(i, d, 17) - 0.5) * 2 * a * (onTwos ? 1 : 0)];
  const hand = (p: [number, number], i: number): [number, number] => [p[0] + jit(i)[0], p[1] + jit(i)[1]];
  const hL = hand(pose.armL, 1);
  const hR = hand(pose.armR, 2);
  const fL = hand(pose.legL, 3);
  const fR = hand(pose.legR, 4);
  const aL = noodle(shoulderL, hL, pose.bendL);
  const aR = noodle(shoulderR, hR, pose.bendR);
  const lL = noodle(hipL, [fL[0], fL[1] - 4], 10);
  const lR = noodle(hipR, [fR[0], fR[1] - 4], -10);
  const angTo = (c: [number, number], p: [number, number]) => (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI;
  const limbW = 13;
  const faceY = body === 'bottle' ? 22 : body === 'can' ? 0 : -4;
  const handle = `M${bw - 4} ${-bh * 0.35} Q${bw + 44} ${-bh * 0.4} ${bw + 38} ${bh * 0.05} Q${bw + 30} ${bh * 0.42} ${bw - 6} ${bh * 0.32}`;
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={bodyPath} />
        </clipPath>
      </defs>
      <g fill="none" stroke={ink} strokeWidth={limbW} strokeLinecap="round">
        <path d={lL.d} />
        <path d={lR.d} />
      </g>
      <Shoe x={fL[0]} y={fL[1] + 4} ink={ink} dir={-1} />
      <Shoe x={fR[0]} y={fR[1] + 4} ink={ink} dir={1} />
      <g fill="none" stroke={ink} strokeWidth={limbW} strokeLinecap="round">
        <path d={aL.d} />
        <path d={aR.d} />
      </g>
      {body === 'mug' ? (
        <g fill="none" strokeLinecap="round">
          <path d={handle} stroke={ink} strokeWidth={16} />
          <path d={handle} stroke={color} strokeWidth={6} />
        </g>
      ) : null}
      {body === 'box3d' ? (
        <g stroke={ink} strokeWidth={lw} strokeLinejoin="round">
          <path d={`M${-bw} ${-bh} L${-bw + 22} ${-bh - 26} L${bw + 22} ${-bh - 26} L${bw} ${-bh}Z`} fill="#fff" />
          <path d={`M${bw} ${-bh} L${bw + 22} ${-bh - 26} L${bw + 22} ${bh - 26} L${bw} ${bh}Z`} fill="#CFCBC0" />
        </g>
      ) : null}
      <path d={bodyPath} fill={color} />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={bw * 0.42} y={-bh - 30} width={bw} height={bh * 2 + 60} fill="#000" opacity={0.13} />
      </g>
      {body === 'can' ? (
        <g fill="none" stroke={ink} strokeWidth={lw * 0.7}>
          <path d={`M${-bw} ${-bh + 14} Q0 ${-bh + 26} ${bw} ${-bh + 14}`} />
          <path d={`M${-bw} ${bh - 14} Q0 ${bh - 2} ${bw} ${bh - 14}`} />
        </g>
      ) : null}
      <path d={bodyPath} fill="none" stroke={ink} strokeWidth={lw} strokeLinejoin="round" />
      {body === 'mug' ? (
        <g>
          <ellipse cx={0} cy={-bh} rx={bw * 0.92} ry={13} fill="#6A4A34" stroke={ink} strokeWidth={lw * 0.8} />
          <ellipse cx={-14} cy={-bh - 3} rx={bw * 0.35} ry={4} fill="#8A664C" />
        </g>
      ) : null}
      {body === 'bottle' ? <rect x={-17} y={-bh - 10} width={34} height={16} rx={5} fill={accent} stroke={ink} strokeWidth={lw * 0.8} /> : null}
      <ToonFace mouth={mouth} brows={brows} blink={blink} lookX={lookX} lookY={lookY} ink={ink} lw={lw * 0.65} body={color} cx={0} cy={faceY} />
      <Glove x={hL[0]} y={hL[1]} ang={angTo(aL.ctrl, hL)} ink={ink} lw={3.6} />
      <Glove x={hR[0]} y={hR[1]} ang={angTo(aR.ctrl, hR)} ink={ink} lw={3.6} point={pose.point} />
      <ToonSteamLayer kind={steam} x={body === 'bottle' ? 0 : -4} y={-bh - (body === 'box3d' ? 36 : body === 'bottle' ? 22 : 24)} frame={frame} ink={ink} lw={lw} accent={accent} />
    </g>
  );
};
