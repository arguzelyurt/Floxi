import React from 'react';
import { View } from 'react-native';
import { Picture } from '../core/pictures';
import { EMPTY } from '../core/rules';
import { COLORS, UI } from '../game/palette';

/** Küçük piksel resim. silhouette: renksiz (henüz açılmamış) gösterim. */
export default function PixelArt({ pic, size, silhouette }: { pic: Picture; size: number; silhouette?: boolean }) {
  const cs = Math.floor(size / Math.max(pic.w, pic.h));
  return (
    <View style={{ width: cs * pic.w, height: cs * pic.h }}>
      {Array.from({ length: pic.h }, (_, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {Array.from({ length: pic.w }, (_, x) => {
            const c = pic.cells[y * pic.w + x];
            return (
              <View
                key={x}
                style={{
                  width: cs,
                  height: cs,
                  backgroundColor: c === EMPTY ? 'transparent' : silhouette ? UI.secret : COLORS[c],
                  borderRadius: cs / 5,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
