// Her haritanın ada renkleri ve ada üstündeki resim (haritanın ilk koleksiyon resmi).
import { MapDef } from '../core/maps';
import { Picture, PICTURES } from '../core/pictures';

export interface IslandTheme {
  /** Ada yüzeyi */
  top: string;
  /** Harita içindeki zemin */
  ground: string;
  rock: string;
}

const T = (top: string, ground: string, rock = '#7A5535'): IslandTheme => ({ top, ground, rock });

export const ISLAND_THEMES: IslandTheme[] = [
  T('#7BD88F', '#2C6B47'), // çayır
  T('#3BCE7A', '#1F5A3C'), // orman
  T('#56CCF2', '#1D5677'), // göl
  T('#E9C46A', '#7A5A22', '#8A5A2B'), // çöl
  T('#F4D58D', '#6E6233', '#8A5A2B'), // sahil
  T('#2EC4B6', '#145E58'), // tropikler
  T('#E07A5F', '#6E3326', '#5E3A26'), // kanyon
  T('#A7B4C8', '#3D4A60', '#4F5566'), // dağ
  T('#BDE0FE', '#3F6584', '#5A6F84'), // buzul
  T('#E8453C', '#5E2222', '#3A2A2A'), // yanardağ
  T('#F15BB5', '#6A2453'), // mercan
  T('#A0C4FF', '#34507E', '#5A6F9A'), // gökyüzü
  T('#9B5DE5', '#3F2766', '#4A3A6A'), // kutup ışıkları
  T('#D8D8E8', '#4A4A64', '#5C5C74'), // ay
  T('#C77DFF', '#4B2A6E', '#4A3A6A'), // nebula
  T('#7B6CF6', '#2E2A6E', '#3E3A72'), // galaksi
];

export const islandTheme = (i: number): IslandTheme => ISLAND_THEMES[i % ISLAND_THEMES.length];

/** Koleksiyon resmi seviyeleri: 5, 15, 25 … */
export const isPictureLevel = (n: number): boolean => n % 10 === 5;
export const pictureAt = (n: number): Picture => PICTURES[((n - 5) / 10) % PICTURES.length];

/** Haritanın ilk resim seviyesi (her harita en az 10 seviye, yani en az bir resim içerir) */
export function firstPictureLevel(m: MapDef): number {
  let n = m.start;
  while (!isPictureLevel(n)) n++;
  return n;
}
