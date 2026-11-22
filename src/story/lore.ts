/**
 * Quests and narrator lines for a walk. Everything here is built locally and deterministically from
 * what the world already holds. Quotes are exact slices of the player's own words; every other line is
 * the narrator's voice, phrased as game text, never as a claim about what happened.
 */

export type Translate = (text: string, vars?: Record<string, string | number>) => string;

export interface DialogLine { speaker: string; text: string; quote?: string }
export interface Quest { id: 'first' | 'second' | 'end'; text: string }
export interface Lore {
  quests: Quest[];
  intro: DialogLine[];
  found: [DialogLine[], DialogLine[]];
  ready: DialogLine[];
  ending: DialogLine[];
}

export interface LoreInput {
  title: string;
  /** What the two discoveries are called, in walking order. */
  discoveries: [string, string];
  /** The place the walk ends at. */
  landmark: string;
  /** The player's words for each discovery (exact slices), if any. */
  excerpts: [string | undefined, string | undefined];
  /** A character waiting at the end (prompt stories). */
  character?: string;
  /** The day's first sentence, for day memories. */
  opening?: string;
  date?: string;
  timeOfDay?: string;
}

/** Stable choice among phrasings, so the same world always tells the same lines. */
function pick<T>(seed: string, options: readonly T[]) {
  let h = 0;
  for (const char of seed) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

/** The first sentence of a text, sliced exactly (up to 180 characters). */
export function firstSentence(text: string) {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?…](\s|$)/);
  const sentence = end < 0 ? trimmed : trimmed.slice(0, end + 1);
  return sentence.length > 180 ? sentence.slice(0, 177).trimEnd() + '…' : sentence;
}

export function buildLore(input: LoreInput, t: Translate): Lore {
  const [first, second] = input.discoveries.map((name) => name.toLowerCase()) as [string, string];
  const narrator = input.character ? input.character : input.date ? t('Your day') : t('The narrator');
  const ending = input.character
    ? t('Talk to {name}', { name: input.character })
    : t('Reach the {place}', { place: input.landmark.toLowerCase() });
  const greeting = pick(input.title, [
    t('This place was built from your words. Two things here still remember.'),
    t('Walk slowly. Two things here are waiting to be found.'),
    t('Everything here comes from what you wrote. Look for what stands out.'),
  ]);
  const intro: DialogLine[] = [{ speaker: narrator, text: input.date ? t('{date}. {title}.', { date: input.date, title: input.title }) : input.title }];
  if (input.opening) intro.push({ speaker: narrator, text: t('You wrote:'), quote: input.opening });
  intro.push({ speaker: narrator, text: greeting });
  const foundLine = (name: string, excerpt: string | undefined, index: number): DialogLine[] => {
    const line = index === 0
      ? t('The {thing}. One of two.', { thing: name })
      : t('The {thing}. That makes two.', { thing: name });
    return excerpt ? [{ speaker: narrator, text: line, quote: excerpt }] : [{ speaker: narrator, text: line }];
  };
  return {
    quests: [
      { id: 'first', text: t('Find the {thing}', { thing: first }) },
      { id: 'second', text: t('Find the {thing}', { thing: second }) },
      { id: 'end', text: ending },
    ],
    intro,
    found: [foundLine(first, input.excerpts[0], 0), foundLine(second, input.excerpts[1], 1)],
    ready: [{
      speaker: narrator,
      text: input.character
        ? t('{name} is waiting by the {place}.', { name: input.character, place: input.landmark.toLowerCase() })
        : t('Both found. The {place} is open now.', { place: input.landmark.toLowerCase() }),
    }],
    ending: [{ speaker: narrator, text: t('{title}: kept.', { title: input.title }) }],
  };
}
