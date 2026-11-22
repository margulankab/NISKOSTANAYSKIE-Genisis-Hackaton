import type { RecipeId } from './recipes';
import { recipes } from './recipes';
import { colorNames, relationKinds } from './layout-schema';
import type { Interpretation, Term } from './layout-schema';

type Noun = { recipe: RecipeId; note?: string; count?: number } | { zone: NonNullable<Term['zone']>; note?: string };

/** Vocabulary: words resolve to approved recipes or zones. A `note` marks an approximation. */
const nouns: Record<string, Noun> = {
  lighthouse: { recipe: 'lighthouse' }, beacon: { recipe: 'lighthouse', note: 'shown as a lighthouse' },
  tower: { recipe: 'tower' }, clocktower: { recipe: 'tower' }, castle: { recipe: 'tower', note: 'shown as a stone tower' },
  windmill: { recipe: 'tower', note: 'shown as a tower' }, spire: { recipe: 'tower', note: 'shown as a tower' },
  house: { recipe: 'house' }, cottage: { recipe: 'house' }, cabin: { recipe: 'house' }, hut: { recipe: 'house' },
  home: { recipe: 'house' }, building: { recipe: 'house' }, shop: { recipe: 'house', note: 'shown as a house' },
  cafe: { recipe: 'house', note: 'shown as a house' }, shed: { recipe: 'house', note: 'shown as a small house' },
  stall: { recipe: 'stall' }, booth: { recipe: 'stall' }, kiosk: { recipe: 'stall' }, stand: { recipe: 'stall' },
  market: { recipe: 'stall', count: 4 }, bazaar: { recipe: 'stall', count: 4 }, fair: { recipe: 'stall', count: 3, note: 'shown as stalls' },
  canopy: { recipe: 'canopy' }, awning: { recipe: 'canopy' }, shelter: { recipe: 'canopy' },
  bridge: { recipe: 'bridge' }, viaduct: { recipe: 'bridge' }, overpass: { recipe: 'bridge', note: 'shown as a bridge' },
  pier: { recipe: 'pier' }, dock: { recipe: 'pier' }, jetty: { recipe: 'pier' }, wharf: { recipe: 'pier' },
  boardwalk: { recipe: 'pier', note: 'shown as a pier' },
  hill: { recipe: 'hill' }, mound: { recipe: 'hill' }, slope: { recipe: 'hill' },
  cliff: { recipe: 'hill', note: 'shown as a hill' }, mountain: { recipe: 'hill', note: 'shown as a hill' },
  boat: { recipe: 'boat' }, rowboat: { recipe: 'boat' }, sailboat: { recipe: 'boat' }, dinghy: { recipe: 'boat' },
  canoe: { recipe: 'boat' }, kayak: { recipe: 'boat', note: 'shown as a rowboat' }, ship: { recipe: 'boat', note: 'shown as a small boat' },
  tree: { recipe: 'tree' }, pine: { recipe: 'tree' }, oak: { recipe: 'tree' }, birch: { recipe: 'tree' }, palm: { recipe: 'tree' },
  forest: { recipe: 'tree', count: 6, note: 'shown as a group of trees' }, woods: { recipe: 'tree', count: 5, note: 'shown as a group of trees' },
  grove: { recipe: 'tree', count: 4 },
  lantern: { recipe: 'lantern' }, candle: { recipe: 'lantern', note: 'shown as a lantern' },
  lamp: { recipe: 'lamp' }, streetlight: { recipe: 'lamp' }, streetlamp: { recipe: 'lamp' }, lamppost: { recipe: 'lamp' },
  bench: { recipe: 'bench' }, chair: { recipe: 'bench', note: 'shown as a bench' }, seat: { recipe: 'bench', note: 'shown as a bench' },
  rock: { recipe: 'rock' }, stone: { recipe: 'rock' }, boulder: { recipe: 'rock' },
  crate: { recipe: 'crate' }, box: { recipe: 'crate' }, barrel: { recipe: 'crate', note: 'shown as a crate' },
  cart: { recipe: 'crate', note: 'shown as a crate' }, basket: { recipe: 'crate', note: 'shown as a crate' },
  table: { recipe: 'table' }, desk: { recipe: 'table' },
  flower: { recipe: 'flower' }, bush: { recipe: 'flower', note: 'shown as flowers' },
  cove: { zone: 'water' }, beach: { zone: 'water' }, shore: { zone: 'water' }, sea: { zone: 'water' }, ocean: { zone: 'water' },
  bay: { zone: 'water' }, harbor: { zone: 'water' }, harbour: { zone: 'water' }, coast: { zone: 'water' }, water: { zone: 'water' },
  lake: { zone: 'water', note: 'shown as a shoreline' }, river: { zone: 'water', note: 'shown as a shoreline' },
  pond: { zone: 'water', note: 'shown as a shoreline' },
  room: { zone: 'indoor' }, kitchen: { zone: 'indoor' }, hall: { zone: 'indoor' }, bedroom: { zone: 'indoor' },
  library: { zone: 'indoor' }, inside: { zone: 'indoor' }, indoors: { zone: 'indoor' }, studio: { zone: 'indoor' },
  street: { zone: 'paved' }, plaza: { zone: 'paved' }, square: { zone: 'paved' }, alley: { zone: 'paved' },
  road: { zone: 'paved' }, town: { zone: 'paved' }, city: { zone: 'paved' }, station: { zone: 'paved' },
  park: { zone: 'grass' }, garden: { zone: 'grass' }, yard: { zone: 'grass' }, courtyard: { zone: 'grass' },
  outside: { zone: 'grass' }, outdoors: { zone: 'grass' }, meadow: { zone: 'grass' }, field: { zone: 'grass' }, grass: { zone: 'grass' },
};
const irregularPlurals: Record<string, string> = { benches: 'bench', boxes: 'box', bushes: 'bush', beaches: 'beach', woods: 'woods' };

const numbers: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, two: 2, pair: 2, couple: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, some: 3, several: 3, few: 3, many: 6, dozen: 12,
};
const determiners = new Set(['a', 'an', 'the', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'some', 'several', 'few', 'many', 'his', 'her', 'their', 'my', 'our', 'its', 'that', 'this', 'these', 'those', 'every', 'each']);
const time: Record<string, Interpretation['timeOfDay']> = {
  dawn: 'dawn', sunrise: 'dawn', morning: 'dawn', noon: 'day', afternoon: 'day', day: 'day', daylight: 'day', sunny: 'day',
  dusk: 'dusk', sunset: 'dusk', evening: 'dusk', twilight: 'dusk',
  night: 'night', midnight: 'night', moon: 'night', moonlight: 'night', moonlit: 'night', stars: 'night', starry: 'night', dark: 'night',
};
const weather: Record<string, Interpretation['weather']> = {
  fog: 'fog', foggy: 'fog', mist: 'fog', misty: 'fog', haze: 'fog', hazy: 'fog',
  rain: 'rain', rainy: 'rain', storm: 'rain', stormy: 'rain', drizzle: 'rain',
  snow: 'snow', snowy: 'snow', winter: 'snow', frost: 'snow', frozen: 'snow',
};
/** Russian time and weather cues, matched by word stem because Russian words inflect (ночь, ночью, ночной). */
const russianTime: [RegExp, Interpretation['timeOfDay']][] = [
  [/^(?:рассвет|восход|утр)/u, 'dawn'], [/^(?:полдень|полдн|днём|днем|дневн|солнечн)/u, 'day'],
  [/^(?:закат|вечер|сумер|сумрак)/u, 'dusk'], [/^(?:ноч|полноч|звёзд|звезд|лун)/u, 'night'],
];
const russianWeather: [RegExp, Interpretation['weather']][] = [
  [/^(?:туман|дымк|мгл)/u, 'fog'], [/^(?:дожд|ливн|ливен|гроз)/u, 'rain'], [/^(?:снег|снеж|зим|мороз)/u, 'snow'],
];
const russianCue = <T,>(cues: [RegExp, T][], word: string) => /[а-яё]/u.test(word) ? cues.find(([stem]) => stem.test(word))?.[1] : undefined;

const colorWords: Record<string, Term['color']> = {
  ...Object.fromEntries(colorNames.map((name) => [name, name])), gray: 'grey', golden: 'yellow', crimson: 'red', scarlet: 'red',
};
/** Multi-word relation cues are matched before single words. */
const relationCues: [string[], (typeof relationKinds)[number]][] = [
  [['next', 'to'], 'beside'], [['in', 'front', 'of'], 'front'], [['on', 'top', 'of'], 'above'], [['inside'], 'inside'],
  [['beside'], 'beside'], [['alongside'], 'beside'], [['near'], 'beside'], [['by'], 'beside'],
  [['beyond'], 'beyond'], [['behind'], 'beyond'], [['past'], 'beyond'],
  [['above'], 'above'], [['over'], 'above'], [['atop'], 'above'], [['overlooking'], 'above'],
  [['under'], 'under'], [['beneath'], 'under'], [['below'], 'under'], [['underneath'], 'under'],
];
const chainBreakers = new Set(['and', 'or', 'with', 'of', 'in', 'on', 'at', 'to', 'from', 'into', 'onto', 'where', 'while', 'is', 'are',
  'was', 'were', 'has', 'have', 'that', 'which', 'who', 'then', 'there', 'for', 'as', 'but']);

interface Token { word: string; start: number; end: number; sentence: number }

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let sentence = 0;
  for (const match of text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?|[.!?;,]/gu)) {
    const word = match[0].toLowerCase();
    if (/^[.!?;,]$/.test(word)) {
      if (word !== ',') sentence += 1;
      tokens.push({ word, start: match.index, end: match.index + 1, sentence });
      continue;
    }
    tokens.push({ word, start: match.index, end: match.index + match[0].length, sentence });
  }
  return tokens;
}

function lookupNoun(word: string): { noun: Noun; plural: boolean } | undefined {
  if (Object.hasOwn(nouns, word)) return { noun: nouns[word], plural: false };
  const singular = irregularPlurals[word] ?? (word.endsWith('ies') ? word.slice(0, -3) + 'y' : word.endsWith('s') ? word.slice(0, -1) : undefined);
  if (typeof singular === 'string' && Object.hasOwn(nouns, singular)) return { noun: nouns[singular], plural: true };
  return undefined;
}

const isWord = (token: Token | undefined) => token !== undefined && !/^[.!?;,]$/.test(token.word);

/** Parse a prompt into a bounded scene description with source spans. Pure and deterministic. */
export function parsePrompt(prompt: string): Interpretation {
  const tokens = tokenize(prompt);
  const terms: Term[] = [];
  const termAt = new Map<number, number>();
  const relationAt = new Map<number, { kind: (typeof relationKinds)[number]; length: number }>();
  let timeOfDay: Interpretation['timeOfDay'] = 'day';
  let weatherCue: Interpretation['weather'] = 'clear';

  for (let i = 0; i < tokens.length; i += 1) {
    const { word } = tokens[i];
    if (Object.hasOwn(time, word)) timeOfDay = time[word];
    else timeOfDay = russianCue(russianTime, word) ?? timeOfDay;
    if (Object.hasOwn(weather, word)) weatherCue = weather[word];
    else weatherCue = russianCue(russianWeather, word) ?? weatherCue;
    for (const [words, kind] of relationCues) {
      if (words.every((w, k) => tokens[i + k]?.word === w)) {
        relationAt.set(i, { kind, length: words.length });
        break;
      }
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const found = lookupNoun(token.word);
    if (!found) continue;
    // "night market": a time word directly before a known noun stays a modifier of that noun.
    const previous = tokens[i - 1];
    const next = tokens[i + 1];
    // "market stall": the first noun modifies the second; keep only the head.
    if (isWord(next) && lookupNoun(next.word) && !relationAt.has(i + 1) && 'recipe' in found.noun && 'recipe' in lookupNoun(next.word)!.noun) continue;
    // The nearest number within the noun phrase: "two oak trees", "a red rowboat".
    let quantity: number | undefined;
    for (let back = i - 1; back >= Math.max(0, i - 4) && isWord(tokens[back]) && quantity === undefined; back -= 1) {
      const word = tokens[back].word;
      quantity = numbers[word] ?? (/^\d+$/.test(word) ? Number(word) : undefined);
      if (determiners.has(word) || chainBreakers.has(word) || relationAt.has(back)) break;
    }
    // A collective noun keeps its own size: "a market" means several stalls.
    if (quantity === 1 && 'count' in found.noun && found.noun.count) quantity = undefined;
    let color: Term['color'] = null;
    for (let back = i - 1; back >= Math.max(0, i - 3) && isWord(tokens[back]); back -= 1) {
      if (colorWords[tokens[back].word]) { color = colorWords[tokens[back].word]; break; }
      if (determiners.has(tokens[back].word)) break;
    }
    // "the boat" after "a boat" refers to the same object.
    const article = tokens.slice(Math.max(0, i - 3), i).reverse().find((t) => determiners.has(t.word))?.word;
    const recipe = 'recipe' in found.noun ? found.noun.recipe : null;
    if (article === 'the' && recipe && terms.some((t) => t.recipe === recipe)) {
      termAt.set(i, terms.findIndex((t) => t.recipe === recipe));
      continue;
    }
    if (!recipe && 'zone' in found.noun && terms.some((t) => t.zone === (found.noun as { zone: string }).zone)) {
      termAt.set(i, terms.findIndex((t) => t.zone === (found.noun as { zone: string }).zone));
      continue;
    }
    const requested = quantity ?? ('count' in found.noun && found.noun.count ? found.noun.count : found.plural ? 3 : 1);
    const max = recipe ? recipes[recipe].maxCount : 1;
    const count = Math.max(1, Math.min(requested, max));
    let note = found.noun.note ?? null;
    if (recipe && requested > max) note = (note ? note + '; ' : '') + `${requested} requested, ${max} shown`;
    termAt.set(i, terms.length);
    terms.push({
      text: prompt.slice(token.start, token.end),
      span: { start: token.start, end: token.end },
      kind: recipe ? 'object' : 'zone',
      recipe,
      zone: 'zone' in found.noun ? found.noun.zone : null,
      status: note ? 'approximated' : 'rendered',
      note,
      count,
      color,
    });
  }

  // Unknown heads of noun phrases ("a carousel") are reported so the player can revise.
  for (let i = 0; i < tokens.length; i += 1) {
    if (!determiners.has(tokens[i].word) || terms.length >= 40) continue;
    let head = -1;
    for (let k = i + 1; k <= i + 4 && isWord(tokens[k]); k += 1) {
      const word = tokens[k].word;
      if (chainBreakers.has(word) || relationAt.has(k) || determiners.has(word)) break;
      head = k;
    }
    if (head < 0 || termAt.has(head)) continue;
    const word = tokens[head].word;
    if (time[word] || weather[word] || colorWords[word] || /^\d+$/.test(word) || numbers[word]) continue;
    if (terms.some((t) => t.span.start === tokens[head].start)) continue;
    termAt.set(head, terms.length);
    terms.push({
      text: prompt.slice(tokens[head].start, tokens[head].end),
      span: { start: tokens[head].start, end: tokens[head].end },
      kind: 'object', recipe: null, zone: null, status: 'unsupported',
      note: 'No builder for this yet', count: 1, color: null,
    });
  }

  const relations: Interpretation['relations'] = [];
  for (const [i, { kind, length }] of [...relationAt].sort(([a], [b]) => a - b)) {
    if (relations.length >= 20) break;
    const sentence = tokens[i].sentence;
    let subject: number | null = null;
    for (let k = i - 1; k >= 0 && tokens[k].sentence === sentence; k -= 1) {
      if (termAt.has(k)) { subject = termAt.get(k)!; break; }
    }
    let object: number | null = null;
    for (let k = i + length; k < tokens.length && tokens[k].sentence === sentence; k += 1) {
      if (relationAt.has(k)) break;
      if (termAt.has(k)) { object = termAt.get(k)!; break; }
    }
    // "by" and "near" are common in other senses; keep them only when they link two terms.
    if ((subject === null || object === null) && ['by', 'near', 'over', 'past'].includes(tokens[i].word)) continue;
    relations.push({
      kind,
      span: { start: tokens[i].start, end: tokens[i + length - 1].end },
      subject,
      object,
      status: subject !== null && object !== null && subject !== object
        && terms[subject].status !== 'unsupported' && terms[object].status !== 'unsupported' ? 'applied' : 'unsupported',
    });
  }

  const indoor = terms.some((t) => t.zone === 'indoor');
  const outdoor = terms.some((t) => t.zone === 'water' || t.zone === 'paved' || t.zone === 'grass'
    || (t.recipe !== null && ['lighthouse', 'bridge', 'pier', 'hill', 'boat', 'tree', 'lamp', 'stall', 'tower'].includes(t.recipe)));
  return {
    terms,
    relations,
    timeOfDay,
    weather: weatherCue,
    setting: indoor && outdoor ? 'mixed' : indoor ? 'indoor' : 'outdoor',
  };
}
