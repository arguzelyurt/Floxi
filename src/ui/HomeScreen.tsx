import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { streakAlive } from '../core/daily';
import { isHardLevel } from '../core/generator';
import { MissionState } from '../core/missions';
import { COLORS, UI } from '../game/palette';
import { albumEntries } from '../game/album';
import { starterOfferActive } from '../game/purchases';
import { Progress } from '../game/storage';
import { t } from '../i18n';
import { Btn, Card, Coins, kit } from './kit';
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
        <Text style={styles.tag}>{t('app.tagline')}</Text>
      </View>

      <View style={{ marginTop: 28 }}>
        <Btn label={t('common.level', { n }) + (isHardLevel(n) ? t('common.hardSuffix') : '')} onPress={p.onPlay} primary />
      </View>

      <View style={styles.cards}>
        <Card style={dailyDone ? { ...styles.half, opacity: 0.7 } : styles.half} onPress={p.onDaily}>
          <Text style={kit.cardTitle}>{t('home.dailyTitle')} {dailyDone ? '✓' : ''}</Text>
          <Text style={kit.cardSub}>{t('home.dailySub')}</Text>
          <Text style={styles.streak}>{streak === 1 ? t('home.streakDay1') : t('home.streakDays', { n: streak })}</Text>
        </Card>
        <Card style={styles.half} onPress={p.onAlbum}>
          <View style={styles.albumRow}>
            <PixelArt pic={(next ?? album[album.length - 1]).pic} size={44} silhouette={!!next} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={kit.cardTitle}>{t('tab.album')}</Text>
              <Text style={kit.cardSub}>
                {album.filter((a) => a.done).length}/{album.length}
                {next ? t('home.albumNext', { n: next.level }) : ''}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={{ marginTop: 12 }}>
        <MissionsCard state={p.missions} onClaim={p.onClaimMission} onClaimChest={p.onClaimChest} />
      </View>

      {starter && (
        <Card style={styles.offer} onPress={p.onShop}>
          <Text style={kit.cardTitle}>{t('home.starterTitle')}</Text>
          <Text style={kit.cardSub}>{t('home.starterSub')}</Text>
        </Card>
      )}
      {progress.level > 30 && progress.piggy >= 300 && (
        <Card style={{ marginTop: 12 }} onPress={p.onShop}>
          <Text style={kit.cardTitle}>{t('home.piggyTitle', { n: progress.piggy })}</Text>
          <Text style={kit.cardSub}>{t('home.piggySub')}</Text>
        </Card>
      )}

      <Pressable onPress={p.onShop} style={{ alignSelf: 'center' }}>
        <Text style={styles.promise}>{t('common.fairAds')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 },
  logoWrap: { alignItems: 'center', marginTop: 20 },
  drops: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  drop: { width: 18, height: 18, borderRadius: 9 },
  logo: { color: UI.text, fontSize: 56, fontWeight: '900', letterSpacing: 1 },
  tag: { color: UI.dim, fontSize: 16, marginTop: 4 },
  cards: { flexDirection: 'row', gap: 12, marginTop: 14 },
  half: { flex: 1, minHeight: 88 },
  albumRow: { flexDirection: 'row', alignItems: 'center' },
  streak: { color: UI.gold, fontSize: 13, fontWeight: '700', marginTop: 8 },
  offer: { marginTop: 12, borderWidth: 2, borderColor: UI.gold },
  promise: { color: UI.dim, fontSize: 12, textAlign: 'center', marginTop: 20 },
});
