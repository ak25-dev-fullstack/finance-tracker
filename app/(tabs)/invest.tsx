import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/constants/theme';

type Holding = {
  id: string;
  name: string;
  ticker: string;
  type: 'Stocks' | 'ETFs' | 'Bonds' | 'Crypto' | 'Cash' | 'Real Estate';
  value: number;
  change: number; // percent
  color: string;
};

const HOLDINGS: Holding[] = [
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', type: 'Stocks', value: 3420.50, change: 2.4, color: '#42A5F5' },
  { id: '2', name: 'Tesla Inc.', ticker: 'TSLA', type: 'Stocks', value: 1870.00, change: -1.2, color: '#42A5F5' },
  { id: '3', name: 'Vanguard S&P 500', ticker: 'VOO', type: 'ETFs', value: 5200.00, change: 0.8, color: '#6bd8cb' },
  { id: '4', name: 'iShares MSCI World', ticker: 'IWRD', type: 'ETFs', value: 2800.00, change: 0.3, color: '#6bd8cb' },
  { id: '5', name: 'UK Gilts 2030', ticker: 'GILT', type: 'Bonds', value: 1500.00, change: -0.1, color: '#F59E0B' },
  { id: '6', name: 'Bitcoin', ticker: 'BTC', type: 'Crypto', value: 920.00, change: 4.7, color: '#FF7043' },
  { id: '7', name: 'Ethereum', ticker: 'ETH', type: 'Crypto', value: 480.00, change: 3.1, color: '#FF7043' },
  { id: '8', name: 'Cash Reserve', ticker: 'CASH', type: 'Cash', value: 1200.00, change: 0, color: '#78909C' },
  { id: '9', name: 'Property Fund', ticker: 'PROP', type: 'Real Estate', value: 4000.00, change: 0.5, color: '#AB47BC' },
];

const TYPE_COLORS: Record<string, string> = {
  Stocks: '#42A5F5',
  ETFs: '#6bd8cb',
  Bonds: '#F59E0B',
  Crypto: '#FF7043',
  Cash: '#78909C',
  'Real Estate': '#AB47BC',
};

const TYPE_ICONS: Record<string, string> = {
  Stocks: 'trending-up-outline',
  ETFs: 'pie-chart-outline',
  Bonds: 'document-text-outline',
  Crypto: 'logo-bitcoin',
  Cash: 'cash-outline',
  'Real Estate': 'home-outline',
};

type FilterType = 'All' | Holding['type'];

export default function InvestScreen() {
  const [filter, setFilter] = useState<FilterType>('All');

  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);

  const byType = Object.entries(
    HOLDINGS.reduce<Record<string, number>>((acc, h) => {
      acc[h.type] = (acc[h.type] ?? 0) + h.value;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const filtered = filter === 'All' ? HOLDINGS : HOLDINGS.filter((h) => h.type === filter);

  const filters: FilterType[] = ['All', 'Stocks', 'ETFs', 'Bonds', 'Crypto', 'Cash', 'Real Estate'];

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Invest</Text>
            <Text style={s.sub}>Your portfolio overview</Text>
          </View>
          <Pressable style={s.iconBtn}>
            <Ionicons name="refresh-outline" size={20} color={C.brandLight} />
          </Pressable>
        </View>

        {/* Total Card */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Portfolio Value</Text>
          <Text style={s.totalAmount}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
          <View style={s.totalBadge}>
            <Ionicons name="trending-up" size={12} color={C.income} />
            <Text style={s.totalBadgeText}> +6.2% this year</Text>
          </View>
        </View>

        {/* Breakdown by Type */}
        <Text style={s.sectionTitle}>Breakdown</Text>
        <View style={s.breakdownCard}>
          {byType.map(([type, value]) => {
            const pct = (value / total) * 100;
            const col = TYPE_COLORS[type] ?? C.brand;
            return (
              <View key={type} style={s.breakdownRow}>
                <View style={[s.breakdownDot, { backgroundColor: col }]} />
                <Text style={s.breakdownType}>{type}</Text>
                <View style={s.breakdownBarWrap}>
                  <View style={[s.breakdownBar, { width: `${pct}%` as any, backgroundColor: col + '55' }]}>
                    <View style={[s.breakdownBarFill, { width: `${Math.min(pct * 2, 100)}%` as any, backgroundColor: col }]} />
                  </View>
                </View>
                <Text style={s.breakdownPct}>{pct.toFixed(1)}%</Text>
                <Text style={s.breakdownVal}>£{value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</Text>
              </View>
            );
          })}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 22 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {filters.map((f) => (
            <Pressable key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Holdings */}
        <Text style={s.sectionTitle}>Holdings</Text>
        {filtered.map((h) => (
          <View key={h.id} style={s.holdingCard}>
            <View style={[s.holdingIcon, { backgroundColor: h.color + '22' }]}>
              <Ionicons name={TYPE_ICONS[h.type] as any} size={18} color={h.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.holdingNameRow}>
                <Text style={s.holdingName}>{h.name}</Text>
                <View style={[s.typeBadge, { backgroundColor: h.color + '22' }]}>
                  <Text style={[s.typeBadgeText, { color: h.color }]}>{h.type}</Text>
                </View>
              </View>
              <Text style={s.holdingTicker}>{h.ticker}</Text>
            </View>
            <View style={s.holdingRight}>
              <Text style={s.holdingValue}>£{h.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
              <Text style={[s.holdingChange, { color: h.change > 0 ? C.income : h.change < 0 ? C.destructive : C.textMuted }]}>
                {h.change > 0 ? '+' : ''}{h.change.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  totalCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.brand, borderRadius: 20, padding: 22 },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  totalAmount: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 10 },
  totalBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.incomeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { fontSize: 12, fontWeight: '600', color: C.income },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginHorizontal: 20, marginTop: 22, marginBottom: 12 },

  breakdownCard: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownType: { fontSize: 13, fontWeight: '500', color: C.textSecondary, width: 88 },
  breakdownBarWrap: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
  breakdownBar: { height: '100%', borderRadius: 4, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 4 },
  breakdownPct: { fontSize: 12, color: C.textMuted, width: 38, textAlign: 'right' },
  breakdownVal: { fontSize: 12, fontWeight: '600', color: C.textPrimary, width: 64, textAlign: 'right' },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  filterPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  filterPillText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  filterPillTextActive: { color: '#fff', fontWeight: '600' },

  holdingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  holdingIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  holdingNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  holdingName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  holdingTicker: { fontSize: 12, color: C.textMuted },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  holdingChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
