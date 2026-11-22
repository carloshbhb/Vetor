import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const audioPath = resolve("public/audio/vetor-mixed-creative-pilot.mp3");
const outputPath = resolve("artifacts/vetor-piloto-direcao-criativa-mista.mp4");
mkdirSync(resolve("public/audio"), { recursive: true });
mkdirSync(resolve("artifacts"), { recursive: true });

const narration = [
  "Esse tablet combina com a sua rotina? Antes da ficha técnica, a apresentação precisa conquistar o olhar.",
  "O close aproxima o produto. Luz de recorte e macro ajudam a destacar o acabamento, sem esconder o que importa.",
  "As camadas da apresentação se separam para explicar a experiência visual. Esta animação é ilustrativa, não representa peças internas do aparelho.",
  "Uma ficha técnica ganha força quando cada característica aparece ligada a uma pergunta real de compra.",
  "O contexto de uso muda a história. Um bom vídeo traduz estudo, entretenimento e trabalho em cenas fáceis de reconhecer.",
  "Credibilidade também é mostrar limites, compatibilidade e o que precisa ser conferido na versão exata do anúncio.",
  "A comparação fica mais útil quando coloca os critérios lado a lado e deixa a escolha depender do perfil de cada pessoa.",
  "No fim, um veredito objetivo conecta os pontos fortes, as ressalvas e o tipo de uso que faz sentido.",
  "Um produto, várias linguagens e uma história coesa. Este é o piloto do novo diretor visual do Vetor."
].join(" ");

execFileSync("python", [
  "-m", "edge_tts",
  "--voice", "pt-BR-FranciscaNeural",
  "--rate", "+5%",
  "--text", narration,
  "--write-media", audioPath,
], { stdio: "inherit" });

execFileSync("npx", [
  "remotion", "render", "src/Root.tsx", "MixedCreativePilot", outputPath,
  "--codec=h264", "--crf=18", "--log=error",
], { stdio: "inherit" });

const bytes = statSync(outputPath).size;
if (bytes < 750_000) throw new Error(`Mixed creative pilot is unexpectedly small: ${bytes} bytes`);
console.log(`[mixed-creative-pilot] Rendered ${outputPath} (${bytes} bytes). No YouTube publishing was invoked.`);
