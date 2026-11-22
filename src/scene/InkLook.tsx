import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Color, DataTexture, DepthTexture, HalfFloatType, Mesh, MeshStandardMaterial, MeshToonMaterial, NearestFilter,
  OrthographicCamera, PlaneGeometry, RedFormat, Scene, ShaderMaterial, UnsignedByteType, Vector2, WebGLRenderTarget,
} from 'three';
import type { Material, Object3D } from 'three';
import { useInk, useTuning } from '../chrome/use-view';

/**
 * "Ink" look: flat toon bands plus a screen pass that inks silhouettes and colour edges
 * and hatches shadows. Everything is deterministic, so a world at
 * rest renders the same frame after frame.
 */

/** Three flat light bands: shade, mid-tone, lit. */
function toonRamp() {
  const texture = new DataTexture(new Uint8Array([96, 178, 255]), 3, 1, RedFormat, UnsignedByteType);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

interface Swap { mesh: Mesh; original: MeshStandardMaterial; toon: MeshToonMaterial }

function toToon(original: MeshStandardMaterial, ramp: DataTexture) {
  const toon = new MeshToonMaterial({
    color: original.color, map: original.map, emissive: original.emissive, emissiveIntensity: original.emissiveIntensity,
    emissiveMap: original.emissiveMap, transparent: original.transparent, opacity: original.opacity,
    vertexColors: original.vertexColors, side: original.side, alphaTest: original.alphaTest, fog: original.fog,
    depthWrite: original.depthWrite, gradientMap: ramp,
  });
  // Toon shaders honour flat shading at runtime (FLAT_SHADED), though the type omits it.
  (toon as MeshToonMaterial & { flatShading: boolean }).flatShading = true;
  toon.name = 'ink:' + original.name;
  return toon;
}

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragmentShader = /* glsl */`
  #include <common>
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform vec2 texel;
  uniform float cameraNear;
  uniform float cameraFar;
  uniform vec3 ink;
  uniform float fadeNear;
  uniform float fadeFar;
  varying vec2 vUv;

  float linearDepth(vec2 uv) {
    float z = texture2D(tDepth, uv).x;
    if (z >= 1.0) return cameraFar;
    float ndc = z * 2.0 - 1.0;
    return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - ndc * (cameraFar - cameraNear));
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec4 base = texture2D(tColor, vUv);
    float d = linearDepth(vUv);
    vec2 o = texel;
    // Silhouettes: depth jumps relative to distance (a cross of four neighbours).
    float dl = linearDepth(vUv - vec2(o.x, 0.0)), dr = linearDepth(vUv + vec2(o.x, 0.0));
    float du = linearDepth(vUv + vec2(0.0, o.y)), dd = linearDepth(vUv - vec2(0.0, o.y));
    float depthEdge = (abs(dl - d) + abs(dr - d) + abs(du - d) + abs(dd - d)) / max(d, 0.5);
    depthEdge = smoothstep(0.09, 0.22, depthEdge);
    // Inner lines: colour changes between flat faces and parts.
    vec3 cl = texture2D(tColor, vUv - vec2(o.x, 0.0)).rgb, cr = texture2D(tColor, vUv + vec2(o.x, 0.0)).rgb;
    vec3 cu = texture2D(tColor, vUv + vec2(0.0, o.y)).rgb, cd = texture2D(tColor, vUv - vec2(0.0, o.y)).rgb;
    float colorEdge = length(cr - cl) + length(cu - cd);
    colorEdge = smoothstep(0.16, 0.34, colorEdge);
    bool sky = d >= cameraFar * 0.999;
    float distanceFade = 1.0 - 0.75 * smoothstep(fadeNear, fadeFar, d);
    float line = sky ? 0.0 : max(depthEdge, colorEdge * 0.75) * distanceFade;

    vec3 color = base.rgb;
    // Soft pastel lift, as if printed on warm paper.
    color = color * 0.9 + vec3(0.05, 0.05, 0.04);
    // Diagonal hatching in the darkest band, fixed to the screen like pen strokes.
    float shade = 1.0 - smoothstep(0.05, 0.16, luma(color));
    float stroke = step(0.72, fract((gl_FragCoord.x + gl_FragCoord.y) / 5.0));
    color = mix(color, color * 0.62, sky ? 0.0 : shade * stroke * distanceFade);
    gl_FragColor = vec4(mix(color, ink * (0.35 + 0.65 * color), line * 0.92), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function InkLook({ ink = '#1d3134', fade = [18, 60], weight = 'medium' }: {
  /** Outline weight from Settings. */
  weight?: 'fine' | 'medium' | 'bold';
  /** Line colour: a dark teal ink rather than black. */
  ink?: string;
  /** Lines fade to a lighter weight between these distances, like aerial perspective. */
  fade?: readonly [number, number];
}) {
  const { gl, scene, camera, size } = useThree();
  const dpr = useThree((state) => state.viewport.dpr);
  const ramp = useMemo(toonRamp, []);
  const target = useMemo(() => {
    const rt = new WebGLRenderTarget(2, 2, { type: HalfFloatType, depthBuffer: true });
    rt.depthTexture = new DepthTexture(2, 2);
    return rt;
  }, []);
  const pass = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader, fragmentShader, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: target.texture }, tDepth: { value: target.depthTexture }, texel: { value: new Vector2() },
        cameraNear: { value: 0.1 }, cameraFar: { value: 1000 }, ink: { value: new Color() },
        fadeNear: { value: fade[0] }, fadeFar: { value: fade[1] },
      },
    });
    material.toneMapped = true;
    const quad = new Mesh(new PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const quadScene = new Scene();
    quadScene.add(quad);
    return { material, quadScene, quadCamera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [target, fade]);
  const swaps = useMemo(() => new Map<Mesh, Swap>(), []);

  useEffect(() => { pass.material.uniforms.ink.value.set(ink).convertSRGBToLinear(); }, [ink, pass]);

  useEffect(() => {
    const buffer = gl.getDrawingBufferSize(new Vector2());
    target.setSize(buffer.x, buffer.y);
    // Lines about 1.6 px wide on a 1,000 px view, scaling with resolution so they read as pen strokes.
    const scale = weight === 'fine' ? 0.65 : weight === 'bold' ? 1.6 : 1;
    const width = Math.max(1, Math.min(4, (buffer.x / 640) * scale));
    pass.material.uniforms.texel.value.set(width / buffer.x, width / buffer.y);
  }, [gl, size, dpr, target, pass, weight]);

  // Put the original materials back when the look is switched off or the world closes.
  useEffect(() => () => {
    for (const { mesh, original, toon } of swaps.values()) {
      if (mesh.material === toon) mesh.material = original;
      toon.dispose();
    }
    swaps.clear();
  }, [swaps]);
  useEffect(() => () => { target.dispose(); pass.material.dispose(); ramp.dispose(); }, [target, pass, ramp]);

  useFrame(() => {
    // Swap new lit materials for toon twins, and keep twins in step with animated originals.
    scene.traverse((object: Object3D) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as Material;
      const known = swaps.get(mesh);
      if (known && material === known.toon) return;
      if (!(material instanceof MeshStandardMaterial)) return;
      known?.toon.dispose();
      const toon = toToon(material, ramp);
      swaps.set(mesh, { mesh, original: material, toon });
      mesh.material = toon;
    });
    for (const [mesh, { original, toon }] of swaps) {
      if (!mesh.parent) { toon.dispose(); swaps.delete(mesh); continue; }
      toon.color.copy(original.color);
      toon.emissive.copy(original.emissive);
      toon.emissiveIntensity = original.emissiveIntensity;
      toon.opacity = original.opacity;
      toon.visible = original.visible;
      if (toon.map !== original.map) { toon.map = original.map; toon.needsUpdate = true; }
    }
    const perspective = camera as { near?: number; far?: number };
    pass.material.uniforms.cameraNear.value = perspective.near ?? 0.1;
    pass.material.uniforms.cameraFar.value = perspective.far ?? 1000;
    gl.setRenderTarget(target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(pass.quadScene, pass.quadCamera);
  }, 1);

  return null;
}

/** The ink look when Settings has it on (the default). */
export function InkFromSettings() {
  const { inkWeight } = useTuning();
  return useInk() ? <InkLook weight={inkWeight} /> : null;
}
