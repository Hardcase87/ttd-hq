(() => {
'use strict';

const canvas = document.getElementById('titanBallCanvas');
if (!canvas) return;
const ctx = canvas.getContext('2d', { alpha:false });

const scoreEl = document.getElementById('tbScore');
const yardsEl = document.getElementById('tbYards');
const highEl = document.getElementById('tbHigh');
const statusEl = document.getElementById('tbStatus');
const jumpBtn = document.getElementById('tbJump');
const smashBtn = document.getElementById('tbSmash');
const voltBtn = document.getElementById('tbVolt');

const W = canvas.width, H = canvas.height;
const GROUND = 420;
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
    state.banner='⚡ VOLTAGE MODE ⚡';
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
  state.pickups.push({
    x:W+60,y:airborne?GROUND-150:GROUND-45,
    w:28,h:36,spin:0
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

  const speed = state.speed + (state.voltageTime>0 ? 105 : 0);
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
  voltBtn.textContent=state.voltage>=100?'⚡ VOLTAGE READY!':`⚡ VOLTAGE ${Math.floor(state.voltage)}%`;
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
  // neon Titan City sky
  const grad=ctx.createLinearGradient(0,0,0,GROUND);
  grad.addColorStop(0,'#05040a');
  grad.addColorStop(.36,'#15102b');
  grad.addColorStop(.70,'#16231b');
  grad.addColorStop(1,'#173d20');
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

  // distant skyline
  for(let i=0;i<22;i++){
    const bx=i*48-((state.crowdOffset*.45)%48);
    const bh=52+(i%6)*17;
    ctx.fillStyle=i%3===0?'#11142b':'#0c1220';
    ctx.fillRect(bx,210-bh,39,bh);
    const glow=['#ff2d95','#39d7ff','#8aff2b','#ffe53b'][i%4];
    for(let wy=210-bh+10;wy<200;wy+=14){
      for(let wx=bx+7;wx<bx+34;wx+=11){
        if((wx+wy+i)%3===0){ ctx.fillStyle=glow;ctx.globalAlpha=.38;ctx.fillRect(wx,wy,3,4);ctx.globalAlpha=1; }
      }
    }
  }

  // stars
  for(const s of state.stars) pxRect(s.x,s.y,s.s,s.s,'rgba(255,255,255,.50)');

  // stadium light towers with glow
  for(let i=0;i<6;i++){
    const x=70+i*170;
    ctx.save();
    ctx.shadowColor=i%2?'#ff2d95':'#39d7ff';
    ctx.shadowBlur=16;
    pxRect(x,72,92,8,'#cbd7d0');
    for(let j=0;j<7;j++) pxRect(x+7+j*12,74,7,4,j%2?'#ffe53b':'#fff');
    ctx.restore();
    pxRect(x+42,80,7,125,'#233129');
  }

  // ad wall
  ctx.fillStyle='#0b120f';ctx.fillRect(0,206,W,43);
  const ads=[
    {x:38,w:145,t:'SKULL JUICE',c:'#8aff2b'},
    {x:206,w:155,t:'MUTANT LOOPS',c:'#ff2d95'},
    {x:392,w:140,t:'TITAN CITY',c:'#ffe53b'},
    {x:565,w:150,t:'HARDCASE 87',c:'#39d7ff'},
    {x:748,w:160,t:'NO MERCY',c:'#ff2d95'}
  ];
  for(const a of ads){
    ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(a.x,212,a.w,29);
    ctx.strokeStyle=a.c;ctx.globalAlpha=.38;ctx.strokeRect(a.x,212,a.w,29);ctx.globalAlpha=1;
    text(a.t,a.x+a.w/2,227,17,a.c,'center');
  }

  // crowd bowl
  ctx.fillStyle='#111713';ctx.fillRect(0,249,W,72);
  const crowd=['#ff2d95','#8aff2b','#39d7ff','#ffe53b','#9aa39d'];
  for(let y=258;y<316;y+=12){
    for(let x=-25;x<W+30;x+=14){
      const xo=(x+((y/12)%2?state.crowdOffset:-state.crowdOffset))%1000;
      pxRect(xo,y,4,4,crowd[(Math.floor(x/14)+Math.floor(y/12))%crowd.length]);
    }
  }

  // banner
  ctx.fillStyle='rgba(0,0,0,.50)';ctx.fillRect(0,317,W,27);
  shadowText('TITAN BALL // NO REFUNDS // NO MERCY',W/2,331,22,'#8aff2b','center');

  // field
  const fieldGrad=ctx.createLinearGradient(0,344,0,H);
  fieldGrad.addColorStop(0,'#235a2d');
  fieldGrad.addColorStop(1,'#0f2d18');
  ctx.fillStyle=fieldGrad;ctx.fillRect(0,344,W,H-344);

  // alternating turf bands
  for(let i=-1;i<10;i++){
    const x=i*120-(state.fieldOffset%120);
    ctx.fillStyle=(i%2===0)?'rgba(255,255,255,.018)':'rgba(0,0,0,.035)';
    ctx.fillRect(x,344,120,H-344);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x,344,3,H-344);
    text(String((i*10+100)%100),x+15,395,15,'rgba(255,255,255,.30)');
  }

  // hash marks
  ctx.fillStyle='rgba(255,255,255,.25)';
  for(let x=-40;x<W+40;x+=54){
    const xx=x-(state.fieldOffset*.45%54);
    ctx.fillRect(xx,449,19,3);
    ctx.fillRect(xx,485,19,3);
  }
  ctx.fillStyle='rgba(255,255,255,.27)';ctx.fillRect(0,GROUND+8,W,4);

  // drive progress
  const progress=state.driveYards/100;
  ctx.fillStyle='rgba(0,0,0,.50)';ctx.fillRect(24,25,300,18);
  ctx.fillStyle='#8aff2b';ctx.fillRect(27,28,294*progress,12);
  ctx.strokeStyle='rgba(255,255,255,.16)';ctx.strokeRect(24,25,300,18);
  text(`${Math.floor(state.driveYards)} YDS`,335,35,18,'#fff');
}
function drawPlayer(){
  const x=player.x,y=player.y;
  const blink=player.invuln>0 && Math.floor(state.time*14)%2===0;
  if(blink) return;
  const powered=state.voltageTime>0;

  if(powered){
    ctx.save();
    ctx.shadowColor='#ffe53b';ctx.shadowBlur=30;
    pxRect(x-7,y-8,player.w+16,player.h+16,'rgba(255,229,59,.18)');
    ctx.restore();
    // lightning streaks
    ctx.strokeStyle='#ffe53b';ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(x-22,y+14);ctx.lineTo(x-8,y+23);ctx.lineTo(x-20,y+34);
    ctx.moveTo(x-14,y+48);ctx.lineTo(x-2,y+55);ctx.lineTo(x-17,y+64);
    ctx.stroke();
  }

  const run=Math.sin(state.time*18);

  // shadow
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath();ctx.ellipse(x+27,GROUND+5,31,7,0,0,Math.PI*2);ctx.fill();

  // legs / boots
  pxRect(x+9,y+50+run*3,12,22,'#d8d9df');
  pxRect(x+31,y+50-run*3,12,22,'#d8d9df');
  pxRect(x+5,y+68+run*3,20,7,'#ff2d95');
  pxRect(x+28,y+68-run*3,20,7,'#ff2d95');

  // shoulder pads
  pxRect(x+1,y+18,50,16,powered?'#ffe53b':'#ff2d95');
  pxRect(x+6,y+21,40,37,'#11151a');
  pxRect(x+8,y+26,5,26,powered?'#ffe53b':'#8aff2b');
  pxRect(x+39,y+26,5,26,powered?'#ffe53b':'#8aff2b');

  // helmet + visor
  pxRect(x+10,y,32,23,'#d9ddd5');
  pxRect(x+9,y+7,37,9,'#eceee9');
  pxRect(x+13,y+10,27,5,'#171a22');
  pxRect(x+32,y+10,13,4,powered?'#ffe53b':'#39d7ff');
  pxRect(x+38,y+16,12,3,'#8aff2b');

  // number
  text('7',x+26,y+40,24,powered?'#ffe53b':'#fff','center');

  // arm / smash pose
  if(player.smash>0){
    pxRect(x+42,y+24,37,13,powered?'#ffe53b':'#8aff2b');
    pxRect(x+72,y+20,14,21,'#d7dad4');
    ctx.save();ctx.shadowColor='#ff2d95';ctx.shadowBlur=15;
    pxRect(x+82,y+23,7,15,'#ff2d95');ctx.restore();
  }else{
    pxRect(x+42,y+27,16,11,'#8aff2b');
  }

  // pink jersey name flash
  text('VOLT',x+25,y+20,10,'#ff2d95','center');
}
function drawEnemy(e){
  if(e.type==='bruiser'){
    pxRect(e.x,e.y+18,e.w,e.h-18,'#6c2c56');
    pxRect(e.x+6,e.y,e.w-12,25,'#70737b');
    pxRect(e.x+10,e.y+25,e.w-20,27,'#281620');
    text('99',e.x+e.w/2,e.y+40,20,'#ff2d95','center');
  }else if(e.type==='speedster'){
    pxRect(e.x+5,e.y+18,e.w-10,e.h-18,'#143a40');
    pxRect(e.x+6,e.y,e.w-12,22,'#cbd8d7');
    text('13',e.x+e.w/2,e.y+37,17,'#39d7ff','center');
  }else{
    // ref
    pxRect(e.x+7,e.y+18,e.w-14,e.h-18,'#eee');
    for(let i=0;i<4;i++) pxRect(e.x+8+i*7,e.y+18,4,e.h-24,'#111');
    pxRect(e.x+9,e.y,e.w-18,21,'#111');
    pxRect(e.x+e.w-2,e.y+26,8,22,'#ffe53b');
    text('$',e.x+e.w/2,e.y+37,18,'#ffe53b','center');
  }
}

function drawPickup(p){
  const bob=Math.sin(p.spin)*5;
  const y=p.y+bob;
  ctx.save();
  ctx.translate(p.x+p.w/2,y+p.h/2);
  ctx.rotate(Math.sin(p.spin)*.12);
  ctx.translate(-(p.x+p.w/2),-(y+p.h/2));
  pxRect(p.x,y,p.w,p.h,'#8aff2b');
  pxRect(p.x+4,y+5,p.w-8,p.h-10,'#07120a');
  text('☠',p.x+p.w/2,y+p.h/2+1,18,'#8aff2b','center');
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
  shadowText("TITAN BALL '92",W/2,175,72,'#8aff2b','center');
  shadowText('DEX VOLT // 100 YARD MUTANT RUN',W/2,235,26,'#fff','center');

  ctx.fillStyle='rgba(8,12,10,.9)';ctx.fillRect(W/2-225,285,450,90);
  ctx.strokeStyle='rgba(255,45,149,.65)';ctx.lineWidth=2;ctx.strokeRect(W/2-225,285,450,90);
  shadowText('TAP SCREEN OR PRESS ENTER',W/2,320,29,'#ffe53b','center');
  text(`HIGH SCORE ${pad(high)}`,W/2,355,21,'#39d7ff','center');

  text('© 1992 TITAN CITY ELECTRONICS // ABSOLUTELY UNLICENSED',W/2,492,15,'rgba(255,255,255,.48)','center');
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,.70)';ctx.fillRect(0,0,W,H);
  shadowText('GAME OVER',W/2,185,70,'#ff2d95','center');
  shadowText(`SCORE ${pad(state.score)}`,W/2,256,30,'#fff','center');
  text(`DRIVE ${state.drive} // ${Math.floor(state.yards)} TOTAL YARDS`,W/2,296,21,'#8aff2b','center');
  ctx.fillStyle='rgba(8,12,10,.92)';ctx.fillRect(W/2-205,335,410,65);
  ctx.strokeStyle='rgba(138,255,43,.45)';ctx.strokeRect(W/2-205,335,410,65);
  shadowText('INSERT MUTATION // TAP TO RETRY',W/2,369,24,'#ffe53b','center');
}

function render(){
  const sx=state.shake>0?rand(-state.shake,state.shake):0;
  const sy=state.shake>0?rand(-state.shake*.5,state.shake*.5):0;
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
voltBtn.textContent='⚡ VOLTAGE 0%';
requestAnimationFrame(loop);
})();