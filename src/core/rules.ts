// Floxi çekirdek kuralları. UI'dan bağımsız, saf fonksiyonlar (girdiler değiştirilmez).
//
// Tahta: w x h piksel, her hücre bir renk ya da EMPTY.
// Ray: tahtanın etrafında saat yönünün tersine dönen yol. Her durak bir kenar hücresinden
// tahtanın içine doğru bakar; flox o yöndeki İLK dolu hücreyi görür, rengi tutarsa siler.
// Flox raya alt-sol köşeden girer ve tam bir tur atar.

export type Cell = number;
export const EMPTY = -1;

export interface Flox {
  color: number;
  /** Kaç piksel silebilir */
  charge: number;
}

export interface Level {
  id: string;
  w: number;
  h: number;
  cells: Cell[];
  /** Her şerit önden arkaya sıralı */
  lanes: Flox[][];
  dockSize: number;
  hard?: boolean;
  /** Elle çizilmiş resmin çeviri anahtarı (core/pictures pictureName ile gösterilir) */
  title?: string;
  /** Gizli pikseller: rengi ancak dışarıdan görünür olunca açılır (yalnızca görünüm) */
  hidden?: number[];
  /** Kilitli şeritler: toplam `need` piksel silinince açılır */
  locks?: Lock[];
}

export interface Lock {
  lane: number;
  need: number;
}

export type Status = 'playing' | 'won' | 'stuck';

export interface State {
  cells: Cell[];
  /** Şeritlerde bekleyen flox'lar (önden arkaya) */
  lanes: Flox[][];
  dock: Flox[];
  dockSize: number;
  status: Status;
  /** Rıhtım doluyken park edemeyen flox (kurtarma için) */
  overflow: Flox | null;
  launches: number;
  /** Şeritten çıkıp rıhtıma park eden flox sayısı (temiz olmayan tur) */
  parked: number;
  /** Silinen toplam piksel (kilitli şeritler için) */
  cleared: number;
  /** Hâlâ gizli olan hücreler (true = "?") */
  hidden: boolean[];
}

/** depth > 0: "Öne al" güçlendiricisi, şeridin önü yerine arkadaki bir flox'u gönderir */
export type Move = { from: 'lane'; index: number; depth?: number } | { from: 'dock'; index: number };

export interface Stop {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const pathCache = new Map<string, Stop[]>();

/** Ray durakları: alt (yukarı bakar) → sağ (sola) → üst (aşağı) → sol (sağa) */
export function conveyorPath(w: number, h: number): Stop[] {
  const key = `${w}x${h}`;
  const hit = pathCache.get(key);
  if (hit) return hit;
  const p: Stop[] = [];
  for (let x = 0; x < w; x++) p.push({ x, y: h - 1, dx: 0, dy: -1 });
  for (let y = h - 1; y >= 0; y--) p.push({ x: w - 1, y, dx: -1, dy: 0 });
  for (let x = w - 1; x >= 0; x--) p.push({ x, y: 0, dx: 0, dy: 1 });
  for (let y = 0; y < h; y++) p.push({ x: 0, y, dx: 1, dy: 0 });
  pathCache.set(key, p);
  return p;
}

/** Duraktan bakınca görülen ilk dolu hücrenin indeksi, yoksa -1 */
export function firstVisible(cells: Cell[], w: number, h: number, s: Stop): number {
  let x = s.x;
  let y = s.y;
  while (x >= 0 && x < w && y >= 0 && y < h) {
    const i = y * w + x;
    if (cells[i] !== EMPTY) return i;
    x += s.dx;
    y += s.dy;
  }
  return -1;
}

export interface Hit {
  /** Raydaki durak sırası (animasyon için) */
  step: number;
  cell: number;
}

export interface LoopResult {
  cells: Cell[];
  left: number;
  hits: Hit[];
}

/** Bir flox'un tek turu. Her durakta en fazla bir piksel siler. */
export function runLoop(cells: Cell[], w: number, h: number, flox: Flox): LoopResult {
  const path = conveyorPath(w, h);
  const c = cells.slice();
  let left = flox.charge;
  const hits: Hit[] = [];
  for (let step = 0; step < path.length && left > 0; step++) {
    const i = firstVisible(c, w, h, path[step]);
    if (i >= 0 && c[i] === flox.color) {
      c[i] = EMPTY;
      left--;
      hits.push({ step, cell: i });
    }
  }
  return { cells: c, left, hits };
}

export function initialState(level: Level): State {
  const hidden = new Array(level.cells.length).fill(false);
  for (const i of level.hidden ?? []) hidden[i] = true;
  return {
    cells: level.cells.slice(),
    lanes: level.lanes.map((l) => l.slice()),
    dock: [],
    dockSize: level.dockSize,
    status: isCleared(level.cells) ? 'won' : 'playing',
    overflow: null,
    launches: 0,
    parked: 0,
    cleared: 0,
    hidden: reveal(level, level.cells, hidden),
  };
}

/** Raydaki herhangi bir duraktan görünen gizli hücreleri açar. */
export function reveal(level: Level, cells: Cell[], hidden: boolean[]): boolean[] {
  if (!hidden.some(Boolean)) return hidden;
  const out = hidden.slice();
  for (const st of conveyorPath(level.w, level.h)) {
    const i = firstVisible(cells, level.w, level.h, st);
    if (i >= 0) out[i] = false;
  }
  return out;
}

/** Şerit kilitliyse kilidin açılması için kalan piksel sayısı, değilse 0. */
export function lockRemaining(level: Level, s: State, lane: number): number {
  const lock = level.locks?.find((l) => l.lane === lane);
  return lock ? Math.max(0, lock.need - s.cleared) : 0;
}

export const laneOpen = (level: Level, s: State, lane: number): boolean => lockRemaining(level, s, lane) === 0;

export const isCleared = (cells: Cell[]): boolean => cells.every((c) => c === EMPTY);

export function floxFor(s: State, m: Move): Flox | null {
  return m.from === 'lane' ? (s.lanes[m.index]?.[m.depth ?? 0] ?? null) : (s.dock[m.index] ?? null);
}

export const floxesLeft = (s: State): number => s.lanes.reduce((n, l) => n + l.length, 0);

/** Oynanabilir hamleler. Aynı rıhtım flox'ları tek hamle sayılır. */
export function legalMoves(level: Level, s: State): Move[] {
  if (s.status !== 'playing') return [];
  const moves: Move[] = [];
  s.lanes.forEach((lane, i) => {
    if (lane.length > 0 && laneOpen(level, s, i)) moves.push({ from: 'lane', index: i });
  });
  const seen = new Set<string>();
  s.dock.forEach((f, i) => {
    const k = `${f.color}:${f.charge}`;
    if (seen.has(k)) return;
    seen.add(k);
    moves.push({ from: 'dock', index: i });
  });
  return moves;
}

export interface MoveResult {
  state: State;
  flox: Flox;
  hits: Hit[];
  left: number;
}

export function applyMove(level: Level, s: State, m: Move): MoveResult {
  const flox = floxFor(s, m);
  if (!flox || s.status !== 'playing') throw new Error('geçersiz hamle');
  if (m.from === 'lane' && !laneOpen(level, s, m.index)) throw new Error('şerit kilitli');
  const { cells, left, hits } = runLoop(s.cells, level.w, level.h, flox);
  const lanes = s.lanes.slice();
  let dock = s.dock.slice();
  let parked = s.parked;
  let status: Status = 'playing';
  let overflow: Flox | null = null;

  if (m.from === 'lane') {
    const lane = lanes[m.index].slice();
    lane.splice(m.depth ?? 0, 1);
    lanes[m.index] = lane;
  } else dock.splice(m.index, 1);

  if (left > 0) {
    const rest = { color: flox.color, charge: left };
    if (m.from === 'lane') parked++;
    if (dock.length < s.dockSize) dock.push(rest);
    else {
      overflow = rest;
      status = 'stuck';
    }
  }

  const next: State = {
    cells,
    lanes,
    dock,
    dockSize: s.dockSize,
    status,
    overflow,
    launches: s.launches + 1,
    parked,
    cleared: s.cleared + hits.length,
    hidden: reveal(level, cells, s.hidden),
  };
  if (isCleared(cells)) next.status = 'won';
  else if (status === 'playing' && isDeadlocked(level, next)) next.status = 'stuck';
  return { state: next, flox, hits, left };
}

/** Şeritler bitti ve rıhtımdaki hiçbir flox bir şey silemiyorsa oyun kilitlenmiştir. */
export function isDeadlocked(level: Level, s: State): boolean {
  if (s.lanes.some((lane, i) => lane.length > 0 && laneOpen(level, s, i))) return false;
  return s.dock.every((f) => runLoop(s.cells, level.w, level.h, f).hits.length === 0);
}

/** Rıhtıma kalıcı bir yer ekler (güçlendirici). Tıkanmışsa taşan flox'u da park eder. */
export function addDockSlot(level: Level, s: State): State {
  if (s.status === 'stuck') return rescueWithExtraSlot(level, s);
  if (s.status !== 'playing') return s;
  return { ...s, dockSize: s.dockSize + 1 };
}

/** Kurtarma: rıhtıma bir yer ekler ve taşan flox'u park eder. */
export function rescueWithExtraSlot(level: Level, s: State): State {
  if (s.status !== 'stuck') return s;
  const dock = s.overflow ? [...s.dock, s.overflow] : s.dock.slice();
  const next: State = { ...s, dock, dockSize: s.dockSize + 1, overflow: null, status: 'playing' };
  if (isDeadlocked(level, next)) next.status = 'stuck';
  return next;
}

/** 3 yıldız: hiç park etmeden. 2: en fazla 2 park. */
export function starsFor(s: State): 1 | 2 | 3 {
  if (s.parked === 0) return 3;
  if (s.parked <= 2) return 2;
  return 1;
}

export function stateKey(s: State): string {
  let k = '';
  for (const c of s.cells) k += String.fromCharCode(66 + c);
  k += '|' + s.lanes.map((l) => l.map((f) => `${f.color}.${f.charge}`).join(' ')).join(',') + '|';
  k += s.dock
    .map((f) => `${f.color}:${f.charge}`)
    .sort()
    .join(',');
  return k + '|' + s.dockSize;
}

export const totalFloxes = (level: Level): number => level.lanes.reduce((n, l) => n + l.length, 0);
