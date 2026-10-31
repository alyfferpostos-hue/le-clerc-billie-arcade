import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const PORT=Number(process.env.PORT||3000);
const rooms=new Map();
const WIDTH=800, HEIGHT=480, PADDLE=84, PW=12, SPEED=390, BALL=9;
const server=http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch {res.writeHead(400);res.end();return;}
  if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!(file===root||file.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
});
const wss=new WebSocketServer({server,maxPayload:2048});
function send(ws,obj){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function broadcast(room,obj){for(const p of room.players)if(p)send(p.ws,obj);}
function state(room){return {type:'state',phase:room.phase,score:room.score,ball:room.ball,paddles:room.paddles,players:room.players.map(p=>p?.name||null)};}
function resetBall(room,direction=Math.random()<.5?-1:1){const angle=(Math.random()-.5)*.9;room.ball={x:WIDTH/2,y:HEIGHT/2,vx:direction*290*Math.cos(angle),vy:290*Math.sin(angle)};room.pause=0.8;}
function createRoom(){let code;do{code=String(Math.floor(100000+Math.random()*900000));}while(rooms.has(code));const room={code,players:[null,null],phase:'waiting',score:[0,0],paddles:[HEIGHT/2,HEIGHT/2],ball:null,pause:0,updated:Date.now()};resetBall(room);rooms.set(code,room);return room;}
function leave(ws){const r=ws.room;if(!r)return;const slot=ws.slot;if(r.players[slot]?.ws===ws)r.players[slot]=null;ws.room=null;if(r.players.every(p=>!p)){rooms.delete(r.code);return;}r.phase='waiting';r.score=[0,0];resetBall(r);broadcast(r,{type:'notice',message:'O outro jogador saiu. Aguardando novo adversário.'});broadcast(r,state(r));}
function join(ws,room,name){const slot=room.players.findIndex(p=>!p);if(slot<0){send(ws,{type:'error',message:'Esta sala está cheia.'});return;}leave(ws);ws.room=room;ws.slot=slot;room.players[slot]={ws,name:name.slice(0,18)||'Jogador',input:0};room.updated=Date.now();send(ws,{type:'joined',code:room.code,slot});if(room.players.every(Boolean)){room.phase='playing';room.score=[0,0];room.paddles=[HEIGHT/2,HEIGHT/2];resetBall(room);broadcast(room,{type:'notice',message:'Partida iniciada! Primeiro a marcar 7 vence.'});}broadcast(room,state(room));}
wss.on('connection',ws=>{
 ws.isAlive=true;ws.on('pong',()=>ws.isAlive=true);
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
 if(m.type==='create'){const r=createRoom();join(ws,r,typeof m.name==='string'?m.name:'Jogador');}
 else if(m.type==='join'){const code=String(m.code||'').trim();const r=rooms.get(code);if(!r){send(ws,{type:'error',message:'Sala não encontrada. Confira o código.'});return;}join(ws,r,typeof m.name==='string'?m.name:'Jogador');}
 else if(m.type==='input'&&ws.room){const p=ws.room.players[ws.slot];if(p?.ws===ws)p.input=m.dir===-1?-1:m.dir===1?1:0;}
 else if(m.type==='leave')leave(ws);
 else if(m.type==='rematch'&&ws.room){const r=ws.room;if(r.phase==='finished'&&r.players.every(Boolean)){r.phase='playing';r.score=[0,0];resetBall(r);broadcast(r,state(r));}}
 });ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));
});
let last=performance.now();const loop=setInterval(()=>{
 const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
 for(const r of rooms.values()){
  if(r.phase!=='playing')continue;
  for(let i=0;i<2;i++){const p=r.players[i];if(p)r.paddles[i]=Math.max(PADDLE/2,Math.min(HEIGHT-PADDLE/2,r.paddles[i]+p.input*SPEED*dt));}
  if(r.pause>0){r.pause-=dt;continue;}
  const b=r.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.y<=BALL){b.y=BALL;b.vy=Math.abs(b.vy);}if(b.y>=HEIGHT-BALL){b.y=HEIGHT-BALL;b.vy=-Math.abs(b.vy);}
  for(let i=0;i<2;i++){const px=i===0?32:WIDTH-32-PW;const approaching=i===0?b.vx<0:b.vx>0;
   if(approaching&&b.x+BALL>=px&&b.x-BALL<=px+PW&&Math.abs(b.y-r.paddles[i])<PADDLE/2+BALL){b.x=i===0?px+PW+BALL:px-BALL;const speed=Math.min(Math.hypot(b.vx,b.vy)*1.055,620);const offset=Math.max(-1,Math.min(1,(b.y-r.paddles[i])/(PADDLE/2)));const angle=offset*.95;b.vx=(i===0?1:-1)*speed*Math.cos(angle);b.vy=speed*Math.sin(angle);}
  }
  if(b.x< -BALL||b.x>WIDTH+BALL){const winner=b.x<0?1:0;r.score[winner]++;if(r.score[winner]>=7){r.phase='finished';broadcast(r,{type:'notice',message:`${r.players[winner]?.name||'Jogador'} venceu!`});}else resetBall(r,winner===0?-1:1);}
 }
},1000/60);
const publish=setInterval(()=>{for(const r of rooms.values())broadcast(r,state(r));},1000/25);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}for(const r of rooms.values())if(!r.players.some(Boolean)&&Date.now()-r.updated>60000)rooms.delete(r.code);},30000);
server.listen(PORT,'0.0.0.0',()=>console.log(`LE CLERC BILLIE ARCADE ouvindo na porta ${PORT}`));
export {server,wss,rooms,createRoom,resetBall};
