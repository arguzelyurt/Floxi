import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Booster } from '../core/monetization';
import { MapReward } from '../core/maps';
import { UI } from '../game/palette';

export const BOOSTER_ICON: Record<Booster, string> = { undo: '↶', hint: '💡', pick: '⇡', extraSlot: '＋' };
const ORDER: Booster[] = ['hint', 'undo', 'pick', 'extraSlot'];

/** Ödül çipleri: ● 150  💡 2  ↶ 3 … */
export default function RewardLine({ reward, dim }: { reward: MapReward; dim?: boolean }) {
  return (
    <View style={[styles.row, dim && { opacity: 0.45 }]}>
      <View style={styles.chip}>
        <Text style={[styles.text, { color: UI.gold }]}>● {reward.coins}</Text>
      </View>
      {ORDER.filter((k) => reward.boosters[k]).map((k) => (
        <View key={k} style={styles.chip}>
          <Text style={styles.text}>
            {BOOSTER_ICON[k]} {reward.boosters[k]}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  chip: { backgroundColor: UI.bg2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  text: { color: UI.text, fontSize: 15, fontWeight: '800' },
});
