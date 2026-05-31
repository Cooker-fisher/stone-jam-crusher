/* Stone Crusher Tycoon / 石くだき工場
 * Mobile-first (portrait) idle/clicker game.
 *   - A jaw crusher runs by itself (idle auto-crush) and you can TAP to crush faster.
 *   - Crushing stones earns ¥. Spend ¥ on 設備 (equipment) and 人員 (personnel)
 *     upgrades to crush bigger, stronger, more valuable stones.
 *   - Progress persists (localStorage) and you earn while away (offline income).
 */

"use strict";

// ----------------------------------------------------------------------------
// Config / tuning
// ----------------------------------------------------------------------------
const CONFIG = {
  rockBaseHp: 4,
  rockHpGrowth: 1.10, // hp per crushed stone
  rockBaseValue: 5,
  rockValueGrowth: 1.092, // ¥ per crushed stone
  tierEvery: 10, // stones per named tier
  offlineCapHours: 8,
  saveEverySec: 4,
  flySpin: 2.0, // flywheel rad/sec
  swingAmp: 7, // jaw swing px
};

const STONE_TIERS = [
  "砂利", "小石", "玉石", "割栗石", "岩塊", "硬岩",
  "大岩", "花崗岩", "玄武岩", "巨岩", "岩盤", "隕石",
];

// kind: "tap" (+ click power), "auto" (+ ¥/sec), "mult" (× all output)
const UPGRADES = [
  { id: "jaw1",   cat: "設備", name: "鋼鉄ジョー",       icon: "🦿", desc: "叩く力 +1",     base: 12,    mul: 1.14, kind: "tap",  amt: 1 },
  { id: "jaw2",   cat: "設備", name: "焼入れジョー",     icon: "🗜️", desc: "叩く力 +6",     base: 160,   mul: 1.15, kind: "tap",  amt: 6 },
  { id: "ram",    cat: "設備", name: "油圧ラム",         icon: "🛠️", desc: "叩く力 +40",    base: 2000,  mul: 1.16, kind: "tap",  amt: 40 },
  { id: "fly",    cat: "設備", name: "大型フライホイール", icon: "⚙️", desc: "自動 +3 /秒",   base: 500,   mul: 1.15, kind: "auto", amt: 3 },
  { id: "motor",  cat: "設備", name: "強力モーター",     icon: "🔌", desc: "自動 +18 /秒",  base: 6000,  mul: 1.16, kind: "auto", amt: 18 },
  { id: "crush",  cat: "設備", name: "二次破砕機",       icon: "🏭", desc: "自動 +90 /秒",  base: 70000, mul: 1.17, kind: "auto", amt: 90 },
  { id: "labor",  cat: "人員", name: "作業員",           icon: "👷", desc: "自動 +1 /秒",   base: 18,    mul: 1.15, kind: "auto", amt: 1 },
  { id: "hammer", cat: "人員", name: "ハンマー職人",     icon: "🔨", desc: "自動 +5 /秒",   base: 220,   mul: 1.15, kind: "auto", amt: 5 },
  { id: "loader", cat: "人員", name: "重機オペレーター", icon: "🚜", desc: "自動 +25 /秒",  base: 2600,  mul: 1.16, kind: "auto", amt: 25 },
  { id: "foreman",cat: "人員", name: "親方",             icon: "🧑‍🏭", desc: "全産出 ×1.1",  base: 9000,  mul: 1.45, kind: "mult", amt: 0.1 },
];

const COLORS = {
  skyTop: "#caa977",
  skyBottom: "#a07d50",
  wall: "#b39468",
  wallDark: "#937552",
  ground: "#9c7c50",
  groundDark: "#7c5f3a",
  steel: "#6c5a48",
  steelLight: "#857058",
  steelDark: "#3f3225",
  steelDarker: "#2b2118",
  rust: "#8c4a28",
  bolt: "#241a12",
  rock: "#7d7060",
  rockDark: "#574d40",
  rockLight: "#9a8c76",
  gravel: "#b29a72",
  dust: "rgba(214,190,142,0.5)",
  crack: "rgba(28,20,12,0.7)",
};

// ----------------------------------------------------------------------------
// State + persistence
// ----------------------------------------------------------------------------
const SAVE_KEY = "stone-crusher-tycoon.v1";

function defaultState() {
  return {
    money: 0,
    totalMoney: 0,
    rocksCrushed: 0,
    counts: {},
    lastTime: Date.now(),
  };
}

let state = defaultState();
let tapPower = 1;
let autoPerSec = 0;
let globalMult = 1;
let rock = null;

function safeStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (e) {
    return null;
  }
}

function loadState() {
  const store = safeStorage();
  if (!store) return;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state = Object.assign(defaultState(), data);
    state.counts = data.counts || {};
  } catch (e) {
    state = defaultState();
  }
}

function saveState() {
  const store = safeStorage();
  if (!store) return;
  state.lastTime = Date.now();
  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore quota errors */
  }
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function rnd(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
  let u = 0;
  let v = n;
  while (v >= 1000 && u < units.length - 1) {
    v /= 1000;
    u += 1;
  }
  return (v >= 100 ? v.toFixed(0) : v.toFixed(2)) + units[u];
}

function tierIndex(crushed) {
  return Math.floor(crushed / CONFIG.tierEvery);
}
function stoneName(crushed) {
  const t = tierIndex(crushed);
  if (t < STONE_TIERS.length) return STONE_TIERS[t];
  return STONE_TIERS[STONE_TIERS.length - 1] + " Lv" + (t - STONE_TIERS.length + 2);
}

function upgradeCost(u) {
  const c = state.counts[u.id] || 0;
  return Math.floor(u.base * Math.pow(u.mul, c));
}

function recompute() {
  let tapAdd = 0;
  let autoAdd = 0;
  let foremen = 0;
  for (const u of UPGRADES) {
    const c = state.counts[u.id] || 0;
    if (!c) continue;
    if (u.kind === "tap") tapAdd += u.amt * c;
    else if (u.kind === "auto") autoAdd += u.amt * c;
    else if (u.kind === "mult") foremen += c;
  }
  globalMult = Math.pow(1.1, foremen);
  tapPower = (1 + tapAdd) * globalMult;
  autoPerSec = autoAdd * globalMult;
}

function workerCount() {
  return (state.counts.labor || 0) + (state.counts.hammer || 0) + (state.counts.loader || 0);
}

// ----------------------------------------------------------------------------
// Rocks
// ----------------------------------------------------------------------------
function makeRock() {
  const d = state.rocksCrushed;
  const hp = Math.max(1, Math.round(CONFIG.rockBaseHp * Math.pow(CONFIG.rockHpGrowth, d)));
  const value = Math.max(1, Math.round(CONFIG.rockBaseValue * Math.pow(CONFIG.rockValueGrowth, d)));
  const t = tierIndex(d);
  return {
    hp,
    maxHp: hp,
    value,
    name: stoneName(d),
    sizeScale: clamp(0.7 + t * 0.04, 0.7, 1.25),
    seed: d * 2.39 + 7,
    spawn: 0, // 0..1 pop-in
  };
}

function crushRock() {
  state.money += rock.value;
  state.totalMoney += rock.value;
  state.rocksCrushed += 1;
  spawnCrushFx();
  rock = makeRock();
}

let damageCarry = 0;
function applyDamage(d) {
  if (!rock) return;
  let guard = 0;
  rock.hp -= d;
  while (rock.hp <= 0 && guard < 64) {
    const leftover = -rock.hp;
    crushRock();
    rock.hp -= leftover; // carry overflow into the next rock
    guard += 1;
  }
}

// ----------------------------------------------------------------------------
// Effects
// ----------------------------------------------------------------------------
const particles = [];
const floaters = [];
let shake = 0;
let lastTapAt = 0;

function spawnDust(x, y, n, color) {
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const sp = rand(30, 150);
    particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      life: rand(0.3, 0.8),
      max: 0.8,
      r: rand(2, 6),
      c: color || "#d6be8e",
    });
  }
}

function spawnCrushFx() {
  const L = layout();
  spawnDust(L.rockX, L.rockY, 16, "#d6be8e");
  spawnDust(L.rockX, L.rockY, 8, COLORS.rockLight);
  floaters.push({ x: L.rockX, y: L.rockY - 10, text: "+¥" + fmt(rock.value), life: 1, max: 1 });
  shake = Math.min(10, shake + 4);
}

function tapCrush(x, y) {
  if (!rock) return;
  lastTapAt = performance.now ? performance.now() : Date.now();
  applyDamage(tapPower);
  spawnDust(x, y, 5, "#e7d3a6");
  shake = Math.min(8, shake + 2.4);
}

function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 380 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floaters.length - 1; i >= 0; i -= 1) {
    const f = floaters[i];
    f.y -= 42 * dt;
    f.life -= dt * 0.9;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 30);
}

// ----------------------------------------------------------------------------
// Canvas + layout
// ----------------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");

let W = 430;
let H = 620;
let DPR = 1;
let time = 0;
let flyAngle = 0;

function resize() {
  DPR = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  W = (stage && stage.clientWidth) || 430;
  H = (stage && stage.clientHeight) || 620;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  if (canvas.style) {
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function layout() {
  return {
    groundY: H * 0.9,
    hopTopY: H * 0.05,
    hopBotY: H * 0.36,
    hopTopL: W * 0.08,
    hopTopR: W * 0.92,
    hopBotL: W * 0.33,
    hopBotR: W * 0.67,
    jawTopY: H * 0.36,
    jawBotY: H * 0.62,
    rockX: W * 0.5,
    rockY: H * 0.49,
    frameL: W * 0.18,
    frameR: W * 0.82,
    frameT: H * 0.55,
    frameB: H * 0.95,
    flyX: W * 0.33,
    flyY: H * 0.74,
    flyR: Math.min(W, H) * 0.135,
    motorX: W * 0.68,
    motorY: H * 0.8,
    gratX: W * 0.7,
    gratY: H * 0.52,
    outY: H * 0.9,
  };
}

// ----------------------------------------------------------------------------
// Drawing primitives
// ----------------------------------------------------------------------------
function roundRect(x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw || 1;
    ctx.stroke();
  }
}

function bolt(x, y, r) {
  ctx.fillStyle = COLORS.bolt;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Irregular rock with shading + facets, clipped.
function drawRock(cx, cy, size, seed, base, squash) {
  squash = squash || 0.9;
  const pts = 9;
  const verts = [];
  for (let i = 0; i < pts; i += 1) {
    const a = (i / pts) * Math.PI * 2;
    const rr = size * (0.74 + 0.26 * rnd(seed + i * 1.7));
    verts.push([Math.cos(a) * rr, Math.sin(a) * rr * squash]);
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  verts.forEach(([vx, vy], i) => (i ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy)));
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.strokeStyle = COLORS.rockDark;
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = "rgba(255,246,225,0.16)";
  ctx.beginPath();
  ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.85, size * 0.55, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(34,24,15,0.34)";
  ctx.beginPath();
  ctx.ellipse(size * 0.35, size * 0.45, size * 0.9, size * 0.65, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,44,30,0.35)";
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 3; k += 1) {
    const a = rnd(seed + 40 + k) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size * squash);
    ctx.stroke();
  }
  ctx.restore();
}

// ----------------------------------------------------------------------------
// Scene
// ----------------------------------------------------------------------------
function drawBackground(L) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, W, L.groundY);
  ctx.fillStyle = COLORS.wallDark;
  for (let i = 0; i < 60; i += 1) {
    const x = (i * 89) % W;
    const y = (i * 53) % (L.groundY - 10);
    ctx.fillRect(x, y, 22 + (i % 3) * 8, 9);
  }

  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, L.groundY, W, H - L.groundY);
  ctx.fillStyle = COLORS.groundDark;
  for (let i = 0; i < 120; i += 1) {
    const x = (i * 61) % W;
    const y = L.groundY + ((i * 37) % (H - L.groundY));
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFrame(L) {
  // heavy crusher body
  roundRect(L.frameL, L.frameT, L.frameR - L.frameL, L.frameB - L.frameT, 14, COLORS.steel, COLORS.steelDark, 4);
  // top deck
  ctx.fillStyle = COLORS.steelLight;
  ctx.fillRect(L.frameL + 6, L.frameT + 6, L.frameR - L.frameL - 12, 10);
  // bolts around the rim
  const bx0 = L.frameL + 16;
  const bx1 = L.frameR - 16;
  for (let x = bx0; x <= bx1; x += (bx1 - bx0) / 6) {
    bolt(x, L.frameT + 22, 3);
    bolt(x, L.frameB - 16, 3);
  }
  // maker plate
  roundRect(L.frameR - 92, L.frameT + 40, 70, 26, 4, COLORS.rust, COLORS.steelDarker, 2);
  ctx.fillStyle = "#e9d4ac";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("JAW-126", L.frameR - 57, L.frameT + 57);
  ctx.textAlign = "left";
  // rust streaks
  ctx.fillStyle = "rgba(140,74,40,0.35)";
  ctx.fillRect(L.frameL + 20, L.frameT + 30, 7, 90);
  ctx.fillRect(L.frameR - 40, L.frameT + 50, 6, 70);
}

function drawHopper(L) {
  // funnel walls (steel) — left + right
  ctx.fillStyle = COLORS.steelLight;
  ctx.beginPath();
  ctx.moveTo(L.hopTopL - 16, L.hopTopY);
  ctx.lineTo(L.hopTopL, L.hopTopY);
  ctx.lineTo(L.hopBotL, L.hopBotY);
  ctx.lineTo(L.hopBotL - 18, L.hopBotY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(L.hopTopR + 16, L.hopTopY);
  ctx.lineTo(L.hopTopR, L.hopTopY);
  ctx.lineTo(L.hopBotR, L.hopBotY);
  ctx.lineTo(L.hopBotR + 18, L.hopBotY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(L.hopTopL, L.hopTopY);
  ctx.lineTo(L.hopBotL, L.hopBotY);
  ctx.moveTo(L.hopTopR, L.hopTopY);
  ctx.lineTo(L.hopBotR, L.hopBotY);
  ctx.stroke();
  // rim
  roundRect(L.hopTopL - 18, L.hopTopY - 10, L.hopTopR - L.hopTopL + 36, 14, 4, COLORS.steel, COLORS.steelDark, 2);
}

// Dense mass of feed rocks inside the hopper funnel.
function drawRockPile(L) {
  const rows = 7;
  for (let r = rows - 1; r >= 0; r -= 1) {
    const fy = r / (rows - 1); // 0 top .. 1 bottom
    const y = L.hopTopY + 14 + fy * (L.hopBotY - L.hopTopY - 10);
    const leftX = L.hopTopL + (L.hopBotL - L.hopTopL) * fy + 10;
    const rightX = L.hopTopR + (L.hopBotR - L.hopTopR) * fy - 10;
    const span = rightX - leftX;
    const count = Math.max(2, Math.floor(span / 26));
    for (let i = 0; i < count; i += 1) {
      const seed = r * 31.7 + i * 5.3 + 2;
      const x = leftX + (i + 0.5) * (span / count) + (rnd(seed) - 0.5) * 12;
      const size = 10 + rnd(seed + 1) * 9 + fy * 5;
      const tone = rnd(seed + 2);
      const base = tone < 0.33 ? COLORS.rock : tone < 0.66 ? COLORS.rockLight : COLORS.rockDark;
      drawRock(x, y, size, seed, base, 0.92);
    }
  }
}

function drawJaws(L, swing) {
  const topL = L.hopBotL;
  const topR = L.hopBotR;
  const gap = W * 0.045;
  const botL = L.rockX - gap;
  const botR = L.rockX + gap;

  // dark throat behind — gradient to near-black to read as a deep hole
  const tg = ctx.createLinearGradient(0, L.jawTopY, 0, L.jawBotY + 24);
  tg.addColorStop(0, COLORS.steelDarker);
  tg.addColorStop(1, "#120c08");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(topL, L.jawTopY);
  ctx.lineTo(topR, L.jawTopY);
  ctx.lineTo(botR, L.jawBotY + 24);
  ctx.lineTo(botL, L.jawBotY + 24);
  ctx.closePath();
  ctx.fill();

  drawJawPlate(topL, L.jawTopY, botL, L.jawBotY, 1); // fixed (left)
  drawJawPlate(topR + swing, L.jawTopY, botR + swing, L.jawBotY, -1); // swing (right)
}

function drawJawPlate(tx, ty, bx, by, dir) {
  const w = 26 * dir;
  ctx.fillStyle = COLORS.steel;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - w, ty);
  ctx.lineTo(bx - w, by);
  ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // teeth (corrugation) facing the throat
  ctx.strokeStyle = COLORS.steelDarker;
  ctx.lineWidth = 3;
  const steps = 7;
  for (let i = 1; i < steps; i += 1) {
    const f = i / steps;
    const x = tx + (bx - tx) * f;
    const y = ty + (by - ty) * f;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - w * 0.42, y);
    ctx.stroke();
  }
}

function drawFocusRock(L) {
  if (!rock) return;
  const dmg = 1 - rock.hp / rock.maxHp;
  const pop = rock.spawn < 1 ? 0.6 + 0.4 * rock.spawn : 1;
  const size = Math.min(W * 0.2, 62) * rock.sizeScale * pop;
  const sx = (Math.random() - 0.5) * shake * 0.5;
  const sy = (Math.random() - 0.5) * shake * 0.5;
  const cx = L.rockX + sx;
  const cy = L.rockY + sy;

  // pulsing "tap me" ring so the crushable rock stands out in the throat
  const glow = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.strokeStyle = "rgba(230,180,73," + (0.22 + 0.28 * glow).toFixed(3) + ")";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, size + 9, 0, Math.PI * 2);
  ctx.stroke();

  drawRock(cx, cy, size, rock.seed, COLORS.rockLight, 0.95);

  // accumulating cracks
  const cracks = Math.floor(dmg * 7);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = COLORS.crack;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < cracks; i += 1) {
    const a = rnd(rock.seed + 100 + i) * Math.PI * 2;
    const len = size * (0.5 + rnd(rock.seed + 200 + i) * 0.6);
    let px = 0;
    let py = 0;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let s = 1; s <= 3; s += 1) {
      px += Math.cos(a + (rnd(rock.seed + i * 3 + s) - 0.5)) * (len / 3);
      py += Math.sin(a + (rnd(rock.seed + i * 3 + s) - 0.5)) * (len / 3);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // HP bar above the rock
  const bw = size * 2.0;
  const bh = 7;
  const by = cy - size - 15;
  roundRect(cx - bw / 2, by, bw, bh, 3, "rgba(20,14,8,0.6)");
  const hpFrac = clamp(rock.hp / rock.maxHp, 0, 1);
  roundRect(cx - bw / 2 + 1, by + 1, (bw - 2) * hpFrac, bh - 2, 2, "#e0b54a");
}

function drawFlywheel(L, angle) {
  const { flyX: cx, flyY: cy, flyR: r } = L;
  ctx.fillStyle = COLORS.steelDarker;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, "#6b5a47");
  g.addColorStop(1, "#2f251c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.steelDarker;
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#241b14";
  ctx.lineWidth = r * 0.16;
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2 + 0.4 + angle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.steelLight;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  bolt(cx, cy, r * 0.06);
  // rim bolts
  ctx.fillStyle = "#241b14";
  for (let k = 0; k < 12; k += 1) {
    const a = (k * Math.PI) / 6 + angle;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeltMotor(L, angle) {
  const px = L.motorX;
  const py = L.motorY;
  const pr = L.flyR * 0.36;
  // belt (two tangents, animated dashes)
  ctx.strokeStyle = COLORS.steelDarker;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(L.flyX, L.flyY - L.flyR * 0.9);
  ctx.lineTo(px, py - pr * 0.9);
  ctx.moveTo(L.flyX, L.flyY + L.flyR * 0.9);
  ctx.lineTo(px, py + pr * 0.9);
  ctx.stroke();
  // motor block
  roundRect(px - pr - 8, py - pr - 8, pr * 2 + 30, pr * 2 + 16, 6, COLORS.steel, COLORS.steelDark, 2);
  // pulley
  ctx.fillStyle = "#2f251c";
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.steelLight;
  ctx.lineWidth = 2;
  for (let k = 0; k < 6; k += 1) {
    const a = (k * Math.PI) / 3 - angle * 2.6;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * pr * 0.8, py + Math.sin(a) * pr * 0.8);
    ctx.stroke();
  }
}

function drawOutput(L) {
  // crushed gravel piling under the crusher
  const baseY = L.frameB - 6;
  const cx = L.rockX;
  ctx.fillStyle = COLORS.gravel;
  ctx.beginPath();
  ctx.moveTo(cx - 70, baseY);
  ctx.quadraticCurveTo(cx, baseY - 34, cx + 70, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(124,95,58,0.5)";
  for (let i = 0; i < 40; i += 1) {
    const x = cx + (rnd(i) - 0.5) * 130;
    const y = baseY - rnd(i + 9) * 28;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rnd(i + 3) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorkers(L, t) {
  const n = Math.min(5, workerCount());
  for (let i = 0; i < n; i += 1) {
    const x = L.gratX + (i % 2) * 26 - 8 + Math.floor(i / 2) * 4;
    const y = L.gratY + Math.floor(i / 2) * 16;
    const swing = Math.sin(t * 6 + i) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    // shadow
    ctx.fillStyle = "rgba(40,28,18,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 30, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillStyle = "#d8c39b";
    ctx.beginPath();
    ctx.moveTo(-7, -22);
    ctx.lineTo(7, -22);
    ctx.lineTo(10, 6);
    ctx.lineTo(-10, 6);
    ctx.closePath();
    ctx.fill();
    // head
    ctx.fillStyle = "#7c5a3e";
    ctx.beginPath();
    ctx.arc(0, -30, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // hammer arm
    ctx.strokeStyle = "#caa75f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(12 * Math.cos(swing), -14 - 10 * Math.sin(swing));
    ctx.stroke();
    ctx.restore();
  }
}

function drawDustHaze(L) {
  const spots = [[L.rockX, L.jawBotY, 90], [L.flyX, L.flyY, 80]];
  for (const [x, y, r] of spots) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, COLORS.dust);
    g.addColorStop(1, "rgba(214,190,142,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
    ctx.fillStyle = "#fff0c8";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function render() {
  const L = layout();
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  const swing = Math.sin(flyAngle) * CONFIG.swingAmp;
  drawBackground(L);
  drawFrame(L);
  drawFlywheel(L, flyAngle);
  drawBeltMotor(L, flyAngle);
  drawOutput(L);
  drawHopper(L);
  drawRockPile(L);
  drawJaws(L, swing);
  drawFocusRock(L);
  drawWorkers(L, time);
  drawDustHaze(L);
  drawParticles();
  drawFloaters();

  ctx.restore();
}

// ----------------------------------------------------------------------------
// UI (HUD + shop)
// ----------------------------------------------------------------------------
const elMoney = document.getElementById("money");
const elPerSec = document.getElementById("perSec");
const elStoneName = document.getElementById("stoneName");
const shopEl = document.getElementById("shop");
let activeCat = "設備";
const itemEls = {};

function buildShop() {
  if (!shopEl) return;
  shopEl.innerHTML = "";
  for (const u of UPGRADES) {
    const row = document.createElement("button");
    row.className = "item";
    row.dataset.id = u.id;
    row.dataset.cat = u.cat;
    row.innerHTML =
      '<span class="ic">' + u.icon + "</span>" +
      '<span class="info"><span class="nm">' + u.name +
      ' <em class="own">x0</em></span>' +
      '<span class="ds">' + u.desc + "</span></span>" +
      '<span class="cost">¥<b>' + fmt(upgradeCost(u)) + "</b></span>";
    row.addEventListener("click", () => buy(u));
    shopEl.appendChild(row);
    itemEls[u.id] = {
      row,
      own: row.querySelector(".own"),
      cost: row.querySelector(".cost b"),
    };
  }
  applyCatFilter();
}

function applyCatFilter() {
  for (const u of UPGRADES) {
    const it = itemEls[u.id];
    if (it) it.row.style.display = u.cat === activeCat ? "" : "none";
  }
}

function buy(u) {
  const cost = upgradeCost(u);
  if (state.money < cost) {
    const it = itemEls[u.id];
    if (it) {
      it.row.classList.remove("nope");
      void it.row.offsetWidth;
      it.row.classList.add("nope");
    }
    return;
  }
  state.money -= cost;
  state.counts[u.id] = (state.counts[u.id] || 0) + 1;
  recompute();
  saveState();
}

function updateUI() {
  if (elMoney) elMoney.textContent = fmt(state.money);
  if (elPerSec) elPerSec.textContent = fmt(autoPerSec);
  if (elStoneName) elStoneName.textContent = (rock && rock.name) || stoneName(state.rocksCrushed);
  for (const u of UPGRADES) {
    const it = itemEls[u.id];
    if (!it) continue;
    const cost = upgradeCost(u);
    it.cost.textContent = fmt(cost);
    it.own.textContent = "x" + (state.counts[u.id] || 0);
    it.row.classList.toggle("afford", state.money >= cost);
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeCat = tab.dataset.cat;
      applyCatFilter();
    });
  });
}

function setupTap() {
  const handler = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (W / rect.width);
    const y = (clientY - rect.top) * (H / rect.height);
    tapCrush(x, y);
  };
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handler(e.clientX, e.clientY);
  });
}

// ----------------------------------------------------------------------------
// Offline income
// ----------------------------------------------------------------------------
function applyOffline() {
  if (!rock || autoPerSec <= 0) return;
  const dt = Math.min((Date.now() - (state.lastTime || Date.now())) / 1000, CONFIG.offlineCapHours * 3600);
  if (dt < 5) return;
  const valuePerHp = rock.value / rock.maxHp;
  const earned = Math.floor(autoPerSec * dt * valuePerHp);
  if (earned <= 0) return;
  state.money += earned;
  state.totalMoney += earned;
  const el = document.getElementById("welcome");
  if (el) {
    el.textContent = "おかえり！ 留守中に ¥" + fmt(earned) + " 稼ぎました";
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 5200);
  }
}

// ----------------------------------------------------------------------------
// Loop
// ----------------------------------------------------------------------------
let saveTimer = 0;
let last = 0;

function frame(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  time += dt;
  flyAngle += CONFIG.flySpin * dt;

  if (rock && rock.spawn < 1) rock.spawn = Math.min(1, rock.spawn + dt * 4);
  if (autoPerSec > 0) applyDamage(autoPerSec * dt);
  updateFx(dt);

  render();
  updateUI();

  saveTimer += dt;
  if (saveTimer >= CONFIG.saveEverySec) {
    saveTimer = 0;
    saveState();
  }
  requestAnimationFrame(frame);
}

// ----------------------------------------------------------------------------
// Init
// ----------------------------------------------------------------------------
function init() {
  loadState();
  recompute();
  rock = makeRock();
  rock.spawn = 1;
  applyOffline();

  resize();
  if (typeof window !== "undefined") {
    window.addEventListener("resize", resize);
    window.addEventListener("beforeunload", saveState);
    if (document && document.addEventListener) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") saveState();
      });
    }
  }

  buildShop();
  setupTabs();
  setupTap();

  requestAnimationFrame(frame);
}

init();
