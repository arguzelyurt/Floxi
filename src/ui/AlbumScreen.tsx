import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { UI } from '../game/palette';
import { albumEntries } from '../game/album';
import { Progress } from '../game/storage';
import PixelArt from './PixelArt';
import { TabHeader } from './kit';
import { t } from '../i18n';
import { pictureName } from '../core/pictures';

export default function AlbumScreen({ progress, onShop }: { progress: Progress; onShop(): void }) {
  const { width } = useWindowDimensions();
  const entries = albumEntries(progress);
  const tile = Math.floor((width - 24 * 2 - 12) / 2);

  return (
    <View style={{ flex: 1 }}>
    <TabHeader title={t('album.title')} coins={progress.coins} onCoins={onShop} />
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.sub}>{t('album.sub')}</Text>
      <View style={styles.grid}>
        {entries.map((e) => (
          <View key={e.level} style={[styles.tile, { width: tile }]}>
            <View style={{ height: tile - 70, justifyContent: 'center' }}>
              <PixelArt pic={e.pic} size={tile - 80} silhouette={!e.done} />
            </View>
            <Text style={styles.name}>{e.done ? pictureName(e.pic.key) : '???'}</Text>
            <Text style={styles.meta}>
              {e.done ? '★'.repeat(e.stars) + '☆'.repeat(3 - e.stars) : t('common.level', { n: e.level })}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.more}>{t('album.more')}</Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { color: UI.text, fontSize: 34, fontWeight: '300', marginTop: -6 },
  title: { color: UI.text, fontSize: 24, fontWeight: '900' },
  sub: { color: UI.dim, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { backgroundColor: UI.panel, borderRadius: 18, alignItems: 'center', paddingVertical: 14, aspectRatio: 1 },
  name: { color: UI.text, fontWeight: '800', fontSize: 15, marginTop: 8 },
  meta: { color: UI.gold, fontSize: 13, marginTop: 2 },
  more: { color: UI.dim, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
