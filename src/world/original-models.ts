export type ModelPart = {
  shape: 'box' | 'round' | 'cone' | 'ball' | 'ring';
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
};
const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string): ModelPart =>
  ({ shape: 'box', at: [x, y, z], size: [w, h, d], color });
const shape = (kind: ModelPart['shape'], x: number, y: number, z: number, w: number, h: number, d: number, color: string,
  rotation?: ModelPart['rotation']): ModelPart => ({ ...box(x, y, z, w, h, d, color), shape: kind, rotation });
const post = (x: number, z: number, h: number, color = wood) => box(x, h / 2, z, .14, h, .14, color);
const wood = '#785343', leaf = '#517b57', light = '#e4cb9e', slate = '#657681', teal = '#369eac', rose = '#ce6148', metal = '#a6b6bd';
const corners = (w: number, d: number, h: number, color?: string) =>
  [-w, w].flatMap(x => [-d, d].map(z => post(x, z, h, color)));
const ball = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => shape('ball', x, y, z, w, h, d, color);
const round = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => shape('round', x, y, z, w, h, d, color);
const cone = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, rotation?: ModelPart['rotation']) =>
  shape('cone', x, y, z, w, h, d, color, rotation);
const ring = (x: number, y: number, z: number, w: number, h: number, d: number, color: string, rotation?: ModelPart['rotation']) =>
  shape('ring', x, y, z, w, h, d, color, rotation);
const bar = (a: [number, number, number], b: [number, number, number], width: number, color: string): ModelPart => {
  const [dx, dy, dz] = b.map((value, i) => value - a[i]);
  return shape('box', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2,
    width, Math.hypot(dx, dy, dz), width, color, [Math.atan2(dz, dy), 0, -Math.atan2(dx, Math.hypot(dy, dz))]);
};
export const slidePoint = (t: number): ModelPart['at'] =>
  [Math.sin(t * Math.PI) * .78, .44 + (1 - t) ** 1.24 * 2.55, -.44 + t * 2.64];
const stairs = (steps: number, width: number, rise: number, tread: number, color: string) =>
  Array.from({ length: steps }, (_, i) => box(0, (i + 1) * rise / 2, (steps / 2 - i) * tread, width, (i + 1) * rise, tread + .01, color));
const slats = (n: number, width: number, step: number, y: number, color: string) =>
  Array.from({ length: n }, (_, i) => box(0, y, (i - (n - 1) / 2) * step, width, .08, step * .91, color));
const cabinet = (w: number, h: number, d: number, color: string) => box(0, h / 2, 0, w, h, d, color);
const leaves = (n: number, radius: number, height: number, color: string) => Array.from({ length: n }, (_, i) => {
  const angle = i / n * Math.PI * 2;
  return shape('ball', Math.sin(angle) * radius / 2, height, Math.cos(angle) * radius / 2,
    radius * .55, .13, radius * 1.2, color, [-.23, angle, 0]);
});

export type ModelFamily = 'landscape' | 'civic' | 'recreation' | 'passage' | 'urban' | 'interior' | 'coastal' | 'fantasy';
type Model = { label: string; family: ModelFamily; parts: readonly ModelPart[]; radius: number; role: 'structure' | 'prop'; aliases: readonly string[] };
const model = (family: ModelFamily, label: string, radius: number, parts: ModelPart[], aliases: string[] = [], role: Model['role'] = 'prop'): Model =>
  ({ family, label, radius, parts, aliases, role });
const structure = (family: ModelFamily, label: string, radius: number, parts: ModelPart[], aliases?: string[]) =>
  model(family, label, radius, parts, aliases, 'structure');

/** Original, ground-pivoted low-poly models for the Memory Worlds catalog. */
export const originalModels = {
  'baseball-diamond': structure('recreation', 'Baseball diamond', 0, [
    round(0, .022, -.2, 2.85, .044, 2.85, '#b68056'),
    round(0, .023, -4, 1.8, .046, 1.8, '#b68056'),
    shape('box', 0, .017, -4, 5.68, .034, 5.68, '#a9734d', [0, Math.PI / 4, 0]),
    shape('box', 0, .031, -4, 4.78, .008, 4.78, '#708b45', [0, Math.PI / 4, 0]),
    ...[[0, 0], [-4, -4], [4, -4], [0, -8]].map(([x, z]) => shape('box', x, .055, z, .28, .052, .28, '#faf1d7', [0, Math.PI / 4, 0])),
    ...[-1, 1].map(x => shape('box', x * 3.2, .044, -3.2, .055, .012, 9.05, '#f1e3bd', [0, -x * Math.PI / 4, 0])),
    ...[-6, -4, -2, 0, 2, 4, 6].flatMap(x => [post(x, -11, 1.48, '#426159'),
      box(x, .65, -11, 2, .095, .1, '#557865'), box(x, 1.18, -11, 2, .075, .1, '#567866')]),
    ...[-2, 2].map(x => post(x, 1.67, 2.25, '#51615b')),
    box(0, 2.2, 1.67, 4.2, .075, .12, metal),
  ], ['ball diamond', 'home plate']),
  dugout: structure('recreation', 'Field dugout', .89, [box(0, .6, -.45, 2.55, 1.2, .14, '#576857'),
    ...corners(1.19, .45, 1.39, wood), box(0, 1.42, -.02, 2.7, .13, 1.22, '#866351'),
    box(0, .32, -.19, 1.93, .1, .46, light), box(0, .05, 0, 2.55, .1, 1.08, '#b59f84')]),
  scoreboard: model('recreation', 'Field scoreboard', .42, [post(-.49, 0, 1.6, slate), post(.49, 0, 1.6, slate),
    box(0, 1.58, 0, 1.79, .88, .17, '#314f4c'), ...[-.51, 0, .51].map(x => box(x, 1.53, .1, .23, .28, .04, '#dcb566'))]),
  pine: model('landscape', 'Pine', .24, [post(0, 0, 2.3), cone(0, 1.2, 0, 1.65, 1.7, 1.65, '#40634c'), cone(0, 1.92, 0, 1.22, 1.55, 1.22, '#527c59')], ['fir', 'spruce']),
  birch: model('landscape', 'Birch', .21, [post(0, 0, 2.7, '#e8e2d2'), ...[.35, .9, 1.46].map(y => box(.01, y, .01, .16, .06, .16, slate)), ball(-.2, 2.3, 0, 1.05, 1.32, .96, '#91ac61'), ball(.32, 2.67, .2, 1.05, 1.2, .9, '#b8c878')]),
  willow: model('landscape', 'Willow', .32, [post(0, 0, 2.1), ball(0, 2.15, 0, 2.5, 1.3, 2, leaf), ...[-.84, -.38, .46, .9].map((x, i) => ball(x, 1.45, (i % 2) * .55, .43, 1.46, .52, '#789252'))]),
  palm: model('landscape', 'Palm', .23, [bar([0, 0, 0], [.33, 2.1, 0], .17, wood), ...leaves(7, 1.35, 2.18, '#30745d').map(p => ({ ...p, at: [p.at[0] + .33, p.at[1], p.at[2]] as ModelPart['at'] }))]),
  shrub: model('landscape', 'Shrub', .25, [ball(0, .32, 0, .86, .68, .68, leaf), ball(.33, .22, .08, .53, .45, .52, '#6f8b57')], ['bush']),
  hedge: model('landscape', 'Hedge', .65, [box(0, .29, 0, 1.45, .56, .38, '#44664b'), ...[-.53, 0, .53].map(x => ball(x, .53, 0, .6, .32, .52, leaf))]),
  fern: model('landscape', 'Fern', 0, [post(0, 0, .32, leaf), ...leaves(7, .66, .28, '#77a961')]),
  'flower-bed': model('landscape', 'Flower bed', 0, [box(0, .07, 0, 1.2, .14, .64, '#705248'), ...[-.42, -.2, 0, .24, .44].flatMap((x, i) => [box(x, .21, i % 2 * .2 - .1, .035, .26, .035, leaf), ball(x, .35, i % 2 * .2 - .1, .16, .12, .16, i % 2 ? '#efb85a' : '#d47785')])], ['planter bed']),
  reeds: model('landscape', 'Reed cluster', 0, [-.2, -.05, .12, .25].flatMap((x, i) => [bar([x, 0, 0], [x + .08, .45 + i * .09, .05], .035, leaf), round(x + .08, .46 + i * .09, .05, .07, .16, .07, wood)]), ['reeds', 'cattails']),
  stump: model('landscape', 'Tree stump', .23, [round(0, .23, 0, .45, .46, .48, wood), round(0, .465, 0, .34, .03, .35, light), box(.2, .1, 0, .23, .18, .12, wood)]),
  mushroom: model('landscape', 'Mushroom', 0, [round(0, .15, 0, .11, .3, .11, light), ball(0, .34, 0, .45, .22, .45, rose), ball(.12, .42, .06, .065, .045, .065, '#fff2d7')]),
  log: model('landscape', 'Fallen log', .46, [shape('round', 0, .19, 0, .36, 1.24, .35, wood, [0, 0, Math.PI / 2]), bar([0, .21, 0], [.29, .56, .12], .12, wood)], ['fallen log']),
  cactus: model('landscape', 'Cactus', .19, [round(0, .56, 0, .27, 1.12, .24, leaf), box(-.22, .42, 0, .36, .13, .15, leaf), round(-.35, .52, 0, .13, .31, .15, leaf), round(.28, .73, 0, .14, .35, .14, leaf), box(.17, .61, 0, .31, .12, .13, leaf)]),
  grass: model('landscape', 'Grass tuft', 0, [-.15, 0, .13].map((x, i) => cone(x, .14, i * .04, .11, .27 + i * .04, .06, leaf, [0, 0, -x * 2]))),
  vine: model('landscape', 'Climbing vine', .14, [post(0, 0, 1.48), ...Array.from({ length: 6 }, (_, i) => ball(i % 2 ? .14 : -.14, .33 + i * .2, .09, .32, .17, .19, leaf))]),
  gazebo: structure('civic', 'Gazebo', 1.45, [round(0, .045, 0, 2.95, .09, 2.95, light), ...corners(.91, .91, 2.15, '#e1c6a1'), round(0, 2.14, 0, 3.23, .13, 3.23, '#864936'), cone(0, 2.57, 0, 3.46, .87, 3.46, rose), round(0, 3.03, 0, .13, .22, .13, light)]),
  pergola: structure('civic', 'Pergola', 1.1, [...corners(.9, .68, 2.05), ...[-.73, -.36, 0, .36, .73].map(z => box(0, 2.12, z, 2.2, .12, .11, wood)), ...[-.82, .82].map(x => box(x, 2.02, 0, .15, .16, 1.64, wood))]),
  'park-gate': model('civic', 'Park entrance', 0, [post(-.88, 0, 1.75, slate), post(.88, 0, 1.75, slate), box(0, 1.77, 0, 1.96, .22, .14, slate), box(0, 1.71, .09, .84, .28, .09, light)], ['park entrance']),
  'picnic-table': model('civic', 'Picnic table', .65, [...corners(.51, .29, .68), box(0, .7, 0, 1.42, .11, .61, wood), ...[-.54, .54].map(z => box(0, .36, z, 1.45, .1, .24, light))]),
  'drinking-fountain': model('civic', 'Drinking fountain', .27, [cabinet(.27, .84, .27, slate), round(0, .88, 0, .53, .11, .46, metal), ring(0, .95, 0, .46, .46, .09, teal, [Math.PI / 2, 0, 0])]),
  fountain: structure('civic', 'Ornamental fountain', .79, [round(0, .13, 0, 1.7, .25, 1.7, light), round(0, .27, 0, 1.49, .03, 1.49, teal), round(0, .55, 0, .27, .65, .27, light), round(0, .88, 0, .72, .13, .72, light), ball(0, 1.13, 0, .13, .55, .13, teal)]),
  planter: model('civic', 'Raised planter', .43, [cabinet(.96, .35, .55, wood), box(0, .37, 0, .92, .05, .53, '#524334'), ...[-.29, 0, .29].map((x, i) => ball(x, .57, 0, .31, .38, .34, i % 2 ? '#d7ab58' : leaf))]),
  'trail-sign': model('civic', 'Trail sign', .14, [post(0, 0, 1.16), box(-.08, .98, .03, .62, .2, .09, light), cone(.28, .98, .03, .21, .21, .1, light, [0, 0, -Math.PI / 2]), box(.16, .69, -.03, .51, .16, .09, '#bb9060')], ['signpost']),
  fence: model('civic', 'Picket fence', .51, [...[-.5, -.25, 0, .25, .5].map(x => post(x, 0, .67, light)), box(0, .24, 0, 1.2, .09, .12, wood), box(0, .51, 0, 1.2, .09, .12, wood)]),
  'bike-rack': model('civic', 'Bicycle rack', .5, [[-.4, 0, .4].map(x => ring(x, .23, 0, .53, .47, .12, slate, [0, Math.PI / 2, 0])), [box(0, .04, 0, 1.12, .08, .55, slate)]].flat(), ['bike rack']),
  bollard: model('civic', 'Bollard', .12, [round(0, .31, 0, .23, .62, .23, slate), round(0, .56, 0, .236, .07, .236, light), ball(0, .63, 0, .23, .14, .23, slate)]),
  'notice-board': model('civic', 'Notice board', .48, [post(-.49, 0, 1.46), post(.49, 0, 1.46), box(0, 1.06, 0, 1.14, .62, .12, wood), box(-.18, 1.07, .067, .28, .36, .01, light), box(.19, 1.13, .067, .28, .24, .01, rose), box(0, 1.4, 0, 1.26, .1, .34, slate)]),
  'pool-basin': model('recreation', 'Pool basin', 0, [box(0, -.075, 0, 4.5, .02, 3.5, '#278dba'), box(-2.22, -.01, 0, .12, .09, 3.66, light), box(2.22, -.01, 0, .12, .09, 3.66, light),
    box(0, -.01, -1.74, 4.54, .09, .12, light), box(0, -.01, 1.74, 4.54, .09, .12, light),
    ...[-1.6, -.75, .1, 1.05].map((x, i) => box(x, -.057, i % 2 ? .52 : -.38, .065, .01, 2.1, '#74d0d9'))], ['pool', 'swimming pool']),
  'tube-slide': structure('recreation', 'Tube slide', 1.06, [
    post(-.58, -.65, 3.05, slate), post(.57, -.65, 3.05, slate), box(0, 3.05, -.65, 1.55, .15, 1.12, light),
    ...[-.41, .41].map(x => bar([x, .11, -1.82], [x, 3.12, -.96], .075, slate)),
    ...Array.from({ length: 10 }, (_, index) => box(0, .19 + index * .3, -1.80 + index * .086, .83, .065, .16, light)),
    ...Array.from({ length: 11 }, (_, i) => {
      const segment = bar(slidePoint(i / 12), slidePoint((i + 1) / 12), .72, rose);
      return { ...segment, shape: 'round' as const, size: [.72, segment.size[1] + .18, .72] as ModelPart['size'] };
    }),
    ...Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      return ring(...slidePoint(t), .9, .91, .75, i % 4 === 0 ? light : rose, [.7 - t * .52, -.4 * Math.cos(t * Math.PI), 0]);
    }),
    post(.62, .56, 1.3, slate), box(0, .17, 2.14, 1, .14, .96, teal),
  ], ['slide', 'water slide', 'waterslide', 'tube']),
  'open-flume': structure('recreation', 'Open flume', .94, [
    post(-.42, -.9, 2.55, slate), post(.42, -.9, 2.55, slate), box(0, 2.57, -.89, 1.25, .12, .96, light),
    ...Array.from({ length: 7 }, (_, i) => shape('box', -.17 + i * .055, 2.22 - i * .28, -.4 + i * .39, .66, .14, .63, i % 2 ? '#edac45' : '#ed9844', [.61, 0, 0])),
    ...[-.38, .38].flatMap(x => [bar([x, 2.56, -.63], [x, .63, 1.9], .1, rose), post(x, .24, 1.65, slate)]),
  ], ['flume']),
  'slide-tower': structure('recreation', 'Slide launch tower', .75, [...corners(.49, .5, 2.7, slate), box(0, 2.67, 0, 1.25, .14, 1.16, light), ...Array.from({ length: 8 }, (_, i) => box(.13, .24 + i * .31, .56, .58, .08, .15, metal))]),
  'splash-pad': model('recreation', 'Splash pad', .74, [round(0, .04, 0, 1.63, .08, 1.63, '#99d4d5'), ring(0, .53, 0, 1.23, 1, .19, '#e6ac43'), ...[-.44, 0, .44].map((x, i) => ball(x, .23 + i * .08, .11, .09, .31 + i * .15, .09, teal))], ['splash feature', 'spray pad']),
  'water-jet': model('recreation', 'Water jet', 0, [round(0, .06, 0, .32, .11, .32, metal), cone(0, .36, 0, .21, .66, .21, '#73cbd6'), ball(.08, .73, 0, .17, .21, .17, '#9be3e1')]),
  'lifeguard-chair': model('recreation', 'Lifeguard chair', .52, [...corners(.31, .31, 1.24, wood), box(0, 1.22, 0, .86, .11, .7, '#faf0d5'), box(0, 1.51, -.3, .84, .52, .11, rose), ...[.25, .55, .82].map(y => box(0, y, .39, .58, .09, .17, light))], ['lifeguard stand']),
  cabana: structure('recreation', 'Shade cabana', .86, [...corners(.67, .49, 1.9, '#b38b61'), box(0, 1.93, 0, 1.68, .16, 1.34, teal), box(-.68, 1.32, 0, .05, 1.25, 1.06, light), box(0, .37, -.31, 1.18, .16, .38, wood)], ['shade structure', 'viewing deck', 'overlook']),
  'shade-umbrella': model('recreation', 'Shade umbrella', .2, [post(0, 0, 1.94, light), cone(0, 1.87, 0, 1.86, .42, 1.86, rose), round(0, .08, 0, .57, .15, .57, slate)], ['umbrella']),
  'deck-chair': model('recreation', 'Deck chair', .43, [box(0, .24, -.06, .65, .11, 1.28, light), shape('box', 0, .51, -.48, .66, .63, .09, teal, [.66, 0, 0]), ...corners(.23, .41, .23)]),
  'entry-arch': model('recreation', 'Water park entry arch', 0, [post(-1.15, 0, 2.06, teal), post(1.15, 0, 2.06, teal), box(0, 2.09, 0, 2.54, .19, .23, teal), box(0, 2.18, .11, 1.31, .48, .13, rose), ...[-.42, 0, .42].map(x => ball(x, 2.2, .19, .2, .16, .08, '#fff1ba'))], ['entrance arch']),
  'pool-ladder': model('recreation', 'Pool ladder', 0, [...[-.27, .27].flatMap(x => [post(x, -.15, .91, metal), bar([x, .87, -.15], [x, .27, .29], .07, metal)]), ...[.18, .38, .59].map(y => box(0, y, .13, .68, .07, .15, metal))], ['ladder']),
  'life-ring': model('recreation', 'Life ring', .12, [post(0, 0, .92, slate), ring(0, .89, .13, .59, .59, .37, rose), ...[-.23, .23].map(x => box(x, .91, .15, .075, .18, .13, light))], ['lifebuoy']),
  'lazy-river': model('recreation', 'Lazy river bend', .8, [ring(0, .055, 0, 1.78, 1.44, 1.02, light, [Math.PI / 2, 0, 0]), ring(0, .069, 0, 1.57, 1.25, .64, teal, [Math.PI / 2, 0, 0]), ball(.53, .16, -.11, .22, .24, .2, rose)]),
  deck: model('passage', 'Deck boards', 0, slats(8, 1.81, .2, .005, light), ['dry deck']),
  boardwalk: model('passage', 'Boardwalk', 0, [...slats(10, 1.46, .2, .005, wood), ...corners(.75, .83, .61), ...[-.75, .75].map(x => box(x, .61, 0, .11, .12, 2.03, light))]),
  ramp: model('passage', 'Ramp', .55, [shape('box', 0, .25, 0, 1.06, .14, 1.35, slate, [-.33, 0, 0]), ...[-.58, .58].map(x => bar([x, .1, .65], [x, .52, -.65], .09, metal))]),
  stairs: model('passage', 'Stone stairs', .61, stairs(5, 1.15, .15, .21, slate), ['steps', 'staircase']),
  doorway: model('passage', 'Doorway', 0, [post(-.78, 0, 1.96, wood), post(.78, 0, 1.96, wood), box(0, 1.98, 0, 1.74, .15, .22, wood)] , ['door']),
  archway: structure('passage', 'Stone archway', .7, [box(-.59, .63, 0, .28, 1.26, .45, slate), box(.59, .63, 0, .28, 1.26, .45, slate), ring(0, 1.36, 0, 1.48, .98, .58, slate)]),
  'tunnel-portal': structure('passage', 'Tunnel portal', .72, [box(0, .65, -.19, 1.74, 1.3, .38, slate), ball(0, 1.25, -.2, 1.74, .9, .45, slate), box(0, .51, .009, 1.07, 1.02, .03, '#252c38'), ball(0, .93, .016, 1.07, .89, .04, '#252c38')], ['tunnel']),
  steppingstones: model('passage', 'Stepping stones', 0, [-.59, -.04, .49].map((z, i) => ball(i % 2 * .24 - .12, .025, z, .46, .09, .38, slate)), ['stepping stones']),
  'rock-ledge': model('passage', 'Rock ledge', .58, [ball(0, .32, 0, 1.4, .64, .88, slate), ball(-.31, .54, -.21, .78, .39, .71, '#8a8c7e'), box(.34, .39, .1, .65, .25, .56, '#99957f')]),
  'footbridge': model('passage', 'Footbridge', .65, [...slats(9, 1.04, .19, .18, wood), ...corners(.55, .74, .58), ...[-.55, .55].map(x => bar([x, .48, -.78], [x, .64, .8], .09, light))]),
  storefront: structure('urban', 'Shopfront', .78, [cabinet(1.61, 1.76, .92, '#b98d74'), box(0, .76, .473, 1.22, .9, .08, '#6b9da2'), shape('box', 0, 1.19, .65, 1.68, .12, .56, rose, [.25, 0, 0]), box(0, 1.53, .49, 1.11, .19, .09, light)], ['shop', 'store']),
  kiosk: structure('urban', 'Ticket kiosk', .5, [cabinet(.94, 1.37, .72, teal), box(0, .95, .367, .58, .35, .035, slate), box(0, 1.43, 0, 1.18, .15, .91, light), box(0, .74, .47, .71, .08, .23, wood)]),
  'station-facade': structure('urban', 'Station facade', 1.05, [cabinet(2.25, 2.03, .9, '#ad8065'),
    box(0, 1.05, .465, .72, 1.32, .05, '#374f55'), box(0, 1.72, .62, 2.43, .12, .52, '#415958'),
    ...[-.83, .83].flatMap(x => [box(x, 1.04, .48, .49, .66, .06, '#8db4b3'), box(x, .54, .52, .54, .08, .13, light)]),
    box(0, 2.07, 0, 2.44, .13, 1.08, '#54625d'), box(0, .08, .69, 2.65, .16, .66, '#ad9c88'),
    shape('round', 0, 1.92, .49, .27, .075, .27, light, [Math.PI / 2, 0, 0]),
    box(0, 1.945, .536, .021, .093, .012, '#47524e'), shape('box', -.025, 1.924, .541, .071, .019, .012, '#47524e', [0, 0, -.47]),
  ], ['train station']),
  apartment: structure('urban', 'Apartment block', .79, [cabinet(1.46, 3.09, 1.16, slate), ...[.75, 1.44, 2.14, 2.79].flatMap(y => [-.41, .37].map(x => box(x, y, .589, .33, .32, .035, light))), box(0, 2.59, .7, 1.54, .09, .37, metal)], ['apartment building']),
  'water-tower': structure('urban', 'Water tower', .59, [...corners(.48, .48, 2.4, slate), round(0, 2.48, 0, 1.32, .87, 1.32, '#989b92'), cone(0, 3, 0, 1.4, .25, 1.4, slate)]),
  'clock-tower': structure('urban', 'Clock tower', .48, [cabinet(.77, 2.92, .8, '#ba876c'), cone(0, 3.28, 0, 1.1, .83, 1.1, slate), shape('round', 0, 2.57, .42, .48, .06, .48, light, [Math.PI / 2, 0, 0]), box(0, 2.63, .47, .036, .14, .024, slate), box(.075, 2.57, .47, .14, .034, .024, slate)], ['clocktower']),
  'bus-stop': model('urban', 'Bus stop', .52, [...corners(.61, .34, 1.73, metal), box(0, 1.74, 0, 1.5, .13, .92, slate), box(0, 1.08, -.34, 1.24, .94, .045, '#85b3ac'), box(0, .42, -.16, 1.28, .11, .31, light)]),
  hydrant: model('urban', 'Fire hydrant', .16, [round(0, .31, 0, .28, .62, .28, rose), ball(0, .6, 0, .31, .22, .31, rose), shape('round', .19, .34, 0, .18, .2, .18, rose, [0, 0, Math.PI / 2]), round(0, .05, 0, .41, .09, .41, slate)], ['fire hydrant']),
  mailbox: model('urban', 'Mailbox', .2, [post(0, 0, .81, wood), box(0, .8, 0, .43, .2, .37, teal), shape('round', 0, .92, 0, .43, .37, .31, teal, [Math.PI / 2, 0, 0]), box(.24, .92, 0, .05, .28, .06, rose)]),
  'street-clock': model('urban', 'Street clock', .16, [post(0, 0, 1.55, slate), ring(0, 1.61, 0, .69, .69, .29, slate), shape('round', 0, 1.61, 0, .55, .08, .55, light, [Math.PI / 2, 0, 0]), box(.03, 1.68, .062, .053, .22, .035, wood)]),
  'traffic-signal': model('urban', 'Traffic signal', .15, [post(0, 0, 1.97, slate), box(.18, 1.72, 0, .29, .64, .24, '#414854'), ...[rose, '#efbd49', '#70ad65'].map((c, i) => ball(.18, 1.91 - .19 * i, .13, .13, .13, .06, c))], ['traffic light']),
  'market-cart': model('urban', 'Market cart', .59, [box(0, .46, 0, 1.15, .45, .62, wood), ...[-.4, .4].map(x => ring(x, .23, .36, .43, .43, .19, slate)), post(-.49, -.26, 1.34), post(.49, -.26, 1.34), box(0, 1.32, 0, 1.23, .13, .78, rose)], ['cart']),
  'vendor-counter': model('urban', 'Vendor counter', .55, [cabinet(1.21, .81, .53, wood), box(0, .83, 0, 1.37, .1, .68, light), ...[-.46, -.16, .13, .41].map(x => box(x, .44, .285, .13, .47, .03, rose))]),
  'poster-column': model('urban', 'Poster column', .33, [round(0, .78, 0, .59, 1.53, .59, '#798b76'), round(0, .07, 0, .8, .13, .8, slate), cone(0, 1.66, 0, .84, .32, .84, slate), box(0, .99, .295, .33, .56, .035, light)]),
  'barrier': model('urban', 'Road barrier', .43, [post(-.4, 0, .58, metal), post(.4, 0, .58, metal), box(0, .47, 0, 1.08, .19, .09, rose), ...[-.32, 0, .32].map(x => shape('box', x, .47, .05, .078, .2, .016, light, [0, 0, -.36]))]),
  'cafe-counter': model('interior', 'Café counter', .61, [cabinet(1.37, .84, .62, wood), box(0, .88, 0, 1.46, .09, .72, light), box(.46, 1.01, 0, .32, .31, .28, slate), round(-.4, .99, .13, .16, .21, .17, rose)], ['café', 'cafe', 'coffee shop']),
  cupboard: model('interior', 'Cupboard', .52, [cabinet(.98, 1.63, .45, wood), ...[-.24, .24].map(x => box(x, .95, .239, .41, 1.14, .06, light)), ...[-.08, .08].map(x => box(x, .95, .29, .04, .11, .03, slate))]),
  stove: model('interior', 'Stove', .39, [cabinet(.72, .74, .68, light), box(0, .75, 0, .78, .09, .73, slate), box(0, .37, .354, .54, .3, .06, slate), ...[-.2, .2].flatMap(x => [-.17, .17].map(z => round(x, .81, z, .19, .045, .19, '#323d45')))], ['oven']),
  chair: model('interior', 'Dining chair', .29, [...corners(.22, .22, .43), box(0, .44, 0, .57, .095, .53, light), box(0, .76, -.23, .56, .54, .1, wood)], ['dining chair']),
  armchair: model('interior', 'Armchair', .4, [box(0, .23, 0, .77, .34, .68, wood), box(0, .47, .04, .62, .28, .6, teal), box(0, .65, -.28, .78, .67, .23, teal), ...[-.35, .35].map(x => box(x, .53, 0, .19, .25, .68, teal))]),
  sofa: model('interior', 'Sofa', .59, [box(0, .31, 0, 1.34, .42, .69, wood), box(0, .52, -.29, 1.4, .64, .2, '#ae795e'), ...[-.31, .31].map(x => box(x, .48, .09, .59, .23, .51, '#d7a07a')), ...[-.65, .65].map(x => box(x, .57, 0, .15, .25, .69, '#ae795e'))], ['couch']),
  bookcase: model('interior', 'Bookcase', .48, [...[-.43, .43].map(x => box(x, .88, 0, .12, 1.76, .39, wood)), ...[.09, .51, .95, 1.39, 1.76].map(y => box(0, y, 0, .96, .09, .42, wood)), ...[.3, .71, 1.16].flatMap(y => [-.28, -.13, .06, .22].map((x, i) => box(x, y, .08, .09 + .02 * i, .29 - .035 * i, .2, [rose, teal, light, leaf][i])))], ['bookshelf']),
  window: model('interior', 'Window and sill', .49, [box(0, .38, 0, 1.16, .76, .18, '#bda990'),
    box(0, .79, .025, 1.21, .09, .31, wood), box(0, 1.22, 0, 1.16, .93, .14, wood),
    box(0, 1.22, .083, .99, .78, .035, '#8dc2c9'), box(0, 1.22, .11, .055, .82, .05, light),
    box(0, 1.22, .11, 1.02, .055, .05, light)]),
  bed: model('interior', 'Bed', .69, [box(0, .23, 0, 1.09, .38, 1.55, wood), box(0, .48, 0, 1.07, .22, 1.48, light), box(0, .59, .25, 1.08, .1, .97, teal), ball(0, .65, -.49, .63, .18, .48, '#f0e3cf'), box(0, .56, -.8, 1.2, .74, .13, wood)]),
  'floor-lamp': model('interior', 'Floor lamp', .18, [round(0, .06, 0, .47, .11, .47, slate), post(0, 0, 1.55, slate), cone(0, 1.57, 0, .61, .38, .61, light)]),
  'tea-set': model('interior', 'Tea tray', .16, [box(0, .05, 0, .64, .09, .4, wood), ball(-.16, .19, 0, .31, .21, .28, teal), ring(-.31, .2, 0, .18, .17, .23, teal), round(.15, .14, .04, .16, .12, .15, light), ring(.24, .16, .04, .12, .1, .2, light)], ['teapot']),
  rug: model('interior', 'Woven rug', 0, [box(0, .015, 0, 1.65, .03, 1.09, rose), box(0, .034, 0, 1.48, .01, .92, '#a75242'), ...[-.39, 0, .39].map(x => shape('box', x, .043, 0, .28, .012, .28, light, [0, Math.PI / 4, 0]))]),
  'wall-shelf': model('interior', 'Display shelf', .44, [...[-.42, .42].map(x => post(x, 0, 1.24)), ...[.39, .78, 1.2].map(y => box(0, y, .02, 1.04, .1, .39, light)), round(-.16, .95, .04, .25, .29, .25, rose)]),
  'writing-desk': model('interior', 'Writing desk', .51, [...corners(.45, .25, .67), box(0, .72, 0, 1.14, .12, .66, wood), box(.35, .49, 0, .34, .34, .55, wood), box(-.22, .79, .08, .34, .03, .25, light)], ['desk']),
  'coat-stand': model('interior', 'Coat stand', .18, [post(0, 0, 1.61), box(0, .08, 0, .52, .15, .16, wood), box(0, .08, 0, .16, .15, .52, wood), ...[-1, 1].map(x => bar([0, 1.16, 0], [x * .35, 1.55, 0], .08, wood))]),
  'picture-frame': model('interior', 'Picture frame', .14, [post(0, 0, .89), box(0, .95, 0, .73, .57, .12, wood), box(0, .95, .067, .61, .45, .015, light), cone(-.06, .91, .08, .33, .27, .015, leaf)], ['photo frame']),
  buoy: model('coastal', 'Buoy', .18, [round(0, .1, 0, .45, .2, .45, rose), cone(0, .29, 0, .3, .28, .3, light), post(0, 0, .53, slate)]),
  barn: structure('coastal', 'Barn', .95, [cabinet(1.71, 1.27, 1.33, rose), shape('cone', 0, 1.43, 0, 2.24, .62, 1.94, slate, [0, .78, 0]), box(0, .46, .686, .69, .91, .07, wood), ...[-1, 1].map(x => bar([-.29 * x, .11, .73], [.29 * x, .83, .73], .065, light))]),
  windmill: structure('coastal', 'Windmill', .63, [round(0, .94, 0, 1.02, 1.86, 1.02, light), cone(0, 2.04, 0, 1.24, .51, 1.24, slate), ...Array.from({ length: 4 }, (_, i) => {
    const a = i * Math.PI / 2 + .3;
    return bar([0, 1.68, .56], [Math.sin(a) * 1.07, 1.68 + Math.cos(a) * 1.07, .56], .18, wood);
  })]),
  cabin: structure('coastal', 'Log cabin', .83, [cabinet(1.45, 1.19, 1.26, wood), ...[.21, .43, .65, .87, 1.09].map(y => shape('round', 0, y, .64, .17, 1.58, .16, '#9b6c4d', [0, 0, Math.PI / 2])), shape('box', -.36, 1.34, 0, .89, .12, 1.46, slate, [0, 0, .34]), shape('box', .36, 1.34, 0, .89, .12, 1.46, slate, [0, 0, -.34]), box(.3, .41, .737, .4, .81, .08, light)]),
  'lobster-pot': model('coastal', 'Lobster pot', .38, [box(0, .09, 0, .8, .18, .54, wood), ...[-.27, 0, .27].map(x => ring(x, .19, 0, .58, .43, .17, light, [0, Math.PI / 2, 0])), ...[-.18, 0, .18].map(z => box(0, .34, z, .79, .046, .046, wood))]),
  'sail-rack': model('coastal', 'Sail rack', .39, [post(-.36, 0, .94), post(.36, 0, .94), box(0, .84, 0, .89, .11, .19, wood), cone(-.17, .56, .07, .55, .77, .12, light, [0, 0, .22]), cone(.19, .48, -.05, .52, .75, .13, rose, [0, 0, -.3])]),
  haystack: model('coastal', 'Haystack', .49, [round(0, .25, 0, 1.06, .49, .95, '#bf984e'), cone(0, .65, 0, 1.09, .55, 1, '#d9b961'), round(0, .39, 0, 1.081, .055, .96, wood)]),
  well: model('coastal', 'Roofed well', .54, [round(0, .26, 0, 1.11, .52, 1.11, slate), round(0, .528, 0, .75, .038, .75, '#335d68'), post(-.43, 0, 1.34), post(.43, 0, 1.34), shape('box', -.26, 1.37, 0, .68, .12, .91, rose, [0, 0, .36]), shape('box', .26, 1.37, 0, .68, .12, .91, rose, [0, 0, -.36])]),
  'dry-stone-wall': model('coastal', 'Dry stone wall', .55, [box(0, .18, 0, 1.26, .36, .31, slate), ...[-.47, -.15, .17, .46].map((x, i) => ball(x, .39 + i % 2 * .04, 0, .37, .27, .36, '#a49e88'))]),
  ruin: structure('fantasy', 'Stone ruin', .8, [box(-.57, .69, 0, .38, 1.38, .53, slate), box(.55, .43, 0, .45, .86, .48, slate), ball(-.35, 1.31, 0, .65, .37, .59, '#91957d'), box(.35, .19, .59, .56, .37, .44, slate)], ['ruins']),
  crystal: model('fantasy', 'Crystal cluster', .34, [cone(0, .56, 0, .39, 1.04, .35, '#8e83cd'), cone(-.2, .35, .09, .24, .67, .24, '#ac9ce4', [0, 0, .47]), cone(.23, .32, -.08, .22, .62, .22, '#6e90c1', [0, 0, -.44]), ball(0, .11, 0, .72, .21, .59, slate)], ['crystals']),
  airlock: model('fantasy', 'Airlock frame', 0, [post(-.79, 0, 1.9, metal), post(.79, 0, 1.9, metal), box(0, 1.98, 0, 1.91, .24, .46, slate), ...[-.81, .81].map(x => box(x, 1.06, .14, .18, 1.8, .22, teal)), box(0, 2.11, .19, .57, .14, .09, light)]),
  dome: structure('fantasy', 'Greenhouse dome', 1.19, [round(0, .12, 0, 2.47, .24, 2.47, slate), ball(0, .59, 0, 2.38, 1.19, 2.38, '#77b6ad'), ...[0, Math.PI / 3, -Math.PI / 3].map(y => ring(0, .46, 0, 2.43, 1.57, .07, light, [0, y, 0])), box(0, .56, 1.05, .54, .89, .17, slate)], ['greenhouse', 'dome']),
  'station-module': structure('fantasy', 'Station habitat', 1.15, [shape('round', 0, .75, 0, 1.39, 2.11, 1.39, metal, [0, 0, Math.PI / 2]), ...[-.66, .64].map(x => box(x, .18, 0, .23, .36, 1.43, slate)), ...[-.56, 0, .56].map(x => ring(x, .81, .64, .31, .31, .33, teal))], ['lunar station', 'space station', 'station habitat']),
  'control-panel': model('fantasy', 'Control panel', .43, [cabinet(.55, .71, .42, slate), shape('box', 0, .79, 0, .89, .17, .56, metal, [.24, 0, 0]), ...[-.26, -.08, .1, .28].map((x, i) => box(x, .89, .068, .09, .03, .09, i % 2 ? rose : teal))], ['console']),
  porthole: model('fantasy', 'Porthole display', .38, [cabinet(.86, 1.41, .24, slate), ring(0, 1.02, .15, .65, .65, .34, metal), ball(0, 1.02, .17, .47, .47, .13, teal)]),
  rover: model('fantasy', 'Rover', .69, [box(0, .44, 0, 1.06, .29, .66, metal), ...[-.4, 0, .4].flatMap(x => [-.39, .39].map(z => shape('round', x, .19, z, .37, .18, .37, slate, [Math.PI / 2, 0, 0]))), post(.24, 0, .84, light), ball(.24, .92, 0, .24, .15, .18, rose)]),
  'satellite-dish': model('fantasy', 'Satellite dish', .34, [round(0, .1, 0, .61, .19, .53, slate), post(0, 0, .86, metal), shape('ball', 0, 1.08, 0, 1.04, .23, .87, light, [.54, 0, -.28]), bar([0, 1.09, 0], [.11, 1.55, .24], .08, slate)], ['antenna', 'dish']),
  'standing-stone': model('fantasy', 'Standing stone', .43, [ball(0, .14, 0, 1.06, .28, .77, slate), shape('box', 0, .77, 0, .47, 1.42, .3, '#7d8890', [0, 0, -.12]), box(.06, .83, .153, .17, .62, .03, '#a9c2a4')], ['monolith']),
  'magic-portal': structure('fantasy', 'Rune portal', .66, [round(0, .09, 0, 1.6, .18, .83, slate), ring(0, .95, 0, 1.6, 1.9, .34, '#9775ac'), ball(0, .96, -.02, .96, 1.32, .1, '#719abe')], ['portal']),
  'astronaut': model('fantasy', 'Astronaut', .21, [ball(0, .64, 0, .44, .49, .29, light), ball(0, 1.01, 0, .41, .39, .39, metal), ball(0, 1, .117, .33, .245, .205, teal), ...[-.11, .11].map(x => box(x, .19, 0, .14, .38, .19, slate)), box(0, .65, -.19, .3, .36, .21, light)]),
  robot: model('fantasy', 'Maintenance robot', .26, [box(0, .47, 0, .43, .31, .29, metal), box(0, .76, 0, .35, .29, .29, slate), ...[-.11, .11].map(x => box(x, .79, .151, .08, .063, .028, teal)), ...[-.19, .19].map(x => shape('round', x, .17, 0, .34, .13, .34, slate, [0, 0, Math.PI / 2])), bar([.03, .88, 0], [.14, 1.05, 0], .04, metal)]),
  'lantern-shrine': structure('fantasy', 'Lantern shrine', .52, [round(0, .1, 0, .98, .2, .84, slate), round(0, .37, 0, .29, .44, .29, slate), box(0, .69, 0, .6, .29, .53, '#efb665'), cone(0, .92, 0, .85, .28, .8, slate)], ['shrine']),
  'floating-slab': model('fantasy', 'Floating slab', .5, [cone(0, .76, 0, 1.18, .63, .95, slate, [0, 0, Math.PI]), box(0, 1.075, 0, 1.02, .09, .72, leaf), ball(0, .075, 0, .48, .13, .41, '#809cb8')]),
  'observatory': structure('fantasy', 'Observatory', 1.04, [round(0, .5, 0, 1.84, 1, 1.84, slate), ball(0, 1.1, 0, 1.74, 1.19, 1.74, metal), shape('round', .48, 1.52, .17, .28, .84, .28, '#40536b', [0, 0, -.67]), box(0, .45, .84, .42, .9, .19, light)]),
  cavern: structure('fantasy', 'Cavern mouth', 1.03, [ball(-.76, .63, -.2, .98, 1.55, 1.73, '#545968'),
    ball(.76, .56, -.22, .85, 1.61, 1.67, slate), ball(.02, 1.35, -.31, 2.32, .98, 1.68, '#4e5360'),
    ball(.13, .77, -.72, 2.37, 1.46, .58, '#2e303d'), ball(-.56, .11, .37, .62, .27, .55, '#626576'),
    ball(.58, .23, .38, .78, .35, .68, '#5a6072'), box(0, .03, -.27, 1.51, .06, 1.2, '#474952')], ['cave', 'grotto']),
} satisfies Record<string, Model>;

export type OriginalModelId = keyof typeof originalModels;
export const originalModelIds = Object.keys(originalModels) as OriginalModelId[];
export function originalModel(id: string): Model | undefined {
  return Object.hasOwn(originalModels, id) ? originalModels[id as OriginalModelId] : undefined;
}
