import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import { stepPlayer, targetAt } from '../gameplay/controller';
import type { Input, Target } from '../gameplay/controller';
import type { Point, WalkLayout } from '../gameplay/layout';
import { ContextMonitor, Preview, StageBoundary } from '../scene/MemoryStage';
import { prefersReducedMotion, subscribeToReducedMotion } from '../scene/reduced-motion';
import { webglAvailable } from '../scene/WalkStage';
import { builders, defaultColors } from './builders';
import { WorldScenery } from '../scene/WorldScenery';
import type { WorldAtmosphere } from '../scene/WorldScenery';
import type { MemoryScene } from '../shared/memory-schema';
import { groundBounds } from './layout-schema';
import { recipes, sceneryPlacement } from './recipes';
import { routeTo } from './route';
import { StoryCharacter } from './StoryCharacter';
import { placementById, toWalkLayout } from './world-schema';
import type { PromptWorld } from './world-schema';

type StageWorld = Pick<PromptWorld, 'layout' | 'interpretation' | 'story'>;
type StageAudio = { activeAudio: HTMLAudioElement | null; music?: MemoryScene['music']; lightColor?: string; ambientScale?: number };

const CAMERA = { y: 5.2, z: 6.4, ahead: 2 };
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
  if (!target) return world.story ? (revealed.size < 2 ? 'Explore the two marked objects.' : `Find ${world.story.npc.name} near the landmark.`)
    : 'Explore. Two discoveries and a closing landmark are waiting.';
  const name = (id: string) => labelFor(world, id).toLowerCase();
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

function WorldScene({ world, layout, revealed, ended, position, input, targetRef, playerGroup, hud, onTarget, paused,
  conversationOpen, audio }: {
  world: StageWorld;
  audio?: StageAudio;
  layout: WalkLayout;
  revealed: ReadonlySet<string>;
  ended: boolean;
  position: RefObject<Point>;
  input: RefObject<Input>;
  targetRef: RefObject<Target | null>;
  playerGroup: RefObject<Group | null>;
  hud: RefObject<HTMLElement | null>;
  onTarget: (target: Target | null) => void;
  paused: boolean;
  conversationOpen: boolean;
}) {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const camera = useThree(({ camera: c }) => c);
  const lastKey = useRef('');
  const conversationBlend = useRef(0);
  const revealedCount = useRef(0);
  revealedCount.current = revealed.size;
  const { timeOfDay, weather } = world.interpretation;
  const light = sky[timeOfDay];
  const night = timeOfDay === 'night' || timeOfDay === 'dusk';
  const { bounds, water, indoor, geometryVersion } = world.layout;
  const scenery = useMemo(() => geometryVersion === 2 ? world.layout.placements.flatMap((placement) => {
    const model = sceneryPlacement(placement);
    return model ? [model] : [];
  }) : [], [geometryVersion, world.layout.placements]);
  const sceneryIds = useMemo(() => new Set(scenery.map(({ id }) => id)), [scenery]);
  const atmosphere: WorldAtmosphere = weather !== 'clear' ? weather : timeOfDay === 'day' ? 'daylight' : timeOfDay;
  const groundKey = world.interpretation.terms.some((t) => t.zone === 'paved'
    || (geometryVersion === 2 && t.recipe === 'stall' && /\b(?:market|bazaar|fair)\b/i.test(t.text))) ? 'paved'
    : water ? 'sand' : world.interpretation.setting === 'indoor' ? 'floor' : 'grass';
  const fogColor = weather === 'fog' ? '#b9c0c4' : weather === 'snow' ? '#e3e7ea' : light.background;
  const ready = revealed.size >= 2;
  const discoveryIds = world.layout.discoveries.map(({ placementId }) => placementId);

  useEffect(() => {
    const { x, z } = position.current;
    camera.position.set(x, CAMERA.y, z + CAMERA.z);
    camera.lookAt(x, 0.6, z - CAMERA.ahead);
  }, [camera, position]);

  useFrame((_, dt) => {
    const next = paused ? position.current : stepPlayer(position.current, input.current, dt, layout);
    position.current = next;
    playerGroup.current?.position.set(next.x, 0, next.z);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    conversationBlend.current += (Number(conversationOpen) - conversationBlend.current) * k;
    const blend = conversationBlend.current;
    const focusX = next.x + (layout.landmark.x - next.x) * blend;
    const focusZ = next.z + (layout.landmark.z - next.z) * blend;
    camera.position.x += (focusX - camera.position.x) * k;
    camera.position.y += (CAMERA.y + (1.9 - CAMERA.y) * blend - camera.position.y) * k;
    camera.position.z += (focusZ + CAMERA.z + (3.4 - CAMERA.z) * blend - camera.position.z) * k;
    camera.lookAt(camera.position.x, 0.6 + 0.16 * blend, focusZ - CAMERA.ahead * (1 - blend));
    const target = targetAt(next, layout, revealedCount.current);
    targetRef.current = target;
    const key = target ? target.kind + ('index' in target ? target.index : target.ready) : '';
    if (key !== lastKey.current) {
      lastKey.current = key;
      onTarget(target);
    }
    hud.current?.setAttribute('data-player', next.x.toFixed(2) + ',' + next.z.toFixed(2));
  });

  const ground = geometryVersion === 2 ? groundBounds(world.layout) : bounds;
  const width = ground.maxX - ground.minX, depth = ground.maxZ - ground.minZ;
  const cx = (ground.minX + ground.maxX) / 2, cz = (ground.minZ + ground.maxZ) / 2;
  return (
    <>
      {geometryVersion === 2 ? (
        <WorldScenery ambientMotion placements={scenery} atmosphere={atmosphere}
          activeAudio={paused ? null : audio?.activeAudio ?? null} music={audio?.music} lightColor={audio?.lightColor} ambientScale={audio?.ambientScale} />
      ) : (
        <>
          <color attach="background" args={[fogColor]} />
          <fog attach="fog" args={[fogColor, weather === 'fog' ? 7 : 14, weather === 'fog' ? 30 : 40]} />
          <ambientLight intensity={light.ambient} />
          <directionalLight position={[-4, 8, 5]} color={light.light} intensity={light.sun} />
        </>
      )}
      <mesh position={[cx, -0.15, cz]}>
        <boxGeometry args={[width + (geometryVersion === 2 ? 0 : 6), 0.3, depth + (geometryVersion === 2 ? 0 : 6)]} />
        <meshStandardMaterial color={grounds[groundKey]} roughness={0.95} />
      </mesh>
      {water && (
        <mesh position={[(water.minX + water.maxX) / 2 + Math.sign(water.minX + water.maxX) * 1.5, geometryVersion === 2 ? -0.08 : 0.02, cz]}>
          <boxGeometry args={[water.maxX - water.minX + 3, 0.04, depth + 6]} />
          <meshStandardMaterial color="#3e6f87" roughness={0.35} transparent opacity={0.92} />
        </mesh>
      )}
      {indoor && <Room area={indoor.area} door={indoor.door} whole={world.interpretation.setting === 'indoor'} />}
      {world.layout.placements.map((p) => {
        const Builder = p.recipe !== 'canopy' && !sceneryIds.has(p.id) ? builders[p.recipe] : null;
        const main = new Color(p.recipe === 'canopy' ? '#a9564a' : defaultColors[p.recipe]);
        if (p.color) main.setRGB(p.color[0] / 255, p.color[1] / 255, p.color[2] / 255, SRGBColorSpace);
        const accent = new Color(p.color ? '#efe5cf' : '#b5533c');
        const isDiscovery = discoveryIds.includes(p.id);
        const isLandmark = p.id === world.layout.landmark.placementId;
        return (
          <group key={p.id} position={[p.x, p.y, p.z]} rotation={[0, p.rotation, 0]} scale={p.scale}>
            {Builder && <Builder main={main} accent={accent} lit={night || (isLandmark && ready)} />}
            {(isDiscovery || (isLandmark && !world.story)) && (
              <mesh position={[0, 0.03 - p.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.75, 0.9, 24]} />
                <meshBasicMaterial color={isLandmark ? (ready ? '#ffd58a' : '#6b6658') : revealed.has(p.id) ? '#ffd58a' : '#e7bb84'}
                  transparent opacity={isLandmark && !ready ? 0.4 : 0.85} />
              </mesh>
            )}
          </group>
        );
      })}
      {world.story && <StoryCharacter position={layout.landmark} outfit={world.story.npc.outfit} ready={ready && !ended} />}
      {night && world.layout.placements.filter((p) => !sceneryIds.has(p.id) && (p.recipe === 'lantern' || p.recipe === 'lamp')).slice(0, 4).map((p) => (
        <pointLight key={p.id} position={[p.x, p.y + (p.recipe === 'lamp' ? 2.2 : 0.6), p.z]} color="#ffc47a" intensity={4} distance={5} />
      ))}
      {ended && <pointLight position={[0, 3, bounds.minZ + 3]} color="#ffd58a" intensity={6} distance={10} />}
      <group ref={playerGroup}>
        <mesh position={[0, 0.45, 0]}>
          <capsuleGeometry args={[0.2, 0.42, 3, 8]} />
          <meshStandardMaterial color="#e8c98f" flatShading roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <icosahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color="#f1dcb8" flatShading />
        </mesh>
      </group>
    </>
  );
}

function Room({ area, door, whole }: { area: WalkLayout['bounds']; door: { x: number; z: number; width: number }; whole: boolean }) {
  const wall = '#c8b79a';
  const cx = (area.minX + area.maxX) / 2, cz = (area.minZ + area.maxZ) / 2;
  const w = area.maxX - area.minX, d = area.maxZ - area.minZ;
  const lower = door.z - door.width / 2, upper = door.z + door.width / 2;
  return (
    <group>
      <mesh position={[cx, 0.01, cz]}>
        <boxGeometry args={[w, 0.02, d]} />
        <meshStandardMaterial color={grounds.floor} roughness={0.9} />
      </mesh>
      <mesh position={[cx, 0.8, area.minZ]}><boxGeometry args={[w, 1.6, 0.24]} /><meshStandardMaterial color={wall} /></mesh>
      {!whole && (
        <>
          <mesh position={[cx, 0.4, area.maxZ]}><boxGeometry args={[w, 0.8, 0.24]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[door.x, 0.8, (area.minZ + lower) / 2]}><boxGeometry args={[0.24, 1.6, lower - area.minZ]} /><meshStandardMaterial color={wall} /></mesh>
          <mesh position={[door.x, 0.8, (upper + area.maxZ) / 2]}><boxGeometry args={[0.24, 1.6, area.maxZ - upper]} /><meshStandardMaterial color={wall} /></mesh>
        </>
      )}
      {whole && [area.minX, area.maxX].map((x) => (
        <mesh key={x} position={[x, 0.8, cz]}><boxGeometry args={[0.24, 1.6, d]} /><meshStandardMaterial color={wall} /></mesh>
      ))}
    </group>
  );
}

/** Walkable view of a prompt world. Movement and targeting come from A's controller. */
export function WorldStage({ world, revealed, ended, position, paused, onReveal, onFinish, onUnavailable,
  audio, areaLabel = 'Prompt world', artifactLabels, conversationOpen = false }: {
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
}) {
  const [layout] = useState(() => {
    const walk = toWalkLayout(world.layout);
    if (!world.story) return walk;
    const standingPoint = routeTo(walk, { kind: 'ending', ready: true })?.at(-1);
    return standingPoint ? { ...walk, landmark: standingPoint } : walk;
  });
  const input = useRef<Input>({ x: 0, z: 0 });
  const held = useRef(new Map<string, Point>());
  const targetRef = useRef<Target | null>(null);
  const playerGroup = useRef<Group | null>(null);
  const hud = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const sync = useCallback(() => {
    let x = 0, z = 0;
    for (const d of held.current.values()) { x += d.x; z += d.z; }
    input.current = { x: Math.sign(x), z: Math.sign(z) };
  }, []);
  const release = useCallback(() => { held.current.clear(); sync(); }, [sync]);

  const interact = useCallback(() => {
    const t = targetRef.current;
    if (!t || paused) return;
    if (t.kind === 'artifact') onReveal(world.layout.discoveries[t.index].placementId);
    else if (t.ready) onFinish();
  }, [world, paused, onFinish, onReveal]);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  useEffect(() => {
    if (paused) { release(); return; }
    const down = (event: KeyboardEvent) => {
      const element = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (element instanceof HTMLElement && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))) return;
      const key = event.key.toLowerCase();
      if (key === 'e' && !event.repeat) { interactRef.current(); return; }
      if (!KEYS[key]) return;
      event.preventDefault();
      held.current.set('key:' + key, KEYS[key]);
      sync();
    };
    const up = (event: KeyboardEvent) => { held.current.delete('key:' + event.key.toLowerCase()); sync(); };
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
  }, [paused, release, sync]);

  const [supported] = useState(webglAvailable);
  const [lost, setLost] = useState(false);
  const loseContext = useCallback(() => { setLost(true); onUnavailable(); }, [onUnavailable]);
  useEffect(() => { if (!supported) onUnavailable(); }, [supported, onUnavailable]);
  const unavailable = <div className="stage-viewport"><Preview /></div>;
  if (!supported || lost) return <section className="memory-stage" aria-label={areaLabel}>{unavailable}</section>;

  const pad = (name: string, label: string, glyph: string, direction: Point) => (
    <button type="button" className={'walk-pad-' + name} aria-label={label} disabled={paused}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); held.current.set('pad:' + name, direction); sync(); }}
      onPointerUp={() => { held.current.delete('pad:' + name); sync(); }}
      onPointerCancel={() => { held.current.delete('pad:' + name); sync(); }}
      onLostPointerCapture={() => { held.current.delete('pad:' + name); sync(); }}
      onContextMenu={(event) => event.preventDefault()}>{glyph}</button>
  );
  const canInteract = target?.kind === 'artifact'
    ? !revealed.has(world.layout.discoveries[target.index].placementId)
    : target?.ready === true && !ended;

  return (
    <section className="memory-stage" aria-label={areaLabel}>
      <StageBoundary fallback={unavailable} onFail={onUnavailable}>
        <div className="stage-viewport walk-viewport" ref={(element) => { hud.current = element; }} data-player=""
          data-walk-targets={JSON.stringify(layout)}>
          <Canvas camera={{ position: [position.current.x, CAMERA.y, position.current.z + CAMERA.z], fov: 50 }} dpr={[1, 1.5]} fallback={<Preview />}>
            <ContextMonitor onLost={loseContext} />
            <WorldScene world={world} layout={layout} revealed={revealed} ended={ended} position={position} input={input}
              targetRef={targetRef} playerGroup={playerGroup} hud={hud} onTarget={setTarget} paused={paused}
              conversationOpen={conversationOpen} audio={audio} />
          </Canvas>
          <p className="walk-prompt" role="status">{conversationOpen
            ? (ended ? 'The memory is complete.' : 'Choose how to reply.')
            : describeTarget(target, world, revealed, artifactLabels)}</p>
          <div className="walk-pad" aria-label="Touch movement controls">
            {pad('up', 'Walk forward', '▲', { x: 0, z: -1 })}
            {pad('left', 'Walk left', '◀', { x: -1, z: 0 })}
            {pad('right', 'Walk right', '▶', { x: 1, z: 0 })}
            {pad('down', 'Walk back', '▼', { x: 0, z: 1 })}
          </div>
          <button type="button" className="walk-interact" disabled={!canInteract || paused} onClick={interact}>Interact</button>
        </div>
        <div className="stage-toolbar">
          <span>WASD or arrow keys to walk · E to interact · Esc to pause</span>
          <button type="button" disabled={paused} onClick={() => { position.current = layout.spawn; }}>Reset position</button>
        </div>
      </StageBoundary>
    </section>
  );
}
