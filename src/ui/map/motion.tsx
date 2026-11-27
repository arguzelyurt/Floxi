// Haritanın hafif, döngülü animasyonları. Hepsi native driver ile çalışır.
// "Hareketi azalt" açıksa döngüler durur, her şey yerinde durağan görünür.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, ViewStyle } from 'react-native';

export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setOn(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

/** 0 → 1 arası sürekli dönen değer. phase (0-1) ile başlangıç kaydırılır. */
export function useLoop(ms: number, enabled = true, phase = 0): Animated.Value {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) {
      v.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }),
    );
    a.start();
    return () => a.stop();
  }, [ms, enabled, v]);
  // Animated.modulo da interpolate destekler; tek tipte döndürülür
  return useMemo(() => (phase ? (Animated.modulo(Animated.add(v, phase), 1) as unknown as Animated.Value) : v), [v, phase]);
}

type Kind = 'bob' | 'pulse' | 'wiggle' | 'drift' | 'twinkle' | 'hop' | 'sway' | 'ring';

const RANGES: Record<Kind, { prop: string; out: (number | string)[] }> = {
  bob: { prop: 'translateY', out: [0, -1, 0] },
  hop: { prop: 'translateY', out: [0, -1, 0] },
  pulse: { prop: 'scale', out: [1, 1.07, 1] },
  wiggle: { prop: 'rotate', out: ['0deg', '0deg', '-14deg', '14deg', '0deg'] },
  drift: { prop: 'translateX', out: [-1, 1, -1] },
  sway: { prop: 'rotate', out: ['-4deg', '4deg', '-4deg'] },
  twinkle: { prop: 'opacity', out: [0.25, 1, 0.25] },
  ring: { prop: 'scale', out: [0.95, 1.35] },
};

/** Çocuğunu döngülü hareket ettirir. amp: bob/hop/drift için piksel. */
export function Move({
  kind,
  ms = 3000,
  phase = 0,
  amp = 5,
  off,
  style,
  children,
}: {
  kind: Kind;
  ms?: number;
  phase?: number;
  amp?: number;
  /** true ise durağan */
  off?: boolean;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}) {
  const t = useLoop(ms, !off, phase);
  const r = RANGES[kind];
  const input =
    kind === 'wiggle' ? [0, 0.84, 0.9, 0.95, 1] : kind === 'ring' ? [0, 1] : [0, 0.5, 1];
  const output = typeof r.out[0] === 'number' && (kind === 'bob' || kind === 'hop' || kind === 'drift')
    ? (r.out as number[]).map((x) => x * amp)
    : r.out;
  const val = t.interpolate({ inputRange: input, outputRange: output as number[] & string[] });
  const anim: Record<string, unknown> =
    r.prop === 'opacity' ? { opacity: off ? 1 : val } : { transform: [{ [r.prop]: off ? (r.prop === 'rotate' ? '0deg' : r.prop === 'scale' ? 1 : 0) : val }] };
  if (kind === 'ring' && !off) anim.opacity = t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
  if (kind === 'ring' && off) anim.opacity = 0;
  return <Animated.View style={[style as ViewStyle, anim as ViewStyle]}>{children}</Animated.View>;
}
