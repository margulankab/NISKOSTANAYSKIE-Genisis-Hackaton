import { describe, expect, it, vi } from 'vitest';
import { planGeminiPlot } from '../server/plot-gateway';
import { simulatedPlot } from '../e2e/support/plot-fixtures';
import { blocked } from '../src/gameplay/controller';
import { catalog } from '../src/world/catalog';
import { composeSceneTemplate } from '../src/world/compose-scene-template';
import { promptLength, promptSchema, toWalkLayout } from '../src/world/layout-schema';
import { privateScenePlan } from '../src/world/local-scene-plan';
import { originalModelIds, originalModels } from '../src/world/original-models';
import { routeProblems } from '../src/world/route';
import { promptWorldSchema } from '../src/world/world-schema';

const id = 'e6e82daa-00d5-4f08-8b96-aaabaf2ad349';
const examples = [
  'park', 'water park', 'waterpark', 'neighborhood', 'coast', 'cavern', 'woodland', 'café', 'market',
  'historical street', 'sci-fi interior', 'farm', 'аквапарк', 'парк',
  'A water park at night with two slides and no splash pad',
  'A greenhouse inside a lunar station, with a fern garden beyond the airlock',
  'At dusk I met Mira by a lighthouse above a foggy cove. A red rowboat was beside a pier. Two lanterns stood on the shore.',
  'At night I met Sam at a market under a railway bridge. Two stalls stood beside the bridge with a yellow lantern and a crate.',
  'A quiet kitchen opened onto a garden at dawn. A table stood in the kitchen. A bench and flowers waited in the garden.',
  'A foggy cove with a red rowboat beside a pier and a levitating observatory.',
  'A woodland with a cabin beside a fern. A crystal cave was beyond the cabin.',
  'Park at dawn with a gazebo and two blue benches.',
  'A cafe with a tea set, a window and a street outside.',
  'A farm with a windmill, haystacks and a well.',
  'A moon station and a silver rover by the airlock.',
  'A market at dusk with a cabinet and a lantern.',
  'An early park with a gazebo in front of a grove and azaleas beside a planter.',
  'On the coast a windmill stood beside a barn and two haystacks.',
  'A forest where a cavern stood beside a clearing, with lanterns and a mushroom.',
  'A workshop beside a city street, with a writing desk in the room and a fire hydrant at the corner.',
  'A market with a canopy beyond the station facade, a bench and three crates inside the stall.',
  '🌳 парк с фонтаном',
];

function compose(prompt: string) {
  const result = composeSceneTemplate(prompt, { id });
  expect(result.ok, result.ok ? undefined : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}

describe('scene template composition', () => {
  it.each(examples)('builds a replayable route for %s', prompt => {
    const world = compose(prompt);
    expect(world.prompt).toBe(prompt);
    expect(promptWorldSchema.parse(JSON.parse(JSON.stringify(world))).layout).toEqual(world.layout);
    expect(routeProblems(toWalkLayout(world.layout))).toEqual([]);
    expect(world.layout.paths).toHaveLength(3);
  });

  it('accepts graphemes and preserves exact input, while refusing blanks and overlong payloads', () => {
    const words = '👨‍👩‍👧‍👦 '.repeat(40) + ' парк ';
    expect(promptSchema.parse(words)).toBe(words);
    expect(promptLength('👨‍👩‍👧‍👦')).toBe(1);
    expect(promptSchema.safeParse(' \u200b\n').success).toBe(false);
    expect(promptSchema.safeParse('é'.repeat(601)).success).toBe(false);
    expect(promptSchema.safeParse('👨‍👩‍👧‍👦'.repeat(600)).success).toBe(false);
    expect(composeSceneTemplate('undefined nowhere', { id }).ok).toBe(false);
    expect(composeSceneTemplate('🪐', { id }).ok).toBe(false);
  });

  it('keeps water unsupported and respects an excluded splash pad with two slides', () => {
    const world = compose(examples[14]);
    const { layout, scene } = world;
    const basin = layout.placements.find(p => p.recipe === 'pool-basin')!;
    expect(layout.profile).toBe('water-park');
    expect(blocked(basin, toWalkLayout(layout))).toBe(true);
    expect(layout.placements.filter(p => p.recipe === 'tube-slide')).toHaveLength(2);
    expect(layout.placements.some(p => p.recipe === 'splash-pad')).toBe(false);
    expect(world.interpretation.timeOfDay).toBe('night');
    expect(scene?.plan.intent.exclusions).toContain('splash-pad');
  });

  it('reports unattainable details, applies color, and uses an actual connected door', () => {
    const coastal = compose(examples[19]);
    expect(coastal.scene?.coverage.some(item => item.status === 'missing')).toBe(true);
    expect(coastal.layout.placements.find(p => p.recipe === 'boat')?.color).toEqual([196, 64, 52]);
    const hybrid = compose(examples[15]);
    expect(hybrid.layout.indoor).toBeTruthy();
    expect(hybrid.layout.placements.map(p => p.recipe)).toEqual(expect.arrayContaining(['airlock', 'dome', 'fern']));
  });

  it('rejects tampered templates, invalid support, invented evidence and substitutions', () => {
    const plan = privateScenePlan('water park')!;
    const attempts = [
      { ...plan.template.groups[0], asset: 'https://example.test/asset' },
      { ...plan.template.groups[0], asset: 'pool-basin', zone: 0 },
      { ...plan.template.groups[0], code: 'mesh()' },
      { ...plan.template.groups[0], zone: 30 },
    ];
    for (const group of attempts) {
      const invalid = structuredClone(plan);
      const input = { ...invalid, template: { ...invalid.template, groups: [group, ...invalid.template.groups.slice(1)] } };
      expect(composeSceneTemplate('water park', { id, plan: input, processing: 'gemini' }).ok).toBe(false);
    }
    expect(composeSceneTemplate('water park with no cabana', { id, plan }).ok).toBe(false);
  });

  it('uses one model request and performs a single targeted repair', async () => {
    const plan = privateScenePlan('park')!;
    const plot = simulatedPlot('park');
    const complete = vi.fn().mockResolvedValueOnce({ groups: [] }).mockResolvedValueOnce({ intent: plan.intent, plot });
    await expect(planGeminiPlot('park', complete, AbortSignal.timeout(1000))).resolves.toEqual({ plan, plot });
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][0].correction).toContain('plot');
  });

  it('ships at least 100 distinct original authored templates with finite geometry and credits', () => {
    const silhouette = new Set(originalModelIds.map(id => JSON.stringify(originalModels[id].parts.map(({ color, ...part }) => part))));
    expect(silhouette.size).toBe(originalModelIds.length);
    expect(silhouette.size).toBeGreaterThanOrEqual(100);
    expect(new Set(catalog.map(asset => asset.id)).size).toBe(catalog.length);
    for (const id of originalModelIds) {
      const asset = catalog.find(entry => entry.id === id)!;
      expect(asset.license && asset.support.length && asset.aliases.length).toBeTruthy();
      for (const part of originalModels[id].parts) {
        expect(part.at.every(Number.isFinite) && part.size.every(size => Number.isFinite(size) && size > 0)).toBe(true);
      }
    }
  });
});
