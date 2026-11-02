import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const PROJECT=path.resolve(HERE,"catalog-workspace");
const BINARY=process.env.HYPERFRAMES_BIN||"hyperframes";
const ITEMS=["logo-outro","data-chart","app-showcase","flash-through-white","transitions-radial","grain-overlay"];

function exec(args,cwd){
  return new Promise(function(resolve,reject){
    const child=spawn(BINARY,args,{cwd:cwd,stdio:"inherit",windowsHide:true,env:{...process.env,HYPERFRAMES_NO_UPDATE_CHECK:"1"}});
    child.once("error",function(error){
      if(error.code==="ENOENT")reject(new Error("HyperFrames CLI não encontrado. Instale com npm install --global hyperframes@0.9.2."));
      else reject(error);
    });
    child.once("close",function(code){
      if(code===0)resolve();
      else reject(new Error("hyperframes "+args.join(" ")+" encerrou com exit="+code));
    });
  });
}
fs.rmSync(PROJECT,{recursive:true,force:true});
fs.mkdirSync(path.dirname(PROJECT),{recursive:true});
await exec(["init",PROJECT,"--example","blank","--skip-skills"],process.cwd());
for(const item of ITEMS)await exec(["add",item,"--dir",PROJECT,"--no-clipboard"],process.cwd());
console.log("[HYPERFRAMES_CATALOG_INSTALLED] "+ITEMS.join(", "));
console.log("Workspace local: "+PROJECT);
