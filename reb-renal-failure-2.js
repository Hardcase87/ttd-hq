(() => {
'use strict';

const canvas = document.getElementById('rebCanvas');
if (!canvas) return;
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
canvas.style.touchAction = 'none';

const W = canvas.width;
const H = canvas.height;
const GROUND = 438;
const TWO = Math.PI * 2;
const SAVE = 'ttd-reb-renal-failure-v2-highscore';

const UI = {
  score: document.getElementById('rebScore'),
  distance: document.getElementById('rebDistance'),
  hp: document.getElementById('rebHp'),
  ammo: document.getElementById('rebAmmo'),
  rage: document.getElementById('rebRage'),
  status: document.getElementById('rebStatus'),
  jump: document.getElementById('rebJump'),
  fire: document.getElementById('rebFire'),
  rageBtn: document.getElementById('rebRageBtn'),
  stageLine: document.getElementById('rebStageLine') || document.querySelector('.reb-top span'),
  missionTitle: document.getElementById('rebMissionTitle') || document.querySelector('.brief .panel h2'),
  missionText: document.getElementById('rebMissionText') || document.querySelector('.brief .panel h2 + p')
};

const SHARED = 'assets/images/reb-renal-failure/'; // REB/player + pickups only
const EXP = 'assets/images/reb-renal-failure-2/';
const ART_SRC = {
  // Shared protagonist/consumables are intentional franchise assets.
  reb: SHARED + 'reb.png',
  shoot: SHARED + 'reb-shoot.png',
  creatine: SHARED + 'creatine.png',
  serum: SHARED + 'serum.png',
  ammo: SHARED + 'ammo.PNG',
  cover: EXP + 'cover.png',
  rebHdIdle: EXP + 'reb-hd-idle.png',
  rebHdFire: EXP + 'reb-hd-fire.png',
  rebHdJump: EXP + 'reb-hd-jump.png',
  rebHdLand: EXP + 'reb-hd-land.png',
  stage1Hd: EXP + 'stage-1-jungle-hd.jpg',

  // Stage 1 compatibility zone: intentionally identical to REB Part 1.
  jungle: SHARED + 'jungle.png',
  floor: SHARED + 'jungle-floor.png',
  trooper: SHARED + 'enemy-trooper.png',
  hound: SHARED + 'warhound.png',
  gunship: SHARED + 'gunship.png'
};
for (let n = 2; n <= 8; n++) {
  const bgNames = {
    2: 'stage-2-war-zone.png',
    3: 'stage-3-zoo-escape.png',
    4: 'stage-4-nephro-ward.png',
    5: 'stage-5-cardio-ward.png',
    6: 'stage-6-beach-sea-assault.png',
    7: 'stage-7-toxic-factory.png',
    8: 'stage-8-renal-fortress.png'
  };
  ART_SRC[`s${n}bg`] = EXP + bgNames[n];
  ART_SRC[`s${n}warriorA`] = EXP + `stage-${n}-warrior-a.png`;
  ART_SRC[`s${n}warriorB`] = EXP + `stage-${n}-warrior-b.png`;
  ART_SRC[`s${n}brute`] = EXP + `stage-${n}-brute.png`;
  ART_SRC[`s${n}animal`] = EXP + `stage-${n}-mutant-animal.png`;
  ART_SRC[`s${n}air`] = EXP + `stage-${n}-airborne.png`;
}

const ART = {};
for (const [key, src] of Object.entries(ART_SRC)) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  ART[key] = img;
}
const ready = key => ART[key]?.complete && ART[key].naturalWidth > 0;

function art(key, x, y, w, h, alpha = 1) {
  if (!ready(key)) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(ART[key], Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.restore();
  return true;
}
function artAny(keys, x, y, w, h, alpha = 1) {
  for (const key of keys) if (key && art(key, x, y, w, h, alpha)) return true;
  return false;
}
function drawCoverImage(key, x = 0, y = 0, w = W, h = H, alpha = 1) {
  if (!ready(key)) return false;
  const img = ART[key];
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = Math.max(0, (img.naturalWidth - sw) * 0.5);
  const sy = Math.max(0, (img.naturalHeight - sh) * 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
  return true;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pad = n => Math.max(0, Math.floor(n)).toString().padStart(6, '0');
let high = Number(localStorage.getItem(SAVE) || 0);
let audio = null;
function tone(f = 220, d = .05, type = 'square', gain = .018) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + d);
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + d);
  } catch (_) {}
}
let noiseBuffer = null;
function ensureAudio() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    if (!noiseBuffer) {
      noiseBuffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * .06)), audio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return audio;
  } catch (_) { return null; }
}
function gunSound() {
  const a = ensureAudio(); if (!a) return;
  const t = a.currentTime;
  const master = a.createGain();
  master.gain.setValueAtTime(.055, t);
  master.gain.exponentialRampToValueAtTime(.0001, t + .055);
  master.connect(a.destination);

  const thud = a.createOscillator();
  thud.type = 'sawtooth';
  thud.frequency.setValueAtTime(rand(58, 72), t);
  thud.frequency.exponentialRampToValueAtTime(38, t + .045);
  thud.connect(master); thud.start(t); thud.stop(t + .055);

  const mech = a.createOscillator();
  const mechGain = a.createGain();
  mech.type = 'square';
  mech.frequency.setValueAtTime(rand(105, 135), t);
  mechGain.gain.setValueAtTime(.34, t);
  mechGain.gain.exponentialRampToValueAtTime(.0001, t + .032);
  mech.connect(mechGain); mechGain.connect(master);
  mech.start(t); mech.stop(t + .034);

  const noise = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const ng = a.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'bandpass'; filter.frequency.value = 760; filter.Q.value = .65;
  ng.gain.setValueAtTime(.28, t);
  ng.gain.exponentialRampToValueAtTime(.0001, t + .035);
  noise.connect(filter); filter.connect(ng); ng.connect(master);
  noise.start(t); noise.stop(t + .04);
}
function jumpSound() {
  const a = ensureAudio(); if (!a) { tone(150,.09,'sawtooth',.025); return; }
  const t=a.currentTime, g=a.createGain(), o=a.createOscillator();
  o.type='sawtooth';
  o.frequency.setValueAtTime(138,t);
  o.frequency.exponentialRampToValueAtTime(82,t+.11);
  g.gain.setValueAtTime(.035,t);
  g.gain.exponentialRampToValueAtTime(.0001,t+.13);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+.14);
}
function landSound() {
  const a=ensureAudio(); if(!a) return;
  const t=a.currentTime, g=a.createGain(), o=a.createOscillator();
  o.type='sine'; o.frequency.setValueAtTime(62,t); o.frequency.exponentialRampToValueAtTime(34,t+.08);
  g.gain.setValueAtTime(.04,t); g.gain.exponentialRampToValueAtTime(.0001,t+.1);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+.11);
}
function boom() { tone(62, .10, 'sawtooth', .035); setTimeout(() => tone(42, .11, 'square', .022), 30); }
function buzz(ms = 15) { try { navigator.vibrate?.(ms); } catch (_) {} }

const STAGES = [
  {
    id:1, name:'JUNGLE RENAL WARZONE', subtitle:'JUNGLE DEPLOYMENT',
    bg:'stage1Hd', procedural:false,
    warriorA:'trooper', warriorB:'trooper', brute:'trooper', animal:'hound', air:'gunship',
    airName:'NEPHROLOGY GUNSHIP', airHp:28, bossAt:650, length:1000, speed:235,
    spawn:[.75,1.35], maxGround:8,
    brief:'REB has entered a toxic jungle where mutant troopers, bio-warhounds and a nephrology gunship have made the catastrophic mistake of standing downrange. Collect ammo. Hoard creatine. Trigger RENAL RAGE. Medical advice has been ignored.'
  },
  { id:2, name:'WAR ZONE', subtitle:'RENAL REVENGE', bg:'s2bg', warriorA:'s2warriorA', warriorB:'s2warriorB', brute:'s2brute', animal:'s2animal', air:'s2air', airName:'ATTACK CHOPPER', airHp:28, bossAt:500, length:760, speed:246, spawn:[.78,1.24], maxGround:3, brief:'The jungle was only triage. REB enters a bombed-out war zone packed with assault squads, an armoured brute, a mutated war-beast and an attack chopper with terrible judgement.' },
  { id:3, name:'ZOO ESCAPE', subtitle:'ANIMAL CONTROL FAILED', bg:'s3bg', warriorA:'s3warriorA', warriorB:'s3warriorB', brute:'s3brute', animal:'s3animal', air:'s3air', airName:'MUTATED AIRBORNE', airHp:32, bossAt:490, length:760, speed:254, spawn:[.74,1.18], maxGround:3, brief:'Titan City Zoo has lost containment. Armed keepers, escaped brutes and something formerly listed as a harmless animal are now between REB and the exit. Airspace is biologically compromised.' },
  { id:4, name:'NEPHRO WARD', subtitle:'KIDNEY PANIC PROTOCOL', bg:'s4bg', warriorA:'s4warriorA', warriorB:'s4warriorB', brute:'s4brute', animal:'s4animal', air:'s4air', airName:'MED-EVAC GUNSHIP', airHp:36, bossAt:485, length:760, speed:262, spawn:[.70,1.12], maxGround:4, brief:'The nephrology ward has declared REB medically non-compliant. Security teams, one dialysis brute, a mutant renal hound and an armed med-evac platform are enforcing the discharge plan.' },
  { id:5, name:'CARDIO WARD', subtitle:'HEART RATE: UNACCEPTABLE', bg:'s5bg', warriorA:'s5warriorA', warriorB:'s5warriorB', brute:'s5brute', animal:'s5animal', air:'s5air', airName:'CARDIAC INTERCEPTOR', airHp:40, bossAt:480, length:760, speed:270, spawn:[.67,1.08], maxGround:4, brief:'Cardiology would like REB to reduce intensity. REB has declined. Armed orderlies, a hypertrophic brute, a mutant ward animal and a cardiac interceptor attempt to enforce a reasonable training zone.' },
  { id:6, name:'BEACH / SEA ASSAULT', subtitle:'HYDRATION OPTIONAL', bg:'s6bg', warriorA:'s6warriorA', warriorB:'s6warriorB', brute:'s6brute', animal:'s6animal', air:'s6air', airName:'SEA STRIKE FIGHTER', airHp:44, bossAt:475, length:760, speed:278, spawn:[.64,1.04], maxGround:4, brief:'REB reaches the coast. Amphibious mutants, beach mercenaries and a sea-bred brute attack from the surf while a strike aircraft turns hydration into a tactical issue.' },
  { id:7, name:'TOXIC FACTORY', subtitle:'SUPPLEMENT PRODUCTION LINE', bg:'s7bg', warriorA:'s7warriorA', warriorB:'s7warriorB', brute:'s7brute', animal:'s7animal', air:'s7air', airName:'BIOHAZARD DRONE', airHp:50, bossAt:470, length:760, speed:286, spawn:[.61,1.00], maxGround:4, brief:'The fluorescent nonsense has a source. Factory shock troops, an industrial brute, a chemically improved animal and a hovering biohazard platform guard the production line.' },
  { id:8, name:'RENAL FORTRESS', subtitle:'FINAL RENAL COLLAPSE', bg:'s8bg', warriorA:'s8warriorA', warriorB:'s8warriorB', brute:'s8brute', animal:'s8animal', air:'s8air', airName:'RENAL OVERLORD UFO', airHp:58, bossAt:500, length:820, speed:296, spawn:[.58,.96], maxGround:4, brief:'The Renal Fortress is the end of the line. Every surviving mutant, one final brute, one impossible animal and the Renal Overlord air platform are waiting. Finish the campaign. Question the kidneys later.' }
];

const state = {
  mode:'title', score:0, distance:0, hp:100, ammo:90, maxAmmo:140, renal:0, rageTime:0,
  fireHeld:false, fireCooldown:0, time:0, last:performance.now(), spawnTimer:1, pickupTimer:2.5,
  shake:0, flash:0, banner:'', bannerTime:0, bullets:[], enemies:[], pickups:[], enemyShots:[], particles:[],
  stage:1, kills:0, stageKills:0, bossSpawned:false, bossDefeated:false, stageClearTimer:0,
  emergencyAmmoCooldown:0, cameoTime:0, cameo:null
};
const player = { x:148, y:GROUND-84, w:56, h:84, vy:0, onGround:true, invuln:0, shootPose:0, landTime:0 };
const stage = () => STAGES[state.stage - 1] || STAGES[0];
const keys = {};

function clearWorld() {
  for (const k of ['bullets','enemies','pickups','enemyShots','particles']) state[k].length = 0;
}
function applyStageDom() {
  const s = stage();
  if (UI.stageLine) UI.stageLine.innerHTML = `STAGE ${s.id} // ${s.name}<br>DRRRRRT ENGINE V2.8 // HD ENEMY PASS`;
  if (UI.missionTitle) UI.missionTitle.textContent = s.name;
  if (UI.missionText) UI.missionText.textContent = s.brief;
}
function setStage(id, freshRun = false) {
  state.stage = clamp(id, 1, STAGES.length);
  const s = stage();
  Object.assign(state, {
    mode:'playing', distance:0, rageTime:0, fireHeld:false, fireCooldown:0,
    spawnTimer:.85, pickupTimer:2.0, shake:0, flash:.20,
    banner:`STAGE ${s.id} // ${s.subtitle}`, bannerTime:1.8,
    stageKills:0, bossSpawned:false, bossDefeated:false, stageClearTimer:0,
    emergencyAmmoCooldown:0, cameoTime:0, cameo:null
  });
  if (freshRun) {
    state.score = 0; state.hp = 100; state.ammo = 80; state.renal = 0; state.kills = 0;
  } else {
    state.hp = clamp(state.hp + 20, 0, 100);
    state.ammo = clamp(state.ammo + 36, 0, state.maxAmmo);
    state.score += 1500 * s.id;
  }
  clearWorld();
  Object.assign(player, { y:GROUND-player.h, vy:0, onGround:true, invuln:1.0, shootPose:0, landTime:0 });
  applyStageDom(); sync();
  tone(220,.05); setTimeout(()=>tone(330,.06),60); setTimeout(()=>tone(440,.10),125);
}
function reset() { setStage(1, true); }
function start() { if (['title','gameover','victory'].includes(state.mode)) reset(); }

function jump() {
  if (state.mode !== 'playing') { start(); return; }
  if (player.onGround && state.stageClearTimer <= 0) {
    player.vy = -760; player.onGround = false; jumpSound();
  }
}
function playerMuzzle() {
  // V2.8: start the projectile inside the minigun artwork. Bullets are rendered
  // before REB, so the first pixels are hidden by the sprite and appear to leave the barrel.
  if (!player.onGround) return { x: player.x + 88, y: player.y + 14 };
  return { x: player.x + 92, y: GROUND - 116 };
}
function fireOnce() {
  if (state.mode !== 'playing') { start(); return; }
  if (state.stageClearTimer > 0 || state.fireCooldown > 0) return;
  if (state.ammo <= 0) {
    state.fireCooldown = .22; state.banner = 'CLICK CLICK // AMMO EMPTY'; state.bannerTime = .45; tone(95,.04); return;
  }
  const rage = state.rageTime > 0;
  state.fireCooldown = rage ? .055 : .095;
  state.ammo--;
  player.shootPose = .12;
  const muzzle = playerMuzzle();
  state.bullets.push({ x:muzzle.x, y:muzzle.y, w:25, h:6, vx:rage?1020:850, damage:rage?3:1, life:.72 });
  gunSound();
  if (Math.random() < .35) particles(muzzle.x+20, muzzle.y+3, '#ffe53b', 4, .48);
}
function rage() {
  if (state.mode !== 'playing') { start(); return; }
  if (state.renal >= 100 && state.rageTime <= 0) {
    state.renal = 0; state.rageTime = 6; state.banner = 'RENAL RAGE // DRRRRRT OVERDRIVE';
    state.bannerTime = 1.3; state.flash = .28; state.shake = 8; buzz(40);
    tone(420,.11,'sawtooth',.03); setTimeout(()=>tone(650,.12,'square',.03),100);
  }
}

function bindTap(el, fn) {
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('active'); fn(); });
  for (const ev of ['pointerup','pointercancel','pointerleave']) el.addEventListener(ev, () => el.classList.remove('active'));
}
function installArcadeMode() {
  const cabinet=document.querySelector('.cabinet'), controls=document.querySelector('.controls');
  if(!cabinet||!controls||document.getElementById('rebFullscreen')) return;

  const style=document.createElement('style');
  style.textContent=`
    #rebFullscreen{color:#8aff2b;border-color:rgba(138,255,43,.55)}
    .controls{grid-template-columns:.8fr 1.15fr 1.15fr .72fr}
    .cabinet:fullscreen,.cabinet:-webkit-full-screen{
      width:100vw;height:100vh;max-width:none;border-radius:0;padding:10px;
      display:flex;flex-direction:column;justify-content:center;background:#050608;
    }
    .cabinet:fullscreen .screen,.cabinet:-webkit-full-screen .screen{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
    .cabinet:fullscreen #rebCanvas,.cabinet:-webkit-full-screen #rebCanvas{width:100%;height:auto;max-height:calc(100vh - 118px);object-fit:contain}
    .cabinet:fullscreen .chips,.cabinet:fullscreen .help,
    .cabinet:-webkit-full-screen .chips,.cabinet:-webkit-full-screen .help{display:none}
    .cabinet:fullscreen .controls,.cabinet:-webkit-full-screen .controls{flex:0 0 auto;margin-top:8px}
    body.reb-arcade-mode{overflow:hidden}
    body.reb-arcade-mode .cabinet{
      position:fixed;inset:0;z-index:9999;width:100vw;height:100vh;border-radius:0;padding:10px;
      display:flex;flex-direction:column;justify-content:center;background:#050608;overflow:auto;
    }
    body.reb-arcade-mode .cabinet .screen{flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
    body.reb-arcade-mode .cabinet #rebCanvas{width:100%;height:auto;max-height:calc(100vh - 118px);object-fit:contain}
    body.reb-arcade-mode .cabinet .chips,body.reb-arcade-mode .cabinet .help{display:none}
    body.reb-arcade-mode .cabinet .controls{flex:0 0 auto;margin-top:8px}
    @media(max-width:760px){
      .controls{grid-template-columns:1fr 1.2fr 1fr}
      #rebFullscreen{grid-column:1/-1;min-height:44px}
      .cabinet:fullscreen .controls,.cabinet:-webkit-full-screen .controls,
      body.reb-arcade-mode .cabinet .controls{grid-template-columns:.85fr 1.2fr 1.1fr .72fr}
      .cabinet:fullscreen #rebFullscreen,.cabinet:-webkit-full-screen #rebFullscreen,
      body.reb-arcade-mode .cabinet #rebFullscreen{grid-column:auto;min-height:56px}
    }`;
  document.head.appendChild(style);

  const btn=document.createElement('button');
  btn.id='rebFullscreen'; btn.type='button'; btn.className='btn';
  btn.textContent='⛶ FULLSCREEN'; btn.setAttribute('aria-label','Toggle fullscreen arcade mode');
  controls.appendChild(btn);

  const updateLabel=()=>{btn.textContent=(document.fullscreenElement||document.webkitFullscreenElement||document.body.classList.contains('reb-arcade-mode'))?'✕ EXIT FULL':'⛶ FULLSCREEN';};
  btn.addEventListener('pointerdown',async e=>{
    e.preventDefault();
    try{
      if(document.fullscreenElement||document.webkitFullscreenElement){
        if(document.exitFullscreen) await document.exitFullscreen();
        else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
      }else if(cabinet.requestFullscreen){
        await cabinet.requestFullscreen();
      }else if(cabinet.webkitRequestFullscreen){
        cabinet.webkitRequestFullscreen();
      }else{
        document.body.classList.toggle('reb-arcade-mode');
      }
    }catch(_){document.body.classList.toggle('reb-arcade-mode');}
    updateLabel();
  });
  document.addEventListener('fullscreenchange',updateLabel);
  document.addEventListener('webkitfullscreenchange',updateLabel);
}
installArcadeMode();

bindTap(UI.jump, jump); bindTap(UI.rageBtn, rage);
for (const el of [UI.jump, UI.fire, UI.rageBtn].filter(Boolean)) {
  for (const ev of ['contextmenu','selectstart','dragstart']) el.addEventListener(ev, e => e.preventDefault());
}
if (UI.fire) {
  const stop = () => { state.fireHeld = false; UI.fire.classList.remove('active'); };
  UI.fire.addEventListener('pointerdown', e => {
    e.preventDefault(); try { UI.fire.setPointerCapture(e.pointerId); } catch (_) {}
    state.fireHeld = true; UI.fire.classList.add('active'); fireOnce();
  });
  for (const ev of ['pointerup','pointercancel','lostpointercapture']) UI.fire.addEventListener(ev, stop);
}
canvas.addEventListener('pointerdown', e => { e.preventDefault(); start(); });
window.addEventListener('keydown', e => {
  if (['Space','ArrowUp','KeyX','KeyV','Enter'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'ArrowUp') jump();
  else if (e.code === 'KeyX') fireOnce();
  else if (e.code === 'KeyV') rage();
  else if (e.code === 'Enter') start();
});
window.addEventListener('keyup', e => keys[e.code] = false);
window.addEventListener('blur', () => { state.fireHeld = false; for (const k in keys) keys[k] = false; });

function rects(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
function particles(x,y,color,count=9,power=1) {
  for (let i=0;i<count;i++) state.particles.push({x,y,vx:rand(-210,210)*power,vy:rand(-260,60)*power,life:rand(.25,.72),max:.72,size:rand(2,6),color});
}
function groundEnemies() { return state.enemies.filter(e => !e.dead && e.type !== 'air'); }
function canSpawnGround() {
  const s = stage();
  const g = groundEnemies();
  if (g.length >= s.maxGround) return false;
  if (state.bossSpawned && !state.bossDefeated) return false;
  const rightmost = g.reduce((m,e)=>Math.max(m,e.x+e.w), -9999);
  return rightmost < W - 115;
}
function enemySpec(type) {
  if (state.stage === 1) {
    const part1 = {
      warriorA:{w:78,h:136,hp:2,extra:rand(-10,45),shoot:rand(1.3,2.8),damage:20,score:350,renal:6},
      animal:{w:120,h:130,hp:4,extra:120,shoot:999,damage:28,score:900,renal:14}
    };
    return part1[type] || part1.warriorA;
  }
  const level = state.stage - 1;
  const table = {
    warriorA:{w:78,h:136,hp:2+Math.floor(level*.45),extra:rand(-5,30),shoot:rand(1.6,2.7),damage:16,score:350,renal:6},
    warriorB:{w:82,h:140,hp:3+Math.floor(level*.5),extra:rand(5,45),shoot:rand(1.35,2.35),damage:18,score:450,renal:7},
    brute:{w:108,h:164,hp:7+level,extra:-35,shoot:rand(1.8,2.8),damage:27,score:1400,renal:18},
    animal:{w:120,h:130,hp:4+Math.floor(level*.6),extra:75+level*4,shoot:999,damage:23,score:850,renal:14}
  };
  return table[type] || table.warriorA;
}
function spawnEnemy(type) {
  const s = stage();
  if (type === 'air') {
    if (state.bossSpawned || state.bossDefeated) return false;
    state.bossSpawned = true;
    state.enemies.push({
      type:'air', x:W+100, y:120, w:190, h:105,
      hp:s.airHp, maxHp:s.airHp,
      shoot:state.stage===1?.9:1.0,
      damage:state.stage===1?30:22+state.stage,
      score:state.stage===1?7500:7000+state.stage*800,
      renal:35, phase:0, boss:true
    });
    state.banner = `${s.airName} INBOUND`; state.bannerTime = 1.2; state.shake = 6;
    return true;
  }
  if (!canSpawnGround()) return false;
  if (state.stage === 1) {
    if (!type) type = Math.random() > .78 ? 'animal' : 'warriorA';
  } else if (!type) {
    const r = Math.random();
    type = r < .42 ? 'warriorA' : r < .70 ? 'warriorB' : r < .86 ? 'animal' : 'brute';
  }
  const sp = enemySpec(type);
  const lastX = groundEnemies().reduce((m,e)=>Math.max(m,e.x+e.w), W-120);
  const spawnX = Math.max(W+35, lastX + rand(145,210));
  state.enemies.push({ type, x:spawnX, y:GROUND-sp.h, w:sp.w, h:sp.h, hp:sp.hp, maxHp:sp.hp, extra:sp.extra, shoot:sp.shoot, damage:sp.damage, score:sp.score, renal:sp.renal, phase:0 });
  return true;
}
function spawnPickup(type) {
  if (!type) { const r=Math.random(); type=r<.30?'creatine':r<.54?'serum':'ammo'; }
  state.pickups.push({type,x:W+45,y:type==='ammo'?GROUND-46:GROUND-60,w:44,h:48,spin:0});
}
function spawnEmergencyAmmo() {
  spawnPickup('ammo'); state.banner='SUPPLY DROP // AMMO INBOUND'; state.bannerTime=.7; state.emergencyAmmoCooldown=14;
}
function damage(n,msg) {
  if (player.invuln > 0 || state.rageTime > 0) return;
  state.hp -= n; player.invuln = .9; state.shake = 10; state.flash = .15; state.banner = msg; state.bannerTime = .55;
  boom(); particles(player.x+35,player.y+40,'#ff2d95',12,1.1);
  if (state.hp <= 0) gameOver();
}
function gameOver() {
  state.hp=0; state.mode='gameover'; state.fireHeld=false;
  if (state.score > high) { high=Math.floor(state.score); localStorage.setItem(SAVE,String(high)); }
  tone(145,.16,'sawtooth',.035); setTimeout(()=>tone(92,.24,'square',.025),170); sync();
}
function victory() {
  state.mode='victory'; state.fireHeld=false; state.score += 25000;
  if (state.score > high) { high=Math.floor(state.score); localStorage.setItem(SAVE,String(high)); }
  tone(523,.09); setTimeout(()=>tone(659,.09),90); setTimeout(()=>tone(784,.18),180); sync();
}
function clearStage() {
  if (state.stageClearTimer > 0 || state.mode !== 'playing') return;
  state.stageClearTimer = 3.0; state.fireHeld=false; state.cameoTime=2.0; state.cameo=Math.random()<.5?'hardcase':'nikki';
  state.score += 8000 * state.stage; state.banner=`STAGE ${state.stage} COMPLETE`; state.bannerTime=2.1; state.flash=.28; state.shake=9;
  state.enemies.length=0; state.enemyShots.length=0;
  tone(523,.08); setTimeout(()=>tone(659,.08),90); setTimeout(()=>tone(784,.12),175);
}
function enemyHit(e,b) {
  e.hp -= b.damage; b.life=0;
  particles(b.x,b.y,e.type==='air'?'#ffe53b':'#8aff2b',e.type==='air'?8:5,.7);
  if (e.hp <= 0) {
    e.dead=true; state.kills++; state.stageKills++; state.score += e.score||350;
    state.renal=clamp(state.renal+(e.renal||6),0,100); state.shake=Math.max(state.shake,e.type==='air'?12:e.type==='brute'?7:4);
    if (e.type==='air') { state.bossDefeated=true; state.banner=`${stage().airName} DESTROYED`; state.bannerTime=1.0; }
    boom(); particles(e.x+e.w/2,e.y+e.h/2,e.type==='air'?'#ffe53b':e.type==='brute'?'#39d7ff':'#ff2d95',e.type==='air'?30:e.type==='brute'?22:14,e.type==='air'?1.7:1.2);
  }
}

function update(dt) {
  state.time += dt; state.flash=Math.max(0,state.flash-dt); state.shake=Math.max(0,state.shake-44*dt); state.bannerTime=Math.max(0,state.bannerTime-dt);
  state.fireCooldown=Math.max(0,state.fireCooldown-dt); player.invuln=Math.max(0,player.invuln-dt); player.shootPose=Math.max(0,player.shootPose-dt); player.landTime=Math.max(0,player.landTime-dt); state.cameoTime=Math.max(0,state.cameoTime-dt);
  if (state.mode !== 'playing') return;

  if (state.stageClearTimer > 0) {
    state.stageClearTimer -= dt;
    if (state.stageClearTimer <= 0) {
      if (state.stage >= STAGES.length) victory(); else setStage(state.stage+1, false);
    }
    sync(); return;
  }

  if (state.rageTime > 0) state.rageTime = Math.max(0,state.rageTime-dt);
  state.emergencyAmmoCooldown=Math.max(0,state.emergencyAmmoCooldown-dt);
  if (state.ammo <= 10 && state.emergencyAmmoCooldown<=0 && !state.pickups.some(p=>p.type==='ammo')) spawnEmergencyAmmo();
  if ((state.fireHeld || keys.KeyX) && state.fireCooldown <= 0) fireOnce();

  const wasGrounded = player.onGround;
  player.vy += 1950*dt; player.y += player.vy*dt;
  if (player.y >= GROUND-player.h) {
    if (!wasGrounded && player.vy > 120) { player.landTime = .22; landSound(); }
    player.y=GROUND-player.h; player.vy=0; player.onGround=true;
  } else player.onGround=false;

  const s=stage();
  const worldSpeed=s.speed+(state.rageTime>0?70:0);
  const bossActive=state.bossSpawned&&!state.bossDefeated;
  if (!bossActive || state.distance < s.length-55) state.distance += worldSpeed*dt/26;
  state.distance = Math.min(state.distance, s.length);
  state.score += worldSpeed*dt*.06;

  if (!state.bossSpawned && state.distance >= s.bossAt) spawnEnemy('air');

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    const spawned = spawnEnemy();
    const [a,b] = s.spawn;
    state.spawnTimer = spawned ? rand(a,b) : .18;
  }
  state.pickupTimer -= dt;
  if (state.pickupTimer <= 0) { spawnPickup(); state.pickupTimer=rand(4.0,6.3); }

  for (const b of state.bullets) {
    b.x += b.vx*dt; b.life -= dt;
    for (const e of state.enemies) if (!e.dead && b.life>0 && rects(b,e)) { enemyHit(e,b); break; }
  }

  for (const e of state.enemies) {
    if (e.dead) continue;
    e.phase=(e.phase||0)+dt; e.shoot-=dt;
    if (e.type==='air') {
      const targetX=665+Math.sin(e.phase*.7)*42;
      e.x += (targetX-e.x)*Math.min(1,dt*1.6);
      e.y = 205 + Math.sin(e.phase*1.30)*20; // V2.7 mid-screen boss patrol band
      if (e.shoot<=0 && e.x<W-80) {
        e.shoot=Math.max(.62,1.02-state.stage*.04);
        state.enemyShots.push({x:e.x+28,y:e.y+68,w:20,h:8,vx:-500-state.stage*8,life:2.2,damage:11+Math.floor(state.stage*.6)});
        state.enemyShots.push({x:e.x+78,y:e.y+86,w:18,h:7,vx:-455-state.stage*6,life:2.2,damage:10+Math.floor(state.stage*.5)});
      }
    } else {
      e.x -= (worldSpeed+(e.extra||0))*dt;
      if ((e.type==='warriorA'||e.type==='warriorB'||e.type==='brute') && e.shoot<=0 && e.x<850 && e.x>360) {
        e.shoot=e.type==='brute'?rand(1.7,2.6):e.type==='warriorB'?rand(1.35,2.25):rand(1.7,2.8);
        state.enemyShots.push({x:e.x,y:e.y+Math.min(72,e.h*.46),w:e.type==='brute'?24:18,h:e.type==='brute'?7:5,vx:e.type==='brute'?-410:-445,life:2.1,damage:e.type==='brute'?13:10});
      }
    }
    if (rects(player,e)) {
      if (state.rageTime>0) { e.hp-=6; if(e.hp<=0) enemyHit(e,{damage:0,life:0,x:e.x,y:e.y}); }
      else if (e.type!=='air') { e.dead=true; damage(e.damage||18,e.type==='animal'?'MUTANT BITE!':e.type==='brute'?'BRUTE CONTACT!':'CONTACT!'); }
    }
  }

  for (const shot of state.enemyShots) {
    shot.x += shot.vx*dt; shot.life -= dt;
    if (shot.life>0 && rects(player,shot)) { shot.life=0; damage(shot.damage||10,'INCOMING!'); }
  }
  for (const p of state.pickups) {
    p.x -= worldSpeed*dt; p.spin += dt*6;
    if (rects(player,p)) {
      p.x=-200;
      if (p.type==='creatine') { state.renal=clamp(state.renal+42,0,100); state.score+=900; state.banner='CREATINE // RENAL +42'; state.bannerTime=.65; tone(480,.06); }
      else if (p.type==='serum') { state.hp=clamp(state.hp+32,0,100); state.score+=550; state.banner='KIDNEY SERUM // HP +32'; state.bannerTime=.65; tone(620,.07); }
      else { state.ammo=clamp(state.ammo+50,0,state.maxAmmo); state.score+=350; state.banner='AMMO +50 // DRRRRRT'; state.bannerTime=.55; tone(330,.04); }
    }
  }
  for (const p of state.particles) { p.life-=dt; p.vy+=680*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; }

  state.bullets=state.bullets.filter(b=>b.life>0&&b.x<W+80);
  state.enemyShots=state.enemyShots.filter(s=>s.life>0&&s.x>-80);
  state.enemies=state.enemies.filter(e=>!e.dead && (e.type==='air'||e.x>-220));
  state.pickups=state.pickups.filter(p=>p.x>-100);
  state.particles=state.particles.filter(p=>p.life>0);

  if (state.distance>=s.length && state.bossDefeated) clearStage();
  sync();
}

function sync() {
  if(UI.score)UI.score.textContent=pad(state.score);
  if(UI.distance)UI.distance.textContent=`${Math.floor(state.distance)} M`;
  if(UI.hp)UI.hp.textContent=Math.max(0,Math.ceil(state.hp));
  if(UI.ammo)UI.ammo.textContent=state.ammo;
  if(UI.rage)UI.rage.textContent=`${Math.floor(state.renal)}%`;
  const boss=state.enemies.find(e=>!e.dead&&e.type==='air');
  if(UI.status)UI.status.textContent=state.mode==='playing'
    ? (boss ? `BOSS ${Math.max(0,Math.ceil((boss.hp/boss.maxHp)*100))}%` : state.rageTime>0 ? 'RENAL RAGE' : `STAGE ${state.stage}/8`)
    : state.mode.toUpperCase();
  if(UI.rageBtn){UI.rageBtn.classList.toggle('ready',state.renal>=100);UI.rageBtn.textContent=state.renal>=100?'⚡ RENAL RAGE READY!':`⚡ RENAL RAGE ${Math.floor(state.renal)}%`;}
}
function text(t,x,y,size=24,c='#fff',align='left'){ctx.fillStyle=c;ctx.font=`900 ${size}px "Barlow Condensed",Impact,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);}
function shadow(t,x,y,size,c,align='left'){text(t,x+3,y+3,size,'rgba(0,0,0,.78)',align);text(t,x,y,size,c,align);}

function drawBattlefieldBase() {
  // V2.2: opaque scenic base prevents transparent/empty PNG regions from exposing the canvas black.
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#12091d');
  sky.addColorStop(.52,'#24102e');
  sky.addColorStop(.72,'#10251d');
  sky.addColorStop(1,'#07130d');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

  // Distant toxic haze gives transparent middle sections real scenery instead of a flat slab.
  const haze=ctx.createLinearGradient(0,GROUND-175,0,GROUND+40);
  haze.addColorStop(0,'rgba(255,45,149,.18)');
  haze.addColorStop(.38,'rgba(57,215,255,.08)');
  haze.addColorStop(.72,'rgba(138,255,43,.16)');
  haze.addColorStop(1,'rgba(5,12,8,.70)');
  ctx.fillStyle=haze; ctx.fillRect(0,GROUND-175,W,215);

  // Layered ground silhouettes keep the play lane visually continuous on every stage.
  ctx.fillStyle='rgba(18,45,27,.78)';
  ctx.beginPath(); ctx.moveTo(0,GROUND-108);
  for(let x=0;x<=W;x+=64){const y=GROUND-105-Math.sin((x+state.distance*2)*.017)*18-Math.sin(x*.043)*9;ctx.lineTo(x,y);}
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(5,14,9,.88)';
  ctx.fillRect(0,GROUND-48,W,H-GROUND+48);
}


function drawProceduralJungle() {
  // Sequel-only Stage 1 scenery. No Part 1 jungle/floor art is referenced.
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#170523'); sky.addColorStop(.45,'#3d0b3e');
  sky.addColorStop(.70,'#0d3129'); sky.addColorStop(1,'#07150d');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.globalAlpha=.34;
  for(let i=0;i<13;i++){
    const x=((i*93)-(state.distance*5)%93)-50;
    const h=90+(i%4)*27;
    ctx.fillStyle=i%2?'#0c281b':'#102f20';
    ctx.fillRect(x,GROUND-h,16,h);
    ctx.beginPath();
    ctx.fillStyle=i%3===0?'#8aff2b':'#234f2e';
    ctx.arc(x+8,GROUND-h,48+(i%3)*12,0,TWO);ctx.fill();
  }
  ctx.restore();

  for(let i=0;i<5;i++){
    const x=110+i*190;
    const g=ctx.createLinearGradient(x,150,x+24,GROUND);
    g.addColorStop(0,'rgba(57,215,255,.04)');
    g.addColorStop(.45,i%2?'rgba(138,255,43,.22)':'rgba(255,45,149,.18)');
    g.addColorStop(1,'rgba(138,255,43,0)');
    ctx.fillStyle=g; ctx.fillRect(x,145+(i%2)*40,28,220);
  }
}

function drawBackground() {
  const s=stage();

  // V2.8 Stage 1: supplied full-frame HD jungle artwork, no legacy half-wallpaper/floor strip.
  if (state.stage === 1) {
    ctx.fillStyle='#07130b';
    ctx.fillRect(0,0,W,H);
    if (!art('stage1Hd',0,0,W,H,1) && ready('jungle')) art('jungle',0,0,W,H,1);

    const shade=ctx.createLinearGradient(0,H*.72,0,H);
    shade.addColorStop(0,'rgba(0,0,0,0)');
    shade.addColorStop(1,'rgba(0,0,0,.16)');
    ctx.fillStyle=shade; ctx.fillRect(0,0,W,H);

    const progress=clamp(state.distance/s.length,0,1);
    ctx.fillStyle='rgba(0,0,0,.64)';
    ctx.fillRect(24,24,310,18);
    ctx.fillStyle='#8aff2b';
    ctx.fillRect(27,27,304*progress,12);
    ctx.strokeStyle='rgba(255,255,255,.20)';
    ctx.strokeRect(24,24,310,18);
    text(`${Math.floor(state.distance)} / ${s.length} M`,345,34,17,'#fff');
    text(`STAGE ${s.id}/8 // ${s.name}`,24,99,18,'#39d7ff');
    return;
  }

  drawBattlefieldBase();
  if (s.procedural) {
    drawProceduralJungle();
  } else if (s.bg) {
    drawCoverImage(s.bg,0,0,W,H,1);
  }

  // Rebuild the combat lane over any transparent/blank lower portion of the source art.
  const lane=ctx.createLinearGradient(0,GROUND-155,0,H);
  lane.addColorStop(0,'rgba(24,20,34,.00)');
  lane.addColorStop(.34,'rgba(16,45,28,.10)');
  lane.addColorStop(.72,'rgba(7,22,13,.28)');
  lane.addColorStop(1,'rgba(3,9,6,.52)');
  ctx.fillStyle=lane; ctx.fillRect(0,GROUND-155,W,H-(GROUND-155));

  // Opaque running surface for every stage; no Part 1 floor sprite fallback.
  const ground=ctx.createLinearGradient(0,GROUND-90,0,H);
  ground.addColorStop(0,state.stage===1?'rgba(76,255,90,.08)':'rgba(28,55,36,.06)');
  ground.addColorStop(.55,state.stage===1?'rgba(15,54,22,.34)':'rgba(9,25,15,.26)');
  ground.addColorStop(1,'rgba(3,10,6,.58)');
  ctx.fillStyle=ground; ctx.fillRect(0,GROUND-90,W,H-GROUND+90);
  // V2.5: synthetic diagonal travelator/grid removed.
  // Opaque lane protection remains underneath transparent source art.

  const vignette=ctx.createLinearGradient(0,H*.58,0,H);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(0,0,0,.25)');
  ctx.fillStyle=vignette; ctx.fillRect(0,0,W,H);

  const progress=clamp(state.distance/s.length,0,1);
  ctx.fillStyle='rgba(0,0,0,.68)';ctx.fillRect(24,24,310,18);ctx.fillStyle='#8aff2b';ctx.fillRect(27,27,304*progress,12);
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.strokeRect(24,24,310,18);text(`${Math.floor(state.distance)} / ${s.length} M`,345,34,17,'#fff');text(`STAGE ${s.id}/8 // ${s.name}`,24,99,18,'#39d7ff');
}
function drawPlayer(){
  if(player.invuln>0&&Math.floor(state.time*15)%2===0)return;
  const rageOn=state.rageTime>0, shooting=player.shootPose>0||state.fireHeld||keys.KeyX;

  ctx.save();
  ctx.globalAlpha=.30;
  ctx.fillStyle='#000';
  ctx.beginPath();
  ctx.ellipse(player.x+30,GROUND+5,70,14,0,0,TWO);
  ctx.fill();
  ctx.restore();

  if(rageOn){
    ctx.save();
    ctx.shadowColor='#8aff2b';
    ctx.shadowBlur=44;
    ctx.globalAlpha=.34;
    ctx.fillStyle='#8aff2b';
    ctx.beginPath();
    ctx.arc(player.x+45,player.y+30,84,0,TWO);
    ctx.fill();
    ctx.restore();
  }

  let key='rebHdIdle', dw=150, dh=220, dx=player.x-48, dy=GROUND-220;

  if(!player.onGround){
    key='rebHdJump'; dw=158; dh=224; dx=player.x-49; dy=player.y-92;
  } else if(player.landTime>0){
    key='rebHdLand'; dw=162; dh=224; dx=player.x-50; dy=GROUND-224;
  } else if(shooting){
    key='rebHdFire'; dw=184; dh=228; dx=player.x-48; dy=GROUND-228;
  }

  if(!art(key,dx,dy,dw,dh)){
    const fallback=shooting?'shoot':'reb';
    const fw=shooting?158:140, fh=shooting?158:146;
    const fx=player.x-40, fy=player.y-(shooting?55:48);
    if(!art(fallback,fx,fy,fw,fh)){
      ctx.fillStyle='#ff2d95';
      ctx.fillRect(player.x,player.y,player.w,player.h);
    }
  }

  if(shooting && player.onGround){
    shadow('YEAHHHH!',player.x+86,player.y-48,21,'#ff2d95','center');
    shadow('DRRRRRT',player.x+145,player.y+18,18,'#ffe53b','left');
  }
}
function drawProceduralEnemy(e){
  const cx=e.x+e.w/2;
  ctx.save();
  ctx.lineWidth=4;
  if(e.type==='air'){
    ctx.shadowColor='#ff2d95';ctx.shadowBlur=20;
    ctx.fillStyle='#2b0925';ctx.strokeStyle='#ff2d95';
    ctx.beginPath();ctx.ellipse(cx,e.y+48,92,38,0,0,TWO);ctx.fill();ctx.stroke();
    ctx.fillStyle='#8aff2b';
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(cx+i*30,e.y+48,5,0,TWO);ctx.fill();}
    ctx.restore();return;
  }
  const main=e.type==='brute'?'#39d7ff':e.type==='animal'?'#ffe53b':e.type==='warriorB'?'#ff2d95':'#8aff2b';
  ctx.shadowColor=main;ctx.shadowBlur=14;ctx.strokeStyle=main;ctx.fillStyle='rgba(8,14,12,.96)';
  if(e.type==='animal'){
    ctx.beginPath();ctx.ellipse(cx,e.y+35,e.w*.48,e.h*.42,0,0,TWO);ctx.fill();ctx.stroke();
    ctx.fillStyle=main;ctx.beginPath();ctx.arc(cx+24,e.y+28,6,0,TWO);ctx.fill();
  }else{
    ctx.beginPath();ctx.roundRect(e.x+8,e.y+18,e.w-16,e.h-20,12);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(cx,e.y+16,e.type==='brute'?18:14,0,TWO);ctx.fill();ctx.stroke();
    ctx.fillStyle=main;ctx.fillRect(cx-10,e.y+12,7,4);ctx.fillRect(cx+3,e.y+12,7,4);
  }
  ctx.restore();
}
function drawEnemy(e){
  const s=stage();
  ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(e.x+e.w/2,e.type==='air'?e.y+e.h+6:GROUND+4,e.w*.62,e.type==='air'?8:12,0,0,TWO);ctx.fill();ctx.restore();

  // Boss/aircraft sizing remains V2.7 until the next boss test.
  if (e.type==='air') {
    if (state.stage === 1) art('gunship',e.x-45,e.y-38,280,190);
    else if (!art(s.air,e.x-45,e.y-38,280,190)) drawProceduralEnemy(e);
    return;
  }

  const centered = (key,w,h) => art(key, e.x + e.w/2 - w/2, GROUND - h, w, h);

  if (state.stage === 1) {
    const ok = e.type==='animal'
      ? centered('hound',190,154)
      : centered('trooper',170,192);
    if(!ok) drawProceduralEnemy(e);
    return;
  }

  if(s.procedural){ drawProceduralEnemy(e); return; }

  let ok=false;
  if(e.type==='warriorA') ok=centered(s.warriorA,172,194);
  else if(e.type==='warriorB') ok=centered(s.warriorB,178,198);
  else if(e.type==='animal') ok=centered(s.animal,194,158);
  else if(e.type==='brute') ok=centered(s.brute,220,232);

  if(!ok) drawProceduralEnemy(e);
}
function drawPickup(p){const bob=Math.sin(p.spin)*5,y=p.y+bob;ctx.save();ctx.shadowBlur=22;ctx.shadowColor=p.type==='creatine'?'#8aff2b':p.type==='serum'?'#39d7ff':'#ffe53b';if(p.type==='creatine')art('creatine',p.x-18,y-24,82,82);else if(p.type==='serum')art('serum',p.x-18,y-22,76,82);else if(!art('ammo',p.x-14,y-16,64,64)){ctx.fillStyle='#171817';ctx.fillRect(p.x,y,52,38);ctx.strokeStyle='#ffe53b';ctx.strokeRect(p.x,y,52,38);}ctx.restore();}
function drawBullet(b){ctx.save();ctx.shadowColor='#ffe53b';ctx.shadowBlur=10;ctx.fillStyle='#fff3a0';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#ff2d95';ctx.fillRect(b.x+b.w-5,b.y,5,b.h);ctx.restore();}
function drawEnemyShot(s){ctx.save();ctx.shadowColor='#ff2d95';ctx.shadowBlur=8;ctx.fillStyle='#ff2d95';ctx.fillRect(s.x,s.y,s.w,s.h);ctx.restore();}
function drawParticles(){for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;}
function drawHud(){
  text('HP',24,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(56,59,150,18);ctx.fillStyle=state.hp>35?'#8aff2b':'#ff2d95';ctx.fillRect(59,62,144*clamp(state.hp/100,0,1),12);
  text(`AMMO ${state.ammo}`,224,68,18,state.ammo<=15?'#ff2d95':'#ffe53b');text('RENAL',360,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(420,59,145,18);ctx.fillStyle=state.rageTime>0?'#ffe53b':'#8aff2b';ctx.fillRect(423,62,139*(state.rageTime>0?1:state.renal/100),12);
  shadow(`SCORE ${pad(state.score)}`,W-24,37,24,'#fff','right');shadow(`KILLS ${state.kills}`,W-24,68,18,'#8aff2b','right');
  if(state.bannerTime>0){ctx.globalAlpha=clamp(state.bannerTime*2,0,1);ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(W/2-300,112,600,55);shadow(state.banner,W/2,140,24,state.banner.includes('RENAL')?'#ffe53b':'#fff','center');ctx.globalAlpha=1;}
}
function drawTitle(){
  drawBackground();ctx.fillStyle='rgba(0,0,0,.60)';ctx.fillRect(0,0,W,H);
  if(!art('cover',32,46,400,400,.98)){ctx.fillStyle='#12091d';ctx.fillRect(32,46,400,400);shadow('RENAL REVENGE',232,246,40,'#8aff2b','center');}
  shadow('REB',690,105,82,'#ff2d95','center');shadow('RENAL REVENGE',690,172,48,'#8aff2b','center');shadow('8 STAGE CAMPAIGN',690,226,28,'#ffe53b','center');shadow('DRRRRRT ENGINE V2.8',690,266,19,'#39d7ff','center');
  ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(470,316,440,94);ctx.strokeStyle='rgba(255,229,59,.60)';ctx.lineWidth=2;ctx.strokeRect(470,316,440,94);shadow('TAP SCREEN OR PRESS ENTER',690,348,25,'#ffe53b','center');text(`HIGH SCORE ${pad(high)}`,690,383,18,'#39d7ff','center');
}
function drawCameo(){
  if(state.cameoTime<=0||!state.cameo)return;
  const hard=state.cameo==='hardcase',x=W-235,y=H-238,w=205,h=205;
  ctx.save();ctx.globalAlpha=clamp(state.cameoTime*2,0,1);
  ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(x-8,y-8,w+16,h+48);
  ctx.strokeStyle=hard?'#39d7ff':'#ff2d95';ctx.lineWidth=3;ctx.strokeRect(x-8,y-8,w+16,h+48);
  ctx.fillStyle=hard?'#10384a':'#4a1234';ctx.fillRect(x+22,y+20,w-44,h-40);
  shadow(hard?'H87':'NN',x+w/2,y+96,58,'#fff','center');
  shadow(hard?'HARDCASE ’87':'NIKKI NITRO',x+w/2,y+h+18,21,hard?'#39d7ff':'#ff2d95','center');
  ctx.restore();
}
function drawStageClear(){if(state.stageClearTimer<=0)return;ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,W,H);shadow(`STAGE ${state.stage} CLEARED`,W/2,175,58,'#8aff2b','center');shadow(stage().name,W/2,230,31,'#fff','center');text(state.stage<8?'NEXT DEPLOYMENT INBOUND':'FINAL RENAL COLLAPSE SURVIVED',W/2,272,20,'#ffe53b','center');drawCameo();}
function drawEnd(victoryMode){ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(0,0,W,H);shadow(victoryMode?'RENAL REVENGE COMPLETE':'RENAL FAILURE',W/2,155,58,victoryMode?'#8aff2b':'#ff2d95','center');if(victoryMode)shadow('ALL 8 STAGES CLEARED',W/2,208,24,'#ffe53b','center');shadow(`SCORE ${pad(state.score)}`,W/2,260,30,'#fff','center');text(`${state.kills} KILLS // STAGE ${state.stage}/8`,W/2,300,21,'#39d7ff','center');ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(W/2-220,345,440,70);ctx.strokeStyle='rgba(138,255,43,.48)';ctx.strokeRect(W/2-220,345,440,70);shadow('TAP TO REDEPLOY',W/2,380,25,'#fff','center');}
function render(){
  const sx=state.shake>0?Math.round(rand(-state.shake,state.shake)):0,sy=state.shake>0?Math.round(rand(-state.shake*.5,state.shake*.5)):0;
  ctx.save();ctx.translate(sx,sy);
  if(state.mode==='title')drawTitle();else{drawBackground();for(const p of state.pickups)drawPickup(p);for(const s of state.enemyShots)drawEnemyShot(s);for(const b of state.bullets)drawBullet(b);for(const e of state.enemies)drawEnemy(e);drawPlayer();drawParticles();drawHud();drawStageClear();if(state.mode==='gameover')drawEnd(false);if(state.mode==='victory')drawEnd(true);}
  if(state.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(.34,state.flash)})`;ctx.fillRect(0,0,W,H);}ctx.restore();
}
function loop(now){const dt=Math.min(.034,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(loop);}

applyStageDom();sync();requestAnimationFrame(loop);
})();
