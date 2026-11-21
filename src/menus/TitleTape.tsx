/** Decorative cassette for the title screen, coloured by the current atmosphere. Shows the latest save's title. */
export function TitleTape({ label }: { label: string }) {
  return (
    <figure className="title-tape" aria-hidden="true">
      <svg viewBox="0 0 320 200" focusable="false" shapeRendering="crispEdges">
        <rect className="tape-shell" width="320" height="200" />
        {[[10, 10], [302, 10], [10, 182], [302, 182]].map(([x, y]) => <rect key={x + '-' + y} className="tape-screw" x={x} y={y} width="8" height="8" />)}
        <rect className="tape-label" x="18" y="16" width="284" height="122" />
        <rect className="tape-stripe-a" x="18" y="112" width="95" height="10" />
        <rect className="tape-stripe-b" x="113" y="112" width="95" height="10" />
        <rect className="tape-stripe-c" x="208" y="112" width="94" height="10" />
        <rect className="tape-window" x="92" y="64" width="136" height="40" />
        {[120, 200].map((cx) => (
          <g key={cx}>
            <rect className="tape-reel" x={cx - 14} y="70" width="28" height="28" />
            <rect className="tape-hub" x={cx - 5} y="79" width="10" height="10" />
          </g>
        ))}
        <path className="tape-foot" d="M72 200 L92 156 H228 L248 200 Z" />
      </svg>
      <figcaption className="title-tape-label">{label}</figcaption>
    </figure>
  );
}
