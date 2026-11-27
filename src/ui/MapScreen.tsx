// Harita içi: haritanın seviyeleri büyük bir adanın üstünde, yılan gibi kıvrılan ray üzerinde duraklar.
// Biten durak yeşil + yıldızlar, bulunduğun durak sarı ve nabız atar ("Buradasın"), kalanlar gri.
// Resim seviyeleri küçük resim çerçevesiyle, rayın sonunda harita ödülü sandığı.
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { isHardLevel } from '../core/generator';
import { pathUntil, stationLayout, STATIONS } from '../core/mapLayout';
import { MAPS, mapComplete, mapProgress } from '../core/maps';
import { islandTheme, isPictureLevel, pictureAt } from '../game/mapThemes';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Coins } from './kit';
import LevelSheet from './LevelSheet';
import { Beads } from './map/Beads';
import { Chest } from './map/Island';
import { Move, useReduceMotion } from './map/motion';
import { Rail } from './map/Rail';
import { mapName } from './MapsScreen';
import PixelArt from './PixelArt';

interface Props {
  progress: Progress;
  index: number;
  onBack(): void;
  onShop(): void;
  onPlay(n: number, replay: boolean): void;
  onClaim(index: number): void;
}

const ST = 50;
const PAD = 8;

export default function MapScreen({ progress, index, onBack, onShop, onPlay, onClaim }: Props) {
  const m = MAPS[index];
  const scroll = useRef<ScrollViewInstance>(null);
  const { width, height } = useWindowDimensions();
  const still = useReduceMotion();
  const [sheet, setSheet] = useState<number | null>(null);
  const level = progress.level;
  const total = m.end - m.start + 1;
  const pr = mapProgress(m, level);
  const complete = mapComplete(m, level);
  const claimed = progress.mapsClaimed.includes(m.index);
  const th = islandTheme(index);
  const inner = width - PAD * 2;

  const L = useMemo(() => stationLayout(inner, total), [inner, total]);
  const curI = complete ? -1 : level - m.start;
  const donePath = useMemo(
    () => (curI > 0 ? pathUntil(L.rail, L.stations[curI]) : complete ? L.rail : []),
    [L, curI, complete],
  );
  const decor = useMemo(() => {
    const out: { x: number; y: number; d: number }[] = [];
    const rows = Math.ceil(total / STATIONS.cols);
    for (let r = 0; r < rows; r++) {
      const y = STATIONS.top + r * STATIONS.row + STATIONS.row / 2 - 4;
      out.push({ x: inner * (r % 2 ? 0.3 : 0.62), y, d: (r * 0.29) % 1 });
      if (r % 2 === 0) out.push({ x: inner * 0.2, y: y + 6, d: 0.5 });
    }
    return out;
  }, [inner, total]);
  const sparks = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ x: 14 + ((i * 71) % (inner - 28)), y: 20 + ((i * 113) % (L.height - 40)), d: (i % 5) / 5 })),
    [inner, L.height],
  );
  const starsOf = (n: number) => progress.stars[`L${n}`] ?? 0;
  const gotStars = Array.from({ length: total }, (_, i) => starsOf(m.start + i)).reduce((a, b) => a + b, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backText}>‹ {t('maps.title')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Coins coins={progress.coins} onPress={onShop} />
      </View>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{mapName(m.key)}</Text>
          <Text style={styles.sub}>
            {index + 1}. · {t('maps.levels', { a: m.start, b: m.end })}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <Text style={styles.count}>
            {pr.done} / {pr.total}
          </Text>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${(pr.done / pr.total) * 100}%` }]} />
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        onLayout={() => {
          if (curI > 3) scroll.current?.scrollTo({ y: Math.max(0, L.stations[curI].y - height * 0.3), animated: false });
        }}
      >
        <Move kind="bob" ms={4200} amp={3} off={still} style={{ marginHorizontal: PAD, marginTop: 8 }}>
          <View style={[styles.ground, { height: L.height, backgroundColor: th.ground }]}>
            {sparks.map((s, i) => (
              <Move key={i} kind="twinkle" ms={2400} phase={s.d} off={still} style={{ position: 'absolute', left: s.x, top: s.y }}>
                <View style={{ width: 5, height: 5, backgroundColor: i % 3 === 0 ? '#FFD23F' : i % 3 === 1 ? '#F15BB5' : 'rgba(255,255,255,0.7)' }} />
              </Move>
            ))}
            {decor.map((d, i) => (
              <Move key={`d${i}`} kind="sway" ms={3200} phase={d.d} off={still} style={{ position: 'absolute', left: d.x - 12, top: d.y - 14, transformOrigin: 'bottom' }}>
                <Text style={{ fontSize: 22, opacity: 0.9 }}>{m.icon}</Text>
              </Move>
            ))}

            <Rail pts={L.rail} color={UI.bg2} width={10} ties="#8A5A2B" spacing={8} />
            {donePath.length > 1 && <Rail pts={donePath} color={UI.gold} width={3} dash spacing={8} />}
            <Beads pts={donePath} off={still} ms={Math.max(3500, donePath.length * 8)} count={curI > 6 ? 6 : 4} />

            {L.stations.map((p, i) => {
              const n = m.start + i;
              const isCur = i === curI;
              const isDone = n < level;
              const pic = isPictureLevel(n);
              const s = starsOf(n);
              return (
                <View key={n} style={{ position: 'absolute', left: p.x - ST / 2, top: p.y - ST / 2, width: ST, alignItems: 'center' }}>
                  {isCur && (
                    <Move kind="ring" ms={1400} off={still} style={[styles.station, styles.ring]} />
                  )}
                  <Move kind="pulse" ms={1200} off={still || !isCur}>
                    <Pressable
                      onPress={() => setSheet(n)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.level', { n })}
                      style={[
                        styles.station,
                        isDone && styles.done,
                        isCur && styles.cur,
                        !isDone && !isCur && styles.todo,
                        pic && styles.pic,
                      ]}
                    >
                      {pic ? (
                        <PixelArt pic={pictureAt(n)} size={30} silhouette={!isDone} />
                      ) : (
                        <Text style={[styles.num, isDone && { color: '#0F3D2A' }, isCur && { color: UI.bg }]}>{n}</Text>
                      )}
                    </Pressable>
                  </Move>
                  {pic && <Text style={styles.picNum}>{n}</Text>}
                  {isDone && !pic && <Text style={styles.stars}>{'★'.repeat(s) + '☆'.repeat(3 - s)}</Text>}
                  {!isDone && !isCur && isHardLevel(n) && <Text style={styles.hard}>!</Text>}
                  {isCur && (
                    <Move kind="hop" ms={1000} amp={6} off={still} style={styles.hereWrap}>
                      <Text style={styles.here}>{t('maps.here')}</Text>
                    </Move>
                  )}
                </View>
              );
            })}

            <View style={{ position: 'absolute', left: L.chest.x - 50, top: L.chest.y - 24, width: 100, alignItems: 'center' }}>
              <Move kind="hop" ms={1800} amp={5} off={still || (complete && claimed)}>
                <Chest size={42} open={complete && claimed} />
              </Move>
              <Text style={styles.chestLabel} numberOfLines={1}>{complete && claimed ? t('maps.claimed') : t('maps.reward')}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.rock, { width: inner * 0.82, backgroundColor: th.rock }]} />
            <View style={[styles.rock, { width: inner * 0.56, backgroundColor: th.rock, opacity: 0.85 }]} />
            <View style={[styles.rock, { width: inner * 0.3, backgroundColor: th.rock, opacity: 0.7 }]} />
          </View>
        </Move>
      </ScrollView>

      <View style={styles.bottom}>
        {complete ? (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomSmall}>{t('maps.complete')}</Text>
              <Text style={styles.bottomBig}>★ {t('maps.stars', { a: gotStars, b: total * 3 })}</Text>
            </View>
            {!claimed && (
              <Pressable onPress={() => onClaim(m.index)} style={styles.playBtn} accessibilityRole="button">
                <Text style={styles.playText}>{t('maps.claim')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomSmall}>{t('maps.next')}</Text>
              <Text style={styles.bottomBig}>{t('common.level', { n: level })}</Text>
            </View>
            <Move kind="pulse" ms={1200} off={still}>
              <Pressable onPress={() => onPlay(level, false)} style={styles.playBtn} accessibilityRole="button">
                <Text style={styles.playText}>{t('maps.play')}</Text>
              </Pressable>
            </Move>
          </>
        )}
      </View>

      <LevelSheet
        n={sheet}
        progress={progress}
        onClose={() => setSheet(null)}
        onPlay={(n, replay) => {
          setSheet(null);
          onPlay(n, replay);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: UI.panel },
  backText: { color: UI.text, fontSize: 16, fontWeight: '800' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { color: UI.text, fontSize: 28, fontWeight: '900' },
  sub: { color: UI.dim, fontSize: 14, fontWeight: '800' },
  count: { color: UI.gold, fontSize: 15, fontWeight: '900' },
  bar: { width: 110, height: 8, borderRadius: 4, backgroundColor: UI.bg2, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: UI.gold },
  ground: { borderRadius: 40, borderBottomWidth: 10, borderBottomColor: 'rgba(0,0,0,0.22)', overflow: 'hidden' },
  rock: { height: 14, marginTop: -2, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  station: { width: ST, height: ST, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', left: 0, top: 0, borderColor: UI.gold },
  done: { backgroundColor: '#6FE3A1', borderColor: '#E9FFF4' },
  cur: { backgroundColor: UI.gold, borderColor: '#FFFFFF', shadowColor: UI.gold, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  todo: { backgroundColor: UI.bg2, borderColor: UI.railEdge },
  pic: { borderColor: UI.gold, backgroundColor: '#5C46A3' },
  num: { color: UI.dim, fontSize: 18, fontWeight: '900' },
  picNum: { color: UI.gold, fontSize: 12, fontWeight: '900', marginTop: 2 },
  stars: { color: UI.gold, fontSize: 12, marginTop: 2, letterSpacing: 1 },
  hard: { position: 'absolute', right: -4, top: -6, color: UI.danger, fontSize: 16, fontWeight: '900' },
  hereWrap: { position: 'absolute', top: -34, width: 110, alignItems: 'center' },
  here: { backgroundColor: '#FFFFFF', color: UI.bg, fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  chestLabel: { marginTop: 2, color: '#FFE08A', fontSize: 11, fontWeight: '900', backgroundColor: 'rgba(15,27,45,0.6)', paddingHorizontal: 7, borderRadius: 999, overflow: 'hidden' },
  bottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.panel,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: UI.railEdge,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
  },
  bottomSmall: { color: UI.dim, fontSize: 13, fontWeight: '800' },
  bottomBig: { color: UI.text, fontSize: 19, fontWeight: '900' },
  playBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 26, borderRadius: 999, backgroundColor: UI.gold },
  playText: { color: UI.bg, fontSize: 18, fontWeight: '900' },
});
