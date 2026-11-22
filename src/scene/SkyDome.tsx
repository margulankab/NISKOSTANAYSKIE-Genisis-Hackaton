import { useMemo } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, SphereGeometry } from 'three';

/** Per-atmosphere sky: zenith tint, celestial body and whether stars show. Horizon is the fog colour. */
const skies = {
  dawn: { zenith: '#6f7fb0', body: '#ffd9a8', bodySize: 5, stars: 0 },
  dusk: { zenith: '#2a2140', body: '#ff9a62', bodySize: 6.5, stars: 90 },
  rain: { zenith: '#5d6c7f', body: null, bodySize: 0, stars: 0 },
  snow: { zenith: '#b9c4cf', body: null, bodySize: 0, stars: 0 },
  daylight: { zenith: '#86c3b6', body: '#fff8e2', bodySize: 4, stars: 0 },
  fog: { zenith: '#5c7272', body: null, bodySize: 0, stars: 0 },
  night: { zenith: '#0d1024', body: '#efeadb', bodySize: 3.2, stars: 260 },
} as const;
export type SkyAtmosphere = keyof typeof skies;

const RADIUS = 80;

/** Deterministic 0–1 noise so every visit to the same world draws the same horizon and stars. */
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/**
 * Static sky behind every world: a vertex-coloured dome from horizon to zenith, a ring of low-poly
 * hills on the horizon, a sun or moon placed where the key light comes from, and stars at night.
 * Nothing here animates, so a world at rest renders identically frame to frame.
 */
export function SkyDome({ atmosphere, horizon, lightFrom }: {
  atmosphere: SkyAtmosphere;
  horizon: string;
  lightFrom: readonly [number, number, number];
}) {
  const sky = skies[atmosphere];
  const dome = useMemo(() => {
    const geometry = new SphereGeometry(RADIUS, 32, 16);
    const low = new Color(horizon), high = new Color(sky.zenith), mixed = new Color();
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i += 1) {
      const t = Math.min(1, Math.max(0, positions.getY(i) / RADIUS));
      mixed.copy(low).lerp(high, Math.pow(t, 0.6)).toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    return geometry;
  }, [horizon, sky.zenith]);

  const hills = useMemo(() => {
    const shade = new Color(horizon).lerp(new Color(sky.zenith), 0.35).multiplyScalar(0.72);
    const far = new Color(horizon).lerp(shade, 0.55);
    return Array.from({ length: 34 }, (_, i) => {
      const angle = (i / 34) * Math.PI * 2 + hash(i) * 0.12;
      const distance = 58 + hash(i + 40) * 10;
      return {
        key: i, position: [Math.sin(angle) * distance, -1, Math.cos(angle) * distance] as const,
        height: 5 + hash(i + 80) * 9, width: 7 + hash(i + 120) * 8,
        color: (i % 2 ? shade : far).getStyle(),
      };
    });
  }, [horizon, sky.zenith]);

  const hillGeometry = useMemo(() => new ConeGeometry(1, 1, 5), []);

  const stars = useMemo(() => {
    if (!sky.stars) return null;
    const points = new Float32Array(sky.stars * 3);
    for (let i = 0; i < sky.stars; i += 1) {
      const azimuth = hash(i + 500) * Math.PI * 2;
      const elevation = 0.12 + Math.pow(hash(i + 900), 0.7) * 1.35;
      const r = RADIUS - 2;
      points.set([Math.cos(elevation) * Math.sin(azimuth) * r, Math.sin(elevation) * r, Math.cos(elevation) * Math.cos(azimuth) * r], i * 3);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
    return geometry;
  }, [sky.stars]);

  const body = useMemo(() => {
    const [x, y, z] = lightFrom;
    const length = Math.hypot(x, Math.max(y, 3), z) || 1;
    const scale = (RADIUS - 6) / length;
    // Always hang it in front of the walking camera (which looks toward -z) so the player can see it.
    return [x * scale, Math.max(y, 3) * scale * 0.55 + 6, -Math.abs(z) * scale - 20] as const;
  }, [lightFrom]);

  return (
    <group>
      <mesh geometry={dome} renderOrder={-2}>
        <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
      </mesh>
      {stars && (
        <points geometry={stars} renderOrder={-1}>
          <pointsMaterial color="#fffbe8" size={atmosphere === 'night' ? 2 : 1.4} sizeAttenuation={false} fog={false}
            transparent opacity={atmosphere === 'night' ? 0.9 : 0.5} depthWrite={false} />
        </points>
      )}
      {sky.body && (
        <group position={body}>
          <mesh renderOrder={-1} onUpdate={(mesh) => mesh.lookAt(0, 0, 0)}>
            <circleGeometry args={[sky.bodySize, 20]} />
            <meshBasicMaterial color={sky.body} fog={false} depthWrite={false} />
          </mesh>
          <mesh renderOrder={-1} onUpdate={(mesh) => mesh.lookAt(0, 0, 0)} position={[0, 0, 0]}>
            <ringGeometry args={[sky.bodySize * 1.15, sky.bodySize * 1.9, 20]} />
            <meshBasicMaterial color={sky.body} fog={false} transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </group>
      )}
      {hills.map(({ key, position, height, width, color }) => (
        <mesh key={key} geometry={hillGeometry} position={[position[0], position[1] + height / 2, position[2]]}
          scale={[width, height, width]} rotation={[0, key, 0]}>
          <meshBasicMaterial color={color} fog={false} />
        </mesh>
      ))}
    </group>
  );
}
