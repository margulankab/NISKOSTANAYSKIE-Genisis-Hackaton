import { Color } from 'three';
import type { RecipeId } from './recipes';

/**
 * Starter low-poly geometry for each recipe ID. C owns these shapes and can replace them freely;
 * B only relies on the recipe IDs and footprints in `recipes.ts`.
 */
export interface BuilderProps { main: Color; accent: Color; lit: boolean }

function Box({ at, size, color, glow = 0 }: { at: [number, number, number]; size: [number, number, number]; color: Color | string; glow?: number }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={glow} flatShading />
    </mesh>
  );
}

function Cone({ at, radius, height, color, segments = 6 }: { at: [number, number, number]; radius: number; height: number; color: Color | string; segments?: number }) {
  return (
    <mesh position={at}>
      <coneGeometry args={[radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
    </mesh>
  );
}

function Cylinder({ at, top, bottom, height, color, glow = 0 }: { at: [number, number, number]; top: number; bottom: number; height: number; color: Color | string; glow?: number }) {
  return (
    <mesh position={at}>
      <cylinderGeometry args={[top, bottom, height, 7]} />
      <meshStandardMaterial color={color} roughness={0.85} emissive={color} emissiveIntensity={glow} flatShading />
    </mesh>
  );
}

const wood = '#6d5139';
const stone = '#8d8a83';
const paper = '#e7d9bd';

export const builders: Record<RecipeId, (props: BuilderProps) => React.JSX.Element> = {
  lighthouse: ({ main, accent, lit }) => (
    <group>
      <Cylinder at={[0, 1.6, 0]} top={0.45} bottom={0.75} height={3.2} color={main} />
      <Cylinder at={[0, 1.1, 0]} top={0.62} bottom={0.66} height={0.35} color={accent} />
      <Cylinder at={[0, 2.3, 0]} top={0.5} bottom={0.54} height={0.35} color={accent} />
      <Cylinder at={[0, 3.45, 0]} top={0.38} bottom={0.38} height={0.5} color="#fff2c4" glow={lit ? 1.4 : 0.35} />
      <Cone at={[0, 3.95, 0]} radius={0.5} height={0.5} color={accent} />
    </group>
  ),
  tower: ({ main, accent }) => (
    <group>
      <Box at={[0, 1.5, 0]} size={[1.4, 3, 1.4]} color={main} />
      {[-0.5, 0, 0.5].map((x) => <Box key={x} at={[x, 3.15, 0.55]} size={[0.3, 0.3, 0.3]} color={main} />)}
      <Box at={[0, 2, 0.71]} size={[0.4, 0.6, 0.02]} color={accent} />
    </group>
  ),
  house: ({ main, accent, lit }) => (
    <group>
      <Box at={[0, 0.8, 0]} size={[2, 1.6, 1.6]} color={main} />
      <Cone at={[0, 2.05, 0]} radius={1.55} height={0.9} color={accent} segments={4} />
      <Box at={[0, 0.5, 0.81]} size={[0.5, 1, 0.02]} color={wood} />
      <Box at={[0.6, 1.05, 0.81]} size={[0.4, 0.4, 0.02]} color="#ffe2a3" glow={lit ? 1 : 0.1} />
    </group>
  ),
  stall: ({ main, accent }) => (
    <group>
      <Box at={[0, 0.45, 0]} size={[1.3, 0.9, 0.8]} color={wood} />
      {[-0.6, 0.6].map((x) => <Box key={x} at={[x, 1.25, -0.35]} size={[0.08, 1.6, 0.08]} color={wood} />)}
      <Box at={[0, 1.95, 0]} size={[1.5, 0.08, 1.1]} color={main} />
      <Box at={[0, 1.85, 0.55]} size={[1.5, 0.2, 0.04]} color={accent} />
      <Box at={[-0.3, 0.95, 0.1]} size={[0.3, 0.12, 0.3]} color={accent} />
    </group>
  ),
  bridge: ({ main }) => (
    <group>
      <Box at={[0, 2.5, 0]} size={[16, 0.35, 1.6]} color={main} />
      <Box at={[0, 2.85, 0.75]} size={[16, 0.35, 0.1]} color={main} />
      <Box at={[0, 2.85, -0.75]} size={[16, 0.35, 0.1]} color={main} />
      {[-7.4, 7.4].map((x) => <Box key={x} at={[x, 1.2, 0]} size={[0.8, 2.4, 0.8]} color={stone} />)}
    </group>
  ),
  pier: ({ main }) => (
    <group>
      <Box at={[0, 0.06, 0]} size={[3.4, 0.12, 1.2]} color={main} />
      {[-1.4, 0, 1.4].flatMap((x) => [-0.55, 0.55].map((z) => <Box key={x + ':' + z} at={[x, -0.2, z]} size={[0.12, 0.5, 0.12]} color={wood} />))}
    </group>
  ),
  hill: ({ main }) => (
    <mesh position={[0, -0.25, 0]} scale={[1, 0.35, 1]}>
      <icosahedronGeometry args={[1.8, 1]} />
      <meshStandardMaterial color={main} roughness={0.95} flatShading />
    </mesh>
  ),
  gate: ({ main, accent, lit }) => (
    <group>
      {[-0.85, 0.85].map((x) => <Box key={x} at={[x, 0.8, 0]} size={[0.38, 1.6, 0.38]} color={main} />)}
      <Box at={[0, 1.7, 0]} size={[2.2, 0.26, 0.4]} color={main} />
      <mesh position={[0, 1.2, 0]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={lit ? 1.1 : 0.05} flatShading />
      </mesh>
    </group>
  ),
  boat: ({ main }) => (
    <group>
      <Box at={[0, 0.12, 0]} size={[1.5, 0.3, 0.6]} color={main} />
      <Box at={[0, 0.2, 0]} size={[1.2, 0.1, 0.45]} color={wood} />
      <Box at={[0.25, 0.32, 0]} size={[0.12, 0.05, 0.9]} color={wood} />
    </group>
  ),
  tree: ({ main }) => (
    <group>
      <Cylinder at={[0, 0.5, 0]} top={0.09} bottom={0.13} height={1} color={wood} />
      <mesh position={[0, 1.45, 0]}>
        <icosahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color={main} flatShading roughness={0.9} />
      </mesh>
    </group>
  ),
  lantern: ({ main, lit }) => (
    <group>
      <Box at={[0, 0.22, 0]} size={[0.22, 0.3, 0.22]} color={main} glow={lit ? 1.3 : 0.25} />
      <Box at={[0, 0.42, 0]} size={[0.26, 0.06, 0.26]} color={wood} />
    </group>
  ),
  lamp: ({ main, lit }) => (
    <group>
      <Cylinder at={[0, 1.1, 0]} top={0.05} bottom={0.07} height={2.2} color="#3b3d40" />
      <Box at={[0, 2.25, 0]} size={[0.3, 0.25, 0.3]} color={main} glow={lit ? 1.4 : 0.2} />
    </group>
  ),
  bench: ({ main }) => (
    <group>
      <Box at={[0, 0.42, 0]} size={[1.2, 0.08, 0.4]} color={main} />
      <Box at={[0, 0.72, -0.18]} size={[1.2, 0.35, 0.06]} color={main} />
      {[-0.5, 0.5].map((x) => <Box key={x} at={[x, 0.2, 0]} size={[0.08, 0.4, 0.35]} color="#3b3d40" />)}
    </group>
  ),
  rock: ({ main }) => (
    <mesh position={[0, 0.25, 0]} scale={[1, 0.7, 0.9]}>
      <dodecahedronGeometry args={[0.42, 0]} />
      <meshStandardMaterial color={main} flatShading roughness={0.95} />
    </mesh>
  ),
  crate: ({ main }) => <Box at={[0, 0.3, 0]} size={[0.6, 0.6, 0.6]} color={main} />,
  table: ({ main, accent }) => (
    <group>
      <Box at={[0, 0.75, 0]} size={[1.1, 0.08, 0.7]} color={main} />
      {[[-0.45, -0.28], [0.45, -0.28], [-0.45, 0.28], [0.45, 0.28]].map(([x, z]) => <Box key={x + ':' + z} at={[x, 0.37, z]} size={[0.07, 0.74, 0.07]} color={main} />)}
      <Cylinder at={[0.2, 0.85, 0]} top={0.07} bottom={0.06} height={0.14} color={accent} />
      <Box at={[-0.2, 0.8, 0.05]} size={[0.3, 0.02, 0.22]} color={paper} />
    </group>
  ),
  flower: ({ main }) => (
    <group>
      {[[0, 0], [0.25, 0.15], [-0.2, 0.2], [0.1, -0.22]].map(([x, z]) => (
        <group key={x + ':' + z} position={[x, 0, z]}>
          <Cylinder at={[0, 0.15, 0]} top={0.02} bottom={0.02} height={0.3} color="#4f7d45" />
          <mesh position={[0, 0.32, 0]}><icosahedronGeometry args={[0.08, 0]} /><meshStandardMaterial color={main} flatShading /></mesh>
        </group>
      ))}
    </group>
  ),
  marker: ({ main, accent }) => (
    <group>
      <Box at={[0, 0.45, 0]} size={[0.5, 0.9, 0.22]} color={main} />
      <Box at={[0, 0.6, 0.12]} size={[0.3, 0.3, 0.02]} color={accent} glow={0.3} />
    </group>
  ),
};

/** Default colors per recipe when the prompt names none. */
export const defaultColors: Record<RecipeId, string> = {
  lighthouse: '#efe9dc', tower: '#9c968b', house: '#d9c7a4', stall: '#b8573f', bridge: '#7d756c', pier: '#8a6a4a',
  hill: '#6f8a57', gate: '#5d5a52', boat: '#c9b48c', tree: '#4f7a47', lantern: '#f2b45a', lamp: '#ffe2a3', bench: '#8a6a4a',
  rock: '#8d8a83', crate: '#9a7550', table: '#8a6a4a', flower: '#d77a8f', marker: '#a9a397',
};
