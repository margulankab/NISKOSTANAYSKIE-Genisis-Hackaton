import * as THREE from 'three';
import type { DecorKind, MoodPalette, PropKind } from '../lib/types';

const std = (color: string | number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...extra });
const glowMat = (color: string, k = 1.4) => std(color, { emissive: color, emissiveIntensity: k, roughness: 0.4 });
function add(g: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}

/** Small readable "memory object" models, built from primitives. */
export function makeProp(kind: PropKind, p: MoodPalette, image?: string): THREE.Group {
  const g = new THREE.Group();
  const wood = '#8a5a3c';
  switch (kind) {
    case 'lamp':
      add(g, new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16), std(wood));
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std(wood), 0, 0.28);
      add(g, new THREE.ConeGeometry(0.3, 0.38, 20, 1, true), glowMat(p.glow, 1.6), 0, 0.62).material.side = THREE.DoubleSide; break;
    case 'book':
      add(g, new THREE.BoxGeometry(0.55, 0.1, 0.4), std(p.accent), 0, 0.05);
      add(g, new THREE.BoxGeometry(0.5, 0.09, 0.36), std('#f4ecd8'), 0.01, 0.15);
      add(g, new THREE.BoxGeometry(0.46, 0.1, 0.34), std(p.trim), 0, 0.24); break;
    case 'cup':
      add(g, new THREE.CylinderGeometry(0.2, 0.15, 0.3, 20), std('#f6f1e9'), 0, 0.15);
      add(g, new THREE.TorusGeometry(0.1, 0.03, 8, 16), std('#f6f1e9'), 0.23, 0.16).rotation.y = Math.PI / 2 * 0;
      add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), glowMat(p.accent, 0.6), 0, 0.29); break;
    case 'plant':
      add(g, new THREE.CylinderGeometry(0.22, 0.16, 0.26, 14), std('#b8643f'), 0, 0.13);
      for (let i = 0; i < 4; i++) add(g, new THREE.SphereGeometry(0.17, 12, 10), std(i % 2 ? '#4f9a63' : '#6fb978'), Math.cos(i * 1.6) * 0.14, 0.4 + i * 0.07, Math.sin(i * 1.6) * 0.14);
      break;
    case 'note':
      add(g, new THREE.SphereGeometry(0.13, 14, 10), glowMat(p.glow), -0.12, 0.12);
      add(g, new THREE.SphereGeometry(0.13, 14, 10), glowMat(p.glow), 0.2, 0.05);
      add(g, new THREE.BoxGeometry(0.04, 0.55, 0.04), glowMat(p.glow), -0.04, 0.4);
      add(g, new THREE.BoxGeometry(0.04, 0.55, 0.04), glowMat(p.glow), 0.28, 0.33);
      add(g, new THREE.BoxGeometry(0.36, 0.08, 0.04), glowMat(p.glow), 0.12, 0.66); break;
    case 'frame': {
      add(g, new THREE.BoxGeometry(0.9, 0.7, 0.06), std(wood), 0, 0.45);
      const tex = image ? new THREE.TextureLoader().load(image) : null;
      if (tex) tex.colorSpace = THREE.SRGBColorSpace;
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.58), tex ? new THREE.MeshBasicMaterial({ map: tex }) : glowMat(p.accent, 0.5));
      pic.position.set(0, 0.45, 0.035); g.add(pic);
      add(g, new THREE.BoxGeometry(0.06, 0.3, 0.06), std(wood), 0, 0.12, -0.12).rotation.x = 0.4; break; }
    case 'key':
      add(g, new THREE.TorusGeometry(0.15, 0.04, 10, 20), std('#e4b94f', { metalness: 0.8, roughness: 0.3 }), 0, 0.5);
      add(g, new THREE.BoxGeometry(0.06, 0.4, 0.05), std('#e4b94f', { metalness: 0.8, roughness: 0.3 }), 0, 0.2);
      add(g, new THREE.BoxGeometry(0.16, 0.05, 0.05), std('#e4b94f', { metalness: 0.8 }), 0.08, 0.05); break;
    case 'chair':
      add(g, new THREE.BoxGeometry(0.5, 0.08, 0.5), std(p.trim), 0, 0.3);
      add(g, new THREE.BoxGeometry(0.5, 0.5, 0.07), std(p.trim), 0, 0.58, -0.22);
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) add(g, new THREE.BoxGeometry(0.05, 0.3, 0.05), std(wood), x, 0.15, z);
      break;
  }
  return g;
}

/** Decoration that appears when the house transforms. Pure geometry from palette. */
export function makeDecor(kind: DecorKind, p: MoodPalette, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  switch (kind) {
    case 'plant': {
      add(g, new THREE.CylinderGeometry(0.4, 0.3, 0.55, 14), std('#b8643f'), 0, 0.28);
      for (let i = 0; i < 6; i++) add(g, new THREE.SphereGeometry(0.28, 12, 10), std(i % 2 ? '#4f9a63' : '#79c184'), (rnd() - 0.5) * 0.5, 0.75 + i * 0.12, (rnd() - 0.5) * 0.5);
      add(g, new THREE.SphereGeometry(0.1, 8, 8), glowMat(p.accent, 1), 0.2, 1.5, 0.1); break; }
    case 'lamp':
      add(g, new THREE.CylinderGeometry(0.25, 0.3, 0.1, 16), std('#5a3a2a'));
      add(g, new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), std('#5a3a2a'), 0, 0.8);
      add(g, new THREE.ConeGeometry(0.45, 0.55, 20, 1, true), glowMat(p.glow, 1.8), 0, 1.7).material.side = THREE.DoubleSide;
      g.userData.pulse = true; break;
    case 'orb': {
      const o = add(g, new THREE.IcosahedronGeometry(0.35, 2), glowMat(p.glow, 1.6), 0, 1.6);
      o.castShadow = false; g.userData.bob = 0.2 + rnd() * 0.2; g.userData.baseY = 0; g.userData.pulse = true; break; }
    case 'cushion':
      add(g, new THREE.CylinderGeometry(0.6, 0.6, 0.22, 24), std(p.accent), 0, 0.11);
      add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.26, 24), std(p.trim), 0, 0.24); break;
    case 'boat': {
      const boat = new THREE.Group();
      add(boat, new THREE.BoxGeometry(0.9, 0.18, 0.4), std('#f4ecd8'), 0, 0, 0);
      add(boat, new THREE.ConeGeometry(0.28, 0.5, 4), std(p.accent), 0, 0.35, 0).rotation.y = Math.PI / 4;
      boat.position.y = 1.4; g.add(boat); g.userData.bob = 0.12; g.userData.baseY = 0; g.userData.sway = true; break; }
    case 'shard':
      add(g, new THREE.OctahedronGeometry(0.4, 0), glowMat(p.accent, 1.3), 0, 1.5).scale.set(0.6, 1.5, 0.6);
      g.userData.spin = 1.2 + rnd(); g.userData.bob = 0.15; break;
    case 'balloon': {
      add(g, new THREE.SphereGeometry(0.42, 16, 14), std(p.accent, { emissive: p.accent, emissiveIntensity: 0.25, roughness: 0.35 }), 0, 2.0).scale.y = 1.2;
      add(g, new THREE.CylinderGeometry(0.008, 0.008, 1.5, 4), std('#ffffff'), 0, 1.0);
      g.userData.bob = 0.25; break; }
    case 'candle':
      add(g, new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), std('#f6efe0'), 0, 0.25);
      add(g, new THREE.SphereGeometry(0.07, 8, 8), glowMat(p.glow, 2.4), 0, 0.58).scale.y = 1.5;
      g.userData.flicker = true; break;
  }
  return g;
}

export function makeLabel(text: string): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 640; c.height = 260;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgba(24,18,34,0.82)'; x.beginPath(); x.roundRect(8, 8, 624, 244, 28); x.fill();
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#fff8ec'; x.font = '600 38px Inter, system-ui, sans-serif'; x.textBaseline = 'top';
  const lines: string[] = []; let cur = '';
  for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > 560 && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur);
  const shown = lines.slice(0, 4); if (lines.length > 4) shown[3] = shown[3].replace(/\s*\S*$/, '') + '…';
  const total = shown.length * 50; shown.forEach((l, i) => x.fillText(l, 36, 130 - total / 2 + i * 50 - 4));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 }));
  s.scale.set(3.2, 1.3, 1); s.renderOrder = 20; return s;
}
