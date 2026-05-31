// Stone Jam Crusher — play-screen viewpoint
// Reference viewpoint (real crusher videos):
//   - 粉砕機 / crusher sits in the BOTTOM-LEFT (big flywheel + housing).
//   - Stones feed from the RIGHT and flow toward the LEFT, down a sloped
//     chute, getting larger (小石 → 中石 → 大石) until they reach the
//     crusher throat where the big ones jam.
// This pass rebuilds the static scene to match that viewpoint. Flow,
// jam logic and tool interactions are layered on in later steps.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const HUD = {
  time: document.getElementById("timeValue"),
  tons: document.getElementById("tonsValue"),
  jam: document.getElementById("jamValue"),
};

const SCENE = {
  width: 1200,
  height: 620,
};

const COLORS = {
  skyTop: "#e3cda2",
  skyBottom: "#c8a974",
  wall: "#c4a87e",
  wallDark: "#a8895e",
  wallSeam: "#8f7150",
  floor: "#cdb184",
  floorDark: "#a98a5f",
  steel: "#6f5b48",
  steelMid: "#5a4837",
  steelDark: "#3c2e22",
  rust: "#8f4c2a",
  bolt: "#2c2018",
  dust: "rgba(206, 178, 130, 0.32)",
  dustWarm: "rgba(224, 198, 150, 0.5)",
  stoneEdge: "#3f3022",
  label: "#3a2a1b",
  pale: "#f0dcb8",
  alert: "#9d3a26",
};

// Sloped feed-chute surface: stones rest on the line from the throat
// (lower-left) up to the off-screen feed (upper-right).
function chuteSurfaceY(x) {
  return 524.35 - 0.2284 * x;
}

// Stones laid out right -> left, small -> large, ending in a jam boulder
// wedged in the crusher throat. y is derived from the chute unless fixed.
const stones = [
  { x: 1150, size: 15, type: "round", c: "#9c8c72", seed: 1 }, // 小石
  { x: 1120, size: 19, type: "angular", c: "#8d7d66", seed: 2 },
  { x: 1085, size: 13, type: "round", c: "#a89677", seed: 3 },
  { x: 1040, size: 30, type: "round", c: "#857458", seed: 4 }, // 中石
  { x: 985, size: 26, type: "angular", c: "#7c6c55", seed: 5 },
  { x: 928, size: 44, type: "hard", c: "#6b5d4c", seed: 6 },
  { x: 848, size: 52, type: "layered", c: "#7d6a51", seed: 7 },
  { x: 748, size: 66, type: "angular", c: "#6a5b48", seed: 8 }, // 大石
  { x: 636, size: 84, type: "hard", c: "#5b5044", seed: 9 },
  { x: 548, size: 60, type: "flat", c: "#8a785d", seed: 11, rot: -0.15 },
  { x: 452, y: 388, size: 104, type: "hard", c: "#4a4136", seed: 10, rot: 0.12 }, // throat jam
];

stones.forEach((stone) => {
  if (stone.y == null) stone.y = chuteSurfaceY(stone.x) - stone.size * 0.55;
});

function rnd(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawRoundedRect(x, y, w, h, r, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

function drawText(text, x, y, color = COLORS.label, size = 14, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px "Noto Sans JP", sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, SCENE.height);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SCENE.width, SCENE.height);

  // dusty concrete / brick wall across the upper area
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, SCENE.width, 470);
  ctx.fillStyle = COLORS.wallDark;
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 97) % SCENE.width;
    const y = 60 + ((i * 53) % 360);
    ctx.fillRect(x, y, 26 + (i % 3) * 10, 12);
  }
  ctx.fillStyle = COLORS.wallSeam;
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 73 + 40) % SCENE.width;
    const y = 80 + ((i * 61) % 360);
    ctx.fillRect(x, y, 3 + (i % 4), 2);
  }

  // dirt floor visible behind the crusher
  ctx.fillStyle = COLORS.floor;
  ctx.beginPath();
  ctx.moveTo(0, 455);
  ctx.lineTo(SCENE.width, 425);
  ctx.lineTo(SCENE.width, SCENE.height);
  ctx.lineTo(0, SCENE.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.floorDark;
  for (let i = 0; i < 220; i += 1) {
    const x = (i * 61) % SCENE.width;
    const y = 460 + ((i * 37) % 150);
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawOverheadBeam() {
  ctx.save();
  ctx.translate(880, 150);
  ctx.rotate(0.04);
  drawRoundedRect(-360, -16, 720, 34, 6, COLORS.steelMid, COLORS.steelDark, 3);
  ctx.fillStyle = COLORS.bolt;
  for (let x = -330; x <= 330; x += 70) {
    ctx.beginPath();
    ctx.arc(x, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(900, 116);
  ctx.rotate(0.02);
  drawRoundedRect(-330, -9, 660, 18, 9, COLORS.steel, COLORS.steelDark, 2);
  ctx.restore();
}

function drawCrusherBody() {
  // heavy steel housing filling the lower-left
  ctx.fillStyle = COLORS.steelMid;
  ctx.beginPath();
  ctx.moveTo(0, 395);
  ctx.lineTo(360, 440);
  ctx.lineTo(360, SCENE.height);
  ctx.lineTo(0, SCENE.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = COLORS.steel;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 398);
  ctx.lineTo(360, 443);
  ctx.stroke();

  // dark recess where the flywheel rides
  ctx.fillStyle = COLORS.steelDark;
  ctx.fillRect(20, 470, 300, 150);

  ctx.fillStyle = COLORS.bolt;
  for (let x = 30; x < 350; x += 46) {
    const y = 400 + x * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(143, 76, 42, 0.4)";
  ctx.fillRect(60, 470, 10, 120);
  ctx.fillRect(210, 480, 8, 110);
}

function drawFlywheel() {
  const cx = 150;
  const cy = 592;
  const r = 172;

  ctx.fillStyle = COLORS.steelDark;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fill();

  const face = ctx.createRadialGradient(cx - 40, cy - 50, 30, cx, cy, r);
  face.addColorStop(0, "#6a5946");
  face.addColorStop(1, "#2f251c");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#241b14";
  ctx.lineWidth = 26;
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.74, cy + Math.sin(a) * r * 0.74);
    ctx.stroke();
  }

  ctx.fillStyle = COLORS.steel;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.bolt;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#241b14";
  for (let k = 0; k < 16; k += 1) {
    const a = (k * Math.PI) / 8;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(143, 76, 42, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx + 90, cy - 40, 30, 80, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // drive belt heading off toward the motor
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy - 120);
  ctx.lineTo(cx - 30, cy - 150);
  ctx.stroke();
}

function drawFeedChute() {
  ctx.beginPath();
  ctx.moveTo(1210, 242); // upper-right (feed)
  ctx.lineTo(430, 420); // upper-left (throat)
  ctx.lineTo(470, 520); // lower-left lip
  ctx.lineTo(1210, 352); // lower-right lip
  ctx.closePath();
  ctx.fillStyle = COLORS.steel;
  ctx.fill();
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(470, 520);
  ctx.lineTo(1210, 352);
  ctx.stroke();

  ctx.strokeStyle = "rgba(60, 46, 34, 0.5)";
  ctx.lineWidth = 3;
  for (let t = 0.08; t < 1; t += 0.11) {
    const ux = 1210 + (430 - 1210) * t;
    const uy = 242 + (420 - 242) * t;
    const lx = 1210 + (470 - 1210) * t;
    const ly = 352 + (520 - 352) * t;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(lx, ly);
    ctx.stroke();
  }

  ctx.strokeStyle = COLORS.steelMid;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(1210, 242);
  ctx.lineTo(430, 420);
  ctx.stroke();

  // dusty fill resting in the trough
  ctx.fillStyle = "rgba(180, 150, 104, 0.25)";
  ctx.beginPath();
  ctx.moveTo(1210, 250);
  ctx.lineTo(440, 424);
  ctx.lineTo(470, 500);
  ctx.lineTo(1210, 340);
  ctx.closePath();
  ctx.fill();
}

function drawWarnTriangle(x, y) {
  ctx.fillStyle = COLORS.rust;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 18);
  ctx.lineTo(x, y - 16);
  ctx.lineTo(x + 16, y + 18);
  ctx.closePath();
  ctx.fill();
  drawText("!", x - 3, y + 12, COLORS.pale, 16);
}

function drawHopperThroat() {
  // left jaw beam
  ctx.save();
  ctx.translate(372, 498);
  ctx.rotate(-0.32);
  drawRoundedRect(-30, -92, 60, 196, 10, COLORS.steelMid, COLORS.steelDark, 4);
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 3;
  for (let y = -78; y <= 88; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-24, y);
    ctx.lineTo(24, y);
    ctx.stroke();
  }
  ctx.restore();

  // right jaw beam
  ctx.save();
  ctx.translate(505, 508);
  ctx.rotate(0.42);
  drawRoundedRect(-32, -100, 64, 210, 10, COLORS.steel, COLORS.steelDark, 4);
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 3;
  for (let y = -86; y <= 96; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-26, y);
    ctx.lineTo(26, y);
    ctx.stroke();
  }
  ctx.restore();

  // dark throat gap between the jaws
  ctx.fillStyle = COLORS.steelDark;
  ctx.beginPath();
  ctx.moveTo(398, 470);
  ctx.lineTo(470, 485);
  ctx.lineTo(452, 600);
  ctx.lineTo(404, 600);
  ctx.closePath();
  ctx.fill();

  drawWarnTriangle(420, 452);
  drawWarnTriangle(486, 470);
}

function drawGrating() {
  ctx.save();
  ctx.translate(232, 452);
  ctx.rotate(-0.06);
  ctx.fillStyle = COLORS.steelMid;
  ctx.fillRect(0, 0, 150, 26);
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = 2;
  for (let x = 0; x <= 150; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 26);
    ctx.stroke();
  }
  for (let y = 0; y <= 26; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(150, y);
    ctx.stroke();
  }
  ctx.strokeRect(0, 0, 150, 26);
  ctx.restore();
}

// One static field worker silhouette standing by the throat (matches the
// reference photos). Kept simple — no animation.
function drawWorker() {
  ctx.save();
  ctx.translate(300, 415);

  ctx.fillStyle = COLORS.dust;
  ctx.beginPath();
  ctx.ellipse(0, 44, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d8c39b"; // shalwar kameez robe
  ctx.beginPath();
  ctx.moveTo(-14, -58);
  ctx.lineTo(14, -58);
  ctx.lineTo(20, 4);
  ctx.lineTo(-20, 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#c7b08a";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-8, 4);
  ctx.lineTo(-9, 40);
  ctx.moveTo(9, 4);
  ctx.lineTo(10, 40);
  ctx.stroke();

  ctx.fillStyle = "#7c5a3e"; // head
  ctx.beginPath();
  ctx.arc(0, -70, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8d6b0"; // cap
  ctx.beginPath();
  ctx.ellipse(0, -78, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRock(stone) {
  const { x, y, size, type } = stone;
  const seed = stone.seed ?? x * 0.13 + y * 0.07;
  ctx.save();
  ctx.translate(x, y);
  if (stone.rot) ctx.rotate(stone.rot);

  const points = type === "round" ? 11 : 8;
  const jag = type === "round" ? 0.12 : type === "angular" ? 0.34 : 0.24;
  const squash = type === "flat" ? 0.5 : 0.86;
  const stretch = type === "flat" ? 1.5 : 1;

  const verts = [];
  for (let i = 0; i < points; i += 1) {
    const a = (i / points) * Math.PI * 2;
    const rr = size * (1 - jag + jag * 2 * rnd(seed + i * 1.7));
    verts.push([Math.cos(a) * rr * stretch, Math.sin(a) * rr * squash]);
  }

  // contact dust
  ctx.fillStyle = COLORS.dust;
  ctx.beginPath();
  ctx.ellipse(0, size * squash * 0.9, size * 1.1 * stretch, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.beginPath();
  verts.forEach(([vx, vy], i) => (i ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy)));
  ctx.closePath();
  ctx.fillStyle = stone.c;
  ctx.fill();
  ctx.strokeStyle = COLORS.stoneEdge;
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.stroke();

  // shading + facets, clipped to the rock body
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(255, 246, 225, 0.18)";
  ctx.beginPath();
  ctx.ellipse(-size * 0.3, -size * 0.4, size * 0.9, size * 0.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(40, 28, 18, 0.34)";
  ctx.beginPath();
  ctx.ellipse(size * 0.35, size * 0.45, size * 0.95, size * 0.7, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(60, 44, 30, 0.4)";
  ctx.lineWidth = 1.5;
  if (type === "flat" || type === "layered") {
    for (let yy = -size * 0.4; yy <= size * 0.4; yy += size * 0.22) {
      ctx.beginPath();
      ctx.moveTo(-size * 1.4 * stretch, yy);
      ctx.lineTo(size * 1.4 * stretch, yy - size * 0.12);
      ctx.stroke();
    }
  } else {
    for (let k = 0; k < 3; k += 1) {
      const a = rnd(seed + 50 + k) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size * squash);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.restore();
}

function drawChain() {
  const links = 16;
  const x0 = 792;
  const y0 = 168;
  const x1 = 648;
  const y1 = 352;
  for (let i = 0; i < links; i += 1) {
    const t = i / (links - 1);
    const sag = Math.sin(t * Math.PI) * 38;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + sag;
    ctx.strokeStyle = i % 2 ? COLORS.steelDark : COLORS.steel;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 11, t * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDustHaze() {
  const spots = [
    [430, 470, 120],
    [300, 540, 160],
    [700, 360, 130],
  ];
  spots.forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, COLORS.dustWarm);
    g.addColorStop(1, "rgba(224, 198, 150, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawLabels() {
  // feed direction: stones flow right -> left
  drawText("STONE FEED  右 → 左", 1190, 58, COLORS.label, 18, "right");
  ctx.strokeStyle = COLORS.label;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(1180, 78);
  ctx.lineTo(980, 78);
  ctx.moveTo(980, 78);
  ctx.lineTo(1002, 68);
  ctx.moveTo(980, 78);
  ctx.lineTo(1002, 88);
  ctx.stroke();

  drawText("CRUSHER THROAT / 粉砕口", 470, 392, COLORS.alert, 16);
  drawText("粉砕機 / CRUSHER", 40, 470, COLORS.pale, 17);
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawOverheadBeam();
  drawCrusherBody();
  drawFlywheel();
  drawFeedChute();
  drawHopperThroat();
  drawGrating();
  drawWorker();
  stones.forEach(drawRock);
  drawChain();
  drawDustHaze();
  drawLabels();
}

function setupToolButtons() {
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tool-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      HUD.jam.textContent = button.dataset.tool.toUpperCase();
    });
  });
}

drawScene();
setupToolButtons();
