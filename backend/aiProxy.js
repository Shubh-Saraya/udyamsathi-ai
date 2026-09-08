import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateGeminiResponse, fallbackChatResponse } from './integrations/gemini.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
try{const env=await readFile(path.join(root,'.env'),'utf8');for(const line of env.split(/\r?\n/)){const found=line.match(/^([A-Z0-9_]+)=(.*)$/);if(found&&!process.env[found[1]])process.env[found[1]]=found[2].trim()}}catch{}

const upstreamPort=Number(process.env.AI_UPSTREAM_PORT||3100);
const publicPort=Number(process.env.PORT||3000);
process.env.PORT=String(upstreamPort);
await import('./server.js');

const body=request=>new Promise((resolve,reject)=>{let raw='';request.on('data',chunk=>raw+=chunk);request.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch(error){reject(error)}})});
const send=(response,value,status=200)=>{response.writeHead(status,{'content-type':'application/json'});response.end(JSON.stringify(value))};
const requestUpstream=(request,response,rawBody)=>new Promise(resolve=>{const proxy=http.request({hostname:'127.0.0.1',port:upstreamPort,path:request.url,method:request.method,headers:{...request.headers,host:`127.0.0.1:${upstreamPort}`,connection:'close',...(rawBody?{'content-length':Buffer.byteLength(rawBody)}:{})}},up=>{response.writeHead(up.statusCode||500,up.headers);up.pipe(response);up.on('end',resolve)});proxy.on('error',error=>{send(response,{error:error.message},502);resolve()});if(rawBody)proxy.write(rawBody);proxy.end()});

http.createServer(async(request,response)=>{
  try{
    if(request.url==='/api/chat'&&request.method==='POST'){
      const input=await body(request);
      const question=String(input.question||'').trim();
      if(!question)return send(response,{error:'Please enter a question.'},400);
      try{
        const result=await generateGeminiResponse({question,context:input.context||{},history:input.history||[]});
        return send(response,result);
      }catch(error){
<<<<<<< HEAD
=======
        console.error('Gemini error:',error.message);
>>>>>>> 353b2bb (Fix Gemini chatbot integration)
        return send(response,{enabled:false,provider:'local-fallback',text:fallbackChatResponse({question,context:input.context||{}}),warning:'Gemini was unavailable; using the local advisory fallback.'});
      }
    }
    let raw='';request.on('data',chunk=>raw+=chunk);request.on('end',()=>requestUpstream(request,response,raw));
  }catch(error){send(response,{error:error.message},400)}
}).listen(publicPort,()=>console.log(`VyaparGuide AI running at http://localhost:${publicPort}`));
