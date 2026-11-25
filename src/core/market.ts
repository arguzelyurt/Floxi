// Coin marketi: oyunda biriken coin'lerle alınan şeyler. Saf mantık (test edilir).
// Gerçek para ile satış ayrı: o "Dükkan" (services/iap + ui/ShopSheet).
//
// Kozmetiklerin nadirliği var (fiyat basamağı), bazıları harita bitince ücretsiz açılır,
// her gün 3 ürün indirimli (Günün fırsatı, tarihten türetilir), setler %25 indirimli.

import { Booster } from './monetization';
import { MAPS } from './maps';
import { hashSeed, mulberry32, shuffle } from './rng';
import { Key, t } from '../i18n';

export type CosmeticKind = 'theme' | 'flox' | 'cells' | 'trail' | 'pop' | 'pedestal';
export type ItemKind = 'booster' | CosmeticKind;
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_PRICE: Record<Rarity, number> = { common: 400, rare: 900, epic: 2000, legendary: 4500 };

export interface MarketItem {
  id: string; // ör. 'theme:okyanus'
  kind: ItemKind;
  name: string;
  price: number;
  rarity?: Rarity;
  /** Güçlendirici paketi: ne kadar verir */
  booster?: { kind: Booster; count: number };
  /** Başta ücretsiz gelen */
  free?: boolean;
  /** Bu harita (indeks) bitince ücretsiz açılır */
  unlockMap?: number;
  desc?: string;
}

const c = (id: string, name: string, rarity: Rarity, extra: Partial<MarketItem> = {}): MarketItem => ({
  id,
  kind: id.split(':')[0] as CosmeticKind,
  name,
  rarity,
  price: extra.unlockMap !== undefined ? 0 : RARITY_PRICE[rarity],
  ...extra,
});
const free = (id: string, name: string): MarketItem => ({
  id,
  kind: id.split(':')[0] as CosmeticKind,
  name,
  price: 0,
  free: true,
  rarity: 'common',
});

export const MARKET: MarketItem[] = [
  // Güçlendirici paketleri: tek tek almaktan ~%10-25 ucuz
  { id: 'pack:undo3', kind: 'booster', name: '3 Geri al', price: 80, booster: { kind: 'undo', count: 3 } },
  { id: 'pack:hint3', kind: 'booster', name: '3 İpucu', price: 130, booster: { kind: 'hint', count: 3 } },
  { id: 'pack:pick3', kind: 'booster', name: '3 Öne al', price: 200, booster: { kind: 'pick', count: 3 } },
  { id: 'pack:slot2', kind: 'booster', name: '2 × +1 Yer', price: 250, booster: { kind: 'extraSlot', count: 2 } },
  { id: 'pack:mix', kind: 'booster', name: 'Karışık paket', price: 450, desc: '3 Geri al, 3 İpucu, 2 Öne al, 1 Yer' },

  // Temalar (tahta, ray, arka plan)
  free('theme:gece', 'Gece'),
  c('theme:okyanus', 'Okyanus', 'rare'),
  c('theme:orman', 'Orman', 'rare'),
  c('theme:kiraz', 'Kiraz', 'rare'),
  c('theme:gunbatimi', 'Gün batımı', 'epic'),
  c('theme:neon', 'Neon', 'epic'),
  c('theme:buzul', 'Buzul', 'epic', { unlockMap: 8 }),
  c('theme:lav', 'Lav', 'legendary', { unlockMap: 9 }),
  c('theme:galaksi', 'Galaksi', 'legendary', { unlockMap: 15 }),

  // Flox görünümleri
  free('flox:damla', 'Damla'),
  c('flox:parlak', 'Parlak', 'common'),
  c('flox:kup', 'Küp', 'rare'),
  c('flox:halka', 'Halka', 'rare'),
  c('flox:gozlu', 'Gözlü', 'epic'),
  c('flox:elmas', 'Elmas', 'legendary'),

  // Piksel stilleri
  free('cells:klasik', 'Klasik'),
  c('cells:boncuk', 'Boncuk', 'common'),
  c('cells:karo', 'Karo', 'common'),
  c('cells:seker', 'Şeker', 'rare'),
  c('cells:tugla', 'Tuğla', 'rare'),
  c('cells:kristal', 'Kristal', 'epic'),

  // Flox izi (rayda arkasında kalan)
  free('trail:standart', 'Standart'),
  c('trail:kivilcim', 'Kıvılcım', 'common'),
  c('trail:kuyruk', 'Kuyruklu yıldız', 'rare'),
  c('trail:gokkusagi', 'Gökkuşağı', 'epic'),
  c('trail:baloncuk', 'Baloncuk', 'rare', { unlockMap: 2 }),

  // Patlama efekti (piksel silinince)
  free('pop:standart', 'Standart'),
  c('pop:halka', 'Halka', 'common'),
  c('pop:konfeti', 'Konfeti', 'rare'),
  c('pop:yildiz', 'Yıldız', 'epic', { unlockMap: 12 }),

  // Vitrin kaidesi (ana sayfadaki vitrin)
  free('pedestal:sade', 'Sade'),
  c('pedestal:ahsap', 'Ahşap', 'common'),
  c('pedestal:kristal', 'Kristal', 'rare'),
  c('pedestal:altin', 'Altın', 'epic'),
  c('pedestal:neon', 'Neon', 'legendary'),
];

export interface MarketSet {
  id: string;
  items: string[];
}

/** Setler: eksik parçalar birlikte alınırsa %25 indirim */
export const SETS: MarketSet[] = [
  { id: 'set:okyanus', items: ['theme:okyanus', 'flox:parlak', 'cells:boncuk', 'trail:kivilcim'] },
  { id: 'set:orman', items: ['theme:orman', 'flox:kup', 'cells:tugla', 'pedestal:ahsap'] },
  { id: 'set:neon', items: ['theme:neon', 'flox:gozlu', 'cells:kristal', 'trail:gokkusagi'] },
];
export const SET_DISCOUNT = 0.25;

/** Ürünün ekranda görünen adı ve açıklaması (dile göre). `name`/`desc` alanları Türkçe yedek. */
export const itemName = (m: MarketItem): string => t(`item.${m.id}` as Key);
export const itemDesc = (m: MarketItem): string | undefined => (m.desc ? t(`item.${m.id}.desc` as Key) : undefined);
export const setName = (s: MarketSet): string => t(`item.${s.id}` as Key);

export const MIX_PACK: Record<Booster, number> = { undo: 3, hint: 3, pick: 2, extraSlot: 1 };

export const itemById = (id: string): MarketItem | undefined => MARKET.find((m) => m.id === id);

export type Cosmetics = Record<CosmeticKind, string>;

export const DEFAULT_COSMETICS: Cosmetics = {
  theme: 'theme:gece',
  flox: 'flox:damla',
  cells: 'cells:klasik',
  trail: 'trail:standart',
  pop: 'pop:standart',
  pedestal: 'pedestal:sade',
};

/** Marketin dokunduğu ilerleme alanları */
export interface Wallet {
  coins: number;
  boosters: Record<Booster, number>;
  owned: string[];
  cosmetics: Cosmetics;
  /** Oynanacak seviye: harita kilitleri için */
  level: number;
}

export const mapUnlocked = (w: Wallet, item: MarketItem): boolean =>
  item.unlockMap !== undefined && w.level > (MAPS[item.unlockMap]?.end ?? Infinity);

export const ownsItem = (w: Wallet, item: MarketItem): boolean =>
  !!item.free || w.owned.includes(item.id) || mapUnlocked(w, item);

export const isEquipped = (w: Wallet, item: MarketItem): boolean =>
  item.kind !== 'booster' && w.cosmetics[item.kind] === item.id;

/** Satılan (coin ile alınabilen) kozmetikler */
const forSale = (m: MarketItem) => m.kind !== 'booster' && !m.free && m.unlockMap === undefined;

export interface Deal {
  id: string;
  /** İndirim yüzdesi */
  off: number;
}

/** Günün fırsatı: tarih anahtarından (YYYY-MM-DD) türetilir; herkese aynı, gün boyu sabit. */
export function dailyDeals(dateKey: string): Deal[] {
  const rng = mulberry32(hashSeed(`floxi-deal-${dateKey}`));
  const offs = shuffle([30, 40, 50], rng);
  return shuffle(MARKET.filter(forSale), rng)
    .slice(0, 3)
    .map((m, i) => ({ id: m.id, off: offs[i] }));
}

/** Bugünkü fiyat (fırsattaysa indirimli) */
export function priceFor(item: MarketItem, dateKey?: string): number {
  if (!dateKey || !forSale(item)) return item.price;
  const deal = dailyDeals(dateKey).find((d) => d.id === item.id);
  return deal ? Math.round((item.price * (100 - deal.off)) / 100 / 10) * 10 : item.price;
}

/** Kozmetik koleksiyonu: sahip olunan / toplam (ücretsizler hariç) */
export function collection(w: Wallet): { owned: number; total: number } {
  const all = MARKET.filter((m) => m.kind !== 'booster' && !m.free);
  return { owned: all.filter((m) => ownsItem(w, m)).length, total: all.length };
}

export type BuyResult =
  | { ok: true; wallet: Wallet }
  | { ok: false; reason: 'coins' | 'owned' | 'unknown' | 'locked' };

/** Satın al. Kozmetik alınınca hemen kullanılır. dateKey verilirse Günün fırsatı fiyatı geçerli. */
export function buyItem(w: Wallet, id: string, dateKey?: string): BuyResult {
  const item = itemById(id);
  if (!item) return { ok: false, reason: 'unknown' };
  if (item.kind !== 'booster' && ownsItem(w, item)) return { ok: false, reason: 'owned' };
  if (item.unlockMap !== undefined) return { ok: false, reason: 'locked' };
  const price = priceFor(item, dateKey);
  if (w.coins < price) return { ok: false, reason: 'coins' };
  const next: Wallet = { ...w, coins: w.coins - price, boosters: { ...w.boosters }, cosmetics: { ...w.cosmetics } };
  if (item.kind === 'booster') {
    if (item.booster) next.boosters[item.booster.kind] += item.booster.count;
    else (Object.keys(MIX_PACK) as Booster[]).forEach((k) => (next.boosters[k] += MIX_PACK[k]));
  } else {
    next.owned = [...w.owned, item.id];
    next.cosmetics[item.kind] = item.id;
  }
  return { ok: true, wallet: next };
}

/** Setin eksik parçalarının fiyatı (%25 indirimli), hepsi varsa 0 */
export function setPrice(w: Wallet, set: MarketSet): number {
  const missing = set.items.map(itemById).filter((m): m is MarketItem => !!m && !ownsItem(w, m));
  const sum = missing.reduce((n, m) => n + m.price, 0);
  return Math.round((sum * (1 - SET_DISCOUNT)) / 10) * 10;
}

/** Setin eksik parçalarını birlikte al ve hepsini kullan. */
export function buySet(w: Wallet, id: string): BuyResult {
  const set = SETS.find((s) => s.id === id);
  if (!set) return { ok: false, reason: 'unknown' };
  const price = setPrice(w, set);
  if (price === 0) return { ok: false, reason: 'owned' };
  if (w.coins < price) return { ok: false, reason: 'coins' };
  const items = set.items.map(itemById).filter((m): m is MarketItem => !!m && m.kind !== 'booster');
  const owned = [...w.owned, ...items.filter((m) => !ownsItem(w, m)).map((m) => m.id)];
  const cosmetics = { ...w.cosmetics };
  for (const m of items) cosmetics[m.kind as CosmeticKind] = m.id;
  return { ok: true, wallet: { ...w, coins: w.coins - price, owned, cosmetics } };
}

/** Sahip olunan kozmetiği kullan. */
export function equipItem(w: Wallet, id: string): Wallet {
  const item = itemById(id);
  if (!item || item.kind === 'booster' || !ownsItem(w, item)) return w;
  return { ...w, cosmetics: { ...w.cosmetics, [item.kind]: item.id } };
}
