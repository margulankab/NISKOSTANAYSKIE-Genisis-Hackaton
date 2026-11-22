import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { blocked } from '../gameplay/controller';
import { seededRandom } from './compose-world';
import { momentPoint, toWalkLayout } from './layout-schema';
import type { WorldLayout } from './layout-schema';

type DogMotion = { pace: number; settled: number };

export function PlotDog({ motion, reduced }: { motion: RefObject<DogMotion>; reduced: boolean }) {
  const tail = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const body = useRef<Group>(null);
  const clock = useRef(0);
  useFrame((_, dt) => {
    const { pace, settled } = motion.current;
    clock.current += dt * (pace ? 13 : 4);
    if (body.current) body.current.position.y = -.13 * settled + (reduced ? 0 : Math.abs(Math.sin(clock.current)) * pace * .035);
    if (tail.current) tail.current.rotation.y = reduced ? 0 : Math.sin(clock.current) * (.2 + .44 * settled);
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = (reduced ? 0 : Math.sin(clock.current + (i % 2) * Math.PI) * pace * .42) + (i < 2 ? .78 : -.78) * settled;
    });
  });
  const fur = '#ad784a';
  return <group ref={body}>
    <mesh position={[0, .36, .05]}><boxGeometry args={[.27, .28, .62]} /><meshStandardMaterial color={fur} /></mesh>
    <mesh position={[0, .49, -.3]}><icosahedronGeometry args={[.2, 1]} /><meshStandardMaterial color={fur} /></mesh>
    <mesh position={[0, .43, -.47]}><boxGeometry args={[.17, .115, .22]} /><meshStandardMaterial color="#dfb685" /></mesh>
    <mesh position={[0, .47, -.58]}><boxGeometry args={[.1, .07, .055]} /><meshStandardMaterial color="#362d28" /></mesh>
    {[-1, 1].map(side => <group key={side} position={[side * .137, .53, -.27]} rotation={[.25, 0, side * .34]}>
      <mesh position={[0, -.07, 0]}><boxGeometry args={[.094, .235, .13]} /><meshStandardMaterial color="#765034" /></mesh>
      <mesh position={[-side * .02, -.04, -.09]}><boxGeometry args={[.028, .023, .018]} /><meshStandardMaterial color="#2d231e" /></mesh>
    </group>)}
    <group ref={legs}>{[.23, -.17].flatMap(z => [-.09, .09].map(x => <group key={x + ':' + z} position={[x, .28, z]}>
      <mesh position={[0, -.12, 0]}><boxGeometry args={[.092, .25, .1]} /><meshStandardMaterial color={fur} /></mesh>
      <mesh position={[0, -.22, -.025]}><boxGeometry args={[.1, .073, .145]} /><meshStandardMaterial color="#dfb685" /></mesh>
    </group>))}</group>
    <group ref={tail} position={[0, .4, .32]}><mesh rotation={[.6, 0, -.22]} position={[0, .1, .14]}>
      <boxGeometry args={[.08, .09, .34]} /><meshStandardMaterial color="#765034" />
    </mesh></group>
    <mesh position={[0, .38, -.22]}><boxGeometry args={[.276, .05, .055]} /><meshStandardMaterial color="#47666e" /></mesh>
  </group>;
}

const guestColors = ['#b46055', '#656799', '#c19558', '#436e70', '#836055', '#81784c', '#a87583', '#567086', '#ae9b7b'];

export function SceneGuests({ layout, reduced, paused }: { layout: WorldLayout; reduced: boolean; paused: boolean }) {
  const actors = useRef<Group>(null);
  const conversation = layout.plot?.moments.find(moment => moment.actions.some(action => action.kind === 'talk'));
  const anchor = layout.direction?.gatheringAnchor;
  const plannedVenue = anchor && layout.approaches?.[{ arrival: 0, activity: 1, ending: 2 }[anchor]];
  const venue = plannedVenue || (conversation ? momentPoint(layout, conversation) : layout.approaches?.[1] ?? layout.spawn);
  const stageArea = layout.indoor?.area ?? layout.bounds;
  const width = Math.max(.6, Math.min(6.6, stageArea.maxX - stageArea.minX - 1.7));
  const centerX = Math.max(stageArea.minX + width / 2 + .3, Math.min(stageArea.maxX - width / 2 - .3, venue.x));
  const rowZ = Math.max(stageArea.minZ + .42, Math.min(stageArea.maxZ - .42, venue.z - 2.9));
  const bulbs = useMemo(() => Array.from({ length: 13 }, (_, i) => {
    const fraction = i / 12;
    return [centerX + width * (fraction - .5), 2.96 - Math.sin(fraction * Math.PI) * .44, rowZ] as const;
  }), [centerX, width, rowZ]);
  const cable = useMemo(() => {
    const result = new BufferGeometry();
    const vertices = bulbs.slice(1).flatMap((end, index) => [...bulbs[index], ...end]);
    result.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    return result;
  }, [bulbs]);
  useEffect(() => () => cable.dispose(), [cable]);
  const guests = useMemo(() => {
    if (!layout.plot?.gathering) return [];
    const walk = toWalkLayout(layout);
    const area = layout.indoor?.area ?? walk.bounds;
    const rand = seededRandom(Math.round((layout.placements[0]?.z ?? 0) * 3199) ^ 0xb8b292);
    const reserved = [walk.spawn, ...layout.plot.moments.map(moment => momentPoint(layout, moment))];
    const clusters: { x: number; z: number; yaw: number }[] = [];
    let groups = 0;
    for (let attempt = 0; attempt < 90 && groups < 3; attempt++) {
      const spread = attempt < 54;
      const x = spread ? centerX + (rand() - .5) * (width + 4) : area.minX + .95 + (area.maxX - area.minX - 1.9) * rand();
      const z = spread ? rowZ + (rand() - .5) * 6.6 : area.minZ + .95 + (area.maxZ - area.minZ - 1.9) * rand();
      if (reserved.some(p => Math.hypot(p.x - x, p.z - z) < 2.25)
        || clusters.some(p => Math.hypot(p.x - x, p.z - z) < 1.9)) continue;
      const group = Array.from({ length: 3 }, (_, i) => {
        const yaw = i * Math.PI * 2 / 3 + attempt;
        return { x: x + Math.sin(yaw) * .64, z: z + Math.cos(yaw) * .64, yaw };
      }).filter(point => !blocked(point, walk));
      if (group.length >= 2) {
        clusters.push(...group);
        groups++;
      }
    }
    return clusters;
  }, [layout, centerX, rowZ, width]);
  useFrame(({ clock }) => {
    if (reduced || paused) return;
    actors.current?.children.forEach((group, i) => { group.rotation.y = guests[i].yaw + Math.sin(clock.elapsedTime * .9 + i) * .12; });
  });
  const bulbsColor = layout.direction?.palette.light ?? '#f4c895';
  return <>
    <group ref={actors}>{guests.map(({ x, z, yaw }, i) => <group key={i} position={[x, 0, z]} rotation={[0, yaw, 0]}
    scale={.8 + i % 4 * .055}>
    <mesh position={[0, 1.26, -.01]}><icosahedronGeometry args={[.165, 1]} /><meshStandardMaterial color={['#ac7659', '#d2a282', '#a0735d'][i % 3]} /></mesh>
    <mesh position={[0, 1.37, .025]}><icosahedronGeometry args={[.14, 0]} /><meshStandardMaterial color={['#513d33', '#382c29', '#8a6851'][i % 3]} /></mesh>
    <mesh position={[0, .89, 0]}><cylinderGeometry args={[.18, .20, .48, 6]} /><meshStandardMaterial color={guestColors[i]} /></mesh>
    {[-.11, .11].map(leg => <mesh key={leg} position={[leg, .34, 0]}><boxGeometry args={[.17, .66, .17]} /><meshStandardMaterial color="#343943" /></mesh>)}
    </group>)}</group>
    <lineSegments geometry={cable}>
      <lineBasicMaterial color="#574d47" />
    </lineSegments>
    {bulbs.map(([x, y, z], index) => <mesh key={index} position={[x, y - .025, z]}>
      <icosahedronGeometry args={[.075, 0]} /><meshBasicMaterial color={index % 3 ? bulbsColor : '#f5c28d'} />
    </mesh>)}
    {!layout.indoor && [-1, 1].map(sign => <mesh key={sign} position={[centerX + sign * width / 2, 1.48, rowZ]}>
      <boxGeometry args={[.085, 2.96, .085]} /><meshStandardMaterial color="#665649" />
    </mesh>)}
    <pointLight position={[centerX, 2.48, rowZ]} color={bulbsColor} intensity={10} distance={9} decay={2} />
  </>;
}
