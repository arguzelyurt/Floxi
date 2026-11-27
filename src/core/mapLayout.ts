// Hareketli harita ("Ray Adaları") için yerleşim hesapları. React'tan bağımsız, testli.
// Genel harita: adalar zikzak dizilir, ray ada merkezlerinden geçen eğrilerdir.
// Harita içi: seviyeler yılan düzeninde duraklardır (bir sıra soldan sağa, sonraki sağdan sola).

export interface Pt {
  x: number;
  y: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Bir parçayı ince adımlarla noktalara böler (ilk nokta dahil değil). */
export type Seg = { kind: 'line'; to: Pt } | { kind: 'cubic'; c1: Pt; c2: Pt; to: Pt };

export function flatten(start: Pt, segs: Seg[], step = 4): Pt[] {
  const out: Pt[] = [start];
  let cur = start;
  for (const s of segs) {
    if (s.kind === 'line') {
      const len = Math.hypot(s.to.x - cur.x, s.to.y - cur.y);
      const n = Math.max(1, Math.ceil(len / step));
      for (let i = 1; i <= n; i++) out.push({ x: lerp(cur.x, s.to.x, i / n), y: lerp(cur.y, s.to.y, i / n) });
    } else {
      const n = 40;
      for (let i = 1; i <= n; i++) out.push(cubicAt(cur, s.c1, s.c2, s.to, i / n));
    }
    cur = s.to;
  }
  return out;
}

export function pathLength(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return l;
}

/** Yolu eşit aralıklı `count` noktaya indirger (animasyon ara değerleri için). */
export function resample(pts: Pt[], count: number): Pt[] {
  if (pts.length < 2 || count < 2) return pts.slice(0, Math.max(1, count));
  const total = pathLength(pts);
  const out: Pt[] = [pts[0]];
  let seg = 1;
  let acc = 0;
  for (let k = 1; k < count - 1; k++) {
    const target = (total * k) / (count - 1);
    while (seg < pts.length - 1) {
      const d = Math.hypot(pts[seg].x - pts[seg - 1].x, pts[seg].y - pts[seg - 1].y);
      if (acc + d >= target) break;
      acc += d;
      seg++;
    }
    const a = pts[seg - 1];
    const b = pts[seg];
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = Math.min(1, Math.max(0, (target - acc) / d));
    out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Yolun bir noktaya en yakın yerine kadar olan kısmı */
export function pathUntil(pts: Pt[], target: Pt): Pt[] {
  let best = 0;
  let bd = Infinity;
  pts.forEach((p, i) => {
    const d = Math.hypot(p.x - target.x, p.y - target.y);
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  return pts.slice(0, best + 1);
}

/** Dikey bağlantı eğrisi: a'dan b'ye, uçlarda dikey teğetli */
function vcurve(a: Pt, b: Pt): Seg {
  const dy = (b.y - a.y) / 2;
  return { kind: 'cubic', c1: { x: a.x, y: a.y + dy }, c2: { x: b.x, y: b.y - dy }, to: b };
}

// ---------- Genel harita ----------

export const OVERVIEW = { top: 70, step: 150, bottom: 140 };

/** Ada merkezleri: sol-sağ zikzak */
export function islandCenters(width: number, count: number): Pt[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(width * (i % 2 === 0 ? 0.28 : 0.72)),
    y: OVERVIEW.top + i * OVERVIEW.step,
  }));
}

export const overviewHeight = (count: number) => OVERVIEW.top + (count - 1) * OVERVIEW.step + OVERVIEW.bottom;

/** Ray: ada merkezlerini sırayla birleştirir */
export function overviewRail(centers: Pt[]): Pt[] {
  if (centers.length === 0) return [];
  return flatten(centers[0], centers.slice(1).map((c, i) => vcurve(centers[i], c)));
}

// ---------- Harita içi ----------

export const STATIONS = { cols: 4, top: 70, row: 116, side: 0.13, bottom: 120 };

export interface StationLayout {
  stations: Pt[];
  /** Rayın sonundaki ödül sandığı */
  chest: Pt;
  rail: Pt[];
  height: number;
}

/** n durak için yılan düzeni. Ray, ilk durağın solundan başlar, sandıkta biter. */
export function stationLayout(width: number, n: number): StationLayout {
  const { cols, top, row, side, bottom } = STATIONS;
  const left = width * side;
  const right = width * (1 - side);
  const xs = Array.from({ length: cols }, (_, k) => lerp(left, right, k / (cols - 1)));
  const stations: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const k = i % cols;
    stations.push({ x: Math.round(r % 2 === 0 ? xs[k] : xs[cols - 1 - k]), y: top + r * row });
  }
  // Sandık: son durağın ardından aynı sıra yönünde bir adım; sıra doluysa alt sıraya
  const lastRow = Math.floor((n - 1) / cols);
  const lastK = (n - 1) % cols;
  const dir = lastRow % 2 === 0 ? 1 : -1;
  const slot = (right - left) / (cols - 1);
  const chest =
    lastK < cols - 1
      ? { x: Math.round(stations[n - 1].x + dir * slot), y: stations[n - 1].y }
      : { x: Math.round(lastRow % 2 === 0 ? right : left), y: top + (lastRow + 1) * row };

  const pts = [...stations, chest];
  const start: Pt = { x: Math.max(8, left - slot * 0.6), y: top };
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = i === 0 ? start : pts[i - 1];
    const p = pts[i];
    if (prev.y === p.y) segs.push({ kind: 'line', to: p });
    else {
      // Sıra değişimi: kenarda yarım halka gibi dönüş
      const out = prev.x > width / 2 ? 1 : -1;
      const bulge = Math.min(slot * 0.55, width * side * 0.9);
      segs.push({
        kind: 'cubic',
        c1: { x: prev.x + out * bulge, y: prev.y },
        c2: { x: p.x + out * bulge, y: p.y },
        to: p,
      });
    }
  }
  const height = Math.max(chest.y, stations[n - 1].y) + bottom;
  return { stations, chest, rail: flatten(start, segs), height };
}
