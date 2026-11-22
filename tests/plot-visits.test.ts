import { describe, expect, it, vi } from 'vitest';
import { catchGame, directedScene, homeRun, openWindow, plotResponse, simulatedPlot, stationFarewell } from '../e2e/support/plot-fixtures';
import { handlePlotRequest, planGeminiPlot } from '../server/plot-gateway';
import { onRequest } from '../functions/api/scene-plan';
import { createCheckpoint, restoreCheckpoint } from '../src/world/checkpoint';
import { composeSceneTemplate } from '../src/world/compose-scene-template';
import { plotProblems } from '../src/world/plot-schema';
import { momentPoint } from '../src/world/layout-schema';
import { reachableCells } from '../src/world/route';
import { toWalkLayout } from '../src/world/world-schema';
import { resolveScenePalette, sceneDirectionSchema } from '../src/world/scene-direction';

const id = '3542469b-20aa-4c9d-99c6-8c3dafbc3b1f';

function assemble(source: string) {
  const specification = plotResponse(source);
  if (!specification) throw new Error(`Missing fixture: ${source}`);
  const result = composeSceneTemplate(source, { id, ...specification, processing: 'gemini' });
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}

describe('Gemini plot composition', () => {
  it.each([homeRun, catchGame, stationFarewell, openWindow])('keeps the source and resolves all plot anchors for %s', (source) => {
    const world = assemble(source);
    expect(assemble(source)).toEqual(world);
    expect(world.prompt).toBe(source);
    const cells = reachableCells(toWalkLayout(world.layout));
    for (const moment of world.layout.plot!.moments) {
      const point = momentPoint(world.layout, moment);
      expect(cells.some(({ x, z }) => Math.hypot(x - point.x, z - point.z) < .32)).toBe(true);
    }
  });

  it('places a park bench in the directed district and preserves the walkable route', () => {
    const source = 'In a park with a bench and flowers.';
    const response = plotResponse(source)!;
    const bench = response.plan.intent.features.find(feature => feature.asset === 'bench')!;
    function place(district: 'entry-left' | 'rear-right') {
      bench.district = district;
      const built = composeSceneTemplate(source, { id, ...response, processing: 'gemini' });
      if (!built.ok) throw new Error(built.reason);
      const placement = built.world.layout.placements.find(p => p.recipe === 'bench')!;
      const cells = reachableCells(toWalkLayout(built.world.layout));
      expect(cells.length).toBeGreaterThan(0);
      return placement;
    }
    const entry = place('entry-left'), rear = place('rear-right');
    expect(entry.x).toBeLessThan(rear.x);
    expect(entry.z).toBeGreaterThan(rear.z);
    expect(place('entry-left')).toEqual(entry);
  });

  it('shares the ballfield and throw while distinguishing a home run from catch practice', () => {
    const hit = assemble(homeRun).layout, caught = assemble(catchGame).layout;
    expect([hit.profile, caught.profile]).toEqual(['ballfield', 'ballfield']);
    expect([hit.landmark.placementId, caught.landmark.placementId]).toEqual(['baseball-diamond-1', 'baseball-diamond-1']);
    expect(hit.plot!.moments[0].actions.map(action => action.kind)).toEqual(['throw', 'strike', 'react']);
    expect(caught.plot!.moments[0].actions.map(action => action.kind)).toEqual(['throw', 'catch']);
    expect(caught.plot!.moments[0].input).toBe('timing');
  });

  it('rejects a negated home run and invented evidence', () => {
    const plot = simulatedPlot(homeRun);
    const source = 'I did not hit a home run.';
    plot.moments[0].evidence = source;
    expect(plotProblems(plot, source)).toContain('An over-the-fence hit needs explicit source evidence.');
    expect(plotProblems(plot, 'An empty field.')).toContain('Quote evidence exactly from the scene prompt.');
  });

  it('preserves both moments when Gemini points them to the same slide', async () => {
    const source = 'At the water park I saw the biggest slide with Mom.';
    const { plan, plot } = plotResponse(source)!;
    const slide = plan.intent.features.findIndex(feature => feature.asset === 'tube-slide');
    const ending = { ...plot.moments[0], anchorFeature: slide };
    const arrival = { ...ending, anchor: 'arrival' as const };
    const complete = vi.fn().mockResolvedValue({ intent: plan.intent, plot: { ...plot, moments: [arrival, ending] } });
    const staged = await planGeminiPlot(source, complete, new AbortController().signal);
    expect(staged.plot.moments).toEqual([arrival, plot.moments[0]]);
    expect(composeSceneTemplate(source, { id, ...staged, processing: 'gemini' }).ok).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('restores completed moments independently of the old discovery counter', () => {
    const world = assemble(stationFarewell);
    const state = { position: world.layout.spawn, revealed: new Set<string>(), ended: false, momentsCompleted: 1 };
    const saved = createCheckpoint(world, state);
    expect(restoreCheckpoint(world, saved)).toEqual({ ok: true, state });
    expect(restoreCheckpoint(world, { ...saved, ended: true }).ok).toBe(false);
    expect(restoreCheckpoint(world, { ...saved, ended: true, momentsCompleted: 2 }).ok).toBe(true);
  });

  it('rejects private extra request data and stops after a provider quota failure', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    try {
      const signal = new AbortController().signal;
      expect((await handlePlotRequest({ prompt: homeRun, fictional: true, journal: 'private' }, 'test', signal)).status).toBe(400);
      expect((await handlePlotRequest({ prompt: homeRun, fictional: true }, undefined, signal)).status).toBe(503);
      expect(fetch).not.toHaveBeenCalled();
      expect((await handlePlotRequest({ prompt: homeRun, fictional: true }, 'test', signal)).status).toBe(429);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });

  it('runs the same-origin Pages endpoint through the Gemini response contract', async () => {
    const { plan, plot } = plotResponse(homeRun)!;
    const provider = vi.fn(async (_: string, _init: RequestInit) =>
      Response.json({ candidates: [{ finishReason: 'STOP', content: {
        parts: [{ text: JSON.stringify({ intent: plan.intent, plot, direction: directedScene }) }],
      } }] }));
    vi.stubGlobal('fetch', provider);
    try {
      const send = (origin: string, free?: string) => onRequest({
        request: new Request('https://genesis.example/api/scene-plan', { method: 'POST',
          headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: homeRun, fictional: true }) }),
        env: { GEMINI_API_KEY: 'test-key', GEMINI_FREE_TIER: free },
      });
      expect((await send('https://other.example', 'true')).status).toBe(403);
      expect((await send('https://genesis.example')).status).toBe(503);
      expect(provider).not.toHaveBeenCalled();
      const response = await send('https://genesis.example', 'true');
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({ plan, plot, direction: { ...directedScene, palette: resolveScenePalette(directedScene.palette, 'ballfield') } });
      expect(provider).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(String(provider.mock.calls[0][1].body));
      expect(JSON.parse(payload.contents[0].parts[0].text).prompt).toBe(homeRun);
      const intent = payload.generationConfig.responseJsonSchema.properties.intent.properties;
      expect(intent.exclusions.items).toEqual({ type: 'string' });
      expect(intent.features.items.properties.asset).toEqual({ type: ['string', 'null'] });
      expect(intent.features.items.properties.count).toEqual({ type: 'integer' });
      expect(intent.features).not.toHaveProperty('maxItems');
      expect(payload.systemInstruction.parts[0].text).toContain('tube-slide');
    } finally { vi.unstubAllGlobals(); }
  });

  it('keeps explicit weather and time, and resolves a palette that can be saved', async () => {
    const source = 'At dawn in rainy park by a red bench, we stood still.';
    const { plan, plot } = plotResponse(source)!;
    const complete = vi.fn().mockResolvedValue({ intent: { ...plan.intent, weather: 'clear', timeOfDay: 'night' }, plot, direction: directedScene });
    const staged = await planGeminiPlot(source, complete, new AbortController().signal, true);
    expect(staged.plan.intent).toMatchObject({ timeOfDay: 'dawn', weather: 'rain' });
    expect(staged.plan.intent.features).toContainEqual(expect.objectContaining({ asset: 'bench', color: 'red' }));
    const scene = composeSceneTemplate(source, { id, ...staged, processing: 'gemini' });
    expect(scene.ok && scene.world.layout.direction).toEqual(staged.direction);
    expect(sceneDirectionSchema.safeParse({ ...directedScene, palette: { ...directedScene.palette, sky: 'url(example)' } }).success).toBe(false);
  });

  it('resolves a catalog slide name to the cited prompt and places the exit in the pool', async () => {
    const source = 'I went to the water park with Mom. We rode the biggest slide.';
    const { plan, plot } = plotResponse(source)!;
    const features = plan.intent.features.filter(feature => feature.asset === 'tube-slide').map(feature => ({ ...feature, phrase: 'tube-slide' }));
    const complete = vi.fn().mockResolvedValue({ intent: { ...plan.intent, features },
      plot: { ...plot, companion: 'Mom', moments: [{ ...plot.moments[0], actions: [{ kind: 'slide', actor: 'player', object: 'water-slide' }] }] },
      direction: directedScene });
    const staged = await planGeminiPlot(source, complete, new AbortController().signal, true);
    expect(staged.plan.intent.features[0].phrase).toBe('slide');
    expect(staged.plot.moments[0].actions[0].together).toBe(true);
    expect(composeSceneTemplate(source, { id, ...staged, processing: 'gemini' }).ok).toBe(true);
    expect(complete).toHaveBeenCalledOnce();
  });

  it('keeps a feeling of home out of the geometry and mounts the first window on the room wall', async () => {
    const source = 'At night in a room with a blue sofa, I watched rain through the window and felt at home.';
    const { plan, plot } = plotResponse(source)!;
    const complete = vi.fn().mockResolvedValue({
      intent: { ...plan.intent, features: [...plan.intent.features,
        { asset: 'house', phrase: 'home', setting: 'interior', count: 1, color: null, origin: 'requested' }] },
      plot, direction: directedScene,
    });
    const staged = await planGeminiPlot(source, complete, new AbortController().signal, true);
    const built = composeSceneTemplate(source, { id, ...staged, processing: 'gemini' });
    if (!built.ok) throw new Error(built.reason);
    const { layout } = built.world;
    expect(layout.placements.some(placement => placement.recipe === 'house')).toBe(false);
    const window = layout.placements.find(placement => placement.recipe === 'window')!;
    expect(window.z - layout.indoor!.area.minZ).toBeCloseTo(.23);
  });
});
