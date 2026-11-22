import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { Group, Mesh, PointLight } from 'three';
import type { Point } from '../gameplay/layout';
import { PlotActor } from './PlotActor';
import type { ActorPose } from './PlotActor';
import type { PlotMoment } from './plot-schema';
import { plotSound } from './plot-sound';
import { PlotDog } from './SceneCast';
import { slidePoint } from './original-models';
import type { Placement } from './layout-schema';

type Action = PlotMoment['actions'][number];
export type PlotFrame = {
  input: 'catch' | 'skip' | null;
  focus: Vector3 | null;
  travel?: Vector3;
  facing?: number;
  insideSlide?: boolean;
  action?: Action;
  progress: number;
};

export function freshPlotFrame(): PlotFrame { return { input: null, focus: null, progress: 0 }; }

const duration: Record<Action['kind'], number> = {
  approach: 1.2, 'pick-up': .9, 'hand-over': 1.35, throw: 1.3, catch: 1.4, strike: 2.65,
  open: 1.55, depart: 2.7, look: 1.65, listen: 2.05, react: 1.55,
  talk: 2.2, laugh: 1.5, mourn: 2.6, comfort: 3.2, sip: 3.1, slide: 5.8,
};
const paceScale = { linger: 1.28, steady: 1, quick: .76 };

export function PlotPerformance({ moment, companion, side, dog, slide, directed, point, height, field, playing, paused, reduced, frame, meter, subtitle, audio, finish }: {
  moment: PlotMoment; companion: boolean; side: number; point: Point; height: number; field: boolean;
  dog?: boolean; slide?: Placement; directed?: boolean;
  playing: boolean; paused: boolean; reduced: boolean;
  frame: RefObject<PlotFrame>; meter: RefObject<HTMLDivElement | null>; audio: RefObject<AudioContext | null>;
  subtitle: RefObject<HTMLParagraphElement | null>;
  finish(): void;
}) {
  const clock = useRef({ index: 0, elapsed: 0, last: -1, finished: false });
  const ball = useRef<Mesh>(null), bat = useRef<Mesh>(null), item = useRef<Mesh>(null);
  const train = useRef<Group>(null), sash = useRef<Group>(null), visitor = useRef<Group>(null);
  const openLight = useRef<PointLight>(null);
  const pose = useRef<ActorPose>({ walking: 0, progress: 0 });
  const dogMotion = useRef({ pace: 0, settled: 0 });
  const splash = useRef<Group>(null);
  const travel = useRef(new Vector3()).current;
  const track = useRef(new Vector3());
  const openObject = moment.actions.find(action => action.kind === 'open')?.object;
  const carried = moment.actions.find(action => action.kind === 'hand-over' || action.kind === 'pick-up')?.object;
  const hasStrike = moment.actions.some(action => action.kind === 'strike');
  const hasTrain = moment.actions.some(action => action.kind === 'depart' && action.object === 'train');
  const ballFlight = moment.actions.some(action => action.object === 'ball');
  const talking = moment.actions.some(action => action.kind === 'talk');
  const approaching = moment.actions.some(action => action.kind === 'approach' && action.actor === 'companion');
  const comforting = moment.actions.some(action => action.kind === 'comfort');
  const mourning = moment.actions.some(action => action.kind === 'mourn');
  const riding = Boolean(slide && moment.actions.some(action => action.kind === 'slide'));

  function ridePosition(t: number, target: Vector3) {
    if (!slide) return target.set(point.x, height, point.z);
    const [x, y, z] = slidePoint(Math.min(1, Math.max(0, (t - .35) / .45)));
    const progress = Math.min(1, t / .35);
    const finish = Math.max(0, (t - .89) / .11);
    const landing = Math.min(1, Math.max(0, (t - .8) / .09));
    const localZ = z + landing * .48;
    const cos = Math.cos(slide.rotation), sin = Math.sin(slide.rotation);
    const slideX = slide.x + (x * cos + localZ * sin) * slide.scale;
    const slideZ = slide.z + (-x * sin + localZ * cos) * slide.scale;
    const altitude = Math.max(-.11, y - .29 - landing * .32);
    return target.set(
      (point.x + (slideX - point.x) * progress) * (1 - finish) + point.x * finish,
      height + altitude * Math.max(0, (progress - .29) / .71) * (1 - finish),
      (point.z + (slideZ - point.z) * progress) * (1 - finish) + point.z * finish,
    );
  }

  useFrame((_, dt) => {
    const state = clock.current;
    if (!playing || paused || state.finished) return;
    const action = moment.actions[state.index];
    if (!action) return;
    const length = duration[action.kind] * paceScale[moment.pace];
    state.elapsed += Math.min(dt, .08);
    const motion = reduced ? .6 : Math.min(1, state.elapsed / length);
    const cue = frame.current.input;
    frame.current.input = null;
    frame.current.action = action;
    frame.current.progress = motion;
    if (state.last !== state.index) {
      if (!directed && state.index === 0) plotSound(audio.current, 'ambience', moment.ambience);
      if (action.kind !== 'strike' && action.kind !== 'slide') plotSound(audio.current, action.kind, moment.ambience);
      if (subtitle.current) {
        subtitle.current.textContent = action.line ? `${action.actor === 'player' ? 'You' : 'Companion'} · ${action.line}` : '';
        subtitle.current.hidden = !action.line;
      }
      state.last = state.index;
    }
    if (riding && slide && action.kind === 'slide') {
      const playerProgress = reduced ? .82 : motion;
      frame.current.travel = ridePosition(playerProgress, travel);
      frame.current.facing = slide.rotation + Math.PI;
      frame.current.insideSlide = !reduced && motion > .44 && motion < .75;
      if (!reduced) frame.current.focus = travel;
      if (companion && action.together && visitor.current) {
        const companionProgress = Math.max(0, playerProgress - .14 * Math.sin(Math.PI * playerProgress));
        ridePosition(companionProgress, track.current);
        visitor.current.position.set(track.current.x - point.x, track.current.y - height, track.current.z - point.z);
        visitor.current.rotation.y = slide.rotation + Math.PI;
        visitor.current.visible = reduced || companionProgress <= .44 || companionProgress >= .75;
        pose.current.action = 'slide';
      }
      if (splash.current) {
        const splashTime = Math.max(0, (motion - .8) / .2);
        splash.current.visible = splashTime > 0;
        ridePosition(.88, track.current);
        splash.current.position.set(track.current.x - point.x, .09, track.current.z - point.z);
        splash.current.scale.setScalar(.23 + splashTime * 1.7);
      }
      if (state.elapsed - Math.min(dt, .08) < length * .8 && state.elapsed >= length * .8) plotSound(audio.current, 'slide', 'pool');
    }
    if (action.kind === 'strike' && state.elapsed - Math.min(dt, .08) < length * .22 && state.elapsed >= length * .22) {
      plotSound(audio.current, 'strike', moment.ambience);
    }
    const waiting = moment.input === 'timing' && action.kind === 'catch' && !reduced;
    if (meter.current) {
      meter.current.hidden = !waiting;
      if (waiting) {
        meter.current.style.setProperty('--catch-progress', `${motion * 100}%`);
        meter.current.dataset.ready = String(motion >= .35 && motion <= .8);
      }
    }
    const showBall = action.object === 'ball';
    if (ball.current) {
      ball.current.visible = showBall;
      if (action.kind === 'strike') {
        const flight = Math.max(0, (motion - .22) / .78);
        const homeRun = field && action.outcome === 'over-fence';
        const distance = homeRun ? 14.25 : 4.5;
        const rise = homeRun ? 4.7 : 1.65;
        ball.current.position.set(.23 + flight * 1.25, .95 + Math.sin(flight * Math.PI * .83) * rise, -.35 - flight * distance);
        if (!reduced && flight > .05) frame.current.focus = track.current.set(point.x + ball.current.position.x, height + ball.current.position.y, point.z + ball.current.position.z);
      } else if (action.kind === 'throw' || action.kind === 'catch') {
        const t = action.actor === 'player' && action.kind === 'throw' ? motion : 1 - motion;
        const distance = field ? 4.2 : 2;
        ball.current.position.set(.22 + t * (field ? 0 : .9), 1 + Math.sin(t * Math.PI) * .66, -.33 - t * distance);
      } else ball.current.position.set(.35 + motion * .55, .9, -.33);
    }
    if (bat.current) {
      bat.current.visible = action.kind === 'strike';
      bat.current.rotation.set(.24, motion * 1.7, -.62 + motion * 2.12);
    }
    if (item.current) {
      item.current.visible = action.object === carried && (action.kind === 'hand-over' || action.kind === 'pick-up');
      const transfer = action.actor === 'player' ? motion : 1 - motion;
      item.current.position.set(.28 + transfer * .84, action.kind === 'pick-up' ? .18 + motion * .75 : .92, -.43 - transfer * .44);
    }
    if (train.current && action.kind === 'depart') train.current.position.x = -1.3 - 14 * motion ** 1.55;
    if (sash.current && action.kind === 'open') sash.current.rotation.y = -1.08 * motion;
    if (openLight.current && action.kind === 'open') openLight.current.intensity = .5 + motion * 7;
    if (!riding || action.kind !== 'slide') pose.current.action = action.actor === 'companion' ? action.kind : undefined;
    pose.current.progress = motion;
    if (visitor.current && dog && action.kind === 'comfort') {
      const step = Math.min(1, motion * 1.68);
      const settling = Math.max(0, (motion - .58) / .42);
      visitor.current.position.set(side * (2.65 - step * 1.95), 0, -.05 - step * .38);
      visitor.current.rotation.y = side * (1.42 - settling * .88);
      dogMotion.current = { pace: step < 1 ? 1 : 0, settled: settling };
    } else if (visitor.current && (talking || approaching) && action.kind !== 'slide') {
      const step = state.index ? 1 : Math.min(1, motion * 1.6);
      visitor.current.position.set(side * (1.95 - step * .94), 0, -.92 - step * .22);
      visitor.current.rotation.y = side * 2.32;
      pose.current.walking = step < 1 ? 1 : 0;
    }
    if (visitor.current && action.kind === 'react' && !reduced) visitor.current.position.y = Math.sin(motion * Math.PI) * .095;
    if (waiting && cue !== 'skip' && !(cue === 'catch' && motion >= .35 && motion <= .8)) {
      if (state.elapsed >= length) state.elapsed = 0;
      return;
    }
    if (state.elapsed < (reduced ? Math.min(length, .9) : length) && !waiting) return;
    state.elapsed = 0;
    state.index += 1;
    frame.current.focus = null;
    frame.current.travel = undefined;
    frame.current.facing = undefined;
    frame.current.insideSlide = undefined;
    if (visitor.current && riding) visitor.current.visible = true;
    if (state.index === moment.actions.length) {
      state.finished = true;
      frame.current.action = undefined;
      if (meter.current) meter.current.hidden = true;
      if (subtitle.current) subtitle.current.hidden = true;
      finish();
    }
  }, -1);

  return <group position={[point.x, height, point.z]}>
    {companion && (!dog || comforting) && <group ref={visitor}
      position={[side * (dog ? 2.65 : talking || approaching ? 1.95 : field ? 1.38 : 1.18), 0, -.8]} rotation={[0, side * (dog ? 1.42 : -.9), 0]}>
      {dog ? <PlotDog motion={dogMotion} reduced={reduced} /> : <PlotActor pose={pose} companion reduced={reduced} directed={directed} />}
    </group>}
    {(mourning || comforting) && <group position={[0, 0, .22]}>
      <mesh position={[0, .32, 0]}><boxGeometry args={[1.42, .1, .43]} /><meshStandardMaterial color="#755c4c" /></mesh>
      {[-.55, .55].map(x => <mesh key={x} position={[x, .14, 0]}><boxGeometry args={[.08, .30, .29]} /><meshStandardMaterial color="#504d48" /></mesh>)}
    </group>}
    {riding && <group ref={splash} visible={false}>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.cos(i * .524) * .36, .22 + i % 3 * .15, Math.sin(i * .524) * .36]}>
        <icosahedronGeometry args={[.084, 0]} /><meshBasicMaterial color={i % 2 ? '#d9f6ff' : '#94d9f0'} transparent opacity={.84} />
      </mesh>)}
    </group>}
    {ballFlight && <mesh ref={ball} visible={false}><sphereGeometry args={[.095, 12, 8]} /><meshStandardMaterial color="#fff7e0" emissive="#d4a06f" emissiveIntensity={.35} /></mesh>}
    {hasStrike && <mesh ref={bat} position={[.36, 1.02, -.42]} visible={false}><cylinderGeometry args={[.058, .032, .71, 8]} /><meshStandardMaterial color="#c6975c" /></mesh>}
    {carried && carried !== 'ball' && <mesh ref={item} visible={false} rotation={[.12, .35, .08]}>
      <boxGeometry args={carried === 'ticket' ? [.26, .015, .12] : [.23, .075, .23]} /><meshStandardMaterial color={carried === 'ticket' ? '#e9d4a7' : '#9b674b'} />
    </mesh>}
    {(openObject === 'window' || openObject === 'door') && <group position={[0, .85, -1.25]}>
      {openObject === 'window' && <mesh position={[0, -.68, 0]}><boxGeometry args={[.98, .37, .16]} /><meshStandardMaterial color="#b39c80" /></mesh>}
      {[-.46, .46].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.105, 1.2, .145]} /><meshStandardMaterial color="#ad9374" /></mesh>)}
      <mesh position={[0, .6, 0]}><boxGeometry args={[.98, .105, .145]} /><meshStandardMaterial color="#ad9374" /></mesh>
      <group ref={sash} position={[-.41, 0, 0]}>
        <mesh position={[.4, 0, 0]}><boxGeometry args={[.8, 1.15, .07]} /><meshStandardMaterial color={openObject === 'window' ? '#a9c3ce' : '#96724e'} metalness={.12} /></mesh>
        <mesh position={[.4, 0, .043]}><boxGeometry args={[.85, .052, .052]} /><meshStandardMaterial color="#cdb38c" /></mesh>
      </group>
      <pointLight ref={openLight} position={[0, .3, -.27]} intensity={.5} color="#ffd7a4" distance={4.9} />
    </group>}
    {hasTrain && <group position={[0, .025, -3.6]}>
      {[-.44, .44].map(z => <mesh key={z} position={[-3, 0, z]}><boxGeometry args={[19, .07, .045]} /><meshStandardMaterial color="#92918b" metalness={.35} /></mesh>)}
      {Array.from({ length: 22 }, (_, index) => <mesh key={index} position={[6 - index * .88, -.01, 0]}>
        <boxGeometry args={[.15, .025, 1.2]} /><meshStandardMaterial color="#5a5051" />
      </mesh>)}
      <mesh position={[-.5, 0, 1.2]}><boxGeometry args={[10, .065, 1.04]} /><meshStandardMaterial color="#a39a8a" /></mesh>
      <mesh position={[-.5, .033, .74]}><boxGeometry args={[10, .012, .07]} /><meshStandardMaterial color="#e0bd72" /></mesh>
    </group>}
    {hasTrain && <group position={[-1.3, .07, -3.6]} ref={train}>
      {[-3.1, 0, 3.1].map(x => <group key={x} position={[x, 0, 0]}>
        <mesh position={[0, .68, 0]}><boxGeometry args={[2.95, 1.14, .93]} /><meshStandardMaterial color="#3b5b5d" /></mesh>
        <mesh position={[0, 1.29, 0]}><boxGeometry args={[2.92, .16, 1.02]} /><meshStandardMaterial color="#54666a" /></mesh>
        {[-.91, 0, .91].map(window => <mesh key={window} position={[window, .85, .473]}>
          <boxGeometry args={[.58, .37, .018]} /><meshStandardMaterial color="#d8ab72" emissive="#c58847" emissiveIntensity={.58} />
        </mesh>)}
      </group>)}
    </group>}
  </group>;
}
