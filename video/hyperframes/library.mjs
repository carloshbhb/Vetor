export const PROFESSIONAL_TEMPLATES = Object.freeze({
  "shorts-retention": { id: "shorts-retention", label: "Shorts Retention", description: "Hook editorial, captions cinéticas e ritmo visual para vídeos verticais." },
  "product-editorial": { id: "product-editorial", label: "Product Editorial", description: "Review horizontal com imagens reais, enquadramento editorial e movimentos suaves." },
  "comparison-editorial": { id: "comparison-editorial", label: "Comparison Editorial", description: "Comparativos com hierarquia visual equilibrada e cenas factuais." },
  "cinematic-review": { id: "cinematic-review", label: "Cinematic Review", description: "Abertura premium, atmosfera visual e encerramento da marca." }
});

export const OFFICIAL_HYPERFRAMES_CATALOG = Object.freeze([
  { id: "logo-outro", kind: "block", use: "Referência para encerramento; substituir branding de demonstração.", url: "https://hyperframes.app/catalog/logo-outro" },
  { id: "data-chart", kind: "block", use: "Gráficos animados; substituir todos os valores de exemplo por dados verificados.", url: "https://hyperframes.app/catalog/data-chart" },
  { id: "app-showcase", kind: "block", use: "Referência para showcase de produto.", url: "https://hyperframes.app/catalog/app-showcase" },
  { id: "flash-through-white", kind: "block", use: "Transição curta; usar com moderação.", url: "https://hyperframes.app/catalog/flash-through-white" },
  { id: "transitions-radial", kind: "block", use: "Transição radial para cenas premium.", url: "https://hyperframes.app/catalog/transitions-radial" },
  { id: "grain-overlay", kind: "component", use: "Textura discreta de filme.", url: "https://hyperframes.app/catalog/grain-overlay" }
]);

function esc(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function n(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function t(value) { return Math.max(0, n(value, 0)).toFixed(3); }
function sceneLabel(scene, index) {
  const value = [scene && scene.visualCue, scene && scene.text].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/preco|valor|custo|frete|oferta|economia/.test(value)) return "DECISÃO DE COMPRA";
  if (/limitacao|atencao|ressalva|contra|ausencia|incompatibilidade|garantia/.test(value)) return "PONTO DE ATENÇÃO";
  if (/compar|versus|\bvs\b|alternativa|concorrente/.test(value)) return "CRITÉRIO DE COMPARAÇÃO";
  if (/bateria|autonomia|armazenamento|memoria|resolucao|polegadas|hz|mah|gb|tb|mp/.test(value)) return "DADO QUE IMPORTA";
  if (/tela|display|camera|acabamento|material|construcao|design|audio|microfone|conexao|ergonomia/.test(value)) return "OLHO NO DETALHE";
  if (/rotina|dia a dia|estudo|trabalho|jogo|assistir|mobilidade|conforto/.test(value)) return "NA PRÁTICA";
  return index % 2 === 0 ? "ANÁLISE VETOR" : "O QUE OBSERVAR";
}
function timedDiv(id, start, duration, track, classes, content) {
  return '<div id="' + esc(id) + '" class="clip ' + classes + '" data-start="' + t(start) + '" data-duration="' + t(duration) + '" data-track-index="' + track + '">' + content + "</div>";
}

export function buildCompositionHtml(videoData, options) {
  const data = videoData || {};
  const assets = options && options.assets ? options.assets : {};
  const landscape = data.type === "long";
  const width = landscape ? 1920 : 1080;
  const height = landscape ? 1080 : 1920;
  const fps = Math.max(1, n(data.fps, 30));
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  const captions = Array.isArray(data.subtitleEntries) ? data.subtitleEntries : [];
  const images = Array.isArray(assets.productImages) ? assets.productImages : [];
  const broll = Array.isArray(assets.brollVideos) ? assets.brollVideos : [];
  const hookDuration = Math.max(0.5, n(data.hookDuration, 3));
  let cursor = hookDuration;
  const records = scenes.map(function (scene, index) {
    const startFrame = n(scene && scene.startFrame, NaN);
    const endFrame = n(scene && scene.endFrame, NaN);
    const start = Number.isFinite(startFrame) ? startFrame / fps : cursor;
    const end = Number.isFinite(endFrame) && endFrame > startFrame ? endFrame / fps : start + Math.max(2.5, n(scene && scene.duration, 5));
    cursor = Math.max(cursor, end);
    return { scene: scene || {}, index: index, start: start, end: end, duration: Math.max(0.15, end - start), label: sceneLabel(scene || {}, index) };
  });
  const duration = Math.max(1, n(data.totalDuration, cursor), cursor);
  const templateId = PROFESSIONAL_TEMPLATES[data.templateId] ? data.templateId : (landscape ? "product-editorial" : "shorts-retention");
  const comparison = templateId === "comparison-editorial";
  const title = esc(data.title || "Análise de produto");
  const hook = esc(data.hook || title);
  const cta = esc(data.callToAction || "Confira a análise completa no Vetor.blog.");
  const layers = [];
  const animations = [];
  records.forEach(function (record) {
    const i = record.index;
    const image = images.length ? images[i % images.length] : "";
    const clip = broll[i] || "";
    const visualId = "scene-visual-" + i;
    if (clip) {
      layers.push('<video id="' + visualId + '" data-start="' + t(record.start) + '" data-duration="' + t(record.duration) + '" data-track-index="0" src="' + esc(clip) + '" muted playsinline preload="auto"></video>');
      if (image) layers.push('<img id="scene-product-' + i + '" class="clip scene-product-card" data-start="' + t(record.start) + '" data-duration="' + t(record.duration) + '" data-track-index="5" src="' + esc(image) + '" alt="Produto em destaque" />');
    } else if (image) {
      layers.push('<img id="' + visualId + '" class="clip scene-still" data-start="' + t(record.start) + '" data-duration="' + t(record.duration) + '" data-track-index="0" src="' + esc(image) + '" alt="Imagem do produto" />');
    } else {
      layers.push(timedDiv(visualId, record.start, record.duration, 0, "scene-fallback", ""));
    }
    layers.push(timedDiv("scene-label-" + i, record.start, record.duration, 15, "scene-label",
      '<span class="scene-kicker">' + esc(record.label) + '</span><span class="scene-description">' + esc(record.scene.visualCue || record.scene.text || ("Cena " + (i + 1))) + "</span>"));
    const motion = i % 4;
    const from = motion === 0 ? "{scale:1.12,x:18,y:8}" : motion === 1 ? "{scale:1.12,x:-18,y:5}" : motion === 2 ? "{scale:1.1,y:16}" : "{scale:1.08,y:-12}";
    animations.push('tl.fromTo("#' + visualId + '",' + from + ',{scale:1,x:0,y:0,duration:' + Math.max(0.2, record.duration) + ',ease:"sine.inOut"},' + record.start + ');');
    animations.push('tl.fromTo("#scene-label-' + i + '",{opacity:0,y:28,x:-12},{opacity:1,y:0,x:0,duration:.42,ease:"power3.out"},' + record.start + ');');
  });
  const captionLayers = [];
  const captionAnimations = [];
  captions.forEach(function (entry, index) {
    const start = n(entry && entry.start, NaN);
    const end = n(entry && entry.end, NaN);
    const words = String(entry && entry.text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !words.length) return;
    const wordHtml = words.map(function (word, wordIndex) {
      const selector = "#caption-" + index + "-word-" + wordIndex;
      const at = start + wordIndex * Math.max(0.025, Math.min(0.12, (end - start) / words.length));
      captionAnimations.push('tl.fromTo("' + selector + '",{opacity:0,y:7,scale:.96},{opacity:1,y:0,scale:1,duration:.09,ease:"power2.out"},' + at.toFixed(3) + ');');
      return '<span id="caption-' + index + '-word-' + wordIndex + '" class="caption-word">' + esc(word) + "</span>";
    }).join(" ");
    captionLayers.push(timedDiv("caption-" + index, start, end - start, 30 + index, "caption-cue", '<span class="caption-line">' + wordHtml + "</span>"));
  });
  const intro = timedDiv("hero-title", 0, Math.min(hookDuration, duration), 60, "hero-title",
    '<span class="eyebrow">' + (comparison ? "COMPARATIVO VETOR" : "VETOR • ANÁLISE") + '</span><strong>' + hook + '</strong><span class="hero-subtitle">' + title + "</span>");
  const outroStart = Math.max(0, duration - Math.min(6, duration));
  const outro = timedDiv("vetor-outro", outroStart, Math.max(0.2, duration - outroStart), 61, "vetor-outro",
    '<span class="outro-mark">VETOR<span>.</span>BLOG</span><strong>' + cta + '</strong><span class="outro-note">Análise independente • Consulte os links na descrição</span>');
  const marker = timedDiv("duration-marker", 0, duration, 99, "duration-marker", "");
  const audio = assets.audio ? '<audio id="narration" data-start="0" data-duration="' + t(duration) + '" data-track-index="100" data-volume="1" src="' + esc(assets.audio) + '"></audio>' : "";
  const html = [
    "<!doctype html>", '<html lang="pt-BR"><head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=' + width + ', height=' + height + '" />',
    "<title>" + title + " | Vetor.blog</title>", "<style>",
    "*{box-sizing:border-box}html,body{margin:0;padding:0;width:" + width + "px;height:" + height + "px;overflow:hidden;background:#080c14;color:#fff;font-family:Inter,Arial,Helvetica,sans-serif}",
    "#vetor-root{position:relative;width:" + width + "px;height:" + height + "px;overflow:hidden;background:radial-gradient(ellipse at 78% 16%,rgba(66,133,244,.22),transparent 44%),linear-gradient(145deg,#080c14 0%,#0c1424 54%,#070b13 100%)}",
    ".ambient-orb{position:absolute;width:70%;height:45%;left:35%;top:-18%;border-radius:50%;background:radial-gradient(circle,rgba(37,99,235,.24),transparent 68%);filter:blur(50px);pointer-events:none}",
    ".film-grain{position:absolute;inset:0;opacity:.07;pointer-events:none;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")}",
    "#vetor-root video,#vetor-root .scene-still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.64) saturate(1.04)}",
    ".scene-fallback{position:absolute;inset:0;background:radial-gradient(circle at 72% 35%,rgba(66,133,244,.34),transparent 34%),linear-gradient(140deg,#101b31,#080c14 70%)}",
    ".scene-product-card{position:absolute;right:" + (landscape ? "8%" : "20%") + ";bottom:" + (landscape ? "16%" : "20%") + ";width:" + (landscape ? "31%" : "26%") + ";height:" + (landscape ? "48%" : "28%") + ";object-fit:contain;z-index:7;filter:drop-shadow(0 28px 42px rgba(0,0,0,.55));border-radius:28px}",
    ".scene-label{position:absolute;left:" + (landscape ? "8%" : "20%") + ";top:" + (landscape ? "16%" : "20%") + ";width:" + (landscape ? "56%" : "60%") + ";display:flex;flex-direction:column;gap:16px;padding:26px 30px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:linear-gradient(115deg,rgba(5,10,20,.78),rgba(5,10,20,.26));backdrop-filter:blur(12px);box-shadow:0 18px 55px rgba(0,0,0,.22)}",
    ".scene-kicker,.eyebrow{font-size:22px;font-weight:800;letter-spacing:.16em;color:#79a9ff;text-transform:uppercase}",
    ".scene-description{font-size:" + (landscape ? "34px" : "36px") + ";line-height:1.17;font-weight:750;max-width:100%;text-wrap:balance}",
    ".hero-title{position:absolute;left:" + (landscape ? "8%" : "20%") + ";top:" + (landscape ? "15%" : "18%") + ";width:" + (landscape ? "66%" : "60%") + ";display:flex;flex-direction:column;gap:18px;padding:34px 38px;border:1px solid rgba(255,255,255,.16);border-radius:30px;background:linear-gradient(120deg,rgba(5,10,20,.88),rgba(5,10,20,.42));box-shadow:0 28px 80px rgba(0,0,0,.35);backdrop-filter:blur(16px)}",
    ".hero-title strong{font-size:66px;line-height:1.02;font-weight:900;letter-spacing:-.045em;text-wrap:balance}.hero-subtitle{font-size:26px;color:#c8d5e8;line-height:1.25}",
    ".caption-cue{position:absolute;left:" + (landscape ? "8%" : "20%") + ";right:" + (landscape ? "8%" : "20%") + ";bottom:" + (landscape ? "9%" : "18%") + ";display:flex;justify-content:center;align-items:center;text-align:center;z-index:60}",
    ".caption-line{display:inline-block;padding:14px 22px;border-radius:16px;background:rgba(4,8,15,.84);border:1px solid rgba(255,255,255,.12);font-size:" + (landscape ? "30px" : "42px") + ";line-height:1.14;font-weight:900;letter-spacing:-.025em;text-shadow:0 2px 12px rgba(0,0,0,.6);max-width:100%;text-wrap:balance}",
    ".caption-word{display:inline-block;opacity:0;margin-right:.14em;color:#fff}.caption-word:last-child{margin-right:0}",
    ".vetor-brand{position:absolute;left:" + (landscape ? "6%" : "10%") + ";top:" + (landscape ? "6%" : "15%") + ";z-index:80;font-size:20px;font-weight:900;letter-spacing:.14em;color:#fff}.vetor-brand span{color:#4285f4}",
    ".vetor-outro{position:absolute;left:" + (landscape ? "8%" : "20%") + ";right:" + (landscape ? "8%" : "20%") + ";bottom:" + (landscape ? "16%" : "20%") + ";padding:34px 38px;border:1px solid rgba(113,166,255,.38);border-radius:30px;background:linear-gradient(130deg,rgba(7,14,28,.96),rgba(17,35,67,.94));display:flex;flex-direction:column;gap:18px;box-shadow:0 30px 90px rgba(0,0,0,.5);z-index:70}",
    ".outro-mark{font-size:25px;font-weight:950;letter-spacing:.16em;color:#fff}.outro-mark span{color:#4285f4}.vetor-outro strong{font-size:42px;line-height:1.08;letter-spacing:-.035em}.outro-note{font-size:18px;color:#9fb2cf;letter-spacing:.04em}",
    ".progress-track{position:absolute;left:" + (landscape ? "0" : "20%") + ";right:" + (landscape ? "0" : "20%") + ";bottom:" + (landscape ? "0" : "15%") + ";height:7px;background:rgba(255,255,255,.15);z-index:90}.progress-bar{height:100%;width:100%;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,#1428a0,#4285f4,#8dc4ff)}",
    ".duration-marker{position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none}",
    (comparison ? ".scene-label{border-color:rgba(115,169,255,.28)}" : ""), "</style></head><body>",
    '<div id="vetor-root" data-composition-id="vetor-video" data-start="0" data-width="' + width + '" data-height="' + height + '">',
    '<div class="ambient-orb"></div><div class="film-grain"></div><div class="vetor-brand">VETOR<span>.</span>BLOG</div>',
    layers.join("\n"), intro, captionLayers.join("\n"), outro, marker, audio,
    '<div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div></div>',
    '<script src="./assets/gsap.min.js"></script><script>(function(){',
    'var tl=gsap.timeline({paused:true});',
    'tl.fromTo(".ambient-orb",{opacity:.18,scale:.8},{opacity:.75,scale:1.18,duration:Math.min(3,' + duration + '),ease:"sine.out"},0);',
    'tl.fromTo("#hero-title",{opacity:0,y:42,scale:.98},{opacity:1,y:0,scale:1,duration:.55,ease:"power3.out"},0);',
    animations.join("\n"), captionAnimations.join("\n"),
    'tl.fromTo("#vetor-outro",{opacity:0,y:36,scale:.985},{opacity:1,y:0,scale:1,duration:.55,ease:"power3.out"},' + outroStart + ');',
    'tl.to("#progress-bar",{scaleX:1,duration:' + duration + ',ease:"none"},0);',
    'window.__timelines=window.__timelines||{};window.__timelines["vetor-video"]=tl;',
    '})();</script></body></html>'
  ];
  return html.join("\n");
}
