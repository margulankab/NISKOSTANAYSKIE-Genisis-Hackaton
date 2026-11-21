import type { MemoryScene } from '../shared/memory-schema';

export const environmentDetails = {
  park: { name: 'Park', description: 'Low trees and a path establish the outdoor setting.' },
  room: { name: 'Room', description: 'A wall and divided window establish the interior.' },
  city: { name: 'City', description: 'Stepped building silhouettes establish the skyline.' },
} satisfies Record<MemoryScene['context']['environment'], { name: string; description: string }>;

export function getSceneStyle({ context, mood, seed, presentation }: MemoryScene) {
  const { accentPalette, photoLightness, lightWarmth, artifactSpacing } = presentation.parameters;
  const treatment = mood.primary === 'tense' ? 'angular'
    : mood.primary === 'nostalgic' || mood.primary === 'mixed' ? 'collage'
    : 'soft';

  return {
    environment: context.environment,
    treatment,
    accentPalette,
    ambientIntensity: 0.65 + 0.65 * photoLightness,
    lightWarmth,
    artifactSpacing,
    // Use unsigned seed bits to vary only decorative geometry.
    variation: Array.from({ length: 5 }, (_, index) =>
      ((Math.imul((seed + index + 1) ^ 0x9e3779b9, 0x45d9f3b) >>> 24) / 255)),
  };
}

export type SceneStyle = ReturnType<typeof getSceneStyle>;
