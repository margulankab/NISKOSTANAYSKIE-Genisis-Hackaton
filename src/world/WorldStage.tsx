import type { ReactNode } from 'react';
import { RevealBurst } from './RevealBurst';
import { useView, toggleView, useTuning } from '../chrome/use-view';
import { InkFromSettings } from '../scene/InkLook';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import { blocked, canReach, stepPlayer, targetAt } from '../gameplay/controller';
import type { Input, Target } from '../gameplay/controller';
import type { Point, WalkLayout } from '../gameplay/layout';
import { ContextMonitor, Preview, StageBoundary } from '../scene/MemoryStage';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';
import { webglAvailable } from '../scene/WalkStage';
import { builders, defaultColors } from './builders';
import { OriginalModels, GroundsDressing } from './SceneModels';
import { originalModel } from './original-models';
import type { LegacyRecipeId, RecipeId } from './recipes';
import { WorldScenery } from '../scene/WorldScenery';
import type { WorldAtmosphere } from '../scene/WorldScenery';
import type { MemoryScene } from '../shared/memory-schema';
import { groundBounds, momentPoint } from './layout-schema';
import { placementHeight, placementSolids, recipes, sceneryPlacement } from './recipes';
import { routeTo } from './route';
import { StoryCharacter } from './StoryCharacter';
import { WorldPhotoFrame } from './WorldPhotoFrame';
import { AdaptiveResolution, useRenderScale } from '../chrome/AdaptiveResolution';
import { usePixel } from '../chrome/use-pixel';
import { placementById, toWalkLayout } from './world-schema';
import type { PromptWorld } from './world-schema';
import type { PlotVisit } from './PlotVisit';
import { PlotActor } from './PlotActor';
import type { ActorPose } from './PlotActor';
import { freshPlotFrame, PlotPerformance } from './PlotPerformance';
import type { PlotFrame } from './PlotPerformance';
import { groundHeight, hasPlotRelief, PlotTerrain } from './plot-terrain';
import { readSettings, subscribeToSettings } from '../menus/settings';
import { PlotSky } from './PlotSky';
import { SceneSurroundings, SceneWeather } from './SceneSurroundings';
import { SceneGuests } from './SceneCast';
import { sceneAmbience } from './scene-audio';
import type { SceneDirection } from './scene-direction';

type StageWorld = Pick<PromptWorld, 'layout' | 'interpretation' | 'story' | 'scene'>;
type StageAudio = { activeAudio: HTMLAudioElement | null; music?: MemoryScene['music']; lightColor?: string; ambientScale?: number; detailColor?: string; photoUrl?: string; muted?: boolean; songPulse?: { bpm: number; energy: number } };
const NO_EXCLUSIONS: readonly RecipeId[] = [];

const CAMERA = { y: 5.2, z: 6.4, ahead: 2 };
const orbitDefault = { yaw: 0, pitch: .38 };
const moodLighting = {
  calm: '#c5e5d3', nostalgic: '#ecd7aa', joyful: '#ffe0a0', tense: '#c1cfe6',
  subdued: '#9eaec8', curious: '#d2c5ef', relieved: '#fff0c4',
} as const;
const KEYS: Record<string, Point> = {
  w: { x: 0, z: -1 }, arrowup: { x: 0, z: -1 }, s: { x: 0, z: 1 }, arrowdown: { x: 0, z: 1 },
  a: { x: -1, z: 0 }, arrowleft: { x: -1, z: 0 }, d: { x: 1, z: 0 }, arrowright: { x: 1, z: 0 },
};
const sky = {
  dawn: { background: '#c9a99b', light: '#ffd2a8', ambient: 0.75, sun: 1.6 },
  day: { background: '#9fbfd1', light: '#fff4df', ambient: 0.95, sun: 2.2 },
  dusk: { background: '#5d4a5f', light: '#ffb27a', ambient: 0.6, sun: 1.4 },
  night: { background: '#151c2b', light: '#9db4e0', ambient: 0.35, sun: 0.55 },
} as const;
const grounds = { grass: '#5f7a4b', sand: '#b8a57f', paved: '#7f766e', floor: '#7b5f45' };

export function describeTarget(target: Target | null, world: StageWorld, revealed: ReadonlySet<string>, labels?: readonly [string, string]) {
  const name = (id: string) => labelFor(world, id).toLowerCase();
  if (!target) {
    const index = world.layout.discoveries.findIndex(({ placementId }) => !revealed.has(placementId));
    if (index >= 0) return `Find the marked ${labels?.[index].toLowerCase() ?? name(world.layout.discoveries[index].placementId)}.`;
    return world.story ? `Find ${world.story.npc.name} near the landmark.` : `Walk to the ${name(world.layout.landmark.placementId)}.`;
  }
  if (target.kind === 'ending') {
    if (world.story) return target.ready ? `Press E to talk to ${world.story.npc.name}.` : 'Explore both objects before starting the conversation.';
    const landmark = name(world.layout.landmark.placementId);
    return target.ready ? `Press E at the ${landmark} to finish.` : `The ${landmark} opens once both discoveries are found.`;
  }
  const id = world.layout.discoveries[target.index].placementId;
  const label = labels?.[target.index].toLowerCase() ?? name(id);
  return revealed.has(id) ? `The ${label} · already found` : `Press E to look at the ${label}.`;
}

/** A readable name for a placement, with the prompt's color word when it named one. */
export function labelFor(world: StageWorld, placementId: string) {
  const placement = placementById(world.layout, placementId);
  const term = placement.term === null ? null : world.interpretation.terms[placement.term];
  const label = recipes[placement.recipe].label;
  return term?.color ? `${term.color[0].toUpperCase()}${term.color.slice(1)} ${label.toLowerCase()}` : label;
}

function WorldScene({ world, layout, revealed, ended, position, input, playerGroup, hud, compass, onTarget, paused,
  conversationOpen, audio, visit, orbit, plotFrame, meter, subtitle, sound }: {
  world: StageWorld;
  audio?: StageAudio;
  layout: WalkLayout;
  revealed: ReadonlySet<string>;
  ended: boolean;
  position: RefObject<Point>;
  input: RefObject<Input>;
  playerGroup: RefObject<Group | null>;
  hud: RefObject<HTMLElement | null>;
  compass?: RefObject<HTMLDivElement | null>;
  onTarget: (target: Target | null) => void;
  paused: boolean;
  conversationOpen: boolean;
  visit?: PlotVisit;
  orbit: RefObject<typeof orbitDefault>;
  plotFrame: RefObject<PlotFrame>;
  meter: RefObject<HTMLDivElement | null>;
  subtitle: RefObject<HTMLParagraphElement | null>;
  sound: RefObject<AudioContext | null>;
}) {
  const compassText = useRef('');
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const view = useView();
  const camera = useThree(({ camera: c }) => c);
  const lastKey = useRef('');
  const conversationBlend = useRef(0);
  const cinematicYaw = useRef(0);
  const pose = useRef<ActorPose>({ walking: 0, progress: 0 });
  const revealedCount = useRef(0);
  revealedCount.current = revealed.size;
  const { timeOfDay, weather } = world.interpretation;
  const light = sky[timeOfDay];
  const night = timeOfDay === 'night' || timeOfDay === 'dusk';
  const { bounds, water, drySurfaces, indoor, geometryVersion, direction } = world.layout;
  const palette = direction?.palette;
  const shoreSide = water ? water.maxX === bounds.maxX ? 1 : -1 : 0;
  const slide = world.layout.placements.find(p => p.recipe === 'tube-slide');
  const moment = visit?.current ?? (visit?.ended ? visit.plot.moments.at(-1) : undefined);
  const point = moment && momentPoint(world.layout, moment);
  const preferredSide = moment?.companionSide === 'left' ? -1 : 1;
  const companionSide = point && [preferredSide, -preferredSide].find(side =>
    [1.2, 2].every(offset => !blocked({ x: point.x + offset * side, z: point.z - .8 }, layout))) || preferredSide;
  const mood = moment?.mood ?? visit?.plot.moments.at(-1)?.mood;
  const field = world.layout.profile === 'ballfield';
  const scenery = useMemo(() => geometryVersion ? world.layout.placements.flatMap((placement) => {
    const model = sceneryPlacement({ ...placement, y: placement.y + groundHeight(world.layout, placement.x, placement.z) });
    return model ? [model] : [];
  }) : [], [geometryVersion, world.layout]);
  const sceneryIds = useMemo(() => new Set(scenery.map(({ id }) => id)), [scenery]);
  const models = useMemo(() => world.layout.placements.filter(p => originalModel(p.recipe) &&
    !(direction && indoor && p.recipe === 'window' && Math.abs(p.z - indoor.area.minZ) < .28)).map(p => ({
    ...p, y: p.y + groundHeight(world.layout, p.x, p.z),
  })), [world.layout, direction, indoor]);
  const cameraBlockers = useMemo(() => geometryVersion === 3 ? [
    ...world.layout.solids.map(solid => ({ solid, height: 1.6 })),
    ...world.layout.placements.flatMap(p => {
      const height = (placementHeight(p.recipe) ?? 1.2) * p.scale;
      return height > 1.05 && !['pine', 'tree', 'birch', 'palm', 'willow'].includes(p.recipe)
        ? placementSolids(p).map(solid => ({ solid, height })) : [];
    }),
  ] : [], [world.layout, geometryVersion]);
  const atmosphere: WorldAtmosphere = weather !== 'clear' ? weather : timeOfDay === 'day' ? 'daylight' : timeOfDay;
  const groundKey = world.layout.profile === 'market' || world.layout.profile === 'city' || (world.layout.profile === 'fantasy' && world.layout.placements.some(p => p.recipe === 'cavern')) || world.interpretation.terms.some((t) => t.zone === 'paved'
    || (geometryVersion && t.recipe === 'stall' && /\b(?:market|bazaar|fair)\b/i.test(t.text))) ? 'paved'
    : water ? 'sand' : world.interpretation.setting === 'indoor' ? 'floor' : 'grass';
  const fogColor = weather === 'fog' ? '#b9c0c4' : weather === 'snow' ? '#e3e7ea' : light.background;
  const keyColor = palette ? '#' + new Color(palette.light).lerp(new Color(mood ? moodLighting[mood] : palette.light), .20).getHexString()
    : mood ? moodLighting[mood] : audio?.lightColor;
  const ready = revealed.size >= 2;
  const discoveryIds = world.layout.discoveries.map(({ placementId }) => placementId);

  useEffect(() => {
    const { x, z } = position.current;
    camera.position.set(x, CAMERA.y, z + CAMERA.z);
    camera.lookAt(x, 0.6, z - CAMERA.ahead);
  }, [camera, position]);

  useFrame((_, dt) => {
    const { yaw, pitch } = orbit.current;
    const inputSin = Math.sin(yaw), inputCos = Math.cos(yaw);
    const { x, z, run } = input.current;
    const before = position.current;
    const next = paused || visit?.playing || visit?.ended ? before
      : stepPlayer(before, { x: x * inputCos + z * inputSin, z: z * inputCos - x * inputSin, run }, dt, layout);
    position.current = next;
    const baseY = groundHeight(world.layout, next.x, next.z);
    const player = playerGroup.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    const action = visit?.playing ? plotFrame.current.action : undefined;
    const travel = action && plotFrame.current.travel;
    const y = travel && !reducedMotion ? travel.y : baseY;
    if (travel) player?.position.copy(travel);
    else player?.position.set(next.x, y, next.z);
    if (player) player.visible = !action || !plotFrame.current.insideSlide;
    const directedYaw = !reducedMotion && action?.kind === 'sip' && shoreSide ? -shoreSide * 1.02 : undefined;
    const cameraYaw = directedYaw ?? yaw;
    cinematicYaw.current += Math.atan2(Math.sin(cameraYaw - cinematicYaw.current), Math.cos(cameraYaw - cinematicYaw.current)) * k;
    const sin = Math.sin(cinematicYaw.current), cos = Math.cos(cinematicYaw.current);
    pose.current.walking = next !== before ? run ? 1.55 : 1 : 0;
    pose.current.action = action?.actor === 'player' ? action.kind : action?.kind === 'comfort' ? 'mourn' : undefined;
    pose.current.progress = plotFrame.current.progress;
    if (player && (next !== before || visit?.playing)) {
      const angle = visit?.playing ? (plotFrame.current.facing ?? directedYaw ?? (action?.kind === 'talk' ? -.5 : 0))
        : Math.atan2(before.x - next.x, before.z - next.z);
      player.rotation.y += Math.atan2(Math.sin(angle - player.rotation.y), Math.cos(angle - player.rotation.y)) * k;
    }
    conversationBlend.current += (Number(conversationOpen) - conversationBlend.current) * k;
    const blend = conversationBlend.current;
    const flight = visit?.playing && !reducedMotion ? plotFrame.current.focus : null;
    const framing = visit?.playing && !reducedMotion ? moment?.framing : undefined;
    const focusX = travel && !reducedMotion ? travel.x : next.x + (layout.landmark.x - next.x) * blend + (flight ? (flight.x - next.x) * .27 : 0);
    const focusZ = travel && !reducedMotion ? travel.z : next.z + (layout.landmark.z - next.z) * blend + (flight ? (flight.z - next.z) * .27 : 0);
    const focusY = y + (visit ? .97 : .85);
    const distance = visit ? framing === 'close' ? 3.9 : framing === 'wide' || flight ? 6.45 : 5.25 : CAMERA.z + (3.4 - CAMERA.z) * blend;
    const vertical = y + (visit ? 1.05 + Math.sin(pitch) * distance : CAMERA.y + (1.9 - CAMERA.y) * blend);
    const wantedY = palette && indoor && world.interpretation.setting === 'indoor' ? Math.min(2.9, vertical) : vertical;
    const backX = sin * distance, backZ = cos * distance;
    let clearance = 1;
    for (let t = .15; t < 1 && (cameraBlockers.length || indoor); t += .06) {
      const sampleY = focusY + (wantedY - focusY) * t;
      const sampleX = focusX + backX * t, sampleZ = focusZ + backZ * t;
      const room = palette && world.interpretation.setting === 'indoor' ? indoor?.area : undefined;
      const crossesWall = room && (sampleX < room.minX + .22 || sampleX > room.maxX - .22 || sampleZ < room.minZ + .22 || sampleZ > room.maxZ - .22);
      if (crossesWall || sampleY < groundHeight(world.layout, sampleX, sampleZ) + .18 || cameraBlockers.some(({ solid, height }) =>
        sampleY < height + groundHeight(world.layout, solid.x, solid.z) + .18 &&
        (solid.shape === 'circle' ? Math.hypot(sampleX - solid.x, sampleZ - solid.z) < solid.radius + .12
          : Math.abs(sampleX - solid.x) < solid.halfX + .12 && Math.abs(sampleZ - solid.z) < solid.halfZ + .12))) {
        clearance = Math.max(.17, t - .08);
        break;
      }
    }
    const cameraK = clearance < 1 ? 1 : k;
    camera.position.x += (focusX + backX * clearance - camera.position.x) * cameraK;
    camera.position.y += (focusY + (wantedY - focusY) * clearance - camera.position.y) * cameraK;
    camera.position.z += (focusZ + backZ * clearance - camera.position.z) * cameraK;
    const ahead = visit ? .7 : CAMERA.ahead * (1 - blend);
    camera.lookAt(focusX - ahead * sin, directedYaw !== undefined ? y + 1.74
      : flight ? focusY + (flight.y - focusY) * .41 : visit ? focusY : .6 + .16 * blend, focusZ - ahead * cos);
    if (view === 'first' && !visit?.playing) {
      if (player) player.visible = false;
      camera.position.set(next.x, baseY + 1.55, next.z);
      camera.lookAt(next.x - inputSin * 5, baseY + 1.55 + (pitch - orbitDefault.pitch) * 5, next.z - inputCos * 5);
    }
    const target: Target | null = visit ? !visit.ended && point && canReach(next, point, layout) ? { kind: 'ending', ready: true } : null
      : targetAt(next, layout, revealedCount.current, discoveryIds.map(id => revealed.has(id)));
    const key = target ? target.kind + ('index' in target ? target.index : target.ready) : '';
    if (key !== lastKey.current) {
      lastKey.current = key;
      onTarget(target);
    }
    hud.current?.setAttribute('data-player', next.x.toFixed(2) + ',' + next.z.toFixed(2));
    if (direction) {
      hud.current?.setAttribute('data-plot-action', action?.kind ?? '');
      hud.current?.setAttribute('data-plot-progress', plotFrame.current.progress.toFixed(2));
    }
    const box = compass?.current;
    if (box) {
      const nextIndex = discoveryIds.findIndex(id => !revealed.has(id));
      const goal = visit ? (visit.playing || visit.ended ? null : point) : conversationOpen || ended ? null : nextIndex >= 0 ? layout.artifacts[nextIndex] : layout.landmark;
      const distance = goal ? Math.hypot(goal.x - next.x, goal.z - next.z) : 0;
      const text = goal && distance > layout.reach + 1.2
        ? `${Math.round((Math.atan2(goal.x - next.x, next.z - goal.z) + yaw) * 180 / Math.PI / 5) * 5}|${Math.round(distance)}` : '';
      if (text !== compassText.current) {
        compassText.current = text;
        box.hidden = !text;
        if (text) {
          const [angle, metres] = text.split('|');
          box.style.setProperty('--heading', angle + 'deg');
          box.lastElementChild!.textContent = `${metres} m`;
          box.setAttribute('data-goal', visit ? 'moment' : nextIndex >= 0 ? 'discovery' : 'ending');
        }
      }
    }
  });

  const ground = geometryVersion ? groundBounds(world.layout) : bounds;
  const width = ground.maxX - ground.minX, depth = ground.maxZ - ground.minZ;
  const cx = (ground.minX + ground.maxX) / 2, cz = (ground.minZ + ground.maxZ) / 2;
  return (
    <>
      {geometryVersion ? (
        <WorldScenery ambientMotion placements={scenery} atmosphere={atmosphere} paused={paused} horizon={palette?.horizon} shoreSide={shoreSide}
          activeAudio={paused ? null : audio?.activeAudio ?? null} music={audio?.music} lightColor={keyColor}
          ambientScale={mood === 'subdued' || mood === 'tense' ? .72 * (audio?.ambientScale ?? 1) : audio?.ambientScale} songPulse={audio?.songPulse} />
      ) : (
        <>
          <color attach="background" args={[fogColor]} />
          <fog attach="fog" args={[fogColor, weather === 'fog' ? 7 : 14, weather === 'fog' ? 30 : 40]} />
          <ambientLight intensity={light.ambient} />
          <directionalLight position={[-4, 8, 5]} color={light.light} intensity={light.sun} />
        </>
      )}
      {mood && !indoor && <PlotSky atmosphere={atmosphere} mood={mood} palette={palette} shoreSide={shoreSide} />}
      {direction && <SceneSurroundings layout={world.layout} excluded={world.scene?.plan.intent.exclusions ?? NO_EXCLUSIONS}
        reduced={reducedMotion} paused={paused} />}
      {direction && !indoor && (weather === 'rain' || weather === 'snow') &&
        <SceneWeather bounds={bounds} weather={weather} reduced={reducedMotion} paused={paused} />}
      {drySurfaces ? drySurfaces.map((area, index) => (
        <mesh key={index} position={[(area.minX + area.maxX) / 2, -.15, (area.minZ + area.maxZ) / 2]}>
          <boxGeometry args={[area.maxX - area.minX, .3, area.maxZ - area.minZ]} />
          <meshStandardMaterial color={palette?.surface ?? (index < 2 ? '#c4a987' : '#cfb59a')} roughness={.93} />
        </mesh>
      )) : hasPlotRelief(world.layout) ? <PlotTerrain layout={world.layout} color={palette?.surface ?? grounds[groundKey]} /> : <mesh position={[cx, -0.15, cz]}>
        <boxGeometry args={[width + (geometryVersion ? 0 : 6), 0.3, depth + (geometryVersion ? 0 : 6)]} />
        <meshStandardMaterial color={palette?.surface ?? grounds[groundKey]} roughness={0.95} />
      </mesh>}
      {water && !direction && (
        <mesh position={[(water.minX + water.maxX) / 2 + Math.sign(water.minX + water.maxX) * 1.5, geometryVersion ? -0.08 : 0.02, cz]}>
          <boxGeometry args={[water.maxX - water.minX + 3, 0.04, depth + 6]} />
          <meshStandardMaterial color="#3e6f87" roughness={0.35} transparent opacity={0.92} />
        </mesh>
      )}
      {geometryVersion === 3 && world.interpretation.setting !== 'indoor' && <GroundsDressing layout={world.layout} tint={audio?.detailColor ?? palette?.accent} excluded={world.scene?.plan.intent.exclusions ?? NO_EXCLUSIONS} />}
      {models.length > 0 && <OriginalModels placements={models} tint={audio?.detailColor ?? palette?.accent} />}
      {visit?.plot.gathering && <SceneGuests layout={world.layout} reduced={reducedMotion} paused={paused} />}
      {geometryVersion === 3 && audio?.photoUrl && <WorldPhotoFrame url={audio.photoUrl} from={layout.artifacts[0]}
        toward={placementById(world.layout, discoveryIds[0])} />}
      {indoor && <Room area={indoor.area} door={indoor.door} whole={world.interpretation.setting === 'indoor'} palette={palette} weather={weather} />}
      {world.layout.placements.map((p) => {
        const recipe = p.recipe as Exclude<LegacyRecipeId, 'canopy'>;
        const Builder = !sceneryIds.has(p.id) ? builders[recipe] : undefined;
        const main = new Color(defaultColors[recipe] ?? '#a9564a');
        if (p.color) main.setRGB(p.color[0] / 255, p.color[1] / 255, p.color[2] / 255, SRGBColorSpace);
        else if (palette) main.lerp(new Color(palette.accent), .2);
        const accent = new Color(p.color ? '#efe5cf' : '#b5533c');
        const isDiscovery = discoveryIds.includes(p.id);
        const isLandmark = p.id === world.layout.landmark.placementId;
        return (
          <group key={p.id} position={[p.x, p.y + groundHeight(world.layout, p.x, p.z), p.z]} rotation={[0, p.rotation, 0]} scale={p.scale}>
            {Builder && <Builder main={main} accent={accent} lit={night || (isLandmark && ready)} />}
            {!world.layout.approaches && (isDiscovery || (isLandmark && !world.story)) && (
              <mesh position={[0, 0.03 - p.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.75, 0.9, 24]} />
                <meshBasicMaterial color={isLandmark ? (ready ? '#ffd58a' : '#6b6658') : revealed.has(p.id) ? '#ffd58a' : '#e7bb84'}
                  transparent opacity={isLandmark && !ready ? 0.4 : 0.85} />
              </mesh>
            )}
          </group>
        );
      })}
      {!visit && world.layout.approaches?.map((p, index) => index === 2 && world.story ? null : (
        <mesh key={index} position={[p.x, .049, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.52, .68, 22]} />
          <meshBasicMaterial color={index === 2 && !ready ? '#817768' : '#ffd58a'} />
        </mesh>
      ))}
      {point && moment && visit && <>
        {!visit.playing && !visit.ended && <mesh position={[point.x, groundHeight(world.layout, point.x, point.z) + .069, point.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[.44, .53, 28]} /><meshBasicMaterial color="#ffe1a3" />
        </mesh>}
        <PlotPerformance key={Math.min(visit.completed, visit.plot.moments.length - 1)} point={point} height={groundHeight(world.layout, point.x, point.z)}
          side={companionSide} dog={visit.plot.companionKind === 'dog'} slide={slide} directed={Boolean(direction)}
          moment={moment} companion={Boolean(visit.plot.companion)} field={field} playing={visit.playing} paused={paused}
          reduced={reducedMotion} frame={plotFrame} meter={meter} subtitle={subtitle} audio={sound} finish={() => visit.finish(visit.completed)} />
      </>}
      {world.story && <StoryCharacter position={layout.landmark} outfit={world.story.npc.outfit} ready={ready && !ended} />}
      {night && world.layout.placements.filter((p) => !sceneryIds.has(p.id) && (p.recipe === 'lantern' || p.recipe === 'lamp')).slice(0, 4).map((p) => (
        <pointLight key={p.id} position={[p.x, p.y + (p.recipe === 'lamp' ? 2.2 : 0.6), p.z]} color="#ffc47a" intensity={4} distance={5} />
      ))}
      {ended && <pointLight position={[0, 3, bounds.minZ + 3]} color="#ffd58a" intensity={6} distance={10} />}
      <group ref={playerGroup}>
        {visit ? <PlotActor pose={pose} reduced={reducedMotion} /> : <>
        <mesh position={[0, 0.45, 0]}>
          <capsuleGeometry args={[0.2, 0.42, 3, 8]} />
          <meshStandardMaterial color="#e8c98f" flatShading roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <icosahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color="#f1dcb8" flatShading />
        </mesh>
        </>}
        {visit && <mesh position={[0, .017, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, .75, 1]}>
          <circleGeometry args={[.31, 22]} /><meshBasicMaterial color="#201d24" transparent opacity={.25} depthWrite={false} />
        </mesh>}
      </group>
    </>
  );
}

function Room({ area, door, whole, palette, weather }: {
  area: WalkLayout['bounds']; door: { x: number; z: number; width: number }; whole: boolean; palette?: SceneDirection['palette'];
  weather?: PromptWorld['interpretation']['weather'];
}) {
  const wall = palette ? '#' + new Color(palette.surface).lerp(new Color('#cfb69d'), .54).getHexString() : '#c8b79a';
  const cx = (area.minX + area.maxX) / 2, cz = (area.minZ + area.maxZ) / 2;
  const w = area.maxX - area.minX, d = area.maxZ - area.minZ;
  const lower = door.z - door.width / 2, upper = door.z + door.width / 2;
  const height = palette ? 3.25 : 1.6;
  return (
    <group>
      <mesh position={[cx, 0.01, cz]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color={palette?.surface ?? grounds.floor} roughness={0.9} />
      </mesh>
      {palette ? <>
        {[[-w / 2, -1.4], [1.4, w / 2]].map(([a, b]) => <mesh key={a} position={[cx + (a + b) / 2, height / 2, area.minZ]}>
          <boxGeometry args={[b - a, height, .24]} /><meshStandardMaterial color={wall} />
        </mesh>)}
        {[[.57, 1.14], [2.92, .66]].map(([y, h]) => <mesh key={y} position={[cx, y, area.minZ]}>
          <boxGeometry args={[2.8, h, .24]} /><meshStandardMaterial color={wall} />
        </mesh>)}
        <mesh position={[cx, 1.85, area.minZ - .16]}>
          <boxGeometry args={[2.81, 1.45, .12]} /><meshBasicMaterial color={palette.horizon} />
        </mesh>
        {weather === 'rain' && Array.from({ length: 17 }, (_, index) =>
          <mesh key={index} rotation={[0, 0, -.18]} position={[cx - 1.31 + index * .161, 1.32 + (index * 7 % 11) * .104, area.minZ - .086]}>
            <boxGeometry args={[.012, .155 + index % 3 * .036, .012]} />
            <meshBasicMaterial color={palette.light} transparent opacity={.41} />
          </mesh>)}
        {[-1.37, 0, 1.37].map(offset => <mesh key={offset} position={[cx + offset, 1.85, area.minZ + .09]}>
          <boxGeometry args={[.075, 1.52, .28]} /><meshStandardMaterial color="#675d52" />
        </mesh>)}
        {whole && <>
          <mesh position={[cx, height + .06, cz]}><boxGeometry args={[w, .12, d]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[cx, height - .18, cz]}><cylinderGeometry args={[.47, .38, .16, 12]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.light} emissiveIntensity={.53} /></mesh>
          <pointLight position={[cx, height - .34, cz]} color={palette.light} intensity={16} distance={12} />
          {[-1, 1].map(side => <mesh key={side} position={[cx + side * (w + door.width) / 4, height / 2, area.maxZ]}>
            <boxGeometry args={[(w - door.width) / 2, height, .24]} /><meshStandardMaterial color={wall} />
          </mesh>)}
          <mesh position={[cx, 2.83, area.maxZ]}><boxGeometry args={[door.width, .84, .24]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[cx, .035, area.maxZ + .54]}><boxGeometry args={[door.width, .09, 1.22]} /><meshStandardMaterial color={palette.surface} /></mesh>
          <mesh position={[cx, 1.2, area.maxZ + .65]}><boxGeometry args={[door.width, 2.4, .13]} /><meshBasicMaterial color={palette.sky} /></mesh>
        </>}
      </> : <mesh position={[cx, .8, area.minZ]}><boxGeometry args={[w, 1.6, .24]} /><meshStandardMaterial color={wall} /></mesh>}
      {!whole && (
        <>
          <mesh position={[cx, palette ? height / 2 : .4, area.maxZ]}><boxGeometry args={[w, palette ? height : .8, .24]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[door.x, height / 2, (area.minZ + lower) / 2]}><boxGeometry args={[.24, height, lower - area.minZ]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[door.x, height / 2, (upper + area.maxZ) / 2]}><boxGeometry args={[.24, height, area.maxZ - upper]} /><meshStandardMaterial color={wall} /></mesh>
          {palette && <mesh position={[door.x, 2.83, door.z]}><boxGeometry args={[.24, .84, door.width]} /><meshStandardMaterial color={wall} /></mesh>}
          {palette && <mesh position={[door.x === area.minX ? area.maxX : area.minX, height / 2, cz]}>
            <boxGeometry args={[.24, height, d]} /><meshStandardMaterial color={wall} />
          </mesh>}
        </>
      )}
      {whole && [area.minX, area.maxX].map((x) => (
        <mesh key={x} position={[x, height / 2, cz]}><boxGeometry args={[.24, height, d]} /><meshStandardMaterial color={wall} /></mesh>
      ))}
    </group>
  );
}

/** Walkable view of a prompt world. Movement and targeting come from A's controller. */
export function WorldStage({ world, revealed, ended, position, paused, onReveal, onFinish, onUnavailable,
  audio, areaLabel = 'Prompt world', artifactLabels, conversationOpen = false, visit, overlay, burstId }: {
  world: StageWorld;
  audio?: StageAudio;
  areaLabel?: string;
  artifactLabels?: readonly [string, string];
  conversationOpen?: boolean;
  revealed: ReadonlySet<string>;
  ended: boolean;
  position: RefObject<Point>;
  paused: boolean;
  onReveal: (placementId: string) => void;
  onFinish: () => void;
  onUnavailable: () => void;
  visit?: PlotVisit;
  overlay?: ReactNode;
  burstId?: string;
}) {
  const [layout] = useState(() => {
    const walk = toWalkLayout(world.layout);
    if (!world.story || world.layout.approaches) return walk;
    const standingPoint = routeTo(walk, { kind: 'ending', ready: true })?.at(-1);
    return standingPoint ? { ...walk, landmark: standingPoint } : walk;
  });
  const input = useRef<Input>({ x: 0, z: 0 });
  const held = useRef(new Map<string, Point>());
  const playerGroup = useRef<Group | null>(null);
  const hud = useRef<HTMLElement | null>(null);
  const compass = useRef<HTMLDivElement | null>(null);
  const running = useRef(false);
  const [target, setTarget] = useState<Target | null>(null);
  const orbit = useRef({ ...orbitDefault });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const plotFrame = useRef(freshPlotFrame());
  const meter = useRef<HTMLDivElement>(null);
  const subtitle = useRef<HTMLParagraphElement>(null);
  const sound = useRef<AudioContext | null>(null);
  const ambience = useRef<ReturnType<typeof sceneAmbience> | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const volume = useSyncExternalStore(subscribeToSettings, () => readSettings().volume, () => 0);
  const direction = world.layout.direction;
  const bed = direction && (visit?.playing || visit?.completed ? visit.current?.ambience ?? visit.plot.moments.at(-1)?.ambience ?? direction.bed : direction.bed);
  const point = visit?.current && momentPoint(world.layout, visit.current);

  const sync = useCallback(() => {
    let x = 0, z = 0;
    for (const d of held.current.values()) { x += d.x; z += d.z; }
    input.current = { x: Math.sign(x), z: Math.sign(z), run: running.current };
  }, []);
  const release = useCallback(() => { held.current.clear(); running.current = false; drag.current = null; sync(); }, [sync]);
  useEffect(() => () => {
    ambience.current?.dispose();
    ambience.current = null;
    if (sound.current) void sound.current.close().catch(() => {});
    sound.current = null;
  }, []);
  useEffect(() => {
    const context = sound.current;
    if (!context || !soundEnabled) return;
    if (direction && bed) {
      ambience.current ??= sceneAmbience(context);
      ambience.current.apply(bed, direction.mix, volume);
    }
    void (paused || silenced || audio?.muted || !volume ? context.suspend() : context.resume()).catch(() => {});
  }, [paused, silenced, audio?.muted, soundEnabled, direction, bed, volume]);

  const unlockSound = useCallback(() => {
    if (paused || silenced || audio?.muted || !volume) return;
    try {
      sound.current ??= new AudioContext();
      void sound.current.resume().catch(() => {});
      setSoundEnabled(true);
    } catch { /* Audio is optional on this device. */ }
  }, [paused, silenced, audio?.muted, volume]);

  const interact = useCallback(() => {
    if (paused) return;
    if (visit) {
      if (visit.playing) { plotFrame.current.input = 'catch'; return; }
      if (!point || !canReach(position.current, point, layout)) return;
      unlockSound();
      release();
      position.current = point;
      plotFrame.current = freshPlotFrame();
      visit.start();
      return;
    }
    const t = targetAt(position.current, layout, revealed.size, world.layout.discoveries.map(({ placementId }) => revealed.has(placementId)));
    if (!t) return;
    if (t.kind === 'artifact') onReveal(world.layout.discoveries[t.index].placementId);
    else if (t.ready) onFinish();
  }, [world, paused, onFinish, onReveal, position, layout, revealed, visit, point, release, unlockSound]);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  useEffect(() => {
    if (paused) { release(); return; }
    const down = (event: KeyboardEvent) => {
      const element = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (element instanceof HTMLElement && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))) return;
      const key = event.key.toLowerCase();
      if (running.current !== event.shiftKey) { running.current = event.shiftKey; sync(); }
      if (key === 'e' && !event.repeat) { interactRef.current(); return; }
      if (key === 'v' && !event.repeat) { toggleView(); return; }
      if ((key === 'arrowleft' || key === 'arrowright') && readSettings().view === 'first') {
        event.preventDefault(); orbit.current.yaw += key === 'arrowleft' ? .12 : -.12; return;
      }
      if (key === 'c') { orbit.current = { ...orbitDefault }; return; }
      if (key === 'q' || key === 'r') { orbit.current.yaw += key === 'q' ? -.24 : .24; return; }
      if (!KEYS[key]) return;
      event.preventDefault();
      if (direction && !sound.current) unlockSound();
      held.current.set('key:' + key, KEYS[key]);
      sync();
    };
    const up = (event: KeyboardEvent) => { running.current = event.shiftKey; held.current.delete('key:' + event.key.toLowerCase()); sync(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      release();
    };
  }, [paused, release, sync, direction, unlockSound]);

  const view = useView();
  const tuning = useTuning();
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const { dpr, adapt, scale } = useRenderScale(usePixel());
  const [supported] = useState(webglAvailable);
  const [lost, setLost] = useState(false);
  const loseContext = useCallback(() => { setLost(true); onUnavailable(); }, [onUnavailable]);
  useEffect(() => { if (!supported) onUnavailable(); }, [supported, onUnavailable]);
  const unavailable = <div className="stage-viewport"><Preview /></div>;
  if (!supported || lost) return <section className="memory-stage" aria-label={areaLabel}>{unavailable}</section>;

  const pad = (name: string, label: string, glyph: string, direction: Point) => (
    <button type="button" className={'walk-pad-' + name} aria-label={label} disabled={paused}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        held.current.set('pad:' + name, direction);
        sync();
        if (world.layout.direction && !sound.current) unlockSound();
      }}
      onPointerUp={() => { held.current.delete('pad:' + name); sync(); }}
      onPointerCancel={() => { held.current.delete('pad:' + name); sync(); }}
      onLostPointerCapture={() => { held.current.delete('pad:' + name); sync(); }}
      onContextMenu={(event) => event.preventDefault()}>{glyph}</button>
  );
  const canInteract = visit ? Boolean(visit.current && (visit.playing ? visit.current.input === 'timing' : target?.kind === 'ending')) : target?.kind === 'artifact'
    ? !revealed.has(world.layout.discoveries[target.index].placementId)
    : target?.ready === true && !ended;

  return (
    <section className="memory-stage" aria-label={areaLabel}>
      <StageBoundary fallback={unavailable} onFail={onUnavailable}>
        <div className="stage-viewport walk-viewport" ref={(element) => { hud.current = element; }} data-player="" data-view={view}
          data-walk-targets={JSON.stringify(layout)} data-moment-point={point && JSON.stringify(point)}
          data-scene-bed={bed}
          onPointerDown={event => {
            if (paused || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return;
            if (direction) unlockSound();
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }} onPointerMove={event => {
            const previous = drag.current;
            if (!previous || previous.id !== event.pointerId || paused) return;
            orbit.current.yaw -= (event.clientX - previous.x) * .007 * tuning.sensitivity;
            orbit.current.pitch = Math.min(.85, Math.max(.12, orbit.current.pitch + (event.clientY - previous.y) * .006));
            drag.current = { id: previous.id, x: event.clientX, y: event.clientY };
          }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          onLostPointerCapture={() => { drag.current = null; }}>
          <Canvas camera={{ position: [position.current.x, CAMERA.y, position.current.z + CAMERA.z], fov: view === 'first' ? tuning.fov : 50 }} dpr={dpr} fallback={<Preview />}>
            <ContextMonitor onLost={loseContext} />
            <WorldScene world={world} layout={layout} revealed={revealed} ended={ended} position={position} input={input}
              playerGroup={playerGroup} hud={hud} compass={compass} onTarget={setTarget} paused={paused}
              conversationOpen={conversationOpen} audio={audio} visit={visit} orbit={orbit} plotFrame={plotFrame} meter={meter} subtitle={subtitle} sound={sound} />
            {adapt && <AdaptiveResolution scale={scale} onScale={adapt} />}
            {burstId && !reducedMotion && world.layout.discoveries.map((item, index) => item.placementId === burstId &&
              <RevealBurst key={burstId} at={layout.artifacts[index]} color={direction?.palette.light ?? '#ffe9ac'} />)}
            <InkFromSettings />
          </Canvas>
          {overlay}
          {view === 'first' && !visit?.playing && <span className="walk-reticle" aria-hidden="true" />}
          {direction && <p ref={subtitle} className="plot-subtitle" aria-live="polite" hidden />}
          <p className="walk-prompt" role="status">{visit
            ? visit.ended ? 'The memory is complete.' : visit.playing ? visit.current.title
              : canInteract ? `E · ${visit.current.actionLabel}` : `Walk toward the marker · ${visit.current.title}`
            : conversationOpen
            ? (ended ? 'The memory is complete.' : 'Choose how to reply.')
            : describeTarget(target, world, revealed, artifactLabels)}</p>
          <div className="walk-compass" ref={compass} hidden aria-hidden="true"><span className="walk-compass-needle" /><span /></div>
          {visit?.playing && visit.current.input === 'timing' && <div className="catch-meter" ref={meter} hidden>
            <span>Catch in the highlighted window</span><span className="catch-track" aria-hidden="true" />
            <button type="button" onClick={() => { plotFrame.current.input = 'skip'; }}>Continue without timing</button>
          </div>}
          <div className="walk-pad" aria-label="Touch movement controls">
            {pad('up', 'Walk forward', '▲', { x: 0, z: -1 })}
            {pad('left', 'Walk left', '◀', { x: -1, z: 0 })}
            {pad('right', 'Walk right', '▶', { x: 1, z: 0 })}
            {pad('down', 'Walk back', '▼', { x: 0, z: 1 })}
          </div>
          <button type="button" className="walk-interact" disabled={!canInteract || paused} onClick={interact}>
            {visit?.current ? visit.playing && visit.current.input === 'timing' ? 'Catch' : visit.current.actionLabel : 'Interact'}
          </button>
        </div>
        <div className="stage-toolbar">
          <span>WASD or arrows to walk · Shift to run · E to act · drag or Q / R to orbit · Esc to pause</span>
          <button type="button" disabled={paused} onClick={toggleView}>{view === 'first' ? 'First person' : 'Third person'} · V</button>
          <button type="button" disabled={paused} onClick={() => { orbit.current = { ...orbitDefault }; }}>Recenter camera</button>
          <button type="button" disabled={paused || visit?.playing} onClick={() => { position.current = layout.spawn; orbit.current = { ...orbitDefault }; }}>Reset position</button>
          {direction && <button type="button" className="scene-sound-toggle" aria-pressed={silenced} disabled={paused}
            onClick={() => {
              if (!soundEnabled) unlockSound();
              else setSilenced(previous => !previous);
            }}>{!soundEnabled ? 'Enable scene sound' : silenced ? 'Unmute scene sound' : 'Mute scene sound'}</button>}
        </div>
      </StageBoundary>
    </section>
  );
}
