import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import type { Group, Mesh, MeshBasicMaterial, PointLight } from 'three';
import type { Point } from '../gameplay/layout';

const LENGTH = 2.2;
const SPARKS = Array.from({ length: 12 }, (_, i) => ({ angle: (i / 12) * Math.PI * 2, rise: 1.6 + (i % 4) * 0.45, reach: 0.5 + (i % 3) * 0.25 }));

/** A one-time burst of light where a discovery was just found: a widening ring, a beam and rising sparks. */
export function RevealBurst({ at, color }: { at: Point; color: string }) {
  const [done, setDone] = useState(false);
  const age = useRef(0);
  const ring = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const sparks = useRef<Group>(null);

  useFrame((_, delta) => {
    if (done) return;
    age.current += Math.min(delta, 0.05);
    const p = Math.min(1, age.current / LENGTH);
    const fade = 1 - p;
    if (ring.current) {
      ring.current.scale.setScalar(0.3 + 4.5 * Math.sqrt(p));
      (ring.current.material as MeshBasicMaterial).opacity = 0.9 * fade;
    }
    if (beam.current) {
      beam.current.scale.set(1 - 0.6 * p, 0.4 + 0.6 * Math.min(1, p * 4), 1 - 0.6 * p);
      (beam.current.material as MeshBasicMaterial).opacity = 0.55 * fade * fade;
    }
    if (light.current) light.current.intensity = 9 * fade * fade;
    sparks.current?.children.forEach((spark, i) => {
      const { angle, rise, reach } = SPARKS[i];
      spark.position.set(Math.cos(angle) * reach * (0.4 + p), 0.3 + rise * p, Math.sin(angle) * reach * (0.4 + p));
      spark.rotation.y += delta * 4;
      spark.scale.setScalar(Math.max(0.001, fade));
    });
    if (p >= 1) setDone(true);
  });

  if (done) return null;
  return (
    <group position={[at.x, 0, at.z]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.42, 0.55, 48]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh ref={beam} position={[0, 3, 0]}>
        <cylinderGeometry args={[0.32, 0.5, 6, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
      </mesh>
      <group ref={sparks}>
        {SPARKS.map((_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[0.07]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 1.4, 0]} color={color} distance={7} intensity={9} />
    </group>
  );
}
