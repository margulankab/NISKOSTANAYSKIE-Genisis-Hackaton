import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import { canReach, stepPlayer, targetAt } from '../gameplay/controller';
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
import { RevealBurst } from './RevealBurst';
import { DiscoveryMarkers, Motes } from './WorldAmbience';
import { WorldPhotoFrame } from './WorldPhotoFrame';
import { useT } from '../i18n/i18n';
import { toggleView, useInk, useTuning, useView } from '../chrome/use-view';
import { InkLook } from '../scene/InkLook';
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
/** First person: eye height, look limits and drag sensitivity. */
const EYE = { y: 1.55, maxPitch: 0.62, dragYaw: 0.0055, dragPitch: 0.0042, turnSpeed: 2.1, bob: 0.035 };
export interface Look { yaw: number; pitch: number; turn: number; orbit: number; zoom: number }
/** Third-person orbit: elevation above the walker and distance, around the original framing. */
const ORBIT = { base: Math.atan2(CAMERA.y, CAMERA.z), distance: Math.hypot(CAMERA.y, CAMERA.z), min: 0.1, max: 1.4, minZoom: 0.45, maxZoom: 2.2 };
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
const grounds = { grass: '#7f9f68', sand: '#d1bb8e', paved: '#9a8f84', floor: '#8d6b4c' };

export function describeTarget(target: Target | null, world: StageWorld, revealed: ReadonlySet<string>, labels?: readonly [string, string],
  t: (text: string, vars?: Record<string, string | number>) => string = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k: string) => String(vars?.[k] ?? m))) {
  const name = (id: string) => t(labelFor(world, id)).toLowerCase();
  if (!target) {
    const index = world.layout.discoveries.findIndex(({ placementId }) => !revealed.has(placementId));
    if (index >= 0) return t('Find the marked {thing}.', { thing: labels ? t(labels[index]).toLowerCase() : name(world.layout.discoveries[index].placementId) });
    return world.story ? t('Find {name} near the landmark.', { name: world.story.npc.name }) : t('Walk to the {thing}.', { thing: name(world.layout.landmark.placementId) });
  }
  if (target.kind === 'ending') {
    if (world.story) return target.ready ? t('Press E to talk to {name}.', { name: world.story.npc.name }) : t('Explore both objects before starting the conversation.');
    const landmark = name(world.layout.landmark.placementId);
    return target.ready ? t('Press E at the {thing} to finish.', { thing: landmark }) : t('The {thing} opens once both discoveries are found.', { thing: landmark });
  }
  const id = world.layout.discoveries[target.index].placementId;
  const label = labels ? t(labels[target.index]).toLowerCase() : name(id);
  return revealed.has(id) ? t('The {thing} · already found', { thing: label }) : t('Press E to look at the {thing}.', { thing: label });
}

/** A readable name for a placement, with the prompt's color word when it named one. */
export function labelFor(world: StageWorld, placementId: string) {
  const placement = placementById(world.layout, placementId);
  const term = placement.term === null ? null : world.interpretation.terms[placement.term];
  const label = recipes[placement.recipe].label;
  return term?.color ? `${term.color[0].toUpperCase()}${term.color.slice(1)} ${label.toLowerCase()}` : label;
}

function WorldScene({ world, layout, revealed, ended, position, input, playerGroup, hud, compass, onTarget, paused,
  conversationOpen, audio, view, look, visit, plotFrame, meter, subtitle, sound }: {
  view: 'first' | 'third';
  look: RefObject<Look>;
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
  plotFrame: RefObject<PlotFrame>;
  meter: RefObject<HTMLDivElement | null>;
  subtitle: RefObject<HTMLParagraphElement | null>;
  sound: RefObject<AudioContext | null>;
}) {
  const compassText = useRef('');
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const camera = useThree(({ camera: c }) => c);
  const lastKey = useRef('');
  const conversationBlend = useRef(0);
  const cinematicYaw = useRef(0);
  const pose = useRef<ActorPose>({ walking: 0, progress: 0 });
  const revealedCount = useRef(0);
  revealedCount.current = revealed.size;
  // Discoveries already found when the scene opened (a loaded save) do not burst again.
  const foundAtStart = useRef(revealed);
  const { timeOfDay, weather } = world.interpretation;
  const light = sky[timeOfDay];
  const night = timeOfDay === 'night' || timeOfDay === 'dusk';
  const { bounds, water, drySurfaces, indoor, geometryVersion, direction } = world.layout;
  const palette = direction?.palette;
  const shoreSide = water ? water.maxX === bounds.maxX ? 1 : -1 : 0;
  const slide = world.layout.placements.find(p => p.recipe === 'tube-slide');
  const moment = visit?.current ?? (visit?.ended ? visit.plot.moments.at(-1) : undefined);
  const point = moment && momentPoint(world.layout, moment);
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

  const firstPerson = view === 'first';
  const stride = useRef(0);
  useEffect(() => {
    const { x, z } = position.current;
    camera.rotation.order = 'YXZ';
    if (firstPerson) {
      camera.position.set(x, EYE.y, z);
      camera.rotation.set(look.current.pitch, look.current.yaw, 0);
    } else {
      camera.position.set(x, CAMERA.y, z + CAMERA.z);
      camera.lookAt(x, 0.6, z - CAMERA.ahead);
    }
  }, [camera, position, firstPerson, look]);

  useFrame((_, dt) => {
    const view = look.current;
    if (!paused && view.turn) view.yaw += view.turn * EYE.turnSpeed * Math.min(dt, 0.1);
    // WASD move relative to where the walker looks (yaw 0 looks toward -z, the original axes).
    const raw = input.current;
    const lookSin = Math.sin(view.yaw), lookCos = Math.cos(view.yaw);
    const moving = { x: lookCos * raw.x + lookSin * raw.z, z: -lookSin * raw.x + lookCos * raw.z, run: raw.run };
    const before = position.current;
    // A moment that is playing, or the finished plot, holds the walker in place.
    const next = paused || visit?.playing || visit?.ended ? before : stepPlayer(before, moving, dt, layout);
    position.current = next;
    const baseY = groundHeight(world.layout, next.x, next.z);
    const player = playerGroup.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    const action = visit?.playing ? plotFrame.current.action : undefined;
    const travel = action && plotFrame.current.travel;
    const y = travel && !reducedMotion ? travel.y : baseY;
    if (travel) player?.position.copy(travel);
    else player?.position.set(next.x, y, next.z);
    const cinematic = Boolean(visit?.playing);
    // First person hides the walker, except while a moment plays and the camera steps outside to watch it.
    if (player) player.visible = (!firstPerson || cinematic) && (!action || !plotFrame.current.insideSlide);
    const directedYaw = !reducedMotion && action?.kind === 'sip' && shoreSide ? -shoreSide * 1.02 : undefined;
    // The moment's framing starts from where the player was looking.
    if (!cinematic) cinematicYaw.current = view.yaw;
    else {
      const cameraYaw = directedYaw ?? view.yaw;
      cinematicYaw.current += Math.atan2(Math.sin(cameraYaw - cinematicYaw.current), Math.cos(cameraYaw - cinematicYaw.current)) * k;
    }
    const sin = Math.sin(cinematicYaw.current), cos = Math.cos(cinematicYaw.current);
    pose.current.walking = next !== before ? raw.run ? 1.55 : 1 : 0;
    pose.current.action = action?.actor === 'player' ? action.kind : action?.kind === 'comfort' ? 'mourn' : undefined;
    pose.current.progress = plotFrame.current.progress;
    if (player) {
      if (cinematic) {
        const angle = plotFrame.current.facing ?? directedYaw ?? (action?.kind === 'talk' ? -.5 : 0);
        player.rotation.y += Math.atan2(Math.sin(angle - player.rotation.y), Math.cos(angle - player.rotation.y)) * k;
      } else player.rotation.y = view.yaw;
    }
    conversationBlend.current += (Number(conversationOpen) - conversationBlend.current) * k;
    const blend = conversationBlend.current;
    // During a conversation the walker turns to face the character.
    if (blend > 0.001 && conversationOpen) {
      const toward = Math.atan2(-(layout.landmark.x - next.x), -(layout.landmark.z - next.z));
      let delta = toward - view.yaw;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      view.yaw += delta * k;
      if (firstPerson) view.pitch += (-0.08 - view.pitch) * k;
    }
    if (cinematic) {
      // A playing plot moment is framed from outside (close, follow or wide), following the ball in flight.
      const flight = !reducedMotion ? plotFrame.current.focus : null;
      const framing = !reducedMotion ? moment?.framing : undefined;
      const focusX = travel && !reducedMotion ? travel.x : next.x + (flight ? (flight.x - next.x) * .27 : 0);
      const focusZ = travel && !reducedMotion ? travel.z : next.z + (flight ? (flight.z - next.z) * .27 : 0);
      const focusY = y + .97;
      const distance = framing === 'close' ? 3.9 : framing === 'wide' || flight ? 6.45 : 5.25;
      const vertical = y + 1.05 + Math.sin(orbitDefault.pitch) * distance;
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
      camera.lookAt(focusX - .7 * sin, directedYaw !== undefined ? y + 1.74 : flight ? focusY + (flight.y - focusY) * .41 : focusY, focusZ - .7 * cos);
    } else if (firstPerson) {
      const walked = Math.hypot(next.x - before.x, next.z - before.z);
      stride.current = walked > 0 && !reducedMotion ? stride.current + walked * 3.1 : 0;
      camera.position.set(next.x, baseY + EYE.y + Math.abs(Math.sin(stride.current)) * EYE.bob, next.z);
      camera.rotation.set(view.pitch, view.yaw, 0);
    } else {
      // Over the shoulder: the camera sits behind the walker along the look direction.
      const behindX = Math.sin(view.yaw), behindZ = Math.cos(view.yaw);
      const focusX = next.x + (layout.landmark.x - next.x) * blend;
      const focusZ = next.z + (layout.landmark.z - next.z) * blend;
      // 360° orbit: yaw circles the walker, orbit raises or lowers the camera, zoom moves it in or out.
      const elevation = Math.max(ORBIT.min, Math.min(ORBIT.max, ORBIT.base + view.orbit));
      const reach = ORBIT.distance * view.zoom;
      const orbitY = view.orbit === 0 && view.zoom === 1 ? CAMERA.y : Math.sin(elevation) * reach;
      const orbitZ = view.orbit === 0 && view.zoom === 1 ? CAMERA.z : Math.cos(elevation) * reach;
      const wantedY = orbitY + (1.9 - orbitY) * blend;
      const wantedZ = orbitZ + (3.4 - orbitZ) * blend;
      let clearance = 1;
      for (let t = .15; t < 1 && cameraBlockers.length; t += .06) {
        const sampleY = .85 + (wantedY - .85) * t;
        const sampleX = focusX + behindX * wantedZ * t;
        const sampleZ = focusZ + behindZ * wantedZ * t;
        if (cameraBlockers.some(({ solid, height }) => sampleY < height + .18 &&
          (solid.shape === 'circle' ? Math.hypot(sampleX - solid.x, sampleZ - solid.z) < solid.radius + .12
            : Math.abs(sampleX - solid.x) < solid.halfX + .12 && Math.abs(sampleZ - solid.z) < solid.halfZ + .12))) {
          clearance = Math.max(.17, t - .08);
          break;
        }
      }
      const cameraK = clearance < 1 ? 1 : k;
      const wantX = focusX + behindX * wantedZ * clearance;
      camera.position.x += (wantX - camera.position.x) * cameraK;
      camera.position.y += (baseY + .85 + (wantedY - .85) * clearance - camera.position.y) * cameraK;
      camera.position.z += (focusZ + behindZ * wantedZ * clearance - camera.position.z) * cameraK;
      const lead = CAMERA.ahead * (1 - blend);
      camera.lookAt(camera.position.x - wantX + focusX - behindX * lead, baseY + 0.6 + 0.16 * blend, focusZ - behindZ * lead);
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
        ? `${Math.round((Math.atan2(goal.x - next.x, next.z - goal.z) + view.yaw) * 180 / Math.PI / 5) * 5}|${Math.round(distance)}` : '';
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
      {geometryVersion === 3 && <GroundsDressing layout={world.layout} tint={audio?.detailColor ?? palette?.accent} excluded={world.scene?.plan.intent.exclusions ?? NO_EXCLUSIONS} />}
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
          dog={visit.plot.companionKind === 'dog'} slide={slide} directed={Boolean(direction)}
          moment={moment} companion={Boolean(visit.plot.companion)} field={field} playing={visit.playing} paused={paused}
          reduced={reducedMotion} frame={plotFrame} meter={meter} subtitle={subtitle} audio={sound} finish={() => visit.finish(visit.completed)} />
      </>}
      {world.story && <StoryCharacter position={layout.landmark} outfit={world.story.npc.outfit} ready={ready && !ended} />}
      {!reducedMotion && <Motes bounds={bounds} night={night} color={night ? '#e4ff9a' : '#fff4d6'} active={!paused && Boolean(audio?.activeAudio)} />}
      <DiscoveryMarkers points={visit ? (point && !visit.playing && !visit.ended ? [point] : [])
        : layout.artifacts.filter((_, index) => !revealed.has(discoveryIds[index]))} player={position}
        color={audio?.lightColor ?? '#ffd58a'} active={!reducedMotion && !paused && Boolean(audio?.activeAudio)} />
      {!reducedMotion && discoveryIds.map((id, index) => revealed.has(id) && !foundAtStart.current.has(id)
        && <RevealBurst key={id} at={layout.artifacts[index]} color={audio?.lightColor ?? (night ? '#ffd88a' : '#fff1b8')} />)}
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
        {/* Walker details: knitted cap, scarf, a small backpack (toward the camera) and two boots. */}
        <mesh position={[0, 1.1, 0]}>
          <coneGeometry args={[0.16, 0.2, 7]} />
          <meshStandardMaterial color="#c2453a" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.21, 0]}>
          <icosahedronGeometry args={[0.045, 0]} />
          <meshStandardMaterial color="#f3ead6" flatShading />
        </mesh>
        <mesh position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.045, 5, 10]} />
          <meshStandardMaterial color="#2f6f73" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.55, 0.2]}>
          <boxGeometry args={[0.28, 0.32, 0.14]} />
          <meshStandardMaterial color="#5b4a8a" flatShading roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.6, 0.275]}>
          <boxGeometry args={[0.2, 0.1, 0.02]} />
          <meshStandardMaterial color="#9be14b" flatShading />
        </mesh>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.05, -0.03]}>
            <boxGeometry args={[0.12, 0.1, 0.2]} />
            <meshStandardMaterial color="#3b2f26" flatShading />
          </mesh>
        ))}
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

/** Switch lens with the view: wider and closer in first person. */
function FieldOfView({ view, fov }: { view: 'first' | 'third'; fov: number }) {
  const camera = useThree(({ camera: c }) => c);
  useEffect(() => {
    if (!('fov' in camera)) return;
    camera.fov = view === 'first' ? fov : 50;
    camera.near = view === 'first' ? 0.05 : 0.1;
    camera.updateProjectionMatrix();
  }, [camera, view, fov]);
  return null;
}

/** Walkable view of a prompt world. Movement and targeting come from A's controller. */
export function WorldStage({ world, revealed, ended, position, paused, onReveal, onFinish, onUnavailable,
  audio, areaLabel = 'Prompt world', artifactLabels, conversationOpen = false, overlay, visit }: {
  /** Game HUD drawn over the world (quest log, dialog, menu button). */
  overlay?: React.ReactNode;
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
}) {
  const t = useT();
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
  const view = useView();
  const ink = useInk();
  const look = useRef<Look>({ yaw: 0, pitch: -0.12, turn: 0, orbit: 0, zoom: 1 });
  const turning = useRef(new Set<string>());
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const tuning = useTuning();
  const sensitivity = useRef(tuning.sensitivity);
  sensitivity.current = tuning.sensitivity;
  // Shift lock: a quick tap of Shift turns mouse-look on or off; holding Shift while walking runs.
  const [shiftLock, setShiftLock] = useState(false);
  const shiftLockRef = useRef(shiftLock);
  shiftLockRef.current = shiftLock;
  const shiftTap = useRef<{ at: number; used: boolean } | null>(null);
  const stageBox = useRef<HTMLDivElement | null>(null);
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
  const release = useCallback(() => {
    held.current.clear(); turning.current.clear(); look.current.turn = 0; running.current = false; drag.current = null;
    shiftTap.current = null; sync();
  }, [sync]);
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
  const viewRef = useRef(view);
  viewRef.current = view;

  // Drag on the world (mouse or finger) to look around in first person.
  const turnBy = useCallback((dx: number, dy: number) => {
    const view = look.current;
    const speed = sensitivity.current;
    // Cap single jumps (the pointer entering the view, a lagging frame) so the camera never snaps.
    dx = Math.max(-80, Math.min(80, dx));
    dy = Math.max(-80, Math.min(80, dy));
    view.yaw -= dx * EYE.dragYaw * speed;
    if (viewRef.current === 'first') view.pitch = Math.max(-EYE.maxPitch, Math.min(EYE.maxPitch, view.pitch - dy * EYE.dragPitch * speed));
    else view.orbit = Math.max(ORBIT.min - ORBIT.base, Math.min(ORBIT.max - ORBIT.base, view.orbit + dy * EYE.dragPitch * speed));
  }, []);
  const lookHandlers = !paused ? {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      const canvas = event.currentTarget.querySelector('canvas');
      if (event.target !== canvas) return;
      // In shift lock a click on the world captures the cursor, so turning never hits the screen edge.
      if (shiftLockRef.current && event.pointerType === 'mouse') {
        if (document.pointerLockElement !== canvas) void Promise.resolve(canvas?.requestPointerLock?.()).catch(() => {});
        return;
      }
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (shiftLockRef.current && event.pointerType === 'mouse') { turnBy(event.movementX, event.movementY); return; }
      const from = drag.current;
      if (!from || from.id !== event.pointerId) return;
      turnBy(event.clientX - from.x, event.clientY - from.y);
      drag.current = { ...from, x: event.clientX, y: event.clientY };
    },
    onPointerUp: () => { drag.current = null; },
    onPointerCancel: () => { drag.current = null; },
  } : {};

  // Leaving shift lock (or pausing) frees the cursor; the browser freeing it (Esc) ends shift lock.
  useEffect(() => {
    if ((!shiftLock || paused) && document.pointerLockElement) document.exitPointerLock();
    if (paused && shiftLock) setShiftLock(false);
  }, [shiftLock, paused]);
  useEffect(() => {
    const box = stageBox.current;
    if (!box || view !== 'third' || paused) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const view = look.current;
      view.zoom = Math.max(ORBIT.minZoom, Math.min(ORBIT.maxZoom, view.zoom * Math.exp(event.deltaY * 0.0012)));
    };
    box.addEventListener('wheel', wheel, { passive: false });
    return () => box.removeEventListener('wheel', wheel);
  }, [view, paused]);

  useEffect(() => {
    const mouse = (event: MouseEvent) => {
      if (document.pointerLockElement && stageBox.current?.contains(document.pointerLockElement)) turnBy(event.movementX, event.movementY);
    };
    const lockChange = () => { if (!document.pointerLockElement) setShiftLock(false); };
    document.addEventListener('mousemove', mouse);
    let locked = false;
    const watch = () => {
      const now = Boolean(document.pointerLockElement && stageBox.current?.contains(document.pointerLockElement));
      if (locked && !now) lockChange();
      locked = now;
    };
    document.addEventListener('pointerlockchange', watch);
    return () => {
      document.removeEventListener('pointerlockchange', watch);
      document.removeEventListener('mousemove', mouse);
    };
  }, [turnBy]);

  useEffect(() => {
    if (paused) { release(); return; }
    const down = (event: KeyboardEvent) => {
      const element = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (element instanceof HTMLElement && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))) return;
      const key = event.key.toLowerCase();
      if (running.current !== event.shiftKey) { running.current = event.shiftKey; sync(); }
      if (key === 'shift') {
        if (!event.repeat) shiftTap.current = { at: event.timeStamp, used: held.current.size > 0 };
        return;
      }
      if (shiftTap.current) shiftTap.current.used = true;
      // Space never scrolls the page while walking; on the world it interacts like E.
      if (key === ' ' || key === 'spacebar') {
        if (element instanceof HTMLElement && element.closest('button, a, summary, [role="button"]')) return;
        event.preventDefault();
        if (!event.repeat) interactRef.current();
        return;
      }
      if (key === 'e' && !event.repeat) { interactRef.current(); return; }
      if (key === 'v' && !event.repeat) { toggleView(); return; }
      // The left and right arrows turn; A and D step sideways.
      if (key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault();
        turning.current.add(key);
        look.current.turn = (turning.current.has('arrowleft') ? 1 : 0) - (turning.current.has('arrowright') ? 1 : 0);
        return;
      }
      if (!KEYS[key]) return;
      event.preventDefault();
      if (direction && !sound.current) unlockSound();
      held.current.set('key:' + key, KEYS[key]);
      sync();
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      running.current = event.shiftKey;
      if (key === 'shift') {
        const tap = shiftTap.current;
        shiftTap.current = null;
        if (tap && !tap.used && event.timeStamp - tap.at < 350) setShiftLock((on) => !on);
      }
      held.current.delete('key:' + key);
      if (turning.current.delete(key)) look.current.turn = (turning.current.has('arrowleft') ? 1 : 0) - (turning.current.has('arrowright') ? 1 : 0);
      sync();
    };
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

  const pixel = usePixel();
  const { dpr, adapt, scale } = useRenderScale(pixel);
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
        <div className="stage-viewport walk-viewport" ref={(element) => { hud.current = element; stageBox.current = element as HTMLDivElement | null; }} data-player=""
          data-walk-targets={JSON.stringify(layout)} data-view={view} data-shift-lock={shiftLock ? 'on' : 'off'}
          data-moment-point={point && JSON.stringify(point)} data-scene-bed={bed} {...lookHandlers}
          onPointerDownCapture={() => { if (direction && !paused) unlockSound(); }}>
          <Canvas camera={view === 'first'
            ? { position: [position.current.x, EYE.y, position.current.z], fov: 68, near: 0.05 }
            : { position: [position.current.x, CAMERA.y, position.current.z + CAMERA.z], fov: 50 }} dpr={dpr} fallback={<Preview />}>
            <ContextMonitor onLost={loseContext} />
            <WorldScene world={world} layout={layout} revealed={revealed} ended={ended} position={position} input={input}
              playerGroup={playerGroup} hud={hud} compass={compass} onTarget={setTarget} paused={paused}
              conversationOpen={conversationOpen} audio={audio} view={view} look={look}
              visit={visit} plotFrame={plotFrame} meter={meter} subtitle={subtitle} sound={sound} />
            {ink && <InkLook weight={tuning.inkWeight} />}
            <FieldOfView view={view} fov={tuning.fov} />
            {adapt && <AdaptiveResolution scale={scale} onScale={adapt} />}
          </Canvas>
          {(view === 'first' || shiftLock) && !visit?.playing && <span className="walk-reticle" aria-hidden="true" />}
          {shiftLock && <p className="walk-shift-lock" role="status">{t('Shift lock on: the mouse turns the camera. Click to capture it, tap Shift to release.')}</p>}
          {direction && <p ref={subtitle} className="plot-subtitle" aria-live="polite" hidden />}
          <p className="walk-prompt" role="status">{visit
            ? visit.ended ? t('The memory is complete.') : visit.playing ? visit.current.title
              : canInteract ? `E · ${visit.current.actionLabel}` : t('Walk toward the marker · {title}', { title: visit.current.title })
            : conversationOpen
            ? (ended ? t('The memory is complete.') : t('Choose how to reply.'))
            : ended ? t('The memory is complete.') : describeTarget(target, world, revealed, artifactLabels, t)}</p>
          {overlay}
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
            {visit?.current ? visit.playing && visit.current.input === 'timing' ? t('Catch') : visit.current.actionLabel : t('Interact')}
          </button>
        </div>
        <div className="stage-toolbar">
          <span>{t(view === 'first'
            ? 'WASD to walk, drag or ← → to look, tap Shift for shift lock, hold Shift to run, E or Space to interact, V to change view, Esc to pause'
            : 'WASD to walk, drag or ← → to turn, tap Shift for shift lock, hold Shift to run, E or Space to interact, V to change view, Esc to pause')}</span>
          <span className="stage-toolbar-actions">
            <button type="button" className="shift-lock-toggle" aria-pressed={shiftLock} disabled={paused} onClick={() => setShiftLock(!shiftLock)}>
              {t('Shift lock')}
            </button>
            <button type="button" className="view-toggle" aria-pressed={view === 'first'} onClick={toggleView}>
              {t(view === 'first' ? 'First person' : 'Third person')}
            </button>
            <button type="button" disabled={paused} onClick={() => { Object.assign(look.current, { pitch: -0.12, orbit: 0, zoom: 1 }); }}>{t('Recenter camera')}</button>
            <button type="button" disabled={paused || visit?.playing} onClick={() => { position.current = layout.spawn; Object.assign(look.current, { yaw: 0, pitch: -0.12, orbit: 0, zoom: 1 }); }}>{t('Reset position')}</button>
            {direction && <button type="button" className="scene-sound-toggle" aria-pressed={silenced} disabled={paused}
              onClick={() => {
                if (!soundEnabled) unlockSound();
                else setSilenced(previous => !previous);
              }}>{t(!soundEnabled ? 'Enable scene sound' : silenced ? 'Unmute scene sound' : 'Mute scene sound')}</button>}
          </span>
        </div>
      </StageBoundary>
    </section>
  );
}
