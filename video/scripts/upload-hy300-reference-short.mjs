import fs from 'node:fs';
import {google} from 'googleapis';

const SITE=(process.env.VETOR_SITE_URL||'https://www.vetor.blog').replace(/\/$/,'');
const SECRET=process.env.CRON_SECRET;
const FILE=process.env.VIDEO_PATH||'./out/hy300-reference-short.mp4';

async function productionApi(action){
 if(!SECRET) throw new Error('CRON_SECRET ausente; upload recusado.');
 const response=await fetch(SITE+'/api/cron/video-queue-worker/',{
  method:'POST',
  headers:{Authorization:'Bearer '+SECRET,'Content-Type':'application/json'},
  body:JSON.stringify({action}),
  signal:AbortSignal.timeout(30000),
 });
 const body=await response.json().catch(()=>({}));
 if(!response.ok||body.success!==true) throw new Error('Production API HTTP '+response.status+': '+(body.error||'sem detalhe'));
 return body;
}

async function main(){
 if(!fs.existsSync(FILE)||fs.statSync(FILE).size<300000) throw new Error('MP4 do piloto ausente/inválido.');
 const auth=await productionApi('youtubeOAuthCheck');
 if(auth.authorized!==true||auth.credentialSource!=='vercel-production') throw new Error('OAuth Production não confirmado; upload recusado.');
 const token=await productionApi('youtubeAccessToken');
 if(typeof token.accessToken!=='string'||!token.accessToken) throw new Error('Access token Production ausente.');
 const client=new google.auth.OAuth2();
 client.setCredentials({access_token:token.accessToken});
 const youtube=google.youtube({version:'v3',auth:client});
 const title='Mini projetor HY300 promete 4K? A ficha revela o detalhe #Shorts';
 const description=[
  'O HY300 chama atenção pela promessa de 4K, mas a ficha da oferta consultada informa resolução nativa de 1024 × 768 pixels.',
  '',
  'Aceitar sinal 4K não significa projetar em 4K nativo. As especificações podem variar por vendedor e versão; confira o anúncio exato antes de comprar.',
  '',
  'Mais análises: https://www.vetor.blog',
  '',
  'Imagens do produto: fotografia da oferta consultada no Mercado Livre. Vídeo editorial independente.'
 ].join('\n');
 console.log('[YOUTUBE_OAUTH] Token obtido via Vercel Production.');
 const uploaded=await youtube.videos.insert({
  part:['snippet','status'],
  requestBody:{
   snippet:{title,description,tags:['HY300','mini projetor','projetor 4K','projetor portátil','tecnologia','review','Vetor Blog'],categoryId:'28',defaultLanguage:'pt',defaultAudioLanguage:'pt'},
   status:{privacyStatus:'public',selfDeclaredMadeForKids:false},
  },
  media:{body:fs.createReadStream(FILE)},
 });
 const videoId=uploaded.data.id;
 if(!videoId) throw new Error('YouTube não retornou ID do vídeo.');
 let confirmed=null;
 for(let attempt=0;attempt<6;attempt++){
  const check=await youtube.videos.list({part:['id','status'],id:[videoId]});
  confirmed=(check.data.items||[]).find(v=>v.id===videoId&&v.status?.privacyStatus==='public')||null;
  if(confirmed) break;
  if(attempt<5) await new Promise(resolve=>setTimeout(resolve,4000));
 }
 if(!confirmed) throw new Error('Upload recebido, mas o status público ainda não foi confirmado. Video ID: '+videoId);
 console.log('[YOUTUBE_PUBLISHED] '+videoId);
 console.log('[YOUTUBE_URL] https://www.youtube.com/watch?v='+videoId);
}

main().catch(error=>{console.error('[YOUTUBE_PUBLISH_FAILED]',error instanceof Error?error.stack:String(error));process.exitCode=1;});
