// Tohumlu seviye üretici.
//
// Çözülebilirlik garantisi: resim önce "çözülerek" flox dizisi çıkarılır. Her adımda görünür
// bir renk seçilir, o renkte bir flox tam tur attırılır ve şarjı tam olarak sildiği piksel
// sayısına eşitlenir. Bu dizi şeritlere sırası bozulmadan dağıtıldığı için, diziyi sırayla
// oynamak her zaman rıhtıma hiç park etmeden (3 yıldız) çözer.
// Zorluk; resmin katmanlı olması (iç renkler dışarıdan görünmez), renk sayısı ve rıhtım
// büyüklüğüyle ayarlanır. Zor seviyelerde rıhtımda bir yer eksik.

import { PICTURES, Picture } from './pictures';
import { applyMove, Cell, EMPTY, Flox, initialState, Level, legalMoves, Lock, reveal, runLoop } from './rules';
import { hashSeed, mulberry32, pick, randInt, Rng, shuffle } from './rng';
import { solve } from './solver';

export const PALETTE_SIZE = 8; // rastgele resimlerde kullanılan renk sayısı üst sınırı

export interface Difficulty {
  size: number;
  colors: number;
  lanes: number;
  dockSize: number;
  charges: number[];
  /** İç renkler dış katmanların altında (gerçek zorluk buradan gelir) */
  layered: boolean;
  hard: boolean;
  /** İçerideki (başta görünmeyen) piksellerin gizlenme oranı */
  hiddenFrac: number;
  /** Kilitli şerit sayısı */
  lockedLanes: number;
  /** Şerit sıraları karıştırılır (çözücü doğrular): oyuncunun rıhtımı planlaması gerekir */
  shuffle: boolean;
  /** Hedef zorluk: rastgele oynayan bir botun kazanma oranı (0-1). Düşük = zor */
  target: number;
}

/** Seviyeye göre hedef bot kazanma oranı: 4-6 kolay-orta, sonra kademeli zorlaşır */
export function targetWinRate(n: number, hard: boolean, picture: boolean): number {
  const t = n <= 3 ? 1 : n <= 5 ? 0.75 : n <= 10 ? 0.6 : n <= 20 ? 0.5 : n <= 40 ? 0.42 : 0.38;
  return Math.max(0.15, t - (hard ? 0.2 : 0) + (picture ? 0.15 : 0));
}

export const isHardLevel = (n: number): boolean => n >= 10 && n % 10 === 0;

export function difficultyFor(n: number): Difficulty {
  // 1-3 öğretici; 4'ten itibaren şeritler karışık, 8'den sonra 5 renk ve küçük rıhtım, 15'ten sonra 6 renk
  const hard = isHardLevel(n);
  const size = n <= 3 ? 8 : n <= 6 ? 10 : n <= 40 ? 12 : 13;
  const colors = n <= 3 ? 3 : n <= 7 ? 4 : n <= 14 ? 5 : 6;
  const lanes = n <= 2 ? 2 : n <= 6 ? 3 : n <= 35 ? 4 : 5;
  const charges = size <= 12 ? [4, 6, 8] : [5, 8, 10];
  const baseDock = n <= 3 ? 5 : n <= 5 ? 4 : 3;
  const hiddenFrac = n < 12 ? 0 : Math.min(0.6, 0.3 + (n - 12) * 0.01);
  const lockedLanes = n >= 18 && lanes >= 4 ? (n >= 36 ? 2 : 1) : 0;
  return {
    size,
    colors,
    lanes,
    dockSize: hard && n >= 20 ? Math.max(2, baseDock - 1) : baseDock,
    charges,
    layered: n > 3,
    hard,
    hiddenFrac,
    lockedLanes,
    shuffle: n >= 4,
    target: targetWinRate(n, hard, false),
  };
}

/** Sol-sağ simetrik rastgele piksel resim: hücresel otomatla yumuşatılmış şekil + Voronoi renk bölgeleri */
export function randomPicture(rng: Rng, size: number, colors: number, layered = false): Picture {
  const w = size;
  const h = size;
  const half = Math.ceil(w / 2);
  let mask: boolean[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    mask = new Array(w * h).fill(false);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < half; x++) {
        const v = rng() < 0.62;
        mask[y * w + x] = v;
        mask[y * w + (w - 1 - x)] = v;
      }
    for (let it = 0; it < 2; it++) {
      const next = mask.slice();
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx >= 0 && xx < w && yy >= 0 && yy < h && mask[yy * w + xx]) n++;
            }
          next[y * w + x] = n >= 5;
        }
      mask = next;
    }
    const filled = mask.filter(Boolean).length;
    if (filled >= w * h * 0.45) break;
  }
  if (mask.filter(Boolean).length < w * h * 0.3) mask = mask.map(() => true);

  const palette = shuffle([...Array(PALETTE_SIZE).keys()], rng).slice(0, colors);
  const seeds = Array.from({ length: colors + randInt(rng, 0, 2) }, (_, i) => ({
    x: randInt(rng, 0, half - 1),
    y: randInt(rng, 0, h - 1),
    color: palette[i % colors],
  }));
  const cells: Cell[] = new Array(w * h).fill(EMPTY);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < half; x++) {
      if (!mask[y * w + x]) continue;
      let best = seeds[0];
      let bd = Infinity;
      for (const s of seeds) {
        const d = Math.abs(s.x - x) + Math.abs(s.y - y);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      cells[y * w + x] = best.color;
      cells[y * w + (w - 1 - x)] = best.color;
    }
  return { key: '', title: '', w, h, cells: layered ? layer(cells, w, h, palette, rng) : cells };
}

/**
 * Hücreleri dış kenara uzaklıklarına göre renk bantlarına böler (soğan gibi), %25'i Voronoi
 * rengini korur. Böylece içerideki renkler ancak dıştakiler silinince görünür olur.
 * Simetriyi korumak için rastgelelik sol yarıda üretilip aynalanır.
 */
function layer(cells: Cell[], w: number, h: number, palette: number[], rng: Rng): Cell[] {
  const depth = new Array(w * h).fill(-1);
  let q: number[] = [];
  const N = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < w * h; i++) {
    if (cells[i] === EMPTY) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const edge = N.some(([dx, dy]) => {
      const xx = x + dx;
      const yy = y + dy;
      return xx < 0 || yy < 0 || xx >= w || yy >= h || cells[yy * w + xx] === EMPTY;
    });
    if (edge) {
      depth[i] = 0;
      q.push(i);
    }
  }
  while (q.length) {
    const next: number[] = [];
    for (const i of q) {
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of N) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (cells[j] !== EMPTY && depth[j] < 0) {
          depth[j] = depth[i] + 1;
          next.push(j);
        }
      }
    }
    q = next;
  }
  const bands = shuffle(palette, rng);
  const out = cells.slice();
  const half = Math.ceil(w / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < half; x++) {
      const i = y * w + x;
      if (cells[i] === EMPTY) continue;
      const keep = rng() < 0.25;
      const c = keep ? cells[i] : bands[Math.floor(depth[i] / 1.5) % bands.length];
      out[i] = c;
      out[y * w + (w - 1 - x)] = c;
    }
  return out;
}

/** Resmi çözerek flox dizisini çıkarır (sıra = bir çözüm). */
export function solutionSequence(pic: Picture, rng: Rng, charges: number[]): Flox[] {
  let cells = pic.cells.slice();
  const colors = [...new Set(cells.filter((c) => c !== EMPTY))];
  const seq: Flox[] = [];
  while (cells.some((c) => c !== EMPTY)) {
    const reach = colors
      .map((color) => ({ color, n: runLoop(cells, pic.w, pic.h, { color, charge: 1e9 }).hits.length }))
      .filter((r) => r.n > 0);
    // Boş olmayan her satırın soldan görünen bir pikseli olduğundan reach asla boş kalmaz
    const { color, n } = pick(rng, reach);
    const fits = charges.filter((c) => c <= n);
    const charge = fits.length > 0 ? pick(rng, fits) : n;
    const r = runLoop(cells, pic.w, pic.h, { color, charge });
    cells = r.cells;
    seq.push({ color, charge });
  }
  return seq;
}

/**
 * Diziyi sırayı koruyarak şeritlere dağıtır; kısa şeritler biraz daha olası.
 * Kilitli şeritlere yalnızca, çözüm sırasında kilit açıldıktan sonra gelen flox'lar konur:
 * dizideki her flox şarjı kadar piksel sildiği için, ondan önceki şarjların toplamı
 * "o ana kadar silinen piksel" sayısıdır. Böylece çözülebilirlik korunur.
 */
export function dealToLanes(
  seq: Flox[],
  lanes: number,
  rng: Rng,
  lockedLanes = 0,
  needFrac = 0.3,
): { lanes: Flox[][]; locks: Lock[] } {
  const out: Flox[][] = Array.from({ length: lanes }, () => []);
  const total = seq.reduce((n, f) => n + f.charge, 0);
  const need = Math.max(1, Math.round(total * needFrac));
  const locked = new Set(
    Array.from({ length: Math.min(lockedLanes, lanes - 1) }, (_, i) => lanes - 1 - i),
  );
  let cleared = 0;
  for (const f of seq) {
    const open = cleared >= need;
    let pool = out.map((l, i) => ({ l, i })).filter((o) => open || !locked.has(o.i));
    if (open && locked.size > 0 && rng() < 0.45) pool = pool.filter((o) => locked.has(o.i));
    const min = Math.min(...pool.map((o) => o.l.length));
    const options = pool.filter((o) => o.l.length <= min + 1);
    pick(rng, options).l.push(f);
    cleared += f.charge;
  }
  const keep = out.map((l, i) => ({ l, i })).filter((o) => o.l.length > 0);
  const locks: Lock[] = [];
  keep.forEach((o, ni) => {
    if (locked.has(o.i)) locks.push({ lane: ni, need });
  });
  return { lanes: keep.map((o) => o.l), locks };
}

/** Başta görünmeyen iç piksellerin bir kısmını gizler. */
export function pickHidden(pic: Picture, frac: number, rng: Rng): number[] {
  if (frac <= 0) return [];
  const lvl = { w: pic.w, h: pic.h } as Level;
  const all = pic.cells.map((c) => c !== EMPTY);
  const stillHidden = reveal(lvl, pic.cells, all);
  return stillHidden.flatMap((h, i) => (h && rng() < frac ? [i] : []));
}

export function buildLevel(id: string, seed: number, d: Difficulty, pic?: Picture): Level {
  const rng = mulberry32(seed);
  const picture = pic ?? randomPicture(rng, d.size, d.colors, d.layered);
  const seq = solutionSequence(picture, rng, d.charges);
  const obstacles = !pic;
  const { lanes, locks } = dealToLanes(seq, d.lanes, rng, obstacles ? d.lockedLanes : 0);
  const hidden = obstacles ? pickHidden(picture, d.hiddenFrac, rng) : [];
  const level: Level = {
    id,
    w: picture.w,
    h: picture.h,
    cells: picture.cells.slice(),
    lanes,
    dockSize: d.dockSize,
    hard: d.hard,
    // Ekranda pictureName(title) ile çevrilir
    title: picture.key || undefined,
  };
  if (hidden.length) level.hidden = hidden;
  if (locks.length) level.locks = locks;
  return d.shuffle ? shuffleLanes(level, rng, d.target) : level;
}

/** Rastgele oynayan botun kazanma oranı (tohumlu, her cihazda aynı) */
export function botWinRate(level: Level, plays = 24): number {
  const rng = mulberry32(hashSeed(level.id));
  let wins = 0;
  for (let t = 0; t < plays; t++) {
    let st = initialState(level);
    while (st.status === 'playing') {
      const ms = legalMoves(level, st);
      st = applyMove(level, st, ms[Math.floor(rng() * ms.length)]).state;
    }
    if (st.status === 'won') wins++;
  }
  return wins / plays;
}

/**
 * Şeritleri birkaç kez karıştırır, çözücünün çözebildiği dizilimler arasından
 * bot kazanma oranı hedefe en yakın olanı seçer. Böylece zorluk seviyeden seviyeye dalgalanmaz.
 */
function shuffleLanes(level: Level, rng: Rng, target: number): Level {
  let best = level;
  let bestGap = Math.abs(botWinRate(level) - target);
  for (let attempt = 0; attempt < 10 && bestGap > 0.06; attempt++) {
    const cand: Level = { ...level, lanes: level.lanes.map((l) => shuffle(l, rng)) };
    if (!solve(cand, initialState(cand), 12000).moves) continue;
    const gap = Math.abs(botWinRate(cand) - target);
    if (gap < bestGap) {
      best = cand;
      bestGap = gap;
    }
  }
  return best;
}

/** n. seviye (1'den başlar). 5, 15, 25… elle çizilmiş resim (dinlenme seviyeleri). */
export function levelFor(n: number): Level {
  const d = difficultyFor(n);
  const pic = n % 10 === 5 ? PICTURES[((n - 5) / 10) % PICTURES.length] : undefined;
  const charges = pic ? difficultyFor(Math.min(n, 15)).charges : d.charges;
  const target = targetWinRate(n, d.hard, !!pic);
  const dd = { ...d, charges, target };
  const seed = hashSeed(`floxi-level-${n}`);
  // Birkaç tohum dene, hedef zorluğa en yakın olanı al (her cihazda aynı sonuç)
  let best = buildLevel(`L${n}`, seed, dd, pic);
  let gap = Math.abs(botWinRate(best) - target);
  for (let k = 1; k < 6 && gap > 0.08; k++) {
    const cand = buildLevel(`L${n}`, seed + k * 7919, dd, pic);
    const g = Math.abs(botWinRate(cand) - target);
    if (g < gap) {
      best = cand;
      gap = g;
    }
  }
  return best;
}

/** Günlük Mozaik: herkese aynı, tarih (UTC, YYYY-MM-DD) tohumlu. */
export const dailyKey = (date: Date): string => date.toISOString().slice(0, 10);

export function dailyLevel(key: string): Level {
  const d: Difficulty = { ...difficultyFor(30), dockSize: 3, hard: true, shuffle: true, target: 0.35 };
  return buildLevel(`D${key}`, hashSeed(`floxi-daily-${key}`), d);
}
