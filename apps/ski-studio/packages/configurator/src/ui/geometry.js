// Ski outline geometry shared by the stage, gallery swatches and technical drawing.

// Closed Catmull-Rom spline through points, as cubic Bézier segments.
export function smoothClosedPath(input) {
  const points = input.filter((p, i) => {
    const q = input[(i - 1 + input.length) % input.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.01;
  });
  const n = points.length;
  const at = i => points[(i + n) % n];
  let d = `M ${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d} Z`;
}

const round = value => Math.round(value * 100) / 100;

// A traced outline: {left: [[v, x]], right: [[v, x]]} with v (0 tip → 1 tail)
// and x (0 → 1 across the ski's widest point). Returns an SVG path in a W × L box.
export function profilePath(profile, width, length, {x0 = 0, y0 = 0} = {}) {
  const map = ([v, x]) => [x0 + x * width, y0 + v * length];
  return smoothClosedPath([...profile.right.map(map), ...[...profile.left].reverse().map(map)]);
}

// Horizontal planform (tip on the left) from a traced outline, for the technical drawing.
// Rotated, not mirrored: the ski's left edge ends up at the bottom, as its artwork does.
export function planformFromProfile(profile, x0, length, cy, maxWidth) {
  const map = ([v, x]) => [x0 + v * length, cy + (0.5 - x) * maxWidth];
  const top = profile.left.map(map);
  const bottom = [...profile.right].reverse().map(map);
  return smoothClosedPath([...top, ...bottom]);
}

// Width of a traced outline at a point along its length, 0–1 of the widest point.
export function profileWidthAt(profile, v) {
  const sample = edge => {
    const i = edge.findIndex(([pv]) => pv >= v);
    if (i <= 0) return edge[Math.max(i, 0)][1];
    const [v0, x0] = edge[i - 1];
    const [v1, x1] = edge[i];
    return x0 + ((x1 - x0) * (v - v0)) / (v1 - v0 || 1);
  };
  return Math.abs(sample(profile.right) - sample(profile.left));
}

// Parametric planform when no traced outline exists (tip on the left).
export function parametricPlanform(x0, length, cy, half, xWaist, {tipAt = 0.12, tailAt = 0.91} = {}) {
  const xTip = x0 + tipAt * length;
  const xTail = x0 + tailAt * length;
  const edge = sign => {
    const t = cy + sign * half.tip;
    const w = cy + sign * half.waist;
    const a = cy + sign * half.tail;
    return {
      down: [
        `C ${x0} ${cy + sign * half.tip * 0.72} ${x0 + 0.045 * length} ${t} ${xTip} ${t}`,
        `C ${xTip + (xWaist - xTip) * 0.45} ${t} ${xWaist - (xWaist - xTip) * 0.35} ${w} ${xWaist} ${w}`,
        `C ${xWaist + (xTail - xWaist) * 0.35} ${w} ${xTail - (xTail - xWaist) * 0.45} ${a} ${xTail} ${a}`,
        `C ${x0 + 0.965 * length} ${a} ${x0 + length} ${cy + sign * half.tail * 0.7} ${x0 + length} ${cy}`,
      ],
      up: [
        `C ${x0 + length} ${cy + sign * half.tail * 0.7} ${x0 + 0.965 * length} ${a} ${xTail} ${a}`,
        `C ${xTail - (xTail - xWaist) * 0.45} ${a} ${xWaist + (xTail - xWaist) * 0.35} ${w} ${xWaist} ${w}`,
        `C ${xWaist - (xWaist - xTip) * 0.35} ${w} ${xTip + (xWaist - xTip) * 0.45} ${t} ${xTip} ${t}`,
        `C ${x0 + 0.045 * length} ${t} ${x0} ${cy + sign * half.tip * 0.72} ${x0} ${cy}`,
      ],
    };
  };
  return {d: [`M ${x0} ${cy}`, ...edge(-1).down, ...edge(1).up, 'Z'].join(' '), xTip, xTail};
}
