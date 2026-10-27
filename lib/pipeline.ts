/* The geometry of a chapter's pipeline drawing (app/components/pages/Pipeline.tsx): n boxes in `cols` columns that snake
   (left to right, then right to left on the next row, so every arrow is short), one arrow from each box to the next.
   Pure numbers, tested in tests/pipeline.test.mjs: no box overlaps another, every arrow joins two neighbours. */
export type PipelineBox = { x: number; y: number; w: number; h: number };
export type PipelineArrow = { from: number; x1: number; y1: number; x2: number; y2: number; head: string };
export type PipelineLayout = { boxes: PipelineBox[]; arrows: PipelineArrow[]; viewWidth: number; viewHeight: number };

const HEAD = 7;

function head(x: number, y: number, dx: number, dy: number): string {
  /* A small triangle whose tip is (x, y), pointing along (dx, dy), one of the four axes. */
  const px = -dy;
  const py = dx;
  const bx = x - dx * HEAD;
  const by = y - dy * HEAD;
  return `${x},${y} ${bx + px * (HEAD / 2)},${by + py * (HEAD / 2)} ${bx - px * (HEAD / 2)},${by - py * (HEAD / 2)}`;
}

function arrowBetween(from: number, a: PipelineBox, b: PipelineBox): PipelineArrow {
  if (a.y === b.y) {
    const right = b.x > a.x;
    const x1 = right ? a.x + a.w : a.x;
    const x2 = right ? b.x - 2 : b.x + b.w + 2;
    const y = a.y + a.h / 2;
    return { from, x1, y1: y, x2, y2: y, head: head(x2, y, right ? 1 : -1, 0) };
  }
  const x = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const y2 = b.y - 2;
  return { from, x1: x, y1, x2: x, y2, head: head(x, y2, 0, 1) };
}

export function pipelineLayout(n: number, { cols, width, height = 60, gapX = 40, gapY = 36, pad = 4 }: { cols: number; width: number; height?: number; gapX?: number; gapY?: number; pad?: number }): PipelineLayout {
  const c = Math.max(1, Math.min(cols, n));
  const rows = Math.ceil(n / c);
  const boxes: PipelineBox[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / c);
    const col = row % 2 === 0 ? i % c : c - 1 - (i % c);
    boxes.push({ x: pad + col * (width + gapX), y: pad + row * (height + gapY), w: width, h: height });
  }
  const arrows: PipelineArrow[] = [];
  for (let i = 0; i + 1 < n; i++) arrows.push(arrowBetween(i, boxes[i], boxes[i + 1]));
  return { boxes, arrows, viewWidth: 2 * pad + c * width + (c - 1) * gapX, viewHeight: 2 * pad + rows * height + (rows - 1) * gapY };
}
