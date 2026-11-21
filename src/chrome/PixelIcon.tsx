/** 8×8 pixel icons drawn from strings; '#' is a filled pixel. Decorative only. */
const icons = {
  play: ['........', '.##.....', '.####...', '.######.', '.######.', '.####...', '.##.....', '........'],
  tape: ['........', '########', '#......#', '#.#..#.#', '#......#', '########', '.#....#.', '........'],
  folder: ['........', '###.....', '#..####.', '#......#', '#......#', '#......#', '########', '........'],
  frames: ['########', '#..#...#', '#..#...#', '########', '#...#..#', '#...#..#', '########', '........'],
  gear: ['...##...', '.#.##.#.', '..####..', '###..###', '###..###', '..####..', '.#.##.#.', '...##...'],
  song: ['....###.', '....#.#.', '....#...', '....#...', '..###...', '.####...', '.###....', '........'],
} as const;
export type PixelIconName = keyof typeof icons;

export function PixelIcon({ name }: { name: PixelIconName }) {
  const rows = icons[name];
  return (
    <svg viewBox="0 0 8 8" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {rows.flatMap((row, y) => [...row].map((cell, x) => cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null))}
    </svg>
  );
}
