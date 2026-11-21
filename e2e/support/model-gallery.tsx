import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createRoot } from 'react-dom/client';
import { originalModelIds, originalModels } from '../../src/world/original-models';
import { OriginalModels } from '../../src/world/SceneModels';
import type { Placement } from '../../src/world/layout-schema';

const perPage = 24;
const columns = 6;
const index = Math.max(0, Number(new URLSearchParams(location.search).get('page')) || 0);
const modelIds = originalModelIds.slice(index * perPage, (index + 1) * perPage);
const placements: Placement[] = modelIds.map((recipe, i) => ({
  id: recipe, recipe, x: (i % columns - 2.5) * 4.65, z: (Math.floor(i / columns) - 1.5) * 4.45,
  y: 0, scale: 1, rotation: -.15, term: null, color: null,
}));
const expected = modelIds.reduce((sum, id) => sum + originalModels[id].parts.length, 0);
const canvasId = 'gallery-stats';
function Gallery() {
  const { camera } = useThree();
  camera.lookAt(0, 0, 0);
  useFrame(({ gl, scene }) => {
    const target = document.querySelector<HTMLElement>('#' + canvasId);
    if (target && gl.info.render.triangles) {
      target.dataset.triangles = String(gl.info.render.triangles);
      target.dataset.calls = String(gl.info.render.calls);
      target.dataset.parts = String(scene.children.reduce((sum, item) => sum +
        ('isInstancedMesh' in item && 'count' in item ? Number(item.count) : 0), 0));
    }
  });
  return <>
    <color attach="background" args={['#465355']} />
    <ambientLight intensity={1.15} />
    <directionalLight position={[3, 12, 9]} intensity={2.1} />
    <OriginalModels placements={placements} />
  </>;
}

createRoot(document.getElementById('root')!).render(<main style={{ maxWidth: 1150, margin: 'auto', padding: '.5rem 1rem 1rem' }}>
  <h1 style={{ fontSize: 21 }}>Memory Worlds model gallery · {index + 1}</h1>
  <div style={{ height: 600 }}>
    <Canvas orthographic camera={{ position: [0, 22, 12], zoom: 36, far: 120 }} dpr={1}><Gallery /></Canvas>
  </div>
  <ol start={index * perPage + 1} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
    {modelIds.map(id => <li key={id}>{originalModels[id].label}</li>)}
  </ol>
  <output id={canvasId} data-expected={expected}>{modelIds.length} original models</output>
</main>);
