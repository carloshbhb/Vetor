import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const outDir = resolve("artifacts");
const audioPath = resolve("public/audio/vetor-10-style-pilot.mp3");
const videoPath = resolve(outDir, "vetor-10-estilos-motion-pilot.mp4");
mkdirSync(outDir, { recursive: true });
mkdirSync(resolve("public/audio"), { recursive: true });

const narration = [
  "Este é o Vetor Motion Lab. Dez direções visuais para transformar reviews de produtos em vídeos mais interessantes.",
  "Premium Product 3D. Uma apresentação de impacto, com profundidade, luz e foco no design.",
  "Exploded Teardown. Camadas e detalhes para explicar como o produto é construído.",
  "Hologram HUD. Especificações aparecem como informação visual, sem interromper o ritmo.",
  "Kinetic Typography. Palavras-chave ganham movimento e reforçam a mensagem da narração.",
  "Isometric Explainer. Perspectiva e diagramas ajudam a explicar conexões e formas de uso.",
  "Cinematic 2D. Camadas, luz e parallax criam uma narrativa visual com personalidade.",
  "Lifestyle Demo. O produto entra em cenas que representam estudo, entretenimento e rotina.",
  "Data Storytelling. Números e características viram uma história fácil de acompanhar.",
  "Comparison Arena. Uma linguagem de duelo ajuda a organizar critérios e orientar a decisão.",
  "Editorial Luxury. Menos elementos, mais espaço e atenção aos detalhes do produto.",
  "Esses são os dez estilos iniciais do Vetor. O próximo passo é comparar a qualidade e escolher quais merecem evoluir para a produção."
].join(" ");

execFileSync("python", [
  "-m", "edge_tts",
  "--voice", "pt-BR-FranciscaNeural",
  "--rate", "+5%",
  "--text", narration,
  "--write-media", audioPath,
], { stdio: "inherit" });

execFileSync("npx", [
  "remotion", "render", "src/Root.tsx", "TemplateShowcase", videoPath,
  "--codec=h264", "--crf=18", "--log=error",
], { stdio: "inherit" });

const bytes = statSync(videoPath).size;
if (bytes < 500_000) throw new Error(`Rendered pilot is unexpectedly small: ${bytes} bytes`);
console.log(`[template-showcase] Rendered ${videoPath} (${bytes} bytes). No publishing step was invoked.`);
