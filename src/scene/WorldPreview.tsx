import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { selectWorldSoundtrack } from '../media/world-soundtrack';
import type { ResolvedWorldSoundtrack } from '../media/world-soundtrack';
import { ContextMonitor, StageBoundary } from './MemoryStage';
import { WorldScenery } from './WorldScenery';
import { WorldSoundtrack } from './WorldSoundtrack';
import { examples } from './world-preview-examples';
import type { CameraView, Example, ExampleId } from './world-preview-examples';

function PreviewCamera({ view, setReady }: { view: CameraView; setReady: (ready: boolean) => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree(({ camera }) => camera);
  const aspect = useThree(({ size }) => size.width / Math.max(1, size.height));
  const invalidate = useThree(({ invalidate }) => invalidate);

  useLayoutEffect(() => {
    if (!controls.current) return;
    const [x, y, z] = view.target;
    controls.current.target.set(x, y, z);
    camera.position.set(x + view.offset[0], y + view.offset[1], z + view.offset[2]);
    // Widen the lens on narrow screens so fitting the scene doesn't deepen the fog.
    camera.zoom = Math.min(1, Math.max(0.5, aspect) / 1.4);
    camera.updateProjectionMatrix();
    controls.current.update();
    invalidate();
  }, [aspect, camera, invalidate, view]);

  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, [setReady]);

  return <OrbitControls ref={controls} enableDamping={false} enablePan={false}
    minDistance={3} maxDistance={30} maxPolarAngle={Math.PI / 2} />;
}

function ExamplePreview({ exampleId, override, onChange, muted, onMutedChange }: {
  exampleId: ExampleId;
  override?: ResolvedWorldSoundtrack;
  onChange: (soundtrack: ResolvedWorldSoundtrack) => void;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
}) {
  const example: Example = examples[exampleId];
  const [initialChoice] = useState(() => override ?? selectWorldSoundtrack({ setting: [exampleId] }));
  const choice = override ?? initialChoice;
  const [view, setView] = useState(example.overview);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const viewport = useId();
  const ready = cameraReady && !contextLost;
  const anchors = [...example.layout.discoveries, example.layout.ending];
  const fallback = <div className="stage-fallback" role="status">3D preview is unavailable in this browser.</div>;

  return (
    <>
      <p>{example.description}</p>
      <div id={viewport} className="stage-viewport world-preview-viewport" role="region" aria-label={example.title}>
        {contextLost ? fallback : (
          <StageBoundary fallback={fallback}>
            <Canvas camera={{ fov: 49 }} frameloop="demand" dpr={[1, 1.5]} fallback={fallback}>
              <ContextMonitor onLost={() => setContextLost(true)} />
              <WorldScenery placements={example.layout.placements} atmosphere={example.atmosphere} activeAudio={activeAudio}
                music={choice.record.kind === 'silent' ? undefined : choice.record.music} />
              <PreviewCamera view={view} setReady={setCameraReady} />
            </Canvas>
          </StageBoundary>
        )}
      </div>
      {ready && <p className="world-preview-controls">Drag to orbit. Scroll or pinch to zoom.</p>}
      <div className="world-preview-views" role="group" aria-label="Landmarks in route order">
        <button type="button" aria-controls={viewport} disabled={!ready}
          onClick={() => setView({ ...example.overview })}>Overview</button>
        {example.landmarks.map(({ name, height, offset }, index) => {
          const anchor = anchors[index];
          const [x, z] = example.layout.placements.find(({ id }) => id === anchor.objectId)?.at ?? anchor.at;
          return <button key={anchor.objectId} type="button" aria-controls={viewport} disabled={!ready}
            onClick={() => setView({ target: [x, height, z], offset })}>{name}</button>;
        })}
      </div>
      <WorldSoundtrack value={choice} onChange={(soundtrack) => {
        setActiveAudio(null);
        onChange(soundtrack);
      }} onActiveAudio={setActiveAudio} mute={{ value: muted, onChange: onMutedChange }} />
    </>
  );
}

export function WorldPreview() {
  const picker = useId();
  const [selected, setSelected] = useState<ExampleId>('cove');
  const [overrides, setOverrides] = useState<Partial<Record<ExampleId, ResolvedWorldSoundtrack>>>({});
  const [muted, setMuted] = useState(false);

  return (
    <article className="preview world-preview">
      <h1>World preview</h1>
      <label htmlFor={picker}>Example world</label>
      <select id={picker} value={selected} onChange={(event) => {
        const choice = event.currentTarget.value;
        if (choice === 'cove' || choice === 'market') setSelected(choice);
      }}>
        <option value="cove">{examples.cove.title}</option>
        <option value="market">{examples.market.title}</option>
      </select>
      <ExamplePreview key={selected} exampleId={selected} override={overrides[selected]}
        onChange={(soundtrack) => setOverrides((previous) => ({ ...previous, [selected]: soundtrack }))}
        muted={muted} onMutedChange={setMuted} />
    </article>
  );
}
