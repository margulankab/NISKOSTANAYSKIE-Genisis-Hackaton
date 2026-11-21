import { Component, useEffect, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, SRGBColorSpace } from 'three';
import type { MemoryScene } from '../shared/memory-schema';

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

function Preview() {
  return (
    <div className="stage-fallback">
      <p><strong>Static preview</strong><br />The 3D scene is unavailable on this device.</p>
      <div className="stage-swatch" aria-hidden="true"><i /><i /></div>
    </div>
  );
}

export function MemoryStage({ manifest }: { manifest: MemoryScene }) {
  const [contextLost, setContextLost] = useState(false);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { accentPalette, artifactSpacing, lightWarmth, photoLightness } = manifest.presentation.parameters;
  const colors = accentPalette.map(([r, g, b]) => new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace));
  const surround = new Color('#242b28').lerp(colors[1], 0.22);
  const deck = new Color('#454739').lerp(colors[2], 0.38);
  const keyLight = new Color('#c0d9f2').lerp(new Color('#ffca91'), lightWarmth);

  return (
    <section className="memory-stage" aria-label="Memory diorama">
      <div className="stage-viewport">
        <StageBoundary fallback={<Preview />}>
          {contextLost ? <Preview /> : (
            <Canvas
              camera={initialCamera}
              frameloop="demand"
              dpr={[1, 1.5]}
              fallback={<Preview />}
            >
              <ContextMonitor onLost={() => setContextLost(true)} />
              <color attach="background" args={[surround]} />
              <ambientLight intensity={0.65 + 0.65 * photoLightness} />
              <directionalLight position={[-3, 5, 3]} color={keyLight} intensity={2.3} />
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
              {manifest.artifacts.map(({ id }, index) => (
                <mesh key={id} position={[(index - 0.5) * artifactSpacing, -0.07, 0]}>
                  <boxGeometry args={[1.17, 0.14, 1.05]} />
                  <meshStandardMaterial color={colors[index]} roughness={0.65} />
                </mesh>
              ))}
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
          )}
        </StageBoundary>
      </div>
      <div className="stage-toolbar">
        <span>Drag to orbit · Scroll or pinch to zoom</span>
        <button type="button" onClick={() => controls.current?.reset()}>Reset view</button>
      </div>
    </section>
  );
}
