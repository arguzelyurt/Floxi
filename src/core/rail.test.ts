import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levelFor } from './generator';
import { applyMove, conveyorPath, initialState, legalMoves, Level, State } from './rules';
import { mulberry32 } from './rng';
import { finish, GAP, isIdle, launch, MAX_ON_RAIL, railFrom, RailState, tick } from './rail';

const core = (s: State) => ({
  cells: s.cells,
  lanes: s.lanes,
  dock: s.dock,
  dockSize: s.dockSize,
  status: s.status,
  launches: s.launches,
  parked: s.parked,
  cleared: s.cleared,
  overflow: s.overflow,
});

test('tek tek oynanınca ray, sıralı kurallarla birebir aynı sonucu verir', () => {
  for (const n of [1, 4, 8, 12, 18, 26, 40]) {
    const level = levelFor(n);
    for (let seed = 0; seed < 6; seed++) {
      const rng = mulberry32(seed + n * 31);
      let s = initialState(level);
      let r = railFrom(initialState(level));
      for (let k = 0; k < 200 && s.status === 'playing'; k++) {
        const ms = legalMoves(level, s);
        const m = ms[Math.floor(rng() * ms.length)];
        s = applyMove(level, s, m).state;
        r = finish(level, launch(level, r, m));
        assert.ok(isIdle(r));
        assert.deepEqual(core(r.s), core(s), `L${n} seed ${seed} hamle ${k}`);
      }
    }
  }
});

function ticks(level: Level, r: RailState, n: number) {
  let cur = r;
  for (let i = 0; i < n; i++) cur = tick(level, cur);
  return cur;
}

test('arka arkaya atılan flox üst üste binmez, öndekini geçmez', () => {
  const level = levelFor(30);
  let r = railFrom(initialState(level));
  // Açık şeritlerin önünden hızlıca 4 flox
  for (let i = 0; i < 4; i++) {
    const lane = r.s.lanes.findIndex((l, li) => l.length > 0 && !(level.locks ?? []).some((x) => x.lane === li));
    r = launch(level, r, { from: 'lane', index: lane });
  }
  const path = conveyorPath(level.w, level.h).length;
  for (let step = 0; step < path * 3 && !isIdle(r) && r.s.status === 'playing'; step++) {
    // Sıra = atış sırası, aralık en az GAP
    for (let i = 1; i < r.riders.length; i++) {
      assert.ok(r.riders[i - 1].id < r.riders[i].id);
      assert.ok(r.riders[i - 1].pos - r.riders[i].pos >= GAP);
    }
    r = tick(level, r);
  }
  assert.ok(r.s.launches === 4);
});

test('girişte bekleyen dokunuş kaybolmaz; rayda en fazla MAX_ON_RAIL flox', () => {
  const level = levelFor(36);
  let r = railFrom(initialState(level));
  for (let i = 0; i < 10; i++) r = launch(level, r, { from: 'lane', index: i % level.lanes.length });
  assert.ok(r.riders.length + r.queue.length <= MAX_ON_RAIL);
  const launched = r.s.launches;
  r = ticks(level, r, 1);
  assert.equal(r.riders.length + r.queue.length <= launched, true);
  const total = (st: RailState) =>
    st.s.lanes.reduce((n, l) => n + l.length, 0) + st.riders.length + st.queue.length;
  const before = total(r);
  r = ticks(level, r, GAP);
  assert.ok(total(r) <= before);
});

test('geri al: durum kopyası değişmez (saf fonksiyonlar)', () => {
  const level = levelFor(12);
  const r0 = railFrom(initialState(level));
  const copy = JSON.stringify(r0);
  const r1 = launch(level, r0, { from: 'lane', index: 0 });
  ticks(level, r1, 5);
  assert.equal(JSON.stringify(r0), copy);
});
