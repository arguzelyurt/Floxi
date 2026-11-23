/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  legalMoves,
  applyMove,
  conveyorPath,
  EMPTY,
  firstVisible,
  initialState,
  Level,
  Move,
  rescueWithExtraSlot,
  runLoop,
  starsFor,
  State,
} from './rules';
import { solve } from './solver';
import { dailyLevel, levelFor, solutionSequence } from './generator';
import { PICTURES } from './pictures';
import { mulberry32 } from './rng';

const _ = EMPTY;

test('ray yolu tahtayı çevreler', () => {
  const p = conveyorPath(3, 2);
  assert.equal(p.length, 2 * 3 + 2 * 2);
  assert.deepEqual(p[0], { x: 0, y: 1, dx: 0, dy: -1 }); // alt-sol, yukarı bakar
});

test('ilk görünür piksel', () => {
  // 3x3, orta sütun: üst boş, orta 1, alt 2
  const cells = [_, _, _, _, 1, _, _, 2, _];
  assert.equal(firstVisible(cells, 3, 3, { x: 1, y: 2, dx: 0, dy: -1 }), 7); // alttan bakınca 2
  assert.equal(firstVisible(cells, 3, 3, { x: 1, y: 0, dx: 0, dy: 1 }), 4); // üstten bakınca 1
  assert.equal(firstVisible(cells, 3, 3, { x: 0, y: 0, dx: 1, dy: 0 }), -1);
});

test('tur: renk tutan görünür pikselleri siler, şarj kadar', () => {
  // 2x1: [0, 0]
  const r = runLoop([0, 0], 2, 1, { color: 0, charge: 5 });
  assert.deepEqual(r.cells, [_, _]);
  assert.equal(r.left, 3);
  const r2 = runLoop([0, 0], 2, 1, { color: 0, charge: 1 });
  assert.equal(r2.left, 0);
  assert.equal(r2.cells.filter((c) => c === 0).length, 1);
  const r3 = runLoop([1, 1], 2, 1, { color: 0, charge: 3 });
  assert.equal(r3.hits.length, 0);
  assert.equal(r3.left, 3);
});

test('dıştaki renk içtekini örter', () => {
  // 3x3: ortada 1, çevresi 0. 1 rengi önce hiçbir şey silemez.
  const cells = [0, 0, 0, 0, 1, 0, 0, 0, 0];
  assert.equal(runLoop(cells, 3, 3, { color: 1, charge: 9 }).hits.length, 0);
  const after = runLoop(cells, 3, 3, { color: 0, charge: 8 }).cells;
  assert.equal(runLoop(after, 3, 3, { color: 1, charge: 1 }).hits.length, 1);
});

const tiny: Level = {
  id: 't',
  w: 2,
  h: 1,
  cells: [0, 1],
  lanes: [[{ color: 1, charge: 1 }], [{ color: 0, charge: 3 }]],
  dockSize: 1,
};

test('hamle, rıhtım, kazanma, yıldız', () => {
  let s = initialState(tiny);
  let r = applyMove(tiny, s, { from: 'lane', index: 1 }); // 0 rengi 1 siler, 2 artar → rıhtım
  assert.equal(r.left, 2);
  assert.equal(r.state.dock.length, 1);
  assert.equal(r.state.parked, 1);
  s = r.state;
  r = applyMove(tiny, s, { from: 'lane', index: 0 });
  assert.equal(r.state.status, 'won');
  assert.equal(starsFor(r.state), 2);
});

test('rıhtım doluysa tıkanır, kurtarma yer ekler', () => {
  const lvl: Level = {
    id: 't2',
    w: 2,
    h: 1,
    cells: [0, 1],
    lanes: [[{ color: 2, charge: 1 }, { color: 3, charge: 1 }, { color: 0, charge: 1 }, { color: 1, charge: 1 }]],
    dockSize: 1,
  };
  let s = initialState(lvl);
  s = applyMove(lvl, s, { from: 'lane', index: 0 }).state; // 2 hiçbir şey silmez → rıhtım
  const r = applyMove(lvl, s, { from: 'lane', index: 0 }); // 3 de silmez, rıhtım dolu
  assert.equal(r.state.status, 'stuck');
  const saved = rescueWithExtraSlot(lvl, r.state);
  assert.equal(saved.status, 'playing');
  assert.equal(saved.dock.length, 2);
});

test('öne al: arkadaki flox gönderilir, sıra korunur', () => {
  const s = initialState(tiny);
  const lvl: Level = { ...tiny, lanes: [[{ color: 1, charge: 1 }, { color: 0, charge: 1 }]] };
  const st = initialState(lvl);
  const r = applyMove(lvl, st, { from: 'lane', index: 0, depth: 1 });
  assert.equal(r.hits.length, 1);
  assert.deepEqual(r.state.lanes[0], [{ color: 1, charge: 1 }]);
  assert.equal(s.lanes.length, 2);
});

test('girdi durum değişmez', () => {
  const s = initialState(tiny);
  const copy = JSON.stringify(s);
  applyMove(tiny, s, { from: 'lane', index: 0 });
  assert.equal(JSON.stringify(s), copy);
});

function play(level: Level, moves: Move[]): State {
  let s = initialState(level);
  for (const m of moves) s = applyMove(level, s, m).state;
  return s;
}

test('elle çizilmiş resimler geçerli ve çözülebilir', () => {
  for (const pic of PICTURES) {
    const seq = solutionSequence(pic, mulberry32(1), [5, 8, 10]);
    const total = seq.reduce((n, f) => n + f.charge, 0);
    assert.equal(total, pic.cells.filter((c) => c !== EMPTY).length, pic.title);
  }
});

test('ilk 60 seviye + günlük: çözücü çözer, çözüm gerçekten kazandırır', () => {
  const levels = [...Array.from({ length: 60 }, (_, i) => levelFor(i + 1)), dailyLevel('2026-11-22')];
  for (const lvl of levels) {
    const cells = lvl.cells.filter((c) => c !== EMPTY).length;
    const charge = lvl.lanes.flat().reduce((n, f) => n + f.charge, 0);
    assert.equal(charge, cells, `${lvl.id}: şarj toplamı piksel sayısına eşit`);
    const r = solve(lvl, initialState(lvl), 40000);
    assert.ok(r.moves, `${lvl.id} çözülemedi`);
    assert.equal(play(lvl, r.moves!).status, 'won', lvl.id);
  }
});

test('kilitli şerit: açılmadan oynanamaz, açılınca oynanır', () => {
  const lvl: Level = {
    id: 'k',
    w: 2,
    h: 1,
    cells: [0, 1],
    lanes: [[{ color: 0, charge: 1 }], [{ color: 1, charge: 1 }]],
    dockSize: 2,
    locks: [{ lane: 1, need: 1 }],
  };
  let s = initialState(lvl);
  assert.equal(legalMoves(lvl, s).length, 1);
  assert.throws(() => applyMove(lvl, s, { from: 'lane', index: 1 }));
  s = applyMove(lvl, s, { from: 'lane', index: 0 }).state;
  assert.equal(s.cleared, 1);
  assert.equal(s.status, 'playing');
  s = applyMove(lvl, s, { from: 'lane', index: 1 }).state;
  assert.equal(s.status, 'won');
});

test('kilitli şeritten başka hamle yoksa tıkanır', () => {
  const lvl: Level = {
    id: 'k2',
    w: 2,
    h: 1,
    cells: [0, 1],
    lanes: [[{ color: 2, charge: 1 }], [{ color: 0, charge: 1 }, { color: 1, charge: 1 }]],
    dockSize: 2,
    locks: [{ lane: 1, need: 1 }],
  };
  const r = applyMove(lvl, initialState(lvl), { from: 'lane', index: 0 });
  assert.equal(r.state.status, 'stuck');
});

test('gizli piksel görünür olunca açılır', () => {
  // 3x3: ortası gizli, çevresi 0 renk
  const lvl: Level = {
    id: 'h',
    w: 3,
    h: 3,
    cells: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    lanes: [[{ color: 0, charge: 8 }, { color: 1, charge: 1 }]],
    dockSize: 1,
    hidden: [4],
  };
  let s = initialState(lvl);
  assert.equal(s.hidden[4], true);
  s = applyMove(lvl, s, { from: 'lane', index: 0 }).state;
  assert.equal(s.hidden[4], false);
});

test('engelli seviyeler (16+, 26+, 46+) çözülebilir ve engeller var', () => {
  let locks = 0;
  let hidden = 0;
  for (let n = 16; n <= 80; n++) {
    const lvl = levelFor(n);
    locks += lvl.locks?.length ?? 0;
    hidden += lvl.hidden?.length ?? 0;
    for (const l of lvl.locks ?? []) assert.ok(l.lane < lvl.lanes.length);
    const r = solve(lvl, initialState(lvl), 40000);
    assert.ok(r.moves, `${lvl.id} çözülemedi`);
    assert.equal(play(lvl, r.moves!).status, 'won', lvl.id);
  }
  assert.ok(locks > 20, `kilit sayısı ${locks}`);
  assert.ok(hidden > 100, `gizli ${hidden}`);
});

test('üretim tohumlu: aynı seviye her seferinde aynı', () => {
  assert.deepEqual(levelFor(17), levelFor(17));
  assert.notDeepEqual(levelFor(17).cells, levelFor(18).cells);
});
