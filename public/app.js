const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const HUD = {
  time: document.getElementById("timeValue"),
  tons: document.getElementById("tonsValue"),
  jam: document.getElementById("jamValue"),
};

const COLORS = {
  skyTop: "#e4c087",
  skyBottom: "#ad7f4a",
  haze: "rgba(233, 202, 151, 0.45)",
  ground: "#8f6b43",
  rubble: "#6e5335",
  steel: "#6b5440",
  steelDark: "#473727",
  steelLight: "#87684a",
  rust: "#8f4b2e",
  chain: "#34281e",
  chainLink: "#7e6244",
  hazard: "#be7d33",
  pull: "#b9935d",
  danger: "#8e3926",
  text: "#3c2a1a",
  muted: "#5b4330",
  dust: "rgba(108, 86, 55, 0.32)",
};

const stones = [
  { label: "Round", type: "round", x: 185, y: 366, r: 36, color: "#8e7b63", accent: "#b9a88e" },
  { label: "Angular", type: "angular", x: 360, y: 355, r: 45, color: "#71614f", accent: "#a08a70" },
  { label: "Flat", type: "flat", x: 565, y: 366, w: 124, h: 42, color: "#76634f", accent: "#9f8668" },
  { label: "Layered", type: "layered", x: 740, y: 356, r: 47, color: "#85715d", accent: "#b39a78" },
  { label: "Hard", type: "hard", x: 930, y: 342, r: 52, color: "#4f4b45", accent: "#7f7c75" },
];

function rr(x,y,w,h,r,fill,stroke=null,lw=1){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, 440);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rr(40, 60, 1120, 150, 50, COLORS.haze);
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 430, canvas.width, 190);
  for (let i = 0; i < 140; i += 1) {
    const x = (i * 83) % canvas.width;
    const y = 420 + ((i * 29) % 190);
    const r = 1 + (i % 5);
    ctx.fillStyle = i % 3 ? COLORS.rubble : "#9b7751";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawConveyor() {
  rr(82, 374, 730, 58, 14, COLORS.chain, COLORS.steelLight, 2);
  rr(70, 402, 755, 16, 6, COLORS.steelDark);
  for (let x = 105; x < 790; x += 42) rr(x, 390, 28, 18, 5, "#4d3b2b", COLORS.chainLink, 2);
  for (let x = 90; x < 785; x += 72) { ctx.fillStyle = COLORS.hazard; ctx.fillRect(x, 434, 32, 8); }
  label("CHAIN CATCH ZONE", 320, 466, COLORS.muted);
}

function drawFeed() {
  rr(34, 250, 136, 180, 14, COLORS.steel, COLORS.steelLight, 3);
  rr(58, 286, 88, 84, 10, COLORS.steelDark, COLORS.steelLight, 2);
  label("STONE FEED", 52, 236, COLORS.muted);
}

function drawHopperCrusher() {
  ctx.fillStyle = COLORS.steel;
  ctx.strokeStyle = COLORS.steelLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(768, 255);ctx.lineTo(1038, 255);ctx.lineTo(963, 424);ctx.lineTo(828, 424);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle = COLORS.steelDark;
  ctx.beginPath();ctx.moveTo(826, 300);ctx.lineTo(976, 300);ctx.lineTo(935, 403);ctx.lineTo(865, 403);ctx.closePath();ctx.fill();
  rr(948, 314, 206, 148, 18, "#5f4a37", COLORS.steelLight, 4);
  rr(986, 348, 130, 78, 12, "#3f3023", "#7a5d41", 2);
  label("HOPPER THROAT JAM", 828, 244, COLORS.danger);
  label("CRUSHER", 995, 490, COLORS.muted);
}

function drawStone(stone) {
  ctx.save();ctx.translate(stone.x, stone.y);
  if (stone.type === "round" || stone.type === "hard") { const g = ctx.createRadialGradient(-10,-14,8,0,0,stone.r);g.addColorStop(0,stone.accent);g.addColorStop(1,stone.color);ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,stone.r,0,Math.PI*2);ctx.fill(); }
  if (stone.type === "angular") { ctx.fillStyle=stone.color;ctx.beginPath();ctx.moveTo(-46,18);ctx.lineTo(-28,-38);ctx.lineTo(16,-46);ctx.lineTo(50,-12);ctx.lineTo(29,40);ctx.lineTo(-16,43);ctx.closePath();ctx.fill(); }
  if (stone.type === "flat") { ctx.rotate(-0.1); rr(-stone.w/2,-stone.h/2,stone.w,stone.h,8,stone.color,"#4b3a2a",3); }
  if (stone.type === "layered") { ctx.fillStyle=stone.color;ctx.beginPath();ctx.arc(0,0,stone.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=stone.accent;ctx.lineWidth=3;for(let i=-26;i<=26;i+=13){ctx.beginPath();ctx.moveTo(-31,i+16);ctx.lineTo(33,i-17);ctx.stroke();} }
  ctx.strokeStyle = "rgba(45,32,22,0.66)";ctx.lineWidth = 4;ctx.stroke();ctx.restore();
  label(stone.label, stone.x - 26, stone.y + 74, COLORS.muted);
}

function label(t,x,y,c){ctx.fillStyle=c;ctx.font="700 14px Noto Sans JP, sans-serif";ctx.fillText(t,x,y);}

function drawHints(){
  rr(150, 88, 292, 90, 8, "rgba(80,57,34,0.85)", "rgba(142,57,38,0.6)", 2);
  label("FIELD INTERVENTION", 172, 116, "#e4bd79");
  label("Hammer / Hook / Push / Stop", 172, 146, "#f1d7ad");
}

function render(){ctx.clearRect(0,0,canvas.width,canvas.height);drawBackground();drawFeed();drawConveyor();drawHopperCrusher();stones.forEach(drawStone);drawHints();}
function setupToolButtons(){document.querySelectorAll('.tool-button').forEach((b)=>{b.addEventListener('click',()=>{document.querySelectorAll('.tool-button').forEach((i)=>i.classList.remove('active'));b.classList.add('active');HUD.jam.textContent=b.dataset.tool.toUpperCase();});});}
render();setupToolButtons();
