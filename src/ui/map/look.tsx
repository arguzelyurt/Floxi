// Harita ekranlarının ortak görünümü (seçilen "Ray Adaları" tasarımı):
// gökyüzü geçişi, coin hapı, geri düğmesi, renkler ve piksel ağaç.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const C = {
  gold: '#FFC93C',
  goldLight: '#FFE08A',
  goldDark: '#C98A00',
  green: '#3DDC97',
  greenLight: '#E9FFF4',
  greenText: '#0F3D2A',
  track: '#2A2650',
  ties: '#6B4A2E',
  pill: 'rgba(20,18,43,0.62)',
  sheet: '#221F45',
  sheetEdge: '#3A3668',
  inset: '#1A1838',
  text: '#FFFFFF',
  dim: '#B7B3DA',
  sky: '#C9D3FF',
  purple: '#5C46A3',
  lockedTop: '#55608F',
  lockedRock: '#3E3550',
};

const STOPS: [number, number[]][] = [
  [0, [0x2b, 0x3f, 0x86]],
  [0.55, [0x1b, 0x2a, 0x5e]],
  [1, [0x14, 0x12, 0x2b]],
];

function colorAt(t: number): string {
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    const [a, ca] = STOPS[i - 1];
    if (t <= b) {
      const k = (t - a) / (b - a);
      const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return 'rgb(20,18,43)';
}

/** Yukarıdan aşağı gökyüzü geçişi (ek paket gerektirmez: ince şeritler) */
export function Sky() {
  const bands = useMemo(() => Array.from({ length: 36 }, (_, i) => colorAt(i / 35)), []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bands.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c, marginTop: i ? -1 : 0 }} />
      ))}
    </View>
  );
}

export function CoinIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.5, height: size * 0.5, borderRadius: size, borderWidth: 2, borderColor: C.goldDark }} />
    </View>
  );
}

export function CoinPill({ coins, onPress }: { coins: number; onPress(): void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.coin}>
      <CoinIcon />
      <Text style={s.coinText}>{coins.toLocaleString('tr-TR')}</Text>
    </Pressable>
  );
}

export function BackPill({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.back}>
      <View style={s.chev} />
      <Text style={s.backText}>{label}</Text>
    </Pressable>
  );
}

/** Rengi karartır/açar (-1..1) */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k),
  );
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

const TREE = ['...GG...', '..GGGG..', '.GGGGGG.', 'GGGGGGGG', '..GGGG..', '...bb...', '...bb...', '..bbbb..'];

/** 8x8 piksel ağaç */
export function PixelTree({ cell = 4, leaf = '#2BB57A', trunk = '#A8693B' }: { cell?: number; leaf?: string; trunk?: string }) {
  return (
    <View style={{ width: cell * 8 }}>
      {TREE.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.split('').map((k, x) => (
            <View key={x} style={{ width: cell, height: cell, backgroundColor: k === 'G' ? leaf : k === 'b' ? trunk : 'transparent' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  coin: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.pill, borderRadius: 999, paddingVertical: 8, paddingLeft: 8, paddingRight: 14 },
  coinText: { color: C.text, fontSize: 17, fontWeight: '800' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 14, paddingRight: 16, borderRadius: 999, backgroundColor: C.pill },
  chev: { width: 10, height: 10, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: C.text, transform: [{ rotate: '45deg' }], marginLeft: 2 },
  backText: { color: C.text, fontSize: 15, fontWeight: '700' },
});
