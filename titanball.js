(() => {
'use strict';

const canvas = document.getElementById('titanBallCanvas');
if (!canvas) return;
const ctx = canvas.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;

const scoreEl = document.getElementById('tbScore');
const yardsEl = document.getElementById('tbYards');
const highEl = document.getElementById('tbHigh');
const statusEl = document.getElementById('tbStatus');
const jumpBtn = document.getElementById('tbJump');
const smashBtn = document.getElementById('tbSmash');
const voltBtn = document.getElementById('tbVolt');

const W = canvas.width, H = canvas.height;
const GROUND = 420;

const ART = {};
const ART_FILES = {
  stadium:'assets/images/titanball92/stadium.png',
  dex:'assets/images/titanball92/Dex.PNG',
  dexRun:'assets/images/titanball92/dex-run.PNG',
  brute:'assets/images/titanball92/brute.PNG',
  mutant:'assets/images/titanball92/mutant.PNG',
  bobby:'assets/images/titanball92/bobby.png',
  skullJuice:'assets/images/titanball92/skull-juice.png',
  mutantLoops:'assets/images/titanball92/mutant-loops.png',
  touchdown:'assets/images/titanball92/touchdown.PNG',
  gameover:'assets/images/titanball92/gameover.png',
  lightning:'assets/images/titanball92/lightning.png'
};
for (const [key,src] of Object.entries(ART_FILES)){
  const img=new Image();
  img.src=src;
  ART[key]=img;
}
function artReady(key){ return ART[key] && ART[key].complete && ART[key].naturalWidth>0; }
function drawArt(key,x,y,w,h,alpha=1){
  if(!artReady(key)) return false;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.drawImage(
    ART[key],
    Math.round(x), Math.round(y),
    Math.round(w), Math.round(h)
  );
  ctx.restore();
  return true;
}
const SAVE_KEY = 'ttd-titanball92-highscore';

let audio = null;
function tone(freq=220, duration=.06, type='square', gain=.025){
  try{
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
    osc.connect(g); g.connect(audio.destination);
    osc.start(); osc.stop(audio.currentTime + duration);
  }catch(e){}
}
function noiseHit(){
  tone(78,.08,'sawtooth',.035);
  setTimeout(()=>tone(52,.07,'square',.022),26);
}

let high = Number(localStorage.getItem(SAVE_KEY) || 0);
highEl.textContent = pad(high);

const state = {
  mode:'title',
  score:0,
  yards:0,
  driveYards:0,
  drive:1,
  speed:300,
  hp:100,
  voltage:0,
  voltageTime:0,
  loopsTime:0,
  spawnTimer:0,
  pickupTimer:1.5,
  shake:0,
  flash:0,
  banner:'',
  bannerTime:0,
  time:0,
  last:performance.now(),
  particles:[],
  enemies:[],
  pickups:[],
  flags:[],
  stars:[],
  crowdOffset:0,
  fieldOffset:0,
  touchdownTime:0
};

const player = {
  x:175, y:GROUND-72, w:50, h:72,
  vy:0, onGround:true,
  smash:0, invuln:0,
  frame:0
};

for(let i=0;i<50;i++){
  state.stars.push({x:Math.random()*W,y:40+Math.random()*170,s:Math.random()*2+1});
}

function pad(n){ return Math.max(0,Math.floor(n)).toString().padStart(6,'0'); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function rand(a,b){ return a + Math.random()*(b-a); }

function resetGame(){
  state.mode='playing';
  state.score=0;
  state.yards=0;
  state.driveYards=0;
  state.drive=1;
  state.speed=300;
  state.hp=100;
  state.voltage=0;
  state.voltageTime=0;
  state.loopsTime=0;
  state.spawnTimer=.9;
  state.pickupTimer=2.4;
  state.shake=0;
  state.flash=0;
  state.banner='DRIVE 1 // TITAN BALL';
  state.bannerTime=1.4;
  state.time=0;
  state.enemies.length=0;
  state.pickups.length=0;
  state.flags.length=0;
  state.particles.length=0;
  player.y=GROUND-player.h;
  player.vy=0;
  player.onGround=true;
  player.smash=0;
  player.invuln=0;
  statusEl.textContent='LIVE';
  tone(196,.08,'square',.03);
  setTimeout(()=>tone(294,.08,'square',.03),70);
  setTimeout(()=>tone(392,.11,'square',.03),140);
}

function startOrRestart(){
  if(state.mode==='title' || state.mode==='gameover') resetGame();
}

function jump(){
  if(state.mode!=='playing'){ startOrRestart(); return; }
  if(player.onGround && state.touchdownTime<=0){
    player.vy=-720;
    player.onGround=false;
    tone(310,.055,'square',.025);
  }
}
function smash(){
  if(state.mode!=='playing'){ startOrRestart(); return; }
  if(player.smash<=0 && state.touchdownTime<=0){
    player.smash=.26;
    tone(95,.07,'square',.035);
  }
}
function voltage(){
  if(state.mode!=='playing'){ startOrRestart(); return; }
  if(state.voltage>=100 && state.voltageTime<=0){
    state.voltage=0;
    state.voltageTime=5;
    state.banner='â¡ VOLTAGE MODE â¡';
    state.bannerTime=1.2;
    state.flash=.35;
    state.shake=10;
    tone(420,.12,'sawtooth',.035);
    setTimeout(()=>tone(620,.13,'square',.035),100);
    setTimeout(()=>tone(820,.15,'square',.03),200);
  }
}

function bindPress(el, fn){
  if(!el) return;
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    el.classList.add('active');
    fn();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt =>
    el.addEventListener(evt,()=>el.classList.remove('active'))
  );
}
bindPress(jumpBtn,jump);
bindPress(smashBtn,smash);
bindPress(voltBtn,voltage);

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  startOrRestart();
});

window.addEventListener('keydown', e => {
  if(['Space','ArrowUp','KeyX','KeyV','Enter'].includes(e.code)) e.preventDefault();
  if(e.code==='Space' || e.code==='ArrowUp') jump();
  else if(e.code==='KeyX') smash();
  else if(e.code==='KeyV') voltage();
  else if(e.code==='Enter') startOrRestart();
});

function rects(a,b){
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

function spawnEnemy(){
  const roll=Math.random();
  let type='bruiser';
  if(state.drive>=2 && roll>.66) type='speedster';
  if(state.drive>=2 && roll>.86) type='ref';

  const data = {
    type, x:W+70, y:GROUND-64, w:48, h:64,
    dead:false, hit:false, phase:Math.random()*6.28
  };
  if(type==='bruiser'){data.w=58;data.h=70;data.y=GROUND-data.h;data.extra=0;}
  if(type==='speedster'){data.w=42;data.h=58;data.y=GROUND-data.h;data.extra=90;}
  if(type==='ref'){data.w=38;data.h=62;data.y=GROUND-data.h;data.extra=-25;data.throwAt=rand(480,650);data.thrown=false;}
  state.enemies.push(data);
}

function spawnPickup(){
  const airborne=Math.random()>.45;
  const type=Math.random()<.35?'mutantLoops':'skullJuice';
  state.pickups.push({
    type,
    x:W+60,y:airborne?GROUND-150:GROUND-45,
    w:type==='mutantLoops'?34:28,
    h:type==='mutantLoops'?42:36,
    spin:0
  });
}

function spawnFlag(ref){
  state.flags.push({x:ref.x,y:ref.y+12,w:22,h:16,vx:-390,vy:-240,rot:0});
  tone(700,.045,'square',.02);
}

function particles(x,y,color,count=10,power=1){
  for(let i=0;i<count;i++){
    state.particles.push({
      x,y,
      vx:rand(-190,190)*power,
      vy:rand(-260,-40)*power,
      life:rand(.25,.65),
      max:.65,
      size:rand(2,6),
      color
    });
  }
}

function damage(amount,msg){
  if(player.invuln>0 || state.voltageTime>0) return;
  state.hp-=amount;
  player.invuln=1;
  state.shake=12;
  state.flash=.18;
  state.banner=msg;
  state.bannerTime=.55;
  noiseHit();
  particles(player.x+25,player.y+35,'#ff2d95',14,1.25);
  if(state.hp<=0) gameOver();
}

function gameOver(){
  state.hp=0;
  state.mode='gameover';
  statusEl.textContent='GAME OVER';
  if(state.score>high){
    high=Math.floor(state.score);
    localStorage.setItem(SAVE_KEY,String(high));
    highEl.textContent=pad(high);
  }
  tone(150,.16,'sawtooth',.035);
  setTimeout(()=>tone(108,.22,'square',.03),160);
}

function touchdown(){
  state.touchdownTime=2.2;
  state.banner='TOUCHDOWN // +5000';
  state.bannerTime=1.8;
  state.score+=5000;
  state.voltage=clamp(state.voltage+30,0,100);
  state.flash=.35;
  state.shake=8;
  particles(760,260,'#ffe53b',34,1.3);
  tone(523,.09,'square',.03);
  setTimeout(()=>tone(659,.09,'square',.03),90);
  setTimeout(()=>tone(784,.18,'square',.03),180);
}

function nextDrive(){
  state.drive++;
  state.driveYards=0;
  state.speed=Math.min(520,300+(state.drive-1)*38);
  state.enemies.length=0;
  state.flags.length=0;
  state.banner=`DRIVE ${state.drive} // SPEED UP`;
  state.bannerTime=1.2;
}

function update(dt){
  state.time+=dt;
  state.flash=Math.max(0,state.flash-dt);
  state.shake=Math.max(0,state.shake-40*dt);
  state.bannerTime=Math.max(0,state.bannerTime-dt);
  player.smash=Math.max(0,player.smash-dt);
  player.invuln=Math.max(0,player.invuln-dt);

  if(state.mode!=='playing') return;

  if(state.touchdownTime>0){
    state.touchdownTime-=dt;
    if(state.touchdownTime<=0) nextDrive();
    return;
  }

  if(state.voltageTime>0){
    state.voltageTime-=dt;
    state.score+=70*dt;
    if(state.voltageTime<=0) state.banner='VOLTAGE OFFLINE';
  }

  if(state.loopsTime>0){
    state.loopsTime-=dt;
    state.score+=45*dt;
    if(state.loopsTime<=0){
      state.loopsTime=0;
      state.banner='LOOPS RUSH OFFLINE';
      state.bannerTime=.55;
    }
  }

  const speed = state.speed + (state.voltageTime>0 ? 105 : 0) + (state.loopsTime>0 ? 65 : 0);
  state.fieldOffset=(state.fieldOffset+speed*dt)%120;
  state.crowdOffset=(state.crowdOffset+speed*.15*dt)%30;

  const yardsDelta=speed*dt/46;
  state.driveYards+=yardsDelta;
  state.yards+=yardsDelta;
  state.score+=yardsDelta*22;

  if(state.driveYards>=100 && state.touchdownTime<=0){
    state.driveYards=100;
    touchdown();
  }

  // player physics
  player.vy+=1900*dt;
  player.y+=player.vy*dt;
  if(player.y>=GROUND-player.h){
    player.y=GROUND-player.h;
    player.vy=0;
    player.onGround=true;
  }else player.onGround=false;

  // enemy spawn
  state.spawnTimer-=dt;
  if(state.spawnTimer<=0){
    spawnEnemy();
    state.spawnTimer=rand(.72,1.22) * Math.max(.58,1-(state.drive-1)*.055);
  }

  // pickup spawn
  state.pickupTimer-=dt;
  if(state.pickupTimer<=0){
    spawnPickup();
    state.pickupTimer=rand(3.5,6.2);
  }

  // enemies
  for(const e of state.enemies){
    const extra=e.extra||0;
    e.x-=(speed+extra)*dt;

    if(e.type==='ref' && !e.thrown && e.x<e.throwAt){
      e.thrown=true;
      spawnFlag(e);
    }

    if(!e.dead && rects(player,e)){
      const smashing=player.smash>0;
      const powered=state.voltageTime>0;
      if(smashing || powered){
        e.dead=true;
        e.hit=true;
        state.score+=e.type==='ref'?850:450;
        state.voltage=clamp(state.voltage+(e.type==='ref'?18:10),0,100);
        state.shake=powered?10:5;
        particles(e.x+e.w/2,e.y+e.h/2,e.type==='ref'?'#ffe53b':'#ff2d95',14,powered?1.6:1);
        noiseHit();
      }else{
        e.dead=true;
        damage(e.type==='bruiser'?34:24,e.type==='ref'?'BAD CALL!':'HIT!');
      }
    }
  }

  // flags
  for(const f of state.flags){
    f.vy+=850*dt;
    f.x+=f.vx*dt;
    f.y+=f.vy*dt;
    f.rot+=6*dt;
    if(rects(player,f)){
      f.x=-200;
      if(player.smash>0 || state.voltageTime>0){
        state.score+=300;
        state.voltage=clamp(state.voltage+8,0,100);
        particles(player.x+40,player.y+20,'#ffe53b',9,1);
      } else damage(14,'PENALTY!');
    }
  }

  // pickups
  for(const p of state.pickups){
    p.x-=speed*dt;
    p.spin+=dt*8;
    if(rects(player,p)){
      p.x=-200;
      if(p.type==='mutantLoops'){
        state.hp=clamp(state.hp+8,0,100);
        state.voltage=clamp(state.voltage+45,0,100);
        state.score+=1200;
        state.loopsTime=Math.max(state.loopsTime,2.5);
        state.banner='MUTANT LOOPS // RUSH!';
        state.bannerTime=.85;
        tone(440,.06,'square',.03);
        setTimeout(()=>tone(660,.07,'square',.03),55);
        setTimeout(()=>tone(990,.10,'square',.028),115);
        particles(player.x+30,player.y+10,'#ff2d95',10,1.25);
        particles(player.x+30,player.y+10,'#8aff2b',12,1.35);
      }else{
        state.hp=clamp(state.hp+22,0,100);
        state.voltage=clamp(state.voltage+28,0,100);
        state.score+=650;
        state.banner='SKULL JUICE +';
        state.bannerTime=.55;
        tone(660,.06,'square',.028);
        setTimeout(()=>tone(880,.08,'square',.025),60);
        particles(player.x+30,player.y+10,'#8aff2b',14,1.15);
      }
    }
  }

  // particles
  for(const p of state.particles){
    p.life-=dt;
    p.vy+=720*dt;
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
  }

  state.enemies=state.enemies.filter(e=>e.x>-120 && !e.dead);
  state.flags=state.flags.filter(f=>f.x>-120 && f.y<H+80);
  state.pickups=state.pickups.filter(p=>p.x>-100);
  state.particles=state.particles.filter(p=>p.life>0);

  scoreEl.textContent=pad(state.score);
  yardsEl.textContent=`${Math.floor(state.driveYards)} / 100`;
  statusEl.textContent=state.voltageTime>0?'VOLTAGE!':`DRIVE ${state.drive}`;

  voltBtn.classList.toggle('ready',state.voltage>=100);
  voltBtn.textContent=state.voltage>=100?'â¡ VOLTAGE READY!':`â¡ VOLTAGE ${Math.floor(state.voltage)}%`;
}

function pxRect(x,y,w,h,c){
  ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function text(t,x,y,size=24,color='#fff',align='left'){
  ctx.fillStyle=color;
  ctx.font=`900 ${size}px "Barlow Condensed", Impact, sans-serif`;
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  ctx.fillText(t,x,y);
}
function shadowText(t,x,y,size,color,align='left'){
  text(t,x+3,y+3,size,'rgba(0,0,0,.7)',align);
  text(t,x,y,size,color,align);
}

function drawBackground(){
  // Poster-style Titan City stadium is now the live field backdrop.
  if(artReady('stadium')){
    ctx.drawImage(ART.stadium,0,0,W,H);
    // darken slightly so gameplay sprites remain readable
    ctx.fillStyle='rgba(0,0,0,.18)';
    ctx.fillRect(0,0,W,H);
  }else{
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#080510');
    grad.addColorStop(.55,'#17241a');
    grad.addColorStop(1,'#12351b');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  }

  // moving turf layer instead of harsh white frame-lines
  const turfTop = 346;
  const turfBottom = H;
  const turfH = turfBottom - turfTop;

  // alternating turf bands scrolling under the player
  const bandW = 72;
  const bandOffset = state.fieldOffset % bandW;
  for(let i=-2;i<Math.ceil(W / bandW) + 2;i++){
    const x = i * bandW - bandOffset;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(72,145,78,.16)' : 'rgba(26,68,35,.18)';
    ctx.fillRect(x, turfTop, bandW, turfH);
  }

  // subtle ten-yard guide lines
  ctx.save();
  ctx.globalAlpha = .14;
  for(let i=-1;i<10;i++){
    const x = i*120-(state.fieldOffset%120);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x), turfTop, 2, turfH);
    text(String((i*10+100)%100), x+16, 402, 14, 'rgba(255,255,255,.42)');
  }
  ctx.restore();

  // scrolling hash marks
  const hashOffset = state.fieldOffset % 48;
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  for(let x=-50; x < W+60; x += 48){
    const hx = Math.round(x - hashOffset);
    // upper row of hashes
    ctx.fillRect(hx, 420, 16, 3);
    // lower row of hashes
    ctx.fillRect(hx, 474, 16, 3);
  }

  // subtle midfield glow strip
  const glow = ctx.createLinearGradient(0, 0, 0, turfH);
  glow.addColorStop(0, 'rgba(138,255,43,.00)');
  glow.addColorStop(.45, 'rgba(138,255,43,.04)');
  glow.addColorStop(.55, 'rgba(57,215,255,.03)');
  glow.addColorStop(1, 'rgba(255,45,149,.00)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, turfTop, W, turfH);

  // drive progress
  const progress=state.driveYards/100;
  ctx.fillStyle='rgba(0,0,0,.66)';ctx.fillRect(24,25,300,18);
  ctx.fillStyle='#8aff2b';ctx.fillRect(27,28,294*progress,12);
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.strokeRect(24,25,300,18);
  text(`${Math.floor(state.driveYards)} YDS`,335,35,18,'#fff');
}
function drawPlayer(){
  const blink=player.invuln>0 && Math.floor(state.time*14)%2===0;
  if(blink) return;
  const powered=state.voltageTime>0;
  const airborne=!player.onGround;

  // gameplay hitbox remains unchanged; artwork can be larger than it
  const drawW=106, drawH=128;
  const dx=player.x-27, dy=player.y-54;

  if(powered){
    ctx.save();
    ctx.shadowColor='#ffe53b';ctx.shadowBlur=32;
    if(artReady('lightning')) drawArt('lightning',dx-34,dy-30,190,185,.55);
    ctx.restore();
  }

  const key=(airborne || player.smash>0)?'dexRun':'dex';
  if(!drawArt(key,dx,dy,drawW,drawH)){
    pxRect(player.x+5,player.y+18,42,39,'#ff2d95');
    text('7',player.x+26,player.y+38,24,'#fff','center');
  }

  if(player.smash>0){
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(255,45,149,.32)';
    ctx.beginPath();ctx.arc(player.x+82,player.y+32,28,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}
function drawEnemy(e){
  if(e.type==='ref'){
    if(drawArt('bobby',e.x-26,e.y-50,98,116)) return;
  }else if(e.type==='bruiser'){
    if(drawArt('brute',e.x-30,e.y-50,118,122)) return;
  }else{
    if(drawArt('mutant',e.x-25,e.y-46,102,112)) return;
  }

  // fallback
  pxRect(e.x,e.y+18,e.w,e.h-18,e.type==='ref'?'#eee':'#6c2c56');
  text(e.type==='ref'?'$':'99',e.x+e.w/2,e.y+40,20,e.type==='ref'?'#111':'#ff2d95','center');
}
function drawPickup(p){
  const bob=Math.sin(p.spin)*5;
  const y=p.y+bob;
  ctx.save();
  const loops=p.type==='mutantLoops';
  ctx.shadowColor=loops?'#ff2d95':'#8aff2b';
  ctx.shadowBlur=loops?22:18;
  if(loops){
    if(!drawArt('mutantLoops',p.x-20,y-22,74,78)){
      pxRect(p.x,y,p.w,p.h,'#ff2d95');
      text('ML',p.x+p.w/2,y+p.h/2+1,17,'#07120a','center');
    }
  }else if(!drawArt('skullJuice',p.x-13,y-15,54,66)){
    pxRect(p.x,y,p.w,p.h,'#8aff2b');
    text('☠',p.x+p.w/2,y+p.h/2+1,18,'#07120a','center');
  }
  ctx.restore();
}
function drawFlag(f){
  ctx.save();
  ctx.translate(f.x+f.w/2,f.y+f.h/2);
  ctx.rotate(f.rot);
  pxRect(-f.w/2,-f.h/2,f.w,f.h,'#ffe53b');
  ctx.restore();
}

function drawParticles(){
  for(const p of state.particles){
    ctx.globalAlpha=clamp(p.life/p.max,0,1);
    pxRect(p.x,p.y,p.size,p.size,p.color);
  }
  ctx.globalAlpha=1;
}

function drawHud(){
  // health
  text('HP',24,68,18,'#fff');
  ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(55,59,155,19);
  ctx.fillStyle=state.hp>35?'#8aff2b':'#ff2d95';ctx.fillRect(58,62,149*(state.hp/100),13);

  // voltage
  text('VOLT',225,68,18,'#fff');
  ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(275,59,155,19);
  ctx.fillStyle=state.voltageTime>0?'#ffe53b':'#39d7ff';
  ctx.fillRect(278,62,149*(state.voltageTime>0?1:state.voltage/100),13);

  shadowText(`SCORE ${pad(state.score)}`,W-26,38,25,'#fff','right');
  shadowText(`DRIVE ${state.drive}`,W-26,68,19,'#8aff2b','right');

  if(state.bannerTime>0){
    const a=clamp(state.bannerTime*2,0,1);
    ctx.globalAlpha=a;
    ctx.fillStyle='rgba(0,0,0,.64)';
    ctx.fillRect(W/2-220,102,440,56);
    shadowText(state.banner,W/2,131,29,state.banner.includes('VOLTAGE')?'#ffe53b':'#fff','center');
    ctx.globalAlpha=1;
  }
}

function drawTitle(){
  drawBackground();
  ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,W,H);
  shadowText("TITAN BALL '92",W/2,175,72,'#ff2d95','center');
  shadowText('DEX VOLT // 100 YARD MUTANT RUN',W/2,235,26,'#fff','center');

  ctx.fillStyle='rgba(8,12,10,.9)';ctx.fillRect(W/2-225,285,450,90);
  ctx.strokeStyle='rgba(255,45,149,.65)';ctx.lineWidth=2;ctx.strokeRect(W/2-225,285,450,90);
  shadowText('TAP SCREEN OR PRESS ENTER',W/2,320,29,'#ffe53b','center');
  text(`HIGH SCORE ${pad(high)}`,W/2,355,21,'#39d7ff','center');

  text('Â© 1992 TITAN CITY ELECTRONICS // ABSOLUTELY UNLICENSED',W/2,492,15,'rgba(255,255,255,.48)','center');
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,.74)';ctx.fillRect(0,0,W,H);
  if(artReady('gameover')){
    drawArt('gameover',W/2-145,88,290,230,.95);
  }else{
    shadowText('GAME OVER',W/2,185,70,'#ff2d95','center');
  }
  shadowText(`SCORE ${pad(state.score)}`,W/2,318,30,'#fff','center');
  text(`DRIVE ${state.drive} // ${Math.floor(state.yards)} TOTAL YARDS`,W/2,354,21,'#8aff2b','center');
  ctx.fillStyle='rgba(8,12,10,.92)';ctx.fillRect(W/2-205,387,410,65);
  ctx.strokeStyle='rgba(138,255,43,.45)';ctx.strokeRect(W/2-205,387,410,65);
  shadowText('INSERT MUTATION // TAP TO RETRY',W/2,421,24,'#ffe53b','center');
}
function render(){
  const sx=state.shake>0?Math.round(rand(-state.shake,state.shake)):0;
  const sy=state.shake>0?Math.round(rand(-state.shake*.5,state.shake*.5)):0;
  ctx.save();
  ctx.translate(sx,sy);

  if(state.mode==='title'){
    drawTitle();
  }else{
    drawBackground();
    for(const p of state.pickups) drawPickup(p);
    for(const f of state.flags) drawFlag(f);
    for(const e of state.enemies) drawEnemy(e);
    drawPlayer();
    drawParticles();
    drawHud();
    if(state.touchdownTime>0 && artReady('touchdown')){
      drawArt('touchdown',W/2-205,118,410,238,.94);
    }
    if(state.mode==='gameover') drawGameOver();
  }

  if(state.flash>0){
    ctx.fillStyle=`rgba(255,255,255,${Math.min(.28,state.flash)})`;
    ctx.fillRect(0,0,W,H);
  }
  ctx.restore();
}

function loop(now){
  const dt=Math.min(.034,(now-state.last)/1000 || 0);
  state.last=now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

scoreEl.textContent=pad(0);
yardsEl.textContent='0 / 100';
statusEl.textContent='READY';
voltBtn.textContent='â¡ VOLTAGE 0%';
requestAnimationFrame(loop);
})();
