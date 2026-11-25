import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  conveyorPath,
  EMPTY,
  Flox,
  floxesLeft,
  initialState,
  Level,
  lockRemaining,
  Move,
  runLoop,
  starsFor,
  State,
  Stop,
} from '../core/rules';
import { hint } from '../core/solver';
import {
  addSlot,
  canLaunch,
  finish,
  isIdle,
  launch as railLaunch,
  MAX_ON_RAIL,
  onRail,
  RailHit,
  railFrom,
  RailState,
  rescue,
  riderFlox,
  tick,
} from '../core/rail';
import { Booster, boosterName, ECONOMY } from '../core/monetization';
import { t } from '../i18n';
import { Picture, pictureName } from '../core/pictures';
import { MapDef } from '../core/maps';
import PixelArt from './PixelArt';
import RewardLine from './RewardLine';
import { mapName } from './MapsScreen';
import { COLORS, SYMBOLS, UI } from '../game/palette';
import { Progress, SPEED_MS, todayUTC } from '../game/storage';
import { Btn, TextLink } from './kit';
import { CellStyle, cellStyleFor, FloxStyle, floxStyleFor, Theme, themeFor } from '../game/skins';
import { track } from '../services/analytics';

const RAIL = 26;
const LANE_VISIBLE = 3;

export interface MonetizationApi {
  /** Ödüllü reklam: true = ödül hak edildi. Destekçi paketinde anında true. */
  watchAd(placement: string): Promise<boolean>;
  rewardedAvailable(): boolean;
  openShop(): void;
}

export interface WinResult {
  stars: number;
  launches: number;
  parked: number;
  /** Bu seviyede herhangi bir güçlendirici (ya da reklamla kurtarma) kullanıldı mı */
  usedHelp: boolean;
}

interface Props {
  level: Level;
  /** Başlık: "Seviye 12" ya da "Günlük Mozaik" */
  heading: string;
  /** Ölçüm için seviye kimliği */
  trackId: number | string;
  progress: Progress;
  update(fn: (p: Progress) => Progress): void;
  money: MonetizationApi;
  /** Yıldıza göre kazanılacak coin (ekranda gösterilir) */
  coinsFor(stars: number): number;
  /** Kazanınca bir kez: ödülü üst bileşen verir */
  onWin(r: WinResult): void;
  /** Kazanma kartındaki ana düğme */
  nextLabel: string;
  onNext(): void;
  onExit(): void;
  /** Kazanma kartında ek düğme (ör. Günlük Mozaik paylaş) */
  extraWinAction?: { label: string; onPress(r: WinResult): void };
  /** Bu seviye koleksiyona resim katıyorsa: kazanınca gösterilir */
  winPicture?: Picture;
  /** Bu seviye bir haritayı bitiriyorsa: kazanınca harita ödülü gösterilir */
  winMap?: MapDef;
  /** Yarım kalan seviyeden devam (kayıtlı durum) */
  resume?: State;
  /** Seviye durumu değişince kayıt (null = kayıt sil). Yalnızca ray boşken çağrılır. */
  onSave?(s: State | null): void;
}

/** Kayıtlı durum bu seviyeye ait ve oynanabilir mi? */
const validResume = (level: Level, st?: State): st is State =>
  !!st && st.status === 'playing' && st.cells.length === level.cells.length && st.lanes.length === level.lanes.length;

/** Flox ve piksel görünümü (marketten) + renk körlüğü: her bileşene tek tek geçmemek için */
const SkinCtx = createContext<{ flox: FloxStyle; colorBlind: boolean }>({ flox: 'damla', colorBlind: false });

const POP_MS = 320; // silinen pikselin patlama süresi

const haptic = (kind: 'tap' | 'win' | 'stuck') => {
  try {
    if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
};

const sameMove = (a: Move | null, b: Move) =>
  !!a && a.from === b.from && a.index === b.index && (a.from === 'dock' || !(a as { depth?: number }).depth);

export default function GameScreen(props: Props) {
  const { level, heading, trackId, progress, update, money, onNext } = props;
  const colorBlind = progress.colorBlind;
  const theme = themeFor(progress.cosmetics.theme);
  const cellStyle = cellStyleFor(progress.cosmetics.cells);
  const skin = useMemo(
    () => ({ flox: floxStyleFor(progress.cosmetics.flox), colorBlind }),
    [progress.cosmetics.flox, colorBlind],
  );
  const { width, height } = useWindowDimensions();
  const [rail, setRail] = useState<RailState>(() =>
    railFrom(validResume(level, props.resume) ? props.resume : initialState(level)),
  );
  const s = rail.s;
  const railRef = useRef(rail);
  railRef.current = rail;
  const [history, setHistory] = useState<RailState[]>([]);
  const [pops, setPops] = useState<(RailHit & { at: number })[]>([]);
  const [, setFrame] = useState(0);
  const [preview, setPreview] = useState<{ cells: Set<number>; left: number } | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const wonReported = useRef(false);
  const usedHelp = useRef(false);
  const stuckReported = useRef<State | null>(null);

  const path = useMemo(() => conveyorPath(level.w, level.h), [level]);
  const busy = !isIdle(rail) && s.status === 'playing';
  const animating = busy || pops.length > 0;
  const [wonCoins, setWonCoins] = useState(0);
  const earned = wonCoins;
  const onWinRef = useRef(props.onWin);
  onWinRef.current = props.onWin;
  const coinsForRef = useRef(props.coinsFor);
  coinsForRef.current = props.coinsFor;

  useEffect(() => {
    track({ name: 'level_start', level: trackId, hard: !!level.hard });
  }, [level, trackId]);

  // Yerleşim
  const availW = width - 24 - RAIL * 2;
  const availH = height * 0.44 - RAIL * 2;
  const cs = Math.max(12, Math.min(34, Math.floor(Math.min(availW / level.w, availH / level.h))));
  const boardW = cs * level.w;
  const boardH = cs * level.h;

  const stopPos = useCallback(
    (st: Stop) => {
      if (st.dy === -1) return { x: RAIL + st.x * cs + cs / 2, y: RAIL + boardH + RAIL / 2 };
      if (st.dx === -1) return { x: RAIL + boardW + RAIL / 2, y: RAIL + st.y * cs + cs / 2 };
      if (st.dy === 1) return { x: RAIL + st.x * cs + cs / 2, y: RAIL / 2 };
      return { x: RAIL / 2, y: RAIL + st.y * cs + cs / 2 };
    },
    [cs, boardW, boardH],
  );

  // Ray döngüsü: hız ayarına göre adım atar, silinen piksellerin patlamasını söndürür
  const stepMs = SPEED_MS[progress.speed];
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    let last = Date.now();
    let acc = 0;
    const loop = () => {
      const now = Date.now();
      acc += now - last;
      last = now;
      let r = railRef.current;
      const fresh: RailHit[] = [];
      while (acc >= stepMs && !isIdle(r) && r.s.status === 'playing') {
        r = tick(level, r);
        fresh.push(...r.hits);
        acc -= stepMs;
      }
      if (isIdle(r) || r.s.status !== 'playing') acc = 0;
      if (r !== railRef.current) {
        railRef.current = r;
        setRail(r);
      }
      setPops((ps) => {
        const kept = ps.filter((x) => now - x.at < POP_MS);
        return fresh.length ? [...kept, ...fresh.map((h) => ({ ...h, at: now }))] : kept.length === ps.length ? ps : kept;
      });
      setFrame(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animating, level, stepMs]);

  // Kazanma / tıkanma titreşimi
  const lastStatus = useRef(s.status);
  useEffect(() => {
    if (s.status === lastStatus.current) return;
    lastStatus.current = s.status;
    if (s.status === 'won') haptic('win');
    else if (s.status === 'stuck') haptic('stuck');
  }, [s.status]);

  // Yarım kalan seviye kaydı: ray boşken, oynanırken
  const onSaveRef = useRef(props.onSave);
  onSaveRef.current = props.onSave;
  useEffect(() => {
    if (!onSaveRef.current || busy) return;
    if (s.status === 'won') onSaveRef.current(null);
    else if (s.launches > 0) onSaveRef.current(s);
  }, [s, busy]);

  // Kazanınca ödül bir kez verilir
  useEffect(() => {
    if (s.status !== 'won' || wonReported.current) return;
    wonReported.current = true;
    const stars = starsFor(s);
    // Ödül kazanma anında sabitlenir (ör. Günlük Mozaik ödülü yalnızca ilk bitirişte)
    setWonCoins(coinsForRef.current(stars));
    onWinRef.current({ stars, launches: s.launches, parked: s.parked, usedHelp: usedHelp.current });
    track({ name: 'level_complete', level: trackId, launches: s.launches, parked: s.parked, stars });
  }, [s, trackId]);

  useEffect(() => {
    if (s.status !== 'stuck' || stuckReported.current === s) return;
    stuckReported.current = s;
    track({ name: 'level_stuck', level: trackId, launches: s.launches, overflow: !!s.overflow });
  }, [s, trackId]);

  /** Envanterden, yoksa coin ile. İkisi de yoksa dükkanı açar. */
  const spend = (kind: Booster): boolean => {
    if (progress.boosters[kind] > 0) {
      usedHelp.current = true;
      update((p) => ({ ...p, boosters: { ...p.boosters, [kind]: p.boosters[kind] - 1 } }));
      track({ name: 'booster_used', kind, source: 'inventory' });
      return true;
    }
    const price = ECONOMY.prices[kind];
    if (progress.coins >= price) {
      usedHelp.current = true;
      update((p) => ({ ...p, coins: p.coins - price }));
      track({ name: 'booster_used', kind, source: 'coins' });
      return true;
    }
    money.openShop();
    return false;
  };

  const launch = (move: Move) => {
    const cur = railRef.current;
    if (cur.s.status !== 'playing') return;
    if (!canLaunch(level, cur, move)) {
      if (onRail(cur) >= MAX_ON_RAIL) setMessage(t('game.railFull'));
      return;
    }
    if (move.from === 'lane' && move.depth) {
      if (!spend('pick')) return;
      setPickMode(false);
    }
    const next = railLaunch(level, cur, move);
    setHistory((h) => [...h, cur]);
    railRef.current = next;
    setRail(next);
    if (next.hits.length) setPops((ps) => [...ps, ...next.hits.map((h) => ({ ...h, at: Date.now() }))]);
    setPreview(null);
    setHintMove(null);
    setMessage(null);
    haptic('tap');
  };

  /** Tura dokununca raydakiler hemen bitsin (sabırsız oyuncu için) */
  const skipAnim = () => {
    if (!busy) return;
    const next = finish(level, railRef.current);
    railRef.current = next;
    setRail(next);
  };

  const showPreview = (flox: Flox) => {
    if (busy) return;
    const r = runLoop(s.cells, level.w, level.h, flox);
    setPreview({ cells: new Set(r.hits.map((h) => h.cell)), left: r.left });
  };

  const undo = () => {
    if (history.length === 0 || s.status === 'won') return;
    if (!spend('undo')) return;
    const prev = history[history.length - 1];
    railRef.current = prev;
    setRail(prev);
    setHistory((h) => h.slice(0, -1));
    setHintMove(null);
    setPickMode(false);
  };

  const restart = () => {
    const fresh = railFrom(initialState(level));
    railRef.current = fresh;
    setRail(fresh);
    setHistory([]);
    setPops([]);
    setHintMove(null);
    setPickMode(false);
    setMessage(null);
    props.onSave?.(null);
  };

  const askHint = () => {
    if (busy || s.status !== 'playing') return;
    const m = hint(level, s);
    if (!m) {
      setMessage(t('game.noSolution'));
      return;
    }
    if (!spend('hint')) return;
    setHintMove(m);
  };

  const togglePick = () => {
    if (s.status !== 'playing') return;
    const hasBehind = s.lanes.some((l, i) => l.length > 1 && lockRemaining(level, s, i) === 0);
    if (!hasBehind) {
      setMessage(t('game.noPick'));
      return;
    }
    if (!pickMode && progress.boosters.pick === 0 && progress.coins < ECONOMY.prices.pick) {
      money.openShop();
      return;
    }
    setPickMode((v) => !v);
    setMessage(pickMode ? null : t('game.pickHint'));
  };

  const extraSlot = () => {
    if (s.status !== 'playing') return;
    if (!spend('extraSlot')) return;
    setRail((cur) => addSlot(level, cur));
  };

  // Tıkanınca kurtarma
  const today = todayUTC();
  const rescueAdsUsed = progress.rescueAdsToday.day === today ? progress.rescueAdsToday.count : 0;
  const canRescueAd = rescueAdsUsed < ECONOMY.rescueAdsPerDay && money.rewardedAvailable();

  const rescueByAd = async () => {
    if (adBusy) return;
    setAdBusy(true);
    const ok = await money.watchAd('rescue');
    setAdBusy(false);
    if (!ok) return;
    usedHelp.current = true;
    update((p) => ({ ...p, rescueAdsToday: { day: today, count: rescueAdsUsed + 1 } }));
    track({ name: 'booster_used', kind: 'extraSlot', source: 'ad' });
    setRail((cur) => rescue(level, cur));
  };

  const rescueBySpend = () => {
    if (!spend('extraSlot')) return;
    setRail((cur) => rescue(level, cur));
  };

  const doubleCoins = async () => {
    if (adBusy || doubled) return;
    setAdBusy(true);
    const ok = await money.watchAd('double_coins');
    setAdBusy(false);
    if (!ok) return;
    setDoubled(true);
    update((p) => ({ ...p, coins: p.coins + earned }));
  };

  // Ekranda gösterilen durum: ray simülasyonu doğrudan çizilir
  const now = Date.now();
  const tokenSize = RAIL - 2;
  const tokens = rail.riders.map((rd) => ({ rd, ...stopPos(path[Math.min(rd.pos, path.length - 1)]) }));
  const trails = rail.riders.flatMap((rd) =>
    [1, 2, 3].filter((k) => rd.pos - k >= 0).map((k) => ({ id: rd.id, k, color: rd.flox.color, ...stopPos(path[rd.pos - k]) })),
  );
  const popViews = pops.map((p) => ({ ...p, t: Math.min(1, (now - p.at) / POP_MS) }));
  const railStops = useMemo(() => path.map((st) => stopPos(st)), [path, stopPos]);

  const infoText = preview
    ? preview.left === 0
      ? t('game.previewClean')
      : t('game.previewPark', { hits: preview.cells.size, left: preview.left })
    : (message ?? t('game.idle', { n: floxesLeft(s) }));

  const boosterLabel = (k: Booster) =>
    progress.boosters[k] > 0 ? t('game.uses', { n: progress.boosters[k] }) : `● ${ECONOMY.prices[k]}`;
  const boosterBadge = (k: Booster) =>
    progress.boosters[k] > 0
      ? { text: `${progress.boosters[k]}`, coin: false }
      : { text: `${ECONOMY.prices[k]}`, coin: true };

  return (
    <SkinCtx.Provider value={skin}>
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={props.onExit} hitSlop={12} style={styles.headerSide}>
          <Text style={styles.headerBtn}>{t('common.back')}</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>{heading}</Text>
          {(level.hard || level.title) && (
            <Text style={level.hard ? styles.hard : styles.picTitle}>
              {level.hard ? t('game.hardTag') : pictureName(level.title ?? '')}
            </Text>
          )}
        </View>
        <Pressable onPress={money.openShop} hitSlop={12} style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <Text style={styles.coinText}>● {progress.coins} +</Text>
        </Pressable>
      </View>

      {/* Tahta + ray. Tur sırasında dokununca tur hızla biter. */}
      <Pressable
        onPress={skipAnim}
        style={{ width: boardW + RAIL * 2, height: boardH + RAIL * 2, alignSelf: 'center' }}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.rail, borderRadius: RAIL, borderWidth: 2, borderColor: theme.railEdge },
          ]}
        />
        {railStops.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - 2,
              top: p.y - 2,
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.stop,
              opacity: i === 0 ? 1 : 0.35,
            }}
          />
        ))}
        <View
          style={{
            position: 'absolute',
            left: RAIL,
            top: RAIL,
            width: boardW,
            height: boardH,
            backgroundColor: theme.board,
            borderRadius: 6,
          }}
        >
          {Array.from({ length: level.h }, (_, y) => (
            <View key={y} style={{ flexDirection: 'row' }}>
              {Array.from({ length: level.w }, (_, x) => {
                const i = y * level.w + x;
                const c = s.cells[i];
                const marked = preview?.cells.has(i);
                const secret = s.hidden[i];
                return (
                  <View key={x} style={{ width: cs, height: cs, padding: 1 }}>
                    {c !== EMPTY && (
                      <Pixel
                        size={cs - 2}
                        color={secret ? UI.secret : COLORS[c]}
                        style={cellStyle}
                        marked={!!marked}
                        dimmed={!!preview && !marked}
                      >
                        {secret ? (
                          <Text style={[styles.cellMark, { fontSize: cs * 0.5, color: UI.dim }]}>?</Text>
                        ) : (
                          colorBlind &&
                          cs >= 16 && (
                            <Text style={[styles.cellMark, { fontSize: cs * 0.45 }]}>{SYMBOLS[c]}</Text>
                          )
                        )}
                      </Pixel>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {popViews.map((p) => (
          <View
            key={`pop${p.cell}-${p.rider}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: RAIL + (p.cell % level.w) * cs + 1,
              top: RAIL + Math.floor(p.cell / level.w) * cs + 1,
              width: cs - 2,
              height: cs - 2,
              borderRadius: cs / 3,
              backgroundColor: COLORS[p.color],
              borderWidth: 2,
              borderColor: '#FFFFFF',
              opacity: 1 - p.t,
              transform: [{ scale: 1 + p.t * 0.6 }],
            }}
          />
        ))}
        {trails.map((tr) => (
          <View
            key={`tr${tr.id}-${tr.k}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: tr.x - (tokenSize - tr.k * 4) / 2,
              top: tr.y - (tokenSize - tr.k * 4) / 2,
              width: tokenSize - tr.k * 4,
              height: tokenSize - tr.k * 4,
              borderRadius: tokenSize,
              backgroundColor: COLORS[tr.color],
              opacity: 0.45 - tr.k * 0.12,
            }}
          />
        ))}
        {tokens.map((tk) => (
          <View
            key={`tk${tk.rd.id}`}
            pointerEvents="none"
            style={{ position: 'absolute', left: tk.x - tokenSize / 2, top: tk.y - tokenSize / 2 }}
          >
            <FloxView flox={riderFlox(tk.rd)} size={tokenSize} />
          </View>
        ))}
      </Pressable>

      <Text style={styles.info}>{infoText}</Text>

      {/* Rıhtım */}
      <View style={[styles.dock, { backgroundColor: theme.panel }]}>
        {Array.from({ length: s.dockSize }, (_, i) => {
          const f = s.dock[i];
          const move: Move = { from: 'dock', index: i };
          return (
            <View key={i} style={[styles.slot, { backgroundColor: theme.board }]}>
              {f && (
                <FloxButton
                  flox={f}
                  colorBlind={colorBlind}
                  size={40}
                  highlight={sameMove(hintMove, move)}
                  onPress={() => launch(move)}
                  onLongPress={() => showPreview(f)}
                  onPressOut={() => setPreview(null)}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Şeritler */}
      <View style={styles.lanes}>
        {s.lanes.map((lane, li) => {
          const rest = lane.slice(0, LANE_VISIBLE);
          const hidden = lane.length - rest.length;
          const lockLeft = lockRemaining(level, s, li);
          if (lockLeft > 0 && lane.length > 0)
            return (
              <View key={li} style={styles.lane}>
                <View style={styles.lock}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.lockText}>{lockLeft}</Text>
                </View>
                <Text style={styles.more}>{t('game.lockFlox', { n: lane.length })}</Text>
              </View>
            );
          return (
            <View key={li} style={styles.lane}>
              {rest.map((f, k) => {
                const move: Move = { from: 'lane', index: li, depth: k };
                if (k === 0 || pickMode)
                  return (
                    <View key={k} style={{ marginTop: k === 0 ? 0 : 4 }}>
                      <FloxButton
                        flox={f}
                        colorBlind={colorBlind}
                        size={k === 0 ? 52 : 40}
                        highlight={k === 0 ? sameMove(hintMove, move) : pickMode}
                        onPress={() => launch(k === 0 ? { from: 'lane', index: li } : move)}
                        onLongPress={() => showPreview(f)}
                        onPressOut={() => setPreview(null)}
                      />
                    </View>
                  );
                return (
                  <View key={k} style={{ opacity: 0.6 - k * 0.15, marginTop: 8 }}>
                    <FloxView flox={f} size={40} colorBlind={colorBlind} />
                  </View>
                );
              })}
              {hidden > 0 && <Text style={styles.more}>+{hidden}</Text>}
            </View>
          );
        })}
      </View>

      <View style={styles.toolbar}>
        <Tool
          icon="↶"
          label={boosterName('undo')}
          badge={boosterBadge('undo')}
          disabled={history.length === 0 || s.status === 'won'}
          onPress={undo}
        />
        <Tool
          icon="💡"
          label={boosterName('hint')}
          badge={boosterBadge('hint')}
          disabled={busy || s.status !== 'playing'}
          onPress={askHint}
        />
        <Tool
          icon="⇡"
          label={boosterName('pick')}
          badge={boosterBadge('pick')}
          active={pickMode}
          disabled={s.status !== 'playing'}
          onPress={togglePick}
        />
        <Tool
          icon="＋"
          label={boosterName('extraSlot')}
          badge={boosterBadge('extraSlot')}
          disabled={s.status !== 'playing'}
          onPress={extraSlot}
        />
        <Tool icon="↻" label={t('game.restart')} onPress={restart} />
      </View>

      {s.status === 'won' && pops.length === 0 && (
        <Overlay>
          <Text style={styles.overTitle}>{starsFor(s) === 3 ? t('game.perfect') : t('game.done')}</Text>
          <Text style={styles.stars}>
            {'★'.repeat(starsFor(s))}
            <Text style={{ color: UI.panelHi }}>{'★'.repeat(3 - starsFor(s))}</Text>
          </Text>
          <Text style={styles.overSub}>
            {t('game.summary', { n: s.launches, park: s.parked === 0 ? t('game.noPark') : t('game.park', { n: s.parked }) })}
          </Text>
          {earned > 0 && <Text style={styles.reward}>{t('game.reward', { n: doubled ? earned * 2 : earned })}</Text>}
          {props.winPicture && (
            <View style={styles.unlock}>
              <PixelArt pic={props.winPicture} size={84} />
              <View style={{ flex: 1 }}>
                <Text style={styles.unlockSub}>{t('game.addedToAlbum')}</Text>
                <Text style={styles.unlockTitle}>{pictureName(props.winPicture.key)}</Text>
              </View>
            </View>
          )}
          {props.winMap && (
            <View style={styles.mapDone}>
              <Text style={styles.unlockTitle}>
                {props.winMap.icon} {t('maps.done', { name: mapName(props.winMap.key) })}
              </Text>
              <RewardLine reward={props.winMap.reward} />
            </View>
          )}
          <Btn label={props.nextLabel} primary disabled={adBusy} onPress={onNext} />
          {props.extraWinAction && (
            <Btn
              label={props.extraWinAction.label}
              onPress={() =>
                props.extraWinAction!.onPress({
                  stars: starsFor(s),
                  launches: s.launches,
                  parked: s.parked,
                  usedHelp: usedHelp.current,
                })
              }
            />
          )}
          {earned > 0 && !doubled && money.rewardedAvailable() && (
            <Btn label={t('game.adDouble', { n: earned * 2 })} gold loading={adBusy} onPress={doubleCoins} />
          )}
          {props.nextLabel !== t('common.home') && <TextLink label={t('common.home')} onPress={props.onExit} />}
        </Overlay>
      )}
      {s.status === 'stuck' && (
        <Overlay>
          <Text style={styles.overTitle}>{t('game.stuck')}</Text>
          <Text style={styles.overSub}>
            {s.overflow ? t('game.stuckOverflow') : t('game.stuckDeadlock')}
          </Text>
          <View style={{ height: 8 }} />
          {s.overflow && canRescueAd && (
            <Btn label={t('game.rescueAd')} gold loading={adBusy} onPress={rescueByAd} />
          )}
          {s.overflow && (
            <Btn label={t('game.rescueSpend', { cost: boosterLabel('extraSlot') })} primary onPress={rescueBySpend} />
          )}
          <Btn label={t('game.undoCost', { cost: boosterLabel('undo') })} onPress={undo} />
          <Btn label={t('game.restartFull')} onPress={restart} />
          <TextLink label={t('common.home')} onPress={props.onExit} />
        </Overlay>
      )}
    </View>
    </SkinCtx.Provider>
  );
}

export function FloxView({ flox, size, style }: { flox: Flox; size: number; colorBlind?: boolean; style?: FloxStyle }) {
  const ctx = useContext(SkinCtx);
  const kind = style ?? ctx.flox;
  const colorBlind = ctx.colorBlind;
  const label = (
    <>
      {colorBlind && <Text style={[styles.floxSym, { fontSize: size * 0.24 }]}>{SYMBOLS[flox.color]}</Text>}
      <Text style={[styles.floxText, { fontSize: size * (colorBlind ? 0.3 : 0.36) }]}>{flox.charge}</Text>
    </>
  );
  if (kind === 'elmas') {
    const d = size * 0.74;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={[
            styles.flox,
            {
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d * 0.16,
              backgroundColor: COLORS[flox.color],
              transform: [{ rotate: '45deg' }],
            },
          ]}
        >
          <View style={[styles.gloss, { width: d * 0.5, height: d * 0.16, borderRadius: d, top: d * 0.12, left: d * 0.12 }]} />
        </View>
        {label}
      </View>
    );
  }
  const radius = kind === 'kup' ? size * 0.24 : size / 2;
  return (
    <View
      style={[
        styles.flox,
        { width: size, height: size, borderRadius: radius, backgroundColor: COLORS[flox.color], overflow: 'hidden' },
      ]}
    >
      {kind === 'parlak' && (
        <View
          style={[
            styles.gloss,
            { width: size * 0.26, height: size * 0.26, borderRadius: size, top: size * 0.12, left: size * 0.16 },
          ]}
        />
      )}
      {kind === 'kup' && (
        <View style={[styles.gloss, { left: 0, right: 0, top: 0, height: size * 0.3, borderRadius: 0, opacity: 0.25 }]} />
      )}
      {label}
    </View>
  );
}

/** Tahtadaki tek piksel; marketteki piksel stiline göre çizilir. */
export function Pixel(props: {
  size: number;
  color: string;
  style: CellStyle;
  marked?: boolean;
  dimmed?: boolean;
  children?: React.ReactNode;
}) {
  const { size, style } = props;
  const radius =
    style === 'boncuk' ? size / 2 : style === 'karo' ? 1 : style === 'seker' ? size / 3 : Math.max(2, size / 5);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: props.color,
        borderWidth: props.marked ? 2 : style === 'karo' ? 1 : 0,
        borderColor: props.marked ? '#FFFFFF' : 'rgba(0,0,0,0.3)',
        opacity: props.dimmed ? 0.5 : 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {style === 'boncuk' ? (
        <View
          style={[styles.gloss, { width: size * 0.3, height: size * 0.3, borderRadius: size, top: size * 0.14, left: size * 0.16 }]}
        />
      ) : (
        <View
          style={[
            styles.gloss,
            { left: 0, right: 0, top: 0, height: size * (style === 'seker' ? 0.45 : 0.32), borderRadius: 0 },
            { opacity: style === 'seker' ? 0.32 : 0.18 },
          ]}
        />
      )}
      {style === 'seker' && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.22, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      )}
      {props.children}
    </View>
  );
}

function FloxButton(props: {
  flox: Flox;
  colorBlind?: boolean;
  size: number;
  highlight: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      onPressOut={props.onPressOut}
      delayLongPress={220}
      hitSlop={6}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.93 : 1 }],
        borderRadius: props.size,
        borderWidth: 3,
        borderColor: props.highlight ? UI.accent : 'transparent',
        padding: 2,
      })}
    >
      <FloxView flox={props.flox} size={props.size} colorBlind={props.colorBlind} />
    </Pressable>
  );
}

/** Alttaki araç kartı: simge + ad, sağ üstte hak sayısı ya da coin fiyatı */
function Tool(props: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  badge?: { text: string; coin: boolean };
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.tool,
        props.active && { borderColor: UI.accent },
        { opacity: props.disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={styles.toolIcon}>{props.icon}</Text>
      <Text style={styles.toolText} numberOfLines={1}>
        {props.label}
      </Text>
      {props.badge && (
        <View style={[styles.badge, props.badge.coin && { backgroundColor: UI.gold }]}>
          <Text style={styles.badgeText}>{props.badge.coin ? `●${props.badge.text}` : props.badge.text}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: UI.text, fontSize: 20, fontWeight: '700' },
  back: { color: UI.text, fontSize: 34, fontWeight: '300', marginTop: -6, paddingRight: 4 },
  cellMark: { color: 'rgba(18,20,28,0.75)', fontWeight: '900' },
  gloss: { position: 'absolute', backgroundColor: '#FFFFFF', opacity: 0.45 },
  floxSym: { color: 'rgba(18,20,28,0.8)', fontWeight: '900', marginBottom: -2 },
  lock: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: UI.panel,
    borderWidth: 2,
    borderColor: UI.railEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 18 },
  lockText: { color: UI.text, fontWeight: '800', fontSize: 12 },
  hard: { color: UI.danger, fontSize: 12, fontWeight: '700', marginTop: 2 },
  picTitle: { color: UI.dim, fontSize: 12, marginTop: 2 },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.panel,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinText: { color: UI.gold, fontWeight: '700', fontSize: 16 },
  coinPlus: { color: UI.accent, fontWeight: '900', fontSize: 16 },
  info: { color: UI.dim, textAlign: 'center', marginVertical: 12, minHeight: 20, fontSize: 15, fontWeight: '700' },
  dock: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: UI.panel,
    borderRadius: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    paddingHorizontal: 10,
  },
  slot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: UI.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lanes: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 16, flex: 1 },
  lane: { alignItems: 'center', minWidth: 60 },
  more: { color: UI.dim, marginTop: 4, fontSize: 12 },
  flox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  floxText: { color: '#12141C', fontWeight: '900' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 12 },
  tool: {
    backgroundColor: UI.panel,
    borderRadius: 14,
    width: 64,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerSide: { minWidth: 80 },
  headerBtn: { color: UI.dim, fontSize: 17 },
  toolIcon: { color: UI.text, fontSize: 18 },
  badgeText: { color: UI.bg, fontSize: 11, fontWeight: '800' },
  toolText: { color: UI.text, fontWeight: '600', fontSize: 11, marginTop: 2 },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: UI.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,10,16,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { width: '86%', backgroundColor: UI.panel, borderRadius: 22, padding: 24, alignItems: 'center', gap: 4 },
  overTitle: { color: UI.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  overSub: { color: UI.dim, textAlign: 'center' },
  reward: { color: UI.gold, fontSize: 18, fontWeight: '700', marginVertical: 8 },
  unlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
    backgroundColor: UI.bg2,
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
  },
  unlockSub: { color: UI.dim, fontSize: 14, fontWeight: '700' },
  unlockTitle: { color: UI.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  mapDone: {
    alignSelf: 'stretch',
    backgroundColor: UI.bg2,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: UI.gold,
    padding: 12,
    gap: 10,
    marginBottom: 6,
  },
  link: { color: UI.dim, fontSize: 13, textDecorationLine: 'underline', marginTop: 4 },
  stars: { color: UI.gold, fontSize: 40, letterSpacing: 4 },
});
