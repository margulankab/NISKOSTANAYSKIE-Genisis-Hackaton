import type { Color } from 'three';
import type { SceneStyle } from './scene-style';

function Block({ at, size, color }: {
  at: [number, number, number];
  size: [number, number, number];
  color: Color;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

export function EnvironmentBackdrop({ environment, variation, deck, accent, secondary }: {
  environment: SceneStyle['environment'];
  variation: SceneStyle['variation'];
  deck: Color;
  accent: Color;
  secondary: Color;
}) {
  const rail = deck.clone().lerp(secondary, 0.4);
  const detail = deck.clone().lerp(accent, 0.4);

  if (environment === 'park') {
    return (
      <group>
        <mesh position={[0, -0.13, -0.66]} rotation={[0, -0.09, 0]}>
          <boxGeometry args={[4.55, 0.014, 0.35]} />
          <meshStandardMaterial color={detail} />
        </mesh>
        {[-1.83, -0.86, 0.83, 1.78].map((x, index) => {
          const size = 0.21 + variation[index] * 0.12;
          return (
            <group key={x} position={[x, -0.14, -1.13]}>
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.035, 0.052, 0.3, 6]} />
                <meshStandardMaterial color={detail} />
              </mesh>
              <mesh position={[0, 0.3 + size * 0.45, 0]}>
                <icosahedronGeometry args={[size, 0]} />
                <meshStandardMaterial color={index % 2 ? rail : secondary} flatShading />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (environment === 'room') {
    const x = (variation[0] - 0.5) * 0.4;
    return (
      <group>
        <Block at={[0, 0.43, -1.29]} size={[4.54, 1.14, 0.15]} color={rail} />
        <Block at={[0, -0.04, -1.18]} size={[4.56, 0.12, 0.07]} color={detail} />
        <Block at={[x, 0.58, -1.28]} size={[1.44, 0.67, 0.14]} color={detail} />
        <Block at={[x, 0.58, -1.197]} size={[1.25, 0.49, 0.035]} color={secondary} />
        <Block at={[x, 0.58, -1.17]} size={[0.055, 0.52, 0.03]} color={detail} />
        <Block at={[x, 0.58, -1.17]} size={[1.28, 0.055, 0.03]} color={detail} />
        <Block at={[x, 0.31, -1.15]} size={[1.55, 0.075, 0.21]} color={detail} />
      </group>
    );
  }

  return (
    <group>
      <Block at={[0, -0.1, -1.04]} size={[4.55, 0.08, 0.7]} color={rail} />
      {[-1.87, -0.89, 0, 0.91, 1.86].map((x, index) => {
        const height = 0.36 + variation[index] * 0.46 + (index === 2 ? 0.26 : 0);
        const width = index % 2 ? 0.55 : 0.72;
        return (
          <group key={x}>
            <Block at={[x, height / 2 - 0.06, -1.13]} size={[width, height, 0.42]} color={index % 2 ? detail : secondary} />
            <Block at={[x, height - 0.02, -1.13]} size={[width * 0.55, 0.08, 0.28]} color={rail} />
            {[0.36, 0.66].flatMap((row) => [-0.15, 0.15].map((column) => (
              <Block
                key={row + '/' + column}
                at={[x + column * width, height * row - 0.06, -0.91]}
                size={[width * 0.16, 0.055, 0.025]}
                color={index % 2 ? secondary : accent}
              />
            )))}
          </group>
        );
      })}
    </group>
  );
}
