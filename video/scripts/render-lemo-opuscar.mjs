import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPOSITORY = "https://github.com/lemomo-ai/lemo-opuscar.git";

function run(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: "inherit",
    timeout: options.timeout ?? 20 * 60 * 1000,
    cwd: options.cwd,
    env: { ...process.env, ...(options.env || {}) },
  });
}

function ensureLibrary() {
  const home = path.resolve(process.env.LEMO_OPUSCAR_HOME || path.join(os.tmpdir(), "vetor-lemo-opuscar"));
  const renderer = path.join(home, "core", "render", "video.mjs");
  if (!fs.existsSync(renderer)) {
    if (fs.existsSync(home)) {
      throw new Error("LEMO_OPUSCAR_HOME existe, mas não contém uma instalação válida do Lemo-Opuscar: " + home);
    }
    fs.mkdirSync(path.dirname(home), { recursive: true });
    console.log("[LEMO_OPUSCAR] Clonando o núcleo oficial de renderização em modo sparse.");
    run("git", ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", "main", REPOSITORY, home], { timeout: 10 * 60 * 1000 });
    run("git", ["-C", home, "sparse-checkout", "set", "core", "package.json", "package-lock.json"]);
  }

  const playwrightPackage = path.join(home, "node_modules", "playwright-core", "package.json");
  const threePackage = path.join(home, "node_modules", "three", "package.json");
  if (!fs.existsSync(playwrightPackage) || !fs.existsSync(threePackage)) {
    console.log("[LEMO_OPUSCAR] Instalando dependências isoladas do renderizador.");
    run("npm", ["ci", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: home, timeout: 15 * 60 * 1000 });
  }

  const browserMarker = path.join(home, ".vetor-chromium-ready");
  if (!fs.existsSync(browserMarker)) {
    console.log("[LEMO_OPUSCAR] Instalando Chromium Headless Shell do Playwright.");
    run(process.execPath, [path.join(home, "node_modules", "playwright-core", "cli.js"), "install", "chromium-headless-shell"], { cwd: home, timeout: 15 * 60 * 1000 });
    fs.writeFileSync(browserMarker, new Date().toISOString());
  }

  try {
    const revision = execFileSync("git", ["-C", home, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
    console.log("[LEMO_OPUSCAR] Núcleo oficial instalado; commit=" + revision);
  } catch {}
  return home;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

function copyProductImages(videoData, projectDir) {
  const publicRoot = path.resolve("video", "public");
  const outDir = path.join(projectDir, "assets");
  fs.mkdirSync(outDir, { recursive: true });
  const sources = [...new Set([
    videoData.imageUrl,
    ...(Array.isArray(videoData.productImages) ? videoData.productImages : []),
  ].filter((value) => typeof value === "string" && value.trim()))].slice(0, 6);
  const copied = [];
  for (const source of sources) {
    const clean = source.replace(/^\/+/, "");
    const absolute = path.resolve(publicRoot, clean);
    if (!isInside(publicRoot, absolute) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    const extension = path.extname(absolute).toLowerCase() || ".jpg";
    const fileName = "product-" + copied.length + extension;
    fs.copyFileSync(absolute, path.join(outDir, fileName));
    copied.push("assets/" + fileName);
  }
  return copied;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function makeFilmHtml(videoData, images, width, height) {
  const fps = Number(videoData.fps) > 0 ? Number(videoData.fps) : 30;
  const duration = Math.max(1, Number(videoData.totalDuration) || 30);
  const scenes = (Array.isArray(videoData.scenes) ? videoData.scenes : []).map((scene) => ({
    start: Number(scene.startFrame || 0) / fps,
    end: Number(scene.endFrame || 0) / fps,
    text: String(scene.text || ""),
    cue: String(scene.visualCue || ""),
  }));
  const subtitles = (Array.isArray(videoData.subtitleEntries) ? videoData.subtitleEntries : []).map((entry) => ({
    start: Number(entry.start || 0),
    end: Number(entry.end || 0),
    text: String(entry.text || ""),
  }));
  const config = safeJson({
    width, height, duration, fps,
    title: String(videoData.title || "Vetor"),
    category: String(videoData.category || "Tecnologia"),
    hook: String(videoData.hook || ""),
    callToAction: String(videoData.callToAction || ""),
    scenes, subtitles, images,
  });
  const lines = [
    "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Vetor Motion Film</title>",
    "<style>html,body{margin:0;padding:0;background:#060a13;overflow:hidden}canvas{display:block;width:" + width + "px;height:" + height + "px}</style>",
    "</head><body><canvas id='film' width='" + width + "' height='" + height + "'></canvas>",
    "<script>",
    "const cfg = " + config + ";",
    "const canvas = document.getElementById('film');",
    "const ctx = canvas.getContext('2d', { alpha: false });",
    "const images = cfg.images.map((src) => { const image = new Image(); image.src = src; return image; });",
    "window.DUR = cfg.duration; window.READY = false;",
    "Promise.all(images.map((image) => new Promise((resolve) => { if (image.complete) return resolve(); image.onload = resolve; image.onerror = resolve; }))).then(() => { document.fonts.ready.then(() => { window.READY = true; }); });",
    "const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));",
    "const smooth = (v) => { const x=clamp(v); return x*x*(3-2*x); };",
    "function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}",
    "function wrap(text,x,y,maxWidth,lineHeight,maxLines,font,color){ctx.font=font;ctx.fillStyle=color;ctx.textAlign='left';const words=String(text||'').split(/\\s+/).filter(Boolean);let line='',lines=[];for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);lines.slice(0,maxLines).forEach((value,index)=>ctx.fillText(value,x,y+index*lineHeight,maxWidth));return Math.min(lines.length,maxLines);}",
    "function contain(image,x,y,maxW,maxH,alpha=1,scale=1){if(!image||!image.complete||!image.naturalWidth)return;const ratio=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight)*scale;const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=44;ctx.drawImage(image,x-w/2,y-h/2,w,h);ctx.restore();}",
    "function activeScene(t){return cfg.scenes.find((scene,index)=>t>=scene.start&&(t<scene.end||index===cfg.scenes.length-1))||cfg.scenes[0]||{text:cfg.hook,cue:''};}",
    "function draw(t){",
    "const W=cfg.width,H=cfg.height,s=Math.max(1,Math.min(W/1080,H/1080)),portrait=H>W;ctx.clearRect(0,0,W,H);",
    "const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#101a2b');bg.addColorStop(.52,'#080e19');bg.addColorStop(1,'#03060d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);",
    "const glow=ctx.createRadialGradient(W*.76,H*.38,0,W*.76,H*.38,Math.max(W,H)*.62);glow.addColorStop(0,'rgba(47,104,211,.24)');glow.addColorStop(1,'rgba(4,8,16,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);",
    "ctx.save();ctx.globalAlpha=.13;ctx.strokeStyle='#79a9ff';ctx.lineWidth=1;const step=56*s;for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();",
    "const scene=activeScene(t),sceneIndex=Math.max(0,cfg.scenes.indexOf(scene)),fade=smooth(t/.65),drift=Math.sin(t*.65)*8*s,hero=images[0],progress=clamp(t/cfg.duration);ctx.globalAlpha=fade;",
    "ctx.fillStyle='#78a8ff';ctx.font='700 '+(17*s)+'px Inter,Arial,sans-serif';ctx.textAlign='left';ctx.fillText('VETOR  /  REVIEW VISUAL',64*s,68*s);ctx.fillStyle='rgba(229,238,255,.6)';ctx.font='500 '+(17*s)+'px Inter,Arial,sans-serif';ctx.textAlign='right';ctx.fillText(cfg.category.toUpperCase(),W-64*s,68*s);ctx.textAlign='left';",
    "if(portrait){const heroY=H*.31+drift;roundedRect(76*s,H*.115,W-152*s,H*.39,34*s,'rgba(255,255,255,.045)','rgba(151,184,255,.18)');contain(hero,W*.5,heroY,W*.73,H*.32,1,1+smooth(t/2)*.035);ctx.fillStyle='#6fa4ff';ctx.fillRect(76*s,H*.545,68*s,5*s);wrap(t<3?cfg.hook:(scene.cue||scene.text),76*s,H*.61,W-152*s,56*s,3,'750 '+(42*s)+'px Inter,Arial,sans-serif','#f6f8ff');ctx.fillStyle='rgba(224,234,255,.68)';wrap(scene.text,76*s,H*.74,W-152*s,32*s,3,'500 '+(22*s)+'px Inter,Arial,sans-serif','rgba(231,239,255,.8)');}",
    "else{const imageX=W*.72,imageY=H*.53+drift;roundedRect(W*.48,H*.16,W*.46,H*.7,34*s,'rgba(255,255,255,.035)','rgba(151,184,255,.18)');contain(hero,imageX,imageY,W*.38,H*.57,1,1+smooth(t/2)*.035);ctx.fillStyle='#6fa4ff';ctx.fillRect(76*s,H*.24,80*s,5*s);wrap(t<3?cfg.hook:(scene.cue||scene.text),76*s,H*.34,W*.36,58*s,4,'750 '+(48*s)+'px Inter,Arial,sans-serif','#f6f8ff');ctx.fillStyle='rgba(224,234,255,.68)';wrap(scene.text,76*s,H*.68,W*.34,32*s,4,'500 '+(22*s)+'px Inter,Arial,sans-serif','rgba(231,239,255,.8)');}",
    "ctx.globalAlpha=1;const caption=cfg.subtitles.find((entry)=>t>=entry.start&&t<entry.end);if(caption){const boxW=portrait?W-100*s:W*.78,boxH=portrait?112*s:96*s,boxX=(W-boxW)/2,boxY=H-(portrait?245*s:145*s);roundedRect(boxX,boxY,boxW,boxH,22*s,'rgba(5,10,20,.88)','rgba(132,171,245,.35)');ctx.fillStyle='#f7f9ff';ctx.textAlign='center';ctx.font='600 '+(portrait?27:29)*s+'px Inter,Arial,sans-serif';const words=caption.text.split(/\\s+/);let line='',lines=[];for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>boxW-50*s){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);lines.slice(0,2).forEach((value,index)=>ctx.fillText(value,W/2,boxY+(lines.length===1?67:43)*s+index*34*s,boxW-50*s));}",
    "const barY=H-42*s;ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(64*s,barY,W-128*s,4*s);ctx.fillStyle='#6fa4ff';ctx.fillRect(64*s,barY,(W-128*s)*progress,4*s);ctx.fillStyle='rgba(230,238,255,.58)';ctx.font='500 '+(14*s)+'px Inter,Arial,sans-serif';ctx.textAlign='left';ctx.fillText('VETOR.BLOG',64*s,H-17*s);ctx.textAlign='right';ctx.fillText(String(sceneIndex+1).padStart(2,'0')+' / '+String(Math.max(1,cfg.scenes.length)).padStart(2,'0'),W-64*s,H-17*s);",
    "}",
    "window.render=(seconds)=>draw(Math.max(0,Math.min(cfg.duration,Number(seconds)||0)));",
    "</script></body></html>"
  ];
  return lines.join("\n");
}

export async function renderWithLemoOpuscar(videoData, outputPath, audioPath) {
  const library = ensureLibrary();
  const fps = Math.max(24, Math.min(60, Math.round(Number(videoData.fps) || 30)));
  const isLong = videoData.type === "long";
  const width = isLong ? 1920 : 1080;
  const height = isLong ? 1080 : 1920;
  const safeId = String(videoData.id || path.basename(outputPath, ".mp4")).replace(/[^a-zA-Z0-9_-]/g, "-");
  const projectDir = path.join(library, "films", "vetor-" + safeId);
  const rawPath = outputPath.replace(/\.mp4$/i, ".lemo-silent.mp4");
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(projectDir, { recursive: true });
  const images = copyProductImages(videoData, projectDir);
  fs.writeFileSync(path.join(projectDir, "index.html"), makeFilmHtml(videoData, images, width, height), "utf8");

  try {
    console.log("[LEMO_OPUSCAR] Renderizando composição Vetor no core oficial do Lemo-Opuscar.");
    run(process.execPath, [
      path.join(library, "core", "render", "video.mjs"),
      projectDir, "--fps", String(fps), "--workers", "2",
      "--size", width + "x" + height, "--out", rawPath,
    ], { cwd: library, timeout: 45 * 60 * 1000 });

    if (!fs.existsSync(rawPath) || fs.statSync(rawPath).size < 10000) {
      throw new Error("Lemo-Opuscar terminou sem produzir um MP4 válido.");
    }
    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error("A faixa de narração não está disponível para finalizar o vídeo Lemo-Opuscar.");
    }
    run("ffmpeg", [
      "-y", "-i", rawPath, "-i", audioPath,
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k", "-shortest",
      "-movflags", "+faststart", outputPath,
    ], { timeout: 10 * 60 * 1000 });
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 10000) {
      throw new Error("A composição Lemo-Opuscar não gerou um arquivo final válido.");
    }
    console.log("[LEMO_OPUSCAR] MP4 renderizado e faixa Edge TTS incorporada.");
  } finally {
    if (fs.existsSync(rawPath)) fs.rmSync(rawPath, { force: true });
    if (process.env.LEMO_KEEP_PROJECT !== "true") fs.rmSync(projectDir, { recursive: true, force: true });
  }
}
