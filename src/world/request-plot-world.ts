import { z } from 'zod';
import { composeSceneTemplate } from './compose-scene-template';
import { promptSchema } from './layout-schema';
import { plotSchema } from './plot-schema';
import { scenePlanSchema } from './scene-template-schema';
import { sceneDirectionSchema } from './scene-direction';
import { sitePlanSchema } from './site-plan';

export const plotSceneSchema = z.strictObject({ plan: scenePlanSchema, plot: plotSchema, direction: sceneDirectionSchema.optional(), site: sitePlanSchema.optional() });

export async function requestPlotWorld(prompt: string, id: string, cancel: AbortSignal) {
  const checked = promptSchema.safeParse(prompt);
  if (!checked.success) throw new Error(checked.error.issues[0].message);
  const signal = AbortSignal.any([cancel, AbortSignal.timeout(23_000)]);
  let response: Response;
  try {
    response = await fetch('/api/scene-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, fictional: true }), signal,
    });
    cancel.throwIfAborted();
  } catch (error) {
    cancel.throwIfAborted();
    throw new Error(signal.aborted ? 'Gemini took too long. Try again.' : 'Could not reach Gemini. Check your connection and retry.', { cause: error });
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      429: 'Gemini is busy or has reached its free quota. Try again later.',
      503: 'Gemini generation is unavailable on this deployment.',
      504: 'Gemini took too long. Try again.',
      422: 'Gemini could not stage this prompt. Try again or revise the scene.',
    };
    throw new Error(messages[response.status] ?? 'Gemini could not write this scene. Try again.');
  }
  const data = await response.json().catch(() => null);
  cancel.throwIfAborted();
  const parsed = plotSceneSchema.safeParse(data);
  if (!parsed.success) throw new Error('Gemini returned an invalid plot. Try again.');
  const { plot, plan, direction, site } = parsed.data;
  const composed = composeSceneTemplate(prompt, { id, plan, plot, direction, site, processing: 'gemini' });
  if (!composed.ok) throw new Error(composed.reason);
  const { layout } = composed.world;
  if (layout.geometryVersion !== 3) throw new Error('Gemini did not return a composed scene.');
  return { ...composed.world, layout: { ...layout, geometryVersion: layout.geometryVersion } };
}
