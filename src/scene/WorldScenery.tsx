import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MeshStandardMaterial } from 'three';
import type { MemoryScene } from '../shared/memory-schema';
import { getMusicMotion } from './music-motion';
import { prefersReducedMotion, subscribeToReducedMotion } from './reduced-motion';
import { getWorldRecipe, worldAccents, worldVariants } from './world-recipes';
import type { WorldLayout, WorldPlacement } from './world-recipes';

const atmospheres = {
  daylight: { sky: '#a7b8b1', light: '#fff0ce', ambient: 1.1, key: 2.2, fog: [22, 44] },
  fog: { sky: '#748d8d', light: '#e1eed9', ambient: 1.2, key: 1.6, fog: [11, 30] },
  night: { sky: '#34374c', light: '#dedafb', ambient: 0.85, key: 1.55, fog: [12, 32] },
} as const;

export type WorldAtmosphere = keyof typeof atmospheres;

function WorldObject({ placement, lights }: {
  placement: WorldPlacement;
  lights: Set<MeshStandardMaterial>;
}) {
  const { parts } = getWorldRecipe(placement.recipe);
  const materials = useRef<(MeshStandardMaterial | null)[]>([]);

  useEffect(() => {
    const emissive = materials.current.filter((material) => material !== null);
    for (const material of emissive) lights.add(material);
    return () => { for (const material of emissive) lights.delete(material); };
  }, [lights, placement.recipe]);

  return (
    <group name={placement.id} position={[placement.at[0], 0, placement.at[1]]}
      rotation={[0, placement.heading * Math.PI / 2, 0]}
      scale={worldVariants[placement.variant ?? 'standard']}>
      {parts.map(({ at, size, color, shape, accent, emissive }, index) => {
        const paint = accent && placement.accent ? worldAccents[placement.accent] : color;
        return (
          <mesh key={index} position={at} scale={shape === 'hull' ? size : undefined}>
            {shape === 'cylinder' ? <cylinderGeometry args={[size[0] / 2, size[2] / 2, size[1], 8]} />
              : shape === 'cone' ? <coneGeometry args={[size[0] / 2, size[1], 8]} />
              : shape === 'hull' ? <cylinderGeometry args={[0.5, 0.34, 1, 6]} />
              : <boxGeometry args={size} />}
            <meshStandardMaterial
              ref={emissive ? (material) => { materials.current[index] = material; } : undefined}
              color={paint} roughness={0.9} flatShading
              emissive={emissive ? paint : '#000000'} emissiveIntensity={emissive ? 0.22 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function WorldScenery({ layout, atmosphere, activeAudio, music, reducedMotion = false }: {
  layout: WorldLayout;
  atmosphere: WorldAtmosphere;
  activeAudio: HTMLAudioElement | null;
  music?: MemoryScene['music'];
  reducedMotion?: boolean;
}) {
  const lights = useRef(new Set<MeshStandardMaterial>()).current;
  const systemReducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const invalidate = useThree(({ invalidate }) => invalidate);
  const animate = !!music?.meanEnergy && !!activeAudio && !reducedMotion && !systemReducedMotion;
  const { sky, light, ambient, key, fog } = atmospheres[atmosphere];
  const lanterns = atmosphere === 'night'
    ? layout.placements.filter(({ recipe }) => recipe === 'lamp').slice(0, 2)
    : [];

  useEffect(() => { invalidate(); }, [animate, activeAudio, music, invalidate]);

  useFrame(() => {
    const playing = animate && !activeAudio.paused && !activeAudio.ended && !activeAudio.seeking;
    const pulse = playing && music
      ? getMusicMotion(activeAudio.currentTime, music, { pulseGain: 0.24, motionSpeed: 1 }).scale - 1
      : 0;
    for (const material of lights) material.emissiveIntensity = 0.22 + pulse;
    if (playing) invalidate();
  });

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, ...fog]} />
      <ambientLight intensity={ambient} />
      <directionalLight position={[-7, 10, 6]} color={light} intensity={key} />
      {lanterns.map(({ id, at, variant }) => (
        <pointLight key={id} position={[at[0], 2.03 * worldVariants[variant ?? 'standard'], at[1]]}
          color="#ffb970" intensity={12} distance={5.5} />
      ))}
      {layout.placements.map((placement) => <WorldObject key={placement.id} placement={placement} lights={lights} />)}
    </>
  );
}
