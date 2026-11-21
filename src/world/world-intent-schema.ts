import { z } from 'zod';
import { sceneFamilies } from './catalog';
import { colorNames, relationKinds } from './layout-schema';
import { recipeIds } from './recipes';

export const assetSchema = z.enum(recipeIds);
export const worldIntentSchema = z.strictObject({
  settings: z.array(z.enum(sceneFamilies)).min(1).max(3),
  features: z.array(z.strictObject({
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
