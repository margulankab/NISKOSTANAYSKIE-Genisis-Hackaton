import { useEffect, useMemo } from 'react';
import { Color, Float32BufferAttribute, PlaneGeometry } from 'three';
import type { WorldLayout } from './layout-schema';

export function hasPlotRelief({ plot, profile, indoor, water, drySurfaces }: WorldLayout) {
  return !!plot && !indoor && !water && !drySurfaces && ['park', 'woodland', 'rural', 'fantasy'].includes(profile ?? '');
}

export function groundHeight(layout: WorldLayout, x: number, z: number) {
  if (!hasPlotRelief(layout)) return 0;
  const { minX, maxX, minZ, maxZ } = layout.bounds;
  const width = maxX - minX, depth = maxZ - minZ;
  const u = Math.max(0, Math.min(1, (x - minX) / width));
  const v = Math.max(0, Math.min(1, (z - minZ) / depth));
  return (Math.sin(Math.PI * u) * Math.sin(Math.PI * v)) ** 2 * (.45 + .36 * Math.sin(6 * u + 8 * v));
}

export function PlotTerrain({ layout, color }: { layout: WorldLayout; color: string }) {
  const geometry = useMemo(() => {
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const mesh = new PlaneGeometry(maxX - minX, maxZ - minZ, 40, 40).rotateX(-Math.PI / 2);
    mesh.translate((maxX + minX) / 2, 0, (maxZ + minZ) / 2);
    const vertices = mesh.attributes.position;
    const colors: number[] = [];
    const paint = new Color();
    for (let index = 0; index < vertices.count; index++) {
      const x = vertices.getX(index), z = vertices.getZ(index);
      vertices.setY(index, groundHeight(layout, x, z));
      paint.set(color).multiplyScalar(.88 + .11 * Math.sin(x * .38 + z * .62) + .08 * Math.cos(z * .4));
      colors.push(paint.r, paint.g, paint.b);
    }
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3));
    mesh.computeVertexNormals();
    return mesh;
  }, [color, layout]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={.96} flatShading /></mesh>;
}
