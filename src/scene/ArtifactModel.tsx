import type { Color } from 'three';
import type { MemoryScene } from '../shared/memory-schema';

type ArtifactKind = MemoryScene['artifacts'][number]['kind'];

export const artifactNames: Record<ArtifactKind, string> = {
  frame: 'Photo frame',
  note: 'Note',
  cup: 'Cup',
  bench: 'Bench',
  lamp: 'Lamp',
  desk: 'Desk',
};

function Block({ size, at, color }: {
  size: [number, number, number];
  at: [number, number, number];
  color: Color | string;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  );
}

export function ArtifactModel({ kind, accent }: { kind: ArtifactKind; accent: Color }) {
  const paper = '#e1d1b3';
  const wood = '#69513c';

  switch (kind) {
    case 'frame':
      return (
        <group rotation={[-0.16, 0.14, 0]}>
          <Block size={[0.85, 0.67, 0.12]} at={[0, 0.4, 0]} color={wood} />
          <Block size={[0.72, 0.54, 0.035]} at={[0, 0.4, 0.074]} color={paper} />
          <Block size={[0.52, 0.32, 0.02]} at={[0, 0.42, 0.102]} color={accent} />
          <Block size={[0.54, 0.09, 0.44]} at={[0, 0.04, -0.12]} color={wood} />
        </group>
      );
    case 'note':
      return (
        <>
          <Block size={[0.85, 0.13, 0.61]} at={[0, 0.06, 0]} color={wood} />
          <group position={[0, 0.15, 0]} rotation={[0, -0.14, 0]}>
            <Block size={[0.73, 0.05, 0.48]} at={[0, 0, 0]} color={paper} />
            {[-0.11, 0, 0.11].map((z) => (
              <Block key={z} size={[0.46, 0.01, 0.025]} at={[-0.025, 0.028, z]} color={wood} />
            ))}
          </group>
        </>
      );
    case 'cup':
      return (
        <>
          <mesh position={[0, 0.21, 0]}>
            <cylinderGeometry args={[0.23, 0.17, 0.42, 20]} />
            <meshStandardMaterial color={accent} />
          </mesh>
          <mesh position={[0, 0.423, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.195, 20]} />
            <meshStandardMaterial color={wood} />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <torusGeometry args={[0.14, 0.037, 8, 16]} />
            <meshStandardMaterial color={accent} />
          </mesh>
        </>
      );
    case 'bench':
    case 'desk': {
      const bench = kind === 'bench';
      const height = bench ? 0.24 : 0.55;
      return (
        <>
          <Block size={[0.92, 0.085, 0.52]} at={[0, height, 0]} color={wood} />
          <Block size={[0.09, height, 0.37]} at={[-0.34, height / 2, 0]} color={accent} />
          <Block size={[0.09, height, 0.37]} at={[0.34, height / 2, 0]} color={accent} />
          {bench && <Block size={[0.92, 0.28, 0.07]} at={[0, 0.41, -0.22]} color={wood} />}
        </>
      );
    }
    case 'lamp':
      return (
        <>
          <Block size={[0.47, 0.09, 0.43]} at={[0, 0.046, 0]} color={wood} />
          <Block size={[0.07, 0.61, 0.07]} at={[0, 0.31, 0]} color={wood} />
          <mesh position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.15, 0.27, 0.25, 16]} />
            <meshStandardMaterial color={paper} emissive={accent} emissiveIntensity={0.15} />
          </mesh>
        </>
      );
  }
}
