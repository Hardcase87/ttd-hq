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
const VERSION_LABEL = 'DRRRRRT ENGINE V3.2 // MEGA DRIVE RENAL EDITION';

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
  missionText: document.getElementById('rebMissionText') || document.querySelector('.brief .panel h2 + p'),
  musicMute: document.getElementById('rebMusicMute'),
  volume: document.getElementById('rebVolume'),
  nowPlaying: document.getElementById('rebNowPlaying')
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
  rebHdFire: EXP + 'reb-hd-fire-v32.png',
  rebHdJump: EXP + 'reb-hd-jump.png',
  rebHdLand: EXP + 'reb-hd-land.png',
  stage1Hd: EXP + 'stage-1-jungle-hd.jpg',
  hardcaseCard: EXP + 'intermission-hardcase-v3.png',
  nikkiCard: EXP + 'intermission-nikki-v3.png',
  toxicElite: EXP + 'enemy-hd-toxic-elite-left.png',

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
const MUSIC_TRACKS = {
  1:'assets/audio/reb-renal-failure-2/stage-1-renal-warzone-fm-assault.mp3',
  2:'assets/audio/reb-renal-failure-2/Stage-2_Jungle-March_Hunter-Protocol.mp3',
  3:'assets/audio/reb-renal-failure-2/Stage-3_Primal_Cage-Instinct.mp3',
  4:'assets/audio/reb-renal-failure-2/Stage-4_Alert-Danger_Red-Protocol.mp3',
  5:'assets/audio/reb-renal-failure-2/Stage-5_Fitness-Beats_Max-Rep-Alarm.mp3',
  6:'assets/audio/reb-renal-failure-2/Stage-6_Beach-Boardwalk_Sunburn-Assault.mp3',
  7:'assets/audio/reb-renal-failure-2/Stage-7_Toxic-Factory_Neon-Contamination.mp3',
  8:'assets/audio/reb-renal-failure-2/Stage-8_Renal-Fortress_Deep-Collapse.mp3'
};
const music = { bgm:null, started:false, muted:false, volume:.72, currentStage:0, bossEscalated:false, bossPulse:0 };
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
  master.gain.setValueAtTime(.065, t);
  master.gain.exponentialRampToValueAtTime(.0001, t + .085);
  master.connect(a.destination);

  const sub = a.createOscillator();
  const subGain = a.createGain();
  sub.type = 'sawtooth';
  sub.frequency.setValueAtTime(rand(52, 64), t);
  sub.frequency.exponentialRampToValueAtTime(33, t + .07);
  subGain.gain.setValueAtTime(.42, t);
  subGain.gain.exponentialRampToValueAtTime(.0001, t + .078);
  sub.connect(subGain); subGain.connect(master); sub.start(t); sub.stop(t + .08);

  const mech = a.createOscillator();
  const mechGain = a.createGain();
  mech.type = 'square';
  mech.frequency.setValueAtTime(rand(96, 122), t);
  mech.frequency.exponentialRampToValueAtTime(82, t + .03);
  mechGain.gain.setValueAtTime(.28, t);
  mechGain.gain.exponentialRampToValueAtTime(.0001, t + .045);
  mech.connect(mechGain); mechGain.connect(master); mech.start(t); mech.stop(t + .05);

  const clack = a.createOscillator();
  const clackGain = a.createGain();
  clack.type = 'triangle';
  clack.frequency.setValueAtTime(190, t);
  clack.frequency.exponentialRampToValueAtTime(120, t + .025);
  clackGain.gain.setValueAtTime(.12, t);
  clackGain.gain.exponentialRampToValueAtTime(.0001, t + .028);
  clack.connect(clackGain); clackGain.connect(master); clack.start(t); clack.stop(t + .03);

  const noise = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const ng = a.createGain();
  noise.buffer = noiseBuffer;
  filter.type = 'bandpass'; filter.frequency.value = 720; filter.Q.value = .72;
  ng.gain.setValueAtTime(.30, t);
  ng.gain.exponentialRampToValueAtTime(.0001, t + .05);
  noise.connect(filter); filter.connect(ng); ng.connect(master);
  noise.start(t); noise.stop(t + .055);
}
function jumpSound() {
  const a = ensureAudio(); if (!a) { tone(126,.09,'sawtooth',.025); return; }
  const t=a.currentTime;
  const body=a.createOscillator(), bodyGain=a.createGain();
  body.type='triangle';
  body.frequency.setValueAtTime(124,t);
  body.frequency.exponentialRampToValueAtTime(72,t+.14);
  bodyGain.gain.setValueAtTime(.038,t);
  bodyGain.gain.exponentialRampToValueAtTime(.0001,t+.16);
  body.connect(bodyGain); bodyGain.connect(a.destination); body.start(t); body.stop(t+.17);

  const bite=a.createOscillator(), biteGain=a.createGain();
  bite.type='square';
  bite.frequency.setValueAtTime(210,t);
  bite.frequency.exponentialRampToValueAtTime(148,t+.045);
  biteGain.gain.setValueAtTime(.012,t);
  biteGain.gain.exponentialRampToValueAtTime(.0001,t+.05);
  bite.connect(biteGain); biteGain.connect(a.destination); bite.start(t); bite.stop(t+.052);
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
function ensureBgm() {
  if (!music.bgm) {
    const bgm = new Audio();
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.playsInline = true;
    bgm.volume = music.volume;
    music.bgm = bgm;
  }
  return music.bgm;
}
function musicLabel(stageId = state?.stage || 1, boss = music.bossEscalated) {
  const s = STAGES[clamp(stageId,1,STAGES.length)-1] || STAGES[0];
  return boss ? `BOSS MODE // ${s.name}` : `STAGE ${s.id} // ${s.name}`;
}
function refreshMusicUi() {
  if (UI.musicMute) UI.musicMute.textContent = music.muted ? '♫ SOUND OFF' : '♫ SOUND ON';
  if (UI.nowPlaying) UI.nowPlaying.textContent = musicLabel(music.currentStage || state?.stage || 1, music.bossEscalated);
  if (UI.volume && String(Math.round(music.volume * 100)) !== UI.volume.value) UI.volume.value = String(Math.round(music.volume * 100));
}
function applyMusicVolume() {
  const bgm = ensureBgm();
  bgm.volume = music.muted ? 0 : clamp(music.volume * (music.bossEscalated ? .9 : 1), 0, 1);
}
async function startStageMusic(stageId, restart = false) {
  const src = MUSIC_TRACKS[stageId];
  if (!src) return;
  const bgm = ensureBgm();
  const absolute = new URL(src, window.location.href).href;
  if (restart || music.currentStage !== stageId || !bgm.src || bgm.src !== absolute) {
    bgm.src = src;
    bgm.load();
    music.currentStage = stageId;
  }
  music.bossEscalated = false;
  bgm.loop = true;
  bgm.playbackRate = 1;
  applyMusicVolume();
  refreshMusicUi();
  if (!music.started) return;
  try { await bgm.play(); } catch (_) {}
}
function wakeAudio() {
  ensureAudio();
  music.started = true;
  startStageMusic(state.stage || 1, false);
}
function setMusicVolume(value) {
  music.volume = clamp(value, 0, 1);
  applyMusicVolume();
  refreshMusicUi();
  if (music.started && !music.muted) {
    const bgm = ensureBgm();
    bgm.play().catch(() => {});
  }
}
function toggleMusicMute() {
  music.muted = !music.muted;
  applyMusicVolume();
  refreshMusicUi();
  if (!music.muted && music.started) ensureBgm().play().catch(() => {});
}
function bossPulseCue() {
  if (music.muted) return;
  tone(118,.10,'square',.016);
  setTimeout(() => tone(146,.08,'square',.014), 110);
  setTimeout(() => tone(98,.12,'sawtooth',.014), 210);
}
function bossMusicEscalate() {
  const bgm = ensureBgm();
  music.bossEscalated = true;
  music.bossPulse = 0;
  bgm.playbackRate = 1.08;
  applyMusicVolume();
  refreshMusicUi();
  if (music.started && !music.muted) bgm.play().catch(() => {});
}
function bossMusicReset() {
  const bgm = ensureBgm();
  music.bossEscalated = false;
  music.bossPulse = 0;
  bgm.playbackRate = 1;
  applyMusicVolume();
  refreshMusicUi();
}
function stageClearSting() {
  tone(392,.08,'square',.026);
  setTimeout(() => tone(523,.08,'square',.024), 80);
  setTimeout(() => tone(659,.12,'triangle',.022), 160);
  setTimeout(() => tone(784,.16,'square',.018), 245);
}

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
  { id:7, name:'TOXIC FACTORY', subtitle:'SUPPLEMENT PRODUCTION LINE', bg:'s7bg', warriorA:'toxicElite', warriorB:'s7warriorB', brute:'s7brute', animal:'s7animal', air:'s7air', airName:'BIOHAZARD DRONE', airHp:50, bossAt:470, length:760, speed:286, spawn:[.61,1.00], maxGround:4, brief:'The fluorescent nonsense has a source. Factory shock troops, an industrial brute, a chemically improved animal and a hovering biohazard platform guard the production line.' },
  { id:8, name:'RENAL FORTRESS', subtitle:'FINAL RENAL COLLAPSE', bg:'s8bg', warriorA:'s8warriorA', warriorB:'s8warriorB', brute:'s8brute', animal:'s8animal', air:'s8air', airName:'RENAL OVERLORD UFO', airHp:58, bossAt:500, length:820, speed:296, spawn:[.58,.96], maxGround:4, brief:'The Renal Fortress is the end of the line. Every surviving mutant, one final brute, one impossible animal and the Renal Overlord air platform are waiting. Finish the campaign. Question the kidneys later.' }
];

const state = {
  mode:'title', score:0, distance:0, hp:100, ammo:90, maxAmmo:140, renal:0, rageTime:0,
  fireHeld:false, fireCooldown:0, time:0, last:performance.now(), spawnTimer:1, pickupTimer:2.5,
  shake:0, flash:0, banner:'', bannerTime:0, bullets:[], enemies:[], pickups:[], enemyShots:[], particles:[], hitBursts:[],
  stage:1, kills:0, stageKills:0, bossSpawned:false, bossDefeated:false, stageClearTimer:0,
  emergencyAmmoCooldown:0, cameoTime:0, cameo:null
};
const player = { x:148, y:GROUND-84, w:56, h:84, vy:0, onGround:true, invuln:0, shootPose:0, landTime:0, muzzleFlash:0 };
const stage = () => STAGES[state.stage - 1] || STAGES[0];
const keys = {};

function clearWorld() {
  for (const k of ['bullets','enemies','pickups','enemyShots','particles','hitBursts']) state[k].length = 0;
}
function applyStageDom() {
  const s = stage();
  if (UI.stageLine) UI.stageLine.innerHTML = `STAGE ${s.id} // ${s.name}<br>${VERSION_LABEL}`;
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
  bossMusicReset();
  Object.assign(player, { y:GROUND-player.h, vy:0, onGround:true, invuln:1.0, shootPose:0, landTime:0, muzzleFlash:0 });
  applyStageDom(); startStageMusic(state.stage, true); sync();
  tone(220,.05); setTimeout(()=>tone(330,.06),60); setTimeout(()=>tone(440,.10),125);
}
function reset() { setStage(1, true); }
function start() { wakeAudio(); if (['title','gameover','victory'].includes(state.mode)) reset(); }

function jump() {
  wakeAudio();
  if (state.mode !== 'playing') { start(); return; }
  if (player.onGround && state.stageClearTimer <= 0) {
    player.vy = -760; player.onGround = false; jumpSound();
  }
}
function playerMuzzle() {
  if (!player.onGround) return { x: player.x + 94, y: player.y + 20 };
  const stageGroundNudge = state.stage===1 ? 12 : 0;
  const dx = player.x - 38, dy = GROUND - 276 + stageGroundNudge, dw = 226, dh = 276;
  return { x: dx + dw * .76, y: dy + dh * .50 };
}
function fireOnce() {
  wakeAudio();
  if (state.mode !== 'playing') { start(); return; }
  if (state.stageClearTimer > 0 || state.fireCooldown > 0) return;
  if (state.ammo <= 0) {
    state.fireCooldown = .22; state.banner = 'CLICK CLICK // AMMO EMPTY'; state.bannerTime = .45; tone(95,.04); return;
  }
  const rage = state.rageTime > 0;
  state.fireCooldown = rage ? .055 : .095;
  state.ammo--;
  player.shootPose = .12;
  player.muzzleFlash = rage ? .13 : .10;
  const muzzle = playerMuzzle();
  state.bullets.push({ x:muzzle.x-12, y:muzzle.y-3, w:34, h:8, vx:rage?1080:890, damage:rage?3:1, life:.76 });
  gunSound();
  if (Math.random() < .55) particles(muzzle.x+10, muzzle.y+2, '#ffe53b', 6, .56);
}
function rage() {
  wakeAudio();
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
if (UI.musicMute) UI.musicMute.addEventListener('pointerdown', e => { e.preventDefault(); wakeAudio(); toggleMusicMute(); UI.musicMute.classList.toggle('active', !music.muted); });
if (UI.volume) {
  UI.volume.addEventListener('input', e => { wakeAudio(); setMusicVolume(Number(e.target.value || 0) / 100); });
  UI.volume.addEventListener('change', e => { wakeAudio(); setMusicVolume(Number(e.target.value || 0) / 100); });
}
refreshMusicUi();

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
function spawnHitBurst(x, y, boss = false) {
  state.hitBursts.push({ x, y, life: boss ? .26 : .18, max: boss ? .26 : .18, size: boss ? 54 : 34, boss });
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
    const hpBoost = state.stage === 1 ? 1.55 : (state.stage >= 7 ? 1.95 : 1.75);
    const bossHp = Math.round(s.airHp * hpBoost);
    state.enemies.push({
      type:'air', x:W+100, y:120, w:190, h:105,
      hp:bossHp, maxHp:bossHp,
      shoot:state.stage===1?.72:.78,
      damage:state.stage===1?32:24+state.stage,
      score:state.stage===1?7500:7000+state.stage*800,
      renal:35, phase:0, boss:true
    });
    state.banner = `${s.airName} INBOUND`; state.bannerTime = 1.2; state.shake = 6; bossMusicEscalate();
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
  state.hp=0; state.mode='gameover'; state.fireHeld=false; bossMusicReset();
  if (state.score > high) { high=Math.floor(state.score); localStorage.setItem(SAVE,String(high)); }
  tone(145,.16,'sawtooth',.035); setTimeout(()=>tone(92,.24,'square',.025),170); sync();
}
function victory() {
  state.mode='victory'; state.fireHeld=false; state.score += 25000; bossMusicReset();
  if (state.score > high) { high=Math.floor(state.score); localStorage.setItem(SAVE,String(high)); }
  tone(523,.09); setTimeout(()=>tone(659,.09),90); setTimeout(()=>tone(784,.18),180); sync();
}
function clearStage() {
  if (state.stageClearTimer > 0 || state.mode !== 'playing') return;
  state.stageClearTimer = 3.0; state.fireHeld=false; state.cameoTime=2.25; state.cameo=state.stage % 2 === 1 ? 'nikki' : 'hardcase'; bossMusicReset();
  state.score += 8000 * state.stage; state.banner=`STAGE ${state.stage} COMPLETE`; state.bannerTime=2.1; state.flash=.28; state.shake=9;
  state.enemies.length=0; state.enemyShots.length=0;
  stageClearSting();
}

function enemyHit(e,b) {
  e.hp -= b.damage; e.hitFlash=.12; b.life=0;
  spawnHitBurst(b.x + (b.w||0) * .5, b.y + (b.h||0) * .5, e.type==='air');
  particles(b.x,b.y,e.type==='air'?'#ffe53b':'#8aff2b',e.type==='air'?8:5,.7);
  if (e.hp <= 0) {
    e.dead=true; state.kills++; state.stageKills++; state.score += e.score||350;
    state.renal=clamp(state.renal+(e.renal||6),0,100); state.shake=Math.max(state.shake,e.type==='air'?12:e.type==='brute'?7:4);
    if (e.type==='air') { state.bossDefeated=true; state.banner=`${stage().airName} DESTROYED`; state.bannerTime=1.0; bossMusicReset(); }
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
  if (music.bossEscalated) {
    music.bossPulse -= dt;
    if (music.bossPulse <= 0) { bossPulseCue(); music.bossPulse = .9; }
  }
  state.emergencyAmmoCooldown=Math.max(0,state.emergencyAmmoCooldown-dt);
  if (state.ammo <= 10 && state.emergencyAmmoCooldown<=0 && !state.pickups.some(p=>p.type==='ammo')) spawnEmergencyAmmo();
  if ((state.fireHeld || keys.KeyX) && state.fireCooldown <= 0) fireOnce();

  const wasGrounded = player.onGround;
  player.muzzleFlash=Math.max(0,player.muzzleFlash-dt);
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
    e.phase=(e.phase||0)+dt; e.shoot-=dt; e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
    if (e.type==='air') {
      const hpRatio=clamp(e.hp/e.maxHp,0,1);
      const bossPhase=hpRatio>.66?1:hpRatio>.33?2:3;
      const xCenter=bossPhase===1?665:bossPhase===2?642:620;
      const xAmp=bossPhase===1?42:bossPhase===2?58:74;
      const yAmp=bossPhase===1?20:bossPhase===2?30:40;
      const targetX=xCenter+Math.sin(e.phase*(bossPhase===3?1.15:.78))*xAmp;
      e.x += (targetX-e.x)*Math.min(1,dt*(bossPhase===3?2.15:1.75));
      e.y = 198 + Math.sin(e.phase*(bossPhase===1?1.30:bossPhase===2?1.65:2.05))*yAmp;
      if (e.shoot<=0 && e.x<W-80) {
        const baseGap=bossPhase===1?.68:bossPhase===2?.52:.39;
        e.shoot=Math.max(.32,baseGap-state.stage*.018);
        const baseDmg=12+Math.floor(state.stage*.7);
        state.enemyShots.push({x:e.x+26,y:e.y+66,w:22,h:8,vx:-530-state.stage*10,vy:bossPhase>=2?-34:0,life:2.25,damage:baseDmg});
        state.enemyShots.push({x:e.x+82,y:e.y+86,w:20,h:8,vx:-490-state.stage*8,vy:bossPhase>=2?34:0,life:2.25,damage:baseDmg-1});
        if(bossPhase>=2) state.enemyShots.push({x:e.x+55,y:e.y+76,w:20,h:8,vx:-510-state.stage*9,vy:0,life:2.25,damage:baseDmg});
        if(bossPhase===3 && state.stage>=5){
          state.enemyShots.push({x:e.x+48,y:e.y+72,w:18,h:7,vx:-500-state.stage*9,vy:-88,life:2.25,damage:baseDmg});
          state.enemyShots.push({x:e.x+62,y:e.y+80,w:18,h:7,vx:-500-state.stage*9,vy:88,life:2.25,damage:baseDmg});
        }
        if(bossPhase===3){ state.shake=Math.max(state.shake,3.5); }
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
    shot.x += shot.vx*dt; shot.y += (shot.vy||0)*dt; shot.life -= dt;
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
  for (const h of state.hitBursts) h.life -= dt;

  state.bullets=state.bullets.filter(b=>b.life>0&&b.x<W+80);
  state.enemyShots=state.enemyShots.filter(s=>s.life>0&&s.x>-80);
  state.enemies=state.enemies.filter(e=>!e.dead && (e.type==='air'||e.x>-220));
  state.pickups=state.pickups.filter(p=>p.x>-100);
  state.particles=state.particles.filter(p=>p.life>0);
  state.hitBursts=state.hitBursts.filter(h=>h.life>0);

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
function comicBurst(t,x,y,size,fill='#fff',glow='#8aff2b',align='center',rot=0){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rot);
  ctx.font=`900 ${size}px "Barlow Condensed",Impact,sans-serif`;
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  ctx.lineJoin='round';
  ctx.miterLimit=2;
  ctx.shadowColor=glow;
  ctx.shadowBlur=Math.max(18,size*.8);
  ctx.strokeStyle='rgba(0,0,0,.96)';
  ctx.lineWidth=Math.max(4,size*.22);
  ctx.strokeText(t,0,0);
  const grad=ctx.createLinearGradient(-size, -size*.7, size, size*.9);
  grad.addColorStop(0,fill);
  grad.addColorStop(.55,'#ffffff');
  grad.addColorStop(1,glow);
  ctx.fillStyle=grad;
  ctx.fillText(t,0,0);
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,255,255,.35)';
  ctx.lineWidth=Math.max(1.5,size*.06);
  ctx.strokeText(t,0,0);
  ctx.restore();
}

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
    const cx=player.x+44, cy=player.y+36, pulse=1+Math.sin(state.time*11)*.08;
    ctx.save();
    const grad=ctx.createRadialGradient(cx,cy,16,cx,cy,188*pulse);
    grad.addColorStop(0,'rgba(255,255,255,.04)');
    grad.addColorStop(.22,'rgba(138,255,43,.10)');
    grad.addColorStop(.55,'rgba(138,255,43,.24)');
    grad.addColorStop(.78,'rgba(57,215,255,.13)');
    grad.addColorStop(1,'rgba(138,255,43,0)');
    ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(cx,cy,152*pulse,176*pulse,0,0,TWO); ctx.fill();

    ctx.lineWidth=5; ctx.shadowColor='#8aff2b'; ctx.shadowBlur=46;
    for(let i=0;i<3;i++){
      ctx.globalAlpha=.68-i*.15;
      ctx.strokeStyle=i===1?'#39d7ff':'#8aff2b';
      ctx.beginPath();
      ctx.ellipse(cx,cy,100+i*18,124+i*16,state.time*(i%2?.55:-.42),0,TWO);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    for(let i=0;i<12;i++){
      const a=state.time*(3.4+i*.025)+i*TWO/12;
      const radius=92+(i%3)*24;
      const rx=Math.cos(a)*radius, ry=Math.sin(a*1.13)*(58+(i%4)*9);
      ctx.globalAlpha=.48+.22*Math.sin(state.time*7+i);
      ctx.fillStyle=i%3===0?'#39d7ff':i%2===0?'#8aff2b':'#ffe53b';
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.arc(cx+rx,cy+ry,3+(i%4),0,TWO); ctx.fill();
    }
    ctx.restore();
  }

  const stageGroundNudge = state.stage===1 ? 12 : 0;
  let key='rebHdIdle', dw=163, dh=244, dx=player.x-50, dy=GROUND-244+stageGroundNudge;

  if(!player.onGround){
    key='rebHdJump'; dw=165; dh=244; dx=player.x-51; dy=player.y-94 + (state.stage===1 ? 6 : 0);
  } else if(player.landTime>0){
    key='rebHdLand'; dw=168; dh=244; dx=player.x-52; dy=GROUND-244+stageGroundNudge;
  } else if(shooting){
    key='rebHdFire'; dw=226; dh=276; dx=player.x-38; dy=GROUND-276+stageGroundNudge;
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

  if((shooting || player.muzzleFlash>0) && player.onGround){
    const muzzle=playerMuzzle(), fx=muzzle.x+2, fy=muzzle.y+1, p=clamp((player.muzzleFlash||0)*10,0,1);
    ctx.save();
    ctx.translate(fx,fy);
    ctx.globalAlpha=.55+.45*p;
    ctx.shadowColor='#ffe53b';
    ctx.shadowBlur=28+30*p;
    ctx.fillStyle='rgba(255,229,59,.98)';
    ctx.beginPath();
    ctx.moveTo(-2,0); ctx.lineTo(30+26*p,-11-5*p); ctx.lineTo(21+12*p,0); ctx.lineTo(30+26*p,11+5*p);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,45,149,.72)';
    ctx.beginPath(); ctx.arc(7,0,8+5*p,0,TWO); ctx.fill();
    ctx.fillStyle='rgba(138,255,43,.32)';
    ctx.beginPath(); ctx.ellipse(25+18*p,0,18+14*p,8+5*p,0,0,TWO); ctx.fill();
    ctx.restore();
    comicBurst('YEAHHHH!',player.x+112,player.y-52,25,'#ff55cf','#39d7ff','center',-.08);
    comicBurst('DRRRRRT',player.x+172,player.y+18,24,'#ffe53b','#ff2d95','left',.04);
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
function enemyGlowColor(){
  return ['#8aff2b','#ff2d95','#8aff2b','#39d7ff','#ff2d95','#39d7ff','#8aff2b','#ff2d95'][state.stage-1] || '#8aff2b';
}
function artEnemyHD(key,x,y,w,h,flipX=false,alpha=1){
  if(!ready(key)) return false;
  const img=ART[key], glow=enemyGlowColor();
  const draw=()=>{
    if(flipX){ ctx.translate(x+w,y); ctx.scale(-1,1); ctx.drawImage(img,0,0,w,h); }
    else ctx.drawImage(img,x,y,w,h);
  };
  ctx.save();
  ctx.globalAlpha=.38*alpha; ctx.shadowColor=glow; ctx.shadowBlur=24;
  draw(); ctx.restore();
  ctx.save(); ctx.globalAlpha=alpha; draw(); ctx.restore();
  return true;
}
function drawHitBursts(){
  for(const h of state.hitBursts){
    const p=clamp(h.life/h.max,0,1), r=h.size*(1-p*.45), x=h.x, y=h.y;
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=p;
    const grad=ctx.createRadialGradient(x,y,2,x,y,r);
    grad.addColorStop(0,'rgba(255,255,255,.98)');
    grad.addColorStop(.18,h.boss?'rgba(255,229,59,.96)':'rgba(255,255,255,.85)');
    grad.addColorStop(.52,h.boss?'rgba(255,45,149,.54)':'rgba(138,255,43,.48)');
    grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(x,y,r,0,TWO); ctx.fill();
    ctx.strokeStyle=h.boss?'rgba(255,229,59,.85)':'rgba(57,215,255,.72)';
    ctx.lineWidth=3;
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const a=(i/8)*TWO + state.time*7*(h.boss?-.08:.05);
      const outer=r*(1.1+(i%2)*.15), inner=r*.34;
      const sx=x+Math.cos(a)*inner, sy=y+Math.sin(a)*inner;
      const ex=x+Math.cos(a)*outer, ey=y+Math.sin(a)*outer;
      ctx.moveTo(sx,sy); ctx.lineTo(ex,ey);
    }
    ctx.stroke();
    ctx.restore();
  }
}
function drawSpriteHitGlow(e, glow) {
  if (!(e.hitFlash>0)) return;
  const alpha = clamp(e.hitFlash * 4.5, 0, .45);
  const x = e.x + e.w / 2;
  const y = e.y + e.h / 2;
  const rx = e.type === 'air' ? e.w * .75 : e.w * .58;
  const ry = e.type === 'air' ? e.h * .55 : e.h * .48;
  ctx.save();
  ctx.globalCompositeOperation='lighter';
  ctx.globalAlpha=alpha;
  const grad = ctx.createRadialGradient(x, y, 4, x, y, Math.max(rx, ry));
  grad.addColorStop(0,'rgba(255,255,255,.98)');
  grad.addColorStop(.22,'rgba(255,255,255,.75)');
  grad.addColorStop(.58, e.type === 'air' ? 'rgba(255,45,149,.34)' : 'rgba(138,255,43,.32)');
  grad.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,TWO); ctx.fill();
  ctx.restore();
}
function drawEnemy(e){
  const s=stage(), glow=enemyGlowColor();
  ctx.save();
  ctx.globalAlpha=.28; ctx.fillStyle='#000';
  ctx.beginPath();
  ctx.ellipse(e.x+e.w/2,e.type==='air'?e.y+e.h+8:GROUND+5,e.type==='air'?e.w*.68:e.w*.78,e.type==='air'?10:14,0,0,TWO);
  ctx.fill(); ctx.restore();

  if (e.type==='air') {
    const x=e.x-48,y=e.y-42,w=288,h=196;
    const key=state.stage===1?'gunship':s.air;
    if(!artEnemyHD(key,x,y,w,h,false,1)) drawProceduralEnemy(e);
    drawSpriteHitGlow(e, '#ffe53b');
    return;
  }

  const bob=Math.sin((e.phase||0)*5+e.x*.01)*1.5;
  const centered=(key,w,h)=>artEnemyHD(key,e.x+e.w/2-w/2,GROUND-h+bob,w,h,false,1);

  let ok=false;
  if(state.stage===1){
    ok=e.type==='animal'?centered('hound',204,166):centered('trooper',182,204);
  }else if(e.type==='warriorA') ok=centered(s.warriorA,188,210);
  else if(e.type==='warriorB') ok=centered(s.warriorB,194,216);
  else if(e.type==='animal') ok=centered(s.animal,214,176);
  else if(e.type==='brute') ok=centered(s.brute,238,250);

  if(!ok) drawProceduralEnemy(e);
  drawSpriteHitGlow(e, glow);
}
function drawPickup(p){const bob=Math.sin(p.spin)*5,y=p.y+bob;ctx.save();ctx.shadowBlur=22;ctx.shadowColor=p.type==='creatine'?'#8aff2b':p.type==='serum'?'#39d7ff':'#ffe53b';if(p.type==='creatine')art('creatine',p.x-18,y-24,82,82);else if(p.type==='serum')art('serum',p.x-18,y-22,76,82);else if(!art('ammo',p.x-14,y-16,64,64)){ctx.fillStyle='#171817';ctx.fillRect(p.x,y,52,38);ctx.strokeStyle='#ffe53b';ctx.strokeRect(p.x,y,52,38);}ctx.restore();}
function drawBullet(b){
  ctx.save();
  ctx.shadowColor='#ffe53b'; ctx.shadowBlur=16;
  const g=ctx.createLinearGradient(b.x-18,b.y,b.x+b.w,b.y);
  g.addColorStop(0,'rgba(255,45,149,0)'); g.addColorStop(.35,'rgba(255,45,149,.72)'); g.addColorStop(1,'#fff7b0');
  ctx.fillStyle=g; ctx.fillRect(b.x-18,b.y,b.w+18,b.h);
  ctx.fillStyle='#8aff2b'; ctx.fillRect(b.x+b.w-4,b.y+1,6,Math.max(2,b.h-2));
  ctx.restore();
}
function drawEnemyShot(s){ctx.save();ctx.shadowColor='#ff2d95';ctx.shadowBlur=8;ctx.fillStyle='#ff2d95';ctx.fillRect(s.x,s.y,s.w,s.h);ctx.restore();}
function drawParticles(){for(const p of state.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;}
function drawHud(){
  text('HP',24,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(56,59,150,18);ctx.fillStyle=state.hp>35?'#8aff2b':'#ff2d95';ctx.fillRect(59,62,144*clamp(state.hp/100,0,1),12);
  text(`AMMO ${state.ammo}`,224,68,18,state.ammo<=15?'#ff2d95':'#ffe53b');text('RENAL',360,68,18,'#fff');ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(420,59,145,18);ctx.fillStyle=state.rageTime>0?'#ffe53b':'#8aff2b';ctx.fillRect(423,62,139*(state.rageTime>0?1:state.renal/100),12);
  shadow(`SCORE ${pad(state.score)}`,W-24,37,24,'#fff','right');shadow(`KILLS ${state.kills}`,W-24,68,18,'#8aff2b','right');
  const boss=state.enemies.find(e=>!e.dead&&e.type==='air');
  if(boss){
    const pct=clamp(boss.hp/boss.maxHp,0,1);
    ctx.fillStyle='rgba(0,0,0,.72)'; ctx.fillRect(W/2-150,103,300,17);
    const bg=ctx.createLinearGradient(W/2-147,0,W/2+147,0); bg.addColorStop(0,'#ff2d95'); bg.addColorStop(.55,'#ffe53b'); bg.addColorStop(1,'#8aff2b');
    ctx.fillStyle=bg; ctx.fillRect(W/2-147,106,294*pct,11);
    text(`${stage().airName} // ${Math.ceil(pct*100)}%`,W/2,128,15,'#fff','center');
  }
  if(state.bannerTime>0){ctx.globalAlpha=clamp(state.bannerTime*2,0,1);ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(W/2-300,112,600,55);shadow(state.banner,W/2,140,24,state.banner.includes('RENAL')?'#ffe53b':'#fff','center');ctx.globalAlpha=1;}
}
function drawTitle(){
  drawBackground();ctx.fillStyle='rgba(0,0,0,.60)';ctx.fillRect(0,0,W,H);
  if(!art('cover',32,46,400,400,.98)){ctx.fillStyle='#12091d';ctx.fillRect(32,46,400,400);shadow('RENAL REVENGE',232,246,40,'#8aff2b','center');}
  shadow('REB',690,105,82,'#ff2d95','center');shadow('RENAL REVENGE',690,172,48,'#8aff2b','center');shadow('8 STAGE CAMPAIGN',690,226,28,'#ffe53b','center');shadow('DRRRRRT ENGINE V3.2',690,266,19,'#39d7ff','center');
  ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(470,316,440,94);ctx.strokeStyle='rgba(255,229,59,.60)';ctx.lineWidth=2;ctx.strokeRect(470,316,440,94);shadow('TAP SCREEN OR PRESS ENTER',690,348,25,'#ffe53b','center');text(`HIGH SCORE ${pad(high)}`,690,383,18,'#39d7ff','center');
}
function drawCameo(){
  if(state.cameoTime<=0||!state.cameo)return;
  const hard=state.cameo==='hardcase',x=625,y=154,w=292,h=292;
  const key=hard?'hardcaseCard':'nikkiCard';
  ctx.save(); ctx.globalAlpha=clamp(state.cameoTime*2,0,1);
  ctx.shadowColor=hard?'#39d7ff':'#ff2d95'; ctx.shadowBlur=28;
  if(!drawCoverImage(key,x,y,w,h,1)){
    ctx.fillStyle=hard?'#10384a':'#4a1234';ctx.fillRect(x,y,w,h);
    shadow(hard?'H87':'NN',x+w/2,y+h/2,70,'#fff','center');
  }
  ctx.restore();
}
function drawStageClear(){
  if(state.stageClearTimer<=0)return;
  ctx.fillStyle='rgba(0,0,0,.66)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(5,8,7,.88)';ctx.fillRect(35,122,555,310);
  ctx.strokeStyle='rgba(138,255,43,.42)';ctx.lineWidth=2;ctx.strokeRect(35,122,555,310);
  shadow(`STAGE ${state.stage} CLEARED`,310,176,48,'#8aff2b','center');
  shadow(stage().name,310,226,28,'#fff','center');
  text(state.stage<8?`NEXT: ${STAGES[state.stage].name}`:'FINAL RENAL COLLAPSE SURVIVED',310,276,20,'#ffe53b','center');
  text(state.cameo==='hardcase'?"HARDCASE '87 // TACTICAL SUPPORT":"NIKKI NITRO // TITAN BABE SUPPORT",310,326,18,state.cameo==='hardcase'?'#39d7ff':'#ff2d95','center');
  text('FULL HD SEQUEL DEPLOYMENT',310,362,17,'#39d7ff','center');
  text('DRRRRRT. MOVE OUT.',310,396,20,'#fff','center');
  drawCameo();
}
function drawEnd(victoryMode){ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(0,0,W,H);shadow(victoryMode?'RENAL REVENGE COMPLETE':'RENAL FAILURE',W/2,155,58,victoryMode?'#8aff2b':'#ff2d95','center');if(victoryMode)shadow('ALL 8 STAGES CLEARED',W/2,208,24,'#ffe53b','center');shadow(`SCORE ${pad(state.score)}`,W/2,260,30,'#fff','center');text(`${state.kills} KILLS // STAGE ${state.stage}/8`,W/2,300,21,'#39d7ff','center');ctx.fillStyle='rgba(5,8,7,.93)';ctx.fillRect(W/2-220,345,440,70);ctx.strokeStyle='rgba(138,255,43,.48)';ctx.strokeRect(W/2-220,345,440,70);shadow('TAP TO REDEPLOY',W/2,380,25,'#fff','center');}
function render(){
  const sx=state.shake>0?Math.round(rand(-state.shake,state.shake)):0,sy=state.shake>0?Math.round(rand(-state.shake*.5,state.shake*.5)):0;
  ctx.save();ctx.translate(sx,sy);
  if(state.mode==='title')drawTitle();else{drawBackground();for(const p of state.pickups)drawPickup(p);for(const s of state.enemyShots)drawEnemyShot(s);for(const b of state.bullets)drawBullet(b);for(const e of state.enemies)drawEnemy(e);drawHitBursts();drawPlayer();drawParticles();drawHud();drawStageClear();if(state.mode==='gameover')drawEnd(false);if(state.mode==='victory')drawEnd(true);}
  if(state.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(.34,state.flash)})`;ctx.fillRect(0,0,W,H);}ctx.restore();
}
function loop(now){const dt=Math.min(.034,(now-state.last)/1000||0);state.last=now;update(dt);render();requestAnimationFrame(loop);}

applyStageDom();sync();requestAnimationFrame(loop);
})();
