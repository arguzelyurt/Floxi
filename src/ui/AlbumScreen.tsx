import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { pictureName } from '../core/pictures';
import { UI } from '../game/palette';
import { albumEntries, SHOWCASE_SIZE, showcaseEntries } from '../game/album';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { TabHeader } from './kit';
import PixelArt from './PixelArt';

interface Props {
  progress: Progress;
  onShop(): void;
  onToggleShowcase(key: string): void;
}

export default function AlbumScreen({ progress, onShop, onToggleShowcase }: Props) {
  const { width } = useWindowDimensions();
  const entries = albumEntries(progress);
  const shown = showcaseEntries(progress);
  const doneCount = entries.filter((e) => e.done).length;
  const tile = Math.floor((width - 24 * 2 - 10 * 2) / 3);
  const slot = Math.floor((width - 24 * 2 - 16 * 2 - 10 * 2) / 3);

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('album.title')} coins={progress.coins} onCoins={onShop} />
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.showcase}>
          <View style={styles.showHead}>
            <Text style={styles.showTitle}>{t('album.showcase')}</Text>
            <Text style={styles.count}>
              {doneCount}/{entries.length}
            </Text>
          </View>
          <View style={styles.slots}>
            {Array.from({ length: SHOWCASE_SIZE }, (_, i) => {
              const e = shown[i];
              return (
                <Pressable
                  key={i}
                  disabled={!e}
                  onPress={() => e && onToggleShowcase(e.pic.key)}
                  style={[styles.slot, { width: slot, height: slot }]}
                >
                  {e ? <PixelArt pic={e.pic} size={slot - 22} /> : <Text style={styles.plus}>+</Text>}
                </Pressable>
              );
            })}
          </View>
          {shown.length === 0 && <Text style={styles.hint}>{t('album.tapHint')}</Text>}
        </View>

        <View style={styles.grid}>
          {entries.map((e) => {
            const on = progress.showcase.includes(e.pic.key) && e.done;
            return (
              <Pressable
                key={e.level}
                disabled={!e.done}
                onPress={() => onToggleShowcase(e.pic.key)}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tile },
                  on && styles.tileOn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={{ height: tile - 52, justifyContent: 'center' }}>
                  <PixelArt pic={e.pic} size={tile - 44} silhouette={!e.done} />
                </View>
                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                  {e.done ? pictureName(e.pic.key) : t('common.level', { n: e.level })}
                </Text>
                {e.done && <Text style={styles.meta}>{'★'.repeat(e.stars) + '☆'.repeat(3 - e.stars)}</Text>}
                {on && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingBottom: 24, gap: 14 },
  showcase: { backgroundColor: UI.panel, borderRadius: 20, padding: 16, gap: 12 },
  showHead: { flexDirection: 'row', alignItems: 'center' },
  showTitle: { color: UI.text, fontSize: 20, fontWeight: '900', flex: 1 },
  count: { color: UI.gold, fontSize: 18, fontWeight: '900' },
  slots: { flexDirection: 'row', gap: 10 },
  slot: { borderRadius: 16, backgroundColor: UI.bg2, alignItems: 'center', justifyContent: 'center' },
  plus: { color: UI.dim, fontSize: 30, fontWeight: '300' },
  hint: { color: UI.dim, fontSize: 15, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    backgroundColor: UI.panel,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    aspectRatio: 0.82,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileOn: { borderColor: UI.gold },
  name: { color: UI.text, fontWeight: '800', fontSize: 14, marginTop: 6 },
  meta: { color: UI.gold, fontSize: 12, marginTop: 1 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: UI.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: UI.bg, fontSize: 13, fontWeight: '900' },
});
