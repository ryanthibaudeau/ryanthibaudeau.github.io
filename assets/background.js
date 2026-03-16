(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement || document.body;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const W = () => canvas.width;
  const H = () => canvas.height;

  const stars = Array.from({ length: 200 }, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 1.2 + 0.2,
    alpha: Math.random() * 0.55 + 0.15,
    twinkle: Math.random() * Math.PI * 2
  }));

  const orbitals = [
    { cx: 0.72, cy: 0.38, rx: 0.22, ry: 0.09, tilt: -20, color: '#3dd6f5', alpha: 0.10, dash: [6, 12] },
    { cx: 0.72, cy: 0.38, rx: 0.34, ry: 0.14, tilt: -20, color: '#3dd6f5', alpha: 0.07, dash: [3, 9] },
    { cx: 0.72, cy: 0.38, rx: 0.48, ry: 0.20, tilt: -20, color: '#3dd6f5', alpha: 0.04, dash: [2, 14] },
    { cx: 0.18, cy: 0.70, rx: 0.18, ry: 0.07, tilt: 12,  color: '#e85d26', alpha: 0.08, dash: [4, 10] },
    { cx: 0.18, cy: 0.70, rx: 0.30, ry: 0.12, tilt: 12,  color: '#e85d26', alpha: 0.05, dash: [2, 8]  },
  ];

  const satellites = [
    { orbit: 0, t: 0,   speed: 0.0009, r: 2.5, color: '#3dd6f5' },
    { orbit: 1, t: 1.8, speed: 0.0006, r: 2.0, color: '#3dd6f5' },
    { orbit: 2, t: 3.5, speed: 0.0004, r: 1.5, color: '#3dd6f5' },
    { orbit: 3, t: 0,   speed: 0.0013, r: 2.5, color: '#e85d26' },
    { orbit: 4, t: 2.4, speed: 0.0008, r: 1.8, color: '#f5a623' },
  ];

  const arcs = [
    { x1: 0.02, y1: 0.92, cx: 0.18, cy: 0.08, x2: 0.58, y2: 0.32, color: '#e85d26', alpha: 0.14 },
    { x1: 0.08, y1: 0.95, cx: 0.32, cy: 0.04, x2: 0.74, y2: 0.28, color: '#f5a623', alpha: 0.08 },
    { x1: 0.92, y1: 0.88, cx: 0.72, cy: 0.06, x2: 0.28, y2: 0.38, color: '#3dd6f5', alpha: 0.10 },
    { x1: 0.50, y1: 0.98, cx: 0.62, cy: 0.12, x2: 0.82, y2: 0.42, color: '#e85d26', alpha: 0.07 },
  ];

  function drawGrid(w, h) {
    ctx.strokeStyle = 'rgba(61,214,245,0.022)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    const gs = 60;
    for (let x = 0; x < w; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  function ellipsePoint(o, t, w, h) {
    const cos = Math.cos(o.tilt * Math.PI / 180);
    const sin = Math.sin(o.tilt * Math.PI / 180);
    const ex = o.rx * w * Math.cos(t);
    const ey = o.ry * h * Math.sin(t);
    return {
      x: o.cx * w + ex * cos - ey * sin,
      y: o.cy * h + ex * sin + ey * cos
    };
  }

  function drawEllipse(o, w, h, dashOffset) {
    ctx.save();
    ctx.translate(o.cx * w, o.cy * h);
    ctx.rotate(o.tilt * Math.PI / 180);
    ctx.strokeStyle = o.color;
    ctx.globalAlpha = o.alpha;
    ctx.lineWidth = 0.8;
    ctx.setLineDash(o.dash);
    ctx.lineDashOffset = -dashOffset;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.rx * w, o.ry * h, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawArrowTip(x, y, angle, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 2;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(-7, -3.5); ctx.lineTo(0, 0); ctx.lineTo(-7, 3.5);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  let frame = 0;

  function draw() {
    const w = W(), h = H();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#080c10';
    ctx.fillRect(0, 0, w, h);

    drawGrid(w, h);

    // Stars
    stars.forEach(s => {
      const twink = 0.55 + 0.45 * Math.sin(s.twinkle + frame * 0.007);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,216,232,${s.alpha * twink})`;
      ctx.fill();
    });

    // Trajectory arcs
    arcs.forEach(a => {
      ctx.beginPath();
      ctx.moveTo(a.x1 * w, a.y1 * h);
      ctx.quadraticCurveTo(a.cx * w, a.cy * h, a.x2 * w, a.y2 * h);
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = a.alpha;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      const dx = a.x2 * w - a.cx * w, dy = a.y2 * h - a.cy * h;
      drawArrowTip(a.x2 * w, a.y2 * h, Math.atan2(dy, dx), a.color, a.alpha);
    });

    // Orbital rings
    const dashOff = frame * 0.14;
    orbitals.forEach(o => drawEllipse(o, w, h, dashOff));
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Satellites
    satellites.forEach(s => {
      s.t += s.speed;
      const o = orbitals[s.orbit];
      const pt = ellipsePoint(o, s.t, w, h);
      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, s.r * 6);
      g.addColorStop(0, s.color + 'bb');
      g.addColorStop(1, s.color + '00');
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, s.r * 6, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Primary body (cyan)
    const px = 0.72 * w, py = 0.38 * h;
    const pg = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 18);
    pg.addColorStop(0, 'rgba(61,214,245,0.35)');
    pg.addColorStop(1, 'rgba(61,214,245,0.03)');
    ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = pg; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3dd6f5'; ctx.globalAlpha = 0.85; ctx.fill();
    ctx.globalAlpha = 1;

    // Secondary body (orange)
    const bx = 0.18 * w, by = 0.70 * h;
    const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 12);
    bg2.addColorStop(0, 'rgba(232,93,38,0.3)');
    bg2.addColorStop(1, 'rgba(232,93,38,0.0)');
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fillStyle = bg2; ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#e85d26'; ctx.globalAlpha = 0.75; ctx.fill();
    ctx.globalAlpha = 1;

    frame++;
    requestAnimationFrame(draw);
  }

  draw();
})();
