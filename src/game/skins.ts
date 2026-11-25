// Marketteki kozmetiklerin görünümü. Kimlikler core/market.ts ile aynı.

import { UI } from './palette';

export interface Theme {
  bg: string;
  board: string;
  rail: string;
  railEdge: string;
  /** Ray üzerindeki durak noktaları */
  stop: string;
  panel: string;
}

export const THEMES: Record<string, Theme> = {
  'theme:gece': { bg: UI.bg, board: '#0A1424', rail: UI.rail, railEdge: UI.railEdge, stop: '#56CCF2', panel: UI.bg2 },
  'theme:okyanus': { bg: '#0B1A28', board: '#071320', rail: '#14405A', railEdge: '#2A7BA0', stop: '#3FA3C8', panel: '#123049' },
  'theme:orman': { bg: '#0E1A13', board: '#08120C', rail: '#25432D', railEdge: '#4C8458', stop: '#6FB07C', panel: '#1A3022' },
  'theme:gunbatimi': { bg: '#22111B', board: '#170A12', rail: '#5A2A3C', railEdge: '#C0684E', stop: '#F2A65A', panel: '#3A1B2A' },
  'theme:neon': { bg: '#08070F', board: '#040309', rail: '#1C1238', railEdge: '#B04CFF', stop: '#3DF5FF', panel: '#18112E' },
  'theme:kiraz': { bg: '#1E0D14', board: '#14070D', rail: '#4A1A2C', railEdge: '#D2496E', stop: '#FF8FAE', panel: '#341424' },
  'theme:buzul': { bg: '#0E1C26', board: '#0A1620', rail: '#2A5468', railEdge: '#9FDCF2', stop: '#E4F7FF', panel: '#183444' },
  'theme:lav': { bg: '#1A0A06', board: '#120503', rail: '#4A1A0C', railEdge: '#FF6A2A', stop: '#FFC14A', panel: '#331208' },
  'theme:galaksi': { bg: '#0A0818', board: '#05040F', rail: '#24184A', railEdge: '#7A6BFF', stop: '#FFE680', panel: '#1A1438' },
};

export const themeFor = (id: string): Theme => THEMES[id] ?? THEMES['theme:gece'];

export type FloxStyle = 'damla' | 'parlak' | 'kup' | 'elmas' | 'halka' | 'gozlu';
export const floxStyleFor = (id: string): FloxStyle => (id.split(':')[1] as FloxStyle) || 'damla';

export type CellStyle = 'klasik' | 'boncuk' | 'karo' | 'seker' | 'tugla' | 'kristal';
export const cellStyleFor = (id: string): CellStyle => (id.split(':')[1] as CellStyle) || 'klasik';

export type TrailStyle = 'standart' | 'kivilcim' | 'kuyruk' | 'gokkusagi' | 'baloncuk';
export const trailStyleFor = (id: string): TrailStyle => (id.split(':')[1] as TrailStyle) || 'standart';

export type PopStyle = 'standart' | 'halka' | 'konfeti' | 'yildiz';
export const popStyleFor = (id: string): PopStyle => (id.split(':')[1] as PopStyle) || 'standart';

/** Vitrin kaidesi: kutu rengi, alt şerit, kenar */
export interface Pedestal {
  bg: string;
  base: string;
  border: string;
}
export const PEDESTALS: Record<string, Pedestal> = {
  'pedestal:sade': { bg: UI.panel, base: UI.gold, border: 'transparent' },
  'pedestal:ahsap': { bg: '#3B2A1E', base: '#8B5E3C', border: '#5A3E2A' },
  'pedestal:kristal': { bg: '#1B3A4E', base: '#9FDCF2', border: '#6FC3E6' },
  'pedestal:altin': { bg: '#3A2F12', base: '#F2C94C', border: '#F2C94C' },
  'pedestal:neon': { bg: '#18112E', base: '#3DF5FF', border: '#B04CFF' },
};
export const pedestalFor = (id: string): Pedestal => PEDESTALS[id] ?? PEDESTALS['pedestal:sade'];
