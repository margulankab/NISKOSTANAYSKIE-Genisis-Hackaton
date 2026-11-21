import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Point } from '../gameplay/layout';

export function WorldPhotoFrame({ url, from, toward }: { url: string; from: Point; toward: Point }) {
  const [photo, setPhoto] = useState<{ url: string; map: CanvasTexture; width: number; height: number }>();
  useEffect(() => {
    let active = true;
    let map: CanvasTexture | undefined;
    const image = new Image();
    image.onload = () => {
      if (!active || !image.naturalWidth || !image.naturalHeight) return;
      const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      map = new CanvasTexture(canvas);
      map.colorSpace = SRGBColorSpace;
      const longest = Math.max(canvas.width, canvas.height);
      setPhoto({ url, map, width: canvas.width / longest * .91, height: canvas.height / longest * .91 });
    };
    image.src = url;
    return () => { active = false; image.onload = null; map?.dispose(); };
  }, [url]);
  if (!photo || photo.url !== url) return null;
  const dx = from.x - toward.x, dz = from.z - toward.z;
  const yaw = Math.hypot(dx, dz) > .05 ? Math.atan2(dx, dz) : 0;
  return <group position={[toward.x + dx * .34, .93, toward.z + dz * .34]} rotation={[0, yaw, 0]}>
    <mesh position={[0, -.53, 0]}><boxGeometry args={[.085, .8, .11]} /><meshStandardMaterial color="#826447" /></mesh>
    <mesh><boxGeometry args={[photo.width + .1, photo.height + .1, .074]} /><meshStandardMaterial color="#986b49" /></mesh>
    <mesh position={[0, 0, .04]}><planeGeometry args={[photo.width, photo.height]} /><meshBasicMaterial map={photo.map} toneMapped={false} /></mesh>
  </group>;
}
