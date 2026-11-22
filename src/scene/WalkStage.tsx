import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color, SRGBColorSpace } from 'three';
import type { Group } from 'three';
import type { MemoryScene } from '../shared/memory-schema';
import { stepPlayer, targetAt } from '../gameplay/controller';
import type { Input, Target } from '../gameplay/controller';
import { WORLD_SCALE, createWalkLayout } from '../gameplay/layout';
import type { Point, WalkLayout } from '../gameplay/layout';
import { ArtifactModel, artifactNames } from './ArtifactModel';
import { EnvironmentBackdrop } from './EnvironmentBackdrop';
import { ContextMonitor, Preview, SoundtrackMotion, StageBoundary } from './MemoryStage';
import { InkFromSettings } from './InkLook';
import { AdaptiveResolution, useRenderScale } from '../chrome/AdaptiveResolution';
import { usePixel } from '../chrome/use-pixel';
import { prefersReducedMotion, subscribeToReducedMotion } from './reduced-motion';
import type { SceneStyle } from './scene-style';

const CAMERA_OFFSET = { y: 3.4, z: 4.5 };
const MOVE_KEYS: Record<string, keyof typeof directions> = {
  w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
};
const directions = { up: { x: 0, z: -1 }, down: { x: 0, z: 1 }, left: { x: -1, z: 0 }, right: { x: 1, z: 0 } };
type Direction = keyof typeof directions;

export function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function typingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function Block({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: Color | string }) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function Player({ group }: { group: RefObject<Group | null> }) {
  return (
    <group ref={group}>
      <mesh position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.2, 0.42, 3, 8]} />
        <meshStandardMaterial color="#e8c98f" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <icosahedronGeometry args={[0.17, 0]} />
        <meshStandardMaterial color="#f1dcb8" flatShading />
      </mesh>
    </group>
  );
}

function Landmark({ layout, ready, accent, rail }: { layout: WalkLayout; ready: boolean; accent: Color; rail: Color }) {
  const { x, z } = layout.landmark;
  return (
    <group position={[x, 0, z]}>
      <Block at={[-0.85, 0.8, 0]} size={[0.38, 1.6, 0.38]} color={rail} />
      <Block at={[0.85, 0.8, 0]} size={[0.38, 1.6, 0.38]} color={rail} />
      <Block at={[0, 1.7, 0]} size={[2.2, 0.26, 0.4]} color={rail} />
      <mesh position={[0, 1.2, 0]}>
        <icosahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={ready ? 1.1 : 0.05} flatShading />
      </mesh>
    </group>
  );
}

function WalkWorld({ manifest, style, layout, revealed, position, input, targetRef, activeAudio, motionModels, playerGroup, hud, onTarget, paused }: {
  paused: boolean;
  manifest: MemoryScene;
  style: SceneStyle;
  layout: WalkLayout;
  revealed: ReadonlySet<string>;
  position: RefObject<Point>;
  input: RefObject<Input>;
  targetRef: RefObject<Target | null>;
  activeAudio: HTMLAudioElement | null;
  motionModels: RefObject<(Group | null)[]>;
  playerGroup: RefObject<Group | null>;
  hud: RefObject<HTMLElement | null>;
  onTarget: (target: Target | null) => void;
}) {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const { accentPalette, lightWarmth, ambientIntensity, treatment } = style;
  const colors = accentPalette.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace));
  const surround = new Color('#242b28').lerp(colors[1], 0.22);
  const deck = new Color('#454739').lerp(colors[2], 0.38);
  const rail = deck.clone().lerp(colors[1], 0.4);
  const keyLight = new Color('#c0d9f2').lerp(new Color('#ffca91'), lightWarmth);
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const camera = useThree(({ camera: c }) => c);
  const lastKey = useRef('');
  const ready = revealed.size >= manifest.artifacts.length;
  const revealedCount = useRef(0);
  revealedCount.current = revealed.size;

  useEffect(() => {
    const { x, z } = position.current;
    camera.position.set(x, CAMERA_OFFSET.y, z + CAMERA_OFFSET.z);
    camera.lookAt(x, 0.6, z);
  }, [camera, position]);

  useFrame((_, dt) => {
    const next = paused ? position.current : stepPlayer(position.current, input.current, dt, layout);
    position.current = next;
    playerGroup.current?.position.set(next.x, 0, next.z);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    camera.position.x += (next.x - camera.position.x) * k;
    camera.position.y += (CAMERA_OFFSET.y - camera.position.y) * k;
    camera.position.z += (next.z + CAMERA_OFFSET.z - camera.position.z) * k;
    camera.lookAt(camera.position.x, 0.6, next.z);
    const target = targetAt(next, layout, revealedCount.current);
    targetRef.current = target;
    const key = target ? target.kind + ('index' in target ? target.index : target.ready) : '';
    if (key !== lastKey.current) {
      lastKey.current = key;
      onTarget(target);
    }
    hud.current?.setAttribute('data-player', next.x.toFixed(2) + ',' + next.z.toFixed(2));
  });

  return (
    <>
      <color attach="background" args={[surround]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[-3, 6, 4]} color={keyLight} intensity={treatment === 'soft' ? 1.8 : 2.3} />
      <Block at={[(minX + maxX) / 2, -0.22, (minZ + maxZ) / 2 - 0.4]} size={[maxX - minX + 1, 0.44, maxZ - minZ + 3.2]} color={deck} />
      <Block at={[(minX + maxX) / 2, -0.17, (minZ + maxZ) / 2 - 0.4]} size={[maxX - minX + 0.6, 0.06, maxZ - minZ + 2.8]} color={deck.clone().lerp(colors[0], 0.24)} />
      <group scale={WORLD_SCALE}>
        <EnvironmentBackdrop environment={style.environment} variation={style.variation} deck={deck} accent={colors[0]} secondary={colors[1]} />
      </group>
      {layout.solids.filter((s) => s.shape === 'box').map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          <Block at={[0, 0.15, 0]} size={[(s as { halfX: number }).halfX * 2, 0.3, (s as { halfZ: number }).halfZ * 2]} color={colors[2]} />
          <mesh position={[0, 0.42, 0]}>
            <icosahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial color={colors[1]} flatShading />
          </mesh>
        </group>
      ))}
      <Landmark layout={layout} ready={ready} accent={colors[0]} rail={rail} />
      {manifest.artifacts.map(({ id, kind }, index) => {
        const open = revealed.has(id);
        const accent = colors[index];
        const at = layout.artifacts[index];
        return (
          <group key={id} position={[at.x, 0, at.z]} scale={1.3}
            rotation={[0, treatment === 'angular' ? (index === 0 ? -0.23 : 0.23) : 0, 0]}>
            <mesh position={[0, -0.04, 0]}>
              <boxGeometry args={[1.17, 0.14, 1.05]} />
              <meshStandardMaterial color={accent} roughness={0.65} emissive={accent} emissiveIntensity={open ? 0.16 : 0.03} />
            </mesh>
            <group ref={(group) => { motionModels.current[index] = group; }}>
              <ArtifactModel kind={kind} accent={accent} />
            </group>
          </group>
        );
      })}
      <Player group={playerGroup} />
      <SoundtrackMotion activeAudio={activeAudio} models={motionModels} music={manifest.music} parameters={manifest.presentation.parameters} />
    </>
  );
}

function promptFor(target: Target | null, manifest: MemoryScene, revealed: ReadonlySet<string>) {
  if (!target) return 'Walk to an object. Both memories are waiting nearby.';
  if (target.kind === 'ending') {
    return target.ready ? 'Press E to close the memory.' : 'The gate stays closed until both objects are found.';
  }
  const artifact = manifest.artifacts[target.index];
  const name = artifactNames[artifact.kind];
  return revealed.has(artifact.id) ? name + ' · already revealed' : 'Press E to look at the ' + name.toLowerCase() + '.';
}

export function WalkStage({ manifest, style, revealed, activeAudio, onReveal, onFinish, onUnavailable,
  playerPosition, paused = false }: {
  playerPosition?: RefObject<Point>;
  paused?: boolean;
  manifest: MemoryScene;
  style: SceneStyle;
  revealed: ReadonlySet<string>;
  activeAudio: HTMLAudioElement | null;
  onReveal: (id: string) => void;
  onFinish: () => void;
  onUnavailable: () => void;
}) {
  const pixel = usePixel();
  const { dpr, adapt, scale } = useRenderScale(pixel);
  const layout = useRef(createWalkLayout(style)).current;
  const localPosition = useRef<Point>(layout.spawn);
  const position = playerPosition ?? localPosition;
  const input = useRef<Input>({ x: 0, z: 0 });
  const keys = useRef(new Set<Direction>());
  const pad = useRef(new Set<Direction>());
  const targetRef = useRef<Target | null>(null);
  const playerGroup = useRef<Group | null>(null);
  const motionModels = useRef<(Group | null)[]>([]);
  const hud = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const syncInput = useCallback(() => {
    let x = 0, z = 0;
    for (const set of [keys.current, pad.current]) {
      for (const d of set) { x += directions[d].x; z += directions[d].z; }
    }
    input.current = { x: Math.sign(x), z: Math.sign(z) };
  }, []);

  const interact = useCallback(() => {
    const t = targetRef.current;
    if (!t || paused) return;
    if (t.kind === 'artifact') onReveal(manifest.artifacts[t.index].id);
    else if (t.ready) onFinish();
  }, [manifest, onFinish, onReveal, paused]);
  const interactRef = useRef(interact);
  interactRef.current = interact;

  useEffect(() => {
    if (paused) return;
    const down = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === ' ' && !(event.target instanceof HTMLElement && event.target.closest('button, a, summary'))) {
        // Space never scrolls the page while walking; it interacts like E.
        event.preventDefault();
        if (!event.repeat) interactRef.current();
        return;
      }
      if (key === 'e' && !event.repeat) { interactRef.current(); return; }
      const direction = MOVE_KEYS[key];
      if (!direction) return;
      event.preventDefault();
      keys.current.add(direction);
      syncInput();
    };
    const up = (event: KeyboardEvent) => {
      const direction = MOVE_KEYS[event.key.toLowerCase()];
      if (direction) { keys.current.delete(direction); syncInput(); }
    };
    const release = () => { keys.current.clear(); pad.current.clear(); syncInput(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
      keys.current.clear(); pad.current.clear(); input.current = { x: 0, z: 0 };
    };
  }, [paused, syncInput]);

  const [supported] = useState(webglAvailable);
  const [lost, setLost] = useState(false);
  const loseContext = useCallback(() => { setLost(true); onUnavailable(); }, [onUnavailable]);
  useEffect(() => { if (!supported) onUnavailable(); }, [supported, onUnavailable]);
  const unavailable = <div className="stage-viewport"><Preview /></div>;
  if (!supported || lost) return <section className="memory-stage" aria-label="Memory world">{unavailable}</section>;

  const padButton = (direction: Direction, label: string, glyph: string) => (
    <button
      type="button"
      className={'walk-pad-' + direction}
      aria-label={label}
      disabled={paused}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pad.current.add(direction); syncInput();
      }}
      onPointerUp={() => { pad.current.delete(direction); syncInput(); }}
      onPointerCancel={() => { pad.current.delete(direction); syncInput(); }}
      onLostPointerCapture={() => { pad.current.delete(direction); syncInput(); }}
      onContextMenu={(event) => event.preventDefault()}
    >{glyph}</button>
  );

  const canInteract = target?.kind === 'artifact' ? !revealed.has(manifest.artifacts[target.index].id) : target?.ready === true;

  return (
    <section className="memory-stage" aria-label="Memory world">
      <StageBoundary fallback={unavailable} onFail={onUnavailable}>
        <div className="stage-viewport walk-viewport" ref={(element) => { hud.current = element; }} data-player=""
          data-walk-targets={JSON.stringify({ spawn: layout.spawn, artifacts: layout.artifacts, landmark: layout.landmark, reach: layout.reach })}>
          <Canvas camera={{ position: [0, CAMERA_OFFSET.y, layout.spawn.z + CAMERA_OFFSET.z], fov: 45 }} dpr={dpr}
            fallback={<Preview />}>
            <ContextMonitor onLost={loseContext} />
            <WalkWorld manifest={manifest} style={style} layout={layout} revealed={revealed} position={position}
              input={input} targetRef={targetRef} activeAudio={paused ? null : activeAudio} motionModels={motionModels}
              playerGroup={playerGroup} hud={hud} onTarget={setTarget} paused={paused} />
            <InkFromSettings />
            {adapt && <AdaptiveResolution scale={scale} onScale={adapt} />}
          </Canvas>
          <p className="walk-prompt" role="status">{promptFor(target, manifest, revealed)}</p>
          <div className="walk-pad" aria-label="Touch movement controls">
            {padButton('up', 'Walk forward', '▲')}
            {padButton('left', 'Walk left', '◀')}
            {padButton('right', 'Walk right', '▶')}
            {padButton('down', 'Walk back', '▼')}
          </div>
          <button type="button" className="walk-interact" disabled={!canInteract || paused} onClick={interact}>Interact</button>
        </div>
        <div className="stage-toolbar">
          <span>WASD or arrow keys to walk · E to interact</span>
          <button type="button" disabled={paused} onClick={() => { position.current = layout.spawn; }}>Reset position</button>
        </div>
      </StageBoundary>
    </section>
  );
}
