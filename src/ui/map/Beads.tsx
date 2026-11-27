// Ray üzerinde akan renkli flox'lar. Tek döngü değeri, her flox kendi aralığıyla.
import React, { useMemo } from 'react';
import { Animated, View } from 'react-native';
import { Pt, resample } from '../../core/mapLayout';
import { COLORS } from '../../game/palette';
import { useLoop } from './motion';

const DEFAULT = [COLORS[0], COLORS[2], COLORS[3], COLORS[5], COLORS[6], COLORS[1]];

export function Beads({
  pts,
  count = 6,
  ms = 7000,
  size = 13,
  off,
  colors = DEFAULT,
}: {
  pts: Pt[];
  count?: number;
  ms?: number;
  size?: number;
  off?: boolean;
  colors?: string[];
}) {
  const t = useLoop(ms, !off);
  const path = useMemo(() => (pts.length >= 2 ? resample(pts, 48) : []), [pts]);
  if (path.length < 2 || off) return null;
  const input = path.map((_, i) => i / (path.length - 1));
  const xs = path.map((p) => p.x - size / 2);
  const ys = path.map((p) => p.y - size / 2);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: count }, (_, i) => {
        const v = Animated.modulo(Animated.add(t, i / count), 1);
        const c = colors[i % colors.length];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 3.5,
              backgroundColor: c,
              shadowColor: c,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.55)',
              transform: [
                { translateX: v.interpolate({ inputRange: input, outputRange: xs }) },
                { translateY: v.interpolate({ inputRange: input, outputRange: ys }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
