import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { renderWithHyperFrames } from "./render-video.mjs";

const directory=fs.mkdtempSync(path.join(os.tmpdir(),"vetor-hyperframes-smoke-"));
const output=path.join(directory,"smoke.mp4");
try{
  const result=await renderWithHyperFrames({
    id:"smoke",
    type:"short",
    title:"Vetor HyperFrames",
    category:"Tecnologia",
    hook:"Composição profissional automatizada",
    hookDuration:.9,
    scenes:[{id:1,text:"Cena de validação estrutural do motor de vídeo.",visualCue:"Teste de composição",startFrame:27,endFrame:54}],
    subtitleEntries:[{start:.1,end:.8,text:"Vetor HyperFrames"}],
    callToAction:"Renderização validada.",
    totalDuration:2,
    fps:30
  },output,{allowSilentAudio:true,cleanupOnSuccess:true});
  if(!result||result.width!==1080||result.height!==1920||result.duration<1)throw new Error("Smoke render retornou metadados inesperados.");
  console.log("[HYPERFRAMES_SMOKE_PASS] "+result.width+"x"+result.height+" "+result.duration.toFixed(2)+"s");
  // Exercise the same pixel-level gate used before YouTube uploads; a template-string
  // assertion alone cannot catch gradients/decoration entering Shorts overlay zones.
  execFileSync("npx", ["--yes", "remotion-qa@0.1.3", "safezone", output, "--channel", "yt-shorts"], {
    stdio: "inherit",
    timeout: 180000,
  });
  console.log("[HYPERFRAMES_SAFEZONE_PASS] yt-shorts pixel-level safe-zone check passed.");
}finally{
  fs.rmSync(directory,{recursive:true,force:true});
}
