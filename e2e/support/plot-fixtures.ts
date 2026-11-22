import type { Page } from '@playwright/test';
import { privateScenePlan } from '../../src/world/local-scene-plan';
import type { Plot, PlotMoment } from '../../src/world/plot-schema';
import type { SceneDirection } from '../../src/world/scene-direction';

export const directedScene: SceneDirection = {
  version: 1,
  palette: { horizon: '#cea692', sky: '#565980', light: '#ffd38c', surface: '#65764b', accent: '#a86568' },
  bed: 'breeze', track: 'warm-tape', mix: 'hushed',
  reasons: { palette: 'Warm tones hold the quiet of the visit.', time: 'Evening leaves time to linger.',
    weather: 'Clear air keeps the view open.', audio: 'A soft track leaves room for the breeze.' },
};

export const homeRun = 'At dusk I hit my first home run. Dad watched the ball clear the fence, then we celebrated together.';
export const catchGame = 'At dusk in the baseball field, Dad tossed the ball and I practised catching it.';
export const stationFarewell = 'At a train station at dusk, a friend handed me a ticket before the last train left. I felt subdued.';
export const openWindow = 'I opened a library window after the rain. The first light entered and I felt relieved.';

export function simulatedPlot(prompt: string): Plot {
  const base: PlotMoment = {
    anchor: 'ending', title: 'A moment to look around', actionLabel: 'Take in the view',
    description: 'The view opens from a different angle. Stay for a moment before leaving.',
    evidence: prompt.slice(0, 200), mood: 'calm', ambience: 'breeze', pace: 'steady', framing: 'follow',
    input: 'press', actions: [{ kind: 'look', actor: 'player', object: 'none' }],
  };
  if (prompt === homeRun) return { version: 1, companion: 'Dad', opening: 'Walk to the plate as the last light crosses the field.',
    closing: 'The ball is gone past the fence. Dad is still smiling.', moments: [{ ...base, title: 'The first home run',
      actionLabel: 'Step up to bat', description: 'The field goes quiet before the swing. The ball clears the fence and Dad raises both arms.',
      mood: 'joyful', ambience: 'quiet', pace: 'steady', framing: 'wide', actions: [
        { kind: 'throw', actor: 'offscreen', object: 'ball' }, { kind: 'strike', actor: 'player', object: 'ball', outcome: 'over-fence' },
        { kind: 'react', actor: 'companion', object: 'none' },
      ] }] };
  if (prompt === catchGame) return { version: 1, companion: 'Dad', opening: 'Dad waits with the ball while you take your spot.',
    closing: 'You have the ball. There is still light for another throw.', moments: [{ ...base, title: 'A game of catch', actionLabel: 'Get ready to catch',
      description: 'Dad sends the ball in a gentle arc. It comes down in your hands.', input: 'timing', actions: [
        { kind: 'throw', actor: 'companion', object: 'ball' }, { kind: 'catch', actor: 'player', object: 'ball' },
      ] }] };
  if (prompt === stationFarewell) return { version: 1, companion: 'Friend', opening: 'The platform is almost empty.',
    closing: 'The last lit carriage slips out of sight.', moments: [{ ...base, anchor: 'arrival', title: 'The ticket', actionLabel: 'Take the ticket',
      description: 'Your friend presses the ticket into your hand.', mood: 'subdued', ambience: 'station', framing: 'close',
      actions: [{ kind: 'hand-over', actor: 'companion', object: 'ticket' }],
    }, { ...base, title: 'The train leaves', actionLabel: 'Watch the last train', description: 'The lit windows recede down the track.',
      mood: 'subdued', ambience: 'station', pace: 'linger', framing: 'wide', actions: [{ kind: 'depart', actor: 'offscreen', object: 'train' }] }] };
  if (prompt === openWindow) return { version: 1, companion: null, opening: 'The room is hushed after the rain.',
    closing: 'The room is still quiet, but there is light now.', moments: [{ ...base, title: 'The first light', actionLabel: 'Open the window',
      description: 'The window swings open and a stripe of warm light falls inside.', mood: 'relieved', ambience: 'room',
      framing: 'close', actions: [{ kind: 'open', actor: 'player', object: 'window' }] }] };
  return { version: 1, companion: null, opening: 'Follow the route into the scene.', closing: 'The visit settles into a quiet moment.', moments: [base] };
}

export function plotResponse(prompt: string) {
  const plan = privateScenePlan(prompt);
  return plan && { plan, plot: simulatedPlot(prompt) };
}

export async function mockPromptPlots(page: Page, direction?: SceneDirection) {
  await page.route('**/api/scene-plan', async route => {
    const { prompt } = route.request().postDataJSON() as { prompt: string };
    const result = plotResponse(prompt);
    await route.fulfill(result ? { json: { ...result, ...(direction && { direction }) } } : { status: 422, json: { error: 'Unrecognized place' } });
  });
}
