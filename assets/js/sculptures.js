/* Three gold sculptures, one per <div class="sculpture" data-sculpture="…">:
   - armillary: rings of users, roles and licenses around one estate (hero)
   - ledger: a stack of license fees with the recoverable ones lifted off (estimator)
   - key: a license key (security)
   Each gets its own small renderer that only draws while on screen. Materials
   take their reflections from Three's RoomEnvironment, so no texture files are
   needed. Reduced-motion users get a single still frame. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const GOLD = { color: 0xd3a243, metalness: 1, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 1.15 };
const TIER_COLORS = [0xe3b95e, 0x4fb6e8, 0x35c48f];

// A small deterministic random, so the hero looks the same on every visit.
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

class Stage {
  constructor(el, cameraZ = 6.4) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    this.camera.position.set(0, 0, cameraZ);

    const key = new THREE.DirectionalLight(0xfff0d2, 2.4); key.position.set(3, 4, 5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x4fb6e8, 1.6); rim.position.set(-4, 1.5, -3); this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xe3b95e, 0.6); fill.position.set(-2, -3, 3); this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.12));

    this.pointer = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.visible = false;
    this.running = false;
    this.update = () => {};

    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.loop();
    }, { rootMargin: '120px' }).observe(el);

    if (!reducedMotion) {
      const area = el.closest('section') || el;
      area.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        this.target.x = Math.max(-0.6, Math.min(0.6, (e.clientX - r.left) / r.width - 0.5));
        this.target.y = Math.max(-0.6, Math.min(0.6, (e.clientY - r.top) / r.height - 0.5));
      });
      area.addEventListener('pointerleave', () => { this.target.x = 0; this.target.y = 0; });
    }
  }
  resize() {
    const w = this.el.clientWidth || 300;
    const h = this.el.clientHeight || w;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render(performance.now() / 1000);
  }
  loop() {
    if (this.running || !this.visible) return;
    if (reducedMotion) { this.render(0); return; }
    this.running = true;
    const tick = (now) => {
      if (!this.visible) { this.running = false; return; }
      this.render(now / 1000);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  render(t) {
    this.pointer.x += (this.target.x - this.pointer.x) * 0.06;
    this.pointer.y += (this.target.y - this.pointer.y) * 0.06;
    this.update(t);
    this.renderer.render(this.scene, this.camera);
  }
}

const goldMaterial = () => new THREE.MeshPhysicalMaterial(GOLD);

/* ---------- Armillary: the estate as an instrument ---------- */
function armillary(stage) {
  const sphere = new THREE.Group();
  sphere.position.y = 0.1;
  stage.scene.add(sphere);
  const gold = goldMaterial();

  const specs = [
    { r: 1.42, tube: 0.03, tilt: [1.25, 0.1, 0.35], speed: 0.1, count: 12 },
    { r: 1.18, tube: 0.026, tilt: [0.55, 0.95, 0.0], speed: -0.16, count: 10 },
    { r: 0.94, tube: 0.023, tilt: [1.1, 0.25, 1.15], speed: 0.22, count: 8 },
    { r: 0.7, tube: 0.02, tilt: [0.3, 1.6, 0.6], speed: -0.3, count: 6 },
  ];
  const rings = [];
  const nodes = [];
  specs.forEach((s, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...s.tilt);
    const spin = new THREE.Group();
    pivot.add(spin);
    spin.add(new THREE.Mesh(new THREE.TorusGeometry(s.r, s.tube, 24, 180), gold));
    for (let k = 0; k < s.count; k++) {
      const angle = (k / s.count) * Math.PI * 2 + i * 0.7;
      const color = TIER_COLORS[(k + i) % 3];
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 18, 18),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1 })
      );
      node.position.set(Math.cos(angle) * s.r, Math.sin(angle) * s.r, 0);
      spin.add(node);
      nodes.push(node);
    }
    sphere.add(pivot);
    rings.push({ spin, speed: s.speed });
  });

  // The estate at the centre.
  sphere.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 48), gold));

  // Relationships: lines between nodes on different rings, redrawn every frame.
  const pairs = [];
  while (pairs.length < 38) {
    const a = Math.floor(rnd() * nodes.length), b = Math.floor(rnd() * nodes.length);
    if (a !== b) pairs.push([a, b]);
  }
  const positions = new Float32Array(pairs.length * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x9fd4f0, transparent: true, opacity: 0.3 }));
  sphere.add(lines);

  // A plinth, so it reads as an object in a gallery rather than a diagram.
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.84, 0.12, 72),
    new THREE.MeshPhysicalMaterial({ color: 0x0a1829, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 })
  );
  plinth.position.y = -1.6;
  stage.scene.add(plinth);
  const plinthRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.018, 12, 96), gold);
  plinthRing.rotation.x = Math.PI / 2;
  plinthRing.position.y = -1.53;
  stage.scene.add(plinthRing);

  const v = new THREE.Vector3();
  stage.update = (t) => {
    rings.forEach((r) => { r.spin.rotation.z = t * r.speed; });
    sphere.rotation.y = t * 0.07 + stage.pointer.x * 0.5;
    sphere.rotation.x = stage.pointer.y * 0.2;
    sphere.position.y = 0.1 + Math.sin(t * 0.6) * 0.04;
    sphere.updateMatrixWorld(true);
    pairs.forEach(([a, b], i) => {
      nodes[a].getWorldPosition(v); sphere.worldToLocal(v);
      positions.set([v.x, v.y, v.z], i * 6);
      nodes[b].getWorldPosition(v); sphere.worldToLocal(v);
      positions.set([v.x, v.y, v.z], i * 6 + 3);
    });
    lineGeo.attributes.position.needsUpdate = true;
  };
}

/* ---------- Ledger: license fees as a stack, the recoverable ones lifted ---------- */
function ledger(stage) {
  const g = new THREE.Group();
  g.rotation.x = 0.42;
  g.position.y = -0.25;
  stage.scene.add(g);
  const gold = goldMaterial();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x5f9fc4, metalness: 0, roughness: 0.18, transmission: 0.8, thickness: 0.8, ior: 1.45,
    transparent: true, opacity: 0.9, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.9,
  });
  const edgeGold = new THREE.MeshPhysicalMaterial({ ...GOLD, roughness: 0.22 });

  const count = 10, h = 0.15, r = 1.0, gap = 0.035;
  const discs = [];
  for (let i = 0; i < count; i++) {
    const lifted = i >= 7;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96), lifted ? glass : gold);
    const base = -1.15 + i * (h + gap);
    if (lifted) {
      disc.userData.base = base + (i - 6) * 0.24;
      disc.rotation.z = (i - 6) * 0.07;
      // A thin gold rim keeps each glass disc legible against the dark page.
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 10, 128), edgeGold);
      rim.rotation.x = Math.PI / 2;
      disc.add(rim);
    }
    disc.position.y = base;
    g.add(disc);
    discs.push(disc);
  }
  // Fine grooves on the stack read as ledger lines.
  for (let i = 0; i < 7; i++) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(r + 0.001, 0.006, 8, 128), new THREE.MeshStandardMaterial({ color: 0x3a2a0a, roughness: 0.6 }));
    groove.rotation.x = Math.PI / 2;
    groove.position.y = -1.15 + i * (h + gap) + h / 2 + gap / 2;
    g.add(groove);
  }

  stage.update = (t) => {
    discs.forEach((d, i) => {
      if (d.userData.base !== undefined) {
        d.position.y = d.userData.base + Math.sin(t * 0.9 + i * 1.3) * 0.06;
        d.rotation.y = t * 0.12 * (i % 2 ? 1 : -1);
      }
    });
    g.rotation.y = t * 0.12 + stage.pointer.x * 0.5;
    g.rotation.x = 0.42 + stage.pointer.y * 0.15;
  };
}

/* ---------- Key: a license, in gold ---------- */
function key(stage) {
  const g = new THREE.Group();
  stage.scene.add(g);
  const gold = goldMaterial();

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 48), gold);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.18, 48), gold);
  collar.rotation.z = Math.PI / 2;
  collar.position.x = -0.95;
  g.add(collar);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.1, 32, 96), gold);
  bow.position.x = -1.6;
  g.add(bow);
  const spokes = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.84, 16), gold);
    spoke.rotation.z = (i / 3) * Math.PI;
    spokes.add(spoke);
  }
  spokes.position.x = -1.6;
  g.add(spokes);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), gold);
  hub.position.x = -1.6;
  g.add(hub);
  [[0.5, 0.3, 0.14], [0.74, 0.44, 0.16], [0.98, 0.26, 0.14]].forEach(([x, hh, w]) => {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(w, hh, 0.14), gold);
    bit.position.set(x, -0.08 - hh / 2, 0);
    g.add(bit);
  });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), gold);
  tip.position.x = 1.15;
  g.add(tip);

  g.rotation.z = 0.5;
  // The bow sits far to the left of the shaft's midpoint; shift so the key is centred.
  g.children.forEach((child) => { child.position.x += 0.45; });
  stage.update = (t) => {
    g.rotation.x = t * 0.35;
    g.rotation.y = Math.sin(t * 0.3) * 0.3 + stage.pointer.x * 0.5;
    g.rotation.z = 0.5 + stage.pointer.y * 0.15;
    g.position.y = Math.sin(t * 0.7) * 0.05;
  };
}

const BUILDERS = { armillary: [armillary, 6.4], ledger: [ledger, 7.0], key: [key, 7.2] };

document.querySelectorAll('.sculpture[data-sculpture]').forEach((el) => {
  const entry = BUILDERS[el.dataset.sculpture];
  if (!entry) return;
  try {
    const [build, cameraZ] = entry;
    const stage = new Stage(el, cameraZ);
    build(stage);
    stage.render(0);
    el.classList.add('is-live');
  } catch (error) {
    // WebGL unavailable: the CSS stand-in stays visible.
    console.warn('[sculptures] skipped', el.dataset.sculpture, error);
  }
});
