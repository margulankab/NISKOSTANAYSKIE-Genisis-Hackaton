import { useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { PlotMoment } from './plot-schema';

export type ActorPose = { walking: number; action?: PlotMoment['actions'][number]['kind']; progress: number };

export function PlotActor({ pose, companion = false, reduced = false, directed = false }: {
  pose: RefObject<ActorPose>; companion?: boolean; reduced?: boolean; directed?: boolean;
}) {
  const left = useRef<Group>(null), right = useRef<Group>(null);
  const leftLeg = useRef<Group>(null), rightLeg = useRef<Group>(null);
  const root = useRef<Group>(null), head = useRef<Group>(null);
  const cup = useRef<Group>(null);
  const step = useRef(0);
  useFrame((_, dt) => {
    const { walking, action, progress } = pose.current;
    step.current += dt * walking * 8;
    const swing = reduced ? 0 : Math.sin(step.current) * Math.min(.62, walking * .45);
    const gesture = Math.sin(Math.PI * progress);
    const seated = action === 'mourn' || action === 'slide';
    const bend = seated ? Math.min(1, progress * 5, (1 - progress) * 5) : 0;
    if (root.current) {
      root.current.position.y = -bend * (action === 'mourn' ? .34 : .42);
      root.current.rotation.x = action === 'mourn' ? -.18 * bend : action === 'laugh' && !reduced ? -.12 * gesture : 0;
    }
    if (head.current) {
      head.current.rotation.x = action === 'mourn' ? .31 * bend : action === 'sip' ? -.17 * gesture : 0;
      head.current.rotation.y = action === 'talk' && !reduced ? .09 * Math.sin(progress * 12) : 0;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = swing + bend * 1.16;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing + bend * 1.16;
    if (left.current) left.current.rotation.x = action === 'react' ? -2.25 * gesture : action === 'catch' ? -.9 * gesture : -swing * .65;
    if (right.current) {
      right.current.rotation.x = action === 'sip' ? 2.06 * gesture : action === 'talk' ? .55 * gesture
        : action === 'laugh' ? .72 * gesture : action === 'mourn' ? .8 * bend
        : action === 'strike' ? -1.2 : action === 'throw' ? -2.5 * gesture
        : action === 'react' ? -2.4 * gesture : action && ['catch', 'open', 'pick-up', 'hand-over'].includes(action) ? -1.3 * gesture : swing * .65;
      right.current.rotation.z = action === 'strike' ? (progress - .45) * 4 : .09;
    }
    if (cup.current) {
      cup.current.visible = action === 'sip';
      cup.current.rotation.x = -(right.current?.rotation.x ?? 0) + .3 * gesture;
    }
  });
  const top = companion ? directed ? '#b27678' : '#bd8655' : '#426f75';
  const pants = companion ? '#3d4c42' : '#3c4458';
  return <group ref={root}>
    <mesh position={[0, .91, 0]} castShadow><cylinderGeometry args={[.19, .22, .45, 6]} /><meshStandardMaterial color={top} flatShading /></mesh>
    <group ref={head} position={[0, 1.26, -.015]}>
      <mesh><icosahedronGeometry args={[.175, 1]} /><meshStandardMaterial color="#cb9973" flatShading /></mesh>
      <mesh position={[0, .12, .017]}><cylinderGeometry args={[.115, .164, .11, 8]} /><meshStandardMaterial color={companion ? '#5d4236' : '#233c42'} /></mesh>
      {companion && directed
        ? <mesh position={[0, .005, .12]}><boxGeometry args={[.236, .27, .09]} /><meshStandardMaterial color="#5d4236" /></mesh>
        : <mesh position={[0, .07, -.105]}><boxGeometry args={[.23, .032, .22]} /><meshStandardMaterial color={companion ? '#6e5445' : '#233c42'} /></mesh>}
    </group>
    {[{ arm: left, leg: leftLeg, x: -.23 }, { arm: right, leg: rightLeg, x: .23 }].map(({ arm, leg, x }) => (
      <group key={x}>
        <group ref={arm} position={[x, 1.05, 0]}>
          <mesh position={[0, -.13, 0]}><boxGeometry args={[.115, .29, .13]} /><meshStandardMaterial color={top} /></mesh>
          <mesh position={[0, -.293, 0]}><icosahedronGeometry args={[.075, 0]} /><meshStandardMaterial color="#cb9973" /></mesh>
          {x > 0 && <group ref={cup} position={[-.045, -.30, -.074]} visible={false}>
            <mesh position={[0, .05, 0]}><cylinderGeometry args={[.074, .055, .13, 12]} /><meshStandardMaterial color="#e8c3a0" /></mesh>
            <mesh position={[0, .118, 0]}><cylinderGeometry args={[.062, .062, .007, 12]} /><meshStandardMaterial color="#6c4130" /></mesh>
          </group>}
        </group>
        <group ref={leg} position={[x * .47, .7, 0]}>
          <mesh position={[0, -.286, 0]}><boxGeometry args={[.16, .64, .155]} /><meshStandardMaterial color={pants} /></mesh>
          <mesh position={[0, -.635, -.032]}><boxGeometry args={[.17, .12, .255]} /><meshStandardMaterial color="#372f2b" /></mesh>
        </group>
      </group>
    ))}
  </group>;
}
