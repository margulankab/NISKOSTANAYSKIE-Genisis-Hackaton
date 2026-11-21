import { composeWorld } from './compose-world';
import type { ComposeResult } from './compose-world';
import { geminiStorySchema, memoryStorySchema } from './memory-story-schema';
import { parsePrompt } from './parse-prompt';
import { recipes } from './recipes';
import { placementById, promptWorldSchema } from './world-schema';
import type { PromptWorld } from './world-schema';

function localStory(world: PromptWorld) {
  const name = world.prompt.match(/(?:\bwith|\bmet|\bnamed|\bcalled)\s+([\p{Lu}][\p{L}'’-]{1,35})(?=\s|[.,!?]|$)/u)?.[1];
  const isNight = world.interpretation.timeOfDay === 'night';
  const landmark = recipes[placementById(world.layout, world.layout.landmark.placementId).recipe].label;
  const moods = memoryStorySchema.shape.mood.options;
  const words = new Set<string>(world.prompt.toLowerCase().match(/[\p{L}]+/gu));
  return memoryStorySchema.parse({
    version: 1,
    source: 'local',
    originalPrompt: world.prompt,
    place: landmark,
    mood: moods.find((mood) => words.has(mood)) ?? (isNight ? 'subdued' : 'nostalgic'),
    npc: { name: name ?? 'A familiar face', outfit: isNight ? 'plum' : 'sea' },
    opening: `Take a walk around the ${landmark.toLowerCase()}. Stop at the two marked objects before meeting ${name ?? 'the person waiting nearby'}.`,
    firstDiscovery: 'Pause for a moment. What about this detail made it stay with you?',
    secondDiscovery: 'Look back at the way you came. What would you notice if you walked it again?',
    greeting: 'You took your time getting here. What will you take with you when you leave?',
    firstReply: { choice: 'One small detail.', answer: 'Sometimes that is all it takes to find your way back here.' },
    secondReply: { choice: 'The way it felt to be here.', answer: 'Then stay another breath. There is no hurry.' },
    closing: 'Let the scene fade when you are ready to leave.',
  });
}

/** Use the same seeded, reachability-checked composer for both story sources. */
export function composeMemoryStory(prompt: string, id: string, modelOutput?: unknown): ComposeResult {
  const model = geminiStorySchema.safeParse(modelOutput);
  if (model.success) {
    const { scene, timeOfDay, weather, ...writing } = model.data;
    const result = composeWorld(scene, { id });
    if (result.ok) {
      const requested = parsePrompt(prompt).terms.filter(({ status }) => status !== 'unsupported');
      const placed = result.world.interpretation.terms.filter(({ status }) => status !== 'unsupported');
      const sharesSetting = !requested.length || requested.some((term) =>
        placed.some(({ recipe, zone }) => recipe === term.recipe && zone === term.zone));
      const parsed = promptWorldSchema.safeParse({
        ...result.world,
        interpretation: { ...result.world.interpretation, timeOfDay, weather },
        story: { ...writing, originalPrompt: prompt, version: 1, source: 'gemini' },
      });
      if (sharesSetting && parsed.success && writing.firstReply.choice !== writing.secondReply.choice) {
        return { ok: true, world: parsed.data };
      }
    }
  }
  const result = composeWorld(prompt, { id });
  return result.ok ? { ok: true, world: { ...result.world, story: localStory(result.world) } } : result;
}
