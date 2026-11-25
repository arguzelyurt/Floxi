import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  collection,
  Cosmetics,
  CosmeticKind,
  dailyDeals,
  isEquipped,
  itemById,
  itemDesc,
  ItemKind,
  itemName,
  MARKET,
  MarketItem,
  MarketSet,
  ownsItem,
  priceFor,
  Rarity,
  SETS,
  setName,
  setPrice,
  Wallet,
} from '../core/market';
import { MAPS } from '../core/maps';
import { PICTURES } from '../core/pictures';
import { boosterName, Booster } from '../core/monetization';
import { Key, t } from '../i18n';
import { COLORS, UI } from '../game/palette';
import { cellStyleFor, floxStyleFor, pedestalFor, popStyleFor, themeFor, trailStyleFor } from '../game/skins';
import { FloxView, Pixel, PopView, TrailDot } from './GameScreen';
import { TabHeader } from './kit';
import { mapName } from './MapsScreen';
import PixelArt from './PixelArt';
import { BOOSTER_ICON } from './RewardLine';

interface Props {
  wallet: Wallet;
  /** Günün fırsatı için bugünün anahtarı (YYYY-MM-DD) */
  dateKey: string;
  onBuy(id: string): void;
  onEquip(id: string): void;
  onExit?(): void;
  /** Coin yetmeyince gerçek para dükkanı */
  onOpenShop(): void;
}

type Tab = ItemKind | 'set';
const TABS: Tab[] = ['theme', 'flox', 'cells', 'trail', 'pop', 'pedestal', 'set', 'booster'];
const BOOSTERS: Booster[] = ['undo', 'hint', 'pick', 'extraSlot'];

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9AA5B1',
  rare: UI.accent,
  epic: '#B06CFF',
  legendary: UI.gold,
};
const rarityName = (r: Rarity) => t(`market.rarity.${r}` as Key);

/** Ürünün durumu: kullanılıyor / sahip / harita kilidi / satılık */
function itemState(w: Wallet, item: MarketItem) {
  const equipped = isEquipped(w, item);
  const owned = item.kind !== 'booster' && ownsItem(w, item);
  const locked = !owned && item.unlockMap !== undefined;
  return { equipped, owned, locked };
}

/** Gece yarısına (UTC) kalan süre */
function untilReset(): { h: number; m: number } {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const mins = Math.max(0, Math.floor((next - now.getTime()) / 60000));
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

export default function MarketScreen({ wallet, dateKey, onBuy, onEquip, onOpenShop }: Props) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('theme');
  const [detail, setDetail] = useState<MarketItem | null>(null);
  const col = collection(wallet);
  const deals = dailyDeals(dateKey);
  const reset = untilReset();
  const cardW = Math.floor((width - 24 * 2 - 12) / 2);
  const tileW = Math.floor((width - 24 * 2 - 16 * 2 - 10 * 2) / 3);

  const buy = (item: MarketItem) => (wallet.coins >= priceFor(item, dateKey) ? onBuy(item.id) : onOpenShop());

  return (
    <View style={{ flex: 1 }}>
      <TabHeader title={t('market.title')} coins={wallet.coins} onCoins={onOpenShop} />

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.colRow}>
          <Text style={styles.colText}>{t('market.collection', { a: col.owned, b: col.total })}</Text>
          <View style={styles.colBar}>
            <View style={[styles.colFill, { width: `${(col.owned / col.total) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.deals}>
          <View style={styles.dealsHead}>
            <Text style={styles.dealsTitle}>{t('market.deals')}</Text>
            <Text style={styles.dealsIn}>{t('market.dealsIn', { h: reset.h, m: reset.m })}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {deals.map((d) => {
              const item = itemById(d.id)!;
              const st = itemState(wallet, item);
              return (
                <Pressable key={d.id} onPress={() => setDetail(item)} style={[styles.dealTile, { width: tileW }]}>
                  <View style={styles.offBadge}>
                    <Text style={styles.offText}>-%{d.off}</Text>
                  </View>
                  <Preview item={item} cosmetics={wallet.cosmetics} w={tileW - 16} h={58} />
                  <Text style={styles.dealName} numberOfLines={1}>
                    {itemName(item)}
                  </Text>
                  {st.owned ? (
                    <Text style={styles.dealOwned}>{t('market.owned')}</Text>
                  ) : (
                    <Text style={styles.dealPrice}>
                      <Text style={styles.oldPrice}>{item.price}</Text> ● {priceFor(item, dateKey)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && styles.tabOn]}>
              <Text style={[styles.tabText, tab === k && { color: UI.bg }]}>{t(`market.tab.${k}` as Key)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'booster' && (
          <>
            <View style={styles.inventory}>
              {BOOSTERS.map((k) => (
                <View key={k} style={styles.invItem}>
                  <Text style={styles.invCount}>
                    {BOOSTER_ICON[k]} {wallet.boosters[k]}
                  </Text>
                  <Text style={styles.invName}>{boosterName(k)}</Text>
                </View>
              ))}
            </View>
            {MARKET.filter((m) => m.kind === 'booster').map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={styles.boosterIcon}>{item.booster ? BOOSTER_ICON[item.booster.kind] : '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{itemName(item)}</Text>
                  {item.desc && <Text style={styles.desc}>{itemDesc(item)}</Text>}
                </View>
                <PriceBtn price={item.price} affordable={wallet.coins >= item.price} onPress={() => buy(item)} />
              </View>
            ))}
          </>
        )}

        {tab === 'set' &&
          SETS.map((set) => (
            <SetCard key={set.id} set={set} wallet={wallet} onBuy={() => (wallet.coins >= setPrice(wallet, set) ? onBuy(set.id) : onOpenShop())} />
          ))}

        {tab !== 'booster' && tab !== 'set' && (
          <View style={styles.grid}>
            {MARKET.filter((m) => m.kind === tab).map((item) => {
              const st = itemState(wallet, item);
              const rc = RARITY_COLOR[item.rarity ?? 'common'];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setDetail(item)}
                  style={({ pressed }) => [
                    styles.card,
                    { width: cardW, borderColor: st.equipped ? UI.text : item.free ? 'transparent' : rc },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={st.locked && { opacity: 0.45 }}>
                    <Preview item={item} cosmetics={wallet.cosmetics} w={cardW - 20} h={86} />
                  </View>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {itemName(item)}
                  </Text>
                  {!item.free && <Text style={[styles.rarity, { color: rc }]}>{rarityName(item.rarity ?? 'common')}</Text>}
                  <Action wallet={wallet} item={item} dateKey={dateKey} onBuy={() => buy(item)} onEquip={() => onEquip(item.id)} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          {detail && (
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Preview item={detail} cosmetics={wallet.cosmetics} w={Math.min(320, width - 80)} h={200} big />
              <Text style={styles.sheetName}>{itemName(detail)}</Text>
              {!detail.free && (
                <Text style={[styles.rarity, { color: RARITY_COLOR[detail.rarity ?? 'common'], fontSize: 16 }]}>
                  {rarityName(detail.rarity ?? 'common')}
                </Text>
              )}
              <View style={{ alignSelf: 'stretch', marginTop: 12 }}>
                <Action
                  wallet={wallet}
                  item={detail}
                  dateKey={dateKey}
                  wide
                  onBuy={() => buy(detail)}
                  onEquip={() => onEquip(detail.id)}
                />
              </View>
              <Pressable onPress={() => setDetail(null)} hitSlop={10} style={{ marginTop: 14 }}>
                <Text style={styles.close}>{t('market.close')}</Text>
              </Pressable>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function PriceBtn({ price, affordable, onPress, wide }: { price: number; affordable: boolean; onPress(): void; wide?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, !affordable && styles.btnOff, wide && styles.btnWide]}>
      <Text style={[styles.btnText, !affordable && { color: UI.dim }]}>● {price}</Text>
    </Pressable>
  );
}

/** Kartın alt düğmesi: Kullanılıyor / Kullan / harita kilidi / fiyat */
function Action(props: { wallet: Wallet; item: MarketItem; dateKey: string; wide?: boolean; onBuy(): void; onEquip(): void }) {
  const { wallet, item, wide } = props;
  const st = itemState(wallet, item);
  if (st.equipped) return <Text style={[styles.using, wide && styles.btnWide]}>{t('market.using')}</Text>;
  if (st.owned)
    return (
      <Pressable onPress={props.onEquip} style={[styles.btn, styles.btnGhost, wide && styles.btnWide]}>
        <Text style={[styles.btnText, { color: UI.text }]}>{t('market.use')}</Text>
      </Pressable>
    );
  if (st.locked)
    return (
      <Text style={[styles.locked, wide && styles.btnWide]} numberOfLines={2}>
        🔒 {t('market.locked', { map: mapName(MAPS[item.unlockMap!].key) })}
      </Text>
    );
  const price = priceFor(item, props.dateKey);
  return <PriceBtn price={price} affordable={wallet.coins >= price} onPress={props.onBuy} wide={wide} />;
}

function SetCard({ set, wallet, onBuy }: { set: MarketSet; wallet: Wallet; onBuy(): void }) {
  const price = setPrice(wallet, set);
  const items = set.items.map((id) => itemById(id)!);
  return (
    <View style={styles.setCard}>
      <View style={styles.setHead}>
        <Text style={styles.name}>{setName(set)}</Text>
        <Text style={styles.setSave}>{t('market.setSave')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {items.map((m) => (
          <View key={m.id} style={[styles.setItem, ownsItem(wallet, m) && { opacity: 0.45 }]}>
            <Preview item={m} cosmetics={wallet.cosmetics} w={64} h={46} />
          </View>
        ))}
      </View>
      {price === 0 ? (
        <Text style={styles.using}>{t('market.setDone')}</Text>
      ) : (
        <PriceBtn price={price} affordable={wallet.coins >= price} onPress={onBuy} wide />
      )}
    </View>
  );
}

const SAMPLE = [0, 2, 3, 5, 7, 6, 1, 4];

/**
 * Ürünün önizlemesi: mini tahta + ray + flox, ürün o an takılıymış gibi.
 * Tema, flox, piksel, iz ve efekt aynı sahnede birlikte görünür.
 */
function Preview({ item, cosmetics, w, h, big }: { item: MarketItem; cosmetics: Cosmetics; w: number; h: number; big?: boolean }) {
  if (item.kind === 'booster')
    return <Text style={styles.boosterIcon}>{item.booster ? BOOSTER_ICON[item.booster.kind] : '🎁'}</Text>;
  const cos = { ...cosmetics, [item.kind as CosmeticKind]: item.id };
  if (item.kind === 'pedestal') {
    const pd = pedestalFor(item.id);
    const box = Math.min(w, h) * 0.92;
    return (
      <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: box,
            height: box,
            borderRadius: box * 0.2,
            backgroundColor: pd.bg,
            borderWidth: 2,
            borderColor: pd.border,
            borderBottomWidth: Math.max(4, box * 0.07),
            borderBottomColor: pd.base,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PixelArt pic={PICTURES[0]} size={box * 0.66} />
        </View>
      </View>
    );
  }
  const theme = themeFor(cos.theme);
  const accentColor = SAMPLE[item.id.length % SAMPLE.length];
  // Küçük kartta flox / iz / efekt ürünün kendisi büyük gösterilir
  if (!big && item.kind === 'flox')
    return (
      <View style={[styles.focus, { width: w, height: h, backgroundColor: theme.board }]}>
        <FloxView flox={{ color: accentColor, charge: 6 }} size={h * 0.7} style={floxStyleFor(item.id)} />
      </View>
    );
  if (!big && item.kind === 'trail') {
    const tk = h * 0.42;
    const kind = trailStyleFor(item.id);
    const len = kind === 'kuyruk' ? 6 : kind === 'standart' ? 3 : 4;
    const y = h / 2;
    const x = w - tk * 0.9;
    return (
      <View style={[styles.focus, { width: w, height: h, backgroundColor: theme.board }]}>
        <View style={{ position: 'absolute', left: 4, right: 4, top: y - tk * 0.65, height: tk * 1.3, borderRadius: tk, backgroundColor: theme.rail }} />
        {Array.from({ length: len }, (_, i) => i + 1).map((k) => (
          <TrailDot key={k} kind={kind} x={x - k * tk * 0.62} y={y} k={k} len={len} size={tk} color={accentColor} />
        ))}
        <View style={{ position: 'absolute', left: x - tk / 2, top: y - tk / 2 }}>
          <FloxView flox={{ color: accentColor, charge: 6 }} size={tk} style={floxStyleFor(cos.flox)} />
        </View>
      </View>
    );
  }
  if (!big && item.kind === 'pop') {
    const px = h * 0.4;
    const gap = 6;
    const left = (w - px * 3 - gap * 2) / 2;
    const top = (h - px) / 2;
    return (
      <View style={[styles.focus, { width: w, height: h, backgroundColor: theme.board }]}>
        {[0, 2].map((i) => (
          <View key={i} style={{ position: 'absolute', left: left + i * (px + gap), top }}>
            <Pixel size={px} color={COLORS[SAMPLE[(i + 3) % SAMPLE.length]]} style={cellStyleFor(cos.cells)} />
          </View>
        ))}
        <PopView kind={popStyleFor(item.id)} x={left + px + gap} y={top} size={px} color={COLORS[accentColor]} t={0.35} />
      </View>
    );
  }
  const R = h * 0.2;
  const cols = 5;
  const rows = 3;
  const cs = Math.floor(Math.min((w - 2 * R - 8) / cols, (h - 2 * R - 8) / rows));
  const tokenY = h - R / 2;
  const tokenX = w * 0.66;
  const trailKind = trailStyleFor(cos.trail);
  const trailLen = trailKind === 'kuyruk' ? 6 : trailKind === 'standart' ? 3 : 4;
  const color = SAMPLE[(item.id.length + (big ? 1 : 0)) % SAMPLE.length];
  const boardLeft = (w - cs * cols) / 2;
  const boardTop = (h - cs * rows) / 2;
  return (
    <View style={{ width: w, height: h }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: w,
          height: h,
          borderRadius: R,
          backgroundColor: theme.rail,
          borderWidth: 2,
          borderColor: theme.railEdge,
        }}
      />
      <View style={{ position: 'absolute', left: R, top: R, width: w - 2 * R, height: h - 2 * R, borderRadius: 6, backgroundColor: theme.board }} />
      {Array.from({ length: rows * cols }, (_, i) => {
        const c = SAMPLE[(i * 3 + item.id.length) % SAMPLE.length];
        if (i === 7) return null;
        return (
          <View key={i} style={{ position: 'absolute', left: boardLeft + (i % cols) * cs + 1, top: boardTop + Math.floor(i / cols) * cs + 1 }}>
            <Pixel size={cs - 2} color={COLORS[c]} style={cellStyleFor(cos.cells)} />
          </View>
        );
      })}
      <PopView
        kind={popStyleFor(cos.pop)}
        x={boardLeft + 2 * cs + 1}
        y={boardTop + cs + 1}
        size={cs - 2}
        color={COLORS[SAMPLE[(7 * 3 + item.id.length) % SAMPLE.length]]}
        t={0.4}
      />
      {Array.from({ length: trailLen }, (_, i) => i + 1).map((k) => (
        <TrailDot key={k} kind={trailKind} x={tokenX - k * R * 0.75} y={tokenY} k={k} len={trailLen} size={R * 0.95} color={color} />
      ))}
      <View style={{ position: 'absolute', left: tokenX - (R * 1.15) / 2, top: tokenY - (R * 1.15) / 2 }}>
        <FloxView flox={{ color, charge: 6 }} size={R * 1.15} style={floxStyleFor(cos.flox)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  focus: { borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colText: { color: UI.dim, fontSize: 15, fontWeight: '700' },
  colBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: UI.bg2, overflow: 'hidden' },
  colFill: { height: 8, borderRadius: 4, backgroundColor: UI.accent },
  deals: { backgroundColor: UI.panel, borderRadius: 20, padding: 16, gap: 12, borderWidth: 2, borderColor: UI.accent },
  dealsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealsTitle: { color: UI.text, fontSize: 20, fontWeight: '900' },
  dealsIn: { color: UI.dim, fontSize: 14, fontWeight: '700' },
  dealTile: { backgroundColor: UI.bg2, borderRadius: 14, padding: 8, alignItems: 'center', gap: 4 },
  offBadge: {
    position: 'absolute',
    top: -8,
    right: -6,
    zIndex: 2,
    backgroundColor: '#EB5757',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  offText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  dealName: { color: UI.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  dealPrice: { color: UI.gold, fontSize: 14, fontWeight: '900' },
  dealOwned: { color: UI.accent, fontSize: 13, fontWeight: '800' },
  oldPrice: { color: UI.dim, textDecorationLine: 'line-through', fontWeight: '600' },
  tabs: { gap: 6, paddingVertical: 2 },
  tab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: UI.bg2 },
  tabOn: { backgroundColor: UI.accent },
  tabText: { color: UI.text, fontWeight: '800', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { backgroundColor: UI.panel, borderRadius: 18, padding: 10, alignItems: 'center', gap: 4, borderWidth: 2 },
  cardName: { color: UI.text, fontSize: 17, fontWeight: '800', marginTop: 6 },
  rarity: { fontSize: 13, fontWeight: '800' },
  inventory: { flexDirection: 'row', backgroundColor: UI.panel, borderRadius: 16, padding: 12 },
  invItem: { flex: 1, alignItems: 'center' },
  invCount: { color: UI.gold, fontSize: 20, fontWeight: '900' },
  invName: { color: UI.dim, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: UI.panel, borderRadius: 16, padding: 12 },
  name: { color: UI.text, fontSize: 18, fontWeight: '800' },
  desc: { color: UI.dim, fontSize: 14, marginTop: 2 },
  btn: { backgroundColor: UI.gold, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, minWidth: 92, alignItems: 'center', marginTop: 4 },
  btnWide: { alignSelf: 'stretch', paddingVertical: 14 },
  btnOff: { backgroundColor: UI.bg },
  btnGhost: { backgroundColor: UI.panelHi },
  btnText: { color: UI.bg, fontWeight: '900', fontSize: 16 },
  using: { color: UI.accent, fontWeight: '900', fontSize: 15, textAlign: 'center', paddingVertical: 10 },
  locked: { color: UI.dim, fontWeight: '800', fontSize: 13, textAlign: 'center', paddingVertical: 6 },
  boosterIcon: { fontSize: 30, color: UI.text, width: 44, textAlign: 'center' },
  setCard: { backgroundColor: UI.panel, borderRadius: 18, padding: 14, gap: 12 },
  setHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  setSave: { color: '#FFFFFF', backgroundColor: '#EB5757', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, fontWeight: '900', fontSize: 13 },
  setItem: { backgroundColor: UI.bg2, borderRadius: 12, padding: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,10,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: '88%', maxWidth: 380, backgroundColor: UI.panel, borderRadius: 24, padding: 22, alignItems: 'center' },
  sheetName: { color: UI.text, fontSize: 26, fontWeight: '900', marginTop: 14 },
  close: { color: UI.dim, fontSize: 16, fontWeight: '700' },
});
