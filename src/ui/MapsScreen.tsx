import React, { useRef } from 'react';
import { Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import { MAPS, mapComplete, mapProgress, mapUnlocked } from '../core/maps';
import { UI } from '../game/palette';
import { Progress } from '../game/storage';
import { Key, t } from '../i18n';
import { Btn, Coins } from './kit';
import RewardLine from './RewardLine';

interface Props {
  progress: Progress;
  onBack(): void;
  onShop(): void;
  onClaim(index: number): void;
}

export const mapName = (key: string): string => t(`map.${key}` as Key);

export default function MapsScreen({ progress, onBack, onShop, onClaim }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  const level = progress.level;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('maps.title')}</Text>
        <Coins coins={progress.coins} onPress={onShop} />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.list}>
        {MAPS.map((m) => {
          const done = mapComplete(m, level);
          const open = mapUnlocked(m, level);
          const current = open && !done;
          const claimed = progress.mapsClaimed.includes(m.index);
          const pr = mapProgress(m, level);
          return (
            <View
              key={m.key}
              onLayout={current ? (e) => scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 80), animated: false }) : undefined}
              style={[styles.card, current && styles.cardNow, !open && styles.locked]}
            >
              <View style={styles.row}>
                <View style={[styles.iconWrap, done && { backgroundColor: UI.gold }]}>
                  <Text style={styles.icon}>{open ? m.icon : '🔒'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {m.index + 1}. {mapName(m.key)}
                  </Text>
                  <Text style={styles.range}>{t('maps.levels', { a: m.start, b: m.end })}</Text>
                </View>
                <Text style={[styles.state, done && { color: UI.gold }]}>
                  {done ? '✓' : open ? `${pr.done}/${pr.total}` : ''}
                </Text>
              </View>
              {current && (
                <View style={styles.bar}>
                  <View style={[styles.fill, { width: `${(pr.done / pr.total) * 100}%` }]} />
                </View>
              )}
              <RewardLine reward={m.reward} dim={claimed || !open} />
              {done && !claimed && <Btn label={t('maps.claim')} gold onPress={() => onClaim(m.index)} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { color: UI.text, fontSize: 38, fontWeight: '300', marginTop: -6 },
  title: { color: UI.text, fontSize: 30, fontWeight: '900', flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: UI.panel, borderRadius: 20, padding: 16, gap: 12, borderWidth: 2, borderColor: 'transparent' },
  cardNow: { borderColor: UI.accent },
  locked: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 58, height: 58, borderRadius: 18, backgroundColor: UI.bg2, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 32 },
  name: { color: UI.text, fontSize: 20, fontWeight: '900' },
  range: { color: UI.dim, fontSize: 15, fontWeight: '700', marginTop: 2 },
  state: { color: UI.text, fontSize: 20, fontWeight: '900' },
  bar: { height: 10, borderRadius: 5, backgroundColor: UI.bg, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: UI.accent },
});
