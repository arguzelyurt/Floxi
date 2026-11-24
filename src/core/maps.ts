// Haritalar: seviyeler haritalara bölünür. Haritalar ilerledikçe uzar (10 → 45 seviye),
// her harita bitince ödül verilir (coin + güçlendirici). 16 harita, toplam 400 seviye.
// 400'den sonra oyun sonsuz seviyelerle sürer; haritaların hepsi tamamlanmış görünür.

import { Booster } from './monetization';

export interface MapReward {
  coins: number;
  boosters: Partial<Record<Booster, number>>;
}

export interface MapDef {
  index: number;
  /** Çeviri anahtarı: map.<key> */
  key: string;
  icon: string;
  /** İlk ve son seviye (dahil) */
  start: number;
  end: number;
  reward: MapReward;
}

/** Harita başına seviye sayısı: önce kısa, sonra giderek uzun */
const SIZES = [10, 10, 12, 13, 15, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 45];

const META: { key: string; icon: string }[] = [
  { key: 'meadow', icon: '🌼' },
  { key: 'forest', icon: '🌲' },
  { key: 'lake', icon: '💧' },
  { key: 'desert', icon: '🌵' },
  { key: 'beach', icon: '🏖️' },
  { key: 'tropics', icon: '🌴' },
  { key: 'canyon', icon: '🏜️' },
  { key: 'mountain', icon: '⛰️' },
  { key: 'glacier', icon: '🧊' },
  { key: 'volcano', icon: '🌋' },
  { key: 'reef', icon: '🐠' },
  { key: 'sky', icon: '☁️' },
  { key: 'aurora', icon: '🌌' },
  { key: 'moon', icon: '🌙' },
  { key: 'nebula', icon: '✨' },
  { key: 'galaxy', icon: '🪐' },
];

/** Harita ödülü: ilerledikçe büyür */
export function rewardFor(i: number): MapReward {
  const boosters: Partial<Record<Booster, number>> = {
    undo: 2 + Math.floor(i / 2),
    hint: 1 + Math.floor(i / 3),
  };
  if (i >= 1) boosters.pick = 1 + Math.floor(i / 4);
  if (i >= 3) boosters.extraSlot = 1 + Math.floor(i / 6);
  return { coins: 100 + 50 * i + (i === SIZES.length - 1 ? 1000 : 0), boosters };
}

export const MAPS: MapDef[] = (() => {
  let start = 1;
  return SIZES.map((size, i) => {
    const m = { index: i, ...META[i], start, end: start + size - 1, reward: rewardFor(i) };
    start += size;
    return m;
  });
})();

export const TOTAL_LEVELS = MAPS[MAPS.length - 1].end;

/** Seviyenin ait olduğu harita (400'den sonrası: son harita) */
export function mapForLevel(n: number): MapDef {
  return MAPS.find((m) => n <= m.end) ?? MAPS[MAPS.length - 1];
}

/** Bu seviye bir haritanın son seviyesi mi? */
export const mapEndingAt = (n: number): MapDef | undefined => MAPS.find((m) => m.end === n);

/** Oynanacak seviye `level` iken haritadaki ilerleme (bitirilen / toplam) */
export function mapProgress(m: MapDef, level: number): { done: number; total: number } {
  const total = m.end - m.start + 1;
  return { done: Math.max(0, Math.min(total, level - m.start)), total };
}

export const mapComplete = (m: MapDef, level: number): boolean => level > m.end;
export const mapUnlocked = (m: MapDef, level: number): boolean => level >= m.start;
