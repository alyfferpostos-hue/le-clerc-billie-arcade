import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const PORT=Number(process.env.PORT||3000),W=800,H=480;
const rooms=new Map();
const games=['pong','dodge','coins','snake'];
const events=['turbo','slow','reverse','giant','none'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rand=(a,b)=>a+Math.random()*(b-a);
const server=http.createServer((req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end();return;}
 if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return;}
 let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
 const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 const types={'.png':'image/png','.webp':'image/webp','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
});
const wss=new WebSocketServer({server,maxPayload:2048});
function send(ws,obj){if(ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<100000)ws.send(JSON.stringify(obj));}
function broadcast(r,obj){for(const p of r.players)if(p)send(p.ws,obj);}
function players(r){return r.players.map(p=>p?.name||null);}
function makeRoom(mode='party',chosenGame='pong'){let code;do{code=String(Math.floor(rand(100000,999999)));}while(rooms.has(code));const r={code,players:Array(4).fill(null),host:0,phase:'lobby',mode:mode==='free'?'free':'party',chosenGame:games.includes(chosenGame)?chosenGame:'pong',round:0,total:mode==='free'?1:10,roundTime:0,score:[0,0,0,0],teamScore:[0,0],game:null,event:null,eventTime:0,gameState:null,updated:Date.now(),last:performance.now(),pending:false};rooms.set(code,r);return r;}
function info(r){return {type:'state',code:r.code,players:players(r),host:r.host,phase:r.phase,mode:r.mode,chosenGame:r.chosenGame,round:r.round,total:r.total,roundTime:Math.max(0,Math.ceil(r.roundTime)),score:r.score,teamScore:r.teamScore,game:r.game,event:r.event,eventTime:Math.ceil(Math.max(0,r.eventTime)),world:r.gameState&&serialize(r)};}
function serialize(r){const g=r.gameState;if(r.game==='pong')return {paddles:g.paddles,ball:g.ball,points:g.points};if(r.game==='dodge')return {actors:g.actors,rocks:g.rocks};if(r.game==='coins')return {actors:g.actors,coins:g.coins};if(r.game==='snake')return {snakes:g.snakes,food:g.food};return null;}
function notice(r,msg){broadcast(r,{type:'notice',message:msg});}
function leave(ws){const r=ws.room;if(!r)return;const i=ws.slot;if(r.players[i]?.ws===ws)r.players[i]=null;ws.room=null;ws.slot=-1;r.updated=Date.now();if(r.players.every(p=>!p)){rooms.delete(r.code);return;}if(i===r.host)r.host=r.players.findIndex(Boolean);if(r.phase==='playing'){r.phase='lobby';r.gameState=null;notice(r,'Um jogador saiu. Campeonato pausado; o anfitrião pode reiniciar.');}broadcast(r,info(r));}
function join(ws,r,name){const i=r.players.findIndex(p=>!p);if(i<0){send(ws,{type:'error',message:'Sala cheia (4 jogadores).'});return;}if(r.phase==='playing'){send(ws,{type:'error',message:'Aguarde o fim da rodada para entrar.'});return;}leave(ws);ws.room=r;ws.slot=i;r.players[i]={ws,name:String(name||'Jogador').trim().slice(0,18)||'Jogador',dir:0,dx:0,dy:0};r.updated=Date.now();send(ws,{type:'joined',code:r.code,slot:i});broadcast(r,info(r));}
function resetBall(g,dir=1){g.ball={x:W/2,y:H/2,vx:dir*rand(230,285),vy:rand(-140,140)};g.pause=0.7;}
function initGame(r){const n=r.players.length;const isTeam=r.round%2===0;r.game=r.mode==='free'?r.chosenGame:games[(r.round-1)%games.length];r.event=null;r.eventTime=0;r.eventClock=7;r.roundTime=r.mode==='free'?60:45;r.phase='playing';r.isTeam=isTeam;
 if(r.game==='pong'){r.gameState={paddles:[H/2,H/2],ball:null,points:[0,0],pause:0};resetBall(r.gameState);}
 else if(r.game==='dodge'){r.gameState={actors:Array.from({length:n},(_,i)=>({x:120+i*185,y:390,alive:!!r.players[i],points:0})),rocks:[],spawn:0};}
 else if(r.game==='coins'){r.gameState={actors:Array.from({length:n},(_,i)=>({x:110+i*190,y:220,points:0})),coins:Array.from({length:8},()=>({x:rand(35,765),y:rand(40,440)}))};}
 else {r.gameState={snakes:Array.from({length:n},(_,i)=>({body:[{x:5+i*7,y:5+i*4}],dir:{x:1,y:0},alive:!!r.players[i],points:0})),food:{x:rand(1,38)|0,y:rand(1,22)|0},step:0};}
 notice(r,`RODADA ${r.round}/${r.total} • ${r.game.toUpperCase()} • ${isTeam?'DUPLAS 2x2':'CADA UM POR SI'}!`);broadcast(r,info(r));}
function award(r){const g=r.gameState;let pts=[0,0,0,0];if(r.game==='pong'){const left=g.points[0],right=g.points[1];pts=[left*10,right*10,left*10,right*10];}
 else if(r.game==='dodge')pts=g.actors.map(a=>Math.floor(a.points));
 else if(r.game==='coins')pts=g.actors.map(a=>a.points*10);
 else pts=g.snakes.map(a=>a.points*15+(a.alive?20:0));
 for(let i=0;i<4;i++){if(!r.players[i])continue;let add=pts[i];if(r.isTeam){const team=i%2;const mate=(i+2)%4;add=Math.floor((pts[i]+pts[mate])/2);}r.score[i]+=add;r.teamScore[i%2]+=add;}
 r.phase=r.round>=r.total?'finished':'between';r.gameState=null;r.event=null;notice(r,r.phase==='finished'?'🏆 CAMPEONATO ENCERRADO! Confira o placar.':'Rodada encerrada! Anfitrião: iniciar próxima rodada.');broadcast(r,info(r));}
function start(r){if(r.mode==='party'&&r.players.filter(Boolean).length<2){notice(r,'É necessário pelo menos 2 jogadores para o Modo Festa.');return;}if(r.phase==='lobby'||r.phase==='finished'){r.round=0;r.score=[0,0,0,0];r.teamScore=[0,0];}if(r.round>=r.total)r.round=0;r.round++;initGame(r);}
function applyInput(p,dir,dx,dy){p.dir=dir===-1?-1:dir===1?1:0;p.dx=clamp(Number(dx)||0,-1,1);p.dy=clamp(Number(dy)||0,-1,1);}
wss.on('connection',ws=>{ws.isAlive=true;ws.slot=-1;ws.on('pong',()=>ws.isAlive=true);ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;
 if(m.type==='create')join(ws,makeRoom(m.mode,m.game),m.name);
 else if(m.type==='join'){const r=rooms.get(String(m.code||'').trim());if(!r){send(ws,{type:'error',message:'Sala não encontrada.'});return;}join(ws,r,m.name);}
 else if(m.type==='input'&&ws.room){const p=ws.room.players[ws.slot];if(p?.ws===ws)applyInput(p,m.dir,m.dx,m.dy);}
 else if(m.type==='start'&&ws.room&&ws.slot===ws.room.host&&ws.room.phase!=='playing')start(ws.room);
 else if(m.type==='leave')leave(ws);
 });ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));});
function update(r,dt){if(r.phase!=='playing')return;r.roundTime-=dt;if(r.roundTime<=0){award(r);return;}
 r.eventClock-=dt;if(r.eventTime>0){r.eventTime-=dt;if(r.eventTime<=0)r.event=null;}
 if(r.eventClock<=0){r.eventClock=rand(8,13);r.event=events[Math.floor(rand(0,events.length))];r.eventTime=5;if(r.event!=='none')notice(r,'⚡ CAOS: '+({turbo:'TURBO',slow:'CÂMERA LENTA',reverse:'CONTROLES INVERTIDOS',giant:'BOLA / OBSTÁCULOS GIGANTES'}[r.event]));}
 const speed=r.event==='turbo'?1.6:r.event==='slow'?.65:1;const invert=r.event==='reverse'?-1:1;const g=r.gameState;
 if(r.game==='pong'){
  if(r.mode==='free'&&!r.players[1]&&!r.players[3]){const target=g.ball.y;g.paddles[1]=clamp(g.paddles[1]+clamp(target-g.paddles[1],-240*dt,240*dt),42,438);}
  for(let side=0;side<2;side++){const a=r.players[side],b=r.players[side+2];if(side===1&&r.mode==='free'&&!a&&!b)continue;const v=((a?.dir||0)+(b?.dir||0))/((a&&b)?2:1);g.paddles[side]=clamp(g.paddles[side]+v*invert*390*speed*dt,42,438);}
  if(g.pause>0){g.pause-=dt;return;}const b=g.ball;b.x+=b.vx*dt*speed;b.y+=b.vy*dt*speed;if(b.y<9||b.y>471){b.y=clamp(b.y,9,471);b.vy*=-1;}
  const size=r.event==='giant'?15:9;
  for(let i=0;i<2;i++){const px=i===0?32:756;if((i===0?b.vx<0:b.vx>0)&&b.x+size>=px&&b.x-size<=px+12&&Math.abs(b.y-g.paddles[i])<51){b.x=i===0?px+12+size:px-size;const offset=(b.y-g.paddles[i])/50;b.vx=(i===0?1:-1)*Math.min(570,Math.abs(b.vx)*1.045);b.vy=offset*270;}}
  if(b.x<0||b.x>800){const side=b.x<0?1:0;g.points[side]++;resetBall(g,side===0?-1:1);if(g.points[side]>=7)award(r);}
 }else if(r.game==='dodge'){
  for(let i=0;i<4;i++){const a=g.actors[i],p=r.players[i];if(!a.alive||!p)continue;a.x=clamp(a.x+p.dx*invert*250*speed*dt,15,785);a.y=clamp(a.y+p.dy*invert*250*speed*dt,15,465);a.points+=dt*2;}
  g.spawn-=dt;if(g.spawn<=0){g.spawn=.25;g.rocks.push({x:rand(12,788),y:-15,v:rand(180,340)*(r.event==='turbo'?1.3:1),size:r.event==='giant'?23:13});}for(const rock of g.rocks){rock.y+=rock.v*dt;for(const a of g.actors)if(a.alive&&Math.hypot(a.x-rock.x,a.y-rock.y)<rock.size+12)a.alive=false;}g.rocks=g.rocks.filter(b=>b.y<500);if(g.actors.filter((a,i)=>r.players[i]&&a.alive).length===0&&r.roundTime<42)award(r);
 }else if(r.game==='coins'){
  for(let i=0;i<4;i++){const a=g.actors[i],p=r.players[i];if(!p)continue;a.x=clamp(a.x+p.dx*invert*245*speed*dt,14,786);a.y=clamp(a.y+p.dy*invert*245*speed*dt,14,466);for(const c of g.coins)if(Math.hypot(a.x-c.x,a.y-c.y)<22){a.points++;c.x=rand(25,775);c.y=rand(25,455);}}
 }else if(r.game==='snake'){
  g.step+=dt*speed;if(g.step<.13)return;g.step=0;
  for(let i=0;i<4;i++){const s=g.snakes[i],p=r.players[i];if(!s.alive||!p)continue;let dx=Math.sign(p.dx),dy=Math.sign(p.dy);if(Math.abs(p.dx)>Math.abs(p.dy))dy=0;else if(dy)dx=0;if(dx||dy){dx*=invert;dy*=invert;if(!(dx===-s.dir.x&&dy===-s.dir.y))s.dir={x:dx,y:dy};}const head={x:s.body[0].x+s.dir.x,y:s.body[0].y+s.dir.y};if(head.x<0||head.x>=40||head.y<0||head.y>=24||g.snakes.some(t=>t.body.some(b=>b.x===head.x&&b.y===head.y))){s.alive=false;continue;}s.body.unshift(head);if(head.x===g.food.x&&head.y===g.food.y){s.points++;g.food={x:rand(0,40)|0,y:rand(0,24)|0};}else s.body.pop();}
  if(g.snakes.filter((s,i)=>r.players[i]&&s.alive).length===0&&r.roundTime<42)award(r);
 }
}
let last=performance.now();const timer=setInterval(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;for(const r of rooms.values())update(r,dt);},1000/60);
const publish=setInterval(()=>{for(const r of rooms.values())if(r.players.some(Boolean))broadcast(r,info(r));},1000/25);
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}for(const r of rooms.values())if(!r.players.some(Boolean)&&Date.now()-r.updated>60000)rooms.delete(r.code);},30000);
if(process.env.NODE_ENV!=='test')server.listen(PORT,'0.0.0.0',()=>console.log('LE CLERC BILLIE ARCADE 2.2 na porta '+PORT));
export {server,wss,rooms,makeRoom,update,start,applyInput};
