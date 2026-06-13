/* STONE JAM CRUSHER — 2D industrial hopper-jam simulator (Canvas + Matter.js)
 * Irregular heavy rocks feed into a fan-shaped rusty hopper, arch/jam at the
 * narrow throat; smash the keystone (or winch it with a chain) to collapse the
 * jam — dust, sparks, screen shake — and crushed gravel rides the belt out. */
"use strict";
const { Engine, World, Bodies, Body, Composite, Constraint, Query, Vertices, Events } = Matter;

const W = 900, H = 1000;
const TOP_L = { x: 120, y: 118 }, TOP_R = { x: 780, y: 118 };
const THR_L = { x: 422, y: 664 }, THR_R = { x: 478, y: 664 };   // ~56px throat: even one big rock can't pass -> forced arching/jam
const CRUSH_Y = 706, BELT_Y = 874, BELT_SPEED = 7;
let jawPhase = 0, jawBiteTimer = 0;

const C = {
  bgTop: "#1c1810", bgBot: "#0b0907",
  rust1: "#6e4527", rust2: "#3f352a", steelEdge: "#241a10",
  rock: [184, 176, 160], rockDark: "rgba(28,24,16,0.42)", rockLine: "#2a2519", crack: "rgba(24,20,12,0.6)", rockDust: "rgba(228,219,192,0.5)",
  belt: "#19150f", tread: "#2f2818",
  dust: "228,219,192", spark: "#ffcf6a",
};

// ---------------------------------------------------------------- engine
const engine = Engine.create();
engine.gravity.y = 1.0;
const world = engine.world;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---------------------------------------------------------------- static build
function wallBar(x1, y1, x2, y2, thick) {
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) + thick;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const b = Bodies.rectangle(cx, cy, len, thick, { isStatic: true, friction: 0.95, restitution: 0.0 });
  Body.setAngle(b, ang); b.gameType = "wall"; return b;
}
const statics = [
  wallBar(TOP_L.x, TOP_L.y, THR_L.x, THR_L.y, 46),   // left hopper wall (fan)
  wallBar(TOP_R.x, TOP_R.y, THR_R.x, THR_R.y, 46),   // right hopper wall (fan)
  wallBar(THR_L.x, THR_L.y + 6, 405, BELT_Y, 24),    // left discharge wall (near-vertical slot)
  wallBar(THR_R.x, THR_R.y + 6, 495, BELT_Y, 24),    // right discharge wall (near-vertical slot)
  Bodies.rectangle(W / 2, BELT_Y + 34, W, 40, { isStatic: true, friction: 0.4 }),  // belt surface
  Bodies.rectangle(-20, H / 2, 40, H, { isStatic: true }),    // left bound
  Bodies.rectangle(W + 20, H / 2, 40, H, { isStatic: true }), // right bound
];
statics[4].gameType = "belt";
World.add(world, statics);

// ---------------------------------------------------------------- rocks
const rocks = [], frags = [];
function rockVerts(size) {
  const n = 9 + (Math.random() * 4 | 0), pts = [];
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = size * (0.6 + Math.random() * 0.5); pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
  return Vertices.hull(pts);
}
function makeRock(x, y, size, boss) {
  let b;
  try { b = Bodies.fromVertices(x, y, [rockVerts(size)], { friction: 1.0, frictionStatic: 2.2, restitution: 0.0, density: boss ? 0.12 : 0.022 }, true); }
  catch (e) { b = null; }
  if (!b) b = Bodies.polygon(x, y, 8, size, { friction: 1.0, frictionStatic: 2.2, restitution: 0.0, density: boss ? 0.12 : 0.022 });
  b.slop = 0.02;
  b.gameType = "rock"; b.boss = !!boss; b.hp = boss ? 6 : 2 + (Math.random() * 2 | 0);
  b.tone = boss ? 0.82 : 0.9 + Math.random() * 0.18; b.warm = boss ? 0.5 : Math.random() * 0.35;
  b.seed = Math.random() * 99; b.size = size;
  rocks.push(b); World.add(world, b); return b;
}
function makeFrag(x, y, size) {
  if (frags.length > 70) removeBody(frags[0], frags);
  const b = Bodies.polygon(x, y, 5 + (Math.random() * 3 | 0), size, { friction: 0.6, restitution: 0.05, density: 0.0015, angle: Math.random() * 6 });
  b.gameType = "frag"; b.tone = 0.85 + Math.random() * 0.2; b.warm = Math.random() * 0.3; b.seed = Math.random() * 99;
  Body.setVelocity(b, { x: (Math.random() - 0.5) * 4, y: -Math.random() * 3 });
  frags.push(b); World.add(world, b); return b;
}
function removeBody(b, arr) { const i = arr.indexOf(b); if (i >= 0) arr.splice(i, 1); World.remove(world, b); }

// ---------------------------------------------------------------- state + vfx
let money = 0, cleared = 0, jammed = false, jamTimer = 0, clearMsg = 0, keystone = null;
let shake = 0, micro = 1.1, mode = "hammer";
const dust = [], sparks = [];
try { const s = JSON.parse(localStorage.getItem("sjc") || "{}"); money = s.money || 0; cleared = s.cleared || 0; } catch (e) {}
function save() { try { localStorage.setItem("sjc", JSON.stringify({ money, cleared })); } catch (e) {} }

function puff(x, y, n, big) {
  for (let i = 0; i < n; i++) dust.push({ x, y, vx: (Math.random() - 0.5) * (big ? 4 : 2.4), vy: -Math.random() * (big ? 3.2 : 1.8) - 0.3, r: (big ? 22 : 12) + Math.random() * 18, life: 1, decay: 0.012 + Math.random() * 0.02, o: 0.5 });
  if (dust.length > 180) dust.splice(0, dust.length - 180);
}
function spark(x, y, n) { for (let i = 0; i < n; i++) sparks.push({ x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7 - 1, life: 1, decay: 0.05 + Math.random() * 0.05 }); if (sparks.length > 60) sparks.splice(0, sparks.length - 60); }

// audio (synthesized, no assets): low rumble loop + impact thud + crush crackle
let actx = null;
function ensureAudio() {
  if (actx) return;
  try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); } catch (e) { return; }
  const o = actx.createOscillator(); o.type = "sawtooth"; o.frequency.value = 42;
  const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 120;
  const g = actx.createGain(); g.gain.value = 0.05;
  o.connect(lp); lp.connect(g); g.connect(actx.destination); o.start();   // the ever-present "ゴゴゴ" rumble
}
function noiseBurst(dur, freq, gain) {
  if (!actx) return; const n = Math.max(1, (actx.sampleRate * dur) | 0); const buf = actx.createBuffer(1, n, actx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = actx.createBufferSource(); src.buffer = buf; const f = actx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.7; const g = actx.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(actx.destination); src.start();
}
function playThud(v) {
  if (!actx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g); g.connect(actx.destination); o.start(); o.stop(t + 0.22); noiseBurst(0.07, 700, 0.18 * v);
}
function playCrush(big) {
  if (!actx) return; noiseBurst(big ? 0.4 : 0.25, 1400, big ? 0.4 : 0.26);
  for (let i = 0; i < (big ? 5 : 3); i++) setTimeout(() => noiseBurst(0.06, 1800 + Math.random() * 1600, 0.14), i * 45);
}

// ---------------------------------------------------------------- feed / jam / jaw-crush
let feedTimer = 0;
function throatRocks() { const a = []; for (const r of rocks) { const p = r.position; if (p.x > THR_L.x - 130 && p.x < THR_R.x + 130 && p.y > 340 && p.y < CRUSH_Y) a.push(r); } return a; }
function updateJam(dt) {
  if (clearMsg > 0) { clearMsg -= dt; if (clearMsg <= 0) setStatus(null); }
  const tr = throatRocks(); let spd = 0, low = null, ly = -1;
  for (const r of tr) { spd += Math.hypot(r.velocity.x, r.velocity.y); if (r.position.y > ly) { ly = r.position.y; low = r; } }
  spd = tr.length ? spd / tr.length : 99;
  keystone = low;                                   // the rock in the jaw bite = what to smash
  if (!jammed) { if (tr.length >= 5 && spd < 0.7) { jamTimer += dt; if (jamTimer > 0.45) jammed = true; } else jamTimer = 0; }
  else { setStatus("jam"); if (tr.length < 3) clearBonus(low); }
}
function clearBonus(at) {
  const reward = 20 + cleared * 5; money += reward; cleared += 1;
  const cx = at ? at.position.x : W / 2, cy = THR_L.y - 20;
  for (let k = 0; k < 4; k++) puff(cx + (Math.random() - 0.5) * 170, cy + Math.random() * 70, 9, true);
  spark(cx, cy, 12); shake = Math.min(36, shake + 18); playCrush(true);
  jammed = false; jamTimer = 0; clearMsg = 1.7; setStatus("clear", "★ CLEAR!  +¥" + reward); save();
}
// a rock SHATTERS into many fragments (jaw bite breaks it, or a hammer kills it)
function shatter(r) {
  const p = { x: r.position.x, y: r.position.y }, big = r.boss, m = r.mass;
  money += big ? 30 : 8;
  const n = big ? 14 + (Math.random() * 6 | 0) : 8 + (Math.random() * 5 | 0);
  for (let k = 0; k < n; k++) makeFrag(p.x + (Math.random() - 0.5) * 46, p.y + (Math.random() - 0.5) * 26, 6 + Math.random() * 7);
  puff(p.x, p.y, big ? 14 : 9, true); spark(p.x, p.y, big ? 12 : 6);
  shake = Math.min(36, shake + Math.min(22, 6 + m * 0.4)); playCrush(big);
  if (r === keystone) keystone = null;
  removeBody(r, rocks); save();
}

// ---------------------------------------------------------------- interaction
function hammerAt(x, y) {
  const hit = Query.point(rocks, { x, y })[0];
  if (!hit) { puff(x, y, 3); spark(x, y, 2); return; }
  const dir = (x < hit.position.x ? -1 : 1);
  Body.applyForce(hit, { x, y }, { x: dir * hit.mass * 0.05, y: hit.mass * 0.12 });
  hit.hp -= 2; puff(hit.position.x, hit.position.y, 9, true); spark(x, y, 7); shake = Math.max(shake, 10); playThud(1);
  for (const r of rocks) { if (r === hit) continue; const dx = r.position.x - x, dy = r.position.y - y, d = Math.hypot(dx, dy) || 1; if (d < 130) { Body.applyForce(r, r.position, { x: dx / d * r.mass * 0.02, y: -r.mass * 0.008 }); puff(r.position.x, r.position.y, 1); } }   // crack propagation through the pile
  if (hit.hp <= 0) shatter(hit);
}
let chain = null; // { body, anchor:{x,y}, constraint, t }
function chainStart(x, y) {
  const hit = Query.point(rocks, { x, y })[0]; if (!hit) return;
  const anchor = { x: hit.position.x, y: 110 };
  const cons = Constraint.create({ pointA: anchor, bodyB: hit, pointB: { x: x - hit.position.x, y: y - hit.position.y }, stiffness: 0.012, damping: 0.1, length: Math.hypot(hit.position.x - anchor.x, hit.position.y - anchor.y) });
  World.add(world, cons); chain = { body: hit, anchor, constraint: cons, t: 0 };
}
function chainStep(dt) {
  if (!chain) return; chain.t += dt;
  chain.constraint.length = Math.max(60, chain.constraint.length - dt * 220);   // winch up
  chain.constraint.stiffness = Math.min(0.06, chain.constraint.stiffness + dt * 0.05);
  if (chain.t % 0.18 < dt) spark(chain.body.position.x, chain.body.position.y, 2);
  if (chain.t > 3.2 || rocks.indexOf(chain.body) < 0) chainEnd();
}
function chainEnd() { if (!chain) return; World.remove(world, chain.constraint); chain = null; }

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
const statusEl = $("status");
function setStatus(cls, text) {
  if (!statusEl) return;
  if (!cls) { statusEl.className = "hidden"; return; }
  statusEl.className = cls; statusEl.textContent = text || "⚠ HOPPER JAMMED — 赤い岩を砕け";
}
function setHUD() { if ($("money")) $("money").textContent = fmt(money); if ($("cleared")) $("cleared").textContent = cleared; }
function fmt(n) { n = Math.floor(n); if (n < 1000) return String(n); const u = ["", "K", "M", "B"]; let i = 0, v = n; while (v >= 1000 && i < 3) { v /= 1000; i++; } return v.toFixed(2) + u[i]; }
document.querySelectorAll(".tool").forEach((el) => el.addEventListener("click", () => {
  mode = el.dataset.mode; document.querySelectorAll(".tool").forEach((t) => t.classList.toggle("active", t === el));
  if ($("hint")) $("hint").textContent = mode === "hammer" ? "詰まった岩をタップで砕け" : "大岩をドラッグでチェーン牽引";
}));

// ---------------------------------------------------------------- input
function toWorld(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; }
canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); ensureAudio(); const p = toWorld(e); if (mode === "hammer") hammerAt(p.x, p.y); else chainStart(p.x, p.y); });
canvas.addEventListener("pointermove", (e) => { if (chain) { const p = toWorld(e); chain.anchor.x = p.x; chain.constraint.pointA.x = p.x; } });
canvas.addEventListener("pointerup", () => chainEnd());
canvas.addEventListener("pointercancel", () => chainEnd());

// ---------------------------------------------------------------- rendering
function drawPoly(verts) { ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y); for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y); ctx.closePath(); }
function rnd(s) { const x = Math.sin(s * 91.7) * 43758.5; return x - Math.floor(x); }

function drawWall(b) {
  drawPoly(b.vertices);
  const g = ctx.createLinearGradient(b.bounds.min.x, b.bounds.min.y, b.bounds.min.x, b.bounds.max.y);
  g.addColorStop(0, C.rust1); g.addColorStop(0.5, C.rust2); g.addColorStop(1, "#2c2519");
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = C.steelEdge; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = "rgba(20,14,8,0.4)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 26; i++) { const bx = b.bounds.min.x + rnd(b.id + i) * (b.bounds.max.x - b.bounds.min.x); ctx.beginPath(); ctx.moveTo(bx, b.bounds.min.y); ctx.lineTo(bx + (rnd(i) - 0.5) * 18, b.bounds.max.y); ctx.stroke(); }
  for (let i = 0; i < 10; i++) { const bx = b.bounds.min.x + rnd(b.id * 2 + i) * (b.bounds.max.x - b.bounds.min.x), by = b.bounds.min.y + rnd(i * 3) * (b.bounds.max.y - b.bounds.min.y); const rg = ctx.createRadialGradient(bx, by, 0, bx, by, 22); rg.addColorStop(0, "rgba(120,58,26,0.5)"); rg.addColorStop(1, "rgba(120,58,26,0)"); ctx.fillStyle = rg; ctx.fillRect(bx - 22, by - 22, 44, 44); }
  ctx.restore();
}
function drawRock(b) {
  const v = b.vertices, key = (b === keystone);
  drawPoly(v);
  const t = b.tone, base = `rgb(${(C.rock[0] * t) | 0},${(C.rock[1] * t * (1 - b.warm * 0.18)) | 0},${(C.rock[2] * t * (1 - b.warm * 0.32)) | 0})`;
  ctx.fillStyle = base; ctx.fill();
  ctx.save(); ctx.clip();
  // lower-half facet shadow
  ctx.fillStyle = C.rockDark; ctx.fillRect(b.bounds.min.x, b.position.y, b.bounds.max.x - b.bounds.min.x, b.bounds.max.y - b.position.y);
  // top dust
  ctx.fillStyle = C.rockDust; ctx.fillRect(b.bounds.min.x, b.bounds.min.y, b.bounds.max.x - b.bounds.min.x, (b.position.y - b.bounds.min.y) * 0.45);
  // cracks
  ctx.strokeStyle = C.crack; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(b.position.x, b.position.y); let px = b.position.x, py = b.position.y; const a = rnd(b.seed + i) * 6.28; for (let s = 1; s <= 3; s++) { px += Math.cos(a + (rnd(b.seed + i * 3 + s) - 0.5)) * b.size * 0.4; py += Math.sin(a + (rnd(b.seed + i * 3 + s) - 0.5)) * b.size * 0.4; ctx.lineTo(px, py); } ctx.stroke(); }
  ctx.restore();
  ctx.lineWidth = key ? 4 : 2; ctx.strokeStyle = key ? "#ff5b3a" : C.rockLine; drawPoly(v); ctx.stroke();
  if (key) { ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * Math.sin(performance.now() / 180); ctx.fillStyle = "#ff5b3a"; ctx.fill(); ctx.restore(); }
}
function drawFrag(b) { drawPoly(b.vertices); ctx.fillStyle = `rgb(${(C.rock[0] * b.tone) | 0},${(C.rock[1] * b.tone) | 0},${(C.rock[2] * b.tone) | 0})`; ctx.fill(); ctx.strokeStyle = C.rockLine; ctx.lineWidth = 1; ctx.stroke(); }

let beltScroll = 0;
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const amp = micro + shake;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp);
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, C.bgTop); bg.addColorStop(1, C.bgBot); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 60; i++) ctx.fillRect((i * 137) % W, (i * 89) % H, 3, 3);
  // belt
  ctx.fillStyle = C.belt; ctx.fillRect(0, BELT_Y, W, 60);
  ctx.strokeStyle = C.tread; ctx.lineWidth = 6; beltScroll = (beltScroll + BELT_SPEED) % 48;
  for (let x = -48 + beltScroll; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, BELT_Y + 6); ctx.lineTo(x + 24, BELT_Y + 54); ctx.stroke(); }
  // chain (drawn behind rocks)
  if (chain) { ctx.strokeStyle = "#6a5236"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(chain.anchor.x, chain.anchor.y); ctx.lineTo(chain.body.position.x, chain.body.position.y); ctx.stroke(); ctx.strokeStyle = "#3a2c1c"; ctx.lineWidth = 3; ctx.stroke(); }
  // statics
  for (const b of statics) if (b.gameType === "wall") drawWall(b);
  // jaw teeth at the throat — the right plate reciprocates (the swing jaw biting)
  const jawX = Math.sin(jawPhase) * 7;
  ctx.fillStyle = "#23190f";
  for (let i = 0; i < 7; i++) {
    const yy = THR_L.y - 80 + i * 24;
    ctx.beginPath(); ctx.moveTo(THR_L.x - 4, yy); ctx.lineTo(THR_L.x + 24, yy + 8); ctx.lineTo(THR_L.x - 4, yy + 16); ctx.fill();
    const rx = THR_R.x - jawX; ctx.beginPath(); ctx.moveTo(rx + 4, yy); ctx.lineTo(rx - 24, yy + 8); ctx.lineTo(rx + 4, yy + 16); ctx.fill();
  }
  // bodies
  for (const b of frags) drawFrag(b);
  for (const b of rocks) drawRock(b);
  // sparks
  for (const s of sparks) { ctx.globalAlpha = Math.max(0, s.life); ctx.strokeStyle = C.spark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 1.5, s.y - s.vy * 1.5); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // dust (over everything)
  for (const d of dust) { const a = Math.max(0, d.life) * d.o; if (a <= 0) continue; const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r); g.addColorStop(0, `rgba(${C.dust},${a})`); g.addColorStop(1, `rgba(${C.dust},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 7); ctx.fill(); }
  ctx.restore();
}

// heavy impacts kick up dust + shake (rocks slamming the walls / each other)
Events.on(engine, "collisionStart", (ev) => {
  for (const pr of ev.pairs) {
    const a = pr.bodyA, b = pr.bodyB; if (a.gameType !== "rock" && b.gameType !== "rock") continue;
    const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y); if (rv < 5) continue;
    const sp = pr.collision && pr.collision.supports && pr.collision.supports[0];
    const px = sp ? sp.x : (a.position.x + b.position.x) / 2, py = sp ? sp.y : (a.position.y + b.position.y) / 2;
    puff(px, py, Math.min(4, 1 + (rv / 4 | 0))); shake = Math.min(30, shake + Math.min(8, rv * 0.5));
    if (a.gameType === "wall" || b.gameType === "wall") spark(px, py, 2);
  }
});

// ---------------------------------------------------------------- loop
let last = 0, saveT = 0;
function frame(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
  Engine.update(engine, 1000 / 60);
  // feed
  feedTimer += dt;
  if (feedTimer > 0.7 && rocks.length < 24 && !(jammed && throatRocks().length > 9)) { feedTimer = 0; makeRock(330 + Math.random() * 240, 60, (Math.random() < 0.14 ? 70 + Math.random() * 28 : 34 + Math.random() * 22), Math.random() < 0.14); }
  updateJam(dt); chainStep(dt);
  // jaw bite: the reciprocating jaw grinds the rock in the throat (keystone) and snaps it
  jawPhase += dt * 7; jawBiteTimer += dt;
  if (jawBiteTimer > 0.7) { jawBiteTimer = 0; const k = keystone; if (k && k.position.y > 560 && rocks.indexOf(k) >= 0) { k.hp -= 1; puff(k.position.x, THR_L.y, 5); spark(THR_L.x + 26, THR_L.y, 2); shake = Math.max(shake, 4.5); playThud(0.45); if (k.hp <= 0) shatter(k); } }
  // any rock forced past the throat shatters in the jaw
  for (let i = rocks.length - 1; i >= 0; i--) { const r = rocks[i]; if (r.position.y > CRUSH_Y) shatter(r); else if (r.position.y > H + 80) removeBody(r, rocks); }
  // belt carries fragments out; cull
  for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; if (f.position.y > BELT_Y - 20 && f.position.y < BELT_Y + 30) Body.setVelocity(f, { x: BELT_SPEED, y: f.velocity.y }); if (f.position.x > W + 60 || f.position.y > H + 60) removeBody(f, frags); }
  // vfx
  for (let i = dust.length - 1; i >= 0; i--) { const d = dust[i]; d.x += d.vx; d.y += d.vy; d.vy += 0.04; d.vx *= 0.98; d.r += 0.6; d.life -= d.decay; if (d.life <= 0) dust.splice(i, 1); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.5; s.life -= s.decay; if (s.life <= 0) sparks.splice(i, 1); }
  shake *= 0.86; if (shake < 0.2) shake = 0;
  render(); setHUD();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- init
for (let i = 0; i < 5; i++) makeRock(380 + Math.random() * 140, 300 + i * 70, 40 + Math.random() * 26, i === 2);
const loadingEl = document.getElementById("loading"); if (loadingEl) loadingEl.classList.add("hidden");
setHUD(); requestAnimationFrame(frame);
