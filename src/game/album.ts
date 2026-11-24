// Koleksiyon albümü: elle çizilmiş resimler 5, 15, 25… seviyelerde gelir (generator.levelFor).
// Bir resim, ilk geldiği seviye bitirilince albüme girer. Ayrı kayıt tutulmaz, yıldızlardan türetilir.
// Açılan resimler vitrine konabilir (ana sayfada sergilenir).

import { Picture, PICTURES } from '../core/pictures';
import type { Progress } from './storage';

export interface AlbumEntry {
  pic: Picture;
  level: number;
  done: boolean;
  stars: number;
}

export const SHOWCASE_SIZE = 3;

export const albumLevelFor = (index: number): number => 5 + 10 * index;

export function albumEntries(p: Progress): AlbumEntry[] {
  return PICTURES.map((pic, i) => {
    const level = albumLevelFor(i);
    const stars = p.stars[`L${level}`] ?? 0;
    return { pic, level, done: stars > 0, stars };
  });
}

/** Vitrindeki açılmış resimler (sırayla) */
export function showcaseEntries(p: Progress): AlbumEntry[] {
  const entries = albumEntries(p);
  return p.showcase
    .map((k) => entries.find((e) => e.pic.key === k))
    .filter((e): e is AlbumEntry => !!e && e.done);
}

/** Resmi vitrine koy / vitrinden kaldır. Vitrin doluysa en eski çıkar. Açılmamış resim konamaz. */
export function toggleShowcase(p: Progress, key: string): Progress {
  const entry = albumEntries(p).find((e) => e.pic.key === key);
  if (!entry?.done) return p;
  const cur = p.showcase.filter((k) => k !== key);
  const showcase = cur.length < p.showcase.length ? cur : [...cur, key].slice(-SHOWCASE_SIZE);
  return { ...p, showcase };
}
