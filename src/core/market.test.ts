/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buyItem,
  buySet,
  collection,
  dailyDeals,
  DEFAULT_COSMETICS,
  equipItem,
  itemById,
  MARKET,
  ownsItem,
  priceFor,
  RARITY_PRICE,
  SETS,
  setPrice,
  Wallet,
} from './market';
import { MAPS } from './maps';
import { ECONOMY } from './monetization';

const wallet = (coins: number, level = 1): Wallet => ({
  coins,
  boosters: { undo: 0, hint: 0, pick: 0, extraSlot: 0 },
  owned: [],
  cosmetics: { ...DEFAULT_COSMETICS },
  level,
});

test('kimlikler benzersiz, varsayılanlar ücretsiz, en az 30 kozmetik', () => {
  assert.equal(new Set(MARKET.map((m) => m.id)).size, MARKET.length);
  for (const id of Object.values(DEFAULT_COSMETICS)) assert.ok(MARKET.find((m) => m.id === id)?.free);
  assert.ok(MARKET.filter((m) => m.kind !== 'booster').length >= 30);
  for (const s of SETS) for (const id of s.items) assert.ok(itemById(id), id);
});

test('paketler tek tek almaktan ucuz', () => {
  for (const m of MARKET) {
    if (!m.booster) continue;
    assert.ok(m.price < ECONOMY.prices[m.booster.kind] * m.booster.count, m.id);
  }
});

test('güçlendirici paketi coin düşer, envanter artar, tekrar alınabilir', () => {
  let r = buyItem(wallet(300), 'pack:hint3');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.wallet.coins, 170);
  assert.equal(r.wallet.boosters.hint, 3);
  r = buyItem(r.wallet, 'pack:hint3');
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.wallet.boosters.hint, 6);
  const mix = buyItem(wallet(500), 'pack:mix');
  assert.ok(mix.ok && mix.wallet.boosters.pick === 2 && mix.wallet.boosters.extraSlot === 1);
});

test('kozmetik: yetersiz coin, satın al ve kullan, ikinci kez alınmaz', () => {
  const neon = RARITY_PRICE.epic;
  assert.deepEqual(buyItem(wallet(100), 'theme:neon'), { ok: false, reason: 'coins' });
  const r = buyItem(wallet(neon + 100), 'theme:neon');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.wallet.coins, 100);
  assert.equal(r.wallet.cosmetics.theme, 'theme:neon');
  assert.deepEqual(buyItem(r.wallet, 'theme:neon'), { ok: false, reason: 'owned' });
  const back = equipItem(r.wallet, 'theme:gece');
  assert.equal(back.cosmetics.theme, 'theme:gece');
  assert.equal(equipItem(back, 'flox:elmas').cosmetics.flox, 'flox:damla');
  assert.ok(ownsItem(back, itemById('cells:klasik')!));
});

test('harita kilidi: harita bitince ücretsiz açılır, satın alınamaz', () => {
  const lav = itemById('theme:lav')!;
  const end = MAPS[lav.unlockMap!].end;
  assert.deepEqual(buyItem(wallet(99999, end), 'theme:lav'), { ok: false, reason: 'locked' });
  assert.ok(!ownsItem(wallet(0, end), lav));
  assert.ok(ownsItem(wallet(0, end + 1), lav));
  assert.equal(equipItem(wallet(0, end + 1), 'theme:lav').cosmetics.theme, 'theme:lav');
});

test('Günün fırsatı: 3 satılık ürün, gün boyu aynı, indirimli fiyat geçerli', () => {
  const a = dailyDeals('2026-11-25');
  assert.equal(a.length, 3);
  assert.deepEqual(a, dailyDeals('2026-11-25'));
  assert.notDeepEqual(a, dailyDeals('2026-11-26'));
  for (const d of a) {
    const m = itemById(d.id)!;
    assert.ok(!m.free && m.unlockMap === undefined && m.kind !== 'booster');
    const p = priceFor(m, '2026-11-25');
    assert.ok(p < m.price);
    const r = buyItem(wallet(p), d.id, '2026-11-25');
    assert.ok(r.ok && r.wallet.coins === 0);
  }
});

test('set: eksik parçalar %25 indirimli, sahip olunan düşülür', () => {
  const set = SETS[0];
  const full = set.items.reduce((n, id) => n + itemById(id)!.price, 0);
  const w = wallet(100000);
  assert.ok(setPrice(w, set) < full);
  const one = buyItem(w, set.items[0]);
  assert.ok(one.ok);
  if (!one.ok) return;
  assert.ok(setPrice(one.wallet, set) < setPrice(w, set));
  const r = buySet(one.wallet, set.id);
  assert.ok(r.ok);
  if (!r.ok) return;
  for (const id of set.items) assert.ok(r.wallet.owned.includes(id));
  assert.deepEqual(buySet(r.wallet, set.id), { ok: false, reason: 'owned' });
  const col = collection(r.wallet);
  assert.equal(col.owned, set.items.length);
});
