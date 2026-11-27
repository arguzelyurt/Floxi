// Harita içi: haritanın seviyeleri büyük, yüzen bir adanın üstünde yılan gibi kıvrılan ray üzerinde duraklar.
// Biten durak yeşil + yıldızlar, bulunduğun durak sarı ve nabız atar ("Buradasın"), kalanlar gri.
// Resim seviyeleri mor çerçeve, rayın sonunda harita ödülü sandığı. Altta "Sıradaki · Oyna".
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { pathUntil, stationLayout, STATIONS } from '../core/mapLayout';
import { MAPS, mapComplete, mapProgress } from '../core/maps';
import { islandTheme, isPictureLevel, pictureAt } from '../game/mapThemes';
import { COLORS } from '../game/palette';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import LevelSheet from './LevelSheet';
import { Beads } from './map/Beads';
import { Bird, Chest, RockBase } from './map/Island';
import { BackPill, C, CoinPill, PixelTree, shade, Sky } from './map/look';
import { Fly, Move, useReduceMotion } from './map/motion';
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

const ST = 48;
const PIC_ST = 56;
const PAD = 8;
const MYSTERY = [COLORS[2], COLORS[6], COLORS[5], COLORS[0]];

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
  const todoBg = shade(th.ground, -0.22);
  const todoEdge = shade(th.ground, 0.22);

  const L = useMemo(() => stationLayout(inner, total), [inner, total]);
  const curI = complete ? -1 : level - m.start;
  const donePath = useMemo(
    () => (curI > 0 ? pathUntil(L.rail, L.stations[curI]) : complete ? L.rail : []),
    [L, curI, complete],
  );
  const trees = useMemo(() => {
    const out: { x: number; y: number; d: number }[] = [];
    const rows = Math.ceil(total / STATIONS.cols) + 1;
    for (let r = 0; r < rows; r++) {
      const y = STATIONS.top + r * STATIONS.row + STATIONS.row / 2 - 18;
      if (y > L.height - 40) break;
      out.push({ x: inner * (r % 2 ? 0.46 : 0.14), y, d: (r * 0.29) % 1 });
      if (r % 2 === 0) out.push({ x: inner * 0.66, y: y + 2, d: 0.5 });
    }
    return out;
  }, [inner, total, L.height]);
  const grass = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: 22 + ((i * 71) % (inner - 44)),
        y: 26 + ((i * 113) % (L.height - 52)),
        c: ['#FF5A6E', '#FFE08A', '#7BD88F', '#FFFFFF'][i % 4],
        d: (i % 5) / 5,
      })),
    [inner, L.height],
  );
  const starsOf = (n: number) => progress.stars[`L${n}`] ?? 0;
  let gotStars = 0;
  for (let n = m.start; n <= m.end; n++) gotStars += starsOf(n);

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <View style={styles.top}>
        <View style={styles.topRow}>
          <BackPill label={t('maps.title')} onPress={onBack} />
          <CoinPill coins={progress.coins} onPress={onShop} />
        </View>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{mapName(m.key)}</Text>
            <Text style={styles.sub}>{t('maps.mapRange', { i: index + 1, a: m.start, b: m.end })}</Text>
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
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingBottom: 130 }}
        onLayout={() => {
          if (curI > 3) scroll.current?.scrollTo({ y: Math.max(0, L.stations[curI].y - height * 0.3), animated: false });
        }}
      >
        <Move kind="bob" ms={4000} amp={4} off={still} style={{ marginHorizontal: PAD, marginTop: 10 }}>
          <View style={[styles.ground, { height: L.height, backgroundColor: th.ground }]}>
            {grass.map((g, i) => (
              <Move key={i} kind="twinkle" ms={2400} phase={g.d} off={still} style={{ position: 'absolute', left: g.x, top: g.y }}>
                <View style={{ width: 6, height: 6, backgroundColor: g.c }} />
              </Move>
            ))}
            {trees.map((d, i) => (
              <Move key={`t${i}`} kind="sway" ms={3000} phase={d.d} off={still} style={{ position: 'absolute', left: d.x, top: d.y, transformOrigin: 'bottom' }}>
                <PixelTree leaf={shade(th.top, -0.25)} />
              </Move>
            ))}

            <Rail pts={L.rail} color={C.track} width={12} ties={C.ties} spacing={6} />
            {donePath.length > 1 && <Rail pts={donePath} color={C.gold} width={3} dash spacing={8} />}
            <Beads pts={donePath} off={still} ms={Math.max(3500, donePath.length * 8)} count={curI > 6 ? 6 : 4} />

            {L.stations.map((p, i) => {
              const n = m.start + i;
              const isCur = i === curI;
              const isDone = n < level;
              const pic = isPictureLevel(n);
              const s = starsOf(n);
              if (pic)
                return (
                  <View key={n} style={{ position: 'absolute', left: p.x - 40, top: p.y - PIC_ST / 2, width: 80, alignItems: 'center' }}>
                    {isCur && <Move kind="ring" ms={1400} off={still} style={[styles.picStation, styles.ring]} />}
                    <Move kind="pulse" ms={1200} off={still || !isCur}>
                      <Pressable onPress={() => setSheet(n)} accessibilityRole="button" accessibilityLabel={t('common.level', { n })} style={styles.picStation}>
                        {isDone ? (
                          <PixelArt pic={pictureAt(n)} size={38} />
                        ) : (
                          <View style={{ width: 43, flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                            {Array.from({ length: 16 }, (_, k) => (
                              <Move key={k} kind="twinkle" ms={1600} phase={((k * 7) % 11) / 11} off={still}>
                                <View style={{ width: 10, height: 10, backgroundColor: MYSTERY[k % 4] }} />
                              </Move>
                            ))}
                          </View>
                        )}
                      </Pressable>
                    </Move>
                    <Text style={styles.pill} numberOfLines={1}>
                      {n} · {t('maps.picture')}
                    </Text>
                    {isCur && <Here still={still} />}
                  </View>
                );
              return (
                <View key={n} style={{ position: 'absolute', left: p.x - ST / 2, top: p.y - ST / 2, width: ST, alignItems: 'center' }}>
                  {isCur && <Move kind="ring" ms={1400} off={still} style={[styles.station, styles.ring]} />}
                  <Move kind="pulse" ms={1200} off={still || !isCur}>
                    <Pressable
                      onPress={() => setSheet(n)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.level', { n })}
                      style={[
                        styles.station,
                        isDone && styles.done,
                        isCur && styles.cur,
                        !isDone && !isCur && { backgroundColor: todoBg, borderColor: todoEdge },
                      ]}
                    >
                      <Text style={[styles.num, isDone && { color: C.greenText }, isCur && { color: '#2A1C00' }]}>{n}</Text>
                    </Pressable>
                  </Move>
                  {isDone && <Text style={styles.stars}>{'★'.repeat(s) + '☆'.repeat(3 - s)}</Text>}
                  {isCur && <Here still={still} />}
                </View>
              );
            })}

            <View style={{ position: 'absolute', left: L.chest.x - 50, top: L.chest.y - 26, width: 100, alignItems: 'center' }}>
              <Move kind="hop" ms={1800} amp={6} off={still || (complete && claimed)}>
                <Chest size={46} open={complete && claimed} />
              </Move>
              <Text style={styles.pill} numberOfLines={1}>
                {complete && claimed ? t('maps.claimed') : t('maps.reward')}
              </Text>
            </View>
          </View>
          <RockBase w={inner} rock={th.rock} />
        </Move>
      </ScrollView>

      <Fly width={width} ms={11000} top={190} off={still}>
        <Bird color="#FF5A6E" />
      </Fly>
      <Fly width={width} ms={13000} phase={0.6} top={height - 150} off={still}>
        <Bird color="#4CC9F0" />
      </Fly>

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

function Here({ still }: { still: boolean }) {
  return (
    <Move kind="hop" ms={1000} amp={6} off={still} style={styles.hereWrap}>
      <Text style={styles.here}>{t('maps.here')}</Text>
    </Move>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingTop: 10, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end' },
  title: { color: C.text, fontSize: 28, fontWeight: '900' },
  sub: { color: C.sky, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  count: { color: C.goldLight, fontSize: 13, fontWeight: '900' },
  bar: { width: 110, height: 8, borderRadius: 4, backgroundColor: C.pill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: C.gold },
  ground: { borderRadius: 46, borderBottomWidth: 10, borderBottomColor: 'rgba(0,0,0,0.2)', overflow: 'hidden' },
  station: { width: ST, height: ST, borderRadius: 14, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  picStation: { width: PIC_ST, height: PIC_ST, borderRadius: 10, borderWidth: 3, borderColor: C.gold, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', left: 0, top: 0, borderColor: C.gold, backgroundColor: 'transparent' },
  done: { backgroundColor: C.green, borderColor: C.greenLight },
  cur: { backgroundColor: C.gold, borderColor: '#FFFFFF', shadowColor: C.gold, shadowOpacity: 0.7, shadowRadius: 11, shadowOffset: { width: 0, height: 0 } },
  num: { color: '#C9D3CF', fontSize: 18, fontWeight: '800' },
  stars: { marginTop: 3, color: C.gold, fontSize: 12, letterSpacing: 1, backgroundColor: C.pill, paddingHorizontal: 6, borderRadius: 999, overflow: 'hidden' },
  pill: { marginTop: 3, color: C.goldLight, fontSize: 11, fontWeight: '900', backgroundColor: C.pill, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  hereWrap: { position: 'absolute', top: -38, width: 120, alignItems: 'center' },
  here: { backgroundColor: '#FFFFFF', color: '#14122B', fontSize: 12, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  bottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.sheet,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.sheetEdge,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
  },
  bottomSmall: { color: C.dim, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  bottomBig: { color: C.text, fontSize: 18, fontWeight: '800' },
  playBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 26, borderRadius: 999, backgroundColor: C.gold },
  playText: { color: '#2A1C00', fontSize: 18, fontWeight: '800' },
});
