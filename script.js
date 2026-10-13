'use strict';

const $ = id => document.getElementById(id);
const canvas = $('sim'), overlay = $('ui');
const ctx = canvas.getContext('2d'), uctx = overlay.getContext('2d');
const trailsEl = $('trails'), mergeEl = $('merge'), presetEl = $('preset');

const EPS2 = 16;
const TAU = Math.PI * 2;
const SKY = '#070a18';

let bodies = [], cam = { x: 0, y: 0, zoom: 1 };
let G = 1, speed = 1, mass = 100;
let running = true, dirty = true, stale = true;
let simTime = 0, pe = 0, E0 = null, fps = 60, drag = null, W = 0, H = 0;

const rand = (a, b) => a + Math.random() * (b - a);
const hue = h => `hsl(${h},85%,65%)`;
const radius = m => Math.max(1.5, Math.cbrt(m) * 0.9);

function addBody(x, y, vx, vy, m, color = hue(rand(0, 360))) {
  bodies.push({ x, y, vx, vy, ax: 0, ay: 0, m, r: radius(m), color });
  stale = dirty = true; E0 = null;
}

function accelerate() {
  let u = 0;
  for (const b of bodies) b.ax = b.ay = 0;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j], dx = b.x - a.x, dy = b.y - a.y;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + EPS2), f = G * inv * inv * inv;
      a.ax += f * b.m * dx; a.ay += f * b.m * dy;
      b.ax -= f * a.m * dx; b.ay -= f * a.m * dy;
      u -= G * a.m * b.m * inv;
    }
  }
  return u;
}

function step(dt) {
  for (const b of bodies) {
    b.vx += b.ax * dt / 2; b.vy += b.ay * dt / 2;
    b.x += b.vx * dt;      b.y += b.vy * dt;
  }
  pe = accelerate();
  for (const b of bodies) { b.vx += b.ax * dt / 2; b.vy += b.ay * dt / 2; }
}

function mergeCollisions() {
  for (let i = 0; i < bodies.length; i++) {
    for (let j = bodies.length - 1; j > i; j--) {
      const a = bodies[i], b = bodies[j], dx = a.x - b.x, dy = a.y - b.y, rr = (a.r + b.r) * 0.7;
      if (dx * dx + dy * dy > rr * rr) continue;
      const m = a.m + b.m;
      a.x = (a.x * a.m + b.x * b.m) / m;     a.y = (a.y * a.m + b.y * b.m) / m;
      a.vx = (a.vx * a.m + b.vx * b.m) / m;  a.vy = (a.vy * a.m + b.vy * b.m) / m;
      if (b.m > a.m) a.color = b.color;
      a.m = m; a.r = radius(m);
      bodies.splice(j, 1);
      stale = true; E0 = null;
    }
  }
}

const energy = () => bodies.reduce((e, b) => e + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy), pe);

function orbit(M, r, m, color, a = rand(0, TAU)) {
  const v = Math.sqrt(G * M / r);
  addBody(r * Math.cos(a), r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), m, color);
}

const presets = {
  solar() {
    addBody(0, 0, 0, 0, 20000, '#ffd166');
    [[100, 4, 25], [150, 10, 190], [210, 12, 140], [280, 8, 15], [370, 120, 35], [450, 80, 220]]
      .forEach(([r, m, h]) => orbit(20000, r, m, hue(h)));
  },
  binary() {
    const m = 8000, d = 140, v = Math.sqrt(G * m / (2 * d));
    addBody(-d / 2, 0, 0, -v, m, '#ffd166');
    addBody(d / 2, 0, 0, v, m, '#ff7b6b');
    for (let i = 0; i < 14; i++) orbit(2 * m, rand(380, 480), rand(2, 8), hue(rand(170, 280)));
  },
  figure8() {
    const L = 200, M = 6000, s = Math.sqrt(G * M / L);
    const p = [[-0.97000436, 0.24308753], [0.97000436, -0.24308753], [0, 0]];
    const v = [[0.46620369, 0.43236573], [0.46620369, 0.43236573], [-0.93240737, -0.86473146]];
    p.forEach((q, i) => addBody(q[0] * L, q[1] * L, v[i][0] * s, v[i][1] * s, M, hue(i * 120 + 20)));
  },
  galaxy() {
    const M = 30000;
    addBody(0, 0, 0, 0, M, '#ffd166');
    for (let i = 0; i < 250; i++) orbit(M, rand(70, 420), rand(0.5, 3), hue(rand(190, 280)));
    addBody(-650, -300, 7, 1.5, 8000, '#ff7b6b');
  },
  cluster() {
    for (let i = 0; i < 120; i++) {
      const a = rand(0, TAU), r = 260 * Math.sqrt(Math.random());
      addBody(r * Math.cos(a), r * Math.sin(a), rand(-4, 4), rand(-4, 4), rand(10, 80));
    }
  }
};

function load(name) {
  bodies = []; simTime = 0; E0 = null; stale = dirty = true;
  cam = { x: 0, y: 0, zoom: Math.min(1.2, Math.min(W, H) / 1000) };
  presets[name]();
  let M = 0, px = 0, py = 0;
  for (const b of bodies) { M += b.m; px += b.m * b.vx; py += b.m * b.vy; }
  for (const b of bodies) { b.vx -= px / M; b.vy -= py / M; }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  for (const c of [canvas, overlay]) {
    c.width = W * dpr; c.height = H * dpr;
    c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  dirty = true;
}

const toWorld = (sx, sy) => [(sx - W / 2) / cam.zoom + cam.x, (sy - H / 2) / cam.zoom + cam.y];

function draw() {
  ctx.shadowBlur = 0;
  ctx.fillStyle = trailsEl.checked && !dirty ? 'rgba(7,10,24,0.12)' : SKY;
  ctx.fillRect(0, 0, W, H);
  dirty = false;
  ctx.shadowBlur = 10;
  for (const b of bodies) {
    const x = (b.x - cam.x) * cam.zoom + W / 2, y = (b.y - cam.y) * cam.zoom + H / 2;
    ctx.fillStyle = ctx.shadowColor = b.color;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, b.r * cam.zoom), 0, TAU);
    ctx.fill();
  }
}

function drawPreview() {
  uctx.clearRect(0, 0, W, H);
  if (!drag || drag.pan) return;
  const r = Math.max(2, radius(mass) * cam.zoom);
  uctx.strokeStyle = '#8fd3ff'; uctx.lineWidth = 1.5;
  uctx.beginPath();
  uctx.moveTo(drag.sx, drag.sy); uctx.lineTo(drag.x, drag.y);
  uctx.moveTo(drag.sx + r, drag.sy); uctx.arc(drag.sx, drag.sy, r, 0, TAU);
  uctx.stroke();
}

function updateStats() {
  const e = energy();
  if (E0 === null && bodies.length > 1) E0 = e;
  const drift = E0 ? (e - E0) / Math.abs(E0) * 100 : 0;
  $('nBodies').textContent = bodies.length;
  $('tSim').textContent = simTime.toFixed(1);
  $('drift').textContent = drift.toFixed(3) + '%';
  $('fps').textContent = Math.round(fps);
}

let last = performance.now(), frame = 0;
function loop(now) {
  const elapsed = now - last; last = now;
  fps += (1000 / Math.max(elapsed, 1) - fps) * 0.05;
  if (stale) { pe = accelerate(); stale = false; }
  if (running) {
    const adv = Math.min(elapsed, 50) * 0.03 * speed;
    const n = Math.max(1, Math.ceil(adv / 0.05)), dt = adv / n;
    for (let i = 0; i < n; i++) step(dt);
    simTime += adv;
    if (mergeEl.checked) mergeCollisions();
  }
  if (running || dirty) draw();
  drawPreview();
  if (++frame % 10 === 0) updateStats();
  requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, pan: e.button !== 0 || e.shiftKey };
});
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  if (drag.pan) {
    cam.x -= (e.clientX - drag.x) / cam.zoom; cam.y -= (e.clientY - drag.y) / cam.zoom; dirty = true;
  }
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => {
  if (drag && !drag.pan) {
    const [wx, wy] = toWorld(drag.sx, drag.sy), k = 0.05 / cam.zoom;
    addBody(wx, wy, (drag.x - drag.sx) * k, (drag.y - drag.sy) * k, mass);
  }
  drag = null;
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const [wx, wy] = toWorld(e.clientX, e.clientY);
  cam.zoom = Math.min(8, Math.max(0.1, cam.zoom * Math.exp(-e.deltaY * 0.001)));
  cam.x = wx - (e.clientX - W / 2) / cam.zoom;
  cam.y = wy - (e.clientY - H / 2) / cam.zoom;
  dirty = true;
}, { passive: false });

function bind(id, set, fmt = String) {
  const el = $(id), out = el.previousElementSibling;
  const update = () => { set(+el.value); out.textContent = fmt(+el.value); };
  el.addEventListener('input', update); update();
}
bind('speed', v => speed = v, v => v.toFixed(1) + '×');
bind('gravity', v => { G = v; stale = true; E0 = null; }, v => v.toFixed(1));
bind('mass', v => mass = v);

$('play').onclick = () => { running = !running; $('play').textContent = running ? 'Pause' : 'Play'; };
$('reset').onclick = () => load(presetEl.value);
$('clear').onclick = () => { bodies = []; simTime = 0; E0 = null; dirty = true; };
presetEl.onchange = () => load(presetEl.value);
document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => b.blur()));
addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('play').click(); }
});
addEventListener('resize', resize);

resize();
load('solar');
requestAnimationFrame(loop);