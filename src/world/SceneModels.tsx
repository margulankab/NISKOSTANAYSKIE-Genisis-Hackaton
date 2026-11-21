import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D, TorusGeometry } from 'three';
import type { Point } from '../gameplay/layout';
import { seededRandom } from './compose-world';
import { originalModel } from './original-models';
import type { ModelPart } from './original-models';
import type { Placement, WorldLayout } from './layout-schema';
import type { RecipeId } from './recipes';

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
      else if (tint) paint.lerp(accent.set(tint), .2);
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
  fantasy: ['crystal', 'rock-ledge', 'grass', 'mushroom'], station: ['fern', 'bollard', 'crystal', 'rock-ledge'],
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
    // Density follows area, so extended worlds are as lush as the composed core (capped for frame time).
    const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
    const target = layout.profile === 'interior' ? 22 : Math.round(Math.min(240, Math.max(88, 88 * area / 312)));
    for (let i = 0; i < target * 9 && result.length < target; i++) {
      const point = { x: bounds.minX + rand() * (bounds.maxX - bounds.minX), z: bounds.minZ + rand() * (bounds.maxZ - bounds.minZ) };
      const inside = (area: typeof bounds) => point.x >= area.minX && point.x <= area.maxX && point.z >= area.minZ && point.z <= area.maxZ;
      if (drySurfaces && !drySurfaces.some(inside) || water && inside(water) || indoor && inside(indoor.area) && layout.profile !== 'interior') continue;
      if (Math.hypot(point.x - layout.spawn.x, point.z - layout.spawn.z) < 2.1 ||
          paths.some(path => path.some((from, n) => n + 1 < path.length && distanceToSegment(point, from, path[n + 1]) < 1.25)) ||
          layout.placements.some(p => Math.hypot(p.x - point.x, p.z - point.z) < 1.15)) continue;
      if (layout.drySurfaces && Math.abs(point.x) < bounds.maxX - 1.05) continue;
      const recipe = available[Math.floor(rand() * available.length)];
      result.push({ ...point, id: `detail-${i}`, recipe, y: 0, rotation: (rand() - .5) * 6, scale: .48 + rand() * .34, term: null, color: null });
    }
    if (['park', 'water-park', 'woodland', 'coast', 'city', 'market', 'rural', 'fantasy'].includes(layout.profile)) {
      const silhouette: RecipeId[] = layout.profile === 'water-park' ? ['palm', 'cabana', 'shrub'] :
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
    {details.length > 0 && <OriginalModels placements={details} tint={tint} />}
    {layout.profile && layout.profile !== 'interior' && (
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
    return { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2, length: Math.hypot(dx, dz), angle: Math.atan2(dx, dz) };
  })), [layout.paths]);
  const mesh = useRef<InstancedMesh>(null);
  const corners = useRef<InstancedMesh>(null);
  const joints = useMemo(() => [...new Map((layout.paths ?? []).flat().map(point => [point.x + ',' + point.z, point])).values()], [layout.paths]);
  const width = layout.profile === 'water-park' ? .64 : 1.04;
  const color = layout.profile === 'water-park' ? '#ddccab' : layout.indoor ? '#ae9470' : '#b49b72';
  useLayoutEffect(() => {
    const current = mesh.current;
    if (!current) return;
    for (const [i, segment] of segments.entries()) {
      dummy.position.set(segment.x, .025 + i * .000015, segment.z);
      dummy.rotation.set(0, segment.angle, 0);
      dummy.scale.set(width, .018, segment.length);
      dummy.updateMatrix();
      current.setMatrixAt(i, dummy.matrix);
    }
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
    const caps = corners.current;
    if (!caps) return;
    for (const [i, joint] of joints.entries()) {
      dummy.position.set(joint.x, .022 + i * .000012, joint.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(width, .018, width);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    caps.instanceMatrix.needsUpdate = true;
    caps.computeBoundingSphere();
  }, [segments, joints, width]);
  return segments.length ? <>
    <instancedMesh key={segments.length} ref={mesh} args={[undefined, undefined, segments.length]}>
      <primitive object={shapes.box} attach="geometry" /><meshStandardMaterial color={color} roughness={.96} />
    </instancedMesh>
    <instancedMesh key={'caps-' + joints.length} ref={corners} args={[undefined, undefined, joints.length]}>
      <primitive object={shapes.round} attach="geometry" /><meshStandardMaterial color={color} roughness={.96} />
    </instancedMesh>
  </> : null;
}
