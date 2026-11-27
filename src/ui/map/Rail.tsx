// Ray çizimi: noktalar arası döndürülmüş ince çubuklar + traversler. SVG gerekmez.
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { pathLength, Pt, resample } from '../../core/mapLayout';

export function Rail({
  pts,
  color,
  width = 10,
  ties,
  dash,
  spacing = 9,
}: {
  pts: Pt[];
  color: string;
  width?: number;
  /** Traverslerin rengi */
  ties?: string;
  /** Kesikli çizgi (her ikinci parça) */
  dash?: boolean;
  spacing?: number;
}) {
  const parts = useMemo(() => {
    if (pts.length < 2) return [];
    const n = Math.max(2, Math.round(pathLength(pts) / spacing) + 1);
    const p = resample(pts, n);
    return p.slice(1).map((b, i) => {
      const a = p[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, len, ang: Math.atan2(b.y - a.y, b.x - a.x) };
    });
  }, [pts, spacing]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      {ties &&
        parts.map((s, i) =>
          i % 2 === 0 ? (
            <View
              key={`t${i}`}
              style={{
                position: 'absolute',
                left: s.x - 2,
                top: s.y - width,
                width: 4,
                height: width * 2,
                borderRadius: 1,
                backgroundColor: ties,
                transform: [{ rotate: `${s.ang}rad` }],
              }}
            />
          ) : null,
        )}
      {parts.map((s, i) =>
        dash && i % 2 === 1 ? null : (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: s.x - s.len / 2 - (dash ? 0 : 1),
              top: s.y - width / 2,
              width: s.len + (dash ? 0 : 2),
              height: width,
              borderRadius: width / 2,
              backgroundColor: color,
              transform: [{ rotate: `${s.ang}rad` }],
            }}
          />
        ),
      )}
    </View>
  );
}
