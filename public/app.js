const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const HUD = {
  time: document.getElementById("timeValue"),
  tons: document.getElementById("tonsValue"),
  jam: document.getElementById("jamValue"),
};

const COLORS = {
  skyTop: "#18202a",
  skyBottom: "#0d1117",
  ground: "#1a1410",
  steel: "#4b5663",
  steelDark: "#222a34",
  steelLight: "#748292",
  chain: "#11161d",
  chainLink: "#6c7784",
  hazard: "#ffb33f",
  danger: "#ff5a5f",
  text: "#f4f7fb",
  muted: "#9aa7b5",
  dust: "rgba(190, 170, 140, 0.24)",
};

const stones = [
  {
    label: "Round",
    type: "round",
    x: 180,
    y: 365,
    r: 34,
    color: "#8c8070",
    accent: "#b3a18d",
  },
  {
    label: "Angular",
    type: "angular",
    x: 360,
    y: 352,
    r: 42,
    color: "#77716a",
    accent: "#b9a88f",
  },
  {
    label: "Flat",
    type: "flat",
    x: 560,
    y: 360,
    w: 112,
    h: 42,
    color: "#6f665a",
    accent: "#a99173",
  },
  {
    label: "Layered",
    type: "layered",
    x: 735,
    y: 352,
    r: 46,
    color: "#7d766d",
    accent: "#d2b58b",
  },
  {
    label: "Hard",
    type: "hard",
    x: 925,
    y: 338,
    r: 50,
    color: "#5e6670",
    accent: "#aeb9c7",
  },
];

function drawRoundedRect(x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
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
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawSceneBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, COLORS.skyTop);
  gradient.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = COLORS.dust;
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 97) % canvas.width;
    const y = 40 + ((i * 41) % 280);
    const r = 1 + (i % 4) * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 440, canvas.width, 180);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;
  for (let y = 80; y < 430; y += 44) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y + 18);
    ctx.stroke();
  }
}

function drawSteelBeam(x1, y1, x2, y2, width) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = COLORS.steelDark;
  ctx.lineWidth = width + 6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = COLORS.steel;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawConveyor() {
  drawSteelBeam(70, 405, 800, 405, 34);
  drawSteelBeam(120, 425, 760, 425, 10);

  ctx.fillStyle = COLORS.chain;
  drawRoundedRect(82, 378, 725, 52, 18, COLORS.chain, "#48525f", 2);

  for (let x = 105; x < 790; x += 42) {
    drawRoundedRect(x, 390, 28, 18, 8, "#2d3641", COLORS.chainLink, 2);
  }

  ctx.fillStyle = COLORS.hazard;
  for (let x = 90; x < 785; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 432);
    ctx.lineTo(x + 26, 432);
    ctx.lineTo(x + 13, 450);
    ctx.closePath();
    ctx.fill();
  }

  drawLabel("CHAIN CONVEYOR", 356, 468, COLORS.muted);
}

function drawFeed() {
  drawRoundedRect(34, 260, 128, 170, 18, "#262d36", "#596675", 3);
  drawRoundedRect(58, 292, 80, 78, 16, "#11161d", "#697789", 2);
  drawLabel("STONE FEED", 52, 246, COLORS.muted);

  ctx.fillStyle = "#7b7064";
  ctx.beginPath();
  ctx.arc(96, 330, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawHopperAndCrusher() {
  ctx.save();
  ctx.fillStyle = "#2d3540";
  ctx.strokeStyle = "#758292";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(775, 265);
  ctx.lineTo(1025, 265);
  ctx.lineTo(955, 415);
  ctx.lineTo(835, 415);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#151a21";
  ctx.beginPath();
  ctx.moveTo(828, 308);
  ctx.lineTo(972, 308);
  ctx.lineTo(930, 398);
  ctx.lineTo(868, 398);
  ctx.closePath();
  ctx.fill();

  drawRoundedRect(940, 315, 210, 145, 24, "#252d37", "#6d7b8e", 4);
  drawRoundedRect(976, 346, 138, 76, 18, "#10151c", "#4e5b68", 2);

  ctx.fillStyle = COLORS.danger;
  ctx.beginPath();
  ctx.arc(1045, 384, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#10151c";
  ctx.beginPath();
  ctx.arc(1045, 384, 12, 0, Math.PI * 2);
  ctx.fill();

  drawLabel("HOPPER", 845, 246, COLORS.muted);
  drawLabel("CRUSHER", 985, 492, COLORS.muted);

  ctx.restore();
}

function drawOperatorHints() {
  drawRoundedRect(160, 95, 240, 84, 18, "rgba(17, 22, 29, 0.82)", "rgba(255, 179, 63, 0.35)", 2);
  drawLabel("FIELD JUDGMENT", 182, 122, COLORS.hazard);
  drawSmallText("Hammer / Pull / Push / Stop", 182, 150);

  drawRoundedRect(780, 95, 270, 84, 18, "rgba(17, 22, 29, 0.82)", "rgba(255, 90, 95, 0.36)", 2);
  drawLabel("JAM ZONES", 802, 122, COLORS.danger);
  drawSmallText("Chain jam or hopper jam", 802, 150);
}

function drawStone(stone) {
  ctx.save();
  ctx.translate(stone.x, stone.y);

  if (stone.type === "round" || stone.type === "hard") {
    const gradient = ctx.createRadialGradient(-12, -16, 8, 0, 0, stone.r);
    gradient.addColorStop(0, stone.accent);
    gradient.addColorStop(1, stone.color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, stone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  if (stone.type === "angular") {
    ctx.fillStyle = stone.color;
    ctx.beginPath();
    ctx.moveTo(-44, 16);
    ctx.lineTo(-26, -36);
    ctx.lineTo(18, -44);
    ctx.lineTo(48, -10);
    ctx.lineTo(30, 38);
    ctx.lineTo(-16, 44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = stone.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-20, -22);
    ctx.lineTo(18, -44);
    ctx.lineTo(12, 18);
    ctx.stroke();
  }

  if (stone.type === "flat") {
    ctx.rotate(-0.08);
    drawRoundedRect(-stone.w / 2, -stone.h / 2, stone.w, stone.h, 18, stone.color, "rgba(0, 0, 0, 0.4)", 4);
    ctx.strokeStyle = stone.accent;
    ctx.lineWidth = 2;
    for (let y = -12; y <= 14; y += 12) {
      ctx.beginPath();
      ctx.moveTo(-44, y);
      ctx.lineTo(44, y - 6);
      ctx.stroke();
    }
  }

  if (stone.type === "layered") {
    ctx.fillStyle = stone.color;
    ctx.beginPath();
    ctx.arc(0, 0, stone.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = stone.accent;
    ctx.lineWidth = 3;
    for (let i = -28; i <= 28; i += 14) {
      ctx.beginPath();
      ctx.moveTo(-32, i + 18);
      ctx.lineTo(36, i - 18);
      ctx.stroke();
    }
  }

  ctx.restore();
  drawLabel(stone.label, stone.x - 30, stone.y + 74, COLORS.muted);
}

function drawLabel(text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "700 14px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "0.06em";
  ctx.fillText(text, x, y);
}

function drawSmallText(text, x, y) {
  ctx.fillStyle = COLORS.text;
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText(text, x, y);
}

function drawToolGhosts() {
  ctx.save();
  ctx.globalAlpha = 0.96;

  ctx.strokeStyle = COLORS.hazard;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(508, 142);
  ctx.lineTo(545, 210);
  ctx.stroke();

  ctx.fillStyle = "#3b4552";
  ctx.fillRect(492, 116, 62, 26);
  ctx.strokeStyle = "#8794a3";
  ctx.lineWidth = 3;
  ctx.strokeRect(492, 116, 62, 26);
  drawLabel("HAMMER", 474, 252, COLORS.hazard);

  ctx.strokeStyle = COLORS.accent2;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(690, 185, 36, -0.2, Math.PI * 1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(724, 196);
  ctx.lineTo(772, 226);
  ctx.stroke();
  drawLabel("PULL", 678, 252, COLORS.muted);

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSceneBackground();
  drawFeed();
  drawConveyor();
  drawHopperAndCrusher();
  stones.forEach(drawStone);
  drawOperatorHints();
  drawToolGhosts();
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

render();
setupToolButtons();
