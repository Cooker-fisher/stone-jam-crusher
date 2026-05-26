const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const HUD = {
  time: document.getElementById("timeValue"),
  tons: document.getElementById("tonsValue"),
  jam: document.getElementById("jamValue"),
};

const COLORS = {
  skyTop: "#dfbf93",
  skyBottom: "#b88a55",
  wall: "#9a7755",
  wallDark: "#7a5d42",
  floor: "#8b6743",
  floorDark: "#6f5136",
  steel: "#73553b",
  steelDark: "#4e3927",
  rust: "#8f4c2a",
  dust: "rgba(84, 58, 34, 0.35)",
  label: "#4a3524",
  alert: "#8d3525",
  pale: "#e8cda4",
};

const stones = [
  { type: "flat", x: 735, y: 438, w: 280, h: 84, rot: -0.18, c: "#74614c" },
  { type: "angular", x: 633, y: 450, s: 92, rot: 0.35, c: "#6a5a4a" },
  { type: "hard", x: 835, y: 505, r: 72, c: "#4d4a45" },
  { type: "angular", x: 920, y: 455, s: 86, rot: -0.45, c: "#665541" },
  { type: "round", x: 565, y: 500, r: 54, c: "#8a745c" },
];

function rr(x, y, w, h, r, fill, stroke, lw = 1) {
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

function txt(t, x, y, color = COLORS.label, size = 14) {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Noto Sans JP, sans-serif`;
  ctx.fillText(t, x, y);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  rr(110, 40, 940, 260, 34, "rgba(234, 206, 162,0.28)");

  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 110, canvas.width, 330);
  ctx.fillStyle = COLORS.wallDark;
  for (let i = 0; i < 80; i += 1) {
    ctx.fillRect((i * 79) % 1200, 118 + ((i * 31) % 305), 3 + (i % 4), 1 + (i % 2));
  }

  ctx.fillStyle = COLORS.floor;
  ctx.beginPath();
  ctx.moveTo(0, 355);
  ctx.lineTo(1200, 305);
  ctx.lineTo(1200, 620);
  ctx.lineTo(0, 620);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = COLORS.floorDark;
  for (let i = 0; i < 200; i += 1) {
    const x = (i * 67) % 1200;
    const y = 360 + ((i * 29) % 250);
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 5), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrusherRig() {
  // big drum foreground
  ctx.save();
  ctx.translate(160, 548);
  ctx.rotate(-0.32);
  rr(-130, -64, 280, 130, 65, "#88705a", COLORS.steelDark, 4);
  rr(-113, -44, 245, 88, 42, "#5f4835", COLORS.rust, 3);
  ctx.restore();

  // chute walls (camera-tilted like photo)
  ctx.save();
  ctx.translate(665, 286);
  ctx.rotate(-0.1);
  rr(-245, -10, 520, 118, 8, COLORS.steel, COLORS.steelDark, 4);
  ctx.restore();

  ctx.save();
  ctx.translate(865, 262);
  ctx.rotate(0.32);
  rr(-42, -20, 360, 92, 8, COLORS.steel, COLORS.steelDark, 4);
  ctx.restore();

  // throat and grid
  ctx.save();
  ctx.translate(732, 498);
  ctx.rotate(-0.12);
  rr(-155, -50, 315, 95, 8, "#4f3a29", "#322317", 3);
  for (let x = -138; x <= 120; x += 25) {
    ctx.strokeStyle = "#2f2218";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, -46);
    ctx.lineTo(x + 18, 42);
    ctx.stroke();
  }
  ctx.restore();

  // jam danger fins around throat
  ctx.fillStyle = COLORS.rust;
  ctx.beginPath();
  ctx.moveTo(562, 492); ctx.lineTo(602, 438); ctx.lineTo(627, 502); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(910, 486); ctx.lineTo(952, 434); ctx.lineTo(970, 506); ctx.closePath(); ctx.fill();

  txt("CHAIN / THROAT JAM ZONE", 640, 540, COLORS.alert, 16);
}

function stone(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.rot) ctx.rotate(s.rot);
  ctx.fillStyle = s.c;

  if (s.type === "flat") {
    rr(-s.w / 2, -s.h / 2, s.w, s.h, 12, s.c, "#4b3a2c", 4);
    ctx.strokeStyle = "#9f8869";
    for (let y = -26; y <= 26; y += 13) {
      ctx.beginPath(); ctx.moveTo(-126, y); ctx.lineTo(128, y - 12); ctx.stroke();
    }
  } else if (s.type === "angular") {
    ctx.beginPath();
    ctx.moveTo(-s.s * 0.55, s.s * 0.2);
    ctx.lineTo(-s.s * 0.3, -s.s * 0.48);
    ctx.lineTo(s.s * 0.2, -s.s * 0.5);
    ctx.lineTo(s.s * 0.52, -s.s * 0.08);
    ctx.lineTo(s.s * 0.24, s.s * 0.48);
    ctx.lineTo(-s.s * 0.28, s.s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#433427"; ctx.lineWidth = 4; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#443427"; ctx.lineWidth = 4; ctx.stroke();
  }

  // dust shadow
  ctx.fillStyle = COLORS.dust;
  ctx.beginPath(); ctx.ellipse(0, (s.h || s.r || s.s) * 0.6, 64, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawWorkers() {
  const workers = [
    { x: 540, y: 315, c: "#5a4a3a", bend: -0.2 },
    { x: 620, y: 338, c: "#6f5d4a", bend: 0.15 },
    { x: 695, y: 365, c: "#c0a67d", bend: 0.55 },
  ];

  workers.forEach((w) => {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.bend);
    ctx.strokeStyle = w.c;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 56); ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(-20, 42); ctx.moveTo(0, 24); ctx.lineTo(20, 42); ctx.stroke();
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(-14, 88); ctx.moveTo(0, 56); ctx.lineTo(16, 88); ctx.stroke();
    ctx.fillStyle = "#483426";
    ctx.beginPath(); ctx.arc(0, -10, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });

  // manual hook pole toward rock
  ctx.strokeStyle = "#4a3727";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(714, 430);
  ctx.lineTo(778, 486);
  ctx.stroke();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawCrusherRig();
  stones.forEach(stone);
  drawWorkers();
  txt("MANUAL FIELD INTERVENTION", 430, 82, COLORS.pale, 17);
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
