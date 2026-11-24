// Harita ödülünü bir kez verir (mapsClaimed ile çift ödül engellenir).
import { MAPS, mapComplete } from '../core/maps';
import type { Progress } from './storage';

export function grantMapReward(p: Progress, index: number, levelNow = p.level): Progress {
  const m = MAPS[index];
  if (!m || p.mapsClaimed.includes(index) || !mapComplete(m, levelNow)) return p;
  const boosters = { ...p.boosters };
  for (const [k, v] of Object.entries(m.reward.boosters)) boosters[k as keyof typeof boosters] += v ?? 0;
  return { ...p, coins: p.coins + m.reward.coins, boosters, mapsClaimed: [...p.mapsClaimed, index] };
}
