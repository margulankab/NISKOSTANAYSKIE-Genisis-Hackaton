import * as THREE from 'three';
import { mulberry32 } from '../lib/mood';
import type { Fragment, MoodConfig, MoodPalette } from '../lib/types';
import { makeDecor, makeLabel, makeProp } from './props';

export type Phase = 'collect' | 'closing' | 'transforming' | 'explore';
export interface FragState { id: string; caption: string; kind: Fragment['kind']; room: string; status: 'waiting' | 'carried' | 'placed' | 'seen'; }
export interface Snapshot {
  phase: Phase; frags: FragState[]; placed: number; carried: number; prompt: string | null; room: string;
  transformT: number; inspecting: Fragment | null; seen: number;
}
export interface WorldOptions { transformed: boolean; reducedMotion: boolean; }

// Neutral "ordinary house" look, before the box is closed.
const NEUTRAL: MoodPalette = {
  sky: '#2d313b', fog: '#3a3f4b', wall: '#d2cabd', floor: '#a29480', trim: '#8c8272', accent: '#a79a88', glow: '#ffe2b0',
  sun: '#fff0d8', ambient: '#e8dccb', sunIntensity: 0.9, ambientIntensity: 0.55,
};
const ROOMS: { name: string; c: [number, number] }[] = [
  { name: 'Living room', c: [-7, -5.25] }, { name: 'Kitchen', c: [7, -5.25] },
  { name: 'Bedroom', c: [-7, 5.25] }, { name: 'Study', c: [7, 5.25] }, { name: 'Hall', c: [0, 0] },
];
const SPOTS: [number, number][] = [[-5.8, -4.6], [5.5, -4.2], [-5.5, 4.8], [5.5, 4.4], [0, -6.5]];
const DECOR_SLOTS: [number, number][] = [
  [-4.2, -8], [-4, -3], [-10, -3], [4, -3], [10.5, -3.2], [4, -6.8], [-4, 3], [-4, 8], [-10.5, 2.8], [4, 3], [4, 8], [10.8, 2.8],
  [-1.3, -4.5], [1.3, -4.5], [-1.3, 4.5], [1.3, 4.5], [-5, 0], [5, 0],
];
type AABB = [number, number, number, number];
const BOX_POS = new THREE.Vector3(0, 0, 0);
const roomAt = (x: number, z: number) => {
  if (Math.abs(x) < 2 || Math.abs(z) < 1.5) return 'Hall';
  return ROOMS[(x < 0 ? 0 : 1) + (z < 0 ? 0 : 2)].name;
};

interface Tint { mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial; from: THREE.Color; to: THREE.Color }

export class MemoryWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  private last = performance.now();
  private elapsed = 0;
  private raf = 0;
  private listeners = new Set<(s: Snapshot) => void>();
  private lastJson = '';
  private disposed = false;

  private phase: Phase;
  private t = 0;            // transformation 0..1
  private phaseTime = 0;
  private colliders: AABB[] = [];
  private tints: Tint[] = [];
  private walls: { group: THREE.Group; mats: THREE.Material[]; box: THREE.Box3; op: number }[] = [];
  private player = new THREE.Group();
  private legs: THREE.Mesh[] = [];
  private pos = new THREE.Vector3(0, 0, 3.4);
  private heading = Math.PI;
  private input = { x: 0, z: 0, sprint: false };
  private keys = new Set<string>();
  private paused = false;

  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private follow = new THREE.PointLight();
  private ground!: THREE.Mesh;
  private windows: THREE.MeshStandardMaterial[] = [];
  private lidPivot = new THREE.Group();
  private boxOrbs = new THREE.Group();
  private pulseRing!: THREE.Mesh;
  private decorGroup = new THREE.Group();
  private decor: THREE.Group[] = [];
  private particles!: { obj: THREE.Object3D; pos: Float32Array; seed: Float32Array; kind: MoodConfig['particles']['kind']; mat: THREE.Material; n: number };

  private fragObjs: { f: Fragment; orb: THREE.Group; prop: THREE.Group; label: THREE.Sprite; spot: THREE.Vector3; room: string; status: FragState['status']; }[] = [];
  private carried: string[] = [];
  private inspecting: Fragment | null = null;
  private seenSet = new Set<string>();
  private near: { type: 'frag'; i: number } | { type: 'box' } | null = null;
  private flash = 0;

  constructor(private host: HTMLElement, private config: MoodConfig, private opts: WorldOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.phase = opts.transformed ? 'explore' : 'collect';
    this.t = opts.transformed ? 1 : 0;
    this.build();
    this.applyLook();
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.loop();
  }

  // ------------------------------------------------------------------ build
  private tint(mat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial, to: string, mix = 1) {
    const from = mat.color.clone();
    this.tints.push({ mat, from, to: from.clone().lerp(new THREE.Color(to), mix) });
    return mat;
  }
  private mesh(g: THREE.Object3D, w: number, h: number, d: number, color: string, x: number, y: number, z: number, tintTo?: string, mix = 1) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    if (tintTo) this.tint(mat, tintTo, mix);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  private solid(w: number, d: number, x: number, z: number) { this.colliders.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]); }

  private build() {
    const p = this.config.palette;
    const house = new THREE.Group(); this.scene.add(house);

    // floor + hall
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), this.tint(new THREE.MeshStandardMaterial({ color: NEUTRAL.floor, roughness: 0.9 }), p.floor) as THREE.MeshStandardMaterial);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; house.add(floor);
    for (const [w, d] of [[4, 18], [24, 3]]) {
      const hall = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.tint(new THREE.MeshStandardMaterial({ color: NEUTRAL.floor, roughness: 0.9 }), p.wall, 0.35) as THREE.MeshStandardMaterial);
      hall.rotation.x = -Math.PI / 2; hall.position.y = 0.01; hall.receiveShadow = true; house.add(hall);
    }
    // outside ground
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: NEUTRAL.fog, roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = -0.06; this.ground.receiveShadow = true; this.scene.add(this.ground);

    // walls
    const gapsV = (z0: number, z1: number, gc: number): [number, number][] => [[z0, gc - 1.2], [gc + 1.2, z1]];
    const wall = (x0: number, z0: number, x1: number, z1: number) => {
      const w = Math.abs(x1 - x0) || 0.3, d = Math.abs(z1 - z0) || 0.3, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const grp = new THREE.Group(); const H = 2.7;
      const body = this.mesh(grp, w, H, d, NEUTRAL.wall, cx, H / 2, cz, p.wall);
      const cap = this.mesh(grp, w + 0.04, 0.1, d + 0.04, NEUTRAL.trim, cx, H + 0.05, cz, p.trim);
      const base = this.mesh(grp, w + 0.04, 0.18, d + 0.04, NEUTRAL.trim, cx, 0.09, cz, p.trim);
      const mats = [body.material, cap.material, base.material] as THREE.Material[];
      mats.forEach((m) => { (m as THREE.MeshStandardMaterial).transparent = true; });
      house.add(grp); this.solid(w, d, cx, cz);
      this.walls.push({ group: grp, mats, box: new THREE.Box3().setFromObject(grp), op: 1 });
    };
    wall(-12, -9, 12, -9); wall(-12, 9, 12, 9); wall(-12, -9, -12, 9); wall(12, -9, 12, 9);
    for (const x of [-2, 2]) {
      for (const [a, b] of gapsV(-9, -1.5, -5.25)) wall(x, a, x, b);
      for (const [a, b] of gapsV(1.5, 9, 5.25)) wall(x, a, x, b);
    }
    for (const z of [-1.5, 1.5]) {
      for (const [a, b] of [[-12, -8.2], [-5.8, -2], [2, 5.8], [8.2, 12]]) wall(a, z, b, z);
    }

    // windows (emissive panes on the inner face of outer walls)
    const addWindow = (x: number, z: number, ry: number) => {
      const g = new THREE.Group(); g.position.set(x, 1.55, z); g.rotation.y = ry;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.6, 0.06), this.tint(new THREE.MeshStandardMaterial({ color: '#6b5a4a' }), p.trim) as THREE.MeshStandardMaterial);
      g.add(frame);
      const pane = new THREE.MeshStandardMaterial({ color: '#222', emissive: '#222', emissiveIntensity: 1 });
      this.windows.push(pane);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), pane); m.position.z = 0.04; g.add(m);
      house.add(g);
    };
    for (const x of [-7, 7]) { addWindow(x, -8.82, 0); addWindow(x, 8.82, Math.PI); }
    for (const z of [-5.25, 5.25]) { addWindow(-11.82, z, Math.PI / 2); addWindow(11.82, z, -Math.PI / 2); }

    // furniture (neutral wood, softly tinted by mood)
    const F = (w: number, h: number, d: number, x: number, z: number, col: string, tt: string, mix = 0.5, y = 0, solid = true) => {
      this.mesh(house, w, h, d, col, x, y + h / 2, z, tt, mix); if (solid) this.solid(w, d, x, z);
    };
    // living room
    F(3.4, 0.7, 1.3, -8.5, -8.0, '#8b7d70', p.accent, 0.55); F(3.4, 0.9, 0.3, -8.5, -8.55, '#8b7d70', p.accent, 0.55);
    F(0.7, 2.2, 2.6, -11.5, -5.25, '#6f5844', p.trim, 0.4);
    this.rug(house, -7, -5.25, p.accent);
    // kitchen
    F(6, 1, 0.9, 7, -8.4, '#9a9288', p.trim, 0.45); F(1.8, 0.85, 1.8, 8.5, -4.4, '#7a6150', p.trim, 0.4);
    // bedroom
    F(2.0, 0.7, 3.6, -10.6, 6.8, '#9b8d83', p.accent, 0.5); F(2.0, 1.1, 0.25, -10.6, 8.7, '#6f5844', p.trim, 0.4); F(2.6, 2.1, 0.9, -7, 8.45, '#6f5844', p.trim, 0.4);
    this.rug(house, -7, 5.25, p.trim);
    // study
    F(0.9, 0.85, 3.0, 10.4, 5.25, '#7a6150', p.trim, 0.4); F(4, 2.0, 0.7, 7, 8.6, '#6f5844', p.trim, 0.4);
    this.rug(house, 7, 5.25, p.accent);

    // memory box
    const bx = new THREE.Group(); bx.position.copy(BOX_POS); house.add(bx);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.12, 36), this.tint(new THREE.MeshStandardMaterial({ color: '#8c8272' }), p.trim) as THREE.MeshStandardMaterial);
    plinth.position.y = 0.06; plinth.receiveShadow = true; bx.add(plinth);
    const boxMat = new THREE.MeshStandardMaterial({ color: '#8a5a3c', roughness: 0.55 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.0), boxMat); base.position.y = 0.47; base.castShadow = true; bx.add(base);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), new THREE.MeshStandardMaterial({ color: '#ffd68a', emissive: '#ffbf5a', emissiveIntensity: 1.2 })); inner.position.y = 0.82; bx.add(inner);
    this.lidPivot.position.set(0, 0.82, -0.5); bx.add(this.lidPivot);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.14, 1.04), boxMat); lid.position.set(0, 0.07, 0.52); lid.castShadow = true; this.lidPivot.add(lid);
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.06), new THREE.MeshStandardMaterial({ color: '#e4b94f', metalness: 0.8, roughness: 0.3 })); clasp.position.set(0, 0.0, 1.06); this.lidPivot.add(clasp);
    this.lidPivot.rotation.x = this.phase === 'collect' ? -1.9 : 0;
    this.boxOrbs.position.set(0, 1.5, 0); bx.add(this.boxOrbs);
    this.pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.pulseRing.rotation.x = -Math.PI / 2; this.pulseRing.position.y = 0.2; bx.add(this.pulseRing);
    this.solid(1.5, 1.2, 0, 0);

    // fragments: orbs now, memory objects after the transformation
    const rnd = mulberry32(this.config.seed);
    this.config.fragments.forEach((f, i) => {
      const [sx, sz] = SPOTS[i % SPOTS.length]; const spot = new THREE.Vector3(sx, 0, sz);
      const orb = new THREE.Group(); orb.position.copy(spot);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 2), new THREE.MeshStandardMaterial({ color: '#fff3c9', emissive: '#ffd27a', emissiveIntensity: 2 })); core.position.y = 1.0; orb.add(core);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe3a0', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 1.5; orb.add(beam);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffe3a0' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; orb.add(ring);
      this.scene.add(orb);
      const prop = new THREE.Group(); prop.position.copy(spot);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.5, 24), this.tint(new THREE.MeshStandardMaterial({ color: '#8c8272' }), p.trim) as THREE.MeshStandardMaterial);
      pl.position.y = 0.25; pl.castShadow = true; prop.add(pl);
      const model = makeProp(f.prop, p, f.image); model.position.y = 0.5; model.scale.setScalar(1.25); prop.add(model);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: p.glow })); halo.rotation.x = Math.PI / 2; halo.position.y = 0.52; prop.add(halo);
      prop.visible = false; this.scene.add(prop);
      const label = makeLabel(f.caption); label.position.set(spot.x, 2.9, spot.z); this.scene.add(label);
      this.fragObjs.push({ f, orb, prop, label, spot, room: roomAt(sx, sz), status: this.opts.transformed ? 'placed' : 'waiting' });
      void rnd;
    });
    if (this.opts.transformed) this.fragObjs.forEach((o) => { o.orb.visible = false; o.prop.visible = true; });

    // decor (deterministic from seed)
    const dr = mulberry32(this.config.seed ^ 0x9e3779b9);
    const slots = [...DECOR_SLOTS].map((s) => ({ s, k: dr() })).sort((a, b) => a.k - b.k).slice(0, 11).map((x) => x.s);
    slots.forEach(([x, z], i) => {
      const kind = this.config.decor[i % this.config.decor.length];
      const d = makeDecor(kind, p, dr); d.position.set(x, 0, z); d.rotation.y = dr() * Math.PI * 2;
      d.userData.phase = dr() * 6.28; d.userData.delay = 0.1 + (i / slots.length) * 0.7; d.scale.setScalar(this.opts.transformed ? 1 : 0.0001);
      this.decorGroup.add(d); this.decor.push(d);
    });
    this.scene.add(this.decorGroup);

    this.buildParticles(dr);
    this.buildPlayer();
    this.scene.add(this.hemi, this.sun, this.follow);
    this.sun.position.set(-9, 18, 10); this.sun.castShadow = true;
    const s = this.sun.shadow; s.mapSize.set(window.innerWidth < 700 ? 1024 : 2048, window.innerWidth < 700 ? 1024 : 2048);
    Object.assign(s.camera, { left: -17, right: 17, top: 14, bottom: -14, near: 1, far: 50 }); s.bias = -0.0006;
    this.scene.fog = new THREE.Fog(NEUTRAL.fog, 30, 70);
    this.camera.position.set(0, 10, 12);
  }

  private rug(g: THREE.Object3D, x: number, z: number, col: string) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), this.tint(new THREE.MeshStandardMaterial({ color: '#b9a88f', roughness: 1 }), col, 0.6) as THREE.MeshStandardMaterial);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); m.receiveShadow = true; g.add(m);
  }

  private buildPlayer() {
    const skin = new THREE.MeshStandardMaterial({ color: '#f1c7a1', roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#2f6f8f', roughness: 0.7 });
    const pants = new THREE.MeshStandardMaterial({ color: '#2b2f45', roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 0.9 });
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; this.player.add(m); return m; };
    add(new THREE.CapsuleGeometry(0.26, 0.5, 6, 14), shirt, 0, 1.0, 0);
    add(new THREE.SphereGeometry(0.23, 18, 14), skin, 0, 1.62, 0);
    const cap = add(new THREE.SphereGeometry(0.245, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.65, -0.02); cap.rotation.x = -0.25;
    add(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: '#222' }), -0.08, 1.62, 0.21);
    add(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: '#222' }), 0.08, 1.62, 0.21);
    for (const sx of [-0.12, 0.12]) { const l = add(new THREE.CapsuleGeometry(0.09, 0.4, 4, 8), pants, sx, 0.4, 0); l.geometry.translate(0, -0.15, 0); l.position.y = 0.55; this.legs.push(l); }
    for (const sx of [-0.34, 0.34]) { const a = add(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), shirt, sx, 1.0, 0); a.rotation.z = sx > 0 ? -0.12 : 0.12; }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#fff4d6', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; this.player.add(ring);
    this.scene.add(this.player);
  }

  private buildParticles(r: () => number) {
    const cfg = this.config.particles; const n = cfg.kind === 'rain' ? 260 : 220;
    const pos = new Float32Array(n * (cfg.kind === 'rain' ? 6 : 3)); const seed = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { seed[i * 3] = (r() - 0.5) * 30; seed[i * 3 + 1] = r() * 7; seed[i * 3 + 2] = (r() - 0.5) * 24; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    let obj: THREE.Object3D, mat: THREE.Material;
    if (cfg.kind === 'rain') { mat = new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0 }); obj = new THREE.LineSegments(geo, mat); }
    else {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!;
      if (cfg.kind === 'stars') { x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? 7 : 30; x.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); } x.fill(); }
      else if (cfg.kind === 'bubbles') { x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 24, 0, 7); x.stroke(); }
      else { const g = x.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
      mat = new THREE.PointsMaterial({ color: cfg.color, size: cfg.size * 3.2, map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: cfg.kind === 'bubbles' ? THREE.NormalBlending : THREE.AdditiveBlending });
      obj = new THREE.Points(geo, mat);
    }
    obj.frustumCulled = false; this.scene.add(obj);
    this.particles = { obj, pos, seed, kind: cfg.kind, mat, n };
  }

  // ------------------------------------------------------------------- look
  private applyLook() {
    const pal = this.config.palette; const t = this.t;
    const col = (a: string, b: string) => new THREE.Color(a).lerp(new THREE.Color(b), t);
    for (const k of this.tints) k.mat.color.copy(k.from).lerp(k.to, t);
    this.hemi.color.copy(col(NEUTRAL.ambient, pal.ambient)); this.hemi.groundColor.copy(col('#4a4036', pal.floor).multiplyScalar(0.6));
    this.hemi.intensity = THREE.MathUtils.lerp(NEUTRAL.ambientIntensity, pal.ambientIntensity, t) + this.flash * 0.8;
    this.sun.color.copy(col(NEUTRAL.sun, pal.sun)); this.sun.intensity = THREE.MathUtils.lerp(NEUTRAL.sunIntensity, pal.sunIntensity, t) + this.flash * 1.5;
    this.follow.color.copy(col('#ffe9c4', pal.glow)); this.follow.intensity = 14 + 10 * t; this.follow.distance = 9; this.follow.decay = 1.6;
    const sky = col(NEUTRAL.sky, pal.sky); this.scene.background = sky;
    (this.scene.fog as THREE.Fog).color.copy(col(NEUTRAL.fog, pal.fog));
    (this.ground.material as THREE.MeshStandardMaterial).color.copy(col(NEUTRAL.fog, pal.fog).multiplyScalar(0.8));
    for (const w of this.windows) { const c = col('#2a2a30', pal.glow); w.color.copy(c); w.emissive.copy(c); w.emissiveIntensity = 0.25 + 1.0 * t; }
    (this.particles.mat as THREE.Material).opacity = Math.max(0, (t - 0.15) / 0.85) * 0.85;
    this.renderer.toneMappingExposure = 1 + this.flash * 0.6;
  }

  // ------------------------------------------------------------------ input
  private isTyping(e: KeyboardEvent) { const t = e.target as HTMLElement | null; return !!t && /^(INPUT|TEXTAREA|SELECT|IFRAME)$/.test(t.tagName); }
  private onKey = (e: KeyboardEvent) => {
    if (this.isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (k === 'e' || k === ' ' || k === 'enter') { if (!(k === 'enter' && (e.target as HTMLElement)?.tagName === 'BUTTON')) this.interact(); return; }
    if (k === 'escape') { this.closeInspect(); return; }
    this.keys.add(k);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); };
  private onBlur = () => this.keys.clear();
  setMove(x: number, z: number) { this.input.x = x; this.input.z = z; }
  onChange(cb: (s: Snapshot) => void) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  getSnapshot(): Snapshot { return this.snapshot(); }

  interact() {
    if (this.inspecting) { this.closeInspect(); return; }
    const n = this.near; if (!n) return;
    if (this.phase === 'collect') {
      if (n.type === 'frag') { const o = this.fragObjs[n.i]; o.status = 'carried'; o.orb.visible = false; this.carried.push(o.f.id); this.flash = 0.25; }
      else if (n.type === 'box') {
        if (this.carried.length) { this.placeCarried(); }
        else if (this.fragObjs.some((o) => o.status === 'placed')) this.closeBox();
      }
    } else if (this.phase === 'explore' && n.type === 'frag') {
      const o = this.fragObjs[n.i]; o.status = 'seen'; this.seenSet.add(o.f.id); this.inspecting = o.f; this.paused = true;
    }
  }
  /** Dev/test helper only (exposed in DEV builds). */
  teleport(x: number, z: number) { this.pos.set(x, 0, z); }
  closeInspect() { this.inspecting = null; this.paused = false; }
  private placeCarried() {
    for (const o of this.fragObjs) if (o.status === 'carried') { o.status = 'placed'; }
    this.carried = []; this.flash = 0.35;
    this.boxOrbs.clear();
    this.fragObjs.filter((o) => o.status === 'placed').forEach((_, i, a) => {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshBasicMaterial({ color: '#ffe3a0' }));
      const ang = (i / a.length) * Math.PI * 2; s.position.set(Math.cos(ang) * 0.35, 0, Math.sin(ang) * 0.35); this.boxOrbs.add(s);
    });
  }
  private closeBox() { this.phase = 'closing'; this.phaseTime = 0; }

  // ------------------------------------------------------------------- loop
  private loop = () => {
    if (this.disposed) return; this.raf = requestAnimationFrame(this.loop);
    const now = performance.now(); const dt = Math.min((now - this.last) / 1000, 0.05); this.last = now; this.elapsed += dt; const time = this.elapsed;
    this.update(dt, time); this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number, time: number) {
    const rm = this.opts.reducedMotion; const motion = rm ? 0.3 : 1;
    // phase machine
    this.phaseTime += dt;
    const inCutscene = this.phase === 'closing' || this.phase === 'transforming';
    if (this.phase === 'closing') {
      const k = Math.min(1, this.phaseTime / (rm ? 0.6 : 1.6));
      this.boxOrbs.rotation.y += dt * (2 + k * 8); this.boxOrbs.scale.setScalar(1 - k * 0.9); this.boxOrbs.position.y = 1.5 - k * 0.7;
      this.lidPivot.rotation.x = THREE.MathUtils.lerp(-1.9, 0, k * k * (3 - 2 * k));
      if (k >= 1) { this.phase = 'transforming'; this.phaseTime = 0; this.flash = 1; this.boxOrbs.clear(); this.boxOrbs.scale.setScalar(1); }
    } else if (this.phase === 'transforming') {
      const dur = rm ? 1.4 : 4.2; this.t = Math.min(1, this.phaseTime / dur);
      const e = this.t * this.t * (3 - 2 * this.t); const saved = this.t; this.t = e; this.applyLook(); this.t = saved;
      (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = (1 - this.t) * 0.9; this.pulseRing.scale.setScalar(1 + this.t * 14);
      for (const d of this.decor) { const k = THREE.MathUtils.clamp((this.t - d.userData.delay * 0.6) / 0.4, 0, 1); d.scale.setScalar(Math.max(0.0001, easeOutBack(k))); }
      this.fragObjs.forEach((o, i) => { if (this.t > 0.35 + i * 0.07) { o.prop.visible = true; o.prop.scale.setScalar(Math.min(1, (this.t - 0.35 - i * 0.07) * 5)); } });
      if (this.t >= 1) { this.t = 1; this.phase = 'explore'; this.fragObjs.forEach((o) => { o.prop.scale.setScalar(1); }); }
    }
    this.flash = Math.max(0, this.flash - dt * (rm ? 4 : 1.4));
    if (this.phase === 'explore' || this.phase === 'collect') this.applyLook();

    // movement
    let ix = this.input.x, iz = this.input.z;
    const K = this.keys;
    if (K.has('a') || K.has('arrowleft')) ix -= 1; if (K.has('d') || K.has('arrowright')) ix += 1;
    if (K.has('w') || K.has('arrowup')) iz -= 1; if (K.has('s') || K.has('arrowdown')) iz += 1;
    const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
    const moving = len > 0.05 && !this.paused && !inCutscene;
    if (moving) {
      const sp = (K.has('shift') ? 6.2 : 4.0) * dt;
      this.tryMove(ix * sp, 0); this.tryMove(0, iz * sp);
      const target = Math.atan2(ix, iz); let d = target - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, dt * 14);
    }
    this.player.position.copy(this.pos); this.player.rotation.y = this.heading;
    const sw = moving ? Math.sin(time * 11) * 0.7 : 0; this.legs[0].rotation.x = THREE.MathUtils.lerp(this.legs[0].rotation.x, sw, 0.3); this.legs[1].rotation.x = THREE.MathUtils.lerp(this.legs[1].rotation.x, -sw, 0.3);
    this.player.position.y = moving ? Math.abs(Math.sin(time * 11)) * 0.04 : 0;
    this.follow.position.set(this.pos.x, 3.2, this.pos.z);

    // nearest interactable
    this.near = null;
    if (!inCutscene && !this.paused) {
      let best = 2.0;
      this.fragObjs.forEach((o, i) => {
        const can = this.phase === 'collect' ? o.status === 'waiting' : this.phase === 'explore';
        if (!can) return; const d = Math.hypot(o.spot.x - this.pos.x, o.spot.z - this.pos.z); if (d < best) { best = d; this.near = { type: 'frag', i }; }
      });
      if (this.phase === 'collect' && Math.hypot(this.pos.x, this.pos.z) < 2.3 && !this.near) this.near = { type: 'box' };
    }

    // ambient animation
    for (const o of this.fragObjs) {
      if (o.orb.visible) { const c = o.orb.children[0]; c.position.y = 1.0 + Math.sin(time * 2 + o.spot.x) * 0.12 * motion; c.rotation.y = time; }
      const d = Math.hypot(o.spot.x - this.pos.x, o.spot.z - this.pos.z);
      const lm = o.label.material; const want = this.phase === 'explore' && o.prop.visible && d < 4.5 ? 1 : 0; lm.opacity += (want - lm.opacity) * Math.min(1, dt * 8);
      o.prop.children[1].rotation.y = this.phase === 'explore' ? Math.sin(time * 0.8 + o.spot.z) * 0.3 * motion : 0;
    }
    for (const d of this.decor) {
      const u = d.userData; if (this.t < 1 && this.phase !== 'explore') continue;
      if (u.bob) d.position.y = Math.sin(time * 1.2 + u.phase) * u.bob * motion;
      if (u.spin) d.rotation.y += dt * u.spin * motion;
      if (u.sway) d.rotation.z = Math.sin(time + u.phase) * 0.08 * motion;
      d.traverse((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!m || !m.emissive) return;
        if (u.flicker) m.emissiveIntensity = 2 + Math.sin(time * 9 + u.phase) * 0.5 * motion;
        else if (u.pulse) m.emissiveIntensity = 1.5 + Math.sin(time * 1.6 + u.phase) * 0.4 * motion;
      });
    }
    this.updateParticles(dt, time, motion);
    this.updateWalls(dt);
    this.updateCamera(dt, inCutscene);

    const snap = this.snapshot(); const j = JSON.stringify(snap); if (j !== this.lastJson) { this.lastJson = j; this.listeners.forEach((l) => l(snap)); }
  }

  private tryMove(dx: number, dz: number) {
    const r = 0.38; const nx = this.pos.x + dx, nz = this.pos.z + dz;
    for (const [x0, z0, x1, z1] of this.colliders) {
      const cx = THREE.MathUtils.clamp(nx, x0, x1), cz = THREE.MathUtils.clamp(nz, z0, z1);
      if ((nx - cx) ** 2 + (nz - cz) ** 2 < r * r) return;
    }
    this.pos.x = THREE.MathUtils.clamp(nx, -11.5, 11.5); this.pos.z = THREE.MathUtils.clamp(nz, -8.5, 8.5);
  }

  private updateParticles(dt: number, time: number, motion: number) {
    const { pos, seed, n, kind } = this.particles; const cfg = this.config.particles; const sp = cfg.speed * motion;
    for (let i = 0; i < n; i++) {
      let y = seed[i * 3 + 1] + (cfg.rise ? 1 : -1) * sp * dt; const H = kind === 'rain' ? 8 : 7;
      if (y > H) y -= H; if (y < 0) y += H; seed[i * 3 + 1] = y;
      const sway = kind === 'rain' ? 0 : Math.sin(time * 0.7 + i) * 0.5 * motion;
      const x = seed[i * 3] + sway, z = seed[i * 3 + 2] + (kind === 'petals' ? Math.cos(time * 0.5 + i) * 0.5 * motion : 0);
      if (kind === 'rain') { pos.set([x, y, z, x - 0.06, y + 0.55, z], i * 6); } else { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; }
    }
    (this.particles.obj as THREE.Points).geometry.attributes.position.needsUpdate = true;
  }

  private updateWalls(dt: number) {
    const ray = new THREE.Ray(this.camera.position.clone(), new THREE.Vector3().subVectors(new THREE.Vector3(this.pos.x, 1.2, this.pos.z), this.camera.position).normalize());
    const dist = this.camera.position.distanceTo(new THREE.Vector3(this.pos.x, 1.2, this.pos.z)); const hit = new THREE.Vector3();
    for (const w of this.walls) {
      const b = w.box.clone().expandByScalar(0.35); const h = ray.intersectBox(b, hit) && hit.distanceTo(ray.origin) < dist;
      w.op += ((h ? 0.12 : 1) - w.op) * Math.min(1, dt * 10);
      w.mats.forEach((m) => { m.opacity = w.op; m.depthWrite = w.op > 0.9; });
    }
  }

  private updateCamera(dt: number, cutscene: boolean) {
    const focus = cutscene ? BOX_POS : this.pos; const off = cutscene ? new THREE.Vector3(0, 9, 7.5) : new THREE.Vector3(0, 15.5, 9.5);
    const target = focus.clone().add(off); const k = 1 - Math.exp(-(this.opts.reducedMotion ? 20 : 5) * dt);
    this.camera.position.lerp(target, k);
    this.camera.lookAt(focus.x, 0.9, focus.z - 0.4);
  }

  private snapshot(): Snapshot {
    const placed = this.fragObjs.filter((o) => o.status === 'placed' || o.status === 'seen').length;
    let prompt: string | null = null; const n = this.near;
    if (!this.inspecting) {
      if (n?.type === 'frag') prompt = this.phase === 'collect' ? 'Press E — pick up this memory' : 'Press E — look closer';
      else if (n?.type === 'box') prompt = this.carried.length ? `Press E — place ${this.carried.length} memor${this.carried.length > 1 ? 'ies' : 'y'} in the box` : 'Press E — close the memory box';
    }
    return {
      phase: this.phase, placed, carried: this.carried.length, prompt, room: roomAt(this.pos.x, this.pos.z),
      transformT: Math.round(this.t * 100) / 100, inspecting: this.inspecting, seen: this.seenSet.size,
      frags: this.fragObjs.map((o) => ({ id: o.f.id, caption: o.f.caption, kind: o.f.kind, room: o.room, status: o.status })),
    };
  }

  private resize = () => {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.fov = w / h < 0.8 ? 58 : 42; this.camera.updateProjectionMatrix();
  };

  dispose() {
    this.disposed = true; cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize); window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur);
    this.scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose()); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.listeners.clear();
  }
}

function easeOutBack(x: number) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
export const supportsWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };
