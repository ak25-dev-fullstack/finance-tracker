import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { C } from '@/constants/theme';

type Section = 'overview' | 'loans' | 'pension' | 'mortgage';

const CREDIT_SCORE = 742;
const SCORE_MAX = 999;

const LOANS = [
  { id: '1', name: 'Personal Loan', lender: 'Barclays', balance: 4200, monthly: 180, rate: 6.9, due: 'Jan 2027' },
  { id: '2', name: 'Car Finance', lender: 'Black Horse', balance: 8750, monthly: 245, rate: 5.4, due: 'Mar 2028' },
];

const DEBTS = [
  { id: '1', name: 'Visa Credit Card', issuer: 'HSBC', balance: 1340, limit: 5000, rate: 22.9 },
  { id: '2', name: 'Mastercard', issuer: 'Lloyds', balance: 680, limit: 3000, rate: 19.9 },
];

const MORTGAGE = {
  property: '14 Maple Street, London',
  lender: 'Nationwide',
  original: 280000,
  remaining: 214500,
  monthly: 1240,
  rate: 4.35,
  type: 'Fixed 5yr',
  due: 'Apr 2027',
  term: 'Jun 2049',
};

const PENSIONS = [
  { id: '1', name: 'Workplace Pension', provider: 'NEST', value: 32400, monthly: 320, employer: 160 },
  { id: '2', name: 'Private SIPP', provider: 'Vanguard', value: 8200, monthly: 200, employer: 0 },
];

function scoreColor(score: number) {
  if (score >= 720) return C.income;
  if (score >= 580) return C.warning;
  return C.destructive;
}

function scoreLabel(score: number) {
  if (score >= 800) return 'Excellent';
  if (score >= 720) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

export default function CreditScreen() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');

  const totalDebt = LOANS.reduce((s, l) => s + l.balance, 0) + DEBTS.reduce((s, d) => s + d.balance, 0) + MORTGAGE.remaining;
  const totalPension = PENSIONS.reduce((s, p) => s + p.value, 0);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Credit</Text>
            <Text style={s.sub}>Loans, debts & pensions</Text>
          </View>
        </View>

        {/* Credit Score */}
        <View style={s.scoreCard}>
          <View style={s.scoreLeft}>
            <Text style={s.scoreLabel}>Credit Score</Text>
            <Text style={[s.scoreNumber, { color: scoreColor(CREDIT_SCORE) }]}>{CREDIT_SCORE}</Text>
            <View style={[s.scoreBadge, { backgroundColor: scoreColor(CREDIT_SCORE) + '22' }]}>
              <Text style={[s.scoreBadgeText, { color: scoreColor(CREDIT_SCORE) }]}>{scoreLabel(CREDIT_SCORE)}</Text>
            </View>
            <Text style={s.scoreProvider}>Equifax · Updated today</Text>
          </View>
          <View style={s.scoreGauge}>
            <View style={s.gaugeTrack}>
              <View style={[s.gaugeFill, { height: `${(CREDIT_SCORE / SCORE_MAX) * 100}%` as any, backgroundColor: scoreColor(CREDIT_SCORE) }]} />
            </View>
            <Text style={s.gaugeMax}>{SCORE_MAX}</Text>
            <Text style={s.gaugeMin}>0</Text>
          </View>
        </View>

        {/* Overview tiles */}
        <View style={s.tilesRow}>
          <View style={s.tile}>
            <Ionicons name="alert-circle-outline" size={18} color={C.destructive} />
            <Text style={s.tileVal}>£{totalDebt.toLocaleString('en-GB')}</Text>
            <Text style={s.tileLabel}>Total Debt</Text>
          </View>
          <View style={s.tile}>
            <Ionicons name="leaf-outline" size={18} color={C.income} />
            <Text style={s.tileVal}>£{totalPension.toLocaleString('en-GB')}</Text>
            <Text style={s.tileLabel}>Pension Pot</Text>
          </View>
          <View style={s.tile}>
            <Ionicons name="home-outline" size={18} color={C.brandLight} />
            <Text style={s.tileVal}>£{MORTGAGE.remaining.toLocaleString('en-GB')}</Text>
            <Text style={s.tileLabel}>Mortgage</Text>
          </View>
        </View>

        {/* Section Tabs */}
        <View style={s.tabRow}>
          {(['overview', 'loans', 'mortgage', 'pension'] as Section[]).map((sec) => (
            <Pressable key={sec} style={[s.tabBtn, section === sec && s.tabBtnActive]} onPress={() => setSection(sec)}>
              <Text style={[s.tabBtnText, section === sec && s.tabBtnTextActive]}>
                {sec.charAt(0).toUpperCase() + sec.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Overview */}
        {section === 'overview' && (
          <>
            <Text style={s.sectionTitle}>Credit Cards</Text>
            {DEBTS.map((d) => {
              const util = (d.balance / d.limit) * 100;
              return (
                <View key={d.id} style={s.itemCard}>
                  <View style={s.itemTop}>
                    <View style={[s.itemIcon, { backgroundColor: C.destructiveLight }]}>
                      <Ionicons name="card-outline" size={18} color={C.destructive} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{d.name}</Text>
                      <Text style={s.itemSub}>{d.issuer} · {d.rate}% APR</Text>
                    </View>
                    <View style={s.itemRight}>
                      <Text style={s.itemBal}>£{d.balance.toLocaleString('en-GB')}</Text>
                      <Text style={s.itemBalSub}>of £{d.limit.toLocaleString('en-GB')}</Text>
                    </View>
                  </View>
                  <View style={s.utilRow}>
                    <View style={s.utilBar}>
                      <View style={[s.utilFill, { width: `${util}%` as any, backgroundColor: util > 50 ? C.warning : C.income }]} />
                    </View>
                    <Text style={s.utilPct}>{util.toFixed(0)}% used</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Loans */}
        {section === 'loans' && (
          <>
            <Text style={s.sectionTitle}>Active Loans</Text>
            {LOANS.map((l) => (
              <View key={l.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={[s.itemIcon, { backgroundColor: C.warningBg }]}>
                    <Ionicons name="cash-outline" size={18} color={C.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{l.name}</Text>
                    <Text style={s.itemSub}>{l.lender} · {l.rate}% APR · ends {l.due}</Text>
                  </View>
                  <View style={s.itemRight}>
                    <Text style={s.itemBal}>£{l.balance.toLocaleString('en-GB')}</Text>
                    <Text style={s.itemBalSub}>remaining</Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <View style={s.metaChip}>
                    <Text style={s.metaChipText}>£{l.monthly}/mo</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Mortgage */}
        {section === 'mortgage' && (
          <>
            <Text style={s.sectionTitle}>Mortgage</Text>
            <View style={s.mortgageCard}>
              <View style={s.mortgageTop}>
                <View style={[s.itemIcon, { backgroundColor: C.brandBg }]}>
                  <Ionicons name="home-outline" size={20} color={C.brandLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{MORTGAGE.property}</Text>
                  <Text style={s.itemSub}>{MORTGAGE.lender} · {MORTGAGE.type} · {MORTGAGE.rate}%</Text>
                </View>
              </View>
              <View style={s.mortgageGrid}>
                {[
                  { label: 'Remaining', val: `£${MORTGAGE.remaining.toLocaleString('en-GB')}` },
                  { label: 'Monthly', val: `£${MORTGAGE.monthly}` },
                  { label: 'Fix ends', val: MORTGAGE.due },
                  { label: 'Term end', val: MORTGAGE.term },
                ].map((item) => (
                  <View key={item.label} style={s.mortgageStat}>
                    <Text style={s.mortgageStatLabel}>{item.label}</Text>
                    <Text style={s.mortgageStatVal}>{item.val}</Text>
                  </View>
                ))}
              </View>
              <View style={s.equityRow}>
                <Text style={s.equityLabel}>Equity</Text>
                <Text style={s.equityVal}>£{(MORTGAGE.original - MORTGAGE.remaining).toLocaleString('en-GB')}</Text>
                <Text style={s.equityPct}>({(((MORTGAGE.original - MORTGAGE.remaining) / MORTGAGE.original) * 100).toFixed(1)}%)</Text>
              </View>
              <View style={[s.utilBar, { height: 8, marginTop: 10 }]}>
                <View style={[s.utilFill, { width: `${((MORTGAGE.original - MORTGAGE.remaining) / MORTGAGE.original) * 100}%` as any, backgroundColor: C.brandLight }]} />
              </View>
            </View>
          </>
        )}

        {/* Pension */}
        {section === 'pension' && (
          <>
            <Text style={s.sectionTitle}>Pension Plans</Text>
            {PENSIONS.map((p) => (
              <View key={p.id} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={[s.itemIcon, { backgroundColor: C.incomeBg }]}>
                    <Ionicons name="leaf-outline" size={18} color={C.income} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{p.name}</Text>
                    <Text style={s.itemSub}>{p.provider}</Text>
                  </View>
                  <View style={s.itemRight}>
                    <Text style={[s.itemBal, { color: C.income }]}>£{p.value.toLocaleString('en-GB')}</Text>
                    <Text style={s.itemBalSub}>pot value</Text>
                  </View>
                </View>
                <View style={s.metaRow}>
                  <View style={[s.metaChip, { backgroundColor: C.incomeBg }]}>
                    <Text style={[s.metaChipText, { color: C.income }]}>You £{p.monthly}/mo</Text>
                  </View>
                  {p.employer > 0 && (
                    <View style={[s.metaChip, { backgroundColor: C.brandBg }]}>
                      <Text style={[s.metaChipText, { color: C.brandLight }]}>Employer £{p.employer}/mo</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            <View style={s.pensionTip}>
              <Ionicons name="information-circle-outline" size={16} color={C.brandLight} />
              <Text style={s.pensionTipText}>Increasing your contributions by 1% now could add £40k+ to your pot by retirement.</Text>
            </View>
          </>
        )}

        {/* Consult Adviser */}
        <View style={s.adviserCard}>
          <View style={s.adviserCardHeader}>
            <View style={s.adviserIconWrap}>
              <Ionicons name="people-outline" size={22} color={C.brandLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adviserCardTitle}>Speak to an Adviser</Text>
              <Text style={s.adviserCardSub}>Get expert advice on your debts, mortgage, and pension</Text>
            </View>
          </View>
          <Pressable style={s.adviserBtn} onPress={() => router.push('/(tabs)/adviser')}>
            <Text style={s.adviserBtnText}>Consult Adviser</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: C.textPrimary },
  sub: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  scoreCard: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, gap: 16 },
  scoreLeft: { flex: 1 },
  scoreLabel: { fontSize: 12, color: C.textMuted, fontWeight: '500', marginBottom: 4 },
  scoreNumber: { fontSize: 44, fontWeight: '800', marginBottom: 8 },
  scoreBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 8 },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },
  scoreProvider: { fontSize: 11, color: C.textMuted },
  scoreGauge: { width: 24, alignItems: 'center', position: 'relative', justifyContent: 'space-between', paddingVertical: 4 },
  gaugeTrack: { flex: 1, width: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  gaugeFill: { width: '100%', borderRadius: 5 },
  gaugeMax: { fontSize: 9, color: C.textMuted, position: 'absolute', top: 0, right: 0 },
  gaugeMin: { fontSize: 9, color: C.textMuted, position: 'absolute', bottom: 0, right: 0 },

  tilesRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 16 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center', gap: 6 },
  tileVal: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  tileLabel: { fontSize: 10, color: C.textMuted, fontWeight: '500', textAlign: 'center' },

  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: C.card },
  tabBtnActive: { backgroundColor: C.brand, borderColor: C.brand },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: C.textMuted },
  tabBtnTextActive: { color: '#fff' },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginHorizontal: 20, marginTop: 16, marginBottom: 12 },

  itemCard: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  itemIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  itemSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemBal: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  itemBalSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },

  utilRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  utilBar: { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  utilFill: { height: '100%', borderRadius: 3 },
  utilPct: { fontSize: 11, color: C.textMuted, width: 52, textAlign: 'right' },

  metaRow: { flexDirection: 'row', gap: 8 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: C.bg },
  metaChipText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },

  mortgageCard: { marginHorizontal: 20, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.brandBorder, padding: 18 },
  mortgageTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  mortgageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  mortgageStat: { width: '46%', backgroundColor: C.bg, borderRadius: 12, padding: 12 },
  mortgageStatLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4 },
  mortgageStatVal: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  equityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  equityLabel: { fontSize: 13, color: C.textMuted },
  equityVal: { fontSize: 15, fontWeight: '700', color: C.brandLight },
  equityPct: { fontSize: 12, color: C.textMuted },

  pensionTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 16, backgroundColor: C.brandBg, borderRadius: 14, borderWidth: 1, borderColor: C.brandBorder, padding: 14 },
  pensionTipText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  adviserCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.brandBorder, padding: 18 },
  adviserCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  adviserIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  adviserCardTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  adviserCardSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  adviserBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 12 },
  adviserBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
