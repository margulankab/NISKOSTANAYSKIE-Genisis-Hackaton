import { Component, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentRef, ReactNode, RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, SRGBColorSpace, Vector3 } from 'three';
import type { Group } from 'three';
import type { MemoryScene } from '../shared/memory-schema';
import { ArtifactModel, artifactNames } from './ArtifactModel';
import { EnvironmentBackdrop } from './EnvironmentBackdrop';
import { getMusicMotion } from './music-motion';
import type { SceneStyle } from './scene-style';

const initialCamera = { position: [3.8, 3.1, 6.4] as [number, number, number], fov: 37 };

class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const canvas = useThree(({ gl }) => gl.domElement);
  useEffect(() => {
    canvas.addEventListener('webglcontextlost', onLost);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [canvas, onLost]);
  return null;
}

function ProjectArtifactMarkers({ spacing, markers }: {
  spacing: number;
  markers: RefObject<(HTMLButtonElement | null)[]>;
}) {
  const point = useRef(new Vector3());

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    markers.current.forEach((button, index) => {
      if (!button) return;
      const position = point.current.set((index - 0.5) * spacing, 1.13, 0).project(camera);
      const visible = Math.abs(position.x) < 1 && Math.abs(position.y) < 1 && Math.abs(position.z) < 1;
      button.style.visibility = visible ? 'visible' : 'hidden';
      button.style.left = (position.x + 1) * size.width / 2 + 'px';
      button.style.top = (1 - position.y) * size.height / 2 + 'px';
    });
  });

  return null;
}

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(update: () => void) {
  const preference = window.matchMedia(reducedMotionQuery);
  preference.addEventListener('change', update);
  return () => preference.removeEventListener('change', update);
}

function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function SoundtrackMotion({ activeAudio, models, music, parameters }: {
  activeAudio: HTMLAudioElement | null;
  models: RefObject<(Group | null)[]>;
  music: MemoryScene['music'];
  parameters: MemoryScene['presentation']['parameters'];
}) {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion);
  const invalidate = useThree(({ invalidate }) => invalidate);
  const animating = activeAudio !== null && !reducedMotion && music.meanEnergy > 0;

  useEffect(() => {
    invalidate();
  }, [animating, activeAudio, invalidate]);

  useFrame(() => {
    const playing = animating && !activeAudio.paused && !activeAudio.ended && !activeAudio.seeking;
    const { scale, lift } = playing
      ? getMusicMotion(activeAudio.currentTime, music, parameters)
      : { scale: 1, lift: 0 };
    for (const model of models.current) {
      if (!model) continue;
      model.scale.setScalar(scale);
      model.position.y = lift;
    }
    if (playing) invalidate();
  });

  return null;
}

function Preview() {
  return (
    <div className="stage-fallback">
      <p><strong>Static preview</strong><br />The 3D scene is unavailable on this device.</p>
      <div className="stage-swatch" aria-hidden="true"><i /><i /></div>
    </div>
  );
}

export function MemoryStage({ manifest, style, revealed, onReveal, activeAudio }: {
  manifest: MemoryScene;
  style: SceneStyle;
  revealed: ReadonlySet<string>;
  onReveal: (id: string) => void;
  activeAudio: HTMLAudioElement | null;
}) {
  const [contextLost, setContextLost] = useState(false);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const models = useRef<(Group | null)[]>([]);
  const { accentPalette, artifactSpacing, lightWarmth, ambientIntensity, treatment } = style;
  const colors = accentPalette.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace));
  const surround = new Color('#242b28').lerp(colors[1], 0.22);
  const deck = new Color('#454739').lerp(colors[2], 0.38);
  const keyLight = new Color('#c0d9f2').lerp(new Color('#ffca91'), lightWarmth);

  const fallback = <div className="stage-viewport"><Preview /></div>;

  return (
    <section className="memory-stage" aria-label="Memory diorama">
      {contextLost ? fallback : (
        <StageBoundary fallback={fallback}>
          <div className="stage-viewport">
            <Canvas
              camera={initialCamera}
              frameloop="demand"
              dpr={[1, 1.5]}
              fallback={<Preview />}
            >
              <ContextMonitor onLost={() => setContextLost(true)} />
              <color attach="background" args={[surround]} />
              <ambientLight intensity={ambientIntensity} />
              <directionalLight position={[-3, 5, 3]} color={keyLight} intensity={treatment === 'soft' ? 1.8 : 2.3} />
              <mesh position={[0, -0.43, 0]}>
                <boxGeometry args={[5.2, 0.44, 3.25]} />
                <meshStandardMaterial color={deck} roughness={0.85} />
              </mesh>
              <mesh position={[0, -0.18, 0]}>
                <boxGeometry args={[4.95, 0.08, 3.03]} />
                <meshStandardMaterial color={deck.clone().lerp(colors[0], 0.24)} roughness={0.9} />
              </mesh>
              <mesh position={[0, -0.31, 1.63]}>
                <boxGeometry args={[4.84, 0.025, 0.02]} />
                <meshStandardMaterial color={colors[0]} />
              </mesh>
              <EnvironmentBackdrop
                environment={style.environment}
                variation={style.variation}
                deck={deck}
                accent={colors[0]}
                secondary={colors[1]}
              />
              {manifest.artifacts.map(({ id, kind, photoId }, index) => {
                const open = revealed.has(id);
                const accent = colors[index];
                return (
                  <group key={id} position={[(index - 0.5) * artifactSpacing, 0, 0]}
                    rotation={[0, treatment === 'angular' ? (index === 0 ? -0.23 : 0.23) : 0, 0]}
                    onClick={(event) => {
                      if (event.delta > 4) return;
                      event.stopPropagation();
                      onReveal(id);
                    }}
                  >
                    <mesh position={[0, -0.07, 0]}>
                      <boxGeometry args={[1.17, 0.14, 1.05]} />
                      <meshStandardMaterial color={accent} roughness={0.65}
                        emissive={accent} emissiveIntensity={open ? 0.16 : 0} />
                    </mesh>
                    {treatment === 'collage' && photoId && (
                      <>
                        <mesh position={[0.18, 0.012, -0.08]} rotation={[0, -0.19, 0]}>
                          <boxGeometry args={[0.91, 0.018, 0.66]} />
                          <meshStandardMaterial color={colors[2]} />
                        </mesh>
                        <mesh position={[-0.13, 0.026, -0.12]} rotation={[0, 0.15, 0]}>
                          <boxGeometry args={[0.82, 0.018, 0.62]} />
                          <meshStandardMaterial color="#d8c4a6" />
                        </mesh>
                      </>
                    )}
                    <group ref={(group) => { models.current[index] = group; }}>
                      <ArtifactModel kind={kind} accent={accent} />
                    </group>
                  </group>
                );
              })}
              <SoundtrackMotion
                activeAudio={activeAudio}
                models={models}
                music={manifest.music}
                parameters={manifest.presentation.parameters}
              />
              <ProjectArtifactMarkers spacing={artifactSpacing} markers={markers} />
              <OrbitControls
                ref={controls}
                enableDamping={false}
                enablePan={false}
                minDistance={4.1}
                maxDistance={10}
                minPolarAngle={0.28}
                maxPolarAngle={1.46}
              />
            </Canvas>
            <div className="stage-overlay">
              {manifest.artifacts.map(({ id, kind }, index) => (
                <button
                  key={id}
                  ref={(element) => { markers.current[index] = element; }}
                  type="button"
                  className="stage-marker"
                  tabIndex={-1}
                  aria-label={'Reveal ' + artifactNames[kind] + ' in the diorama'}
                  aria-pressed={revealed.has(id)}
                  onClick={() => onReveal(id)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="stage-toolbar">
            <span>Drag to orbit · Scroll or pinch to zoom</span>
            <button type="button" onClick={() => controls.current?.reset()}>Reset view</button>
          </div>
        </StageBoundary>
      )}
    </section>
  );
}
