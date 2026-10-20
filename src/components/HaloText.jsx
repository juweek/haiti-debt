import { useLayoutEffect, useRef, useState } from 'react';

/** SVG text with a solid backing rect, so cursor and rule lines never run through it. */
export default function HaloText({ children, pad = 3, fill = 'var(--bg)', ...props }) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const b = ref.current?.getBBox();
    if (b && (!box || b.x !== box.x || b.y !== box.y || b.width !== box.width || b.height !== box.height)) setBox({ x: b.x, y: b.y, width: b.width, height: b.height });
  });
  return (
    <g>
      {box && <rect x={box.x - pad} y={box.y - pad + 1} width={box.width + pad * 2} height={box.height + pad * 2 - 2} rx={2} fill={fill} />}
      <text ref={ref} {...props}>{children}</text>
    </g>
  );
}
