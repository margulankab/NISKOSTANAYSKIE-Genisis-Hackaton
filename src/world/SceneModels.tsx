import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D, TorusGeometry } from 'three';
import type { Point } from '../gameplay/layout';
import { seededRandom } from './compose-world';
import { originalModel } from './original-models';
import type { ModelPart } from './original-models';
import type { Placement, WorldLayout } from './layout-schema';
import type { RecipeId } from './recipes';
import { groundHeight, hasPlotRelief } from './plot-terrain';

const shapes = {
  box: new BoxGeometry(),
  round: new CylinderGeometry(.5, .5, 1, 10),
  cone: new ConeGeometry(.5, 1, 8),
  ball: new IcosahedronGeometry(.5, 0),
  ring: new TorusGeometry(.38, .115, 5, 12),
};

type Instance = { model: ModelPart; placement: Placement; tint?: string };
type Batch = NonNullable<ReturnType<typeof buildBatches>>[number];
const dummy = new Object3D();
const parent = new Object3D();
const paint = new Color();
const accent = new Color();

function buildBatches(placements: Placement[], tint?: string) {
  const batches = new Map<ModelPart['shape'], Instance[]>();
  for (const placement of placements) {
    const model = originalModel(placement.recipe);
    if (!model) continue;
    for (const part of model.parts) {
      const batch = batches.get(part.shape) ?? [];
      batch.push({ model: part, placement, tint });
      batches.set(part.shape, batch);
    }
  }
  return [...batches];
}

function BatchedGeometry({ batch }: { batch: Batch }) {
  const [shape, instances] = batch;
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    for (const [i, { model, placement, tint }] of instances.entries()) {
      parent.position.set(placement.x, placement.y, placement.z);
      parent.rotation.set(0, placement.rotation, 0);
      parent.scale.setScalar(placement.scale);
      parent.updateMatrix();
      dummy.position.set(...model.at);
      dummy.rotation.set(...(model.rotation ?? [0, 0, 0]));
      dummy.scale.set(...model.size);
      dummy.updateMatrix();
      current.setMatrixAt(i, dummy.matrix.premultiply(parent.matrix));
      paint.set(model.color);
      if (placement.color) paint.lerp(accent.setRGB(...placement.color.map(value => value / 255) as [number, number, number]).convertSRGBToLinear(), .68);
      else if (tint && placement.recipe !== 'pool-basin') paint.lerp(accent.set(tint), .2);
      current.setColorAt(i, paint);
    }
    current.instanceMatrix.needsUpdate = true;
    if (current.instanceColor) current.instanceColor.needsUpdate = true;
    current.computeBoundingSphere();
  }, [instances]);
  return <instancedMesh key={instances.length} ref={mesh} args={[undefined, undefined, instances.length]}>
    <primitive object={shapes[shape]} attach="geometry" />
    <meshStandardMaterial color="white" flatShading roughness={.87} />
  </instancedMesh>;
}

export function OriginalModels({ placements, tint }: { placements: Placement[]; tint?: string }) {
  const batches = useMemo(() => buildBatches(placements, tint), [placements, tint]);
  return <>{batches.map(batch => <BatchedGeometry key={batch[0] + batch[1].length} batch={batch} />)}</>;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x, dz = end.z - start.z;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - start.x - t * dx, point.z - start.z - t * dz);
}

const groundDetails: Record<NonNullable<WorldLayout['profile']>, RecipeId[]> = {
  park: ['grass', 'fern', 'flower-bed', 'shrub', 'mushroom'], 'water-park': ['palm', 'shrub', 'grass', 'flower-bed'],
  coast: ['reeds', 'grass', 'shrub', 'rock-ledge', 'log'], market: ['market-cart', 'poster-column', 'shrub', 'bollard'],
  interior: ['rug', 'tea-set', 'picture-frame', 'fern'], woodland: ['grass', 'fern', 'mushroom', 'log', 'shrub'],
  city: ['bollard', 'poster-column', 'fern', 'shrub'], rural: ['grass', 'fern', 'shrub', 'haystack'],
  fantasy: ['crystal', 'rock-ledge', 'grass', 'mushroom'], station: ['bollard', 'poster-column', 'shrub', 'fern'],
  ballfield: ['grass', 'shrub', 'fern'],
};

export function GroundsDressing({ layout, excluded = [], tint }: { layout: WorldLayout; excluded?: readonly RecipeId[]; tint?: string }) {
  const details = useMemo(() => {
    if (!layout.profile) return [];
    const available = (layout.drySurfaces ? ['grass', 'fern', 'flower-bed', 'shrub'] as const : groundDetails[layout.profile])
      .filter(id => !excluded.includes(id));
    if (!available.length) return [];
    const rand = seededRandom(Math.round((layout.placements[0]?.x ?? 0) * 5000 + layout.bounds.minZ * 100) ^ 0x6cc813);
    const { bounds, paths = [], drySurfaces, water, indoor } = layout;
    const result: Placement[] = [];
    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const target = layout.profile === 'interior' ? 22 : Math.round(Math.min(170, Math.max(70, 70 * area / 312)));
    const free = (point: { x: number; z: number }) => {
      const inside = (rect: typeof bounds) => point.x >= rect.minX && point.x <= rect.maxX && point.z >= rect.minZ && point.z <= rect.maxZ;
      if (!inside(bounds) || drySurfaces && !drySurfaces.some(inside) || water && inside(water)
        || indoor && inside(indoor.area) && layout.profile !== 'interior') return false;
      if (layout.profile === 'ballfield' && Math.abs(point.x) < 7.5 && point.z < 3 && point.z > -12) return false;
      if (layout.drySurfaces && Math.abs(point.x) < bounds.maxX - 1.05) return false;
      return Math.hypot(point.x - layout.spawn.x, point.z - layout.spawn.z) >= 2.1
        && !paths.some(path => path.some((from, n) => n + 1 < path.length && distanceToSegment(point, from, path[n + 1]) < 1.25))
        && !layout.placements.some(p => Math.hypot(p.x - point.x, p.z - point.z) < 1.15)
        && !result.some(p => Math.hypot(p.x - point.x, p.z - point.z) < .5);
    };
    const add = (point: { x: number; z: number }, recipe: RecipeId, scale: number) =>
      result.push({ ...point, id: `detail-${result.length}`, recipe, y: 0, rotation: (rand() - .5) * 6, scale, term: null, color: null });
    if (['market', 'city', 'station'].includes(layout.profile) && !drySurfaces) {
      // Paved places keep the square open: street furniture lines the walkways at a steady rhythm, alternating sides.
      let step = 0;
      for (const path of paths) for (let n = 0; n + 1 < path.length && result.length < target; n++) {
        const from = path[n], to = path[n + 1];
        const length = Math.hypot(to.x - from.x, to.z - from.z);
        for (let along = 2; along < length; along += 4.2) {
          const t = along / length, side = step % 2 ? 1 : -1;
          const point = { x: from.x + (to.x - from.x) * t - (to.z - from.z) / length * 1.7 * side,
            z: from.z + (to.z - from.z) * t + (to.x - from.x) / length * 1.7 * side };
          if (free(point)) add(point, available[step % available.length], .62);
          step++;
        }
      }
      // Market and city approaches become a street: shopfronts and blocks line both sides, facing the walk.
      if (layout.profile !== 'station') {
        const fronts: RecipeId[] = ['storefront', 'apartment', 'storefront'];
        const core = layout.placements.reduce((edge, p) => Math.max(edge, p.z), -Infinity);
        for (const side of [-1, 1]) for (let z = layout.spawn.z - 1; z > core + 2; z -= 4.6) {
          const point = { x: layout.spawn.x + side * 7.2, z };
          const recipe = fronts[Math.abs(Math.round(z)) % fronts.length];
          if (excluded.includes(recipe) || !free(point)) continue;
          result.push({ ...point, id: `street-${side}-${Math.round(z * 10)}`, recipe, y: 0, rotation: side > 0 ? -Math.PI / 2 : Math.PI / 2,
            scale: .95 + rand() * .2, term: null, color: null });
        }
      }
    } else {
      // Green places grow in patches (a flower bed here, a group of shrubs there), with open ground between them.
      const patches = Math.max(8, Math.round(target / 6));
      for (let c = 0; c < patches * 5 && result.length < target; c++) {
        const center = { x: bounds.minX + rand() * (bounds.maxX - bounds.minX), z: bounds.minZ + rand() * (bounds.maxZ - bounds.minZ) };
        if (!free(center)) continue;
        const main = available[Math.floor(rand() * available.length)], other = available[Math.floor(rand() * available.length)];
        const size = 3 + Math.floor(rand() * 6);
        for (let k = 0; k < size && result.length < target; k++) {
          const angle = rand() * Math.PI * 2, radius = Math.sqrt(rand()) * 1.9;
          const point = { x: center.x + Math.cos(angle) * radius, z: center.z + Math.sin(angle) * radius };
          if (free(point)) add(point, rand() < .75 ? main : other, .48 + rand() * .34);
        }
      }
    }
    if (!layout.direction && ['park', 'water-park', 'woodland', 'coast', 'city', 'market', 'rural', 'fantasy', 'ballfield'].includes(layout.profile)) {
      const silhouette: RecipeId[] = layout.profile === 'fantasy' && layout.placements.some(p => p.recipe === 'cavern') ? ['rock-ledge', 'standing-stone', 'rock-ledge'] :
        layout.profile === 'water-park' ? ['palm', 'cabana', 'shrub'] :
        layout.profile === 'city' || layout.profile === 'market' ? ['apartment', 'storefront', 'water-tower'] :
        layout.profile === 'coast' ? ['rock-ledge', 'pine', 'shrub'] : ['pine', 'birch', 'shrub'];
      const allowed = silhouette.filter(recipe => !excluded.includes(recipe));
      for (let i = 0; i < 19 && allowed.length; i++) {
        const x = bounds.minX - 4 + i * (bounds.maxX - bounds.minX + 8) / 18;
        result.push({ x, z: bounds.minZ - 1.6 - rand() * 5, id: `horizon-${i}`, recipe: allowed[i % allowed.length], y: -.13,
          rotation: (rand() - .5) * .6, scale: 1 + rand() * 1.2, term: null, color: null });
      }
      // Side edges of larger worlds get their own tree line, skipping any shore.
      const sideRows = Math.round((bounds.maxZ - bounds.minZ) / 2.6);
      for (const [side, edge] of [[-1, bounds.minX], [1, bounds.maxX]] as const) {
        if (water && (side > 0 ? water.maxX >= bounds.maxX : water.minX <= bounds.minX)) continue;
        for (let i = 0; i < sideRows && allowed.length && bounds.maxX - bounds.minX > 24; i++) {
          result.push({ x: edge + side * (1.4 + rand() * 4), z: bounds.minZ + i * (bounds.maxZ - bounds.minZ) / sideRows,
            id: `edge-${side}-${i}`, recipe: allowed[(i + (side > 0 ? 1 : 0)) % allowed.length], y: -.13,
            rotation: (rand() - .5) * .6, scale: .9 + rand() * 1.1, term: null, color: null });
        }
      }
    }
    return result;
  }, [layout, excluded]);
  const { bounds } = layout;
  return <>
    {details.length > 0 && <OriginalModels placements={details.map(p => ({ ...p, y: p.y + groundHeight(layout, p.x, p.z) }))} tint={tint} />}
    {!layout.direction && layout.profile && layout.profile !== 'interior' && (
      <mesh position={[(bounds.minX + bounds.maxX) / 2, -.23, (bounds.minZ + bounds.maxZ) / 2]}>
        <boxGeometry args={[bounds.maxX - bounds.minX + 36, .23, bounds.maxZ - bounds.minZ + 34]} />
        <meshStandardMaterial color={layout.profile === 'water-park' ? '#a89177' : layout.profile === 'coast' ? '#587d88' : '#5d7353'} />
      </mesh>
    )}
    <RouteSurface layout={layout} />
  </>;
}

function RouteSurface({ layout }: { layout: WorldLayout }) {
  const segments = useMemo(() => (layout.paths ?? []).flatMap(path => path.slice(1).map((to, index) => {
    const from = path[index], dx = to.x - from.x, dz = to.z - from.z;
    const length = Math.hypot(dx, dz);
    const steps = hasPlotRelief(layout) ? Math.max(1, Math.ceil(length / .6)) : 1;
    return Array.from({ length: steps }, (_, step) => {
      const x = from.x + (step + .5) * dx / steps, z = from.z + (step + .5) * dz / steps;
      const y1 = groundHeight(layout, x - dx / steps / 2, z - dz / steps / 2);
      const y2 = groundHeight(layout, x + dx / steps / 2, z + dz / steps / 2);
      return { x, z, y: (y1 + y2) / 2, length: Math.hypot(length / steps, y2 - y1), angle: Math.atan2(dx, dz), pitch: Math.atan2(y1 - y2, length / steps) };
    });
  }).flat()), [layout]);
  const mesh = useRef<InstancedMesh>(null);
  const corners = useRef<InstancedMesh>(null);
  const joints = useMemo(() => [...new Map((layout.paths ?? []).flat().map(point => [point.x + ',' + point.z, point])).values()], [layout.paths]);
  const width = layout.profile === 'water-park' ? .64 : 1.04;
  const color = layout.direction
    ? '#' + new Color(layout.direction.palette.surface).lerp(new Color('#d1bd94'), .45).getHexString()
    : layout.profile === 'water-park' ? '#ddccab' : layout.indoor ? '#ae9470' : '#b49b72';
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    for (const [i, segment] of segments.entries()) {
      dummy.position.set(segment.x, segment.y + .025 + i * .000015, segment.z);
      dummy.rotation.set(segment.pitch, segment.angle, 0, 'YXZ');
      dummy.scale.set(width, .018, segment.length);
      dummy.updateMatrix();
      current.setMatrixAt(i, dummy.matrix);
    }
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
    const caps = corners.current;
    if (!caps) return;
    for (const [i, joint] of joints.entries()) {
      dummy.position.set(joint.x, groundHeight(layout, joint.x, joint.z) + .022 + i * .000012, joint.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(width, .018, width);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
    caps.computeBoundingSphere();
  }, [segments, joints, layout, width]);
  return segments.length ? <>
    <instancedMesh key={segments.length} ref={mesh} args={[undefined, undefined, segments.length]}>
      <primitive object={shapes.box} attach="geometry" /><meshStandardMaterial color={color} roughness={.96} />
    </instancedMesh>
    <instancedMesh key={'caps-' + joints.length} ref={corners} args={[undefined, undefined, joints.length]}>
      <primitive object={shapes.round} attach="geometry" /><meshStandardMaterial color={color} roughness={.96} />
    </instancedMesh>
  </> : null;
}
