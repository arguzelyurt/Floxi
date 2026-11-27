// Harita içinde bir durağa dokununca alttan zıplayarak açılan seviye kartı.
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { isHardLevel } from '../core/generator';
import { Pt } from '../core/mapLayout';
import { mapForLevel } from '../core/maps';
import { coinsForLevel } from '../core/monetization';
import { isPictureLevel, pictureAt } from '../game/mapThemes';
import { COLORS } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Beads } from './map/Beads';
import { Chest } from './map/Island';
import { C, CoinIcon } from './map/look';
import { Move, useReduceMotion } from './map/motion';
import { mapName } from './MapsScreen';
import PixelArt from './PixelArt';

const B = 132;

export default function LevelSheet({
  n,
  progress,
  onClose,
  onPlay,
}: {
  n: number | null;
  progress: Progress;
  onClose(): void;
  onPlay(n: number, replay: boolean): void;
}) {
  const still = useReduceMotion();
  const up = useRef(new Animated.Value(420)).current;
  useEffect(() => {
    if (n === null) return;
    up.setValue(still ? 0 : 420);
    if (!still)
      Animated.spring(up, { toValue: 0, useNativeDriver: true, friction: 7, tension: 70 }).start();
  }, [n, still, up]);
  const ring = useMemo<Pt[]>(() => {
    const a = 6;
    const b = B - 6;
    return [
      { x: a + 14, y: a },
      { x: b - 14, y: a },
      { x: b, y: a + 14 },
      { x: b, y: b - 14 },
      { x: b - 14, y: b },
      { x: a + 14, y: b },
      { x: a, y: b - 14 },
      { x: a, y: a + 14 },
      { x: a + 14, y: a },
    ];
  }, []);

  if (n === null) return null;
  const m = mapForLevel(n);
  const level = progress.level;
  const done = n < level;
  const cur = n === level;
  const s = progress.stars[`L${n}`] ?? 0;
  const pic = isPictureLevel(n);
  const hard = isHardLevel(n);
  let nextPic = 0;
  for (let k = Math.max(n, level); k <= m.end; k++)
    if (isPictureLevel(k)) {
      nextPic = k;
      break;
    }
  const left = m.end - level + 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.back')} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: up }] }]}>
        <View style={styles.handle} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.small}>
              {mapName(m.key)} · {n - m.start + 1} / {m.end - m.start + 1}
            </Text>
            <Text style={styles.title}>
              {t('common.level', { n })}
              {hard ? t('common.hardSuffix') : ''}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <View style={[styles.x, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.x, { transform: [{ rotate: '-45deg' }] }]} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ width: B, height: B }}>
            <View style={styles.track} />
            <View style={styles.board}>
              {pic ? (
                <PixelArt pic={pictureAt(n)} size={76} silhouette={!done} />
              ) : (
                <View style={{ width: 80, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: 64 }, (_, i) => (
                    <View
                      key={i}
                      style={{ width: 10, height: 10, backgroundColor: (i * 13 + n * 7) % 9 === 0 ? '#3A3668' : COLORS[(i * i * 31 + i * 7 + n * 13) % 7] }}
                    />
                  ))}
                </View>
              )}
            </View>
            <Beads pts={ring} count={4} ms={4000} size={11} off={still} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={styles.stars} accessibilityLabel={`${s}/3`}>
              {'★'.repeat(s) + '☆'.repeat(3 - s)}
            </Text>
            {!done && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View>
                  <CoinIcon size={26} />
                  <Move kind="twinkle" ms={1600} off={still} style={{ position: 'absolute', right: -4, top: -4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10 }}>✦</Text>
                  </Move>
                </View>
                <Text style={styles.coins}>+{coinsForLevel(3, hard)}</Text>
              </View>
            )}
            <Text style={styles.note}>{done ? t('maps.replayNote') : t('maps.tip')}</Text>
          </View>
        </View>

        {!done && (
          <View style={styles.info}>
            <View style={styles.infoRow}>
              <Chest size={26} />
              <Text style={styles.infoText}>{t('maps.rewardIn', { n: left })}</Text>
            </View>
            {nextPic > 0 && (
              <View style={styles.infoRow}>
                <Move kind="twinkle" ms={1600} off={still} style={styles.qBox}>
                  <Text style={styles.q}>?</Text>
                </Move>
                <Text style={styles.infoText}>{t('maps.pictureAt', { n: nextPic })}</Text>
              </View>
            )}
          </View>
        )}

        {cur || done ? (
          <Move kind="pulse" ms={1300} off={still || done}>
            <Pressable onPress={() => onPlay(n, done)} style={[styles.play, done && styles.replay]} accessibilityRole="button">
              <Text style={[styles.playText, done && { color: C.text }]}>{done ? t('maps.replay') : t('maps.play')}</Text>
            </Pressable>
          </Move>
        ) : (
          <View style={[styles.play, styles.locked]}>
            <Text style={[styles.playText, { color: C.dim, fontSize: 17 }]}>{t('maps.lockedLevel', { n: level })}</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,9,26,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 3,
    borderColor: C.gold,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 14,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#4B4590' },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  small: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: C.text, fontSize: 30, fontWeight: '900' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2E2A5C', alignItems: 'center', justifyContent: 'center' },
  x: { position: 'absolute', width: 18, height: 2.5, borderRadius: 2, backgroundColor: C.text },
  track: { position: 'absolute', left: 6, top: 6, width: B - 12, height: B - 12, borderRadius: 18, borderWidth: 10, borderColor: C.track },
  board: {
    position: 'absolute',
    left: 26,
    top: 26,
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: C.inset,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: { color: C.gold, fontSize: 30, letterSpacing: 2 },
  coins: { color: C.text, fontSize: 17, fontWeight: '800' },
  note: { color: C.dim, fontSize: 13, fontWeight: '600' },
  info: { backgroundColor: C.inset, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1 },
  qBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: C.gold, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  q: { color: C.goldLight, fontSize: 12, fontWeight: '900' },
  play: { minHeight: 58, borderRadius: 999, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, borderBottomColor: C.goldDark },
  replay: { backgroundColor: '#3A3668', borderBottomColor: '#2A2650' },
  locked: { backgroundColor: C.inset, borderBottomColor: C.inset },
  playText: { color: '#2A1C00', fontSize: 21, fontWeight: '800' },
});
