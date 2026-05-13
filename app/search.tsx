import { C } from '@/constants/theme';
import { CONNECTED_BANKS_KEY } from '@/app/connect-bank';
import { loadTransactions, Transaction } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Static data (mirrors invest / save tab constants) ───────────────────────

const HOLDINGS = [
  { id: 'h1', name: 'Apple Inc.',          ticker: 'AAPL', value: 3420.50 },
  { id: 'h2', name: 'Tesla Inc.',           ticker: 'TSLA', value: 1870.00 },
  { id: 'h3', name: 'Vanguard S&P 500',    ticker: 'VOO',  value: 5200.00 },
  { id: 'h4', name: 'iShares MSCI World',  ticker: 'IWRD', value: 2800.00 },
  { id: 'h5', name: 'UK Gilts 2030',       ticker: 'GILT', value: 1500.00 },
  { id: 'h6', name: 'Bitcoin',             ticker: 'BTC',  value: 920.00  },
  { id: 'h7', name: 'Ethereum',            ticker: 'ETH',  value: 480.00  },
  { id: 'h8', name: 'Cash Reserve',        ticker: 'CASH', value: 1200.00 },
  { id: 'h9', name: 'Property Fund',       ticker: 'PROP', value: 4000.00 },
];

const GOALS = [
  { id: 's1', name: 'Emergency Fund',    current: 3200,  target: 5000,   route: '/(tabs)/save'           },
  { id: 's2', name: 'Holiday — Japan',   current: 840,   target: 2500,   route: '/(tabs)/save'           },
  { id: 's3', name: 'New Laptop',        current: 1200,  target: 1200,   route: '/(tabs)/save'           },
  { id: 'i1', name: 'Retirement at 60',  current: 40600, target: 500000, route: '/(tabs)/invest?tab=goals' },
  { id: 'i2', name: 'Buy a property',    current: 22400, target: 80000,  route: '/(tabs)/invest?tab=goals' },
  { id: 'i3', name: 'Education fund',    current: 8200,  target: 30000,  route: '/(tabs)/invest?tab=goals' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hit(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Bank = { id: string; name: string; accountName: string; accountNumber: string; balance: number; color: string };

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  useFocusEffect(useCallback(() => {
    Promise.all([loadTransactions(), AsyncStorage.getItem(CONNECTED_BANKS_KEY)]).then(
      ([txs, raw]) => { setTransactions(txs); setBanks(raw ? JSON.parse(raw) : []); }
    );
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []));

  const q = query.trim();

  const txHits = useMemo(() =>
    q ? transactions.filter(t => hit(t.description, q) || hit(t.category, q)).slice(0, 6) : [],
    [transactions, q]);

  const bankHits = useMemo(() =>
    q ? banks.filter(b => hit(b.name, q) || hit(b.accountName, q)) : [],
    [banks, q]);

  const holdingHits = useMemo(() =>
    q ? HOLDINGS.filter(h => hit(h.name, q) || hit(h.ticker, q)) : [],
    [q]);

  const goalHits = useMemo(() =>
    q ? GOALS.filter(g => hit(g.name, q)) : [],
    [q]);

  const hasResults = txHits.length + bankHits.length + holdingHits.length + goalHits.length > 0;

  const go = (route: string) => router.navigate(route as any);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Search bar */}
      <View style={s.bar}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          ref={inputRef}
          style={s.input}
          placeholder="Search..."
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </Pressable>
        )}
        <Pressable onPress={() => router.back()} style={s.cancelBtn}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {!q ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={48} color={C.border} />
            <Text style={s.emptyTitle}>Search everything</Text>
            <Text style={s.emptySub}>Transactions, accounts, holdings and goals</Text>
          </View>
        ) : !hasResults ? (
          <View style={s.empty}>
            <Ionicons name="alert-circle-outline" size={40} color={C.border} />
            <Text style={s.emptyTitle}>No results for "{q}"</Text>
          </View>
        ) : (
          <>
            {txHits.length > 0 && (
              <Section title="Transactions" icon="receipt-outline">
                {txHits.map(t => (
                  <Row
                    key={t.id}
                    icon="receipt-outline"
                    iconColor={C.brandLight}
                    title={t.description || t.category}
                    sub={`${t.category} · ${t.date}`}
                    right={`${t.type === 'income' ? '+' : '−'}£${t.amount.toFixed(2)}`}
                    rightColor={t.type === 'income' ? C.income : C.expense}
                    onPress={() => go('/(tabs)')}
                  />
                ))}
              </Section>
            )}

            {bankHits.length > 0 && (
              <Section title="Accounts" icon="wallet-outline">
                {bankHits.map(b => (
                  <Row
                    key={b.id}
                    icon="wallet-outline"
                    iconColor={b.color}
                    iconBg={b.color + '22'}
                    title={`${b.name} · ${b.accountName}`}
                    sub={`••••${b.accountNumber?.slice(-4)}`}
                    right={`£${b.balance?.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
                    rightColor={C.income}
                    onPress={() => go('/connect-bank')}
                  />
                ))}
              </Section>
            )}

            {holdingHits.length > 0 && (
              <Section title="Holdings" icon="trending-up-outline">
                {holdingHits.map(h => (
                  <Row
                    key={h.id}
                    icon="trending-up-outline"
                    iconColor={C.brandLight}
                    title={h.name}
                    sub={h.ticker}
                    right={`£${h.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}
                    rightColor={C.textPrimary}
                    onPress={() => go('/(tabs)/invest')}
                  />
                ))}
              </Section>
            )}

            {goalHits.length > 0 && (
              <Section title="Goals" icon="flag-outline">
                {goalHits.map(g => (
                  <Row
                    key={g.id}
                    icon="flag-outline"
                    iconColor={C.brandLight}
                    title={g.name}
                    sub={`£${g.current.toLocaleString('en-GB')} of £${g.target.toLocaleString('en-GB')}`}
                    right={`${((g.current / g.target) * 100).toFixed(0)}%`}
                    rightColor={C.textMuted}
                    onPress={() => go(g.route)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Ionicons name={icon as any} size={13} color={C.textMuted} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function Row({
  icon, iconColor, iconBg, title, sub, right, rightColor, onPress,
}: {
  icon: string; iconColor: string; iconBg?: string;
  title: string; sub: string; right: string; rightColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.row} onPress={onPress} android_ripple={{ color: C.border }}>
      <View style={[s.rowIcon, { backgroundColor: iconBg ?? C.brandBg }]}>
        <Ionicons name={icon as any} size={15} color={iconColor} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={[s.rowRight, { color: rightColor }]}>{right}</Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  bar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11,
  },
  input: { flex: 1, fontSize: 15, color: C.textPrimary },
  cancelBtn: { marginLeft: 12 },
  cancelText: { fontSize: 14, color: C.brandLight, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center' },

  section: { marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8, marginLeft: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  rowSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  rowRight: { fontSize: 13, fontWeight: '700' },
});
