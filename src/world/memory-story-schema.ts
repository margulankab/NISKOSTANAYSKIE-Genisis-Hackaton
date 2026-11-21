import { z } from 'zod';
import { promptSchema } from './layout-schema';

const line = (limit: number) => z.string().trim().min(1).max(limit);
const reply = z.strictObject({ choice: line(80), answer: line(240) });
export const storyOutfits = ['sea', 'ochre', 'plum'] as const;
const storyWriting = z.strictObject({
  place: line(60),
  mood: z.enum(['calm', 'nostalgic', 'joyful', 'lively', 'subdued', 'tense']),
  opening: line(240),
  npc: z.strictObject({ name: line(40), outfit: z.enum(storyOutfits) }),
  firstDiscovery: line(200),
  secondDiscovery: line(200),
  greeting: line(240),
  firstReply: reply,
  secondReply: reply,
  closing: line(240),
});

export const memoryStorySchema = storyWriting.extend({
  version: z.literal(1),
  source: z.enum(['local', 'gemini']),
  originalPrompt: promptSchema,
});
export type MemoryStory = z.infer<typeof memoryStorySchema>;

export const storyStepSchema = z.enum(['dialogue', 'first', 'second']);
export type StoryStep = z.infer<typeof storyStepSchema>;
