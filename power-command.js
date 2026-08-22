(() => {
'use strict';
const c=document.getElementById('game'),ctx=c.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
const W=c.width,H=c.height,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a);
const input={up:0,down:0,left:0,right:0,fire:0,boost:0};
const ship={x:0,y:0,vx:0,vy:0,angle:0,shield:100,heat:0};
const state={mode:'title',time:0,last:performance.now(),score:0,shots:[],particles:[],camX:0,camY:0,sound:true,fireCD:0,shake:0};
const title=new Image();title.src='assets/images/ttd-power-command/power-command-concept.png';

let ac=null,master=null;
function audioInit(){if(ac)return;ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.45;master.connect(ac.destination)}
function beep(f=220,d=.05,type='square',g=.04){if(!state.sound)return;audioInit();let o=ac.createOscillator(),ga=ac.createGain();o.type=type;o.frequency.value=f;ga.gain.value=g;ga.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);o.connect(ga);ga.connect(master);o.start();o.stop(ac.currentTime+d)}
function blast(){beep(115,.035,'sawtooth',.05);setTimeout(()=>beep(74,.04,'square',.035),10)}
function boostSfx(){beep(310,.07,'sawtooth',.025);setTimeout(()=>beep(460,.08,'square',.02),50)}
function start(){state.mode='play';beep(196,.07);setTimeout(()=>beep(294,.07),70);setTimeout(()=>beep(440,.12),140)}

function hash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
function terrain(wx,wy){
  const a=Math.sin(wx*.0007)+Math.cos(wy*.00075)+Math.sin((wx+wy)*.00036)*.8;
  const b=Math.sin(wx*.0019+1.7)*.45+Math.cos(wy*.0021-2.2)*.4;
  const n=(hash(Math.floor(wx/180),Math.floor(wy/180))-.5)*.45;
  return a+b+n;
}
function drawWorld(){
  const tile=56;
  for(let sy=-tile;sy<H+tile;sy+=tile){
    for(let sx=-tile;sx<W+tile;sx+=tile){
      const wx=state.camX-W/2+sx,wy=state.camY-H/2+sy,t=terrain(wx,wy);
      let col;
      if(t<-.75)col='#074b7d';
      else if(t<-.48)col='#0e76a4';
      else if(t<-.30)col='#31b7c8';
      else if(t<-.16)col='#d0b45b';
      else if(t<.48)col=t>.22?'#305f25':'#2c7a35';
      else if(t<.85)col='#6c6e3f';
      else col='#97958a';
      ctx.fillStyle=col;ctx.fillRect(sx,sy,tile+1,tile+1);
      const speck=hash(Math.floor(wx/tile),Math.floor(wy/tile));
      ctx.globalAlpha=.16;
      ctx.fillStyle=speck>.66?'#d9e8cc':'#00150d';
      ctx.fillRect(sx+8+(speck*31)%30,sy+9+(speck*53)%27,4,4);
      ctx.globalAlpha=1;
    }
  }
  // clouds
  ctx.save();ctx.globalAlpha=.12;
  for(let i=0;i<18;i++){
    let x=((i*223-state.camX*.08)%1500+1500)%1500-110;
    let y=((i*149-state.camY*.06)%900+900)%900-90;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y,100+(i%3)*45,30+(i%2)*16,0,0,TAU);ctx.fill();
  }
  ctx.restore();
}
function drawShip(){
  ctx.save();ctx.translate(W/2,H/2);ctx.rotate(ship.angle);
  // shadow
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(-6,14,62,26,0,0,TAU);ctx.fill();ctx.restore();
  // engines
  const flame=18+Math.sin(state.time*34)*9+(input.boost?28:0);
  ctx.shadowColor='#ff2d95';ctx.shadowBlur=18;ctx.fillStyle='#ff2d95';
  ctx.beginPath();ctx.moveTo(-58,-18);ctx.lineTo(-58-flame,-11);ctx.lineTo(-58,-4);ctx.fill();
  ctx.beginPath();ctx.moveTo(-58,18);ctx.lineTo(-58-flame,11);ctx.lineTo(-58,4);ctx.fill();
  // crazy TTD hull
  ctx.shadowBlur=0;ctx.fillStyle='#11151a';ctx.strokeStyle='#8aff2b';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(74,0);ctx.lineTo(30,-17);ctx.lineTo(8,-44);ctx.lineTo(-10,-28);ctx.lineTo(-58,-34);ctx.lineTo(-44,-10);ctx.lineTo(-72,0);ctx.lineTo(-44,10);ctx.lineTo(-58,34);ctx.lineTo(-10,28);ctx.lineTo(8,44);ctx.lineTo(30,17);ctx.closePath();ctx.fill();ctx.stroke();
  // wing armour
  ctx.fillStyle='#20262d';ctx.strokeStyle='#ff2d95';ctx.lineWidth=3;
  ctx.fillRect(-20,-39,38,12);ctx.strokeRect(-20,-39,38,12);ctx.fillRect(-20,27,38,12);ctx.strokeRect(-20,27,38,12);
  // cockpit
  ctx.shadowColor='#39d7ff';ctx.shadowBlur=15;ctx.fillStyle='#39d7ff';ctx.beginPath();ctx.ellipse(22,0,18,11,0,0,TAU);ctx.fill();ctx.shadowBlur=0;
  // skull reactor
  ctx.fillStyle='#8aff2b';ctx.beginPath();ctx.arc(-18,0,11,0,TAU);ctx.fill();ctx.fillStyle='#050609';ctx.fillRect(-25,-2,5,4);ctx.fillRect(-16,-2,5,4);ctx.fillRect(-20,5,4,4);
  // nose cannons
  ctx.fillStyle='#ff2d95';ctx.fillRect(42,-12,38,5);ctx.fillRect(42,7,38,5);
  ctx.restore();
}
function fire(){
  if(state.fireCD>0)return;state.fireCD=.105;
  const a=ship.angle,cs=Math.cos(a),sn=Math.sin(a);
  for(const off of [-10,10]){
    state.shots.push({x:ship.x+cs*70-sn*off,y:ship.y+sn*70+cs*off,vx:cs*850,vy:sn*850,life:1.25});
  }
  blast();
}
function update(dt){
  state.time+=dt;state.shake=Math.max(0,state.shake-dt*25);state.fireCD=Math.max(0,state.fireCD-dt);
  if(state.mode!=='play')return;
  let dx=input.right-input.left,dy=input.down-input.up,l=Math.hypot(dx,dy);
  if(l){dx/=l;dy/=l}
  let accel=input.boost?680:410,max=input.boost?560:350;
  ship.vx+=dx*accel*dt;ship.vy+=dy*accel*dt;
  ship.vx*=Math.pow(.992,dt*60);ship.vy*=Math.pow(.992,dt*60);
  let sp=Math.hypot(ship.vx,ship.vy);if(sp>max){ship.vx*=max/sp;ship.vy*=max/sp}
  if(sp>8)ship.angle=lerp(ship.angle,Math.atan2(ship.vy,ship.vx),.11);
  ship.x+=ship.vx*dt;ship.y+=ship.vy*dt;
  state.camX=lerp(state.camX,ship.x,.09);state.camY=lerp(state.camY,ship.y,.09);
  if(input.fire)fire();
  for(const s of state.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt}
  state.shots=state.shots.filter(s=>s.life>0);
  if(input.boost&&Math.random()<.55){
    state.particles.push({x:ship.x-Math.cos(ship.angle)*65+rand(-8,8),y:ship.y-Math.sin(ship.angle)*65+rand(-8,8),vx:-Math.cos(ship.angle)*rand(80,180),vy:-Math.sin(ship.angle)*rand(80,180),life:.35});
  }
  for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}
  state.particles=state.particles.filter(p=>p.life>0);
}
function drawShots(){
  const ca=state.camX,cb=state.camY;
  ctx.save();ctx.shadowColor='#ff2d95';ctx.shadowBlur=16;ctx.strokeStyle='#ff2d95';ctx.lineWidth=5;
  for(const s of state.shots){let x=W/2+(s.x-ca),y=H/2+(s.y-cb);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ship.angle)*24,y-Math.sin(ship.angle)*24);ctx.stroke()}
  ctx.restore();
}
function drawParticles(){ctx.save();ctx.fillStyle='#8aff2b';for(const p of state.particles){ctx.globalAlpha=clamp(p.life/.35,0,1);ctx.fillRect(W/2+(p.x-state.camX)-3,H/2+(p.y-state.camY)-3,6,6)}ctx.restore()}
function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,76);ctx.strokeStyle='rgba(138,255,43,.35)';ctx.strokeRect(0,0,W,76);
  ctx.font='900 28px monospace';ctx.fillStyle='#8aff2b';ctx.fillText('TTD POWER COMMAND',24,34);
  ctx.font='700 15px monospace';ctx.fillStyle='#ff2d95';ctx.fillText('FOUNDATION // INFINITE EARTH',25,58);
  ctx.font='900 20px monospace';ctx.fillStyle='#fff';ctx.fillText(`SCORE ${String(state.score).padStart(6,'0')}`,410,30);
  ctx.fillStyle='#39d7ff';ctx.fillText(`SPD ${Math.round(Math.hypot(ship.vx,ship.vy))}`,410,56);
  ctx.fillStyle='#fff';ctx.fillText(`X ${Math.round(ship.x)}  Y ${Math.round(ship.y)}`,760,30);
  ctx.fillStyle='#ffe53b';ctx.fillText(state.sound?'SFX ONLINE':'SFX MUTED',760,56);
  // radar
  ctx.strokeStyle='#8aff2b';ctx.strokeRect(1100,92,150,150);ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(1101,93,148,148);
  ctx.strokeStyle='rgba(138,255,43,.25)';ctx.beginPath();ctx.arc(1175,167,58,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(1110,167);ctx.lineTo(1240,167);ctx.moveTo(1175,102);ctx.lineTo(1175,232);ctx.stroke();
  ctx.fillStyle='#ff2d95';ctx.beginPath();ctx.arc(1175,167,5,0,TAU);ctx.fill();
  ctx.font='700 12px monospace';ctx.fillStyle='#8aff2b';ctx.fillText('GLOBAL RADAR',1110,108);
}
function render(){
  if(state.mode==='title'){
    if(title.complete && title.naturalWidth>0){ctx.drawImage(title,0,0,W,H)}else{ctx.fillStyle='#050609';ctx.fillRect(0,0,W,H)}
    ctx.fillStyle='rgba(0,0,0,.50)';ctx.fillRect(0,0,W,H);
    ctx.font='900 80px Impact, sans-serif';ctx.textAlign='center';ctx.fillStyle='#8aff2b';ctx.fillText('TTD POWER COMMAND',W/2,260);
    ctx.font='900 28px monospace';ctx.fillStyle='#ff2d95';ctx.fillText('INFINITE EARTH FOUNDATION',W/2,315);
    if(Math.floor(state.time*2)%2===0){ctx.fillStyle='#ffe53b';ctx.fillText('PRESS START',W/2,405)}
    ctx.font='700 16px monospace';ctx.fillStyle='#fff';ctx.fillText('FLY // BOOST // DRRRRRT // SOUND FX',W/2,455);ctx.textAlign='left';
    return;
  }
  let sx=state.shake?rand(-state.shake,state.shake):0,sy=state.shake?rand(-state.shake,state.shake):0;
  ctx.save();ctx.translate(sx,sy);drawWorld();drawParticles();drawShots();drawShip();drawHUD();ctx.restore();
}
function loop(now){let dt=Math.min(.033,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(loop)}
function hold(id,key){const el=document.getElementById(id),off=()=>{input[key]=0;el.classList.remove('active')};el.addEventListener('pointerdown',e=>{e.preventDefault();input[key]=1;el.classList.add('active');if(key==='boost')boostSfx()});['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(v=>el.addEventListener(v,off))}
hold('up','up');hold('down','down');hold('left','left');hold('right','right');hold('fire','fire');hold('boost','boost');
document.getElementById('stop').addEventListener('pointerdown',()=>{ship.vx=ship.vy=0});
document.getElementById('start').addEventListener('pointerdown',()=>{if(state.mode!=='play')start()});
document.getElementById('sound').addEventListener('pointerdown',e=>{state.sound=!state.sound;e.currentTarget.textContent=state.sound?'SOUND ON':'SOUND OFF';if(state.sound){audioInit();beep(440,.06)}});
canvas.addEventListener('pointerdown',()=>{if(state.mode==='title')start()});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(state.mode==='title'&&(e.code==='Enter'||e.code==='Space'))return start();if(e.code==='ArrowUp'||e.code==='KeyW')input.up=1;if(e.code==='ArrowDown'||e.code==='KeyS')input.down=1;if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=1;if(e.code==='ArrowRight'||e.code==='KeyD')input.right=1;if(e.code==='Space'||e.code==='KeyX')input.fire=1;if(e.code==='ShiftLeft'||e.code==='KeyC'){input.boost=1;boostSfx()}});
window.addEventListener('keyup',e=>{if(e.code==='ArrowUp'||e.code==='KeyW')input.up=0;if(e.code==='ArrowDown'||e.code==='KeyS')input.down=0;if(e.code==='ArrowLeft'||e.code==='KeyA')input.left=0;if(e.code==='ArrowRight'||e.code==='KeyD')input.right=0;if(e.code==='Space'||e.code==='KeyX')input.fire=0;if(e.code==='ShiftLeft'||e.code==='KeyC')input.boost=0});
requestAnimationFrame(loop);
})();