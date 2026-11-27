// Genel harita: "Ray Adaları". Her harita gökyüzünde inip kalkan bir ada, adalar rayla bağlı.
// Flox'lar raydan bulunduğun adaya akar. Biten adalar tam renkli, bulunduğun ada parlar,
// sıradaki kilitli ada bulut altında, daha uzaktakiler soluk.
import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { islandCenters, overviewHeight, overviewRail, pathUntil } from '../core/mapLayout';
import { MAPS, mapComplete, mapProgress, mapUnlocked } from '../core/maps';
import { firstPictureLevel, islandTheme, pictureAt } from '../game/mapThemes';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import { Coins } from './kit';
import { Beads } from './map/Beads';
import { Bird, Chest, Cloud, IslandBody, Lock } from './map/Island';
import { Move, useReduceMotion } from './map/motion';
import { Rail } from './map/Rail';
import PixelArt from './PixelArt';

interface Props {
  progress: Progress;
  onBack(): void;
  onShop(): void;
  onOpen(index: number): void;
  onClaim(index: number): void;
}

export const mapName = (key: string): string => t(`map.${key}` as Key);

const ISLE = 132;
const ISLE_NOW = 156;
const PIC = 44;

export default function MapsScreen({ progress, onBack, onShop, onOpen, onClaim }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  const { width, height } = useWindowDimensions();
  const still = useReduceMotion();
  const level = progress.level;
  const curIndex = Math.max(0, MAPS.findIndex((m) => !mapComplete(m, level)));
  const allDone = MAPS.every((m) => mapComplete(m, level));

  const centers = useMemo(() => islandCenters(width, MAPS.length), [width]);
  const rail = useMemo(() => overviewRail(centers), [centers]);
  const done = useMemo(() => pathUntil(rail, centers[allDone ? MAPS.length - 1 : curIndex]), [rail, centers, curIndex, allDone]);
  const stars = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({ x: (i * 97) % width, y: 20 + ((i * 151) % overviewHeight(MAPS.length)), d: (i % 7) / 7 })),
    [width],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('maps.title')}</Text>
          <Text style={styles.sub}>
            {Math.min(curIndex + 1, MAPS.length)} / {MAPS.length} · {mapName(MAPS[curIndex].key)}
          </Text>
        </View>
        <Coins coins={progress.coins} onPress={onShop} />
      </View>

      <ScrollView
        ref={scroll}
        onLayout={() =>
          scroll.current?.scrollTo({ y: Math.max(0, centers[curIndex].y - height * 0.4), animated: false })
        }
      >
        <View style={{ height: overviewHeight(MAPS.length), width }}>
          {stars.map((s, i) => (
            <Move key={i} kind="twinkle" ms={2400} phase={s.d} off={still} style={{ position: 'absolute', left: s.x, top: s.y }}>
              <View style={{ width: 3, height: 3, backgroundColor: '#C9D6EA' }} />
            </Move>
          ))}

          <Rail pts={rail} color={UI.railEdge} width={10} ties="#8A5A2B" spacing={8} />
          <Rail pts={done} color={UI.gold} width={3} dash spacing={8} />
          <Beads pts={done} off={still} ms={Math.max(4000, done.length * 9)} count={done.length > 60 ? 7 : 4} />

          {MAPS.map((m, i) => {
            const c = centers[i];
            const complete = mapComplete(m, level);
            const open = mapUnlocked(m, level);
            const current = open && !complete;
            const nextLocked = !open && i === curIndex + 1;
            const claimed = progress.mapsClaimed.includes(m.index);
            const pr = mapProgress(m, level);
            const th = islandTheme(i);
            const w = current ? ISLE_NOW : ISLE;
            const pic = pictureAt(firstPictureLevel(m));
            const picDone = (progress.stars[`L${firstPictureLevel(m)}`] ?? 0) > 0;
            const cells = pic.cells.filter((x) => x >= 0).length;
            const lit = current ? Math.round((cells * pr.done) / pr.total) : undefined;
            const far = !open && !nextLocked;
            return (
              <Move
                key={m.key}
                kind="bob"
                ms={current ? 2600 : 3400}
                phase={(i * 0.37) % 1}
                amp={current ? 6 : 4}
                off={still || far}
                style={{ position: 'absolute', left: c.x - w / 2, top: c.y - PIC - 12, width: w, alignItems: 'center', opacity: far ? 0.35 : 1 }}
              >
                <Pressable
                  disabled={!open}
                  onPress={() => onOpen(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${mapName(m.key)} ${open ? `${pr.done}/${pr.total}` : t('maps.locked')}`}
                  style={{ alignItems: 'center' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: -8, zIndex: 2 }}>
                    <PixelArt pic={pic} size={PIC} silhouette={!open || (!picDone && !current)} filled={lit} />
                    {current && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ width: 3, height: 52, backgroundColor: '#E8EEF8' }} />
                        <Move kind="sway" ms={1000} off={still} style={{ transformOrigin: 'left' }}>
                          <View style={{ width: 24, height: 15, backgroundColor: UI.gold }} />
                        </Move>
                      </View>
                    )}
                  </View>
                  <View>
                    {current && (
                      <Move
                        kind="ring"
                        ms={1600}
                        off={still}
                        style={{ position: 'absolute', left: -2, top: -2, width: w + 4, height: Math.round(w * 0.26) + 4, borderRadius: w, borderWidth: 3, borderColor: UI.gold }}
                      />
                    )}
                    <IslandBody w={w} top={open ? th.top : '#55627E'} rock={open ? th.rock : '#3B3F55'} glow={current} />
                  </View>
                  <View style={[styles.label, current && styles.labelNow]}>
                    <Text style={[styles.name, !open && { color: UI.dim }]} numberOfLines={1}>
                      {mapName(m.key)}
                    </Text>
                    <Text style={[styles.state, complete && { color: '#6FE3A1' }, current && { color: UI.gold }]}>
                      {complete ? '✓' : open ? `${pr.done}/${pr.total}` : ''}
                    </Text>
                  </View>
                  {current && (
                    <Move kind="pulse" ms={1200} off={still} style={styles.enter}>
                      <Text style={styles.enterText}>{t('maps.enter')}</Text>
                    </Move>
                  )}
                </Pressable>

                {(current || (complete && !claimed)) && (
                  <Move kind="hop" ms={1700} amp={5} off={still} style={{ position: 'absolute', right: -8, top: PIC - 30 }}>
                    <Chest size={30} />
                  </Move>
                )}
                {complete && !claimed && (
                  <Pressable onPress={() => onClaim(m.index)} style={styles.claim} accessibilityRole="button">
                    <Text style={styles.claimText}>{t('maps.claim')}</Text>
                  </Pressable>
                )}
                {nextLocked && (
                  <>
                    <Move kind="wiggle" ms={2600} off={still} style={{ position: 'absolute', top: PIC - 4 }}>
                      <Lock size={30} />
                    </Move>
                    <Move kind="drift" ms={5000} amp={14} off={still} style={{ position: 'absolute', left: -18, top: PIC - 6 }}>
                      <Cloud w={100} opacity={0.32} />
                    </Move>
                    <Move kind="drift" ms={6500} amp={12} phase={0.5} off={still} style={{ position: 'absolute', right: -16, top: PIC + 18 }}>
                      <Cloud w={84} opacity={0.24} />
                    </Move>
                  </>
                )}
              </Move>
            );
          })}
        </View>
      </ScrollView>

      <Birds width={width} still={still} />
    </View>
  );
}

/** Ekranın önünden geçen piksel kuşlar */
function Birds({ width, still }: { width: number; still: boolean }) {
  if (still) return null;
  const list = [
    { y: 150, c: '#FF5A5F', ms: 11000, p: 0 },
    { y: 380, c: '#FFD23F', ms: 14000, p: 0.45 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {list.map((b, i) => (
        <Move key={i} kind="drift" ms={b.ms} phase={b.p} amp={width / 2 + 40} style={{ position: 'absolute', top: b.y, left: width / 2 }}>
          <Move kind="pulse" ms={400}>
            <Bird color={b.c} />
          </Move>
        </Move>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: UI.text, fontSize: 38, fontWeight: '300', marginTop: -6 },
  title: { color: UI.text, fontSize: 30, fontWeight: '900' },
  sub: { color: UI.dim, fontSize: 14, fontWeight: '800' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,27,45,0.78)',
    maxWidth: 170,
  },
  labelNow: { borderWidth: 2, borderColor: UI.gold },
  name: { color: UI.text, fontSize: 15, fontWeight: '900', flexShrink: 1 },
  state: { color: UI.dim, fontSize: 13, fontWeight: '900' },
  enter: { marginTop: 6, backgroundColor: UI.gold, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 7 },
  enterText: { color: UI.bg, fontSize: 15, fontWeight: '900' },
  claim: { marginTop: 6, backgroundColor: UI.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  claimText: { color: UI.bg, fontSize: 14, fontWeight: '900' },
});
