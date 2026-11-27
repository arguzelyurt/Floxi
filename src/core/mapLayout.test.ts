import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAPS } from './maps';
import { islandCenters, overviewRail, pathLength, pathUntil, resample, stationLayout, STATIONS } from './mapLayout';

test('harita içi: her harita boyu için duraklar ekrana sığar, yılan düzeninde sıralı', () => {
  const W = 375;
  for (const m of MAPS) {
    const n = m.end - m.start + 1;
    const L = stationLayout(W, n);
    assert.equal(L.stations.length, n);
    for (const p of [...L.stations, L.chest]) {
      assert.ok(p.x >= 0 && p.x <= W, `x içeride (${n})`);
      assert.ok(p.y > 0 && p.y < L.height, `y içeride (${n})`);
    }
    // ardışık duraklar ya aynı sırada yan yana ya da bir alt sırada
    for (let i = 1; i < n; i++) {
      const a = L.stations[i - 1];
      const b = L.stations[i];
      assert.ok(a.y === b.y || b.y - a.y === STATIONS.row);
    }
    // sandık son duraktan farklı bir yerde
    assert.notDeepEqual(L.chest, L.stations[n - 1]);
    // ray sandıkta biter
    const end = L.rail[L.rail.length - 1];
    assert.ok(Math.hypot(end.x - L.chest.x, end.y - L.chest.y) < 1);
  }
});

test('ikinci sıra sağdan sola gider', () => {
  const L = stationLayout(375, 10);
  assert.ok(L.stations[1].x > L.stations[0].x);
  assert.ok(L.stations[5].x < L.stations[4].x);
});

test('genel harita: ray bütün adalardan geçer; yol örnekleme eşit aralıklı', () => {
  const c = islandCenters(375, MAPS.length);
  const rail = overviewRail(c);
  for (const p of c) assert.ok(rail.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1));
  const r = resample(rail, 200);
  assert.equal(r.length, 200);
  const d = r.slice(1).map((p, i) => Math.hypot(p.x - r[i].x, p.y - r[i].y));
  const avg = pathLength(rail) / 199;
  for (const x of d) assert.ok(Math.abs(x - avg) < avg * 0.15);
  const part = pathUntil(rail, c[3]);
  assert.ok(Math.hypot(part[part.length - 1].x - c[3].x, part[part.length - 1].y - c[3].y) < 1);
});
