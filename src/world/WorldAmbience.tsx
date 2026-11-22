import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three';
import type { Group, Mesh, MeshBasicMaterial, Points, PointsMaterial } from 'three';
import type { Point } from '../gameplay/layout';

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Air that moves: fireflies that blink at dusk and night, slow drifting motes by day. */
export function Motes({ bounds, night, color, active }: { bounds: Bounds; night: boolean; color: string; active: boolean }) {
  const count = night ? 90 : 70;
  const points = useRef<Points>(null);
  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = Array.from({ length: count }, (_, i) => {
      const r = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1;
      return { x: bounds.minX + Math.abs(r(1)) * (bounds.maxX - bounds.minX), z: bounds.minZ + Math.abs(r(2)) * (bounds.maxZ - bounds.minZ),
        y: 0.4 + Math.abs(r(3)) * (night ? 2.2 : 3.5), phase: Math.abs(r(4)) * Math.PI * 2, speed: 0.3 + Math.abs(r(5)) * 0.5 };
    });
    const geometry = new BufferGeometry();
    seeds.forEach((s, i) => positions.set([s.x, s.y, s.z], i * 3));
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return { geometry, seeds };
  }, [bounds, count, night]);

  // Like the rest of the scene, the air only moves while the soundtrack plays.
  useFrame(({ clock }) => {
    if (!active) return;
    const time = clock.elapsedTime;
    const attribute = geometry.getAttribute('position') as BufferAttribute;
    seeds.forEach((s, i) => {
      const t = time * s.speed + s.phase;
      attribute.setXYZ(i, s.x + Math.sin(t * 0.7) * 0.8, s.y + Math.sin(t * 1.3) * 0.25 + (night ? 0 : (time * 0.05 * s.speed) % 1.5), s.z + Math.cos(t * 0.5) * 0.8);
    });
    attribute.needsUpdate = true;
    if (points.current && night) (points.current.material as PointsMaterial).opacity = 0.75 + Math.sin(time * 2.1) * 0.2;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial color={color} size={night ? 0.13 : 0.06} sizeAttenuation transparent opacity={night ? 0.9 : 0.55}
        depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/** A floating diamond over each discovery still to find, pulsing faster as the walker gets close. */
export function DiscoveryMarkers({ points, player, color, active }: { points: readonly Point[]; player: RefObject<Point>; color: string; active: boolean }) {
  const group = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!active) return;
    const time = clock.elapsedTime;
    group.current?.children.forEach((marker, i) => {
      const at = points[i];
      const distance = Math.hypot(player.current.x - at.x, player.current.z - at.z);
      const near = Math.max(0, 1 - distance / 6);
      const [diamond, ring] = marker.children as [Mesh, Mesh];
      diamond.position.y = 2.1 + Math.sin(time * 2 + i) * 0.15;
      diamond.rotation.y += delta * (1.2 + near * 4);
      diamond.scale.setScalar(1 + near * 0.35);
      const pulse = (time * (0.6 + near * 1.6) + i * 0.5) % 1;
      ring.scale.setScalar(0.6 + pulse * 1.6);
      (ring.material as MeshBasicMaterial).opacity = (1 - pulse) * (0.45 + near * 0.5);
    });
  });
  return (
    <group ref={group}>
      {points.map((at, i) => (
        <group key={i} position={[at.x, 0, at.z]}>
          <mesh position={[0, 2.1, 0]}>
            <octahedronGeometry args={[0.2]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} scale={1.2}>
            <ringGeometry args={[0.55, 0.68, 40]} />
            <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
