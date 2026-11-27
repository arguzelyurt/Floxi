// Harita içinde bir durağa dokununca açılan seviye kartı.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isHardLevel } from '../core/generator';
import { Pt } from '../core/mapLayout';
import { mapForLevel } from '../core/maps';
import { coinsForLevel } from '../core/monetization';
import { isPictureLevel, pictureAt } from '../game/mapThemes';
import { COLORS, UI } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Beads } from './map/Beads';
import { Chest } from './map/Island';
import { Move, useReduceMotion } from './map/motion';
import { mapName } from './MapsScreen';
import PixelArt from './PixelArt';
import Sheet from './Sheet';

const B = 120;

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
  const ring = useMemo<Pt[]>(() => {
    const a = 6;
    const b = B - 6;
    return [
      { x: a, y: a },
      { x: b, y: a },
      { x: b, y: b },
      { x: a, y: b },
      { x: a, y: a },
    ];
  }, []);
  if (n === null) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const m = mapForLevel(n);
  const level = progress.level;
  const done = n < level;
  const cur = n === level;
  const s = progress.stars[`L${n}`] ?? 0;
  const pic = isPictureLevel(n);
  const hard = isHardLevel(n);
  const nextPic = (() => {
    for (let k = Math.max(n, level); k <= m.end; k++) if (isPictureLevel(k)) return k;
    return 0;
  })();
  const left = m.end - level + 1;

  return (
    <Sheet visible onClose={onClose}>
      <View style={{ alignSelf: 'stretch', gap: 14 }}>
        <View>
          <Text style={styles.small}>
            {mapName(m.key)} · {n - m.start + 1} / {m.end - m.start + 1}
          </Text>
          <Text style={styles.title}>
            {t('common.level', { n })}
            {hard ? t('common.hardSuffix') : ''}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ width: B, height: B }}>
            <View style={styles.board}>
              {pic ? (
                <PixelArt pic={pictureAt(n)} size={70} silhouette={!done} />
              ) : (
                <View style={{ width: 70, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: 49 }, (_, i) => (
                    <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: (i * 13 + n * 7) % 9 === 0 ? UI.secret : COLORS[(i * i * 31 + i * 7 + n * 13) % 7] }} />
                  ))}
                </View>
              )}
            </View>
            <Beads pts={ring} count={4} ms={4000} size={11} off={still} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.stars}>{'★'.repeat(s) + '☆'.repeat(3 - s)}</Text>
            {!done && <Text style={styles.coins}>● {t('maps.upTo', { n: coinsForLevel(3, hard) })}</Text>}
            {done && <Text style={styles.note}>{t('maps.replayNote')}</Text>}
          </View>
        </View>

        {!done && (
          <View style={styles.info}>
            <View style={styles.infoRow}>
              <Chest size={24} />
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
          <Pressable onPress={() => onPlay(n, done)} style={[styles.play, done && styles.replay]} accessibilityRole="button">
            <Text style={[styles.playText, done && { color: UI.text }]}>{done ? t('maps.replay') : t('maps.play')}</Text>
          </Pressable>
        ) : (
          <View style={[styles.play, styles.locked]}>
            <Text style={[styles.playText, { color: UI.dim }]}>{t('maps.lockedLevel', { n: level })}</Text>
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  small: { color: UI.dim, fontSize: 14, fontWeight: '800' },
  title: { color: UI.text, fontSize: 28, fontWeight: '900' },
  board: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: B - 12,
    height: B - 12,
    borderRadius: 18,
    borderWidth: 9,
    borderColor: UI.bg2,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stars: { color: UI.gold, fontSize: 26, letterSpacing: 2 },
  coins: { color: UI.gold, fontSize: 17, fontWeight: '900' },
  note: { color: UI.dim, fontSize: 14, fontWeight: '700' },
  info: { backgroundColor: UI.bg2, borderRadius: 16, padding: 12, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { color: UI.text, fontSize: 14, fontWeight: '700', flex: 1 },
  qBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: UI.gold, backgroundColor: '#5C46A3', alignItems: 'center', justifyContent: 'center' },
  q: { color: '#FFE08A', fontSize: 13, fontWeight: '900' },
  play: { minHeight: 56, borderRadius: 999, backgroundColor: UI.gold, alignItems: 'center', justifyContent: 'center' },
  replay: { backgroundColor: UI.panelHi },
  locked: { backgroundColor: UI.bg2 },
  playText: { color: UI.bg, fontSize: 20, fontWeight: '900' },
});
