import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { originalModelIds, originalModels } from '../../src/world/original-models';
import type { OriginalModelId } from '../../src/world/original-models';
import { OriginalModels } from '../../src/world/SceneModels';
import type { Placement } from '../../src/world/layout-schema';
import { placementSolids } from '../../src/world/recipes';

const perPage = 24;
const columns = 6;
const pages = Math.ceil(originalModelIds.length / perPage);
const index = Math.max(0, Math.min(pages - 1, Math.floor(Number(new URLSearchParams(location.search).get('page')) || 0)));
const modelIds = originalModelIds.slice(index * perPage, (index + 1) * perPage);
const placements: Placement[] = modelIds.map((recipe, i) => ({
  id: recipe, recipe, x: (i % columns - 2.5) * 4.65, z: (Math.floor(i / columns) - 1.5) * 4.45,
  y: 0, scale: recipe === 'baseball-diamond' ? .24 : 1, rotation: -.15, term: null, color: null,
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

function inspect(id: OriginalModelId) {
  const bounds = new Box3();
  const unit = new Box3(new Vector3(-.5, -.5, -.5), new Vector3(.5, .5, .5));
  for (const part of originalModels[id].parts) {
    const rotation = new Quaternion().setFromEuler(new Euler(...part.rotation ?? [0, 0, 0]));
    bounds.union(unit.clone().applyMatrix4(new Matrix4().compose(new Vector3(...part.at), rotation, new Vector3(...part.size))));
  }
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  return { center, size, extent: Math.max(1, size.length()) };
}

function ModelDetail({ id }: { id: OriginalModelId }) {
  const { center, size, extent } = inspect(id);
  const placement: Placement = { id, recipe: id, x: 0, y: 0, z: 0, scale: 1, rotation: 0, term: null, color: null };
  const collision = placementSolids(placement);
  return <>
    <div style={{ height: 460 }}>
      <Canvas dpr={1} camera={{ position: [center.x + extent * .76, center.y + extent * .42, center.z + extent * .93], fov: 45 }}>
        <color attach="background" args={['#465355']} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 12, 9]} intensity={2.1} />
        <gridHelper args={[Math.ceil(extent) * 2, Math.ceil(extent) * 2, '#9c9c73', '#69797a']} />
        <OriginalModels placements={[placement]} />
        {collision.map((solid, i) => <mesh key={i} position={[solid.x, .039, solid.z]} rotation={[-Math.PI / 2, 0, 0]}>
          {solid.shape === 'circle' ? <ringGeometry args={[Math.max(0, solid.radius - .03), solid.radius, 40]} />
            : <planeGeometry args={[solid.halfX * 2, solid.halfZ * 2]} />}
          <meshBasicMaterial color="#ffd187" transparent opacity={.68} depthWrite={false} />
        </mesh>)}
        <OrbitControls target={[center.x, center.y, center.z]} />
      </Canvas>
    </div>
    <p>{size.toArray().map(dimension => dimension.toFixed(2)).join(' × ')} m · Grid lines at 1 m · {collision.length ? 'Amber shows the collision footprint.' : 'Walkable decoration.'}</p>
  </>;
}

function ModelGallery() {
  const [selected, setSelected] = useState<OriginalModelId>();
  return <main style={{ maxWidth: 1150, margin: 'auto', padding: '.5rem 1rem 1rem' }}>
    <h1 style={{ fontSize: 24 }}>Memory Worlds model gallery</h1>
    <nav aria-label="Gallery pages" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
      {Array.from({ length: pages }, (_, page) => <a key={page} href={`?page=${page}`}
        style={{ color: '#f4e8d4' }} aria-current={page === index ? 'page' : undefined}>{page + 1}</a>)}
    </nav>
    {selected ? <>
      <button type="button" onClick={() => setSelected(undefined)}>Return to overview</button>
      <h2>{originalModels[selected].label}</h2>
      <ModelDetail key={selected} id={selected} />
    </> : <>
      <div style={{ height: 580 }}>
        <Canvas orthographic camera={{ position: [0, 22, 12], zoom: 36, far: 120 }} dpr={1}><Gallery /></Canvas>
      </div>
      <ol start={index * perPage + 1} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
        {modelIds.map(id => <li key={id}><button type="button" onClick={() => setSelected(id)}>{originalModels[id].label}</button></li>)}
      </ol>
      <output id={canvasId} data-expected={expected}>{modelIds.length} original models</output>
    </>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<ModelGallery />);
