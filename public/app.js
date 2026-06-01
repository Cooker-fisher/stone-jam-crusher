// Stone Crusher 3D — Three.js
// A real 3D crusher: a conveyor feeds rocks into the hopper hole, the jaw
// plate moves and breaks the rock; tap to crush, upgrade 設備/人員, earn ¥.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------------------------------------------------------------- config
const TIERS = ["砂利", "小石", "玉石", "割栗石", "岩塊", "硬岩", "大岩", "花崗岩", "玄武岩", "巨岩", "岩盤", "隕石"];
const UP = {
  tap:  { base: 15,  mul: 1.15 },
  auto: { base: 25,  mul: 1.15 },
  boss: { base: 500, mul: 1.5 },
};
const SAVE_KEY = "stone-crusher-3d.v1";

// ---------------------------------------------------------------- state
let state = { money: 0, totalCrushed: 0, counts: { tap: 0, auto: 0, boss: 0 }, lastTime: Date.now() };
let tapPower = 1, autoPerSec = 0, mult = 1;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const d = JSON.parse(raw); state = Object.assign(state, d); state.counts = Object.assign({ tap: 0, auto: 0, boss: 0 }, d.counts || {}); }
  } catch (e) {}
}
function save() { try { state.lastTime = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function recompute() {
  mult = Math.pow(1.15, state.counts.boss);
  tapPower = (1 + state.counts.tap) * mult;
  autoPerSec = state.counts.auto * mult;
}
function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const u = ["", "K", "M", "B", "T", "Qa", "Qi"]; let i = 0, v = n;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
  return (v >= 100 ? v.toFixed(0) : v.toFixed(2)) + u[i];
}

// ---------------------------------------------------------------- three setup
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6a079);
scene.fog = new THREE.Fog(0xb6a079, 16, 34);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
camera.position.set(6.2, 5.2, 7.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.1, 0);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5.5;
controls.maxDistance = 16;
controls.minPolarAngle = 0.25;
controls.maxPolarAngle = 1.46;

// lights
scene.add(new THREE.HemisphereLight(0xd9c9a6, 0x5a4530, 0.95));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
sun.position.set(6, 10, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
sun.shadow.bias = -0.0004;
scene.add(sun);

// materials
const matSteel = new THREE.MeshStandardMaterial({ color: 0x6f5b48, roughness: 0.62, metalness: 0.45 });
const matSteelDark = new THREE.MeshStandardMaterial({ color: 0x40362a, roughness: 0.7, metalness: 0.5 });
const matBelt = new THREE.MeshStandardMaterial({ color: 0x29221a, roughness: 0.85, metalness: 0.2 });
const matGround = new THREE.MeshStandardMaterial({ color: 0xa98c5e, roughness: 1.0 });
const matGravel = new THREE.MeshStandardMaterial({ color: 0xb29a72, roughness: 1.0, flatShading: true });
const ROCK_COLORS = [0x8a5747, 0x7a4a3a, 0xa06b54, 0x6e4236, 0xb08566];

// ground
const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 48), matGround);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------------------------- rock factory
function rockGeo(detail) {
  const g = new THREE.IcosahedronGeometry(1, detail || 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const f = 0.82 + Math.random() * 0.36;
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
function makeRock(radius, detail) {
  const m = new THREE.Mesh(rockGeo(detail), new THREE.MeshStandardMaterial({ color: ROCK_COLORS[(Math.random() * ROCK_COLORS.length) | 0], roughness: 0.95, flatShading: true }));
  m.scale.setScalar(radius);
  m.castShadow = true; m.receiveShadow = true;
  m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
  return m;
}

// ---------------------------------------------------------------- machine
const machine = new THREE.Group();
scene.add(machine);

// heavy base + body
const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 3.2), matSteelDark);
base.position.y = 0.3; base.castShadow = true; base.receiveShadow = true; machine.add(base);
const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.0, 2.6), matSteel);
body.position.y = 1.5; body.castShadow = true; body.receiveShadow = true; machine.add(body);

// hopper funnel (square frustum)
const hopper = new THREE.Mesh(
  new THREE.CylinderGeometry(1.85, 0.62, 1.5, 4, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide })
);
hopper.position.y = 3.15; hopper.rotation.y = Math.PI / 4;
hopper.castShadow = true; machine.add(hopper);

// dark throat hole
const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.3, 1.4, 16, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 1, side: THREE.DoubleSide }));
throat.position.y = 2.55; machine.add(throat);
const throatFloor = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshStandardMaterial({ color: 0x0a0705 }));
throatFloor.rotation.x = -Math.PI / 2; throatFloor.position.y = 1.86; machine.add(throatFloor);

// jaws: fixed back plate + swinging front plate
const jawGeo = new THREE.BoxGeometry(1.5, 1.3, 0.18);
const fixedJaw = new THREE.Mesh(jawGeo, matSteel);
fixedJaw.position.set(0, 2.5, -0.5); fixedJaw.rotation.x = 0.22; fixedJaw.castShadow = true; machine.add(fixedJaw);
const swingPivot = new THREE.Group();
swingPivot.position.set(0, 3.1, 0.5); machine.add(swingPivot);
const swingJaw = new THREE.Mesh(jawGeo, new THREE.MeshStandardMaterial({ color: 0x7c6750, roughness: 0.55, metalness: 0.5 }));
swingJaw.position.set(0, -0.6, 0); swingJaw.castShadow = true; swingPivot.add(swingJaw);

// focus rock (the one being crushed)
let focus = null;
function newRock() {
  if (focus) machine.remove(focus);
  const d = state.totalCrushed;
  const tier = Math.floor(d / 10);
  const hp = Math.max(1, Math.round(4 * Math.pow(1.10, d)));
  const value = Math.max(1, Math.round(5 * Math.pow(1.092, d)));
  const radius = Math.min(0.42 + tier * 0.03, 0.86);
  focus = makeRock(radius, 1);
  focus.position.set(0, 2.5, 0);
  focus.userData = { hp, maxHp: hp, value, radius, name: tier < TIERS.length ? TIERS[tier] : TIERS[TIERS.length - 1] + "Lv" + (tier - TIERS.length + 2), spawn: 0 };
  machine.add(focus);
  setHUD();
}

// conveyor feeding from the left
const conv = new THREE.Group();
conv.position.set(-2.0, 3.7, -0.2);
conv.rotation.set(0, -0.28, 0.30);
scene.add(conv);
const convSlab = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.18, 1.1), matBelt);
convSlab.castShadow = true; convSlab.receiveShadow = true; conv.add(convSlab);
for (const sx of [-2.0, 2.0]) {
  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 12), matSteelDark);
  roller.rotation.x = Math.PI / 2; roller.position.set(sx, 0, 0); conv.add(roller);
}
const convRocks = [];
for (let i = 0; i < 6; i++) {
  const r = makeRock(0.2 + Math.random() * 0.12, 0);
  r.userData.t = i / 6;
  conv.add(r); convRocks.push(r);
}

// output gravel pile
for (let i = 0; i < 26; i++) {
  const g = makeRock(0.08 + Math.random() * 0.1, 0);
  const a = Math.random() * Math.PI * 2, rad = Math.random() * 1.5;
  g.position.set(Math.cos(a) * rad, 0.08 + Math.random() * 0.12, 1.7 + Math.sin(a) * 0.8);
  g.material = matGravel; scene.add(g);
}

// ---------------------------------------------------------------- particle pools
const dust = [];
for (let i = 0; i < 24; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd6be8e, transparent: true, opacity: 0, depthWrite: false }));
  m.visible = false; scene.add(m); dust.push({ m, life: 0, max: 1, vel: new THREE.Vector3() });
}
function puff(pos, n, spread, speed) {
  let c = 0;
  for (const d of dust) {
    if (d.life > 0) continue;
    d.m.position.copy(pos);
    d.m.scale.setScalar(0.12 + Math.random() * 0.12);
    d.vel.set((Math.random() - 0.5) * spread, Math.random() * speed, (Math.random() - 0.5) * spread);
    d.life = d.max = 0.45 + Math.random() * 0.4;
    d.m.material.opacity = 0.6; d.m.visible = true;
    if (++c >= n) break;
  }
}
const frags = [];
for (let i = 0; i < 14; i++) {
  const m = makeRock(0.16, 0); m.visible = false; scene.add(m);
  frags.push({ m, life: 0, vel: new THREE.Vector3() });
}
function shatter(pos, radius) {
  let c = 0;
  for (const f of frags) {
    if (f.life > 0) continue;
    f.m.position.copy(pos);
    f.m.scale.setScalar(radius * (0.4 + Math.random() * 0.4));
    const a = Math.random() * Math.PI * 2;
    f.vel.set(Math.cos(a) * (1 + Math.random() * 2.5), 2 + Math.random() * 3, Math.sin(a) * (1 + Math.random() * 2.5));
    f.life = 1.1; f.m.visible = true; f.m.material.opacity = 1; f.m.material.transparent = true;
    if (++c >= 7) break;
  }
}

// ---------------------------------------------------------------- gameplay
let shakeT = 0;
function damage(d) {
  if (!focus) return;
  const u = focus.userData;
  u.hp -= d;
  if (u.hp <= 0) crush();
}
function crush() {
  const u = focus.userData;
  const gain = Math.round(u.value * mult);
  state.money += gain; state.totalCrushed += 1;
  const wp = new THREE.Vector3(); focus.getWorldPosition(wp);
  shatter(wp, u.radius); puff(wp, 14, 3, 3.2); shakeT = 0.25;
  newRock();
}
function tapAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (focus && raycaster.intersectObject(focus, false).length) {
    damage(tapPower);
    const wp = new THREE.Vector3(); focus.getWorldPosition(wp); puff(wp, 4, 1.6, 2.2);
    shakeT = Math.min(0.2, shakeT + 0.12);
  }
}
const raycaster = new THREE.Raycaster();

// ---------------------------------------------------------------- input (tap vs drag)
let downPos = null, downTime = 0;
canvas.addEventListener("pointerdown", (e) => { downPos = { x: e.clientX, y: e.clientY }; downTime = performance.now(); });
canvas.addEventListener("pointerup", (e) => {
  if (!downPos) return;
  const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
  if (moved < 9 && performance.now() - downTime < 450) tapAt(e.clientX, e.clientY);
  downPos = null;
});

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
function cost(id) { return Math.floor(UP[id].base * Math.pow(UP[id].mul, state.counts[id])); }
function buy(id) {
  const c = cost(id);
  if (state.money < c) return;
  state.money -= c; state.counts[id] += 1; recompute(); setHUD(); save();
}
document.querySelectorAll(".item").forEach((el) => el.addEventListener("click", () => buy(el.dataset.id)));
function setHUD() {
  $("money").textContent = fmt(state.money);
  $("perSec").textContent = fmt(autoPerSec);
  $("stoneName").textContent = focus ? focus.userData.name : "";
  for (const id of ["tap", "auto", "boss"]) {
    $(id + "-own").textContent = "x" + state.counts[id];
    $(id + "-cost").textContent = fmt(cost(id));
    const el = document.querySelector('.item[data-id="' + id + '"]');
    if (el) el.classList.toggle("afford", state.money >= cost(id));
  }
}

// offline earnings
function offline() {
  if (autoPerSec <= 0 || !focus) return;
  const dt = Math.min((Date.now() - (state.lastTime || Date.now())) / 1000, 8 * 3600);
  if (dt < 5) return;
  const u = focus.userData;
  const gain = Math.floor(autoPerSec * dt * (u.value / u.maxHp));
  if (gain > 0) { state.money += gain; }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let saveT = 0;
function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  // running machine: swing jaw presses in/out
  const stroke = Math.max(0, Math.sin(t * 7));
  swingPivot.rotation.x = -0.28 * stroke;

  // conveyor rocks ride down then loop
  for (const r of convRocks) {
    r.userData.t += dt * 0.16;
    if (r.userData.t > 1) { r.userData.t -= 1; }
    const lx = 1.9 - r.userData.t * 3.8;
    r.position.set(lx, 0.22, (Math.random() - 0.5) * 0.05);
    r.rotation.x += dt * 1.5; r.rotation.z += dt * 0.8;
  }

  if (focus) {
    if (focus.userData.spawn < 1) { focus.userData.spawn = Math.min(1, focus.userData.spawn + dt * 4); focus.scale.setScalar(focus.userData.radius * (0.5 + 0.5 * focus.userData.spawn)); }
    if (autoPerSec > 0) damage(autoPerSec * dt);
    const dmg = 1 - focus.userData.hp / focus.userData.maxHp;
    focus.scale.setScalar(focus.userData.radius * (1 - dmg * 0.18) * (focus.userData.spawn));
    focus.rotation.y += dt * 0.4;
    focus.position.x = (Math.random() - 0.5) * shakeT * 0.4;
  }

  for (const d of dust) {
    if (d.life <= 0) continue;
    d.life -= dt; d.m.position.addScaledVector(d.vel, dt); d.vel.y -= dt * 1.2;
    d.m.scale.addScalar(dt * 1.6); d.m.material.opacity = Math.max(0, (d.life / d.max) * 0.6);
    if (d.life <= 0) d.m.visible = false;
  }
  for (const f of frags) {
    if (f.life <= 0) continue;
    f.life -= dt; f.m.position.addScaledVector(f.vel, dt); f.vel.y -= dt * 9.8;
    f.m.rotation.x += dt * 4; f.m.rotation.y += dt * 3;
    if (f.m.position.y < 0.1) { f.vel.y = Math.abs(f.vel.y) * 0.35; f.vel.multiplyScalar(0.6); f.m.position.y = 0.1; }
    if (f.life < 0.4) f.m.material.opacity = Math.max(0, f.life / 0.4);
    if (f.life <= 0) f.m.visible = false;
  }

  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  controls.update();
  renderer.render(scene, camera);

  setHUD();
  saveT += dt; if (saveT > 4) { saveT = 0; save(); }
  requestAnimationFrame(animate);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

// ---------------------------------------------------------------- init
load();
recompute();
newRock();
offline();
resize();
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
const loadingEl = document.getElementById("loading");
if (loadingEl) loadingEl.classList.add("hidden");
setHUD();
animate();
