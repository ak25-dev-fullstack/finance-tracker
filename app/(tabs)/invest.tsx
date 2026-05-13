import { C } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// ─── Portfolio history (last 12 months) ─────────────────────────────────────

const PORTFOLIO_HISTORY = [14800, 16200, 15600, 17400, 18900, 19500, 18700, 20100, 21800, 22400, 20900, 21390];

function MiniLineChart() {
  const [width, setWidth] = useState(0);
  const height = 56;
  const pad = 2;

  const min = Math.min(...PORTFOLIO_HISTORY);
  const max = Math.max(...PORTFOLIO_HISTORY);
  const range = max - min || 1;

  const pts = PORTFOLIO_HISTORY.map((v, i) => ({
    x: pad + (i / (PORTFOLIO_HISTORY.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`;

  return (
    <View style={{ marginTop: 16 }} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fff" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#fff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#chartGrad)" />
          <Path d={line} stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

// ─── Shared data ────────────────────────────────────────────────────────────

type Holding = {
  id: string;
  name: string;
  ticker: string;
  type: 'Stocks' | 'ETFs' | 'Bonds' | 'Crypto' | 'Cash' | 'Real Estate';
  value: number;
  change: number;
};

const TYPE_COLORS: Record<string, string> = {
  Stocks: '#42A5F5', ETFs: '#00b4d8', Bonds: '#F59E0B',
  Crypto: '#FF7043', Cash: '#78909C', 'Real Estate': '#AB47BC',
};
const TYPE_ICONS: Record<string, string> = {
  Stocks: 'trending-up-outline', ETFs: 'pie-chart-outline',
  Bonds: 'document-text-outline', Crypto: 'logo-bitcoin',
  Cash: 'cash-outline', 'Real Estate': 'home-outline',
};

const HOLDINGS: Holding[] = [
  { id: '1', name: 'Apple Inc.', ticker: 'AAPL', type: 'Stocks', value: 3420.50, change: 2.4 },
  { id: '2', name: 'Tesla Inc.', ticker: 'TSLA', type: 'Stocks', value: 1870.00, change: -1.2 },
  { id: '3', name: 'Vanguard S&P 500', ticker: 'VOO', type: 'ETFs', value: 5200.00, change: 0.8 },
  { id: '4', name: 'iShares MSCI World', ticker: 'IWRD', type: 'ETFs', value: 2800.00, change: 0.3 },
  { id: '5', name: 'UK Gilts 2030', ticker: 'GILT', type: 'Bonds', value: 1500.00, change: -0.1 },
  { id: '6', name: 'Bitcoin', ticker: 'BTC', type: 'Crypto', value: 920.00, change: 4.7 },
  { id: '7', name: 'Ethereum', ticker: 'ETH', type: 'Crypto', value: 480.00, change: 3.1 },
  { id: '8', name: 'Cash Reserve', ticker: 'CASH', type: 'Cash', value: 1200.00, change: 0 },
  { id: '9', name: 'Property Fund', ticker: 'PROP', type: 'Real Estate', value: 4000.00, change: 0.5 },
];

const CONNECTED_SOURCES = [
  { id: '1', name: 'Freetrade', type: 'Brokerage', accounts: 2, color: '#42A5F5', icon: 'trending-up-outline' },
  { id: '2', name: 'Moneybox', type: 'ISA / LISA', accounts: 1, color: '#00b4d8', icon: 'wallet-outline' },
];

const GOALS = [
  { id: '1', name: 'Retirement at 60', target: 500000, current: 40600, deadline: '2044', icon: 'leaf-outline', color: '#22C55E' },
  { id: '2', name: 'Buy a property', target: 80000, current: 22400, deadline: '2028', icon: 'home-outline', color: '#00b4d8' },
  { id: '3', name: 'Education fund', target: 30000, current: 8200, deadline: '2031', icon: 'school-outline', color: '#AB47BC' },
];

// ─── Sub-tab types ───────────────────────────────────────────────────────────

type Tab = 'portfolio' | 'upload' | 'goals';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'portfolio', label: 'Portfolio', icon: 'pie-chart-outline' },
  { key: 'goals', label: 'Goals', icon: 'flag-outline' },
  { key: 'upload', label: 'Upload', icon: 'add-circle-outline' },
];

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function InvestScreen() {
  const { tab: tabParam } = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>('portfolio');

  useEffect(() => {
    if (tabParam && (['portfolio', 'goals', 'upload'] as Tab[]).includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const total = HOLDINGS.reduce((s, h) => s + h.value, 0);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Invest</Text>
          <Text style={s.sub}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })} portfolio</Text>
        </View>
        <Pressable style={s.iconBtn}>
          <Ionicons name="refresh-outline" size={20} color={C.brandLight} />
        </Pressable>
      </View>

      {/* Sub-tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={[s.tabPill, tab === t.key && s.tabPillActive]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon as any} size={16} color={tab === t.key ? '#fff' : C.textMuted} />
            <Text style={[s.tabPillText, tab === t.key && s.tabPillTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={s.content}>
        {tab === 'portfolio' && <PortfolioTab total={total} />}
        {tab === 'goals' && <GoalsTab />}
        {tab === 'upload' && <UploadTab />}
      </View>
    </View>
  );
}

// ─── Portfolio tab ───────────────────────────────────────────────────────────

function PortfolioTab({ total }: { total: number }) {
  const [filter, setFilter] = useState<'All' | Holding['type']>('All');

  const byType = Object.entries(
    HOLDINGS.reduce<Record<string, number>>((acc, h) => {
      acc[h.type] = (acc[h.type] ?? 0) + h.value;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const filtered = filter === 'All' ? HOLDINGS : HOLDINGS.filter((h) => h.type === filter);
  const filters = ['All', 'Stocks', 'ETFs', 'Bonds', 'Crypto', 'Cash', 'Real Estate'] as const;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Total card */}
      <View style={[s.heroCard, { backgroundColor: '#0A1A2F' }]}>
        <Text style={s.heroLabel}>Total Portfolio Value</Text>
        <Text style={s.heroAmount}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
        <View style={s.heroBadge}>
          <Ionicons name="trending-up" size={12} color={C.income} />
          <Text style={s.heroBadgeText}> +6.2% this year</Text>
        </View>
        <MiniLineChart />
      </View>

      {/* Breakdown */}
      <Text style={s.sectionTitle}>Breakdown by type</Text>
      <View style={s.card}>
        {byType.map(([type, value]) => {
          const pct = (value / total) * 100;
          const col = TYPE_COLORS[type] ?? C.brand;
          return (
            <View key={type} style={s.breakdownRow}>
              <View style={[s.dot, { backgroundColor: col }]} />
              <Text style={s.breakdownType}>{type}</Text>
              <View style={s.barWrap}>
                <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: col }]} />
              </View>
              <Text style={s.breakdownPct}>{pct.toFixed(1)}%</Text>
              <Text style={s.breakdownVal}>£{value.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</Text>
            </View>
          );
        })}
      </View>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {filters.map((f) => (
          <Pressable key={f} style={[s.filterPill, filter === f && s.filterPillActive]} onPress={() => setFilter(f as any)}>
            <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Holdings */}
      <Text style={s.sectionTitle}>Holdings</Text>
      {filtered.map((h) => (
        <View key={h.id} style={s.holdingCard}>
          <View style={[s.holdingIcon, { backgroundColor: TYPE_COLORS[h.type] + '22' }]}>
            <Ionicons name={TYPE_ICONS[h.type] as any} size={18} color={TYPE_COLORS[h.type]} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Text style={s.holdingName}>{h.name}</Text>
              <View style={[s.typeBadge, { backgroundColor: TYPE_COLORS[h.type] + '22' }]}>
                <Text style={[s.typeBadgeText, { color: TYPE_COLORS[h.type] }]}>{h.type}</Text>
              </View>
            </View>
            <Text style={s.holdingTicker}>{h.ticker}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.holdingValue}>£{h.value.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
            <Text style={[s.holdingChange, { color: h.change > 0 ? C.income : h.change < 0 ? C.destructive : C.textMuted }]}>
              {h.change > 0 ? '+' : ''}{h.change.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Upload tab ──────────────────────────────────────────────────────────────

type UploadSubTab = 'connected' | 'statements' | 'manual';

function UploadTab() {
  const [subTab, setSubTab] = useState<UploadSubTab>('connected');
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualTicker, setManualTicker] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [manualType, setManualType] = useState('Stocks');

  const types = ['Stocks', 'ETFs', 'Bonds', 'Crypto', 'Cash', 'Real Estate'];

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Sub-tab pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {([
          { key: 'connected', label: 'Connected', icon: 'link-outline' },
          { key: 'statements', label: 'Statements', icon: 'document-attach-outline' },
          { key: 'manual', label: 'Manual entry', icon: 'add-circle-outline' },
        ] as { key: UploadSubTab; label: string; icon: string }[]).map((t) => (
          <Pressable key={t.key} style={[s.tabPill, subTab === t.key && s.tabPillActive]} onPress={() => setSubTab(t.key)}>
            <Ionicons name={t.icon as any} size={16} color={subTab === t.key ? '#fff' : C.textMuted} />
            <Text style={[s.tabPillText, subTab === t.key && s.tabPillTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Connected */}
      {subTab === 'connected' && (
        <>
          <Text style={s.sectionTitle}>Connected accounts</Text>
          {CONNECTED_SOURCES.map((src) => (
            <View key={src.id} style={s.sourceCard}>
              <View style={[s.sourceIcon, { backgroundColor: src.color + '22' }]}>
                <Ionicons name={src.icon as any} size={20} color={src.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sourceName}>{src.name}</Text>
                <Text style={s.sourceSub}>{src.type} · {src.accounts} account{src.accounts > 1 ? 's' : ''}</Text>
              </View>
              <View style={s.connectedBadge}>
                <Text style={s.connectedBadgeText}>Connected</Text>
              </View>
            </View>
          ))}
          <Pressable style={s.outlineBtn}>
            <Ionicons name="link-outline" size={18} color={C.brandLight} />
            <Text style={s.outlineBtnText}>Connect another account</Text>
          </Pressable>
        </>
      )}

      {/* Statements */}
      {subTab === 'statements' && (
        <>
          <Text style={s.sectionTitle}>Upload statements</Text>
          <Pressable style={s.uploadCard}>
            <View style={s.uploadIconWrap}>
              <Ionicons name="document-attach-outline" size={28} color={C.brandLight} />
            </View>
            <Text style={s.uploadTitle}>Upload a PDF statement</Text>
            <Text style={s.uploadSub}>We'll extract your holdings automatically from broker or pension statements</Text>
            <View style={s.uploadBtn}>
              <Text style={s.uploadBtnText}>Choose file</Text>
            </View>
          </Pressable>
        </>
      )}

      {/* Manual */}
      {subTab === 'manual' && (
        <>
          <Text style={s.sectionTitle}>Manual entry</Text>
          <Pressable style={s.outlineBtn} onPress={() => setShowManual(true)}>
            <Ionicons name="add-circle-outline" size={18} color={C.brandLight} />
            <Text style={s.outlineBtnText}>Add holding manually</Text>
          </Pressable>
        </>
      )}

      {/* Manual entry modal */}
      <Modal visible={showManual} animationType="slide" transparent onRequestClose={() => setShowManual(false)}>
        <Pressable style={s.overlay} onPress={() => setShowManual(false)}>
          <Pressable style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Add Holding</Text>

            <Text style={s.fieldLabel}>Name</Text>
            <TextInput style={s.input} placeholder="e.g. Apple Inc." placeholderTextColor={C.textMuted} value={manualName} onChangeText={setManualName} />

            <Text style={s.fieldLabel}>Ticker / reference</Text>
            <TextInput style={s.input} placeholder="e.g. AAPL" placeholderTextColor={C.textMuted} value={manualTicker} onChangeText={setManualTicker} autoCapitalize="characters" />

            <Text style={s.fieldLabel}>Current value (£)</Text>
            <TextInput style={s.input} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="numeric" value={manualValue} onChangeText={setManualValue} />

            <Text style={s.fieldLabel}>Asset type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {types.map((t) => (
                <Pressable key={t} style={[s.filterPill, manualType === t && s.filterPillActive]} onPress={() => setManualType(t)}>
                  <Text style={[s.filterPillText, manualType === t && s.filterPillTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[s.saveBtn, (!manualName.trim() || !manualValue.trim()) && { opacity: 0.4 }]}
              onPress={() => setShowManual(false)}
              disabled={!manualName.trim() || !manualValue.trim()}
            >
              <Text style={s.saveBtnText}>Add Holding</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── Goals tab ───────────────────────────────────────────────────────────────

function GoalsTab() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pickedColor, setPickedColor] = useState('#22C55E');

  const COLOR_OPTIONS = ['#22C55E', '#00b4d8', '#F59E0B', '#EF4444', '#AB47BC', '#42A5F5', '#FF7043', '#EC407A'];

  const totalTargets = GOALS.reduce((s, g) => s + g.target, 0);
  const totalProgress = GOALS.reduce((s, g) => s + g.current, 0);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Summary */}
      <View style={[s.heroCard, { backgroundColor: '#0A1A2F' }]}>
        <Text style={s.heroLabel}>Total progress across goals</Text>
        <Text style={s.heroAmount}>£{totalProgress.toLocaleString('en-GB')}</Text>
        <View style={s.heroBadge}>
          <Ionicons name="flag" size={12} color={C.income} />
          <Text style={s.heroBadgeText}> {((totalProgress / totalTargets) * 100).toFixed(0)}% of £{totalTargets.toLocaleString('en-GB')} target</Text>
        </View>
        <MiniLineChart />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 16, marginBottom: 12 }}>
        <Text style={[s.sectionTitle, { marginTop: 0, marginHorizontal: 0, marginBottom: 0 }]}>Financial goals</Text>
        <Pressable style={s.smallAddBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={16} color="#fff" />
        </Pressable>
      </View>

      {GOALS.map((g) => {
        const pct = Math.min((g.current / g.target) * 100, 100);
        const yearly = g.current / Math.max(1, 2025 - 2022);
        const yearsLeft = Math.max(0, parseInt(g.deadline) - 2025);
        const projected = g.current + yearly * yearsLeft;
        const onTrack = projected >= g.target;
        return (
          <View key={g.id} style={s.goalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <View style={[s.goalIcon, { backgroundColor: g.color + '22' }]}>
                <Ionicons name={g.icon as any} size={20} color={g.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.goalName}>{g.name}</Text>
                <Text style={s.goalDeadline}>Target: {g.deadline}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.goalSaved, { color: g.color }]}>£{g.current.toLocaleString('en-GB')}</Text>
                <Text style={s.goalTarget}>of £{g.target.toLocaleString('en-GB')}</Text>
              </View>
            </View>
            <View style={s.barWrap}>
              <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: g.color }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={s.pctLabel}>{pct.toFixed(0)}% complete</Text>
              <View style={[s.trackBadge, { backgroundColor: onTrack ? C.incomeBg : C.warningBg }]}>
                <Text style={[s.trackBadgeText, { color: onTrack ? C.income : C.warning }]}>
                  {onTrack ? 'On track' : 'Behind'}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Add goal modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowModal(false)}>
          <Pressable style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>New Financial Goal</Text>

            <Text style={s.fieldLabel}>Goal name</Text>
            <TextInput style={s.input} placeholder="e.g. Retire at 60" placeholderTextColor={C.textMuted} value={name} onChangeText={setName} />

            <Text style={s.fieldLabel}>Target (£)</Text>
            <TextInput style={s.input} placeholder="500000" placeholderTextColor={C.textMuted} keyboardType="numeric" value={target} onChangeText={setTarget} />

            <Text style={s.fieldLabel}>Target year</Text>
            <TextInput style={s.input} placeholder="2044" placeholderTextColor={C.textMuted} keyboardType="numeric" value={deadline} onChangeText={setDeadline} />

            <Text style={s.fieldLabel}>Colour</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {COLOR_OPTIONS.map((col) => (
                <Pressable key={col} style={[s.colorSwatch, { backgroundColor: col }, pickedColor === col && s.colorSwatchActive]} onPress={() => setPickedColor(col)}>
                  {pickedColor === col && <Ionicons name="checkmark" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <Pressable style={[s.saveBtn, (!name.trim() || !target.trim()) && { opacity: 0.4 }]} onPress={() => setShowModal(false)} disabled={!name.trim() || !target.trim()}>
              <Text style={s.saveBtnText}>Create Goal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { flex: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 80 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  tabBar: { borderBottomWidth: 1, borderBottomColor: C.border },
  tabBarContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  tabPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  tabPillText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  tabPillTextActive: { color: '#fff' },

  heroCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.brand, borderRadius: 20, padding: 22 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4 },
  heroAmount: { fontSize: 34, fontWeight: '700', color: '#fff', marginBottom: 10 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.incomeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { fontSize: 12, fontWeight: '600', color: C.income },
  heroBadgeText2: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6 },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginHorizontal: 20, marginTop: 16, marginBottom: 12 },

  card: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownType: { fontSize: 13, fontWeight: '500', color: C.textSecondary, width: 88 },
  barWrap: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  breakdownPct: { fontSize: 12, color: C.textMuted, width: 38, textAlign: 'right' },
  breakdownVal: { fontSize: 12, fontWeight: '600', color: C.textPrimary, width: 60, textAlign: 'right' },

  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  filterPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  filterPillText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  filterPillTextActive: { color: '#fff', fontWeight: '600' },

  holdingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  holdingIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  holdingName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  holdingTicker: { fontSize: 12, color: C.textMuted },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  holdingValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  holdingChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  sourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 10, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14 },
  sourceIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sourceName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  sourceSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  connectedBadge: { backgroundColor: C.incomeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  connectedBadgeText: { fontSize: 11, fontWeight: '600', color: C.income },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.brandBorder, backgroundColor: C.brandBg },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: C.brandLight },

  uploadCard: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', gap: 8 },
  uploadIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  uploadSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
  uploadBtn: { marginTop: 8, backgroundColor: C.brand, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  goalCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18 },
  goalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  goalDeadline: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  goalSaved: { fontSize: 16, fontWeight: '700' },
  goalTarget: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  pctLabel: { fontSize: 11, color: C.textMuted },
  trackBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  trackBadgeText: { fontSize: 11, fontWeight: '600' },
  smallAddBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 18 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textPrimary, marginBottom: 16 },
  saveBtn: { backgroundColor: C.brand, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },
});
