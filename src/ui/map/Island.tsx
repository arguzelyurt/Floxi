// Yüzen ada: üstte elips yüzey, altında basamaklı piksel kaya.
import React from 'react';
import { View } from 'react-native';

/** Yüzen ada: üstte elips yüzey, altında sivri, kırık kenarlı kaya. */
export function IslandBody({ w, top, rock, glow }: { w: number; top: string; rock: string; glow?: boolean }) {
  const h = Math.round(w * 0.27);
  const rw = Math.round(w * 0.8);
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: w,
          height: h,
          borderRadius: w / 2,
          backgroundColor: top,
          borderBottomWidth: 6,
          borderBottomColor: 'rgba(0,0,0,0.18)',
          zIndex: 1,
          ...(glow
            ? { shadowColor: '#FFC93C', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }
            : null),
        }}
      />
      <View style={{ width: rw, height: Math.round(w * 0.36), marginTop: -4 }}>
        {/* ana sivri kaya */}
        <View style={tri(rw, Math.round(w * 0.36), rock, 0, 0)} />
        {/* soldaki kırık parça */}
        <View style={tri(Math.round(rw * 0.5), Math.round(w * 0.22), rock, 0, 0)} />
        {/* sağdaki kırık parça, biraz koyu */}
        <View style={tri(Math.round(rw * 0.42), Math.round(w * 0.18), 'rgba(0,0,0,0.18)', Math.round(rw * 0.58), 0)} />
      </View>
    </View>
  );
}

/** Aşağı bakan üçgen (kenarlıklarla) */
function tri(w: number, h: number, color: string, left: number, top: number) {
  return {
    position: 'absolute' as const,
    left,
    top,
    width: 0,
    height: 0,
    borderLeftWidth: w / 2,
    borderRightWidth: w / 2,
    borderTopWidth: h,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: color,
  };
}

/** Geniş ada zemini altındaki sivri kaya (harita içi) */
export function RockBase({ w, rock }: { w: number; rock: string }) {
  const rw = Math.round(w * 0.8);
  return (
    <View style={{ width: rw, height: 64, alignSelf: 'center', marginTop: -2 }}>
      <View style={tri(rw, 64, rock, 0, 0)} />
      <View style={tri(Math.round(rw * 0.45), 40, rock, Math.round(rw * 0.02), 0)} />
      <View style={tri(Math.round(rw * 0.35), 30, 'rgba(0,0,0,0.18)', Math.round(rw * 0.62), 0)} />
    </View>
  );
}

/** Basit piksel bulut */
export function Cloud({ w = 90, opacity = 0.3 }: { w?: number; opacity?: number }) {
  return (
    <View style={{ width: w, height: w * 0.42, opacity }}>
      <View style={{ position: 'absolute', left: w * 0.2, top: 0, width: w * 0.45, height: w * 0.3, borderRadius: w, backgroundColor: '#DDE6F5' }} />
      <View style={{ position: 'absolute', left: 0, top: w * 0.14, width: w, height: w * 0.28, borderRadius: w, backgroundColor: '#DDE6F5' }} />
    </View>
  );
}

/** Kilit ikonu (çizim) */
export function Lock({ size = 30 }: { size?: number }) {
  const s = size / 30;
  return (
    <View style={{ width: size, height: size * 1.15, alignItems: 'center' }}>
      <View style={{ width: 16 * s, height: 14 * s, borderWidth: 4 * s, borderBottomWidth: 0, borderColor: '#F2C94C', borderTopLeftRadius: 8 * s, borderTopRightRadius: 8 * s }} />
      <View style={{ width: 26 * s, height: 20 * s, borderRadius: 4 * s, backgroundColor: '#F2C94C', alignItems: 'center', paddingTop: 5 * s }}>
        <View style={{ width: 4 * s, height: 8 * s, borderRadius: 2 * s, backgroundColor: '#7A5600' }} />
      </View>
    </View>
  );
}

/** Ödül sandığı (çizim) */
export function Chest({ size = 34, open }: { size?: number; open?: boolean }) {
  const s = size / 34;
  return (
    <View style={{ width: 34 * s, height: 30 * s }}>
      <View style={{ position: 'absolute', left: 2 * s, top: 10 * s, width: 30 * s, height: 18 * s, borderRadius: 3 * s, backgroundColor: '#C9772B' }} />
      <View
        style={{
          position: 'absolute',
          left: 2 * s,
          top: open ? 0 : 4 * s,
          width: 30 * s,
          height: 10 * s,
          borderRadius: 4 * s,
          backgroundColor: '#E58E3A',
          transform: open ? [{ rotate: '-18deg' }] : [],
        }}
      />
      <View style={{ position: 'absolute', left: 14 * s, top: 9 * s, width: 6 * s, height: 8 * s, borderRadius: 1, backgroundColor: '#F2C94C' }} />
    </View>
  );
}

/** Uçan piksel kuş (üç kare) */
export function Bird({ color }: { color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      <View style={{ width: 7, height: 4, marginTop: 2, backgroundColor: color }} />
      <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: color }} />
      <View style={{ width: 7, height: 4, marginTop: 2, backgroundColor: color }} />
    </View>
  );
}
