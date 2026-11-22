import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import type { Group } from 'three';
import { seededRandom } from './compose-world';
import { groundBounds } from './layout-schema';
import type { Placement, WorldLayout } from './layout-schema';
import type { RecipeId } from './recipes';
import { OriginalModels } from './SceneModels';

export const backdropRange = 112;
const horizons = {
  park: ['pine', 'birch', 'willow', 'shrub'], woodland: ['pine', 'birch', 'rock-ledge'],
  rural: ['pine', 'birch', 'barn'], fantasy: ['rock-ledge', 'standing-stone', 'pine'],
  coast: ['rock-ledge', 'willow', 'pine'], city: ['apartment', 'storefront', 'willow', 'pine'],
  market: ['apartment', 'storefront', 'willow'], 'water-park': ['palm', 'willow', 'shrub'],
  ballfield: ['pine', 'birch', 'shrub'], station: ['rock-ledge', 'pine'],
} satisfies Partial<Record<NonNullable<WorldLayout['profile']>, RecipeId[]>>;

export function SceneWeather({ bounds, weather, reduced, paused }: {
  bounds: WorldLayout['bounds']; weather: 'rain' | 'snow'; reduced: boolean; paused: boolean;
}) {
  const raining = weather === 'rain';
  const ceiling = 11;
  const geometry = useMemo(() => {
    const rand = seededRandom(14973);
    const count = raining ? 620 : 410;
    const data: number[] = [];
    for (let index = 0; index < count; index++) {
      const x = bounds.minX - 4 + rand() * (bounds.maxX - bounds.minX + 8);
      const z = bounds.minZ - 4 + rand() * (bounds.maxZ - bounds.minZ + 8);
      const y = rand() * ceiling;
      data.push(x, y, z);
      if (raining) data.push(x - .055, y + .38, z + .05);
    }
    const mesh = new BufferGeometry();
    mesh.setAttribute('position', new Float32BufferAttribute(data, 3));
    return mesh;
  }, [bounds, raining]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, dt) => {
    if (reduced || paused) return;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i += raining ? 2 : 1) {
      const height = (positions.getY(i) - dt * (raining ? 9.2 : .67) + ceiling) % ceiling;
      positions.setY(i, height);
      if (raining) positions.setY(i + 1, height + .38);
    }
    positions.needsUpdate = true;
  });
  return raining ? <lineSegments geometry={geometry} frustumCulled={false}>
    <lineBasicMaterial color="#c1d8e6" transparent opacity={reduced ? .16 : .34} depthWrite={false} />
  </lineSegments> : <points geometry={geometry} frustumCulled={false}>
    <pointsMaterial color="#edf3f5" size={.060} transparent opacity={.68} depthWrite={false} />
  </points>;
}

export function SceneSurroundings({ layout, excluded, reduced, paused }: {
  layout: WorldLayout; excluded: readonly RecipeId[]; reduced: boolean; paused: boolean;
}) {
  const waves = useRef<Group>(null);
  const { bounds, water, profile, direction } = layout;
  const land = groundBounds(layout);
  const side = !water ? 0 : water.maxX === bounds.maxX ? 1 : -1;
  const bank = side > 0 ? land.maxX : land.minX;
  const maxX = side === 1 ? bank : backdropRange;
  const minX = side === -1 ? bank : -backdropRange;
  const minZ = -backdropRange, maxZ = backdropRange;
  const span = maxZ - minZ;
  const center = (minX + maxX) / 2;
  const pavedBank = Boolean(water && (profile === 'city' || profile === 'market' || profile === 'park'));
  const palette = direction?.palette;
  const propTint = palette?.accent;
  const waterColor = useMemo(() => new Color(palette?.sky ?? '#8dc5d5').lerp(new Color('#3d7187'), .76), [palette?.sky]);
  const distance = useMemo(() => {
    if (!profile || profile === 'interior') return [];
    const available = horizons[profile].filter(recipe => !excluded.includes(recipe));
    if (!available.length) return [];
    const rand = seededRandom(Math.round((layout.placements[0]?.x ?? 0) * 3219) ^ 0x56a732);
    const items: Placement[] = [];
    for (const depth of [1, 2, 3]) {
      for (let cluster = 0; cluster < 17; cluster++) {
        const angle = (cluster + rand() * .72) / 17 * Math.PI * 2;
        const x = Math.cos(angle) * (bounds.maxX - bounds.minX) / 2 + (bounds.maxX + bounds.minX) / 2;
        const z = Math.sin(angle) * (bounds.maxZ - bounds.minZ) / 2 + (bounds.maxZ + bounds.minZ) / 2;
        for (let i = 0; i < 3; i++) {
          const px = x + Math.cos(angle) * depth * 8.6 + (rand() - .5) * 5;
          const pz = z + Math.sin(angle) * depth * 9.5 + (rand() - .5) * 5;
          if ((side && side * (px - bank) > -2) || (px > bounds.minX - 2 && px < bounds.maxX + 2 &&
            pz > bounds.minZ - 2 && pz < bounds.maxZ + 2)) continue;
          items.push({ id: `background-${items.length}`, recipe: available[Math.floor(rand() * available.length)],
            x: px, z: pz, y: -.1, scale: 1 + rand() * .65 + depth * .29, rotation: (rand() - .5) * .58, term: null, color: null });
        }
      }
    }
    return items;
  }, [bounds, profile, side, bank, layout.placements, excluded]);
  useFrame((_, delta) => {
    if (!waves.current || reduced || paused) return;
    for (const [index, wave] of waves.current.children.entries()) {
      wave.position.z = ((wave.position.z + delta * (.20 + index % 4 * .04) + 48) % 96) - 48;
    }
  });
  if (!palette || layout.indoor && profile === 'interior') return null;
  const rails = Math.max(1, Math.floor((bounds.maxZ - bounds.minZ) / 2.1));
  const railsX = bank - side * .18;
  const railColor = '#656c69';
  const edgeColor = '#687552';
  const farWater = side * backdropRange;
  return <>
    <mesh position={[center, -.35, 0]}>
      <boxGeometry args={[maxX - minX, .44, span]} />
      <meshStandardMaterial color={palette.surface} roughness={.96} />
    </mesh>
    {distance.length > 0 && <OriginalModels placements={distance} tint={propTint} />}
    {water && <>
      <mesh position={[(bank + farWater) / 2, -.25, 0]}>
        <boxGeometry args={[Math.abs(farWater - bank), .05, span]} />
        <meshStandardMaterial color={waterColor} roughness={.43} />
      </mesh>
      <group ref={waves}>
        {Array.from({ length: 48 }, (_, index) => <mesh key={index}
          position={[bank + side * (1.6 + (index % 11) * 4.1), -.219, -47 + index * 1.93]}>
          <boxGeometry args={[1.15 + index % 3, .003, .031]} />
          <meshBasicMaterial color={palette.horizon} transparent opacity={.26} />
        </mesh>)}
      </group>
      {pavedBank && <>
        <mesh position={[bank - side * .74, .015, 0]}>
          <boxGeometry args={[1.43, .04, span * .7]} />
          <meshStandardMaterial color={palette.surface} roughness={.95} />
        </mesh>
        {[.36, .91].map(y => <mesh key={y} position={[railsX, y, (bounds.minZ + bounds.maxZ) / 2]}>
          <boxGeometry args={[.068, .06, bounds.maxZ - bounds.minZ]} />
          <meshStandardMaterial color={railColor} />
        </mesh>)}
        {Array.from({ length: rails + 1 }, (_, index) => <mesh key={index}
          position={[railsX, .47, bounds.minZ + index / rails * (bounds.maxZ - bounds.minZ)]}>
          <boxGeometry args={[.09, .96, .09]} />
          <meshStandardMaterial color={railColor} />
        </mesh>)}
      </>}
    </>}
    {!layout.indoor && !water && (['x', 'z'] as const).flatMap(axis => {
      const isX = axis === 'x';
      const sides = isX ? [bounds.minX, bounds.maxX] : [bounds.minZ, bounds.maxZ];
      const low = isX ? bounds.minZ : bounds.minX, high = isX ? bounds.maxZ : bounds.maxX;
      const half = (high - low - 3.2) / 2;
      const fence = profile === 'water-park' || profile === 'city' || profile === 'market';
      return sides.flatMap((fixed, sideIndex) => [low + half / 2, high - half / 2].map((along, index) => (
        <mesh key={`${axis}-${sideIndex}-${index}`} position={[isX ? fixed : along, fence ? .39 : .27, isX ? along : fixed]}>
          <boxGeometry args={[isX ? .48 : half, fence ? .78 : .63, isX ? half : .48]} />
          <meshStandardMaterial color={fence ? palette.surface : edgeColor} roughness={.92} />
        </mesh>
      )));
    })}
  </>;
}
