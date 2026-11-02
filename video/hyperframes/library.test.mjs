import assert from "node:assert/strict";
import { buildCompositionHtml, PROFESSIONAL_TEMPLATES, OFFICIAL_HYPERFRAMES_CATALOG } from "./library.mjs";

const fixture={
  id:"fixture",type:"short",templateId:"shorts-retention",title:"Produto de teste",
  category:"Tecnologia",hook:"Vale a pena escolher este produto?",hookDuration:3,
  scenes:[
    {id:1,text:"Confira o recurso principal antes de decidir.",visualCue:"Dado que importa",startFrame:90,endFrame:180},
    {id:2,text:"Compare as condições e limitações do anúncio.",visualCue:"Ponto de atenção",startFrame:180,endFrame:270}
  ],
  subtitleEntries:[{start:.2,end:1.2,text:"Vale a pena escolher?"}],
  callToAction:"Leia a análise completa no Vetor.blog.",totalDuration:9,fps:30
};
const html=buildCompositionHtml(fixture,{
  assets:{audio:"assets/narration.mp3",productImages:["assets/product-0.webp"],brollVideos:["assets/broll-0.mp4",""]}
});
assert.ok(html.includes('data-composition-id="vetor-video"'));
assert.ok(html.includes('data-width="1080"')&&html.includes('data-height="1920"'));
assert.ok(html.includes('data-track-index="100"'));
assert.ok(html.includes('src="./assets/gsap.min.js"'));
assert.ok(html.includes("caption-0-word-0"));
assert.ok(html.includes('window.__timelines["vetor-video"]'));
assert.ok(html.includes("VETOR")&&!html.includes("youtube.com"));
assert.ok(Object.keys(PROFESSIONAL_TEMPLATES).length>=4);
assert.ok(OFFICIAL_HYPERFRAMES_CATALOG.some(item=>item.id==="data-chart"));
assert.ok(OFFICIAL_HYPERFRAMES_CATALOG.some(item=>item.id==="grain-overlay"));
const escaped=buildCompositionHtml({...fixture,title:"<script>alert(1)</script>"},{assets:{}});
assert.ok(!escaped.includes("<title><script>alert(1)</script>"));
assert.ok(escaped.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
const landscape=buildCompositionHtml({...fixture,type:"long",templateId:"product-editorial"},{assets:{}});
assert.ok(landscape.includes('data-width="1920"')&&landscape.includes('data-height="1080"'));
assert.ok(landscape.includes(".scene-label{position:absolute;left:"+(landscape?"8%":"7%")+";top:"+(landscape?"16%":"19%")+";width:"+(landscape?"56%":"84%")+";"), "landscape template must use horizontal editorial geometry");
console.log("hyperframes professional library tests passed");
