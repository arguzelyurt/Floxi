// Genel harita: "Ray Adaları". Her harita gökyüzünde inip kalkan bir ada, adalar rayla bağlı.
// Flox'lar raydan bulunduğun adaya akar. Biten adalar tam renkli, bulunduğun ada parlar,
// sıradaki kilitli ada bulut altında, daha uzaktakiler soluk.
import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { islandCenters, overviewHeight, overviewRail, pathUntil } from '../core/mapLayout';
import { MAPS, mapComplete, mapProgress, mapUnlocked } from '../core/maps';
import { firstPictureLevel, islandTheme, pictureAt } from '../game/mapThemes';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import { Beads } from './map/Beads';
import { Bird, Chest, Cloud, IslandBody, Lock } from './map/Island';
import { C, CoinPill, Sky } from './map/look';
import { Fly, Move, useReduceMotion } from './map/motion';
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

const ISLE = 150;
const ISLE_NOW = 180;
const PIC = 40;
const PIC_NOW = 48;
/** Etiketler adadan geniş olabilsin diye kutu payı */
const BOX = 80;

export default function MapsScreen({ progress, onBack, onShop, onOpen, onClaim }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  const { width, height } = useWindowDimensions();
  const still = useReduceMotion();
  const level = progress.level;
  const curIndex = Math.max(0, MAPS.findIndex((m) => !mapComplete(m, level)));
  const allDone = MAPS.every((m) => mapComplete(m, level));
  const curC = allDone ? MAPS.length - 1 : curIndex;

  const centers = useMemo(() => islandCenters(width, MAPS.length), [width]);
  const rail = useMemo(() => overviewRail(centers), [centers]);
  const done = useMemo(() => pathUntil(rail, centers[curC]), [rail, centers, curC]);
  const rest = useMemo(() => rail.slice(Math.max(0, done.length - 1)), [rail, done]);
  const starsOf = (n: number) => progress.stars[`L${n}`] ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <Sky />
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('maps.title')}</Text>
          <Text style={styles.sub}>
            {curC + 1} / {MAPS.length} · {mapName(MAPS[curC].key)}
          </Text>
        </View>
        <CoinPill coins={progress.coins} onPress={onShop} />
      </View>

      <ScrollView
        ref={scroll}
        onLayout={() => scroll.current?.scrollTo({ y: Math.max(0, centers[curC].y - height * 0.4), animated: false })}
      >
        <View style={{ height: overviewHeight(MAPS.length), width }}>
          <Rail pts={rail} color={C.track} width={12} ties={C.ties} spacing={6} />
          <Rail pts={done} color={C.gold} width={3} dash spacing={8} />
          <Rail pts={rest} color="#5A5590" width={3} dash spacing={6} />
          <Beads pts={done} off={still} ms={Math.max(4000, done.length * 9)} count={done.length > 60 ? 6 : 4} />

          {MAPS.map((m, i) => {
            const c = centers[i];
            const complete = mapComplete(m, level);
            const open = mapUnlocked(m, level);
            const current = open && !complete;
            const nextLocked = !open && i === curIndex + 1;
            const far = !open && !nextLocked;
            const claimed = progress.mapsClaimed.includes(m.index);
            const pr = mapProgress(m, level);
            const th = islandTheme(i);
            const w = current ? ISLE_NOW : ISLE;
            const picSize = current ? PIC_NOW : PIC;
            const pl = firstPictureLevel(m);
            const pic = pictureAt(pl);
            const cells = pic.cells.filter((x) => x >= 0).length;
            const lit = current ? Math.round((cells * pr.done) / pr.total) : undefined;
            let sum = 0;
            for (let n = m.start; n <= m.end; n++) sum += starsOf(n);
            const avg = Math.round(sum / pr.total);
            return (
              <Move
                key={m.key}
                kind="bob"
                ms={current ? 2600 : 3200}
                phase={(i * 0.37) % 1}
                amp={current ? 6 : 5}
                off={still || far}
                style={{ position: 'absolute', left: c.x - (w + BOX) / 2, top: c.y - picSize - 13, width: w + BOX, alignItems: 'center', opacity: far ? 0.35 : 1 }}
              >
                <Pressable
                  disabled={!open}
                  onPress={() => onOpen(i)}
                  accessibilityRole="button"
                  accessibilityLabel={`${mapName(m.key)} ${open ? `${pr.done}/${pr.total}` : t('maps.locked')}`}
                  style={{ alignItems: 'center' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: -6, zIndex: 2 }}>
                    {open ? (
                      <PixelArt pic={pic} size={picSize} silhouette={false} filled={lit} />
                    ) : (
                      <View style={{ height: 4 }} />
                    )}
                    {current && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ width: 3, height: 56, backgroundColor: '#E8E4FF' }} />
                        <Move kind="sway" ms={1000} off={still} style={{ transformOrigin: 'left' }}>
                          <View style={{ width: 26, height: 16, backgroundColor: C.gold }} />
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
                        style={{ position: 'absolute', left: 0, top: 0, width: w, height: Math.round(w * 0.27), borderRadius: w, borderWidth: 3, borderColor: C.gold, zIndex: 3 }}
                      />
                    )}
                    <IslandBody w={w} top={open ? th.top : C.lockedTop} rock={open ? th.rock : C.lockedRock} glow={current} />
                  </View>

                  {current ? (
                    <>
                      <Dots done={pr.done} total={pr.total} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Text style={styles.nowName}>
                          {mapName(m.key)} <Text style={styles.nowCount}>{pr.done}/{pr.total}</Text>
                        </Text>
                        <Move kind="pulse" ms={1200} off={still} style={styles.enter}>
                          <Text style={styles.enterText}>{t('maps.enter')}</Text>
                        </Move>
                      </View>
                    </>
                  ) : (
                    <View style={styles.label}>
                      <Text style={[styles.name, !open && { color: '#C9C6E8' }]} numberOfLines={1}>
                        {open ? mapName(m.key) : `${mapName(m.key)} · ${t('maps.levelsCount', { n: pr.total })}`}
                      </Text>
                      {complete && (
                        <Text style={styles.done}>
                          {pr.total}/{pr.total} ✓ <Text style={{ color: C.gold }}>{'★'.repeat(avg)}</Text>
                        </Text>
                      )}
                    </View>
                  )}
                </Pressable>

                {(current || (complete && !claimed)) && (
                  <Move kind="hop" ms={1600} amp={5} off={still} style={{ position: 'absolute', right: BOX / 2 + (current ? -6 : 0), top: current ? 2 : PIC - 30 }}>
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
                    <Move kind="wiggle" ms={2600} off={still} style={{ position: 'absolute', top: picSize - 16 }}>
                      <Lock size={32} />
                    </Move>
                    <Move kind="drift" ms={5000} amp={16} off={still} style={{ position: 'absolute', left: BOX / 2 - 20, top: picSize + 6 }}>
                      <Cloud w={120} opacity={0.35} />
                    </Move>
                    <Move kind="drift" ms={6500} amp={16} phase={0.5} off={still} style={{ position: 'absolute', right: BOX / 2 - 24, top: picSize + 34 }}>
                      <Cloud w={110} opacity={0.28} />
                    </Move>
                  </>
                )}
              </Move>
            );
          })}
        </View>
      </ScrollView>

      <Fly width={width} ms={11000} top={150} off={still}>
        <Move kind="pulse" ms={400}>
          <Bird color="#FF5A6E" />
        </Move>
      </Fly>
      <Fly width={width} ms={14000} phase={0.45} top={270} off={still}>
        <Bird color={C.gold} />
      </Fly>
      <Fly width={width} ms={12000} phase={0.25} top={460} off={still}>
        <Bird color="#4CC9F0" />
      </Fly>
    </View>
  );
}

/** Bulunduğun adanın altında seviye noktaları (uzun haritalarda ince çubuk) */
function Dots({ done, total }: { done: number; total: number }) {
  if (total > 15)
    return (
      <View style={{ width: 120, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
        <View style={{ width: `${(done / total) * 100}%`, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
      </View>
    );
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: i < done ? C.gold : i === done ? '#FFFFFF' : 'rgba(255,255,255,0.25)' }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: C.text, fontSize: 38, fontWeight: '300', marginTop: -6 },
  title: { color: C.text, fontSize: 30, fontWeight: '900' },
  sub: { color: C.sky, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.pill,
    maxWidth: 230,
  },
  name: { color: C.text, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  done: { color: C.green, fontSize: 11, fontWeight: '900' },
  nowName: { color: C.text, fontSize: 16, fontWeight: '900' },
  nowCount: { color: C.goldLight, fontSize: 12, fontWeight: '900' },
  enter: { backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 14, minHeight: 32, justifyContent: 'center' },
  enterText: { color: '#2A1C00', fontSize: 14, fontWeight: '800' },
  claim: { marginTop: 6, backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  claimText: { color: '#2A1C00', fontSize: 14, fontWeight: '900' },
});
