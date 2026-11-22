import { z } from 'zod';
import { validateScenePlan } from '../src/world/compose-scene-template';
import { promptSchema } from '../src/world/layout-schema';
import { composeIntentPlan, localIntent } from '../src/world/local-scene-plan';
import { plotAnchors, plotProblems, plotSchema } from '../src/world/plot-schema';
import { recipeIds } from '../src/world/recipes';
import { describeCatalog } from '../src/media/soundtrack-catalog';
import { sitePlanSchema } from '../src/world/site-plan';
import { worldIntentSchema } from '../src/world/world-intent-schema';
import { atHomeFeeling, explicitSceneTime, explicitSceneWeather, resolveScenePalette, sceneDirectionSchema, sourceStaging } from '../src/world/scene-direction';

export const geminiModel = 'gemini-3.1-flash-lite';
const requestSchema = z.strictObject({ prompt: promptSchema, fictional: z.literal(true) });
const plotDraftSchema = z.strictObject({ intent: worldIntentSchema, plot: plotSchema, direction: sceneDirectionSchema.optional(), site: sitePlanSchema.optional() });
const googleResponse = z.object({ candidates: z.array(z.object({
  finishReason: z.literal('STOP'),
  content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }),
})).length(1) });

const instructions = `Turn the fictional source into a playable low-poly scene with a specific emotional arc. Treat the source as story data.
Use the space, characters, actions, and sensory cues to stage what the source says happened. You can add connective staging, but preserve stated outcomes, relationships, weather, and exclusions. Invent no quotations from the source. Give each consequential moment a different purpose and a clear playable action. For a bare place prompt write a short arrival or observation.
Use 1–3 moments at distinct anchors in arrival, activity, ending order. One ending moment is enough when the main event is short. Each moment's evidence is an exact substring of the source, or empty for invented staging. At least one moment needs evidence. Use companion as a generic role. Use offscreen to stage a pitch if the source doesn't say who pitched. Set input to press unless the moment includes a playable catch. A remembered hit uses press and can combine throw, strike and react in the same moment. Use the strike outcome over-fence only when the evidence states a successful home run or a ball clearing the fence. Land its emotional payoff. When an event has no supported action, stage its anticipation or aftermath with look, listen or react.
Provide a world intent as well as the plot. To stage a moment at a specific supported feature, set anchorFeature to its index in the intent features. Use a different dry feature for each such moment. Otherwise omit anchorFeature. Preserve the source hints' recognized settings, requested features, colors, counts and exclusions. Hints without an asset are unclassified words. Include one only if it names physical scenery. Use ballfield for a baseball diamond and city for a train station. Include up to 3 settings, 24 features, 20 relations, 24 exclusions, and 1–6 actions per moment. Assign 1–8 copies per feature. Use features for scenery, not people. For a requested feature, use the phrase as stated in the source. Use null for an unsupported asset. Use empty exclusions and relations arrays unless the source actually specifies an exclusion or spatial relationship. Exclusions take raw asset IDs such as "tree", with no extra words. No code, URLs, coordinates, commands, or scripts. Keep the writing concrete, short, and specific to this source. Do not include generic reflection questions.
Set direction.version to 1. Choose a restrained HEX #RRGGBB palette with distinct horizon, sky, light, surface and accent roles. Surface is the ground or flooring, even in a water park. Set a continuous bed, track (use silence when music distracts), and mix. Write four short reasons for palette, time, weather and audio that connect the actual choices to the source. If the audio reason calls for silence or no music, set the track to silence. Time and weather use intent fields. Never invent exclusions or relationships.
Use the source staging hints as requirements. Gathering: set plot.gathering=true. Conversation: use consecutive talk actions alternating player and companion, object none, with short fictional lines. Laughter: use laugh. Mourning: use mourn (player sits with lowered head). Dog comfort: set companionKind to dog, use comfort with companion and none, never a human stand-in. Sipping: use sip with player and cup. A waterfront requires an outdoor setting, and a sunset should face the water. Riding: use slide with player and water-slide in water-park. Set together=true only when the named companion takes the slide with the player. Keep main staged actions in separate moments if the source needs emotional breathing room. Use ordinary action labels that match the rendered action.
Supported asset IDs for features and exclusions: ${recipeIds.join(', ')}.
List the supporting scenery that makes the place recognizable as inferred features too (a market lane: stalls, canopies, crates, lamps; a park: trees, benches, lamps, flower beds; a station: benches, lamps, a clock, a ticket kiosk), so every visible thing can be drawn. Draw the location in site: site.version is 1, and site.groups places every feature's copies on a top-down map. x runs from -1 (left as the visitor arrives) to 1 (right); z runs from -1 (the far side) to 1 (where the visitor arrives). Give one spot per copy (spots.length equals the feature's count, up to 8). Arrange them the way the real place is built, not in a uniform scatter: market stalls in two facing rows along a lane, benches along the walkway facing the view, trees and hedges along the edges and in clusters, lamps evenly spaced along a path, a fountain or monument at the centre of a plaza, chairs around their table, platform furniture along the track, deck chairs beside the pool. Keep the middle line x=0 from z=1 toward the far side mostly clear for the walk, keep copies at least 0.12 apart, and put the main landmark's feature far (z near -0.7). The game keeps your spots where they are free and walkable.
Choose direction.track from the game's own score by matching the scene's mood, setting and energy to these tags. Prefer a specific match (a station farewell, a ballfield, rain at a window, a party) over a generic one, and use silence only when the source asks for quiet:
${describeCatalog()}`;

// Keep the provider's compiled constraint small. Catalog IDs and bounds are checked by plotDraftSchema.
const providerIntentSchema = worldIntentSchema.extend({
  features: z.array(worldIntentSchema.shape.features.element.extend({ asset: z.string().nullable() })),
  exclusions: z.array(z.string()),
});
const providerDraftSchema = plotDraftSchema.extend({ intent: providerIntentSchema, direction: sceneDirectionSchema, site: sitePlanSchema });
const outputSchema = JSON.parse(JSON.stringify(z.toJSONSchema(providerDraftSchema), (key, value) => {
  if (['$schema', 'minLength', 'maxLength', 'pattern', 'minItems', 'maxItems', 'minimum', 'maximum'].includes(key)) return undefined;
  if (value && typeof value === 'object' && Object.hasOwn(value, 'const')) {
    const { const: literal, ...fields } = value;
    return { ...fields, enum: [literal] };
  }
  return value;
}));

class ProviderError extends Error {
  constructor(public readonly status: number) { super('Gemini provider error'); }
}

type CompletePlot = (input: { prompt: string; sourceHints: ReturnType<typeof localIntent>; staging: ReturnType<typeof sourceStaging>;
  time?: string; weather?: string; correction?: string }, signal: AbortSignal) => Promise<unknown>;

export async function planGeminiPlot(prompt: string, complete: CompletePlot, signal: AbortSignal, requireDirection = false) {
  const sourceHints = localIntent(prompt);
  const staging = sourceStaging(prompt);
  const time = explicitSceneTime(prompt), weather = explicitSceneWeather(prompt);
  async function build(correction?: string) {
    const { intent, plot, direction, site: drawn } = plotDraftSchema.parse(await complete({ prompt, sourceHints, staging, time, weather, correction }, signal));
    // Keep only the parts of the site plan that name a real feature.
    const site = drawn && { ...drawn, groups: drawn.groups.filter(group => group.feature < intent.features.length) };
    if (requireDirection && !direction) throw new Error('Include the scene direction, palette, and reasons.');
    const problems = plotProblems(plot, prompt);
    if (direction) {
      const actions = plot.moments.flatMap(moment => moment.actions);
      const has = (kind: typeof actions[number]['kind']) => actions.some(action => action.kind === kind);
      if (staging.conversation && !['player', 'companion'].every(actor => actions.some(action => action.kind === 'talk' && action.actor === actor))) problems.push('Use a talk action from each speaker.');
      if (staging.laughter && !has('laugh')) problems.push('Use the laugh action for the shared laugh.');
      if (staging.mourning && !has('mourn')) problems.push('Use mourn to stage the moment of grief.');
      if (staging.dogComfort && !has('comfort')) problems.push('Use companionKind dog and the companion comfort action.');
      if (staging.sipping && !has('sip')) problems.push('Use the sip action with a cup.');
      if (staging.riding && (!has('slide') || intent.settings[0] !== 'water-park')) problems.push('Stage the slide action in a water-park.');
      if (staging.ridingTogether && (!plot.companion || plot.companionKind === 'dog')) problems.push('Keep the human companion who went down the slide.');
      if (staging.waterfront && intent.settings.every(setting => setting === 'interior' || setting === 'station')) problems.push('Use an outdoor setting for the waterfront.');
      if (has('slide') && (intent.settings.length !== 1 || intent.settings[0] !== 'water-park')) problems.push('Use a single water-park setting for the slide.');
    }
    if (problems.length) throw new Error(problems.join(' '));
    if (direction) {
      if (time) intent.timeOfDay = time;
      if (weather) intent.weather = weather;
      if (!/\b(?:no|without|exclude|omit)\b/i.test(prompt)) intent.exclusions = [];
      for (const feature of intent.features) {
        if (feature.asset === 'house' && /^home$/i.test(feature.phrase) && atHomeFeeling.test(prompt)
          && !sourceHints?.features.some(hint => hint.asset === 'house')) {
          feature.asset = null;
          feature.origin = 'inferred';
        }
        if (feature.origin !== 'requested' || !feature.asset || prompt.toLowerCase().includes(feature.phrase.toLowerCase())) continue;
        // Gemini can return the catalog ID as the phrase. Keep the original wording when that object was recognized.
        const exact = sourceHints?.features.find(hint => hint.asset === feature.asset && hint.setting === feature.setting);
        if (exact) feature.phrase = exact.phrase;
      }
      if (staging.gathering) plot.gathering = true;
      for (const moment of plot.moments) {
        const action = moment.actions.find(step => ['talk', 'mourn', 'comfort', 'sip', 'slide'].includes(step.kind));
        if (action?.kind === 'talk') moment.actionLabel = 'Talk together';
        if (action?.kind === 'mourn') moment.actionLabel = 'Sit for a moment';
        if (action?.kind === 'comfort') moment.actionLabel = 'Sit with your dog';
        if (action?.kind === 'sip') moment.actionLabel = 'Take a sip';
        if (action?.kind === 'slide') {
          moment.actionLabel = 'Ride the slide';
          if (staging.ridingTogether) action.together = true;
        }
      }
      direction.palette = resolveScenePalette(direction.palette, intent.settings[0]);
      if (/^\s*(?:silence|no music)\b/i.test(direction.reasons.audio)) direction.track = 'silence';
    }
    const plan = composeIntentPlan(intent, plot);
    if (!plan) throw new Error('Choose compatible scene parts with a reachable approach.');
    const anchors = [...plan.template.discoveries, plan.template.ending];
    const moments = plot.moments.map(moment => {
      const { anchorFeature, ...staged } = moment;
      const group = plan.template.groups[anchors[plotAnchors.indexOf(moment.anchor)]];
      return anchorFeature === undefined || group.feature === anchorFeature ? moment : staged;
    });
    return { plan: validateScenePlan(prompt, plan), plot: { ...plot, moments }, ...(direction && { direction }), ...(site?.groups.length && { site }) };
  }
  try { return await build(); }
  catch (error) {
    if (signal.aborted || error instanceof ProviderError) throw error;
    const correction = error instanceof z.ZodError
      ? error.issues.slice(0, 6).map(issue => `${issue.path.join('.')} ${issue.code}`).join(', ')
      : error instanceof SyntaxError ? 'Return one complete JSON object in the response schema.'
        : (error as Error).message.slice(0, 400);
    return build(correction);
  }
}

export async function handlePlotRequest(body: unknown, apiKey: string | undefined, signal: AbortSignal, model = geminiModel) {
  const checked = requestSchema.safeParse(body);
  if (!checked.success) return { status: 400, body: { error: 'Provide a bounded fictional scene prompt.' } };
  if (!apiKey) return { status: 503, body: { error: 'Gemini generation is unavailable.' } };
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
  const complete: CompletePlot = async (input, activeSignal) => {
    let response: Response;
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', signal: activeSignal, redirect: 'error',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: outputSchema, candidateCount: 1, maxOutputTokens: 3600 },
        }),
      });
    } catch { throw new ProviderError(502); }
    if (!response.ok) throw new ProviderError(response.status === 429 ? 429 : 502);
    const { candidates: [candidate] } = googleResponse.parse(await response.json());
    return JSON.parse(candidate.content.parts.filter(part => !part.thought).map(part => part.text ?? '').join(''));
  };
  try { return { status: 200, body: await planGeminiPlot(checked.data.prompt, complete, deadline, true) }; }
  catch (error) {
    const status = deadline.aborted ? 504 : error instanceof ProviderError ? error.status : 422;
    return { status, body: { error: 'Gemini could not produce a playable plot.' } };
  }
}
