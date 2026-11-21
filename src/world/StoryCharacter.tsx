import type { Point } from '../gameplay/layout';
import type { MemoryStory } from './memory-story-schema';

const jackets = { sea: '#326e71', ochre: '#b77736', plum: '#744b69' };

/** Standing low-poly character constructed from the bundled geometry. */
export function StoryCharacter({ position, outfit, ready }: {
  position: Point;
  outfit: MemoryStory['npc']['outfit'];
  ready: boolean;
}) {
  return (
    <group position={[position.x, 0, position.z]}>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.19, 0]}>
          <boxGeometry args={[0.14, 0.38, 0.19]} />
          <meshStandardMaterial color="#33333d" />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.19, 0.26, 0.53, 6]} />
        <meshStandardMaterial color={jackets[outfit]} flatShading />
      </mesh>
      <mesh position={[0, 0.87, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.09, 8]} />
        <meshStandardMaterial color="#e5ba78" />
      </mesh>
      <mesh position={[0, 1.04, 0]}>
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color="#b77e58" flatShading />
      </mesh>
      <mesh position={[0, 1.15, -0.02]}>
        <cylinderGeometry args={[0.12, 0.17, 0.1, 7]} />
        <meshStandardMaterial color="#332a36" />
      </mesh>
      {ready && (
        <mesh position={[0, 1.52, 0]}>
          <octahedronGeometry args={[0.12]} />
          <meshBasicMaterial color="#ffe2a0" />
        </mesh>
      )}
    </group>
  );
}
