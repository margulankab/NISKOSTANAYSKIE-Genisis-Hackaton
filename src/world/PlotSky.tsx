import { useEffect, useMemo } from 'react';
import { BackSide, Color, Float32BufferAttribute, SphereGeometry } from 'three';
import type { WorldAtmosphere } from '../scene/WorldScenery';
import type { PlotMoment } from './plot-schema';
import type { SceneDirection } from './scene-direction';

const palettes: Record<WorldAtmosphere, readonly [string, string]> = {
  daylight: ['#cbdcc6', '#80aaa8'], dawn: ['#f2d2ad', '#7f8fa6'], dusk: ['#d79778', '#5c536e'],
  rain: ['#a3b2bc', '#626f85'], snow: ['#e2e8e5', '#a2b7cc'], fog: ['#b1c1b7', '#6f8785'], night: ['#4a596b', '#1f263d'],
};

export function PlotSky({ atmosphere, mood, palette, shoreSide }: {
  atmosphere: WorldAtmosphere; mood: PlotMoment['mood']; palette?: SceneDirection['palette']; shoreSide?: number;
}) {
  const sunset = atmosphere === 'dawn' || atmosphere === 'dusk';
  const geometry = useMemo(() => {
    const mesh = new SphereGeometry(168, 40, 24);
    const [low, high] = (palette ? [palette.horizon, palette.sky] : palettes[atmosphere]).map(color => new Color(color));
    const sombre = mood === 'subdued' || mood === 'tense';
    if (sombre && !palette) low.lerp(new Color('#9aa9b9'), .47);
    const sunset = new Color('#f7c29e');
    const vertices = mesh.attributes.position;
    const colors: number[] = [];
    for (let index = 0; index < vertices.count; index++) {
      const elevation = Math.max(0, vertices.getY(index) / 168);
      const azimuth = Math.max(0, (shoreSide ? shoreSide * .87 : -.55) * vertices.getX(index) / 168
        - (shoreSide ? .46 : .78) * vertices.getZ(index) / 168);
      const paint = low.clone().lerp(high, Math.min(1, (elevation * 2.7) ** .68));
      const glow = palette ? Math.min(1, elevation * 11) : 1;
      if (atmosphere === 'dawn' || atmosphere === 'dusk') paint.lerp(sunset, (sombre ? .13 : .47) * glow * azimuth ** 4 * Math.exp(-8 * elevation));
      colors.push(paint.r, paint.g, paint.b);
    }
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return mesh;
  }, [atmosphere, mood, palette, shoreSide]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
    {palette && sunset && <mesh position={[shoreSide ? shoreSide * 92 : -58, 7.5, shoreSide ? -49 : -82]} renderOrder={-9}>
      <sphereGeometry args={[3.1, 18, 12]} />
      <meshBasicMaterial color={palette.light} toneMapped={false} fog={false} />
    </mesh>}
  </>;
}
