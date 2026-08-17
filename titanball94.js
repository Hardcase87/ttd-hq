(() => {
'use strict';

const canvas = document.getElementById('tb94Canvas');
if(!canvas) return;
const ctx = canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled = false;

const UI = {
  score:document.getElementById('tb94Score'),
  down:document.getElementById('tb94Down'),
  field:document.getElementById('tb94Field'),
  hp:document.getElementById('tb94Hp'),
  meter:document.getElementById('tb94Meter'),
  status:document.getElementById('tb94Status'),
  up:document.getElementById('tb94Up'),
  left:document.getElementById('tb94Left'),
  center:document.getElementById('tb94Center'),
  right:document.getElementById('tb94Right'),
  downBtn:document.getElementById('tb94DownBtn'),
  smash:document.getElementById('tb94Smash'),
  dash:document.getElementById('tb94Dash'),
  special:document.getElementById('tb94Special')
};

const W=canvas.width,H=canvas.height;
const FIELD={left:90,right:890,top:118,bottom:485};
const SAVE='ttd-titanball94-v3';
const TWO_PI=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const pad=n=>Math.max(0,Math.floor(n)).toString().padStart(6,'0');
const lerp=(a,b,t)=>a+(b-a)*t;

const PALETTE={green:'#8aff2b',pink:'#ff2d95',blue:'#39d7ff',yellow:'#ffe53b',white:'#f5f7f8',black:'#07080b'};

const ROSTER=[
 {id:'dex',name:'DEX VOLT',no:7,color:PALETTE.green,accent:PALETTE.pink,speed:235,power:1.1,hp:100,size:25,special:'VOLTAGE STORM',desc:'BALANCED // ELECTRIC'},
 {id:'nikki',name:'NIKKI NITRO',no:87,color:PALETTE.pink,accent:PALETTE.blue,speed:280,power:.82,hp:84,size:21,special:'NITRO BREAK',desc:'SPEED // DODGE'},
 {id:'mack',name:'MACK MAUL',no:99,color:PALETTE.yellow,accent:PALETTE.green,speed:190,power:1.55,hp:135,size:31,special:'EARTHQUAKE',desc:'HEAVY // DAMAGE'}
];

const ASSETS={};
const ASSET_FILES={
  stadium:'assets/images/titanball94/stadium-v2.PNG',
  dexSheet:'assets/images/titanball94/dex-sheet.PNG',
  nikkiSheet:'assets/images/titanball94/nikki-sheet.PNG',
  bruiserSheet:'assets/images/titanball94/bruiser-sheet.PNG',
  itemsSheet:'assets/images/titanball94/items-sheet.PNG'
};
for(const [k,src] of Object.entries(ASSET_FILES)){
  const img=new Image(); img.src=src; ASSETS[k]=img;
}
const ready=k=>ASSETS[k]&&ASSETS[k].complete&&ASSETS[k].naturalWidth>0;
function art(k,x,y,w,h,a=1){
  if(!ready(k)) return false;
  ctx.save();ctx.globalAlpha=a;ctx.drawImage(ASSETS[k],Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();return true;
}

function sheetArt(k,sx,sy,sw,sh,x,y,w,h,a=1,flip=false){
  if(!ready(k)) return false;
  ctx.save();
  ctx.globalAlpha=a;
  if(flip){
    ctx.translate(Math.round(x+w),Math.round(y));
    ctx.scale(-1,1);
    ctx.drawImage(ASSETS[k],sx,sy,sw,sh,0,0,Math.round(w),Math.round(h));
  }else{
    ctx.drawImage(ASSETS[k],sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  ctx.restore();
  return true;
}

// Hand-picked action poses from the uploaded Phase 1 sprite sheets.
// Sheets are 1536x1024; these crops deliberately avoid logos/portrait art.
const SHEET_POSES = {
  dex:{run:[1000,48,500,410],idle:[438,22,235,455],portrait:[0,0,410,500]},
  nikki:{run:[1000,48,485,420],idle:[425,20,235,460],portrait:[0,0,410,500]},
  mack:{run:[920,22,555,400],idle:[520,15,350,500],portrait:[0,0,470,510]},
  defender:{run:[920,22,555,400]},
  speedster:{run:[920,22,555,400]}
};

const PRESENTATION = {
  bootBlink:0,
  introTimer:0,
  selectPulse:0,
  confirmFlash:0
};

let audio=null;
function tone(f=220,d=.06,type='square',g=.02){
  try{
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=audio.createOscillator(),gain=audio.createGain();
    o.type=type;o.frequency.value=f;gain.gain.setValueAtTime(g,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);
    o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+d);
  }catch(e){}
}
const hitSound=()=>{tone(76,.08,'sawtooth',.03);setTimeout(()=>tone(48,.09,'square',.02),25)};

let save={high:0,bestDrive:0};
try{save={...save,...JSON.parse(localStorage.getItem(SAVE)||'{}')}}catch(e){}
const persist=()=>localStorage.setItem(SAVE,JSON.stringify(save));

const input={up:false,down:false,left:false,right:false,smash:false,dash:false,special:false};
const state={
  mode:'boot',paused:false,select:0,time:0,last:performance.now(),score:0,fieldYards:0,totalYards:0,
  down:1,toGo:20,seriesStart:0,drive:1,hp:100,meter:0,banner:'',bannerTime:0,shake:0,flash:0,
  possessionTime:0,spawnTimer:1,pickupTimer:4,defenders:[],pickups:[],particles:[],shockwaves:[],
  crowd:0,worldScroll:0,multiplier:1,comboTime:0,gamepadLock:false,touchdownTime:0,firstDownTime:0,
  tackleFreeze:0,downResetTime:0
};

const player={x:210,y:300,vx:0,vy:0,r:25,smash:0,dash:0,invuln:0,specialTime:0,trail:[]};

function current(){return ROSTER[state.select]}
function resetPlayer(){
  const c=current(); player.x=210;player.y=(FIELD.top+FIELD.bottom)/2;player.vx=player.vy=0;player.r=c.size;
  player.smash=player.dash=player.invuln=player.specialTime=0;player.trail.length=0;state.hp=c.hp;
}
function resetGame(){
  state.mode='playing';state.paused=false;state.score=0;state.fieldYards=0;state.totalYards=0;state.down=1;state.toGo=20;
  state.seriesStart=0;state.drive=1;state.meter=0;state.banner=`${current().name} // DRIVE 1`;state.bannerTime=1.4;
  state.possessionTime=0;state.spawnTimer=.8;state.pickupTimer=3.2;state.defenders.length=0;state.pickups.length=0;
  state.particles.length=0;state.shockwaves.length=0;state.multiplier=1;state.comboTime=0;state.touchdownTime=0;state.firstDownTime=0;state.downResetTime=0;
  resetPlayer();tone(196,.08);setTimeout(()=>tone(294,.08),70);setTimeout(()=>tone(392,.12),140);
}
function enterSelect(){
  state.mode='select';
  PRESENTATION.selectPulse=0;
  PRESENTATION.confirmFlash=0;
  tone(220,.05,'square',.018);
}
function confirmCharacter(){
  if(state.mode!=='select') return;
  PRESENTATION.confirmFlash=.35;
  state.mode='intro';
  PRESENTATION.introTimer=1.75;
  tone(392,.07,'square',.026);
  setTimeout(()=>tone(523,.08,'square',.026),80);
}
function cycleCharacter(dir){
  state.select=(state.select+dir+ROSTER.length)%ROSTER.length;
  tone(280+state.select*70,.045,'square',.018);
}
function start(){
  if(state.mode==='boot') enterSelect();
  else if(state.mode==='select') confirmCharacter();
  else if(state.mode==='gameover') enterSelect();
}
function gameOver(msg='DRIVE TERMINATED'){
  state.mode='gameover';state.banner=msg;state.bannerTime=99;
  if(state.score>save.high) save.high=Math.floor(state.score);
  if(state.drive>save.bestDrive) save.bestDrive=state.drive;
  persist();tone(145,.18,'sawtooth',.03);setTimeout(()=>tone(96,.25,'square',.025),160);
}
function newDown(reason='DOWN'){
  if(state.downResetTime>0||state.touchdownTime>0) return;
  state.downResetTime=1.05;state.banner=reason;state.bannerTime=.8;state.defenders.length=0;state.pickups.length=0;
}
function finishDown(){
  state.downResetTime=0;
  const gained=Math.max(0,state.fieldYards-state.seriesStart);
  state.toGo=Math.max(0,20-gained);
  if(state.toGo<=0){
    state.down=1;state.seriesStart=state.fieldYards;state.toGo=20;state.score+=1200;state.banner='FIRST DOWN // +1200';state.bannerTime=1;
  }else{
    state.down++;
    if(state.down>4){gameOver('TURNOVER ON DOWNS');return;}
    state.banner=`DOWN ${state.down} // ${Math.ceil(state.toGo)} TO GO`;state.bannerTime=.9;
  }
  resetPlayer();
}
function touchdown(){
  state.touchdownTime=2;state.banner='TOUCHDOWN // +7500';state.bannerTime=1.8;state.score+=7500*state.multiplier;
  state.meter=clamp(state.meter+40,0,100);state.shake=13;state.flash=.4;burst(760,270,PALETTE.yellow,40,1.4);
  tone(523,.09);setTimeout(()=>tone(659,.09),90);setTimeout(()=>tone(784,.18),180);
}
function nextDrive(){
  state.drive++;state.fieldYards=0;state.seriesStart=0;state.down=1;state.toGo=20;state.touchdownTime=0;
  state.defenders.length=0;state.pickups.length=0;resetPlayer();state.banner=`DRIVE ${state.drive} // DEFENSE MUTATES`;state.bannerTime=1.3;
}

function burst(x,y,color,count=12,power=1){
  for(let i=0;i<count;i++) state.particles.push({x,y,vx:rand(-220,220)*power,vy:rand(-220,220)*power,life:rand(.3,.75),max:.75,size:rand(2,7),color});
}
function shockwave(x,y,color,max=110){state.shockwaves.push({x,y,r:8,max,life:.5,color})}

function smash(){
  if(state.mode!=='playing'){start();return}
  if(state.paused||player.smash>0) return;
  player.smash=.28;input.smash=true;tone(92,.06,'square',.03);
}
function dash(){
  if(state.mode!=='playing'){start();return}
  if(state.paused||player.dash>0) return;
  player.dash=.32;player.invuln=Math.max(player.invuln,.16);input.dash=true;tone(285,.045,'square',.018);
}
function special(){
  if(state.mode!=='playing'){start();return}
  if(state.paused||state.meter<100||player.specialTime>0) return;
  state.meter=0;player.specialTime=current().id==='nikki'?4.5:4;player.invuln=Math.max(player.invuln,1);
  state.banner=current().special;state.bannerTime=1.2;state.flash=.3;state.shake=9;
  if(current().id==='mack'){shockwave(player.x,player.y,PALETTE.yellow,190);for(const d of state.defenders)d.stun=1.2}
  tone(420,.12,'sawtooth',.032);setTimeout(()=>tone(680,.13,'square',.03),100);setTimeout(()=>tone(900,.16,'square',.026),210);
}

function bindHold(el,key){
  if(!el)return;
  el.addEventListener('pointerdown',e=>{e.preventDefault();input[key]=true;el.classList.add('active')});
  for(const ev of ['pointerup','pointercancel','pointerleave'])el.addEventListener(ev,()=>{input[key]=false;el.classList.remove('active')});
}
bindHold(UI.up,'up');bindHold(UI.left,'left');bindHold(UI.right,'right');bindHold(UI.downBtn,'down');
UI.center?.addEventListener('pointerdown',e=>{e.preventDefault();input.up=input.down=input.left=input.right=false});
UI.smash?.addEventListener('pointerdown',e=>{e.preventDefault();UI.smash.classList.add('active');smash()});
UI.dash?.addEventListener('pointerdown',e=>{e.preventDefault();UI.dash.classList.add('active');dash()});
UI.special?.addEventListener('pointerdown',e=>{e.preventDefault();UI.special.classList.add('active');special()});
for(const el of [UI.smash,UI.dash,UI.special]) for(const ev of ['pointerup','pointercancel','pointerleave']) el?.addEventListener(ev,()=>el.classList.remove('active'));

canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;

  if(state.mode==='boot'){ enterSelect(); return; }

  if(state.mode==='select'){
    // Three large character cards.
    const cardY=210, cardH=245, startX=72, cardW=250, gap=33;
    for(let i=0;i<3;i++){
      const cx=startX+i*(cardW+gap);
      if(x>=cx&&x<=cx+cardW&&y>=cardY&&y<=cardY+cardH){
        if(state.select===i) confirmCharacter();
        else { state.select=i; tone(300+i*70,.05,'square',.02); }
        return;
      }
    }
    // Tapping lower confirmation strip starts selected player.
    if(y>465) confirmCharacter();
    return;
  }

  if(state.mode==='gameover') enterSelect();
});

window.addEventListener('keydown',e=>{
  const k=e.code;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(k))e.preventDefault();

  if(state.mode==='boot'){
    if(k==='Enter'||k==='Space'||k==='KeyX'||k==='KeyC'||k==='KeyV') enterSelect();
    return;
  }

  if(state.mode==='select'){
    if(k==='ArrowLeft'||k==='KeyA') cycleCharacter(-1);
    else if(k==='ArrowRight'||k==='KeyD') cycleCharacter(1);
    else if(k==='Digit1'||k==='Digit2'||k==='Digit3'){state.select=Number(k.slice(-1))-1;tone(300+state.select*70,.05)}
    else if(k==='Enter'||k==='Space'||k==='KeyX'||k==='KeyC') confirmCharacter();
    return;
  }

  if(k==='ArrowUp'||k==='KeyW')input.up=true;
  if(k==='ArrowDown'||k==='KeyS')input.down=true;
  if(k==='ArrowLeft'||k==='KeyA')input.left=true;
  if(k==='ArrowRight'||k==='KeyD')input.right=true;
  if(k==='KeyX')smash();
  if(k==='KeyC'||k==='Space')dash();
  if(k==='KeyV')special();
  if(k==='Enter')start();
  if(k==='KeyP'&&state.mode==='playing')state.paused=!state.paused;
});
window.addEventListener('keyup',e=>{
  const k=e.code;
  if(k==='ArrowUp'||k==='KeyW')input.up=false;if(k==='ArrowDown'||k==='KeyS')input.down=false;
  if(k==='ArrowLeft'||k==='KeyA')input.left=false;if(k==='ArrowRight'||k==='KeyD')input.right=false;
});

function pollGamepad(){
  const gp=navigator.getGamepads?.()[0];if(!gp)return;
  const ax=gp.axes[0]||0,ay=gp.axes[1]||0;
  const pressed=gp.buttons;
  const frontPressed=pressed.some((b,i)=>[0,9,14,15].includes(i)&&b.pressed);

  if(state.mode==='boot'){
    if((pressed[0]?.pressed||pressed[9]?.pressed)&&!state.gamepadLock) enterSelect();
    state.gamepadLock=frontPressed; return;
  }
  if(state.mode==='select'){
    if(!state.gamepadLock){
      if(ax<-.5||pressed[14]?.pressed) cycleCharacter(-1);
      else if(ax>.5||pressed[15]?.pressed) cycleCharacter(1);
      else if(pressed[0]?.pressed||pressed[9]?.pressed) confirmCharacter();
    }
    state.gamepadLock=frontPressed; return;
  }

  input.left=ax<-.3||pressed[14]?.pressed;input.right=ax>.3||pressed[15]?.pressed;
  input.up=ay<-.3||pressed[12]?.pressed;input.down=ay>.3||pressed[13]?.pressed;
  if(pressed[0]?.pressed&&!state.gamepadLock)dash();
  if(pressed[2]?.pressed&&!state.gamepadLock)smash();
  if(pressed[3]?.pressed&&!state.gamepadLock)special();
  if(pressed[9]?.pressed&&!state.gamepadLock&&state.mode==='playing')state.paused=!state.paused;
  state.gamepadLock=pressed.some((b,i)=>[0,2,3,9].includes(i)&&b.pressed);
}

function spawnDefender(){
  const drive=state.drive;
  const r=Math.random();
  let type='bruiser';
  if(r>.58)type='speedster';
  if(drive>=2&&r>.88)type='ref';
  const lane=rand(FIELD.top+45,FIELD.bottom-45);
  const cfg=type==='bruiser'?{r:27,s:125,hp:2,p:1.25}:{r:21,s:170,hp:1,p:.85};
  if(type==='ref'){cfg.r=19;cfg.s=112;cfg.hp=1;cfg.p=.65}
  state.defenders.push({type,x:W+45,y:lane,r:cfg.r,speed:cfg.s+drive*7,hp:cfg.hp,power:cfg.p,dead:false,stun:0,phase:rand(0,6.2),flagCD:rand(.8,1.8)});
}
function spawnPickup(){
  const type=Math.random()<.38?'loops':'juice';
  state.pickups.push({type,x:W+30,y:rand(FIELD.top+35,FIELD.bottom-35),r:17,spin:0});
}

function circleHit(a,b){const dx=a.x-b.x,dy=a.y-b.y,rr=a.r+b.r;return dx*dx+dy*dy<rr*rr}

function defenderKO(d,bonus=0){
  d.dead=true;state.score+=(d.type==='ref'?900:500)+bonus;state.meter=clamp(state.meter+(d.type==='ref'?18:10),0,100);
  state.multiplier=clamp(state.multiplier+.1,1,4);state.comboTime=2.5;state.shake=7;burst(d.x,d.y,d.type==='ref'?PALETTE.yellow:PALETTE.pink,16,1.2);hitSound();
}
function tackle(d){
  if(player.invuln>0||player.specialTime>0)return defenderKO(d,250);
  const c=current();const dmg=Math.round(19*d.power/c.power);
  state.hp-=dmg;player.invuln=.9;state.shake=12;state.flash=.18;burst(player.x,player.y,PALETTE.pink,16,1.25);hitSound();
  d.dead=true;state.banner=`HIT // -${dmg} HP`;state.bannerTime=.55;
  if(state.hp<=0){gameOver('PLAYER DESTROYED');return}
  newDown('TACKLED // DOWN OVER');
}

function update(dt){
  pollGamepad();
  state.time+=dt;state.flash=Math.max(0,state.flash-dt);state.shake=Math.max(0,state.shake-45*dt);state.bannerTime=Math.max(0,state.bannerTime-dt);
  PRESENTATION.bootBlink+=dt;PRESENTATION.selectPulse+=dt;PRESENTATION.confirmFlash=Math.max(0,PRESENTATION.confirmFlash-dt);

  if(state.mode==='intro'){
    PRESENTATION.introTimer-=dt;
    if(PRESENTATION.introTimer<=0) resetGame();
    return;
  }

  if(state.mode!=='playing'||state.paused)return;
  if(state.touchdownTime>0){state.touchdownTime-=dt;if(state.touchdownTime<=0)nextDrive();return}
  if(state.downResetTime>0){state.downResetTime-=dt;if(state.downResetTime<=0)finishDown();return}
  player.smash=Math.max(0,player.smash-dt);player.dash=Math.max(0,player.dash-dt);player.invuln=Math.max(0,player.invuln-dt);
  player.specialTime=Math.max(0,player.specialTime-dt);
  if(state.comboTime>0){state.comboTime-=dt;if(state.comboTime<=0)state.multiplier=1}

  const c=current();
  let speed=c.speed*(player.dash>0?1.8:1);
  if(player.specialTime>0&&c.id==='nikki')speed*=1.6;
  let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);
  const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  player.vx=lerp(player.vx,dx*speed,.22);player.vy=lerp(player.vy,dy*speed,.22);
  if(!dx)player.vx*=.78;if(!dy)player.vy*=.78;
  player.x=clamp(player.x+player.vx*dt,FIELD.left+20,FIELD.right-20);
  player.y=clamp(player.y+player.vy*dt,FIELD.top+20,FIELD.bottom-20);

  // Forward progress is a combination of actual rightward running + baseline play flow.
  const forward=Math.max(0,player.vx)*dt/70 + (player.dash>0?4.2:1.6)*dt;
  state.fieldYards+=forward;state.totalYards+=forward;state.score+=forward*35*state.multiplier;
  state.worldScroll=(state.worldScroll+forward*13)%80;state.crowd+=dt*15;
  if(state.fieldYards>=100){state.fieldYards=100;touchdown();return}

  player.trail.push({x:player.x,y:player.y,life:.28,color:c.color});if(player.trail.length>18)player.trail.shift();

  state.spawnTimer-=dt;if(state.spawnTimer<=0){spawnDefender();state.spawnTimer=rand(.55,1.05)*Math.max(.55,1-(state.drive-1)*.045)}
  state.pickupTimer-=dt;if(state.pickupTimer<=0){spawnPickup();state.pickupTimer=rand(3.8,6.8)}

  for(const d of state.defenders){
    if(d.dead)continue;
    d.phase+=dt*4;d.stun=Math.max(0,d.stun-dt);
    if(d.stun<=0){
      const tx=player.x+(d.type==='speedster'?35:0),ty=player.y+Math.sin(d.phase)*10;
      const vx=tx-d.x,vy=ty-d.y,dl=Math.hypot(vx,vy)||1;
      d.x+=(vx/dl)*d.speed*dt;d.y+=(vy/dl)*d.speed*.84*dt;
      if(d.type==='ref'){d.flagCD-=dt;if(d.flagCD<=0&&d.x>player.x+100){d.flagCD=99;state.shockwaves.push({x:d.x,y:d.y,r:4,max:16,life:2,color:PALETTE.yellow,flag:true,vx:-250})}}
    }
    if(circleHit(player,d)){
      const powered=player.specialTime>0;
      if(player.smash>0||powered){
        d.hp-=Math.ceil(c.power*(player.smash>0?1.2:1.5));
        if(d.hp<=0)defenderKO(d,powered?350:0);
        else{d.x+=55;d.stun=.4;state.shake=5;burst(d.x,d.y,PALETTE.pink,8,.7)}
      }else tackle(d);
    }
  }

  for(const s of state.shockwaves){
    if(s.flag){s.x+=s.vx*dt;if(Math.hypot(s.x-player.x,s.y-player.y)<player.r+12){s.life=0;if(player.invuln<=0){state.hp-=8;state.banner='BOBBY FLAG // -8 HP';state.bannerTime=.55;state.shake=5}}}
    else{s.r=lerp(s.r,s.max,.16)}
    s.life-=dt;
  }

  for(const p of state.pickups){
    p.x-=45*dt;p.spin+=dt*6;
    if(circleHit(player,p)){
      p.x=-999;
      if(p.type==='juice'){state.hp=clamp(state.hp+24,0,c.hp);state.meter=clamp(state.meter+25,0,100);state.score+=700;state.banner='SKULL JUICE';burst(player.x,player.y,PALETTE.green,12)}
      else{state.meter=clamp(state.meter+45,0,100);state.score+=1200;player.dash=Math.max(player.dash,1.1);state.banner='MUTANT LOOPS RUSH';burst(player.x,player.y,PALETTE.pink,14)}
      state.bannerTime=.7;tone(660,.06);setTimeout(()=>tone(880,.08),60);
    }
  }

  for(const p of state.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97}

  state.defenders=state.defenders.filter(d=>!d.dead&&d.x>-80&&d.y>FIELD.top-70&&d.y<FIELD.bottom+70);
  state.pickups=state.pickups.filter(p=>p.x>-80);
  state.particles=state.particles.filter(p=>p.life>0);
  state.shockwaves=state.shockwaves.filter(s=>s.life>0&&s.x>-80);

  // First-down line crossed.
  if(state.fieldYards-state.seriesStart>=20&&state.firstDownTime<=0){
    state.firstDownTime=.8;state.down=1;state.seriesStart=state.fieldYards;state.toGo=20;state.score+=1000;state.banner='FIRST DOWN!';state.bannerTime=.7;tone(520,.07);
  }
  state.firstDownTime=Math.max(0,state.firstDownTime-dt);
  syncUI();
}

function syncUI(){
  UI.score.textContent=pad(state.score);UI.down.textContent=`${state.down} & ${Math.ceil(state.toGo)}`;
  UI.field.textContent=`${Math.floor(state.fieldYards)} YD`;UI.hp.textContent=Math.max(0,Math.ceil(state.hp));
  UI.meter.textContent=`${Math.floor(state.meter)}%`;UI.status.textContent=state.paused?'PAUSED':`DRIVE ${state.drive}`;
  UI.special.classList.toggle('ready',state.meter>=100);UI.special.textContent=state.meter>=100?`⚡ ${current().special}`:`⚡ MUTATION ${Math.floor(state.meter)}%`;
}

function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function txt(t,x,y,s=22,c='#fff',a='left'){ctx.fillStyle=c;ctx.font=`900 ${s}px "Barlow Condensed",Impact,sans-serif`;ctx.textAlign=a;ctx.textBaseline='middle';ctx.fillText(t,Math.round(x),Math.round(y))}
function shadow(t,x,y,s,c,a='left'){txt(t,x+3,y+3,s,'rgba(0,0,0,.75)',a);txt(t,x,y,s,c,a)}

function drawField(){
  if(ready('stadium')){
    ctx.drawImage(ASSETS.stadium,0,0,W,H);
    // Slight dark veil keeps gameplay sprites readable without killing the stadium art.
    ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(0,0,W,H);
  }else{
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080511');g.addColorStop(.24,'#171124');g.addColorStop(.25,'#102d18');g.addColorStop(1,'#0b3c1b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<40;i++){const x=(i*83+state.crowd)%W;rect(x,55+(i%5)*8,3,3,i%3===0?PALETTE.pink:i%3===1?PALETTE.green:PALETTE.blue)}
    rect(FIELD.left,FIELD.top,FIELD.right-FIELD.left,FIELD.bottom-FIELD.top,'rgba(18,92,38,.72)');
  }
  for(let i=-2;i<14;i++){
    const x=FIELD.left+i*80-(state.worldScroll%80);
    rect(x,FIELD.top,2,FIELD.bottom-FIELD.top,'rgba(255,255,255,.32)');
    txt(String(((i+2)*10)%100),x+5,FIELD.bottom-18,12,'rgba(255,255,255,.42)');
  }
  // lanes
  for(let i=1;i<5;i++)rect(FIELD.left,FIELD.top+i*(FIELD.bottom-FIELD.top)/5,FIELD.right-FIELD.left,1,'rgba(255,255,255,.08)');
  // first-down and goal markers
  const firstX=clamp(FIELD.left+((state.seriesStart+20-state.fieldYards)/20)*150+300,FIELD.left,FIELD.right);
  rect(firstX,FIELD.top,3,FIELD.bottom-FIELD.top,'rgba(255,229,59,.65)');
  rect(FIELD.right-8,FIELD.top,8,FIELD.bottom-FIELD.top,'rgba(255,45,149,.55)');
}

function drawPlayer(){
  const c=current();
  if(player.invuln>0&&Math.floor(state.time*14)%2===0)return;
  for(const t of player.trail){ctx.globalAlpha=clamp(t.life/.28,0,.35);rect(t.x-8,t.y-8,16,16,t.color);t.life-=.016}ctx.globalAlpha=1;
  if(player.specialTime>0){ctx.save();ctx.shadowColor=c.color;ctx.shadowBlur=30;ctx.strokeStyle=c.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x,player.y,player.r+12+Math.sin(state.time*16)*4,0,TWO_PI);ctx.stroke();ctx.restore()}

  const moving=Math.hypot(player.vx,player.vy)>22 || player.dash>0;
  const pose=SHEET_POSES[c.id][moving?'run':'idle'];
  const sheetKey=c.id==='dex'?'dexSheet':c.id==='nikki'?'nikkiSheet':'bruiserSheet';
  const scale=c.id==='mack'?1.12:1;
  const drawW=(moving?112:82)*scale;
  const drawH=(moving?100:118)*scale;
  const flip=player.vx< -8;

  if(!sheetArt(sheetKey,...pose,player.x-drawW/2,player.y-drawH/2,drawW,drawH,1,flip)){
    ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(0,0,player.r,0,TWO_PI);ctx.fill();
    rect(-player.r,-8,player.r*2,16,'#0a0a0c');txt(String(c.no),0,1,22,c.accent,'center');ctx.restore();
  }

  if(player.smash>0){ctx.strokeStyle=PALETTE.pink;ctx.lineWidth=5;ctx.beginPath();ctx.arc(player.x+player.r,player.y,24,0,TWO_PI);ctx.stroke()}
}
function drawDefender(d){
  // Ref remains a clean fallback marker until Bobby gets his own TB94 sheet.
  if(d.type==='ref'){
    ctx.fillStyle=PALETTE.yellow;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TWO_PI);ctx.fill();
    txt('$',d.x,d.y,17,'#050609','center');return;
  }

  const pose=SHEET_POSES.defender.run;
  const speedster=d.type==='speedster';
  const w=speedster?78:100,h=speedster?82:104;
  ctx.save();
  if(speedster){ctx.globalAlpha=.92;ctx.filter='brightness(1.15) saturate(1.15)'}
  const ok=sheetArt('bruiserSheet',...pose,d.x-w/2,d.y-h/2,w,h,1,true);
  ctx.restore();
  if(ok)return;

  const c=speedster?PALETTE.blue:PALETTE.pink;
  ctx.fillStyle=c;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,TWO_PI);ctx.fill();
  txt('99',d.x,d.y,17,'#050609','center');
}
function drawPickup(p){
  const y=p.y+Math.sin(p.spin)*5,k=p.type==='juice'?'skullJuice':'mutantLoops';
  if(art(k,p.x-25,y-30,50,60))return;
  ctx.save();ctx.shadowColor=p.type==='juice'?PALETTE.green:PALETTE.pink;ctx.shadowBlur=16;
  rect(p.x-12,y-15,24,30,p.type==='juice'?PALETTE.green:PALETTE.pink);txt(p.type==='juice'?'SJ':'ML',p.x,y,14,'#07100a','center');ctx.restore();
}
function drawEffects(){
  for(const s of state.shockwaves){
    ctx.globalAlpha=clamp(s.life/.5,0,1);ctx.strokeStyle=s.color;ctx.lineWidth=s.flag?3:5;
    if(s.flag){rect(s.x-9,s.y-6,18,12,s.color)}else{ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TWO_PI);ctx.stroke()}
  }ctx.globalAlpha=1;
  for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1;
}
function drawHUD(){
  rect(16,14,420,78,'rgba(0,0,0,.62)');rect(445,14,499,78,'rgba(0,0,0,.62)');
  const c=current();txt(`${c.name} #${c.no}`,28,34,22,c.color);txt(c.desc,28,61,15,'#fff');
  txt(`HP ${Math.max(0,Math.ceil(state.hp))}`,250,34,18,'#fff');rect(300,27,120,14,'rgba(255,255,255,.13)');rect(303,30,114*clamp(state.hp/c.hp,0,1),8,state.hp>35?PALETTE.green:PALETTE.pink);
  txt(`MUTATION ${Math.floor(state.meter)}%`,250,61,16,PALETTE.yellow);
  shadow(`SCORE ${pad(state.score)}`,930,34,24,'#fff','right');shadow(`DOWN ${state.down} // ${Math.ceil(state.toGo)} TO GO`,930,62,18,PALETTE.green,'right');
  if(state.multiplier>1)txt(`COMBO x${state.multiplier.toFixed(1)}`,W/2,101,18,PALETTE.pink,'center');
  if(state.bannerTime>0){rect(W/2-230,100,460,52,'rgba(0,0,0,.7)');shadow(state.banner,W/2,127,28,state.banner.includes('MUTATION')||state.banner.includes('VOLTAGE')?PALETTE.yellow:'#fff','center')}
}
function drawBoot(){
  drawField();
  rect(0,0,W,H,'rgba(0,0,0,.56)');
  rect(0,0,W,92,'rgba(0,0,0,.62)');
  shadow("TITAN BALL '94",W/2,142,78,PALETTE.pink,'center');
  shadow('16-BIT MUTATION ENGINE',W/2,206,23,PALETTE.green,'center');

  // Animated Mega Drive-era chrome bands.
  for(let i=0;i<7;i++){
    const yy=260+i*8;
    rect(W/2-250,yy,500,3,i%2?PALETTE.blue:PALETTE.pink);
  }
  txt('TITAN CITY SPORTS DIVISION',W/2,335,18,'#fff','center');
  txt('BIGGER HITS // MORE MUTATIONS // ZERO RULES',W/2,371,20,PALETTE.green,'center');

  const blink=Math.floor(PRESENTATION.bootBlink*2.2)%2===0;
  if(blink) shadow('PRESS START // INSERT MUTATION',W/2,435,29,PALETTE.yellow,'center');
  txt(`© 1994 TITAN CITY GAMES // HIGH ${pad(save.high)}`,W/2,495,15,'rgba(255,255,255,.68)','center');
}

function statBar(label,val,x,y,color){
  txt(label,x,y,13,'#aaa');
  rect(x+62,y-7,115,10,'rgba(255,255,255,.12)');
  rect(x+64,y-5,111*clamp(val,0,1),6,color);
}

function drawSelect(){
  drawField();rect(0,0,W,H,'rgba(0,0,0,.66)');
  shadow('CHOOSE YOUR MUTANT',W/2,54,46,'#fff','center');
  txt('SELECT PLAYER // TAP AGAIN TO CONFIRM',W/2,91,17,PALETTE.green,'center');

  const startX=72,cardW=250,gap=33,y=112,h=350;
  ROSTER.forEach((c,i)=>{
    const x=startX+i*(cardW+gap),sel=i===state.select;
    rect(x,y,cardW,h,sel?'rgba(10,22,15,.94)':'rgba(3,4,7,.82)');
    ctx.strokeStyle=sel?c.color:'rgba(255,255,255,.16)';
    ctx.lineWidth=sel?4:1;ctx.strokeRect(x,y,cardW,h);

    if(sel){
      ctx.save();ctx.globalAlpha=.14+.08*Math.sin(PRESENTATION.selectPulse*7);
      rect(x+4,y+4,cardW-8,h-8,c.color);ctx.restore();
    }

    const key=c.id==='dex'?'dexSheet':c.id==='nikki'?'nikkiSheet':'bruiserSheet';
    const pose=SHEET_POSES[c.id].portrait;
    sheetArt(key,...pose,x+34,y+18,182,150,1,false);

    shadow(c.name,x+cardW/2,y+188,25,c.color,'center');
    txt(`#${c.no}`,x+cardW/2,y+217,27,'#fff','center');
    txt(c.desc,x+cardW/2,y+242,13,'#bbb','center');

    statBar('SPEED',c.speed/300,x+30,y+270,PALETTE.blue);
    statBar('POWER',c.power/1.6,x+30,y+296,PALETTE.pink);
    statBar('HP',c.hp/140,x+30,y+322,PALETTE.green);

    txt(c.special,x+cardW/2,y+345,15,PALETTE.yellow,'center');
  });

  const c=current();
  shadow(`SELECTED // ${c.name} #${c.no}`,W/2,486,22,c.color,'center');
  txt('◀  MOVE  ▶     A / ENTER CONFIRM',W/2,515,15,'#aaa','center');
}

function drawIntro(){
  drawField();rect(0,0,W,H,'rgba(0,0,0,.62)');
  const c=current(),key=c.id==='dex'?'dexSheet':c.id==='nikki'?'nikkiSheet':'bruiserSheet';
  const pose=SHEET_POSES[c.id].run;
  sheetArt(key,...pose,W/2-118,118,236,200,1,false);
  shadow(`${c.name} #${c.no}`,W/2,350,52,c.color,'center');
  txt(c.special,W/2,395,22,PALETTE.yellow,'center');
  shadow('ENTERS TITAN CITY STADIUM',W/2,434,24,'#fff','center');
  txt('DRIVE 1 // NO REFUNDS // NO MERCY',W/2,475,18,PALETTE.green,'center');
}

function drawGameOver(){
  drawField();rect(0,0,W,H,'rgba(0,0,0,.76)');shadow('GAME OVER',W/2,165,72,PALETTE.pink,'center');
  shadow(`SCORE ${pad(state.score)}`,W/2,245,31,'#fff','center');txt(`DRIVE ${state.drive} // ${Math.floor(state.totalYards)} TOTAL YARDS`,W/2,286,21,PALETTE.green,'center');
  rect(W/2-220,330,440,72,'rgba(8,12,10,.92)');ctx.strokeStyle='rgba(138,255,43,.45)';ctx.strokeRect(W/2-220,330,440,72);
  shadow('INSERT MUTATION // TAP TO RETRY',W/2,366,25,PALETTE.yellow,'center');
}
function render(){
  const sx=state.shake>0?Math.round(rand(-state.shake,state.shake)):0,sy=state.shake>0?Math.round(rand(-state.shake*.5,state.shake*.5)):0;
  ctx.save();ctx.translate(sx,sy);
  if(state.mode==='boot')drawBoot();
  else if(state.mode==='select')drawSelect();
  else if(state.mode==='intro')drawIntro();
  else if(state.mode==='gameover')drawGameOver();
  else{
    drawField();for(const p of state.pickups)drawPickup(p);for(const d of state.defenders)drawDefender(d);drawPlayer();drawEffects();drawHUD();
    if(state.paused){rect(0,0,W,H,'rgba(0,0,0,.62)');shadow('PAUSED',W/2,H/2-10,62,PALETTE.yellow,'center');txt('PRESS P / START',W/2,H/2+48,22,'#fff','center')}
  }
  if(state.flash>0){ctx.globalAlpha=clamp(state.flash*2,0,.55);rect(0,0,W,H,'#fff');ctx.globalAlpha=1}
  ctx.restore();
}
function loop(now){
  const dt=Math.min(.033,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(loop);
}
syncUI();requestAnimationFrame(loop);
})();