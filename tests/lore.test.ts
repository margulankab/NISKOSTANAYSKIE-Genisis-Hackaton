import { describe, expect, it } from 'vitest';
import { mentionsPerson } from '../src/world/compose-memory-story';
import { composeSceneTemplate } from '../src/world/compose-scene-template';
import { withMemoryStory } from '../src/world/compose-memory-story';
import { buildLore, firstSentence } from '../src/story/lore';
import { translate } from '../src/i18n/i18n';

const t = (text: string, vars?: Record<string, string | number>) => translate('en', text, vars);

describe('one build button', () => {
  it.each([
    ['At dusk I met Mira near a lighthouse.', true],
    ['A walk in the park with my mom.', true],
    ['Вечером я встретил друга у фонтана.', true],
    ['A sunny park with a gazebo and benches.', false],
    ['A covered market under a railway bridge.', false],
    ['A quiet kitchen with a wooden table, then a garden with two oak trees.', false],
    ['A covered night market under a railway bridge, with lanterns above the stalls.', false],
  ])('%s → character: %s', (prompt, expected) => {
    expect(mentionsPerson(prompt)).toBe(expected);
  });
});

describe('lore', () => {
  const entry = 'The last light in the park held on after the paths emptied. I took the long way around the bench.';
  const lore = buildLore({
    title: 'The last light in the park', date: '2026-10-04', landmark: 'end of the path',
    discoveries: ['Photo frame', 'Note'], excerpts: ['the long way around the bench', undefined],
    opening: firstSentence(entry),
  }, t);

  it('names three quests after the day’s objects and the way out', () => {
    expect(lore.quests.map(({ text }) => text)).toEqual(['Find the photo frame', 'Find the note', 'Reach the end of the path']);
  });

  it('quotes the player’s words exactly and never invents them', () => {
    const quotes = [...lore.intro, ...lore.found.flat(), ...lore.ready, ...lore.ending].flatMap(({ quote }) => quote ? [quote] : []);
    expect(quotes).toEqual(['The last light in the park held on after the paths emptied.', 'the long way around the bench']);
    for (const quote of quotes) expect(entry).toContain(quote);
  });

  it('puts a waiting character into the quests and the cue', () => {
    const story = buildLore({ title: 'Cove', landmark: 'Lighthouse', discoveries: ['Rowboat', 'Pier'], excerpts: [undefined, undefined], character: 'Mira' }, t);
    expect(story.quests[2].text).toBe('Talk to Mira');
    expect(story.ready[0].text).toBe('Mira is waiting by the lighthouse.');
  });

  it('cuts long first sentences at 180 characters', () => {
    expect(firstSentence('word '.repeat(80)).length).toBeLessThanOrEqual(180);
  });
});

describe('prompt story', () => {
  const story = (prompt: string) => {
    const result = withMemoryStory(composeSceneTemplate(prompt, { id: '9a65a38e-7d16-4b4d-88c9-227983d45f40' }));
    if (!result.ok) throw new Error(result.reason);
    return result.world.story!;
  };

  it('finds a Russian name in the accusative and returns it to the nominative', () => {
    expect(story('Ночной парк у пруда, скамейка и фонарь. Я встретил Миру.').npc.name).toBe('Мира');
  });

  it('never names the same discovery twice in the opening', () => {
    const { opening } = story('Ночной парк у пруда, скамейка и фонарь. Я встретил Миру.');
    expect(opening).not.toMatch(/\b(\w+) and \1\b/);
  });
});
