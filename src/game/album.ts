// Koleksiyon albümü: elle çizilmiş resimler 5, 15, 25… seviyelerde gelir (generator.levelFor).
// Bir resim, ilk geldiği seviye bitirilince albüme girer. Ayrı kayıt tutulmaz, yıldızlardan türetilir.

import { Picture, PICTURES } from '../core/pictures';
import type { Progress } from './storage';

export interface AlbumEntry {
  pic: Picture;
  level: number;
  done: boolean;
  stars: number;
}

export const albumLevelFor = (index: number): number => 5 + 10 * index;

export function albumEntries(p: Progress): AlbumEntry[] {
  return PICTURES.map((pic, i) => {
    const level = albumLevelFor(i);
    const stars = p.stars[`L${level}`] ?? 0;
    return { pic, level, done: stars > 0, stars };
  });
}
