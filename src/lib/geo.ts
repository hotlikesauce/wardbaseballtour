import type { LatLng } from '../data/journey';

const R_MILES = 3959;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return R_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pathLength(pts: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i]);
  return total;
}

/** Points along the great circle between a and b, as [lat, lng]. */
export function greatCircle(a: LatLng, b: LatLng, n = 64): LatLng[] {
  const [p1, l1, p2, l2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
  const d =
    2 * Math.asin(Math.sqrt(Math.sin((p1 - p2) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l1 - l2) / 2) ** 2));
  if (d < 1e-6) return [a, b];
  const out: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([deg(Math.atan2(z, Math.sqrt(x * x + y * y))), deg(Math.atan2(y, x))]);
  }
  return out;
}

/** Douglas–Peucker in degree space; plenty for drawing a road at continental zooms. */
export function simplify(pts: LatLng[], tolerance: number): LatLng[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [ay, ax] = pts[s];
    const [by, bx] = pts[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const [py, px] = pts[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const qx = ax + t * dx - px;
      const qy = ay + t * dy - py;
      const d2 = qx * qx + qy * qy;
      if (d2 > maxD) {
        maxD = d2;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

export const roadKey = (from: LatLng, to: LatLng) => `${from[0]},${from[1]}-${to[0]},${to[1]}`;

export const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
