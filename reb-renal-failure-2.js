(() => {
'use strict';

const canvas=document.getElementById('rebCanvas'); if(!canvas)return;
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;
canvas.style.touchAction='none';

const W=canvas.width,H=canvas.height,GROUND=438,TWO=Math.PI*2;
const UI={
  score:document.getElementById('rebScore'),distance:document.getElementById('rebDistance'),hp:document.getElementById('rebHp'),
  ammo:document.getElementById('rebAmmo'),rage:document.getElementById('rebRage'),status:document.getElementById('rebStatus'),
  jump:document.getElementById('rebJump'),fire:document.getElementById('rebFire'),rageBtn:document.getElementById('rebRageBtn'),
  stageLine:document.getElementById('rebStageLine'),missionTitle:document.getElementById('rebMissionTitle'),missionText:document.getElementById('rebMissionText')
};

const SAVE='ttd-reb-renal-failure-v1-highscore';
const ART_PATH='assets/images/reb-renal-failure/';

// Stage 1 filenames are untouched. All expansion art is optional: missing assets automatically fall back to Stage 1 art.
const ART_FILES={
  reb:'reb.png',shoot:'reb-shoot.png',creatine:'creatine.png',serum:'serum.png',ammo:'ammo.PNG',cover:'cover.jpg',title:'title-poster.png',
  trooper:'enemy-trooper.png',hound:'warhound.png',gunship:'gunship.png',jungle:'jungle.png',floor:'jungle-floor.png',
  hardcaseCameo:'cameo-hardcase87.png',nikkiCameo:'cameo-nikki-nitro.png',
  s2bg:'stage-2-war-zone.png',s2warriorA:'stage-2-warrior-a.png',s2warriorB:'stage-2-warrior-b.png',s2brute:'stage-2-brute.png',s2animal:'stage-2-mutant-animal.png',s2air:'stage-2-airborne.png',
  s3bg:'stage-3-zoo-escape.png',s3warriorA:'stage-3-warrior-a.png',s3warriorB:'stage-3-warrior-b.png',s3brute:'stage-3-brute.png',s3animal:'stage-3-mutant-animal.png',s3air:'stage-3-airborne.png',
  s4bg:'stage-4-nephro-ward.png',s4warriorA:'stage-4-warrior-a.png',s4warriorB:'stage-4-warrior-b.png',s4brute:'stage-4-brute.png',s4animal:'stage-4-mutant-animal.png',s4air:'stage-4-airborne.png',
  s5bg:'stage-5-cardio-ward.png',s5warriorA:'stage-5-warrior-a.png',s5warriorB:'stage-5-warrior-b.png',s5brute:'stage-5-brute.png',s5animal:'stage-5-mutant-animal.png',s5air:'stage-5-airborne.png',
  s6bg:'stage-6-beach-sea-assault.png',s6warriorA:'stage-6-warrior-a.png',s6warriorB:'stage-6-warrior-b.png',s6brute:'stage-6-brute.png',s6animal:'stage-6-mutant-animal.png',s6air:'stage-6-airborne.png',
  s7bg:'stage-7-toxic-factory.png',s7warriorA:'stage-7-warrior-a.png',s7warriorB:'stage-7-warrior-b.png',s7brute:'stage-7-brute.png',s7animal:'stage-7-mutant-animal.png',s7air:'stage-7-airborne.png',
  s8bg:'stage-8-renal-fortress.png',s8warriorA:'stage-8-warrior-a.png',s8warriorB:'stage-8-warrior-b.png',s8brute:'stage-8-brute.png',s8animal:'stage-8-mutant-animal.png',s8air:'stage-8-airborne.png'
};
const ART={};
for(const [k,f] of Object.entries(ART_FILES)){const i=new Image();i.src=ART_PATH+f;ART[k]=i}
const ready=k=>ART[k]?.complete&&ART[k].naturalWidth>0;
function art(k,x,y,w,h,a=1){if(!ready(k))return false;ctx.save();ctx.globalAlpha=a;ctx.drawImage(ART[k],Math.round(x),Math.round(y),Math.round(w),Math.round(h));ctx.restore();return true}
function artAny(keys,x,y,w,h,a=1){for(const k of keys){if(art(k,x,y,w,h,a))return true}return false}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const pad=n=>Math.max(0,Math.floor(n)).toString().padStart(6,'0');
let audio=null;
function tone(f=220,d=.05,type='square',gain=.018){try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+d);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch(e){}}
function gunSound(){tone(rand(70,95),.025,'square',.015)}
function boom(){tone(62,.10,'sawtooth',.035);setTimeout(()=>tone(42,.11,'square',.022),30)}
function buzz(ms=15){try{navigator.vibrate?.(ms)}catch(e){}}
let high=Number(localStorage.getItem(SAVE)||0);

// Stage 1 remains mechanically identical to the production build.
const STAGES=[
  {id:1,name:'JUNGLE RENAL WARZONE',subtitle:'JUNGLE DEPLOYMENT',legacy:true,bg:'jungle',floor:'floor',airName:'NEPHROLOGY GUNSHIP',airType:'GUNSHIP',airHp:28,bossAt:650,length:1000,speed:235,spawn:[.75,1.35],brief:'REB has entered a toxic jungle where mutant troopers, bio-warhounds and a nephrology gunship have made the catastrophic mistake of standing downrange. Collect ammo. Hoard creatine. Trigger RENAL RAGE. Medical advice has been ignored.'},
  {id:2,name:'WAR ZONE',subtitle:'RENAL REVENGE',bg:'s2bg',warriorA:'s2warriorA',warriorB:'s2warriorB',brute:'s2brute',animal:'s2animal',air:'s2air',airName:'ATTACK CHOPPER',airType:'CHOPPER',airHp:34,bossAt:640,length:1000,speed:248,spawn:[.68,1.20],brief:'The jungle was only triage. REB enters a bombed-out war zone packed with two assault squads, one armoured brute, one mutated war-beast and an attack chopper with terrible judgement.'},
  {id:3,name:'ZOO ESCAPE',subtitle:'ANIMAL CONTROL FAILED',bg:'s3bg',warriorA:'s3warriorA',warriorB:'s3warriorB',brute:'s3brute',animal:'s3animal',air:'s3air',airName:'MUTATED AIRBORNE',airType:'FLYER',airHp:38,bossAt:630,length:1000,speed:258,spawn:[.63,1.12],brief:'Titan City Zoo has lost containment. Armed keepers, escaped brutes and something formerly listed as a harmless animal are now between REB and the exit. Airspace is also biologically compromised.'},
  {id:4,name:'NEPHRO WARD',subtitle:'KIDNEY PANIC PROTOCOL',bg:'s4bg',warriorA:'s4warriorA',warriorB:'s4warriorB',brute:'s4brute',animal:'s4animal',air:'s4air',airName:'MED-EVAC GUNSHIP',airType:'GUNSHIP',airHp:42,bossAt:620,length:1000,speed:266,spawn:[.59,1.06],brief:'The nephrology ward has declared REB medically non-compliant. Two security teams, one dialysis brute, a mutant renal hound and an armed med-evac platform are enforcing the discharge plan.'},
  {id:5,name:'CARDIO WARD',subtitle:'HEART RATE: UNACCEPTABLE',bg:'s5bg',warriorA:'s5warriorA',warriorB:'s5warriorB',brute:'s5brute',animal:'s5animal',air:'s5air',airName:'CARDIAC INTERCEPTOR',airType:'PLANE',airHp:46,bossAt:610,length:1000,speed:276,spawn:[.55,1.00],brief:'Cardiology would like REB to reduce intensity. REB has declined. Armed orderlies, a hypertrophic brute, a mutant ward animal and a cardiac interceptor now attempt to enforce a reasonable training zone.'},
  {id:6,name:'BEACH / SEA ASSAULT',subtitle:'HYDRATION OPTIONAL',bg:'s6bg',warriorA:'s6warriorA',warriorB:'s6warriorB',brute:'s6brute',animal:'s6animal',air:'s6air',airName:'SEA STRIKE FIGHTER',airType:'PLANE',airHp:50,bossAt:600,length:1000,speed:286,spawn:[.52,.96],brief:'REB reaches the coast. Amphibious mutants, beach mercenaries and a sea-bred brute attack from the surf while a strike aircraft turns hydration into a tactical issue.'},
  {id:7,name:'TOXIC FACTORY',subtitle:'SUPPLEMENT PRODUCTION LINE',bg:'s7bg',warriorA:'s7warriorA',warriorB:'s7warriorB',brute:'s7brute',animal:'s7animal',air:'s7air',airName:'BIOHAZARD DRONE',airType:'UFO',airHp:56,bossAt:590,length:1000,speed:296,spawn:[.49,.91],brief:'The source of the fluorescent nonsense is finally visible. Factory shock troops, an industrial brute, a chemically improved animal and a hovering biohazard platform guard the production line.'},
  {id:8,name:'RENAL FORTRESS',subtitle:'FINAL RENAL COLLAPSE',bg:'s8bg',warriorA:'s8warriorA',warriorB:'s8warriorB',brute:'s8brute',animal:'s8animal',air:'s8air',airName:'RENAL OVERLORD UFO',airType:'UFO',airHp:68,bossAt:570,length:1100,speed:308,spawn:[.45,.86],brief:'The Renal Fortress is the end of the line. Every surviving mutant, one final brute, one impossible animal and the Renal Overlord air platform are waiting. Finish the campaign. Question the kidneys later.'}
];

const state={
  mode:'title',score:0,distance:0,hp:100,ammo:80,maxAmmo:130,renal:0,rageTime:0,fireHeld:false,fireCooldown:0,
  speed:235,time:0,last:performance.now(),spawnTimer:1.2,pickupTimer:2.8,specialTimer:10,shake:0,flash:0,banner:'',bannerTime:0,
  bullets:[],enemies:[],pickups:[],enemyShots:[],particles:[],stage:1,kills:0,stageKills:0,emergencyAmmoCooldown:0,
  airBossDefeated:false,missionComplete:0,stageClearTime:0,cameoTime:0,cameo:null,totalStages:STAGES.length
};
const player={x:148,y:GROUND-84,w:56,h:84,vy:0,onGround:true,invuln:0,shootPose:0};
const stage=()=>STAGES[state.stage-1]||STAGES[0];

function clearWorld(){for(const k of ['bullets','enemies','pickups','enemyShots','particles'])state[k].length=0}
function applyStageDom(){const s=stage();if(UI.stageLine)UI.stageLine.innerHTML=`STAGE ${s.id} // ${s.name}<br>DRRRRRT ENGINE V2.0 // RENAL REVENGE`;if(UI.missionTitle)UI.missionTitle.textContent=s.name;if(UI.missionText)UI.missionText.textContent=s.brief}
function reset(){
  Object.assign(state,{mode:'playing',score:0,distance:0,hp:100,ammo:80,renal:0,rageTime:0,fireHeld:false,fireCooldown:0,speed:235,time:0,spawnTimer:.9,pickupTimer:2.4,specialTimer:9,shake:0,flash:0,banner:'STAGE 1 // JUNGLE DEPLOYMENT',bannerTime:1.5,stage:1,kills:0,stageKills:0,emergencyAmmoCooldown:0,airBossDefeated:false,missionComplete:0,stageClearTime:0,cameoTime:0,cameo:null});
  clearWorld();Object.assign(player,{y:GROUND-player.h,vy:0,onGround:true,invuln:0,shootPose:0});applyStageDom();tone(196,.06);setTimeout(()=>tone(294,.06),65);setTimeout(()=>tone(392,.10),130);sync();
}
function beginStage(id){
  state.stage=clamp(id,1,STAGES.length);const s=stage();
  Object.assign(state,{mode:'playing',distance:0,rageTime:0,fireHeld:false,fireCooldown:0,speed:s.speed,spawnTimer:s.legacy?.9:.75,pickupTimer:2.4,specialTimer:s.legacy?9:7.5,shake:0,flash:.18,banner:`STAGE ${s.id} // ${s.subtitle}`,bannerTime:1.6,stageKills:0,emergencyAmmoCooldown:0,airBossDefeated:false,missionComplete:0,stageClearTime:0,cameoTime:0,cameo:null});
  // Reward survival without wiping the run: modest refill between stages.
  if(s.id>1){state.hp=clamp(state.hp+18,0,100);state.ammo=clamp(state.ammo+30,0,state.maxAmmo);state.score+=1500*s.id}
  clearWorld();Object.assign(player,{y:GROUND-player.h,vy:0,onGround:true,invuln:1.0,shootPose:0});applyStageDom();tone(220,.05);setTimeout(()=>tone(330,.06),60);setTimeout(()=>tone(440,.10),125);sync();
}
function start(){if(state.mode==='title'||state.mode==='gameover'||state.mode==='victory')reset()}
function jump(){if(state.mode!=='playing'){start();return}if(player.onGround&&state.missionComplete<=0){player.vy=-760;player.onGround=false;tone(320,.04)}}
function fireOnce(){if(state.mode!=='playing'){start();return}if(state.missionComplete>0)return;if(state.fireCooldown>0)return;
  if(state.ammo<=0){state.fireCooldown=.28;state.banner='CLICK CLICK // AMMO EMPTY';state.bannerTime=.40;tone(105,.035,'square',.012);setTimeout(()=>tone(82,.03,'square',.010),55);return}
  const rage=state.rageTime>0;state.fireCooldown=rage?.060:.100;state.ammo--;if(state.ammo===15){state.banner='LOW AMMO // FIND A CRATE';state.bannerTime=.65}
  player.shootPose=.12;state.bullets.push({x:player.x+91,y:player.y+28,w:22,h:5,vx:rage?980:820,damage:rage?3:1,life:rage?.66:.56});state.shake=Math.max(state.shake,rage?2.5:1.2);gunSound();if(Math.random()<.18)particles(player.x+94,player.y+31,'#ffe53b',3,.45)
}
function rage(){if(state.mode!=='playing'){start();return}if(state.renal>=100&&state.rageTime<=0){state.renal=0;state.rageTime=6;state.banner='RENAL RAGE // AMMO BURN ENGAGED';state.bannerTime=1.3;state.flash=.28;state.shake=9;buzz(40);tone(420,.11,'sawtooth',.03);setTimeout(()=>tone(650,.12,'square',.03),100);setTimeout(()=>tone(900,.14,'square',.025),200)}}
function bindTap(el,fn){if(!el)return;el.addEventListener('pointerdown',e=>{e.preventDefault();el.classList.add('active');fn()});for(const ev of ['pointerup','pointercancel','pointerleave'])el.addEventListener(ev,()=>el.classList.remove('active'))}
bindTap(UI.jump,jump);bindTap(UI.rageBtn,rage);
for(const el of [UI.jump,UI.fire,UI.rageBtn].filter(Boolean)){for(const ev of ['contextmenu','selectstart','dragstart'])el.addEventListener(ev,e=>e.preventDefault());el.addEventListener('touchstart',e=>{if(e.cancelable)e.preventDefault()},{passive:false})}
if(UI.fire){const stop=()=>{state.fireHeld=false;UI.fire.classList.remove('active')};UI.fire.addEventListener('pointerdown',e=>{e.preventDefault();try{UI.fire.setPointerCapture(e.pointerId)}catch(_e){}state.fireHeld=true;UI.fire.classList.add('active');fireOnce()});for(const ev of ['pointerup','pointercancel','lostpointercapture'])UI.fire.addEventListener(ev,stop)}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();start()});
const keys={};window.addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyX','KeyV','Enter'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='Space'||e.code==='ArrowUp')jump();else if(e.code==='KeyX')fireOnce();else if(e.code==='KeyV')rage();else if(e.code==='Enter')start()});window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',()=>{state.fireHeld=false;for(const k in keys)keys[k]=false});

function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function particles(x,y,color,count=9,power=1){for(let i=0;i<count;i++)state.particles.push({x,y,vx:rand(-210,210)*power,vy:rand(-260,60)*power,life:rand(.25,.72),max:.72,size:rand(2,6),color})}

function enemySpec(type){const level=Math.max(0,state.stage-1);const table={
  warriorA:{w:52,h:77,hp:2+Math.floor(level*.55),extra:rand(-10,45),shoot:rand(1.3,2.8),damage:20,score:350,renal:6},
  warriorB:{w:56,h:79,hp:3+Math.floor(level*.60),extra:rand(15,70),shoot:rand(1.1,2.3),damage:22,score:450,renal:7},
  brute:{w:78,h:100,hp:9+level*2,extra:-25,shoot:rand(1.6,2.7),damage:34,score:1500,renal:18},
  animal:{w:86,h:61,hp:4+Math.floor(level*.85),extra:120+level*7,shoot:999,damage:28,score:900,renal:14}
};return table[type]||table.warriorA}
function spawnEnemy(type){
  const s=stage();
  if(s.legacy){if(!type){const r=Math.random();type=r>.78?'animal':'warriorA'}if(type==='warriorA')state.enemies.push({type,x:W+50,y:GROUND-77,w:52,h:77,hp:2,maxHp:2,extra:rand(-10,45),shoot:rand(1.3,2.8),damage:20,score:350,renal:6});else if(type==='animal')state.enemies.push({type,x:W+70,y:GROUND-61,w:86,h:61,hp:4,maxHp:4,extra:120,shoot:999,damage:28,score:900,renal:14});else if(type==='air')state.enemies.push({type:'air',x:W+120,y:115,w:190,h:105,hp:28,maxHp:28,extra:-80,shoot:.9,boss:true,phase:0,damage:30,score:7500,renal:35});return}
  if(type==='air'){state.enemies.push({type:'air',x:W+120,y:112,w:190,h:105,hp:s.airHp,maxHp:s.airHp,extra:-80,shoot:Math.max(.48,.86-state.stage*.035),boss:true,phase:0,damage:30+state.stage*2,score:7500+state.stage*900,renal:35});return}
  if(!type){const r=Math.random();type=r<.44?'warriorA':r<.72?'warriorB':r<.86?'animal':'brute'}
  const sp=enemySpec(type);state.enemies.push({type,x:W+rand(45,95),y:GROUND-sp.h,w:sp.w,h:sp.h,hp:sp.hp,maxHp:sp.hp,extra:sp.extra,shoot:sp.shoot,damage:sp.damage,score:sp.score,renal:sp.renal,phase:0})
}
function spawnPickup(){const r=Math.random(),type=r<.30?'creatine':r<.54?'serum':'ammo';state.pickups.push({type,x:W+40,y:type==='ammo'?GROUND-46:GROUND-60,w:44,h:48,spin:0})}
function spawnEmergencyAmmo(){state.pickups.push({type:'ammo',x:W+55,y:GROUND-46,w:44,h:48,spin:0,emergency:true});state.banner='SUPPLY DROP // AMMO INBOUND';state.bannerTime=.75;state.emergencyAmmoCooldown=16}
function damage(n,msg){if(player.invuln>0||state.rageTime>0)return;state.hp-=n;player.invuln=.85;state.shake=11;state.flash=.16;state.banner=msg;state.bannerTime=.5;boom();particles(player.x+35,player.y+40,'#ff2d95',12,1.1);if(state.hp<=0)gameOver()}
function gameOver(){state.hp=0;state.mode='gameover';state.fireHeld=false;if(state.score>high){high=Math.floor(state.score);localStorage.setItem(SAVE,String(high))}tone(145,.16,'sawtooth',.035);setTimeout(()=>tone(92,.24,'square',.025),170);sync()}
function campaignVictory(){state.mode='victory';state.fireHeld=false;state.score+=25000;if(state.score>high){high=Math.floor(state.score);localStorage.setItem(SAVE,String(high))}state.banner='RENAL REVENGE COMPLETE // MEDICALLY IMPROBABLE';state.bannerTime=99;tone(523,.09);setTimeout(()=>tone(659,.09),90);setTimeout(()=>tone(784,.18),180);sync()}
function triggerStageClear(){if(state.mode!=='playing'||state.missionComplete>0)return;state.missionComplete=3.4;state.stageClearTime=3.4;state.cameoTime=2.0;state.cameo=Math.random()<.5?'hardcase':'nikki';state.fireHeld=false;state.score+=10000*state.stage;state.banner=`STAGE ${state.stage} COMPLETE // +${10000*state.stage}`;state.bannerTime=2.2;state.flash=.32;state.shake=10;tone(523,.08);setTimeout(()=>tone(659,.08),90);setTimeout(()=>tone(784,.12),175)}
function enemyHit(e,b){e.hp-=b.damage;b.life=0;particles(b.x,b.y,e.type==='air'?'#ffe53b':'#8aff2b',e.type==='air'?8:5,.7);if(e.hp<=0){e.dead=true;state.kills++;state.stageKills++;state.score+=e.score||350;state.renal=clamp(state.renal+(e.renal||6),0,100);state.shake=Math.max(state.shake,e.type==='air'?13:e.type==='brute'?8:4);boom();particles(e.x+e.w/2,e.y+e.h/2,e.type==='air'?'#ffe53b':e.type==='brute'?'#39d7ff':'#ff2d95',e.type==='air'?30:e.type==='brute'?22:14,e.type==='air'?1.7:e.type==='brute'?1.35:1)}}

function update(dt){
  state.time+=dt;state.flash=Math.max(0,state.flash-dt);state.shake=Math.max(0,state.shake-44*dt);state.bannerTime=Math.max(0,state.bannerTime-dt);state.fireCooldown=Math.max(0,state.fireCooldown-dt);player.invuln=Math.max(0,player.invuln-dt);player.shootPose=Math.max(0,player.shootPose-dt);state.cameoTime=Math.max(0,state.cameoTime-dt);
  if(state.mode!=='playing')return;
  if(state.missionComplete>0){state.missionComplete-=dt;state.stageClearTime=Math.max(0,state.stageClearTime-dt);if(state.missionComplete<=0){if(state.stage>=STAGES.length)campaignVictory();else beginStage(state.stage+1)}return}
  if(state.rageTime>0){state.rageTime-=dt;if(state.rageTime<=0){state.rageTime=0;state.banner='RENAL RAGE OFFLINE';state.bannerTime=.55}}
  state.emergencyAmmoCooldown=Math.max(0,state.emergencyAmmoCooldown-dt);if(state.ammo<=10&&state.emergencyAmmoCooldown<=0&&!state.pickups.some(p=>p.type==='ammo'))spawnEmergencyAmmo();
  if((state.fireHeld||keys.KeyX)&&state.fireCooldown<=0)fireOnce();
  player.vy+=1950*dt;player.y+=player.vy*dt;if(player.y>=GROUND-player.h){player.y=GROUND-player.h;player.vy=0;player.onGround=true}else player.onGround=false;
  const s=stage();const worldSpeed=s.speed+(state.rageTime>0?80:0);state.distance+=worldSpeed*dt/31;state.score+=worldSpeed*dt*.08;
  state.specialTimer-=dt;if(state.distance>s.bossAt&&!state.enemies.some(e=>e.type==='air')&&!state.airBossDefeated&&state.specialTimer<=0){spawnEnemy('air');state.specialTimer=999;state.banner=`${s.airName} INBOUND`;state.bannerTime=1.1;state.shake=6}
  state.spawnTimer-=dt;if(state.spawnTimer<=0){spawnEnemy();const [a,b]=s.spawn;state.spawnTimer=rand(a,b)*Math.max(.58,1-state.distance/3000)}
  state.pickupTimer-=dt;if(state.pickupTimer<=0){spawnPickup();state.pickupTimer=rand(4.0,6.8)}
  for(const b of state.bullets){b.x+=b.vx*dt;b.life-=dt;for(const e of state.enemies){if(!e.dead&&b.life>0&&rects(b,e)){enemyHit(e,b);if(e.type==='air'&&e.dead)state.airBossDefeated=true;break}}}
  for(const e of state.enemies){if(e.dead)continue;e.phase=(e.phase||0)+dt;const move=worldSpeed+(e.extra||0);if(e.type==='air'){e.x-=Math.max(25,move*.12)*dt;e.y=118+Math.sin(e.phase*1.7)*28}else e.x-=move*dt;e.shoot-=dt;
    if((e.type==='warriorA'||e.type==='warriorB'||e.type==='brute')&&e.shoot<=0&&e.x<880&&e.x>330){e.shoot=e.type==='brute'?rand(1.4,2.4):e.type==='warriorB'?rand(1.1,2.1):rand(1.5,2.8);state.enemyShots.push({x:e.x,y:e.y+31,w:e.type==='brute'?24:18,h:e.type==='brute'?7:5,vx:e.type==='brute'?-430:-470,life:2,damage:e.type==='brute'?16:12});tone(135,.025,'square',.012)}
    if(e.type==='air'&&e.shoot<=0){e.shoot=Math.max(.48,.82-state.stage*.035);state.enemyShots.push({x:e.x+20,y:e.y+70,w:20,h:8,vx:-560-state.stage*8,life:2,damage:14});state.enemyShots.push({x:e.x+65,y:e.y+83,w:18,h:7,vx:-500-state.stage*7,life:2,damage:12})}
    if(rects(player,e)){if(state.rageTime>0){e.hp-=6;if(e.hp<=0){e.dead=true;if(e.type==='air')state.airBossDefeated=true;state.score+=700;particles(e.x,e.y,'#ffe53b',15,1.3)}}else{if(e.type!=='air')e.dead=true;damage(e.damage||20,e.type==='animal'?'MUTANT BITE!':e.type==='brute'?'BRUTE CONTACT!':e.type==='air'?'AIR STRIKE!':'CONTACT!')}}
  }
  for(const sshot of state.enemyShots){sshot.x+=sshot.vx*dt;sshot.life-=dt;if(sshot.life>0&&rects(player,sshot)){sshot.life=0;damage(sshot.damage||12,'INCOMING!')}}
  for(const p of state.pickups){p.x-=worldSpeed*dt;p.spin+=dt*6;if(rects(player,p)){p.x=-200;if(p.type==='creatine'){state.renal=clamp(state.renal+42,0,100);state.score+=900;state.banner='CREATINE ACQUIRED // RENAL +42';state.bannerTime=.7;tone(480,.06);setTimeout(()=>tone(760,.08),55);particles(player.x+40,player.y,'#8aff2b',14,1)}else if(p.type==='serum'){state.hp=clamp(state.hp+32,0,100);state.score+=550;state.banner='KIDNEY SERUM // HP +32';state.bannerTime=.65;tone(620,.07);particles(player.x+40,player.y,'#39d7ff',12,1)}else{state.ammo=clamp(state.ammo+45,0,state.maxAmmo);state.score+=350;state.banner='AMMO +45 // DRRRRRT';state.bannerTime=.55;tone(330,.04);setTimeout(()=>tone(390,.04),40)}}}
  for(const p of state.particles){p.life-=dt;p.vy+=680*dt;p.x+=p.vx*dt;p.y+=p.vy*dt}
  state.bullets=state.bullets.filter(b=>b.life>0&&b.x<W+60);state.enemyShots=state.enemyShots.filter(s=>s.life>0&&s.x>-60);state.enemies=state.enemies.filter(e=>!e.dead&&e.x>-260);state.pickups=state.pickups.filter(p=>p.x>-100);state.particles=state.particles.filter(p=>p.life>0);
  if(state.distance>=s.length&&state.airBossDefeated&&!state.enemies.some(e=>e.type==='air'))triggerStageClear();
  sync();
}

function sync(){if(UI.score)UI.score.textContent=pad(state.score);if(UI.distance)UI.distance.textContent=`${Math.floor(state.distance)} M`;if(UI.hp)UI.hp.textContent=Math.max(0,Math.ceil(state.hp));if(UI.ammo)UI.ammo.textContent=state.ammo;if(UI.rage)UI.rage.textContent=`${Math.floor(state.renal)}%`;if(UI.status)UI.status.textContent=state.mode==='playing'?(state.rageTime>0?'RENAL RAGE':`STAGE ${state.stage}/${STAGES.length}`):state.mode.toUpperCase();if(UI.rageBtn){UI.rageBtn.classList.toggle('ready',state.renal>=100);UI.rageBtn.textContent=state.renal>=100?'⚡ RENAL RAGE READY!':`⚡ RENAL RAGE ${Math.floor(state.renal)}%`}}
function text(t,x,y,size=24,c='#fff',align='left'){ctx.fillStyle=c;ctx.font=`900 ${size}px "Barlow Condensed",Impact,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y)}
function shadow(t,x,y,size,c,align='left'){text(t,x+3,y+3,size,'rgba(0,0,0,.78)',align);text(t,x,y,size,c,align)}

function drawBackground(){const s=stage();if(!artAny([s.bg,'jungle'],0,0,W,H)){ctx.fillStyle='#07130b';ctx.fillRect(0,0,W,H)}ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(0,0,W,H);
  if(ready(s.floor||'floor')||ready('floor')){ctx.save();ctx.globalAlpha=.16;const fw=540,fh=180,off=(state.distance*7)%fw;for(let x=-off-fw;x<W+fw;x+=fw)artAny([s.floor||'floor','floor'],x,GROUND-92,fw,fh);ctx.restore()}
  const progress=clamp(state.distance/s.length,0,1);ctx.fillStyle='rgba(0,0,0,.64)';ctx.fillRect(24,24,310,18);ctx.fillStyle='#8aff2b';ctx.fillRect(27,27,304*progress,12);ctx.strokeStyle='rgba(255,255,255,.20)';ctx.strokeRect(24,24,310,18);text(`${Math.floor(state.distance)} / ${s.length} M`,345,34,17,'#fff');text(`STAGE ${s.id}/8`,24,99,18,'#39d7ff')}
function drawPlayer(){if(player.invuln>0&&Math.floor(state.time*15)%2===0)return;const rageOn=state.rageTime>0,shooting=player.shootPose>0||state.fireHeld||keys.KeyX;ctx.save();ctx.globalAlpha=.30;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(player.x+28,GROUND+4,58,12,0,0,TWO);ctx.fill();ctx.restore();if(rageOn){ctx.save();ctx.shadowColor='#8aff2b';ctx.shadowBlur=35;ctx.globalAlpha=.30;ctx.fillStyle='#8aff2b';ctx.beginPath();ctx.arc(player.x+44,player.y+34,72,0,TWO);ctx.fill();ctx.restore()}const k=shooting?'shoot':'reb',dw=shooting?158:140,dh=shooting?158:146,dx=player.x-40,dy=player.y-(shooting?55:48);if(!art(k,dx,dy,dw,dh)){ctx.fillStyle='#ff2d95';ctx.fillRect(player.x,player.y,player.w,player.h)}if(shooting){shadow('AHHHH!',player.x+74,player.y-36,21,'#ff2d95','center');shadow('DRRRRRT',player.x+132,player.y+22,18,'#ffe53b','left')}}
function drawEnemy(e){const s=stage();ctx.save();ctx.globalAlpha=.26;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(e.x+e.w/2,e.type==='air'?e.y+e.h+6:GROUND+4,e.w*.58,e.type==='air'?8:10,0,0,TWO);ctx.fill();ctx.restore();
  if(e.type==='warriorA')artAny([s.warriorA,'trooper'],e.x-28,e.y-48,112,125);
  else if(e.type==='warriorB')artAny([s.warriorB,s.warriorA,'trooper'],e.x-28,e.y-48,118,130);
  else if(e.type==='animal')artAny([s.animal,'hound'],e.x-28,e.y-45,142,112);
  else if(e.type==='brute')artAny([s.brute,s.warriorB,s.warriorA,'trooper'],e.x-36,e.y-60,150,165);
  else{artAny([s.air,'gunship'],e.x-45,e.y-38,280,190);const ratio=clamp(e.hp/e.maxHp,0,1);ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(e.x,e.y-16,180,10);ctx.fillStyle='#ff2d95';ctx.fillRect(e.x+2,e.y-14,176*ratio,6)}
  if(e.type==='brute'){const ratio=clamp(e.hp/e.maxHp,0,1);ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(e.x,e.y-13,74,7);ctx.fillStyle='#39d7ff';ctx.fillRect(e.x+1,e.y-12,72*ratio,5)}
}
function drawPickup(p){const bob=Math.sin(p.spin)*5,y=p.y+bob;ctx.save();ctx.shadowBlur=22;ctx.shadowColor=p.type==='creatine'?'#8aff2b':p.type==='serum'?'#39d7ff':'#ffe53b';if(p.type==='creatine')art('creatine',p.x-18,y-24,82,82);else if(p.type==='serum')art('serum',p.x-18,y-22,76,82);else if(ready('ammo'))art('ammo',p.x-14,y-16,64,64);else{ctx.fillStyle='#171817';ctx.fillRect(p.x,y,52,38);ctx.strokeStyle='#ffe53b';ctx.lineWidth=3;ctx.strokeRect(p.x,y,52,38);text('AMMO',p.x+26,y+19,14,'#ffe53b','center')}ctx.restore()}
function drawBullet(b){ctx.save();ctx.shadowColor='#ffe53b';ctx.shadowBlur=10;ctx.fillStyle='#fff3a0';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#ff2d95';ctx.fillRect(b.x+b.w-5,b.y,5,b.h);ctx.restore()}
function drawEnemyShot(s){ctx.save();ctx.shadowColor='#ff2d95';ctx.shadowBlur=8;ctx.fillStyle='#ff2d95';ctx.fillRect(s.x,s.y,s.w,s.h);ctx.restore()}
function drawParticles(){for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1}
function drawHud(){text('HP',24,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(56,59,150,18);ctx.fillStyle=state.hp>35?'#8aff2b':'#ff2d95';ctx.fillRect(59,62,144*clamp(state.hp/100,0,1),12);text(`AMMO ${state.ammo}`,224,68,18,state.ammo<=15?'#ff2d95':'#ffe53b');text('RENAL',360,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(420,59,145,18);ctx.fillStyle=state.rageTime>0?'#ffe53b':'#8aff2b';ctx.fillRect(423,62,139*(state.rageTime>0?1:state.renal/100),12);shadow(`SCORE ${pad(state.score)}`,W-24,37,24,'#fff','right');shadow(`KILLS ${state.kills}`,W-24,68,18,'#8aff2b','right');if(state.bannerTime>0){ctx.globalAlpha=clamp(state.bannerTime*2,0,1);ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(W/2-280,100,560,55);shadow(state.banner,W/2,129,24,state.banner.includes('RENAL')?'#ffe53b':'#fff','center');ctx.globalAlpha=1}}
function drawTitle(){drawBackground();ctx.fillStyle='rgba(0,0,0,.54)';ctx.fillRect(0,0,W,H);if(ready('title'))art('title',32,46,456,456,.98);else art('cover',36,72,276,276,.88);shadow('REB',690,105,82,'#ff2d95','center');shadow('RENAL FAILURE',690,172,48,'#8aff2b','center');shadow('THE RENAL REVENGE',690,216,28,'#ffe53b','center');shadow('8 STAGE CAMPAIGN',690,251,21,'#fff','center');shadow('DRRRRRT ENGINE V2.0',690,282,18,'#39d7ff','center');ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(470,316,440,94);ctx.strokeStyle='rgba(255,229,59,.60)';ctx.lineWidth=2;ctx.strokeRect(470,316,440,94);shadow('TAP SCREEN OR PRESS ENTER',690,348,25,'#ffe53b','center');text(`HIGH SCORE ${pad(high)}`,690,383,18,'#39d7ff','center');text('TTD // MEDICAL ADVICE IGNORED',W/2,500,14,'rgba(255,255,255,.60)','center')}
function drawCameo(){if(state.cameoTime<=0||!state.cameo)return;const hard=state.cameo==='hardcase',img=hard?'hardcaseCameo':'nikkiCameo',x=W-235,y=H-238,w=205,h=205;ctx.save();ctx.globalAlpha=clamp(state.cameoTime*2,0,1);ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(x-8,y-8,w+16,h+48);ctx.strokeStyle=hard?'#39d7ff':'#ff2d95';ctx.lineWidth=3;ctx.strokeRect(x-8,y-8,w+16,h+48);if(!art(img,x,y,w,h)){ctx.fillStyle=hard?'#39d7ff':'#ff2d95';ctx.fillRect(x+28,y+24,w-56,h-34);shadow(hard?'H87':'NN',x+w/2,y+96,58,'#050608','center')}shadow(hard?'HARDCASE ’87':'NIKKI NITRO',x+w/2,y+h+18,21,hard?'#39d7ff':'#ff2d95','center');ctx.restore()}
function drawStageClear(){if(state.missionComplete<=0)return;ctx.fillStyle='rgba(0,0,0,.44)';ctx.fillRect(0,0,W,H);shadow(`STAGE ${state.stage} CLEARED`,W/2,175,58,'#8aff2b','center');shadow(stage().name,W/2,230,31,'#fff','center');text(state.stage<8?'NEXT DEPLOYMENT INBOUND':'FINAL RENAL COLLAPSE SURVIVED',W/2,272,20,'#ffe53b','center');drawCameo()}
function drawEnd(victoryMode){ctx.fillStyle='rgba(0,0,0,.73)';ctx.fillRect(0,0,W,H);shadow(victoryMode?'RENAL REVENGE COMPLETE':'RENAL FAILURE',W/2,155,58,victoryMode?'#8aff2b':'#ff2d95','center');if(victoryMode)shadow('8 STAGES // MEDICAL ADVICE STILL IGNORED',W/2,208,24,'#ffe53b','center');shadow(`SCORE ${pad(state.score)}`,W/2,260,30,'#fff','center');text(`${state.kills} KILLS // STAGE ${state.stage}/8`,W/2,300,21,'#39d7ff','center');ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(W/2-220,345,440,70);ctx.strokeStyle='rgba(138,255,43,.48)';ctx.strokeRect(W/2-220,345,440,70);shadow('TAP TO REDEPLOY',W/2,380,25,'#fff','center')}
function render(){const sx=state.shake>0?Math.round(rand(-state.shake,state.shake)):0,sy=state.shake>0?Math.round(rand(-state.shake*.5,state.shake*.5)):0;ctx.save();ctx.translate(sx,sy);if(state.mode==='title')drawTitle();else{drawBackground();for(const p of state.pickups)drawPickup(p);for(const s of state.enemyShots)drawEnemyShot(s);for(const b of state.bullets)drawBullet(b);for(const e of state.enemies)drawEnemy(e);drawPlayer();drawParticles();drawHud();drawStageClear();if(state.mode==='gameover')drawEnd(false);if(state.mode==='victory')drawEnd(true)}if(state.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(.34,state.flash)})`;ctx.fillRect(0,0,W,H)}ctx.restore()}
function loop(now){const dt=Math.min(.034,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(loop)}

applyStageDom();sync();requestAnimationFrame(loop);
})();
