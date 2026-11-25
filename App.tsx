import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Share, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { dailyKey, dailyLevel, levelFor } from './src/core/generator';
import { dailyShareText, nextStreak } from './src/core/daily';
import {
  applyWin,
  canClaimChest,
  canClaimMission,
  claimMission,
  ensureMissions,
  MISSION_CHEST,
  missionsLeft,
} from './src/core/missions';
import { planNotifications } from './src/core/notifyPlan';
import { requestNotificationPermission, reschedule } from './src/services/notifications';
import {
  canShowRewarded,
  coinsForLevel,
  ECONOMY,
  onLevelWon,
  piggyAfterLevel,
  onInterstitialShown,
  onRewardedShown,
  PRODUCTS,
  rollDay,
  shouldShowInterstitial,
} from './src/core/monetization';
import { UI } from './src/game/palette';
import { themeFor } from './src/game/skins';
import { resolveLang, setLang, t } from './src/i18n';
import { getLocales } from 'expo-localization';

const deviceLang = (() => {
  try {
    return getLocales()[0]?.languageCode ?? null;
  } catch {
    return null;
  }
})();
import { applyPurchase, ProductKey, productKeyById, restoreNonConsumable } from './src/game/purchases';
import { loadProgress, Progress, saveProgress, todayUTC, trustedNow } from './src/game/storage';
import * as Ads from './src/services/ads';
import * as Iap from './src/services/iap';
import { track } from './src/services/analytics';
import { getAdRules } from './src/services/remoteConfig';
import { initFirebase } from './src/services/firebase';
import GameScreen, { MonetizationApi, WinResult } from './src/ui/GameScreen';
import ShopSheet from './src/ui/ShopSheet';
import HomeScreen from './src/ui/HomeScreen';
import AlbumScreen from './src/ui/AlbumScreen';
import { toggleShowcase } from './src/game/album';
import { grantMapReward } from './src/game/mapRewards';
import { mapEndingAt } from './src/core/maps';
import { PICTURES } from './src/core/pictures';
import MapsScreen from './src/ui/MapsScreen';
import MarketScreen from './src/ui/MarketScreen';
import DailyScreen from './src/ui/DailyScreen';
import SettingsScreen from './src/ui/SettingsScreen';
import TabBar, { Tab } from './src/ui/TabBar';
import { buyItem, buySet, equipItem, Wallet } from './src/core/market';

type Screen = { kind: 'tabs' } | { kind: 'level'; n: number } | { kind: 'daily'; key: string } | { kind: 'maps' };

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ kind: 'tabs' });
  const [tab, setTab] = useState<Tab>('home');
  const [, setAdsTick] = useState(0); // izin formu sonrası "gizlilik tercihleri" düğmesi için
  const progressRef = useRef<Progress | null>(null);
  progressRef.current = progress;

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((p) => {
      if (!p) return p;
      const next = fn(p);
      if (next === p) return p;
      saveProgress(next);
      return next;
    });
  }, []);

  // Açılış: kayıt, gün değişimi, reklam izni + SDK, mağaza bağlantısı.
  useEffect(() => {
    initFirebase();
    loadProgress().then((p) => {
      const rolled = { ...p, ads: rollDay(p.ads, todayUTC()) };
      setProgress(rolled);
      Ads.initAds(rolled.ads.removeAds).then(() => setAdsTick((t) => t + 1));
      Iap.initIap({
        onGranted(productId, purchaseId) {
          update((cur) => applyPurchase(cur, productId, purchaseId, Date.now()));
          track({ name: 'iap_purchase', product: productId });
          const key = productKeyById(productId);
          if (key === 'removeAds' || key === 'supporter') Ads.dropInterstitial();
        },
        onRestored(productId) {
          update((cur) => restoreNonConsumable(cur, productId));
        },
        onError(message) {
          Alert.alert(t('alert.purchaseFailed'), message);
        },
      });
    });
  }, [update]);

  const buy = useCallback((key: ProductKey) => {
    Iap.buy(PRODUCTS[key].id).catch(() =>
      Alert.alert(t('alert.storeDown'), t('alert.storeDownSub')),
    );
  }, []);

  const restore = useCallback(() => {
    Iap.restore({
      onGranted: (id, pid) => update((cur) => applyPurchase(cur, id, pid, Date.now())),
      onRestored: (id) => update((cur) => restoreNonConsumable(cur, id)),
      onError: () => {},
    })
      .then(() => Alert.alert(t('alert.restored'), t('alert.restoredSub')))
      .catch(() => Alert.alert(t('alert.storeDown')));
  }, [update]);

  const money: MonetizationApi = useMemo(
    () => ({
      async watchAd(placement: string) {
        const p = progressRef.current;
        if (!p) return false;
        if (p.skipRewarded) return true; // destekçi paketi
        if (!canShowRewarded(rollDay(p.ads, todayUTC()), getAdRules())) return false;
        const ok = await Ads.showRewarded();
        if (ok) {
          track({ name: 'ad_shown', type: 'rewarded', placement });
          update((cur) => ({ ...cur, ads: onRewardedShown(rollDay(cur.ads, todayUTC()), Date.now()) }));
        }
        return ok;
      },
      rewardedAvailable() {
        const p = progressRef.current;
        if (!p) return false;
        return p.skipRewarded || (canShowRewarded(rollDay(p.ads, todayUTC()), getAdRules()) && Ads.rewardedReady());
      },
      openShop() {
        track({ name: 'iap_offer_shown', product: 'shop', placement: 'game' });
        setShopOpen(true);
      },
    }),
    [update],
  );

  // Dil her çizimden önce ayarlanır; Ayarlar'dan değişince bütün ekranlar yeniden çizilir
  setLang(resolveLang(progress?.lang ?? 'auto', deviceLang));

  // Oyun ekranı açıldığı seviyeyi kendisi tutar: kazanınca progress.level artsa da kazanma kartı ekranda kalır
  const n = screen.kind === 'level' ? screen.n : (progress?.level ?? 1);
  const level = useMemo(() => levelFor(n), [n]);
  const today = dailyKey(new Date());
  const dailyKeyOpen = screen.kind === 'daily' ? screen.key : null;
  const daily = useMemo(() => (dailyKeyOpen ? dailyLevel(dailyKeyOpen) : null), [dailyKeyOpen]);

  const winMap = useMemo(() => mapEndingAt(n), [n]);
  const winPicture = useMemo(() => PICTURES.find((pic) => pic.key && pic.key === level.title), [level]);

  const onLevelWin = useCallback(
    (r: WinResult) =>
      update((before) => {
        // Haritanın son seviyesi: ödül kazanınca hemen verilir (bir kez)
        // Aynı seviye iki kez ödül vermesin (ör. eski bir kayıttan tekrar oynanırsa)
        if (before.level !== n) return before;
        const ending = mapEndingAt(before.level);
        const p = ending ? grantMapReward(before, ending.index, before.level + 1) : before;
        // Seviye kazanıldığı anda ilerler: Ana menüye dönülse de kaldığı yerden devam edilir
        const nextLevel = p.level + 1;
        const starterOfferAt =
          p.starterOfferAt === 0 && nextLevel > ECONOMY.starterUnlockLevel ? Date.now() : p.starterOfferAt;
        return {
        ...p,
        level: nextLevel,
        starterOfferAt,
        coins: p.coins + coinsForLevel(r.stars, !!level.hard),
        piggy: piggyAfterLevel(p.piggy, p.level),
        stars: { ...p.stars, [level.id]: Math.max(r.stars, p.stars[level.id] ?? 0) },
        ads: onLevelWon(p.ads),
        missions: applyWin(ensureMissions(p.missions, todayUTC()), {
          stars: r.stars,
          launches: r.launches,
          usedHelp: r.usedHelp,
          isDaily: false,
          hard: !!level.hard,
        }),
        };
      }),
    [update, level, n],
  );

  /** Günlük ödül yalnızca günün ilk bitirişinde; her 7 günlük seride bonus. */
  const dailyCoins = useCallback(
    (key: string) => {
      const p = progressRef.current;
      if (!p || p.daily.lastDoneKey === key) return 0;
      const streak = nextStreak(p.daily.lastDoneKey, p.daily.streak, key);
      return ECONOMY.daily + (streak % 7 === 0 ? ECONOMY.streak7Bonus : 0);
    },
    [],
  );

  const onDailyWin = useCallback(
    (key: string, r: WinResult) => {
      const coins = dailyCoins(key);
      update((p) => ({
        ...p,
        coins: p.coins + coins,
        daily: {
          lastDoneKey: key,
          streak: nextStreak(p.daily.lastDoneKey, p.daily.streak, key),
          stars: { ...p.daily.stars, [key]: Math.max(r.stars, p.daily.stars[key] ?? 0) },
        },
        missions: applyWin(ensureMissions(p.missions, todayUTC()), {
          stars: r.stars,
          launches: r.launches,
          usedHelp: r.usedHelp,
          isDaily: true,
          hard: true,
        }),
      }));
    },
    [update, dailyCoins],
  );

  const claim = useCallback(
    (i: number) =>
      update((p) => {
        const r = claimMission(ensureMissions(p.missions, todayUTC()), i);
        return { ...p, coins: p.coins + r.coins, missions: r.state };
      }),
    [update],
  );

  const claimChest = useCallback(
    () =>
      update((p) => {
        const m = ensureMissions(p.missions, todayUTC());
        if (!m.claimed.every(Boolean) || m.chestClaimed) return p;
        return {
          ...p,
          coins: p.coins + MISSION_CHEST.coins,
          boosters: { ...p.boosters, hint: p.boosters.hint + MISSION_CHEST.hint },
          missions: { ...m, chestClaimed: true },
        };
      }),
    [update],
  );

  // Bildirim planı: açılışta, günlük bulmaca çözülünce ve uygulama arka plana geçerken yeniden kurulur.
  const scheduleNotifications = useCallback(() => {
    const p = progressRef.current;
    if (!p) return;
    reschedule(
      planNotifications({
        now: new Date(),
        todayKey: todayUTC(),
        dailyDoneKey: p.daily.lastDoneKey,
        streak: p.daily.streak,
        piggyFull: p.level > ECONOMY.piggy.unlockLevel && p.piggy >= ECONOMY.piggy.cap,
        missionsLeft: missionsLeft(ensureMissions(p.missions, todayUTC())),
      }),
    );
  }, []);

  const dailyDone = progress?.daily.lastDoneKey;
  const loaded = !!progress;
  useEffect(() => {
    if (loaded) scheduleNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyDone, loaded, progress?.lang, scheduleNotifications]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') scheduleNotifications();
    });
    return () => sub.remove();
  }, [scheduleNotifications]);

  // Bildirim izni: oyuncu oyunu sevdiğini gösterince (ilk Günlük Mozaik ya da 6. seviye), ana menüde bir kez sor.
  const askNotif =
    !!progress &&
    !progress.notifAsked &&
    screen.kind === 'tabs' &&
    (!!progress.daily.lastDoneKey || progress.level >= 6);
  useEffect(() => {
    if (!askNotif) return;
    update((p) => ({ ...p, notifAsked: true }));
    Alert.alert(
      t('alert.notifTitle'),
      t('alert.notifBody'),
      [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('common.yes'), onPress: () => requestNotificationPermission().then((ok) => ok && scheduleNotifications()) },
      ],
    );
  }, [askNotif, update, scheduleNotifications]);

  const walletOf = (p: Progress): Wallet => ({
    coins: p.coins,
    boosters: p.boosters,
    owned: p.owned,
    cosmetics: p.cosmetics,
    level: p.level,
  });

  const marketBuy = useCallback(
    (id: string) =>
      update((p) => {
        const r = id.startsWith('set:') ? buySet(walletOf(p), id) : buyItem(walletOf(p), id, todayUTC());
        if (r.ok) track({ name: 'market_buy', item: id });
        return r.ok ? { ...p, ...r.wallet } : p;
      }),
    [update],
  );

  const marketEquip = useCallback(
    (id: string) => update((p) => ({ ...p, ...equipItem(walletOf(p), id) })),
    [update],
  );

  const todayMissions = progress ? ensureMissions(progress.missions, todayUTC()) : null;
  const missionsClaimable =
    !!todayMissions &&
    (todayMissions.missions.some((_, i) => canClaimMission(todayMissions, i)) || canClaimChest(todayMissions));

  const shareDaily = useCallback((key: string, r: WinResult) => {
    const p = progressRef.current;
    const streak = p?.daily.lastDoneKey === key ? p.daily.streak : 1;
    Share.share({ message: dailyShareText(key, r.stars, r.launches, r.parked, streak) }).catch(() => {});
  }, []);

  /** "Sonraki seviye": geçiş reklamı kurallarına göre belki reklam, sonra yeni seviye. */
  const onNext = useCallback(async (playedN: number) => {
    const p = progressRef.current;
    if (!p) return;
    const ads = rollDay(p.ads, todayUTC());
    const decision = shouldShowInterstitial(
      ads,
      { level: playedN, won: true, isDaily: false, online: Ads.interstitialReady(), now: trustedNow(p) },
      getAdRules(),
    );
    let after = ads;
    if (decision.show && (await Ads.showInterstitial())) {
      track({ name: 'ad_shown', type: 'interstitial', placement: 'level_end' });
      after = onInterstitialShown(ads, Date.now());
      // 3. geçiş reklamından sonra bir kez "Reklamsız" önerisi.
      if (after.interstitialsToday === 3 && !p.removeAdsPrompted) {
        update((cur) => ({ ...cur, removeAdsPrompted: true }));
        Alert.alert(t('alert.noAdsTitle'), t('alert.noAdsBody'), [
          { text: t('common.notNow'), style: 'cancel' },
          { text: t('common.show'), onPress: () => setShopOpen(true) },
        ]);
      }
    }
    update((cur) => ({ ...cur, ads: after }));
    setScreen({ kind: 'level', n: Math.max(progressRef.current?.level ?? playedN + 1, playedN + 1) });
  }, [update]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor:
            progress && (screen.kind === 'level' || screen.kind === 'daily')
              ? themeFor(progress.cosmetics.theme).bg
              : UI.bg,
        }}
      >
        {progress ? (
          <>
            {screen.kind === 'tabs' && (
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1 }}>
                  {tab === 'home' && (
                    <HomeScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => setScreen({ kind: 'level', n: progress.level })}
                      onDaily={() => setTab('daily')}
                      onAlbum={() => setTab('album')}
                      onMaps={() => setScreen({ kind: 'maps' })}
                      onShop={() => money.openShop()}
                      missions={ensureMissions(progress.missions, todayUTC())}
                      onClaimMission={claim}
                      onClaimChest={claimChest}
                    />
                  )}
                  {tab === 'daily' && (
                    <DailyScreen
                      progress={progress}
                      todayKey={today}
                      onPlay={() => setScreen({ kind: 'daily', key: today })}
                      onShop={() => money.openShop()}
                    />
                  )}
                  {tab === 'market' && (
                    <MarketScreen
                      wallet={walletOf(progress)}
                      dateKey={todayUTC()}
                      onBuy={marketBuy}
                      onEquip={marketEquip}
                      onOpenShop={() => money.openShop()}
                    />
                  )}
                  {tab === 'album' && (
                    <AlbumScreen
                      progress={progress}
                      onShop={() => money.openShop()}
                      onToggleShowcase={(key) => update((p) => toggleShowcase(p, key))}
                    />
                  )}
                  {tab === 'settings' && (
                    <SettingsScreen
                      progress={progress}
                      update={update}
                      onShop={() => money.openShop()}
                      onRestore={restore}
                      privacyOptions={Ads.needsPrivacyOptions() ? Ads.showPrivacyOptions : null}
                    />
                  )}
                </View>
                <TabBar
                  tab={tab}
                  onTab={setTab}
                  dots={{
                    daily: progress.daily.lastDoneKey !== today,
                    home: missionsClaimable,
                  }}
                />
              </View>
            )}
            {screen.kind === 'maps' && (
              <MapsScreen
                progress={progress}
                onBack={() => setScreen({ kind: 'tabs' })}
                onShop={() => money.openShop()}
                onClaim={(i) => update((p) => grantMapReward(p, i))}
              />
            )}
            {screen.kind === 'level' && (
              <GameScreen
                key={level.id}
                level={level}
                heading={t('common.level', { n })}
                trackId={n}
                progress={progress}
                update={update}
                money={money}
                coinsFor={(stars) => coinsForLevel(stars, !!level.hard)}
                onWin={onLevelWin}
                winPicture={winPicture}
                winMap={winMap}
                resume={progress.savedLevel?.id === level.id ? progress.savedLevel.s : undefined}
                onSave={(st) =>
                  update((p) =>
                    st ? { ...p, savedLevel: { id: level.id, s: st } } : p.savedLevel ? { ...p, savedLevel: null } : p,
                  )
                }
                nextLabel={t('game.next')}
                onNext={() => onNext(n)}
                onExit={() => setScreen({ kind: 'tabs' })}
              />
            )}
            {screen.kind === 'daily' && daily && (
              <GameScreen
                key={daily.id}
                level={daily}
                heading={t('game.dailyHeading')}
                trackId={daily.id}
                progress={progress}
                update={update}
                money={money}
                coinsFor={() => dailyCoins(screen.key)}
                onWin={(r) => onDailyWin(screen.key, r)}
                nextLabel={t('common.home')}
                onNext={() => setScreen({ kind: 'tabs' })}
                onExit={() => setScreen({ kind: 'tabs' })}
                extraWinAction={{ label: t('daily.share'), onPress: (r) => shareDaily(screen.key, r) }}
              />
            )}
            <ShopSheet
              visible={shopOpen}
              progress={progress}
              onClose={() => setShopOpen(false)}
              onBuy={buy}
              onRestore={restore}
            />
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={UI.accent} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
