import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { streakAlive } from '../core/daily';
import { isHardLevel } from '../core/generator';
import { MissionState } from '../core/missions';
import { COLORS, UI } from '../game/palette';
import { albumEntries, showcaseEntries } from '../game/album';
import { starterOfferActive } from '../game/purchases';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Card, Coins, kit } from './kit';
import MissionsCard from './MissionsCard';
import PixelArt from './PixelArt';

interface Props {
  progress: Progress;
  todayKey: string;
  onPlay(): void;
  onDaily(): void;
  onAlbum(): void;
  onShop(): void;
  missions: MissionState;
  onClaimMission(i: number): void;
  onClaimChest(): void;
}

const LOGO = [0, 2, 3, 5, 7];

export default function HomeScreen(p: Props) {
  const { progress, todayKey } = p;
  const n = progress.level;
  const dailyDone = progress.daily.lastDoneKey === todayKey;
  const streak = streakAlive(progress.daily.lastDoneKey, todayKey) ? progress.daily.streak : 0;
  const album = albumEntries(progress);
  const next = album.find((a) => !a.done);
  const starter = starterOfferActive(progress, Date.now());
  const shown = showcaseEntries(progress);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <Coins coins={progress.coins} onPress={p.onShop} />
      </View>

      <View style={styles.logoWrap}>
        <View style={styles.drops}>
          {LOGO.map((c, i) => (
            <View key={i} style={[styles.drop, { backgroundColor: COLORS[c] }]} />
          ))}
        </View>
        <Text style={styles.logo}>Floxi</Text>
      </View>

      {shown.length > 0 && (
        <Pressable onPress={p.onAlbum} style={styles.showcase}>
          {shown.map((e) => (
            <View key={e.pic.key} style={styles.showItem}>
              <PixelArt pic={e.pic} size={72} />
            </View>
          ))}
        </Pressable>
      )}

      <Pressable onPress={p.onPlay} style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}>
        <Text style={styles.playIcon}>▶</Text>
        <Text style={styles.playText}>
          {t('common.level', { n })}
          {isHardLevel(n) ? t('common.hardSuffix') : ''}
        </Text>
      </Pressable>

      <View style={styles.cards}>
        <Card style={dailyDone ? { ...styles.half, opacity: 0.7 } : styles.half} onPress={p.onDaily}>
          <Text style={kit.cardTitle}>{t('home.dailyTitle')} {dailyDone ? '✓' : ''}</Text>
          <Text style={styles.streak}>🔥 {streak}</Text>
        </Card>
        <Card style={styles.half} onPress={p.onAlbum}>
          <Text style={kit.cardTitle} numberOfLines={1}>
            {t('tab.album')}
          </Text>
          <View style={styles.albumRow}>
            <PixelArt pic={(next ?? album[album.length - 1]).pic} size={30} silhouette={!!next} />
            <Text style={styles.count}>
              {album.filter((a) => a.done).length}/{album.length}
            </Text>
          </View>
        </Card>
      </View>

      <View style={{ marginTop: 12 }}>
        <MissionsCard state={p.missions} onClaim={p.onClaimMission} onClaimChest={p.onClaimChest} />
      </View>

      {starter && (
        <Card style={styles.offer} onPress={p.onShop}>
          <Text style={kit.cardTitle}>{t('home.starterTitle')}</Text>
        </Card>
      )}
      {progress.level > 30 && progress.piggy >= 300 && (
        <Card style={{ marginTop: 12 }} onPress={p.onShop}>
          <Text style={kit.cardTitle}>{t('home.piggyTitle', { n: progress.piggy })}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  logoWrap: { alignItems: 'center', marginTop: 28 },
  drops: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  drop: { width: 18, height: 18, borderRadius: 9 },
  logo: { color: UI.text, fontSize: 56, fontWeight: '900', letterSpacing: 1 },
  showcase: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  showItem: {
    width: 92,
    height: 92,
    borderRadius: 18,
    backgroundColor: UI.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: UI.gold,
  },
  play: {
    marginTop: 28,
    backgroundColor: UI.accent,
    borderRadius: 24,
    paddingVertical: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playIcon: { color: UI.bg, fontSize: 26, fontWeight: '900' },
  playText: { color: UI.bg, fontSize: 28, fontWeight: '900' },
  count: { color: UI.text, fontSize: 20, fontWeight: '900' },
  cards: { flexDirection: 'row', gap: 12, marginTop: 16 },
  half: { flex: 1, minHeight: 84, justifyContent: 'center' },
  albumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  streak: { color: UI.gold, fontSize: 20, fontWeight: '900', marginTop: 6 },
  offer: { marginTop: 12, borderWidth: 2, borderColor: UI.gold },
});
