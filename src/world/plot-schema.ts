import { z } from 'zod';
import { sceneBeds } from './scene-direction';

const text = (max: number) => z.string().trim().min(1).max(max);
export const plotActions = ['approach', 'pick-up', 'hand-over', 'throw', 'catch', 'strike', 'open', 'depart', 'look', 'listen', 'react',
  'talk', 'laugh', 'mourn', 'comfort', 'sip', 'slide'] as const;
export const plotObjects = ['none', 'ball', 'bat', 'ticket', 'book', 'window', 'door', 'lantern', 'train', 'cup', 'water-slide'] as const;
export const plotMoods = ['calm', 'nostalgic', 'joyful', 'tense', 'subdued', 'curious', 'relieved'] as const;
export const plotAmbience = sceneBeds;
export const plotAnchors = ['arrival', 'activity', 'ending'] as const;

const action = z.strictObject({
  kind: z.enum(plotActions), actor: z.enum(['player', 'companion', 'offscreen']), object: z.enum(plotObjects),
  outcome: z.enum(['contact', 'over-fence']).optional(),
  line: text(110).optional(),
  together: z.boolean().optional(),
});
const moment = z.strictObject({
  anchor: z.enum(plotAnchors), title: text(65), actionLabel: text(48), description: text(200),
  anchorFeature: z.int().min(0).max(23).optional(),
  evidence: z.string().max(200),
  mood: z.enum(plotMoods), ambience: z.enum(plotAmbience),
  pace: z.enum(['linger', 'steady', 'quick']), framing: z.enum(['close', 'follow', 'wide']),
  input: z.enum(['press', 'timing']),
  actions: z.array(action).min(1).max(6),
});

export const plotSchema = z.strictObject({
  version: z.literal(1), opening: text(200), closing: text(200), companion: text(35).nullable(),
  companionKind: z.enum(['person', 'dog']).optional(),
  gathering: z.boolean().optional(),
  moments: z.array(moment).min(1).max(3),
});
export type Plot = z.infer<typeof plotSchema>;
export type PlotMoment = Plot['moments'][number];

const propsByAction: Partial<Record<PlotMoment['actions'][number]['kind'], readonly (typeof plotObjects)[number][]>> = {
  'pick-up': ['ball', 'bat', 'ticket', 'book', 'lantern'], 'hand-over': ['ball', 'bat', 'ticket', 'book', 'lantern'],
  throw: ['ball'], catch: ['ball'], strike: ['ball'], open: ['window', 'door', 'book'], depart: ['train', 'none'],
  talk: ['none'], laugh: ['none'], mourn: ['none'], comfort: ['none'], sip: ['cup'], slide: ['water-slide'],
};
const fenceHit = /\b(?:home[\s-]?run|over the fence|clear(?:ed|s)? the fence)\b/i;
const negatedHit = /\b(?:no|never|without|missed|failed|(?:did|could|would|was)\s+not|(?:did|could|would|was)n['’]t)\b/i;

export function plotProblems(plot: Plot, prompt: string) {
  const problems: string[] = [];
  let previous = -1;
  for (const moment of plot.moments) {
    const index = plotAnchors.indexOf(moment.anchor);
    if (index <= previous) problems.push('Use each moment location once, in arrival, activity, ending order.');
    previous = index;
    if (moment.evidence && !prompt.includes(moment.evidence)) problems.push('Quote evidence exactly from the scene prompt.');
    for (const { kind, actor, object, outcome, line, together } of moment.actions) {
      if (actor === 'companion' && !plot.companion) problems.push('Add a companion before assigning a companion action.');
      if (propsByAction[kind] && !propsByAction[kind].includes(object)) problems.push(`Use a supported object for ${kind}.`);
      if (outcome && kind !== 'strike') problems.push('Use a ball outcome only for a strike.');
      if (together === true && (kind !== 'slide' || !plot.companion || plot.companionKind === 'dog')) problems.push('A shared slide needs a human companion.');
      if (Boolean(line) !== (kind === 'talk') || kind === 'talk' && actor === 'offscreen') problems.push('Give each visible talk action one fictional subtitle.');
      if (kind === 'talk' && actor === 'companion' && plot.companionKind === 'dog') problems.push('A dog cannot speak.');
      if (kind === 'comfort' && (actor !== 'companion' || plot.companionKind !== 'dog')) problems.push('A dog must perform the comfort action.');
      if (['sip', 'slide', 'mourn'].includes(kind) && actor !== 'player') problems.push('The player performs sip, slide, and mourn actions.');
      if (outcome === 'over-fence' && !moment.evidence.split(/[.!?,;]|\bbut\b/i).some(clause => fenceHit.test(clause) && !negatedHit.test(clause))) {
        problems.push('An over-the-fence hit needs explicit source evidence.');
      }
    }
    if (moment.input === 'timing' && !moment.actions.some(({ kind }) => kind === 'catch')) {
      problems.push('Use timing only for a catch.');
    }
    if (moment.actions.some(({ kind }) => kind === 'strike') && moment.input !== 'press') problems.push('Start a remembered hit with one press.');
  }
  if (!plot.moments.some(({ evidence }) => evidence.trim())) problems.push('Include evidence for the main moment.');
  if (plot.companionKind && !plot.companion) problems.push('Name the companion role before choosing its type.');
  return [...new Set(problems)];
}
