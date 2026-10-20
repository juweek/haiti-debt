// Greedy row packing for event labels so they never overlap.
// Each label is start-anchored right of its tick, or end-anchored left of it
// if it would run past the right edge. Returns labels with {x, row, anchor}.
export function layoutLabels(items, xScale, width, { charW = 6.4, pad = 6, gap = 6, maxRows = 6 } = {}) {
  const rows = []; // rows[r] = [[left,right], ...]
  return items.map((it) => {
    const px = xScale(it.year);
    const w = it.text.length * charW + pad;
    let anchor = 'start';
    let left = px + 3;
    if (left + w > width) { anchor = 'end'; left = px - 3 - w; }
    if (left < 0) { anchor = 'start'; left = 0; }
    const right = left + w;
    let row = rows.findIndex((iv) => iv.every(([l, r]) => right + gap <= l || left >= r + gap));
    if (row === -1) { row = Math.min(rows.length, maxRows - 1); rows[row] = rows[row] || []; }
    rows[row].push([left, right]);
    return { ...it, px, row, anchor, tx: anchor === 'start' ? px + 3 : px - 3 };
  });
}
export const rowCount = (laid) => (laid.length ? Math.max(...laid.map((l) => l.row)) + 1 : 0);
