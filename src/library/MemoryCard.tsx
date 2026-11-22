import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

export interface LibraryItem {
  id: string;
  kind: 'world' | 'day' | 'example';
  title: string;
  href: string;
  /** Date, saved progress or mood: one short line under the title. */
  meta: string;
  /** A photo (example image or the day's thumbnail); worlds without one get drawn art. */
  image?: string | Blob;
  timeOfDay?: string;
  weather?: string;
  palette?: readonly (readonly number[])[];
}

/** A stable 0–1 sequence from a string, so a world always gets the same drawing. */
function seeded(text: string) {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

const skies: Record<string, [string, string, string]> = {
  dawn: ['#f3c9a7', '#e9a88f', '#ffe7b8'], day: ['#bfe0d3', '#86c3b6', '#fff6d8'],
  dusk: ['#5a4570', '#e49a76', '#ffcf8a'], night: ['#1b1e3a', '#2b3157', '#efe9d5'],
};

/** Hand-drawn style postcard of a world: sky, sun or moon, three inked hill lines and a few pines. */
export function WorldArt({ seed, timeOfDay = 'day', weather }: { seed: string; timeOfDay?: string; weather?: string }) {
  const art = useMemo(() => {
    const next = seeded(seed);
    const hills = [0, 1, 2].map((layer) => {
      const base = 52 + layer * 14;
      const points = Array.from({ length: 7 }, (_, i) => `${i * 27},${base - next() * (18 - layer * 4)}`);
      return `M0,100 L${points.join(' L')} L162,100 Z`;
    });
    const trees = Array.from({ length: 5 }, () => ({ x: 10 + next() * 140, y: 70 + next() * 16, h: 10 + next() * 9 }));
    return { hills, trees, sunX: 26 + next() * 108 };
  }, [seed]);
  const [top, bottom, body] = skies[timeOfDay] ?? skies.day;
  const ground = timeOfDay === 'night' ? ['#334a4a', '#283a3c', '#1d2c2e'] : timeOfDay === 'dusk' ? ['#8d7d8f', '#6f6880', '#4f4d66'] : ['#a9c79a', '#87ad7a', '#6a945f'];
  const id = 'sky' + seed.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  return (
    <svg className="world-art" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
      </defs>
      <rect width="160" height="100" fill={`url(#${id})`} />
      {timeOfDay === 'night' && [12, 40, 66, 98, 131, 150, 22, 85, 118].map((x, i) => <circle key={i} cx={x} cy={8 + ((i * 37) % 30)} r=".7" fill="#fffbe8" />)}
      <circle className="world-art-sun" cx={art.sunX} cy={timeOfDay === 'dusk' || timeOfDay === 'dawn' ? 44 : 24} r={timeOfDay === 'night' ? 6 : 9} fill={body} />
      {art.hills.map((d, i) => <path key={i} d={d} fill={ground[i]} stroke="#1d3134" strokeWidth=".9" strokeLinejoin="round" />)}
      {art.trees.map(({ x, y, h }, i) => (
        <path key={i} d={`M${x},${y} l${-h * 0.32},0 l${h * 0.32},${-h} l${h * 0.32},${h} z`} fill={ground[2]} stroke="#1d3134" strokeWidth=".8" strokeLinejoin="round" />
      ))}
      {(weather === 'rain' || weather === 'snow' || weather === 'fog') && <rect width="160" height="100" fill="#dfe8e6" opacity={weather === 'fog' ? 0.38 : 0.18} />}
      {/* Hatching across the lowest hill, like pen shading. */}
      <path d="M0,96 l12,-12 M10,99 l14,-14 M22,99 l14,-14 M34,99 l14,-14" stroke="#1d3134" strokeWidth=".5" opacity=".45" />
    </svg>
  );
}

function useImageUrl(image: string | Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!image) { setUrl(undefined); return; }
    if (typeof image === 'string') { setUrl(image); return; }
    const created = URL.createObjectURL(image);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [image]);
  return url;
}

const kindLabel = { world: 'World', day: 'Day', example: 'Example' } as const;

/** Postcard for one memory. Tilts toward the pointer; opens the memory on click. */
export function MemoryCard({ item, index, label }: { item: LibraryItem; index: number; label: (text: string) => string }) {
  const url = useImageUrl(item.image);
  const [failed, setFailed] = useState(false);
  function tilt(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--rx', `${((event.clientY - box.top) / box.height - 0.5) * -8}deg`);
    event.currentTarget.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 10}deg`);
    event.currentTarget.style.setProperty('--gx', `${((event.clientX - box.left) / box.width) * 100}%`);
  }
  function reset(event: PointerEvent<HTMLAnchorElement>) {
    event.currentTarget.style.removeProperty('--rx');
    event.currentTarget.style.removeProperty('--ry');
  }
  return (
    <li className={`memory-card memory-card-${item.kind}`} style={{ '--i': index } as CSSProperties}>
      <a href={item.href} onPointerMove={tilt} onPointerLeave={reset}>
        <span className="memory-card-art">
          {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
            : <WorldArt seed={item.id} timeOfDay={item.timeOfDay} weather={item.weather} />}
          <span className="memory-card-kind">{label(kindLabel[item.kind])}</span>
        </span>
        <span className="memory-card-text">
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
        </span>
      </a>
    </li>
  );
}
