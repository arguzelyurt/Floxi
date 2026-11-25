// Ray simülasyonu: birden fazla flox aynı anda rayda, adım adım ilerler.
//
// - Flox'a dokununca hemen şeritten (ya da rıhtımdan) çıkar ve giriş kuyruğuna girer.
// - Raydaki son flox en az GAP durak ilerlemeden yenisi raya girmez (üst üste binmez).
// - Her adımda tüm flox'lar birer durak ilerler, önce en öndeki. Hepsi aynı hızda gittiği
//   için sonra atılan öncekini asla geçemez; rıhtıma da atış sırasıyla park ederler.
// - Tek flox için sonuç core/rules applyMove ile birebir aynıdır (testli). Çözücü ve
//   üretici sıralı modelde kalır: oyuncu her flox'u beklerse oyun eskisi gibi oynanır.

import {
  conveyorPath,
  Flox,
  firstVisible,
  isCleared,
  isDeadlocked,
  laneOpen,
  Level,
  Move,
  reveal,
  State,
  EMPTY,
} from './rules';

/** Raya giriş aralığı (durak) */
export const GAP = 2;
/** Rayda + girişte aynı anda en fazla flox */
export const MAX_ON_RAIL = 5;

export interface Rider {
  id: number;
  flox: Flox;
  /** Kalan şarj */
  left: number;
  /** Bulunduğu durak; girişte bekliyorsa -1 */
  pos: number;
  fromLane: boolean;
}

export interface RailHit {
  rider: number;
  cell: number;
  color: number;
}

export interface RailState {
  s: State;
  /** Raydakiler, en öndeki ilk */
  riders: Rider[];
  /** Girişte bekleyenler, sırayla */
  queue: Rider[];
  /** Rıhtım doluyken park edemeyenler (ray boşalınca tıkanma) */
  overflow: Flox[];
  nextId: number;
  /** Son adımda silinenler (efekt için) */
  hits: RailHit[];
}

export const railFrom = (s: State): RailState => ({ s, riders: [], queue: [], overflow: [], nextId: 1, hits: [] });

export const isIdle = (r: RailState): boolean => r.riders.length === 0 && r.queue.length === 0;

export const onRail = (r: RailState): number => r.riders.length + r.queue.length;

/** Bu hamle şu an yapılabilir mi? */
export function canLaunch(level: Level, r: RailState, m: Move): boolean {
  const s = r.s;
  if (s.status !== 'playing' || onRail(r) >= MAX_ON_RAIL) return false;
  if (m.from === 'lane') return laneOpen(level, s, m.index) && !!s.lanes[m.index]?.[m.depth ?? 0];
  return !!s.dock[m.index];
}

/** Flox'u şeritten/rıhtımdan alıp girişe koyar ve uygunsa hemen raya sokar. */
export function launch(level: Level, r: RailState, m: Move): RailState {
  if (!canLaunch(level, r, m)) return r;
  const s = r.s;
  const lanes = s.lanes.slice();
  const dock = s.dock.slice();
  let flox: Flox;
  if (m.from === 'lane') {
    const lane = lanes[m.index].slice();
    flox = lane.splice(m.depth ?? 0, 1)[0];
    lanes[m.index] = lane;
  } else flox = dock.splice(m.index, 1)[0];
  const rider: Rider = { id: r.nextId, flox, left: flox.charge, pos: -1, fromLane: m.from === 'lane' };
  const next: RailState = {
    ...r,
    s: { ...s, lanes, dock, launches: s.launches + 1 },
    queue: [...r.queue, rider],
    nextId: r.nextId + 1,
    hits: [],
  };
  return enter(level, next);
}

/** Giriş boşsa kuyruğun başındaki raya girer ve ilk durağına bakar. */
function enter(level: Level, r: RailState): RailState {
  if (r.queue.length === 0) return r;
  const last = r.riders[r.riders.length - 1];
  if (last && last.pos < GAP) return r;
  const [first, ...rest] = r.queue;
  const cells = r.s.cells.slice();
  const hits = r.hits.slice();
  let cleared = r.s.cleared;
  const rider = { ...first, pos: 0 };
  if (look(level, cells, rider, hits)) cleared++;
  const next: RailState = { ...r, s: { ...r.s, cells, cleared }, riders: [...r.riders, rider], queue: rest, hits };
  return rider.left === 0 ? settle(level, { ...next, riders: next.riders.filter((x) => x.id !== rider.id) }) : settle(level, next);
}

/** Durakta görülen ilk piksel flox'un rengindeyse siler. */
function look(level: Level, cells: number[], rider: Rider, hits: RailHit[]): boolean {
  const path = conveyorPath(level.w, level.h);
  const i = firstVisible(cells, level.w, level.h, path[rider.pos]);
  if (i >= 0 && cells[i] === rider.flox.color && rider.left > 0) {
    hits.push({ rider: rider.id, cell: i, color: cells[i] });
    cells[i] = EMPTY;
    rider.left--;
    return true;
  }
  return false;
}

/** Bir adım: raydaki tüm flox'lar birer durak ilerler (önce en öndeki), sonra giriş. */
export function tick(level: Level, r: RailState): RailState {
  if (r.s.status !== 'playing' || isIdle(r)) return r;
  const path = conveyorPath(level.w, level.h);
  const cells = r.s.cells.slice();
  const dock = r.s.dock.slice();
  const overflow = r.overflow.slice();
  const hits: RailHit[] = [];
  let cleared = r.s.cleared;
  let parked = r.s.parked;
  const riders: Rider[] = [];
  for (const old of r.riders) {
    const rider = { ...old, pos: old.pos + 1 };
    if (rider.pos >= path.length) {
      // Tur bitti: kalan şarjla rıhtıma
      const rest = { color: rider.flox.color, charge: rider.left };
      if (rider.fromLane) parked++;
      if (dock.length < r.s.dockSize) dock.push(rest);
      else overflow.push(rest);
      continue;
    }
    if (look(level, cells, rider, hits)) cleared++;
    if (rider.left > 0) riders.push(rider);
  }
  const next: RailState = { ...r, s: { ...r.s, cells, dock, cleared, parked }, riders, overflow, hits };
  return enter(level, settle(level, next));
}

/** Kazanma / tıkanma kontrolü ve gizli hücrelerin açılması. */
function settle(level: Level, r: RailState): RailState {
  const s: State = { ...r.s, hidden: reveal(level, r.s.cells, r.s.hidden) };
  if (isCleared(s.cells)) return { ...r, s: { ...s, status: 'won', overflow: null }, riders: [], queue: [], overflow: [] };
  if (!isIdle(r)) return { ...r, s };
  if (r.overflow.length > 0) return { ...r, s: { ...s, status: 'stuck', overflow: r.overflow[0] } };
  if (isDeadlocked(level, s)) return { ...r, s: { ...s, status: 'stuck', overflow: null } };
  return { ...r, s };
}

/** Raydaki her şeyi sonuna kadar oynatır (dokununca hızlandırma). */
export function finish(level: Level, r: RailState): RailState {
  let cur = r;
  for (let guard = 0; guard < 10000 && !isIdle(cur) && cur.s.status === 'playing'; guard++) cur = tick(level, cur);
  return cur;
}

/** Tıkanınca kurtarma: taşan her flox için rıhtıma bir yer ekler ve park eder. */
export function rescue(level: Level, r: RailState): RailState {
  if (r.s.status !== 'stuck') return r;
  const extra = Math.max(1, r.overflow.length);
  const s: State = {
    ...r.s,
    dock: [...r.s.dock, ...r.overflow],
    dockSize: r.s.dockSize + extra,
    overflow: null,
    status: 'playing',
  };
  return settle(level, { ...r, s, overflow: [] });
}

/** +1 Yer güçlendiricisi: her an kullanılabilir. */
export function addSlot(level: Level, r: RailState): RailState {
  if (r.s.status === 'stuck') return rescue(level, r);
  if (r.s.status !== 'playing') return r;
  return { ...r, s: { ...r.s, dockSize: r.s.dockSize + 1 } };
}

/** Raydaki bir flox'un ekrandaki görünümü (kalan şarjıyla) */
export const riderFlox = (rd: Rider): Flox => ({ color: rd.flox.color, charge: rd.left });
