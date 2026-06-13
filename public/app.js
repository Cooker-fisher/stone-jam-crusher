// Stone Crusher 3D — Jaw Crusher
// A conveyor feeds boulders into a toothed V-shaped jaw; the swing jaw bites and
// the machine grinds the wedged stone until it breaks and falls through. Tap (or
// hired workers) hammer stuck stones. Gritty quarry setting. Earn ¥, upgrade.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

// ---------------------------------------------------------------- config
const UP = {
  feed:   { base: 15,  mul: 1.18 },
  belt:   { base: 40,  mul: 1.22 },
  worker: { base: 60,  mul: 1.25 },
  value:  { base: 25,  mul: 1.16 },
  boss:   { base: 500, mul: 1.6 },
};
const SAVE_KEY = "stone-crusher-3d.v3";
const MAX_ROCKS = 26;
const GRIND_RATE = 0.6;          // slow auto-grind -> stones actually JAM; you/workers hammer them clear
const ROCK_COLORS = [0x6e665c, 0x7a5a48, 0x5b554c, 0x86614a, 0x4a443d, 0x6b5a4a];

// ---------------------------------------------------------------- state
let state = { money: 0, crushed: 0, counts: { feed: 0, belt: 0, worker: 0, value: 0, boss: 0 }, lastTime: Date.now() };
let mult = 1, feedRate = 0.7, autoHammerRate = 0, beltSpeed = 1.8;
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { const d = JSON.parse(r); state = Object.assign(state, d); state.counts = Object.assign({ feed: 0, belt: 0, worker: 0, value: 0, boss: 0 }, d.counts || {}); } } catch (e) {} }
function save() { try { state.lastTime = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function recompute() { mult = Math.pow(1.15, state.counts.boss); feedRate = Math.min(5, 0.7 + 0.3 * state.counts.feed); beltSpeed = Math.min(2.6, 1.6 + 0.16 * state.counts.belt); autoHammerRate = state.counts.worker * 1.3; }
function gainPerCrush() { return Math.max(1, Math.round((1 + state.counts.value) * mult)); }
function fmt(n) { n = Math.floor(n); if (n < 1000) return String(n); const u = ["", "K", "M", "B", "T", "Qa"]; let i = 0, v = n; while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; } return (v >= 100 ? v.toFixed(0) : v.toFixed(2)) + u[i]; }

// ---------------------------------------------------------------- three
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc4ad84);
scene.fog = new THREE.Fog(0xc4ad84, 20, 48);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
camera.position.set(4.6, 5.8, 6.2);                 // front-above, looking into the jaw throat
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.7, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 5; controls.maxDistance = 18; controls.minPolarAngle = 0.15; controls.maxPolarAngle = 1.4;

scene.add(new THREE.HemisphereLight(0xe7dcc2, 0x6a5236, 1.2));
const sun = new THREE.DirectionalLight(0xfff0d2, 1.4);
sun.position.set(5, 12, 6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
sun.shadow.bias = -0.0004; scene.add(sun);

// ---------------------------------------------------------------- materials + textures
const matSteel = new THREE.MeshStandardMaterial({ color: 0x6c5b48, roughness: 0.7, metalness: 0.4 });
const matSteelDark = new THREE.MeshStandardMaterial({ color: 0x3c3226, roughness: 0.8, metalness: 0.5 });
const matSteelLt = new THREE.MeshStandardMaterial({ color: 0x877058, roughness: 0.6, metalness: 0.45 });
const matGround = new THREE.MeshStandardMaterial({ color: 0xa98c5e, roughness: 1 });
function brickTex() {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
  x.fillStyle = "#9a7a52"; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "#7c5f3a"; x.lineWidth = 3;
  for (let r = 0; r < 8; r++) { const y = r * 16; x.beginPath(); x.moveTo(0, y); x.lineTo(128, y); x.stroke(); const off = (r % 2) * 32; for (let bx = off; bx < 128; bx += 64) { x.beginPath(); x.moveTo(bx, y); x.lineTo(bx, y + 16); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 4); return t;
}
const matBrick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 1 });
function beltTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#2b231b"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#14100b"; for (let i = 0; i < 64; i += 16) x.fillRect(0, i, 64, 7);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); return t;
}
const beltTexture = beltTex();
const matBelt = new THREE.MeshStandardMaterial({ map: beltTexture, roughness: 0.9 });

// ground + brick backdrop
const ground = new THREE.Mesh(new THREE.CircleGeometry(28, 48), matGround); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
for (const [px, pz, ry] of [[-7, 0, Math.PI / 2], [0, -7, 0]]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), matBrick); w.position.set(px, 4.5, pz); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); }

// ---------------------------------------------------------------- rock factory (solid boulders, grey/red quarry stone)
function rockGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1); const p = g.attributes.position, v = new THREE.Vector3(), cache = {};
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = v.x.toFixed(2) + "," + v.y.toFixed(2) + "," + v.z.toFixed(2); let f = cache[k]; if (f === undefined) { f = 0.84 + Math.random() * 0.3; cache[k] = f; } p.setXYZ(i, v.x * f, v.y * f, v.z * f); }
  g.computeVertexNormals(); return g;
}
const ROCK_GEOS = [rockGeo(), rockGeo(), rockGeo(), rockGeo(), rockGeo()];
const ROCK_MATS = ROCK_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
function rockMesh(radius, sx, sy, sz) { const m = new THREE.Mesh(ROCK_GEOS[(Math.random() * ROCK_GEOS.length) | 0], ROCK_MATS[(Math.random() * ROCK_MATS.length) | 0]); m.scale.set(radius * sx, radius * sy, radius * sz); m.castShadow = m.receiveShadow = true; return m; }

// ---------------------------------------------------------------- jaw crusher (visual)
const machine = new THREE.Group(); scene.add(machine);
// heavy frame
const frame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.4, 2.7), matSteel); frame.position.y = 1.5; frame.castShadow = frame.receiveShadow = true; machine.add(frame);
const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.2), matSteelDark); baseMesh.position.set(0, 0.25, 0); baseMesh.castShadow = baseMesh.receiveShadow = true; machine.add(baseMesh);
// mouth rim
for (const sx of [-1, 1]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 2.6), matSteelLt); lip.position.set(sx * 1.15, 3.6, 0); machine.add(lip); }
for (const sz of [-1, 1]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.2), matSteelLt); lip.position.set(0, 3.6, sz * 1.3); lip.castShadow = true; machine.add(lip); }

// toothed jaw plate (dir -1 = fixed/back-left, +1 = swing/front-right)
const JAW_LEN = 2.2, JAW_TILT = 0.42;
function makeJaw(dir) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, JAW_LEN, 2.3), matSteel); plate.castShadow = true; g.add(plate);
  for (let i = -3; i <= 3; i++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 2.2), matSteelDark); tooth.position.set(dir * -0.17, i * 0.3, 0); g.add(tooth); }
  g.rotation.z = dir * -JAW_TILT;             // top tilts outward, bottom toward centre -> tight V
  g.position.set(dir * 0.4, 2.6, 0);
  machine.add(g); return g;
}
const fixedJaw = makeJaw(-1);
const swingJaw = makeJaw(1);
const swingBaseX = swingJaw.position.x;
// side walls of the throat
for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.18), matSteelDark); w.position.set(0, 2.7, sz * 1.18); machine.add(w); }
// twin flywheels + shaft (side, spin)
const flywheels = [];
for (const sz of [-1.35, 1.35]) {
  const fw = new THREE.Group(); fw.position.set(-0.2, 1.7, sz);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.18, 24), matSteelDark); disc.rotation.x = Math.PI / 2; disc.castShadow = true; fw.add(disc);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12), matSteelLt); hub.rotation.x = Math.PI / 2; fw.add(hub);
  for (let k = 0; k < 4; k++) { const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.08), matSteel); spoke.rotation.z = k * Math.PI / 4; fw.add(spoke); }
  machine.add(fw); flywheels.push(fw);
}
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.0, 12), matSteelLt); shaft.rotation.x = Math.PI / 2; shaft.position.set(-0.2, 1.7, 0); machine.add(shaft);
// draped chain
for (let i = 0; i < 16; i++) { const t = i / 15; const link = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 6, 10), matSteelDark); link.position.set(1.25 - t * 0.2, 3.7 - t * 2.2 + Math.sin(t * 3) * 0.1, 1.0 - t * 0.05); link.rotation.x = i % 2 ? 0 : Math.PI / 2; machine.add(link); }

// worker platforms + workers along the long sides of the mouth
const workerMatBody = new THREE.MeshStandardMaterial({ color: 0x9a6b3c, roughness: 1 });
const workerMatHat = new THREE.MeshStandardMaterial({ color: 0xe0b44e, roughness: 1 });
for (const sz of [-1.55, 1.55]) { const plat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, 0.7), matSteelDark); plat.position.set(0, 3.35, sz); plat.castShadow = true; machine.add(plat); }
const workers = [];
function makeWorker() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8), workerMatBody); b.position.y = 0.55; b.castShadow = true; g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), workerMatHat); h.position.y = 1.0; h.castShadow = true; g.add(h);
  const arm = new THREE.Group(); arm.position.set(0, 0.85, 0.15); g.add(arm);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), matSteelLt); bar.position.set(0, -0.45, 0); arm.add(bar);
  arm.rotation.x = -1.1; g.userData.arm = arm; g.userData.swing = 1; scene.add(g); return g;
}
function ensureWorkers() {
  const want = Math.min(state.counts.worker, 6);
  while (workers.length < want) workers.push(makeWorker());
  while (workers.length > want) scene.remove(workers.pop());
  for (let i = 0; i < workers.length; i++) { const sz = i % 2 ? 1.5 : -1.5; const col = Math.floor(i / 2); workers[i].position.set(-0.8 + col * 0.8, 3.45, sz); workers[i].lookAt(0, 2.6, 0); }
}

// conveyor feeding into the mouth from the back-left
const BELT_HI = new THREE.Vector3(-4.6, 5.3, 0), BELT_LO = new THREE.Vector3(-0.6, 4.05, 0);
const BELT_C = BELT_HI.clone().add(BELT_LO).multiplyScalar(0.5);
const beltAlong = BELT_LO.clone().sub(BELT_HI); const BELT_HALF = beltAlong.length() / 2; beltAlong.normalize();
const beltAngle = Math.atan2(beltAlong.y, beltAlong.x);
const belt = new THREE.Mesh(new THREE.BoxGeometry(BELT_HALF * 2, 0.18, 1.5), matBelt); belt.position.copy(BELT_C); belt.rotation.z = beltAngle; belt.castShadow = belt.receiveShadow = true; scene.add(belt);
for (const sz of [-0.8, 0.8]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(BELT_HALF * 2, 0.32, 0.09), matSteelDark); rail.position.set(BELT_C.x, BELT_C.y + 0.2, sz); rail.rotation.z = beltAngle; scene.add(rail); }

// ---------------------------------------------------------------- physics
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true; world.solver.iterations = 14;
const pG = new CANNON.Material("g"), pR = new CANNON.Material("r"), pS = new CANNON.Material("s");
world.addContactMaterial(new CANNON.ContactMaterial(pR, pG, { friction: 0.7, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(pR, pR, { friction: 0.6, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(pR, pS, { friction: 0.5, restitution: 0 }));
const groundBody = new CANNON.Body({ mass: 0, material: pG }); groundBody.addShape(new CANNON.Plane()); groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); world.addBody(groundBody);
function staticBox(px, py, pz, hx, hy, hz, rotZ) { const b = new CANNON.Body({ mass: 0, material: pS }); b.addShape(new CANNON.Box(new CANNON.Vec3(hx, hy, hz))); b.position.set(px, py, pz); if (rotZ) b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotZ); world.addBody(b); }
// jaw V (both plates static; the swing plate's motion is cosmetic), side walls, base catch
staticBox(-0.4, 2.6, 0, 0.13, JAW_LEN / 2, 1.15, JAW_TILT);    // fixed jaw (tight V)
staticBox(0.4, 2.6, 0, 0.13, JAW_LEN / 2, 1.15, -JAW_TILT);    // swing jaw (static collider)
staticBox(0, 2.7, 1.18, 1.0, 1.0, 0.09);                       // +Z wall
staticBox(0, 2.7, -1.18, 1.0, 1.0, 0.09);                      // -Z wall
// belt collider
staticBox(BELT_C.x, BELT_C.y, 0, BELT_HALF, 0.09, 0.75, beltAngle);
for (const sz of [-0.82, 0.82]) staticBox(BELT_C.x, BELT_C.y + 0.24, sz, BELT_HALF, 0.32, 0.06, beltAngle);

// ---------------------------------------------------------------- rocks
const rocks = [];
function spawnRock() {
  if (rocks.length >= MAX_ROCKS) return;
  const tier = Math.min(8, Math.floor(state.crushed / 14));
  const radius = 0.36 + Math.random() * 0.16 + Math.min(tier, 5) * 0.012;
  const sx = 0.8 + Math.random() * 0.45, sy = 0.7 + Math.random() * 0.35, sz = 0.8 + Math.random() * 0.45;
  const mesh = rockMesh(radius, sx, sy, sz); scene.add(mesh);
  const body = new CANNON.Body({ mass: radius * radius * radius * 90, material: pR, linearDamping: 0.06, angularDamping: 0.4, allowSleep: false });
  body.addShape(new CANNON.Box(new CANNON.Vec3(radius * sx * 0.85, radius * sy * 0.85, radius * sz * 0.85)));   // box: carried on the belt, wedges/jams in the V
  body.position.set(BELT_HI.x + beltAlong.x * 0.4, BELT_HI.y + 0.4, (Math.random() - 0.5) * 0.6);
  body.velocity.set(beltAlong.x * beltSpeed, beltAlong.y * beltSpeed, 0);
  world.addBody(body);
  rocks.push({ mesh, body, radius, grind: 0, hp: 2 + Math.min(3, Math.floor(tier / 3)) });
}
function despawn(r) { const i = rocks.indexOf(r); if (i < 0) return; rocks.splice(i, 1); scene.remove(r.mesh); world.removeBody(r.body); }

const frags = [];
function spawnFragments(pos, radius) {
  for (let k = 0; k < 3; k++) {
    const rr = radius * (0.3 + Math.random() * 0.28); const mesh = rockMesh(rr, 1, 1, 1); scene.add(mesh);
    const body = new CANNON.Body({ mass: rr * rr * rr * 70, material: pR, angularDamping: 0.4 }); body.addShape(new CANNON.Sphere(rr));
    body.position.set(pos.x + (Math.random() - 0.5) * 0.2, pos.y - 0.1, pos.z + (Math.random() - 0.5) * 0.2);
    body.velocity.set((Math.random() - 0.5) * 1.2, -Math.random() * 1.5, (Math.random() - 0.5) * 1.2);
    world.addBody(body); frags.push({ mesh, body, life: 1.2 });
  }
}
function despawnFrag(f) { const i = frags.indexOf(f); if (i < 0) return; frags.splice(i, 1); scene.remove(f.mesh); world.removeBody(f.body); }

// dust
const dust = [];
for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xd8c191, transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); dust.push({ m, life: 0, max: 1, vel: new THREE.Vector3() }); }
function puff(pos, n) { let c = 0; for (const d of dust) { if (d.life > 0) continue; d.m.position.set(pos.x, pos.y, pos.z); d.m.scale.setScalar(0.1 + Math.random() * 0.13); d.vel.set((Math.random() - 0.5) * 2, Math.random() * 1.8, (Math.random() - 0.5) * 2); d.life = d.max = 0.45 + Math.random() * 0.4; d.m.material.opacity = 0.5; d.m.visible = true; if (++c >= n) break; } }

// ---------------------------------------------------------------- crushing
const raycaster = new THREE.Raycaster();
function inThroat(p) { return Math.abs(p.x) < 0.65 && Math.abs(p.z) < 1.05 && p.y > 1.7 && p.y < 3.4; }   // wedged in the jaw V
function jamCount() { let n = 0; for (const r of rocks) if (inThroat(r.body.position)) n++; return n; }
function findTarget() { let best = null, by = -Infinity; for (const r of rocks) { const p = r.body.position; if (inThroat(p) && p.y > by) { by = p.y; best = r; } } return best; }
function strikeRock(r) { r.body.wakeUp(); r.body.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 0.4, -r.body.mass * 1.6, (Math.random() - 0.5) * 0.4)); r.hp -= 1; puff(r.body.position, 5); if (r.hp <= 0) breakRock(r); }
const hammer = new THREE.Group(); hammer.position.set(0, 3.9, 0.2); scene.add(hammer);
const hH = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 })); hH.position.y = -0.75; hammer.add(hH);
const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.34), matSteel); hHead.position.y = -1.5; hHead.castShadow = true; hammer.add(hHead);
let hammerT = 1; hammer.rotation.z = -1.0; hammer.visible = false;
function manualHammer(r) { const p = r.body.position; hammer.position.set(p.x, p.y + 1.4, p.z); hammer.visible = true; hammerT = 0; strikeRock(r); }
function autoHammer() { const r = findTarget(); if (!r) return; for (const w of workers) w.userData.swing = 0; strikeRock(r); }
function breakRock(r) { state.money += gainPerCrush(); state.crushed += 1; spawnFragments(r.body.position, r.radius); puff(r.body.position, 9); despawn(r); setHUD(); }

// ---------------------------------------------------------------- input
let downPos = null, downTime = 0;
canvas.addEventListener("pointerdown", (e) => { downPos = { x: e.clientX, y: e.clientY }; downTime = performance.now(); });
canvas.addEventListener("pointerup", (e) => {
  if (!downPos) return; const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y); downPos = null;
  if (moved >= 9 || performance.now() - downTime >= 450) return;
  const rect = canvas.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
  const hit = raycaster.intersectObjects(rocks.map((r) => r.mesh), false)[0];
  if (hit) { const r = rocks.find((x) => x.mesh === hit.object); if (r) manualHammer(r); }
});

// ---------------------------------------------------------------- UI
const $ = (id) => document.getElementById(id);
function cost(id) { return Math.floor(UP[id].base * Math.pow(UP[id].mul, state.counts[id])); }
function buy(id) { const c = cost(id); if (state.money < c) return; state.money -= c; state.counts[id] += 1; recompute(); if (id === "worker") ensureWorkers(); setHUD(); save(); }
document.querySelectorAll(".item").forEach((el) => el.addEventListener("click", () => buy(el.dataset.id)));
function setHUD() {
  $("money").textContent = fmt(state.money); $("crushed").textContent = fmt(state.crushed);
  $("feedrate").textContent = feedRate.toFixed(1); $("workers").textContent = state.counts.worker;
  for (const id of ["feed", "belt", "worker", "value", "boss"]) { $(id + "-own").textContent = "x" + state.counts[id]; $(id + "-cost").textContent = fmt(cost(id)); const el = document.querySelector('.item[data-id="' + id + '"]'); if (el) el.classList.toggle("afford", state.money >= cost(id)); }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let feedTimer = 0, hammerTimer = 0, saveTimer = 0;
function animate() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  world.step(1 / 60, dt, 4);
  beltTexture.offset.x += dt * (0.3 + beltSpeed * 0.4);
  for (const fw of flywheels) fw.rotation.z += dt * 3.2;
  swingJaw.position.x = swingBaseX + Math.sin(t * 6) * 0.05;     // cosmetic bite

  feedTimer += dt; if (feedTimer >= 1 / feedRate) { feedTimer = 0; if (jamCount() < 10) spawnRock(); }
  if (autoHammerRate > 0) { hammerTimer += dt; const iv = 1 / autoHammerRate; while (hammerTimer >= iv) { hammerTimer -= iv; autoHammer(); } }

  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i], p = r.body.position;
    // belt carries stones toward the mouth
    const onBelt = p.x < BELT_LO.x + 0.2 && p.x > BELT_HI.x - 0.3 && p.y > 3.7 && Math.abs(p.z) < 0.95;
    if (onBelt) { const b = r.body, m = b.mass; b.applyForce(new CANNON.Vec3((beltAlong.x * beltSpeed - b.velocity.x) * m * 3, (beltAlong.y * beltSpeed - b.velocity.y) * m * 1.5, -b.velocity.z * m * 3)); b.angularVelocity.set(0, 0, 0); }   // carried, not rolling
    else if (inThroat(p)) { r.grind += dt * GRIND_RATE; if (r.grind >= 1) { r.grind -= 1; r.hp -= 1; if (Math.random() < 0.5) puff(p, 2); if (r.hp <= 0) { breakRock(r); continue; } } }
    if (p.y < 1.0 || p.x > 6 || p.x < -6 || Math.abs(p.z) > 4) { despawn(r); continue; }
    r.mesh.position.copy(p); r.mesh.quaternion.copy(r.body.quaternion);
  }
  for (let i = frags.length - 1; i >= 0; i--) { const f = frags[i]; f.life -= dt; if (f.life <= 0 || f.body.position.y < -2) { despawnFrag(f); continue; } f.mesh.position.copy(f.body.position); f.mesh.quaternion.copy(f.body.quaternion); }

  if (hammerT < 1) { hammerT = Math.min(1, hammerT + dt * 5); hammer.rotation.z = -1.0 + Math.sin(hammerT * Math.PI) * 1.3; if (hammerT >= 1) hammer.visible = false; }
  for (const w of workers) { const s = w.userData; if (s.swing < 1) { s.swing = Math.min(1, s.swing + dt * 5); w.userData.arm.rotation.x = -1.1 + Math.sin(s.swing * Math.PI) * 1.5; } else w.userData.arm.rotation.x = -1.1; }
  for (const d of dust) { if (d.life <= 0) continue; d.life -= dt; d.m.position.addScaledVector(d.vel, dt); d.vel.y -= dt * 1.5; d.m.scale.addScalar(dt * 1.7); d.m.material.opacity = Math.max(0, (d.life / d.max) * 0.5); if (d.life <= 0) d.m.visible = false; }

  controls.update(); renderer.render(scene, camera);
  saveTimer += dt; if (saveTimer > 4) { saveTimer = 0; save(); }
  requestAnimationFrame(animate);
}
function resize() { const w = window.innerWidth, h = window.innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); }

// ---------------------------------------------------------------- init
load(); recompute(); ensureWorkers(); resize();
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") save(); });
for (let i = 0; i < 4; i++) spawnRock();
const loadingEl = document.getElementById("loading"); if (loadingEl) loadingEl.classList.add("hidden");
setHUD(); animate();
