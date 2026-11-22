import type { ComposeResult } from './compose-world';
import { memoryStorySchema } from './memory-story-schema';
import { recipes } from './recipes';
import { placementById } from './world-schema';
import type { PromptWorld } from './world-schema';

function localStory(world: PromptWorld) {
  // "met Mira", "with Nora", or a relation followed by a name ("my friend Aru", "моя подруга Аня").
  // Russian "встретил Миру" names her in the accusative; turn -у/-ю back into -а/-я.
  const russian = world.prompt.match(/(?:встретил|встретила|встретили)\s+([\p{Lu}][\p{L}'’-]{1,35})(?=\s|[.,!?]|$)/u)?.[1]
    ?.replace(/у$/, 'а').replace(/ю$/, 'я');
  const name = world.prompt.match(/(?:\bwith|\bmet|\bnamed|\bcalled)\s+([\p{Lu}][\p{L}'’-]{1,35})(?=\s|[.,!?]|$)/u)?.[1]
    ?? russian
    ?? world.prompt.match(/(?:friend|sister|brother|cousin|neighbou?r|друг|подруга|брат|сестра|сосед|соседка)\s+([\p{Lu}][\p{L}'’-]{1,35})(?=\s|[.,!?]|$)/u)?.[1];
  const isNight = world.interpretation.timeOfDay === 'night';
  const landmark = recipes[placementById(world.layout, world.layout.landmark.placementId).recipe].label;
  const [first, second] = world.layout.discoveries.map(({ placementId }) =>
    recipes[placementById(world.layout, placementId).recipe].label.toLowerCase());
  const scene = world.scene?.plan.intent;
  const family = scene?.settings[0];
  const role = family === 'coast' ? 'Pier keeper' : family === 'market' ? 'Market vendor'
    : family === 'water-park' ? 'Pool attendant' : family === 'park' ? 'Groundskeeper' : 'A familiar face';
  const place = family === 'water-park' ? 'Water park' : family === 'market' ? (isNight ? 'Night market' : 'Market') : landmark;
  const moods = memoryStorySchema.shape.mood.options;
  const words = new Set<string>(world.prompt.toLowerCase().match(/[\p{L}]+/gu));
  const firstDiscovery = family === 'coast' ? `Imagine the ${first} marking the edge of a place you knew well.`
    : family === 'market' ? `Imagine passing the ${first} as the stalls close and the last visitors head home.`
    : `Imagine stopping beside the ${first} long enough to see how the light falls around it.`;
  const secondDiscovery = family === 'coast' ? `From the ${second}, imagine looking back along the shore.`
    : family === 'market' ? `Picture the ${second} after the crowd has gone quiet.`
    : `Think of what you would notice about the ${second} if you came back tomorrow.`;
  return memoryStorySchema.parse({
    version: 1,
    source: 'local',
    originalPrompt: world.prompt,
    place,
    mood: moods.find(mood => words.has(mood)) ?? (scene?.mood === 'curious' ? 'calm' : scene?.mood) ?? (isNight ? 'subdued' : 'nostalgic'),
    npc: { name: name ?? role, outfit: isNight ? 'plum' : family === 'park' ? 'ochre' : 'sea' },
    opening: `Take a walk around the ${place.toLowerCase()}. Stop at the ${first} and ${second === first ? 'the other ' : ''}${second} before meeting ${name ?? (role === 'A familiar face' ? 'the person waiting nearby' : 'the ' + role.toLowerCase())}.`,
    firstDiscovery, secondDiscovery,
    greeting: `You made it to the ${landmark.toLowerCase()}. What will you take with you when you leave?`,
    firstReply: { choice: 'One small detail.', answer: 'Sometimes that is all it takes to find your way back here.' },
    secondReply: { choice: 'The way it felt to be here.', answer: 'Then stay another breath. There is no hurry.' },
    closing: 'Let the scene fade when you are ready to leave.',
  });
}

// A name after "with/met/named/called" must start with a capital letter (case-sensitive on purpose:
// "with a wooden table" is not a person); relation words match in any case.
const namedPerson = /\b(?:with|met|named|called)\s+[\p{Lu}][\p{L}'’-]{1,35}(?=\s|[.,!?]|$)/u;
const relation = /\b(?:friend|friends|mom|mum|mother|dad|father|grandma|grandpa|grandmother|grandfather|sister|brother|wife|husband|partner|girlfriend|boyfriend|teacher|neighbou?r|cousin|aunt|uncle|daughter|son)\b|(?:встретил|встретила|друг|друга|подруг|мам|пап|бабушк|дедушк|брат|сестр|сосед)/iu;

/** Whether a description mentions someone, so the world ends with a character instead of a landmark. */
export function mentionsPerson(prompt: string) {
  return namedPerson.test(prompt) || relation.test(prompt);
}

/** Write around the same resolved landmarks in either planning mode. */
export function withMemoryStory(result: ComposeResult): ComposeResult {
  return result.ok ? { ok: true, world: { ...result.world, story: localStory(result.world) } } : result;
}
