import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCompositionHtml } from "./library.mjs";

const MODULE_DIR=path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR=path.resolve(MODULE_DIR,"..");
const REPO_ROOT=path.resolve(VIDEO_DIR,"..");

function run(command,args,cwd,timeoutMs){
  return new Promise(function(resolve,reject){
    const child=spawn(command,args,{cwd:cwd,env:{...process.env,HYPERFRAMES_NO_UPDATE_CHECK:"1",CI:"true"},stdio:["ignore","pipe","pipe"],windowsHide:true,signal:AbortSignal.timeout(timeoutMs)});
    let output="";
    child.stdout.on("data",function(chunk){const value=chunk.toString();process.stdout.write(value);output=(output+value).slice(-24000);});
    child.stderr.on("data",function(chunk){const value=chunk.toString();process.stderr.write(value);output=(output+value).slice(-24000);});
    child.once("error",function(error){reject(Object.assign(new Error("Não foi possível iniciar "+command+": "+error.message),{cause:error,code:error.code,output:output}));});
    child.once("close",function(code,signal){if(code===0)resolve({output:output,code:code});else reject(new Error(command+" encerrou com exit="+code+" signal="+(signal||"none")+". "+output));});
  });
}

async function runCli(args,cwd,timeoutMs){
  const binary=process.env.HYPERFRAMES_BIN||"hyperframes";
  try{return await run(binary,args,cwd,timeoutMs);}
  catch(error){if(error&&error.code==="ENOENT")return run("npx",["--yes","hyperframes@0.9.2",...args],cwd,timeoutMs);throw error;}
}

function copyAsset(value,destination,label){
  const relative=String(value||"").replace(/^\/+/,"");
  if(!relative)return null;
  const publicRoot=path.resolve(VIDEO_DIR,"public");
  const source=path.resolve(publicRoot,relative);
  if(!source.startsWith(publicRoot+path.sep)||!fs.existsSync(source)||!fs.statSync(source).isFile())throw new Error("[HYPERFRAMES_ASSET] "+label+" não existe em video/public: "+relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(source,destination);
  return destination;
}

function probe(outputPath){
  return new Promise(function(resolve,reject){
    const child=spawn("ffprobe",["-v","error","-show_entries","format=duration:stream=codec_type,codec_name,width,height","-of","json",outputPath],{stdio:["ignore","pipe","pipe"],windowsHide:true});
    let stdout="",stderr="";
    child.stdout.on("data",chunk=>stdout+=chunk.toString());
    child.stderr.on("data",chunk=>stderr+=chunk.toString());
    child.once("error",reject);
    child.once("close",code=>{if(code!==0)return reject(new Error("ffprobe falhou: "+stderr.slice(-2000)));try{resolve(JSON.parse(stdout));}catch(error){reject(error);}});
  });
}

export async function renderWithHyperFrames(videoData,outputPath,options){
  const settings=options||{};
  const rawId=String(videoData&&videoData.id||path.basename(outputPath,path.extname(outputPath)));
  const id=rawId.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,64)||"video";
  const outputDir=path.dirname(path.resolve(outputPath));
  const projectDir=path.join(outputDir,"hyperframes-"+id);
  const assetsDir=path.join(projectDir,"assets");
  const fps=Math.max(1,Number(videoData&&videoData.fps)||30);

  if(!settings.allowSilentAudio&&!(videoData&&videoData.audioUrl))throw new Error("[HYPERFRAMES_AUDIO] Narração ausente; renderização bloqueada.");
  fs.rmSync(projectDir,{recursive:true,force:true});
  fs.mkdirSync(assetsDir,{recursive:true});
  fs.mkdirSync(outputDir,{recursive:true});

  const audio=videoData&&videoData.audioUrl
    ?copyAsset(videoData.audioUrl,path.join(assetsDir,"narration"+(path.extname(videoData.audioUrl)||".mp3")),"narração")
    :null;
  const productImages=(Array.isArray(videoData&&videoData.productImages)?videoData.productImages:[]).map(function(source,index){
    const ext=path.extname(String(source||""))||".jpg";
    const copied=copyAsset(source,path.join(assetsDir,"product-"+index+ext),"imagem de produto "+index);
    return copied?"assets/"+path.basename(copied):"";
  });
  const brollVideos=(Array.isArray(videoData&&videoData.brollVideos)?videoData.brollVideos:[]).map(function(source,index){
    if(!source)return "";
    const ext=path.extname(String(source||""))||".mp4";
    const copied=copyAsset(source,path.join(assetsDir,"broll-"+index+ext),"B-roll "+index);
    return copied?"assets/"+path.basename(copied):"";
  });

  const gsapCandidates=[
    path.join(REPO_ROOT,"node_modules","gsap","dist","gsap.min.js"),
    path.join(VIDEO_DIR,"node_modules","gsap","dist","gsap.min.js")
  ];
  const gsapSource=gsapCandidates.find(candidate=>fs.existsSync(candidate));
  if(!gsapSource)throw new Error("[HYPERFRAMES_GSAP] GSAP local não encontrado; execute npm ci na raiz.");
  fs.copyFileSync(gsapSource,path.join(assetsDir,"gsap.min.js"));

  const html=buildCompositionHtml(videoData,{
    assets:{
      audio:audio?"assets/"+path.basename(audio):"",
      productImages:productImages,
      brollVideos:brollVideos
    }
  });
  fs.writeFileSync(path.join(projectDir,"index.html"),html,"utf8");
  fs.writeFileSync(path.join(projectDir,"hyperframes.json"),JSON.stringify({
    "$schema":"https://hyperframes.app/schemas/project.json",
    "name":"vetor-"+id,
    "version":"1.0.0",
    "compositions":["index.html"]
  },null,2),"utf8");

  try{
    await runCli(["lint"],projectDir,120000);
    const absoluteOutput=path.resolve(outputPath);
    if(fs.existsSync(absoluteOutput))fs.unlinkSync(absoluteOutput);
    await runCli([
      "render","--output",absoluteOutput,
      "--fps",String(fps),
      "--quality",process.env.HYPERFRAMES_QUALITY||"high",
      "--workers",process.env.HYPERFRAMES_WORKERS||"2"
    ],projectDir,Number(process.env.HYPERFRAMES_RENDER_TIMEOUT_MS)||2700000);
    if(!fs.existsSync(absoluteOutput)||fs.statSync(absoluteOutput).size<10000)throw new Error("[HYPERFRAMES_OUTPUT] MP4 ausente ou pequeno demais.");
    const media=await probe(absoluteOutput);
    const duration=Number(media.format&&media.format.duration);
    const stream=Array.isArray(media.streams)?media.streams.find(item=>item.codec_type==="video"):null;
    const width=Number(stream&&stream.width||0);
    const height=Number(stream&&stream.height||0);
    const landscape=videoData&&videoData.type==="long";
    if(!Number.isFinite(duration)||duration<=0||!stream||!stream.codec_name||width<=0||height<=0||
      (landscape&&width<=height)||(!landscape&&width>=height)){
      throw new Error("[HYPERFRAMES_OUTPUT] ffprobe rejeitou duração, codec, resolução ou orientação.");
    }
    console.log("[HYPERFRAMES_RENDER_PASS] duration="+duration.toFixed(2)+"s resolution="+width+"x"+height+" codec="+stream.codec_name);
    if(settings.cleanupOnSuccess!==false)fs.rmSync(projectDir,{recursive:true,force:true});
    return {outputPath:absoluteOutput,duration:duration,width:width,height:height,engine:"hyperframes"};
  }catch(error){
    console.error("[HYPERFRAMES_RENDER_FAILED] Projeto preservado em "+projectDir);
    throw error;
  }
}
