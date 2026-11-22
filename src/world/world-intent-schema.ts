import { z } from 'zod';
import { sceneFamilies } from './catalog';
import { colorNames, relationKinds } from './layout-schema';
import { recipeIds } from './recipes';

export const districts = ['entry-left', 'entry-right', 'rear-left', 'rear-right', 'center'] as const;
export type District = typeof districts[number];
export function districtPoint(district: District, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const across = district.endsWith('left') ? .22 : district.endsWith('right') ? .78 : .5;
  const deep = district.startsWith('entry') ? .73 : district.startsWith('rear') ? .22 : .48;
  return { x: bounds.minX + across * (bounds.maxX - bounds.minX), z: bounds.minZ + deep * (bounds.maxZ - bounds.minZ) };
}
export const assetSchema = z.enum(recipeIds);
export const worldIntentSchema = z.strictObject({
  settings: z.array(z.enum(sceneFamilies)).min(1).max(3),
  features: z.array(z.strictObject({
    district: z.enum(districts).optional(),
    phrase: z.string().min(1).max(120),
    asset: assetSchema.nullable(),
    setting: z.enum(sceneFamilies),
    count: z.int().min(1).max(8),
    color: z.enum(colorNames).nullable(),
    origin: z.enum(['requested', 'inferred', 'imagined']),
  })).max(24),
  relations: z.array(z.strictObject({
    phrase: z.string().min(1).max(80),
    kind: z.enum(relationKinds),
    subject: z.int().min(0).max(23),
    object: z.int().min(0).max(23),
  })).max(20),
  exclusions: z.array(assetSchema).max(24),
  timeOfDay: z.enum(['dawn', 'day', 'dusk', 'night']),
  weather: z.enum(['clear', 'fog', 'rain', 'snow']),
  mood: z.enum(['calm', 'nostalgic', 'joyful', 'tense', 'subdued', 'curious']),
});
export type WorldIntent = z.infer<typeof worldIntentSchema>;
