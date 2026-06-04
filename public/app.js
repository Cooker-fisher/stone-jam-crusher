// Stone Crusher 3D — Three.js + cannon-es physics
// A moving conveyor carries weighty stones into the crusher's holding bin;
// a hammer (you on tap, or hired workers automatically) strikes them with real
// physics impulses until they break into fragments. Earn ¥, buy upgrades.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

// ---------------------------------------------------------------- config
const UP = {
  feed:   { base: 15,  mul: 1.18 },
  worker: { base: 60,  mul: 1.25 },
  value:  { base: 25,  mul: 1.16 },
  boss:   { base: 500, mul: 1.6 },
};
const SAVE_KEY = "stone-crusher-3d.v2";
const BELT_SPEED = 1.7;
const MAX_ROCKS = 22;
const ROCK_COLORS = [0x6f6a62, 0x5b554c, 0x4a443d, 0x7c766c, 0x534d45, 0x615a51];

// ---------------------------------------------------------------- state
let state = { money: 0, crushed: 0, counts: { feed: 0, worker: 0, value: 0, boss: 0 }, lastTime: Date.now() };
let mult = 1, feedRate = 0.7, autoHammerRate = 0;
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { const d = JSON.parse(r); state = Object.assign(state, d); state.counts = Object.assign({ feed: 0, worker: 0, value: 0, boss: 0 }, d.counts || {}); } } catch (e) {} }
function save() { try { state.lastTime = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function recompute() { mult = Math.pow(1.15, state.counts.boss); feedRate = 0.7 + 0.3 * state.counts.feed; autoHammerRate = state.counts.worker * 0.9; }
function gainPerCrush() { return Math.max(1, Math.round((1 + state.counts.value) * mult)); }
function fmt(n) { n = Math.floor(n); if (n < 1000) return String(n); const u = ["", "K", "M", "B", "T", "Qa"]; let i = 0, v = n; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; } return (v >= 100 ? v.toFixed(0) : v.toFixed(2)) + u[i]; }

// ---------------------------------------------------------------- three
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb6a079);
scene.fog = new THREE.Fog(0xb6a079, 18, 42);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
camera.position.set(7.5, 5.6, 8.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.4, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 6; controls.maxDistance = 18; controls.minPolarAngle = 0.2; controls.maxPolarAngle = 1.45;

scene.add(new THREE.HemisphereLight(0xe5d8bd, 0x6a5638, 1.25));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
sun.position.set(6, 11, 5); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 34;
sun.shadow.camera.left = -11; sun.shadow.camera.right = 11; sun.shadow.camera.top = 11; sun.shadow.camera.bottom = -11;
sun.shadow.bias = -0.0004; scene.add(sun);

const matSteel = new THREE.MeshStandardMaterial({ color: 0x6f5b48, roughness: 0.6, metalness: 0.45 });
const matSteelDark = new THREE.MeshStandardMaterial({ color: 0x40362a, roughness: 0.7, metalness: 0.5 });
const matGround = new THREE.MeshStandardMaterial({ color: 0xa98c5e, roughness: 1 });
const matGravel = new THREE.MeshStandardMaterial({ color: 0xb29a72, roughness: 1, flatShading: true });

// animated belt texture (so the conveyor visibly runs)
function beltTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#2b231b"; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "#14100b"; for (let i = 0; i < 64; i += 16) x.fillRect(0, i, 64, 7);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); return t;
}
const beltTex = beltTexture();
const matBeltTop = new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9, metalness: 0.1 });

const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 48), matGround);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// shared rock geometry/material (solid boulders — coincident verts share displacement so faces don't tear)
function rockGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position, v = new THREE.Vector3(), cache = {};
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const key = v.x.toFixed(2) + "," + v.y.toFixed(2) + "," + v.z.toFixed(2);
    let f = cache[key]; if (f === undefined) { f = 0.84 + Math.random() * 0.3; cache[key] = f; }
    p.setXYZ(i, v.x * f, v.y * f, v.z * f);
  }
  g.computeVertexNormals(); return g;
}
const ROCK_GEOS = [rockGeo(), rockGeo(), rockGeo(), rockGeo(), rockGeo()];
const ROCK_MATS = ROCK_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, metalness: 0, flatShading: true }));
function rockMesh(radius, sx, sy, sz) {
  const m = new THREE.Mesh(ROCK_GEOS[(Math.random() * ROCK_GEOS.length) | 0], ROCK_MATS[(Math.random() * ROCK_MATS.length) | 0]);
  m.scale.set(radius * sx, radius * sy, radius * sz); m.castShadow = m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- machine visuals
const machine = new THREE.Group(); scene.add(machine);
const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 3.2), matSteelDark); baseMesh.position.y = 0.3; baseMesh.castShadow = baseMesh.receiveShadow = true; machine.add(baseMesh);
const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.0, 2.6), matSteel); body.position.y = 1.4; body.castShadow = body.receiveShadow = true; machine.add(body);
const hopper = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 0.7, 1.6, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide }));
hopper.position.y = 3.4; hopper.rotation.y = Math.PI / 4; hopper.castShadow = true; machine.add(hopper);
const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 1.0, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x140d08, roughness: 1, side: THREE.DoubleSide }));
throat.position.y = 2.5; machine.add(throat);

// conveyor (visual)
const BELT_ANGLE = 0.34, BELT_C = new THREE.Vector3(2.5, 4.15, 0), BELT_HALF = 1.85;
const cosB = Math.cos(BELT_ANGLE), sinB = Math.sin(BELT_ANGLE);
const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT_HALF * 2, 0.18, 1.5), matBeltTop);
belt.position.copy(BELT_C); belt.rotation.z = BELT_ANGLE; belt.castShadow = belt.receiveShadow = true; scene.add(belt);
for (const side of [-0.78, 0.78]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(BELT_HALF * 2, 0.16, 0.1), matSteelDark); rail.position.set(BELT_C.x, BELT_C.y + 0.13, side); rail.rotation.z = BELT_ANGLE; scene.add(rail); }
for (const e of [-1, 1]) { const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 16), matSteelDark); roller.rotation.x = Math.PI / 2; roller.position.set(BELT_C.x + e * BELT_HALF * cosB, BELT_C.y + e * BELT_HALF * sinB, 0); scene.add(roller); }

// hammer (swings down onto the bin on each strike)
const hammer = new THREE.Group(); hammer.position.set(0, 3.95, 0.2); scene.add(hammer);
const hHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 })); hHandle.position.y = -0.75; hammer.add(hHandle);
const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.36), matSteel); hHead.position.set(0, -1.5, 0); hHead.castShadow = true; hammer.add(hHead);
let hammerT = 1;
hammer.rotation.z = -1.0;

// workers (hired) — simple figures that swing when auto-hammering
const workerMatBody = new THREE.MeshStandardMaterial({ color: 0x9a6b3c, roughness: 1 });
const workerMatHat = new THREE.MeshStandardMaterial({ color: 0xe0b44e, roughness: 1 });
const workers = [];
function makeWorker(i) {
  const g = new THREE.Group();
  const ang = -0.7 + i * 0.7;
  g.position.set(Math.cos(ang) * 2.0, 0, Math.sin(ang) * 2.0 + 0.4);
  g.lookAt(0, 0, 0);
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), workerMatBody); bodyM.position.y = 0.55; bodyM.castShadow = true; g.add(bodyM);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), workerMatHat); head.position.y = 1.02; head.castShadow = true; g.add(head);
  const arm = new THREE.Group(); arm.position.set(0.12, 0.85, 0.16); g.add(arm);
  const mallet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6), new THREE.MeshStandardMaterial({ color: 0x5a3f25, roughness: 0.9 })); mallet.position.set(0, -0.3, 0); arm.add(mallet);
  const malletHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.14), matSteel); malletHead.position.set(0, -0.6, 0); arm.add(malletHead);
  arm.rotation.x = -1.2; g.userData.arm = arm; g.userData.swing = 1;
  scene.add(g); return g;
}
function ensureWorkers() {
  const want = Math.min(state.counts.worker, 5);
  while (workers.length < want) workers.push(makeWorker(workers.length));
  while (workers.length > want) scene.remove(workers.pop());
}

// ---------------------------------------------------------------- physics
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -22, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
const physGround = new CANNON.Material("g"), physRock = new CANNON.Material("r"), physBelt = new CANNON.Material("b");
world.addContactMaterial(new CANNON.ContactMaterial(physRock, physGround, { friction: 0.7, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(physRock, physRock, { friction: 0.6, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(physRock, physBelt, { friction: 0.5, restitution: 0 }));

const groundBody = new CANNON.Body({ mass: 0, material: physGround }); groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); world.addBody(groundBody);

const beltBody = new CANNON.Body({ mass: 0, material: physBelt }); beltBody.addShape(new CANNON.Box(new CANNON.Vec3(BELT_HALF, 0.09, 0.75)));
beltBody.position.set(BELT_C.x, BELT_C.y, 0); beltBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), BELT_ANGLE); world.addBody(beltBody);
for (const side of [-0.82, 0.82]) { const rb = new CANNON.Body({ mass: 0, material: physBelt }); rb.addShape(new CANNON.Box(new CANNON.Vec3(BELT_HALF, 0.2, 0.06))); rb.position.set(BELT_C.x, BELT_C.y + 0.16, side); rb.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), BELT_ANGLE); world.addBody(rb); }

// holding bin at the crusher mouth (rocks rest here to be hammered)
function staticBox(px, py, pz, hx, hy, hz) { const b = new CANNON.Body({ mass: 0, material: physBelt }); b.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz))); b.position.set(px, py, pz); world.addBody(b); }
staticBox(0, 2.3, 0, 0.8, 0.12, 0.8);        // floor
staticBox(-0.85, 2.85, 0, 0.08, 0.6, 0.9);   // back (-X)
staticBox(0, 2.85, 0.85, 0.9, 0.6, 0.08);    // +Z
staticBox(0, 2.85, -0.85, 0.9, 0.6, 0.08);   // -Z
staticBox(0.85, 2.7, 0, 0.08, 0.4, 0.9);     // feed side (+X, lower so stones roll in)

// ---------------------------------------------------------------- rocks
const rocks = [];
function spawnRock(t = 0) {
  if (rocks.length >= MAX_ROCKS) despawn(rocks[0]);
  const tier = Math.min(8, Math.floor(state.crushed / 14));
  const radius = 0.38 + Math.random() * 0.2 + tier * 0.03;
  const sx = 0.8 + Math.random() * 0.45, sy = 0.7 + Math.random() * 0.35, sz = 0.8 + Math.random() * 0.45;
  const mesh = rockMesh(radius, sx, sy, sz); scene.add(mesh);
  const body = new CANNON.Body({ mass: radius * radius * radius * 70, material: physRock, linearDamping: 0.1, angularDamping: 0.55, allowSleep: false });
  body.addShape(new CANNON.Box(new CANNON.Vec3(radius * sx * 0.82, radius * sy * 0.82, radius * sz * 0.82)));
  const cx = BELT_C.x + cosB * BELT_HALF * (1 - 2 * t), cy = BELT_C.y + sinB * BELT_HALF * (1 - 2 * t);
  body.position.set(cx - sinB * (radius + 0.16), cy + cosB * (radius + 0.16), (Math.random() - 0.5) * 0.7);
  body.quaternion.setFromEuler(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
  body.velocity.set(-cosB * BELT_SPEED, -sinB * BELT_SPEED, 0);
  world.addBody(body);
  rocks.push({ mesh, body, radius, age: 0, hp: Math.max(2, Math.round(radius * 5 + tier)) });
}
function despawn(r) { const i = rocks.indexOf(r); if (i < 0) return; rocks.splice(i, 1); scene.remove(r.mesh); world.removeBody(r.body); }

const frags = [];
function spawnFragments(pos, radius) {
  for (let k = 0; k < 3; k++) {
    const rr = radius * (0.32 + Math.random() * 0.3);
    const mesh = rockMesh(rr, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4); scene.add(mesh);
    const body = new CANNON.Body({ mass: rr * rr * rr * 70, material: physRock, angularDamping: 0.4 }); body.addShape(new CANNON.Sphere(rr));
    body.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 0.1, pos.z + (Math.random() - 0.5) * 0.3);
    const a = Math.random() * Math.PI * 2; body.velocity.set(Math.cos(a) * (0.8 + Math.random() * 1.6), 0.6 + Math.random() * 1.6, Math.sin(a) * (0.8 + Math.random() * 1.6));
    world.addBody(body); frags.push({ mesh, body, life: 1.3 });
  }
}
function despawnFrag(f) { const i = frags.indexOf(f); if (i < 0) return; frags.splice(i, 1); scene.remove(f.mesh); world.removeBody(f.body); }

// dust
const dust = [];
for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd6be8e, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); dust.push({ m, life: 0, max: 1, vel: new THREE.Vector3() }); }
function puff(pos, n) { let c = 0; for (const d of dust) { if (d.life > 0) continue; d.m.position.set(pos.x, pos.y, pos.z); d.m.scale.setScalar(0.1 + Math.random() * 0.13); d.vel.set((Math.random() - 0.5) * 2.4, Math.random() * 2.2, (Math.random() - 0.5) * 2.4); d.life = d.max = 0.45 + Math.random() * 0.4; d.m.material.opacity = 0.55; d.m.visible = true; if (++c >= n) break; } }

// ---------------------------------------------------------------- hammer + breaking
let jawPulse = 0;
function findTarget() {
  let best = null, by = -Infinity;
  for (const r of rocks) { const p = r.body.position; if (p.x > -0.95 && p.x < 0.95 && p.z > -0.95 && p.z < 0.95 && p.y > 2.0 && p.y < 3.6 && p.y > by) { by = p.y; best = r; } }
  return best;
}
function hammerStrike() {
  hammerT = 0; for (const w of workers) w.userData.swing = 0;
  const r = findTarget(); if (!r) return;
  r.body.wakeUp();
  r.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 0.6, -r.body.mass * 2.4, (Math.random() - 0.5) * 0.6));
  r.hp -= 1; puff(r.body.position, 5); jawPulse = 0.18;
  if (r.hp <= 0) breakRock(r);
}
function breakRock(r) { state.money += gainPerCrush(); state.crushed += 1; spawnFragments(r.body.position, r.radius); puff(r.body.position, 9); despawn(r); setHUD(); }

// ---------------------------------------------------------------- input (tap vs drag)
let downPos = null, downTime = 0;
canvas.addEventListener("pointerdown", (e) => { downPos = { x: e.clientX, y: e.clientY }; downTime = performance.now(); });
canvas.addEventListener("pointerup", (e) => {
  if (!downPos) return; const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y); downPos = null;
  if (moved < 9 && performance.now() - downTime < 450) hammerStrike();
});

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
function cost(id) { return Math.floor(UP[id].base * Math.pow(UP[id].mul, state.counts[id])); }
function buy(id) { const c = cost(id); if (state.money < c) return; state.money -= c; state.counts[id] += 1; recompute(); if (id === "worker") ensureWorkers(); setHUD(); save(); }
document.querySelectorAll(".item").forEach((el) => el.addEventListener("click", () => buy(el.dataset.id)));
function setHUD() {
  $("money").textContent = fmt(state.money); $("crushed").textContent = fmt(state.crushed);
  $("feedrate").textContent = feedRate.toFixed(1); $("workers").textContent = state.counts.worker;
  for (const id of ["feed", "worker", "value", "boss"]) {
    $(id + "-own").textContent = "x" + state.counts[id]; $(id + "-cost").textContent = fmt(cost(id));
    const el = document.querySelector('.item[data-id="' + id + '"]'); if (el) el.classList.toggle("afford", state.money >= cost(id));
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let feedTimer = 0, hammerTimer = 0, saveTimer = 0;
function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  world.step(1 / 60, dt, 4);
  beltTex.offset.x += dt * 0.9;   // belt runs toward the crusher

  feedTimer += dt; if (feedTimer >= 1 / feedRate) { feedTimer = 0; spawnRock(); }
  if (autoHammerRate > 0) { hammerTimer += dt; const iv = 1 / autoHammerRate; while (hammerTimer >= iv) { hammerTimer -= iv; hammerStrike(); } }

  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i], p = r.body.position; r.age += dt;
    if (p.x > 0.55 && p.x < 4.7 && p.y > 2.95 && p.y < 5.5 && Math.abs(p.z) < 1.0) {
      const b = r.body, m = b.mass;
      b.applyForce(new CANNON.Vec3((-cosB * BELT_SPEED - b.velocity.x) * m * 6, 0, -b.velocity.z * m * 6));
      b.angularVelocity.x *= 0.6; b.angularVelocity.y *= 0.6; b.angularVelocity.z *= 0.6;
    }
    const inBin = p.x > -0.95 && p.x < 0.95 && p.z > -0.95 && p.z < 0.95 && p.y > 2.0 && p.y < 3.6;
    if (!inBin && (p.y < 1.5 || r.age > 7)) { despawn(r); continue; }
    r.mesh.position.copy(p); r.mesh.quaternion.copy(r.body.quaternion);
  }
  for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; f.life -= dt; if (f.life <= 0 || f.body.position.y < -2) { despawnFrag(f); continue; } f.mesh.position.copy(f.body.position); f.mesh.quaternion.copy(f.body.quaternion); }

  // hammer + workers swing
  if (hammerT < 1) { hammerT = Math.min(1, hammerT + dt * 5); hammer.rotation.z = -1.0 + Math.sin(hammerT * Math.PI) * 1.3; } else hammer.rotation.z = -1.0;
  for (const w of workers) { const s = w.userData; if (s.swing < 1) { s.swing = Math.min(1, s.swing + dt * 5); w.userData.arm.rotation.x = -1.2 + Math.sin(s.swing * Math.PI) * 1.4; } else w.userData.arm.rotation.x = -1.2; }
  jawPulse = Math.max(0, jawPulse - dt);
  for (const d of dust) { if (d.life <= 0) continue; d.life -= dt; d.m.position.addScaledVector(d.vel, dt); d.vel.y -= dt * 1.5; d.m.scale.addScalar(dt * 1.7); d.m.material.opacity = Math.max(0, (d.life / d.max) * 0.55); if (d.life <= 0) d.m.visible = false; }

  controls.update(); renderer.render(scene, camera);
  saveTimer += dt; if (saveTimer > 4) { saveTimer = 0; save(); }
  requestAnimationFrame(animate);
}
function resize() { const w = window.innerWidth, h = window.innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }

// ---------------------------------------------------------------- init
load(); recompute(); ensureWorkers(); resize();
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) spawnRock(t);
const loadingEl = document.getElementById("loading"); if (loadingEl) loadingEl.classList.add("hidden");
setHUD(); animate();
