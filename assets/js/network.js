/* The relationship graph: users, roles and licenses drawn as a tangle that
   resolves into three license tiers when the section comes into view.
   Canvas 2D, ~150 nodes and ~240 edges, seeded so it looks the same on every
   visit. Nodes are fictional. */
(function () {
  'use strict';
  const canvas = document.getElementById('network');
  if (!canvas) return;
  const stage = canvas.parentElement;
  const tip = document.getElementById('network-tip');
  const button = document.getElementById('untangle');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TIERS = [
    { key: 'A', label: 'Advanced', color: '#e3b95e', share: 0.22 },
    { key: 'C', label: 'Core', color: '#4fb6e8', share: 0.36 },
    { key: 'S', label: 'Self-Service', color: '#35c48f', share: 0.42 },
  ];
  const UNUSED = { label: 'No recorded usage', color: '#6b7a8c' };
  const N = 150;
  const UNUSED_SHARE = 0.12;

  let seed = 20260920;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  const nodes = [];
  const edges = [];
  let W = 0, H = 0, dpr = 1;
  let progress = 0, from = 0, target = 0, animStart = 0;
  const DURATION = 1700;
  let hovered = -1;
  let visible = false, running = false, played = false;

  // Build the population once; positions are laid out on resize.
  for (let i = 0; i < N; i++) {
    const r = rnd();
    const tier = r < TIERS[0].share ? 0 : r < TIERS[0].share + TIERS[1].share ? 1 : 2;
    nodes.push({
      id: 1000 + Math.floor(rnd() * 9000),
      tier,
      unused: rnd() < UNUSED_SHARE,
      roles: 2 + Math.floor(rnd() * 14),
      size: 3 + rnd() * 3,
      phase: rnd() * Math.PI * 2,
      tx: 0, ty: 0, ox: 0, oy: 0,
    });
  }
  // Edges: mostly long, crossing links in the tangle; some within a tier.
  for (let i = 0; i < 240; i++) {
    const a = Math.floor(rnd() * N);
    let b = Math.floor(rnd() * N);
    if (a === b) b = (b + 7) % N;
    edges.push([a, b]);
  }

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function layout() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(360, Math.round(canvas.getBoundingClientRect().height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 640;
    const centers = narrow
      ? [[W * 0.5, H * 0.2], [W * 0.5, H * 0.46], [W * 0.5, H * 0.72]]
      : [[W * 0.22, H * 0.46], [W * 0.5, H * 0.46], [W * 0.78, H * 0.46]];
    const blob = narrow ? Math.min(W, H) * 0.14 : Math.min(W * 0.11, H * 0.22);
    const parkedY = narrow ? H * 0.9 : H * 0.86;
    const counts = [0, 0, 0];
    let parked = 0;
    const parkedTotal = nodes.filter((n) => n.unused).length;

    let s = 99;
    const r2 = () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
    nodes.forEach((n) => {
      n.tx = 40 + r2() * (W - 80);
      n.ty = 40 + r2() * (H - 110);
      if (n.unused) {
        const span = narrow ? W * 0.7 : W * 0.5;
        n.ox = (W - span) / 2 + (parked / Math.max(1, parkedTotal - 1)) * span;
        n.oy = parkedY + (parked % 2 ? 6 : -6);
        parked++;
      } else {
        const [cx, cy] = centers[n.tier];
        const angle = r2() * Math.PI * 2;
        const radius = Math.sqrt(r2()) * blob;
        n.ox = cx + Math.cos(angle) * radius * 1.3;
        n.oy = cy + Math.sin(angle) * radius;
        counts[n.tier]++;
      }
    });
    layout.centers = centers;
    layout.blob = blob;
    layout.parkedY = parkedY;
    layout.narrow = narrow;
  }

  function position(n, t, p) {
    const drift = reducedMotion ? 0 : 2.2;
    const dx = Math.sin(t * 0.55 + n.phase) * drift;
    const dy = Math.cos(t * 0.45 + n.phase * 1.3) * drift;
    return [n.tx + (n.ox - n.tx) * p + dx, n.ty + (n.oy - n.ty) * p + dy];
  }

  function draw(now) {
    const t = now / 1000;
    if (animStart) {
      const k = Math.min(1, (now - animStart) / DURATION);
      progress = from + (target - from) * easeInOut(k);
      if (k >= 1) animStart = 0;
    }
    const p = progress;
    ctx.clearRect(0, 0, W, H);

    const pos = nodes.map((n) => position(n, t, p));

    // Edges
    ctx.lineWidth = 1;
    edges.forEach(([a, b], i) => {
      const na = nodes[a], nb = nodes[b];
      const sameTier = na.tier === nb.tier && !na.unused && !nb.unused;
      const involvesHover = hovered >= 0 && (a === hovered || b === hovered);
      let alpha = 0.16 * (1 - p) + (sameTier ? 0.22 : 0.025) * p;
      if (hovered >= 0) alpha = involvesHover ? 0.85 : alpha * 0.25;
      ctx.strokeStyle = involvesHover ? '#ffffff' : `rgba(159, 212, 240, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(pos[a][0], pos[a][1]);
      ctx.lineTo(pos[b][0], pos[b][1]);
      ctx.stroke();
    });

    // Nodes
    nodes.forEach((n, i) => {
      const [x, y] = pos[i];
      const tierColor = TIERS[n.tier].color;
      const color = n.unused ? mix(tierColor, UNUSED.color, p) : tierColor;
      const r = n.size * (i === hovered ? 1.6 : 1);
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, i === hovered ? 0.35 : 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Cluster labels fade in as the tiers resolve.
    const labelAlpha = Math.max(0, (p - 0.6) / 0.4);
    if (labelAlpha > 0) {
      ctx.textAlign = 'center';
      ctx.font = '700 12px Inter, system-ui, sans-serif';
      TIERS.forEach((tier, i) => {
        const [cx, cy] = layout.centers[i];
        const count = nodes.filter((n) => n.tier === i && !n.unused).length;
        const yLabel = layout.narrow ? cy - layout.blob - 10 : cy + layout.blob + 26;
        ctx.fillStyle = hexToRgba(tier.color, labelAlpha);
        ctx.fillText(tier.label.toUpperCase(), cx, yLabel);
        ctx.fillStyle = `rgba(159, 178, 197, ${labelAlpha})`;
        ctx.font = '500 12px Inter, system-ui, sans-serif';
        ctx.fillText(`${count} users`, cx, yLabel + 16);
        ctx.font = '700 12px Inter, system-ui, sans-serif';
      });
      const parkedCount = nodes.filter((n) => n.unused).length;
      ctx.fillStyle = `rgba(159, 178, 197, ${labelAlpha})`;
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.fillText(`${UNUSED.label.toUpperCase()} · ${parkedCount} LICENSES TO RECOVER`, W / 2, layout.parkedY + 26);
    }
    draw.pos = pos;
  }

  function loop(now) {
    if (!visible) { running = false; return; }
    draw(now);
    if (reducedMotion && !animStart) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function start() { if (running) return; running = true; requestAnimationFrame(loop); }

  function setTarget(value) {
    from = progress;
    target = value;
    animStart = performance.now();
    if (button) {
      button.textContent = value ? 'Tangle it again' : 'Untangle it';
      button.setAttribute('aria-pressed', String(Boolean(value)));
    }
    start();
  }

  function mix(a, b, k) {
    const pa = hexToRgb(a), pb = hexToRgb(b);
    const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  function hexToRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hexToRgba(color, a) {
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
    const [r, g, b] = hexToRgb(color); return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // Hover: nearest node within 16px.
  stage.addEventListener('pointermove', (e) => {
    if (!draw.pos) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let best = -1, bestD = 16 * 16;
    draw.pos.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < bestD) { bestD = d; best = i; } });
    if (best !== hovered) {
      hovered = best;
      if (tip) {
        if (best >= 0) {
          const n = nodes[best];
          const status = n.unused && progress > 0.5 ? 'no usage in 6 months' : `${n.roles} roles`;
          tip.innerHTML = `<b>User_${n.id}</b> · ${status} · ${TIERS[n.tier].label}`;
          tip.style.left = `${draw.pos[best][0]}px`;
          tip.style.top = `${draw.pos[best][1]}px`;
          tip.classList.add('is-on');
        } else {
          tip.classList.remove('is-on');
        }
      }
      if (reducedMotion) draw(performance.now());
    }
  });
  stage.addEventListener('pointerleave', () => { hovered = -1; tip && tip.classList.remove('is-on'); if (reducedMotion) draw(performance.now()); });

  if (button) button.addEventListener('click', () => setTarget(target ? 0 : 1));

  new ResizeObserver(() => { layout(); if (!running) draw(performance.now()); }).observe(stage);
  layout();
  draw(performance.now());

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      start();
      if (!played && entry.intersectionRatio > 0.45) {
        played = true;
        setTimeout(() => setTarget(1), reducedMotion ? 0 : 700);
      }
    }
  }, { threshold: [0, 0.45] }).observe(stage);
})();
