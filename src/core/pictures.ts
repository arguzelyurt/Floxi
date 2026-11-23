// Elle çizilmiş resimler. '.' boş, rakam = paletteki renk indeksi (src/game/palette.ts).
// Renkler: 0 kırmızı, 1 turuncu, 2 sarı, 3 yeşil, 4 turkuaz, 5 mavi, 6 mor, 7 pembe, 8 krem, 9 kahve

import { Cell, EMPTY } from './rules';
import { Key, t } from '../i18n';

/** Resmin dile göre adı */
export const pictureName = (key: string): string => (key ? t(`pic.${key}` as Key) : '');

export interface Picture {
  /** Çeviri anahtarı (pic.<key>); rastgele resimlerde boş */
  key: string;
  title: string;
  w: number;
  h: number;
  cells: Cell[];
}

const RAW: { key: string; title: string; rows: string[] }[] = [
  {
    key: 'heart',
    title: 'Kalp',
    rows: [
      '.000..000.',
      '0770000000',
      '0700000000',
      '0000000000',
      '0000000000',
      '.00000000.',
      '..000000..',
      '...0000...',
      '....00....',
    ],
  },
  {
    key: 'star',
    title: 'Yıldız',
    rows: [
      '....2....',
      '...222...',
      '222222222',
      '.2221222.',
      '..21112..',
      '..22122..',
      '.222.222.',
      '.22...22.',
      '2.......2',
    ],
  },
  {
    key: 'mushroom',
    title: 'Mantar',
    rows: [
      '...0000...',
      '.00880000.',
      '0088000880',
      '0000000880',
      '0880000000',
      '0000880000',
      '..888888..',
      '...8888...',
      '...8888...',
      '..888888..',
    ],
  },
  {
    key: 'fish',
    title: 'Balık',
    rows: [
      '...5555...4',
      '.555555..44',
      '55255555444',
      '55555555444',
      '55555555444',
      '.555555..44',
      '...5555...4',
    ],
  },
  {
    key: 'tree',
    title: 'Elma Ağacı',
    rows: [
      '...333...',
      '..33333..',
      '.3303333.',
      '333333033',
      '330333333',
      '333333303',
      '.3333333.',
      '...999...',
      '...999...',
      '..99999..',
    ],
  },
  {
    key: 'house',
    title: 'Ev',
    rows: [
      '....00....',
      '...0000...',
      '..000000..',
      '.00000000.',
      '0000000000',
      '.22222222.',
      '.25522222.',
      '.25522992.',
      '.22222992.',
      '.22222992.',
    ],
  },
  {
    key: 'rocket',
    title: 'Roket',
    rows: [
      '....0....',
      '...000...',
      '...888...',
      '..88888..',
      '..85558..',
      '..85558..',
      '..88888..',
      '..88888..',
      '.0888880.',
      '008888800',
      '0..121..0',
      '....2....',
    ],
  },
  {
    key: 'icecream',
    title: 'Dondurma',
    rows: [
      '....0....',
      '...777...',
      '.7777777.',
      '777787777',
      '778777877',
      '.7777777.',
      '999999999',
      '.9919199.',
      '.9199919.',
      '..99199..',
      '...999...',
      '....9....',
    ],
  },
  {
    key: 'cactus',
    title: 'Kaktüs',
    rows: [
      '....7....',
      '...333...',
      '3..333...',
      '3..333.3.',
      '33.333.3.',
      '.33333.3.',
      '...33333.',
      '...333...',
      '.1111111.',
      '..99999..',
      '..99999..',
    ],
  },
  {
    key: 'butterfly',
    title: 'Kelebek',
    rows: [
      '66.......66',
      '6766...6676',
      '67266.66276',
      '66666966666',
      '.666696666.',
      '..7769677..',
      '.772.9.277.',
      '.777.9.777.',
      '..7.....7..',
    ],
  },
];

function parse(key: string, title: string, rows: string[]): Picture {
  const w = rows[0].length;
  rows.forEach((r) => {
    if (r.length !== w) throw new Error(`${title}: satır uzunluğu farklı`);
  });
  const cells: Cell[] = [];
  for (const r of rows) for (const ch of r) cells.push(ch === '.' ? EMPTY : Number(ch));
  return { key, title, w, h: rows.length, cells };
}

export const PICTURES: Picture[] = RAW.map((p) => parse(p.key, p.title, p.rows));
