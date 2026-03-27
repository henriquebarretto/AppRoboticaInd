// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════
let rotInputs = [{ angle: 90, axis: 'z' }];

/** @type {{ az: number, el: number, d: number }[]} */
let cameras = [];

/** @type {{ on: boolean, lx: number, ly: number }[]} */
let dragState = [];

// ═══════════════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════════════

/** Converts degrees to radians. */
const D2R = (a) => (a * Math.PI) / 180;

/** 3×3 rotation matrix around X axis. */
function rotX3(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[1, 0, 0], [0, c, -s], [0, s, c]];
}

/** 3×3 rotation matrix around Y axis. */
function rotY3(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
}

/** 3×3 rotation matrix around Z axis. */
function rotZ3(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/** Multiplies two 3×3 matrices. */
function mul3x3(A, B) {
  return A.map((row) =>
    [0, 1, 2].map((j) => row.reduce((sum, _, k) => sum + row[k] * B[k][j], 0))
  );
}

/** Multiplies a 4×4 matrix by a 4-component vector. */
function mulVec4(M, v) {
  return M.map((row) => row.reduce((sum, x, i) => sum + x * v[i], 0));
}

/** Builds a 4×4 homogeneous transform from a 3×3 rotation and translation. */
function buildT(R, tx, ty, tz) {
  return [
    [R[0][0], R[0][1], R[0][2], tx],
    [R[1][0], R[1][1], R[1][2], ty],
    [R[2][0], R[2][1], R[2][2], tz],
    [0, 0, 0, 1],
  ];
}

/** Adds two 3D vectors. */
function addV(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Scales a 3D vector by a scalar. */
function scaleV(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

// ── Formatters ──
const f4 = (x) => (Math.round(x * 10000) / 10000).toFixed(4);
const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
const fd = (x) => {
  const v = Math.round(x * 1000) / 1000;
  return (v >= 0 ? '+' : '') + v.toFixed(3);
};

/** Converts a hex color string to rgba() with the given alpha. */
function hexToRgba(hex, a) {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ═══════════════════════════════════════════════════
// RENDER INPUTS
// ═══════════════════════════════════════════════════

function renderRotInputs() {
  const list = document.getElementById('rot-list');
  list.innerHTML = '';

  rotInputs.forEach((r, i) => {
    const item = document.createElement('div');
    item.className = 'rot-item';
    item.innerHTML = `
      <span class="rot-badge">R${i + 1}</span>
      <label>ângulo</label>
      <input type="number" value="${r.angle}" step="any"
             oninput="rotInputs[${i}].angle = parseFloat(this.value) || 0">
      <label>eixo</label>
      <select onchange="rotInputs[${i}].axis = this.value">
        <option value="x" ${r.axis === 'x' ? 'selected' : ''}>X</option>
        <option value="y" ${r.axis === 'y' ? 'selected' : ''}>Y</option>
        <option value="z" ${r.axis === 'z' ? 'selected' : ''}>Z</option>
      </select>`;
    list.appendChild(item);
  });

  document.getElementById('btn-rm').disabled = rotInputs.length <= 1;
}

function addRot() {
  rotInputs.push({ angle: 0, axis: 'x' });
  renderRotInputs();
}

function removeRot() {
  if (rotInputs.length > 1) {
    rotInputs.pop();
    renderRotInputs();
  }
}

function resetAll() {
  rotInputs = [{ angle: 90, axis: 'z' }];
  renderRotInputs();
  document.getElementById('frames-strip').innerHTML = '';
  document.getElementById('matrices-row').style.display = 'none';
  cameras = [];
  dragState = [];
}

// ═══════════════════════════════════════════════════
// COMPUTE & BUILD FRAMES
// ═══════════════════════════════════════════════════

function compute() {
  const unit  = document.getElementById('unit').value;
  const toRad = unit === 'deg' ? D2R : (a) => a;

  const tx = parseFloat(document.getElementById('tx').value) || 0;
  const ty = parseFloat(document.getElementById('ty').value) || 0;
  const tz = parseFloat(document.getElementById('tz').value) || 0;
  const px = parseFloat(document.getElementById('px').value) || 0;
  const py = parseFloat(document.getElementById('py').value) || 0;
  const pz = parseFloat(document.getElementById('pz').value) || 0;

  // Build cumulative rotation sequence
  // frames[i] = { R: 3×3 matrix, label, axisFixed, rotDesc }
  const frames = [];

  frames.push({
    R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    label: 'Frame 0 — original',
    axisFixed: null,
    rotDesc: null,
  });

  let R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  rotInputs.forEach((ri, i) => {
    const a  = toRad(ri.angle);
    const Ri = ri.axis === 'x' ? rotX3(a) : ri.axis === 'y' ? rotY3(a) : rotZ3(a);
    R = mul3x3(R, Ri);

    const ang = `${ri.angle}${unit === 'deg' ? '°' : ' rad'}`;
    frames.push({
      R: R.map((row) => [...row]),
      label: `Frame ${i + 1}`,
      axisFixed: ri.axis,
      rotDesc: `R${i + 1}: ${ang} em ${ri.axis.toUpperCase()}`,
    });
  });

  const T    = buildT(R, tx, ty, tz);
  const Pout = mulVec4(T, [px, py, pz, 1]);

  buildFramePanels(frames, px, py, pz, Pout);
  buildMatricesRow(frames, rotInputs, T, px, py, pz, Pout, unit);
}

// ═══════════════════════════════════════════════════
// BUILD FRAME PANELS
// ═══════════════════════════════════════════════════

function buildFramePanels(frames, px, py, pz, Pout) {
  const strip = document.getElementById('frames-strip');
  strip.innerHTML = '';
  cameras   = [];
  dragState = [];

  const totalFrames = frames.length;
  const stripW      = strip.clientWidth || window.innerWidth - 320;
  const panelW      = Math.max(280, Math.min(360, Math.floor(stripW / totalFrames)));

  frames.forEach((fr, idx) => {
    cameras.push({ az: -0.55, el: 0.38, d: 5.5 });
    dragState.push({ on: false, lx: 0, ly: 0 });

    const panel = document.createElement('div');
    panel.className  = 'frame-panel';
    panel.style.width = panelW + 'px';

    const pillHTML = buildAxisPill(fr.axisFixed);

    panel.innerHTML = `
      <div class="frame-header">
        <span class="frame-n">${fr.label}</span>
        ${fr.rotDesc ? `<span class="frame-desc">${fr.rotDesc}</span>` : ''}
        ${pillHTML}
      </div>
      <div class="frame-canvas-wrap" id="wrap-${idx}">
        <canvas id="cv-${idx}"></canvas>
        <div class="frame-legend" id="leg-${idx}">
          <span style="color:var(--cx)">● X${idx > 0 ? "'" : ''}  eixo</span>
          <span style="color:var(--cy)">● Y${idx > 0 ? "'" : ''}  eixo</span>
          <span style="color:var(--cz)">● Z${idx > 0 ? "'" : ''}  eixo</span>
          <span style="color:var(--cp)">● P${idx === frames.length - 1 ? "'" : ''}  vetor</span>
        </div>
        <div class="frame-hint">arraste</div>
      </div>`;

    strip.appendChild(panel);

    requestAnimationFrame(() => {
      const wrap = document.getElementById('wrap-' + idx);
      const cv   = document.getElementById('cv-'   + idx);
      cv.width  = wrap.clientWidth  || panelW;
      cv.height = wrap.clientHeight || 300;
      drawFrame(idx, frames, px, py, pz, Pout);
      setupDrag(idx, frames, px, py, pz, Pout);
    });
  });
}

/** Returns the HTML for the axis pill badge, or empty string if no axis. */
function buildAxisPill(axisFixed) {
  if (!axisFixed) return '';
  const axColors = { x: 'color:var(--cx)', y: 'color:var(--cy)', z: 'color:var(--cz)' };
  return `<span class="pill fixed" style="${axColors[axisFixed]}">eixo ${axisFixed.toUpperCase()} fixo</span>`;
}

// ═══════════════════════════════════════════════════
// DRAW SINGLE FRAME
// ═══════════════════════════════════════════════════

function drawFrame(idx, frames, px, py, pz, Pout) {
  const cv = document.getElementById('cv-' + idx);
  if (!cv) return;

  const ctx = cv.getContext('2d');
  const W   = cv.width;
  const H   = cv.height;
  const cam = cameras[idx];
  if (!cam) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#080b12';
  ctx.fillRect(0, 0, W, H);

  const fr     = frames[idx];
  const isLast = idx === frames.length - 1;

  /** Projects a 3D world point to 2D canvas coordinates. */
  function proj([vx, vy, vz]) {
    const { az, el, d } = cam;
    const ax  =  vx * Math.cos(az) - vy * Math.sin(az);
    const ay  =  vx * Math.sin(az) + vy * Math.cos(az);
    const az2 = vz;
    const ex  = ax;
    const ey  = ay * Math.cos(el) - az2 * Math.sin(el);
    const ez  = ay * Math.sin(el) + az2 * Math.cos(el);
    const sc  = (d / (d + ey * 0.18)) * (Math.min(W, H) / 3.8);
    return [W / 2 + ex * sc, H / 2 - ez * sc];
  }

  const orig = proj([0, 0, 0]);
  const R    = fr.R;

  // Extract axis direction vectors from rotation matrix columns
  const xDir = [R[0][0], R[1][0], R[2][0]];
  const yDir = [R[0][1], R[1][1], R[2][1]];
  const zDir = [R[0][2], R[1][2], R[2][2]];

  drawGrid(ctx, proj, orig, xDir, zDir);
  drawGhostAxes(ctx, proj, orig, idx, frames);
  drawCurrentAxes(ctx, proj, orig, idx, frames.length, xDir, yDir, zDir, fr.axisFixed);
  drawPositionVectors(ctx, proj, orig, idx, frames, px, py, pz, Pout, isLast);

  // Origin dot
  ctx.beginPath();
  ctx.arc(...orig, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
}

/** Draws the reference grid on the XZ plane of the current frame. */
function drawGrid(ctx, proj, orig, xDir, zDir) {
  const gridN = 4;
  ctx.strokeStyle = 'rgba(90,110,200,0.07)';
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 5]);

  for (let i = -gridN; i <= gridN; i++) {
    const a  = proj(addV(scaleV(xDir, -gridN), scaleV(zDir, i)));
    const b  = proj(addV(scaleV(xDir,  gridN), scaleV(zDir, i)));
    const c  = proj(addV(scaleV(zDir, -gridN), scaleV(xDir, i)));
    const dd = proj(addV(scaleV(zDir,  gridN), scaleV(xDir, i)));

    ctx.beginPath(); ctx.moveTo(...a);  ctx.lineTo(...b);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(...c);  ctx.lineTo(...dd); ctx.stroke();
  }

  ctx.setLineDash([]);
}

/** Draws faded ghost axes from the previous frame (if applicable). */
function drawGhostAxes(ctx, proj, orig, idx, frames) {
  if (idx === 0) return;

  const prev = frames[idx - 1];
  const pxD  = [prev.R[0][0], prev.R[1][0], prev.R[2][0]];
  const pyD  = [prev.R[0][1], prev.R[1][1], prev.R[2][1]];
  const pzD  = [prev.R[0][2], prev.R[1][2], prev.R[2][2]];

  drawAxis(ctx, proj, orig, pxD, 'rgba(255,85,113,0.18)', '', 1.8, 7);
  drawAxis(ctx, proj, orig, pyD, 'rgba(61,221,122,0.18)', '', 1.8, 7);
  drawAxis(ctx, proj, orig, pzD, 'rgba(74,157,255,0.18)', '', 1.8, 7);
}

/** Draws the three current frame axes with labels. */
function drawCurrentAxes(ctx, proj, orig, idx, totalFrames, xDir, yDir, zDir, fixedAxis) {
  const prime = idx > 0 ? "'" : '';
  const axLen = 2.0;

  drawAxisFull(ctx, proj, orig, xDir, '#ff5571', `X${prime}`, axLen, fixedAxis === 'x');
  drawAxisFull(ctx, proj, orig, yDir, '#3ddd7a', `Y${prime}`, axLen, fixedAxis === 'y');
  drawAxisFull(ctx, proj, orig, zDir, '#4a9dff', `Z${prime}`, axLen, fixedAxis === 'z');
}

/** Draws the position vectors (P and/or P') depending on the frame index. */
function drawPositionVectors(ctx, proj, orig, idx, frames, px, py, pz, Pout, isLast) {
  const pWorld  = [px, py, pz];
  const pPrime  = [Pout[0], Pout[1], Pout[2]];
  const pLabel  = `P(${f3(px)},${f3(py)},${f3(pz)})`;
  const ppLabel = `P'(${f3(pPrime[0])},${f3(pPrime[1])},${f3(pPrime[2])})`;

  if (idx === 0) {
    drawVector(ctx, proj, orig, pWorld, '#ffd84d', 'rgba(255,216,77,.5)', pLabel);
  } else if (isLast) {
    drawVectorGhost(ctx, proj, orig, pWorld, 'rgba(255,216,77,0.25)', '');
    drawVector(ctx, proj, orig, pPrime, '#ffd84d', 'rgba(255,216,77,.6)', ppLabel);
  } else {
    drawVectorGhost(ctx, proj, orig, pWorld, 'rgba(255,216,77,0.3)', 'P');
  }
}

// ═══════════════════════════════════════════════════
// DRAW HELPERS
// ═══════════════════════════════════════════════════

/** Draws a line with an arrowhead from (x1,y1) to (x2,y2). */
function arrowTo(ctx, x1, y1, x2, y2, col, lw, ah) {
  ctx.strokeStyle = col;
  ctx.lineWidth   = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  const dx = x2 - x1, dy = y2 - y1;
  const ln = Math.sqrt(dx * dx + dy * dy);
  if (ln < 1) return;

  const ux = dx / ln, uy = dy / ln;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ah * ux + ah * 0.32 * (-uy), y2 - ah * uy + ah * 0.32 * ux);
  ctx.lineTo(x2 - ah * ux - ah * 0.32 * (-uy), y2 - ah * uy - ah * 0.32 * ux);
  ctx.closePath();
  ctx.fill();
}

/** Draws a simple axis arrow (no dashed negative half). */
function drawAxis(ctx, proj, orig, dir, col, lbl, len, arrowSize) {
  const end = proj([dir[0] * len, dir[1] * len, dir[2] * len]);
  arrowTo(ctx, orig[0], orig[1], end[0], end[1], col, 1.2, arrowSize || 7);

  if (lbl) {
    ctx.font      = '10px JetBrains Mono, monospace';
    ctx.fillStyle = col;
    ctx.fillText(lbl, end[0] + 5, end[1] + 4);
  }
}

/** Draws a full axis with dashed negative half, label and optional fixed-axis ring. */
function drawAxisFull(ctx, proj, orig, dir, col, lbl, len, isFixed) {
  // Dashed negative half
  const neg = proj([-dir[0] * len * 0.4, -dir[1] * len * 0.4, -dir[2] * len * 0.4]);
  ctx.strokeStyle = hexToRgba(col, 0.22);
  ctx.lineWidth   = 0.8;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(...orig);
  ctx.lineTo(...neg);
  ctx.stroke();
  ctx.setLineDash([]);

  // Main axis arrow
  const end = proj([dir[0] * len, dir[1] * len, dir[2] * len]);
  arrowTo(ctx, orig[0], orig[1], end[0], end[1], col, isFixed ? 2.5 : 1.8, 10);

  // Fixed-axis ring decoration
  if (isFixed) {
    ctx.beginPath();
    ctx.arc(orig[0], orig[1], 5, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Label
  ctx.font      = `${isFixed ? '500' : '400'} 11px JetBrains Mono, monospace`;
  ctx.fillStyle = col;
  ctx.fillText(lbl, end[0] + 6, end[1] + 4);
}

/** Draws a bright position vector with glow, shadow on XZ plane, and label. */
function drawVector(ctx, proj, orig, v, col, glowCol, lbl) {
  const tip = proj(v);
  const sh  = proj([v[0], 0, v[2]]);

  // Shadow projection on XZ plane
  ctx.strokeStyle = hexToRgba(col, 0.1);
  ctx.setLineDash([2, 4]);
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(...orig); ctx.lineTo(...sh);  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(...sh);   ctx.lineTo(...tip); ctx.stroke();
  ctx.setLineDash([]);

  // Main glowing arrow
  ctx.shadowColor = glowCol;
  ctx.shadowBlur  = 12;
  arrowTo(ctx, orig[0], orig[1], tip[0], tip[1], col, 2.2, 11);
  ctx.shadowBlur = 0;

  // Tip dot
  ctx.beginPath(); ctx.arc(tip[0], tip[1], 5, 0, Math.PI * 2);
  ctx.fillStyle = glowCol; ctx.fill();
  ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.5, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill();

  // Label
  ctx.font      = '500 10px JetBrains Mono, monospace';
  ctx.fillStyle = col;
  ctx.fillText(lbl, tip[0] + 8, tip[1] - 6);
}

/** Draws a faded/ghost vector with dashed line. */
function drawVectorGhost(ctx, proj, orig, v, col, lbl) {
  const tip = proj(v);
  ctx.strokeStyle = col;
  ctx.lineWidth   = 1.2;
  ctx.setLineDash([3, 4]);
  ctx.beginPath(); ctx.moveTo(...orig); ctx.lineTo(...tip); ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath(); ctx.arc(tip[0], tip[1], 3, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.fill();

  if (lbl) {
    ctx.font      = '9px JetBrains Mono, monospace';
    ctx.fillStyle = col;
    ctx.fillText(lbl, tip[0] + 6, tip[1] - 4);
  }
}

// ═══════════════════════════════════════════════════
// DRAG & CAMERA SETUP
// ═══════════════════════════════════════════════════

function setupDrag(idx, frames, px, py, pz, Pout) {
  const cv = document.getElementById('cv-' + idx);
  if (!cv) return;

  const redraw = () => drawFrame(idx, frames, px, py, pz, Pout);

  const onMouseDown = (e) => {
    dragState[idx].on = true;
    dragState[idx].lx = e.clientX;
    dragState[idx].ly = e.clientY;
  };

  const onMouseUp    = () => { dragState[idx].on = false; };
  const onMouseLeave = () => { dragState[idx].on = false; };

  const onMouseMove = (e) => {
    if (!dragState[idx]?.on) return;
    cameras[idx].az += (e.clientX - dragState[idx].lx) * 0.009;
    cameras[idx].el  = Math.max(-1.4, Math.min(1.4,
      cameras[idx].el + (e.clientY - dragState[idx].ly) * 0.009));
    dragState[idx].lx = e.clientX;
    dragState[idx].ly = e.clientY;
    redraw();
  };

  const onWheel = (e) => {
    cameras[idx].d = Math.max(2, Math.min(14, cameras[idx].d + e.deltaY * 0.01));
    redraw();
    e.preventDefault();
  };

  const onTouchStart = (e) => {
    dragState[idx].on = true;
    dragState[idx].lx = e.touches[0].clientX;
    dragState[idx].ly = e.touches[0].clientY;
  };

  const onTouchEnd = () => { dragState[idx].on = false; };

  const onTouchMove = (e) => {
    if (!dragState[idx].on) return;
    cameras[idx].az += (e.touches[0].clientX - dragState[idx].lx) * 0.009;
    cameras[idx].el  = Math.max(-1.4, Math.min(1.4,
      cameras[idx].el + (e.touches[0].clientY - dragState[idx].ly) * 0.009));
    dragState[idx].lx = e.touches[0].clientX;
    dragState[idx].ly = e.touches[0].clientY;
    redraw();
    e.preventDefault();
  };

  cv.addEventListener('mousedown',  onMouseDown);
  cv.addEventListener('mouseup',    onMouseUp);
  cv.addEventListener('mouseleave', onMouseLeave);
  cv.addEventListener('mousemove',  onMouseMove);
  cv.addEventListener('wheel',      onWheel, { passive: false });
  cv.addEventListener('touchstart', onTouchStart);
  cv.addEventListener('touchend',   onTouchEnd);
  cv.addEventListener('touchmove',  onTouchMove, { passive: false });
}

// ═══════════════════════════════════════════════════
// MATRICES ROW
// ═══════════════════════════════════════════════════

function buildMatricesRow(frames, rotInputs, T, px, py, pz, Pout, unit) {
  const row = document.getElementById('matrices-row');
  row.style.display = 'flex';
  row.innerHTML     = '';

  let Rcum = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  // Individual rotation matrices
  rotInputs.forEach((ri, i) => {
    const toRad = unit === 'deg' ? D2R : (a) => a;
    const a     = toRad(ri.angle);
    const Ri    = ri.axis === 'x' ? rotX3(a) : ri.axis === 'y' ? rotY3(a) : rotZ3(a);
    Rcum        = mul3x3(Rcum, Ri);

    const ang = `${ri.angle}${unit === 'deg' ? '°' : ' rad'}`;

    const block = document.createElement('div');
    block.className = 'mat-block';
    block.innerHTML = `<div class="mat-name">R${i + 1} — ${ang} em ${ri.axis.toUpperCase()}</div>
                       ${matHTML(Ri, 'accent')}`;
    row.appendChild(block);

    if (i < rotInputs.length - 1) {
      row.appendChild(createSep('·'));
    }
  });

  // Resultant rotation matrix
  row.appendChild(createSep('='));
  const rBlock = document.createElement('div');
  rBlock.className = 'mat-block';
  rBlock.innerHTML = `<div class="mat-name">R resultante</div>${matHTML(Rcum, '')}`;
  row.appendChild(rBlock);

  // Homogeneous transform
  row.appendChild(createSep('→', '0 8px'));
  const tBlock = document.createElement('div');
  tBlock.className = 'mat-block';
  tBlock.innerHTML = `<div class="mat-name">T homogênea (4×4)</div>${matHomHTML(T)}`;
  row.appendChild(tBlock);

  // Result vector T·P
  row.appendChild(createSep('→', '0 8px'));
  row.appendChild(buildVecCompareBlock(px, py, pz, Pout));
}

/** Creates a separator element with the given symbol. */
function createSep(symbol, margin = null) {
  const sep = document.createElement('div');
  sep.className   = 'mat-sep';
  sep.textContent = symbol;
  if (margin) sep.style.margin = margin;
  return sep;
}

/** Builds the T·P result block showing before/after comparison. */
function buildVecCompareBlock(px, py, pz, Pout) {
  const axes   = ['x', 'y', 'z'];
  const before = [px, py, pz];
  const after  = [Pout[0], Pout[1], Pout[2]];
  const colors = ['var(--cx)', 'var(--cy)', 'var(--cz)'];

  const rows = axes.map((ax, i) => {
    const d   = after[i] - before[i];
    const dc  = Math.abs(d) < 5e-4 ? 'zero' : d > 0 ? 'pos' : 'neg';
    return `<div class="vc-row">
      <span class="vc-label" style="color:${colors[i]};">P${ax.toUpperCase()}</span>
      <span class="vc-val ini">${f3(before[i])}</span>
      <span class="vc-val out">${f3(after[i])}</span>
      <span class="vc-delta ${dc}">${fd(d)}</span>
    </div>`;
  }).join('');

  const normBefore = Math.sqrt(px ** 2 + py ** 2 + pz ** 2);
  const normAfter  = Math.sqrt(Pout[0] ** 2 + Pout[1] ** 2 + Pout[2] ** 2);

  const block = document.createElement('div');
  block.className = 'mat-block';
  block.innerHTML = `
    <div class="mat-name">T · P</div>
    <div class="vec-compare">
      <div class="vc-row">
        <span class="vc-label" style="font-size:8px;color:var(--muted);">componente</span>
        <span class="vc-val"   style="color:var(--muted);">antes</span>
        <span class="vc-val"   style="color:var(--muted);">depois</span>
        <span class="vc-delta" style="color:var(--muted);">Δ</span>
      </div>
      ${rows}
      <div class="vc-row" style="border-top:0.5px solid var(--brd);padding-top:4px;margin-top:2px;">
        <span class="vc-label" style="color:var(--muted);">‖P‖</span>
        <span class="vc-val ini">${f3(normBefore)}</span>
        <span class="vc-val out">${f3(normAfter)}</span>
        <span class="vc-delta zero">—</span>
      </div>
    </div>`;
  return block;
}

/** Renders a 3×3 matrix as an HTML table. */
function matHTML(M, cls) {
  const rows = M.map(
    (row) => `<tr>${row.map((v) => `<td>${f4(v)}</td>`).join('')}</tr>`
  ).join('');
  return `<table class="mat ${cls}">${rows}</table>`;
}

/** Renders a 4×4 homogeneous matrix as an HTML table with color highlights. */
function matHomHTML(T) {
  const rows = T.map((row, ri) =>
    `<tr>${row.map((v, ci) => {
      let style = '';
      if (ci === 3 && ri < 3) style = ' style="color:var(--cp);"';
      if (ri === 3)           style = ' style="color:var(--muted);"';
      return `<td${style}>${f4(v)}</td>`;
    }).join('')}</tr>`
  ).join('');
  return `<table class="mat gold">${rows}</table>`;
}

// ═══════════════════════════════════════════════════
// RESIZE HANDLER
// ═══════════════════════════════════════════════════

window.addEventListener('resize', () => {
  const strip = document.getElementById('frames-strip');
  if (!strip.children.length) return;

  document.querySelectorAll('.frame-canvas-wrap').forEach((wrap) => {
    const cv = wrap.querySelector('canvas');
    if (cv) {
      cv.width  = wrap.clientWidth;
      cv.height = wrap.clientHeight;
    }
  });

  if (strip.children.length) compute();
});

// ═══════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════
renderRotInputs();
