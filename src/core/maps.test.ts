import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapEndingAt, mapForLevel, mapProgress, MAPS, rewardFor, TOTAL_LEVELS } from './maps';

test('haritalar: ardışık, büyüyen, 400 seviye; 1. harita 10, 5. harita 60 seviyede biter', () => {
  assert.equal(MAPS[0].start, 1);
  for (let i = 1; i < MAPS.length; i++) {
    assert.equal(MAPS[i].start, MAPS[i - 1].end + 1);
    assert.ok(MAPS[i].end - MAPS[i].start >= MAPS[i - 1].end - MAPS[i - 1].start);
  }
  assert.equal(MAPS[0].end, 10);
  assert.equal(MAPS[4].end, 60);
  assert.equal(TOTAL_LEVELS, 400);
  assert.equal(mapForLevel(1).index, 0);
  assert.equal(mapForLevel(11).index, 1);
  assert.equal(mapForLevel(999).index, MAPS.length - 1);
  assert.equal(mapEndingAt(10)?.index, 0);
  assert.equal(mapEndingAt(11), undefined);
  assert.deepEqual(mapProgress(MAPS[1], 15), { done: 4, total: 10 });
});

test('harita ödülleri giderek büyür', () => {
  for (let i = 1; i < MAPS.length; i++) {
    const a = rewardFor(i - 1);
    const b = rewardFor(i);
    assert.ok(b.coins > a.coins);
    const sum = (r: typeof a) => Object.values(r.boosters).reduce((x, y) => x + (y ?? 0), 0);
    assert.ok(sum(b) >= sum(a));
  }
});
