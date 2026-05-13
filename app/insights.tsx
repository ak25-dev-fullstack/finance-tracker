import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { loadTransactions, renameCategory, loadCustomCategoryColors, Transaction } from '@/services/storage';
import { generateInsights } from '@/services/categorizer';
import { C, getCategoryColor } from '@/constants/theme';
import { exportInsightsCsv, exportInsightsPdf } from '@/services/export';

const SCREEN_WIDTH = Dimensions.get('window').width;

function fmtMonth(key: string) {
  return new Date(key + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function isValidMonth(v: string) {
  return /^\d{4}-\d{2}$/.test(v);
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function fmtWeek(monday: string) {
  return 'w/c ' + new Date(monday + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function fmtDay(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const SIZE = Math.min(SCREEN_WIDTH - 80, 200);
  const cx = SIZE / 2, cy = SIZE / 2;
  const r = SIZE / 2 - 6;
  const innerR = r * 0.58;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted, fontSize: 13 }}>No data</Text>
      </View>
    );
  }
  if (data.length === 1) {
    return (
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={cx} cy={cy} r={r} fill={data[0].color} />
        <Circle cx={cx} cy={cy} r={innerR} fill={C.card} />
      </Svg>
    );
  }
  let angle = 0;
  return (
    <Svg width={SIZE} height={SIZE}>
      {data.map((d, i) => {
        const sweep = (d.value / total) * 360;
        if (sweep < 0.5) { angle += sweep; return null; }
        const start = polarToCartesian(cx, cy, r, angle);
        const end = polarToCartesian(cx, cy, r, angle + sweep);
        const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
        angle += sweep;
        return <Path key={i} d={path} fill={d.color} />;
      })}
      <Circle cx={cx} cy={cy} r={innerR} fill={C.card} />
    </Svg>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barH = 110;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: barH + 40, paddingHorizontal: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', width: 52, marginHorizontal: 4 }}>
            <Text style={bs.val}>£{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}</Text>
            <View style={[bs.bar, { height: Math.max(6, (d.value / max) * barH), backgroundColor: C.brand }]} />
            <Text style={bs.label}>{d.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const bs = StyleSheet.create({
  bar: { width: 34, borderRadius: 6, marginBottom: 6 },
  label: { fontSize: 10, color: C.textMuted, textAlign: 'center' },
  val: { fontSize: 9, color: C.textSecondary, marginBottom: 4, fontWeight: '500' },
});

type Mode = 'category' | 'week' | 'day' | 'month';
type FilterMode = 'all' | 'week' | 'day' | 'month' | 'custom';

export default function Insights() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mode, setMode] = useState<Mode>('category');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState('');
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  const catColor = (cat: string) => getCategoryColor(cat, customColors);

  useFocusEffect(useCallback(() => {
    loadTransactions().then(setTransactions);
    loadCustomCategoryColors().then(setCustomColors);
    setExpandedCategory(null);
    setRenamingCategory(null);
  }, []));

  const expenses = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);

  const availableMonths = useMemo(() =>
    [...new Set(expenses.map((t) => t.date.slice(0, 7)))].sort().reverse(),
    [expenses]
  );

  const availableWeeks = useMemo(() =>
    [...new Set(expenses.map((t) => getWeekStart(t.date)))].sort().reverse(),
    [expenses]
  );

  const availableDays = useMemo(() =>
    [...new Set(expenses.map((t) => t.date))].sort().reverse(),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    if (filterMode === 'month' && selectedMonth)
      return expenses.filter((t) => t.date.slice(0, 7) === selectedMonth);
    if (filterMode === 'week' && selectedWeek)
      return expenses.filter((t) => getWeekStart(t.date) === selectedWeek);
    if (filterMode === 'day' && selectedDay)
      return expenses.filter((t) => t.date === selectedDay);
    if (filterMode === 'custom' && isValidMonth(customFrom) && isValidMonth(customTo) && customFrom <= customTo)
      return expenses.filter((t) => { const m = t.date.slice(0, 7); return m >= customFrom && m <= customTo; });
    return expenses;
  }, [expenses, filterMode, selectedMonth, selectedWeek, selectedDay, customFrom, customTo]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredExpenses) map[t.category] = (map[t.category] ?? 0) + t.amount;
    return map;
  }, [filteredExpenses]);

  const categoryData = useMemo(() =>
    Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: catColor(label) })),
    [byCategory]
  );

  const totalFiltered = filteredExpenses.reduce((s, t) => s + t.amount, 0);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of expenses) { const k = t.date.slice(0, 7); map[k] = (map[k] ?? 0) + t.amount; }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([key, value]) => ({ label: fmtMonth(key), value }));
  }, [expenses]);

  const weeklyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of expenses) { const k = getWeekStart(t.date); map[k] = (map[k] ?? 0) + t.amount; }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-10).map(([key, value]) => ({
      label: new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value,
    }));
  }, [expenses]);

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of expenses) { map[t.date] = (map[t.date] ?? 0) + t.amount; }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([key, value]) => ({
      label: new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      value,
    }));
  }, [expenses]);

  const filterLabel = useMemo(() => {
    if (filterMode === 'month' && selectedMonth) return fmtMonth(selectedMonth);
    if (filterMode === 'week' && selectedWeek) return fmtWeek(selectedWeek);
    if (filterMode === 'day' && selectedDay) return fmtDay(selectedDay);
    if (filterMode === 'custom' && isValidMonth(customFrom) && isValidMonth(customTo))
      return `${fmtMonth(customFrom)} – ${fmtMonth(customTo)}`;
    return 'All time';
  }, [filterMode, selectedMonth, selectedWeek, selectedDay, customFrom, customTo]);

  const selectFilter = (f: FilterMode, value = '') => {
    setFilterMode(f);
    if (f === 'month') setSelectedMonth(value);
    else if (f === 'week') setSelectedWeek(value);
    else if (f === 'day') setSelectedDay(value);
  };

  const handleRename = async () => {
    if (!renamingCategory || !renameInput.trim() || renameInput.trim() === renamingCategory) {
      setRenamingCategory(null); return;
    }
    setRenameSaving(true);
    try {
      await renameCategory(renamingCategory, renameInput.trim());
      const updated = await loadTransactions();
      setTransactions(updated);
      if (expandedCategory === renamingCategory) setExpandedCategory(renameInput.trim());
    } finally {
      setRenameSaving(false); setRenamingCategory(null); setRenameInput('');
    }
  };

  const handleGenerateInsights = async () => {
    setLoadingInsights(true); setInsightsError(''); setInsights('');
    try {
      const monthlyTotals: Record<string, number> = {};
      for (const { label, value } of monthlyData) monthlyTotals[label] = value;
      setInsights(await generateInsights(byCategory, monthlyTotals));
    } catch {
      setInsightsError('Could not generate insights. Check your connection.');
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <ScrollView style={[s.container, s.scroll]} contentContainerStyle={{ paddingBottom: 40 }} contentInsetAdjustmentBehavior="automatic">
        <View style={s.toggle}>
          {([
            ['category', 'Category'],
            ['week', 'Week'],
            ['day', 'Day'],
            ['month', 'Month'],
          ] as [Mode, string][]).map(([m, label]) => (
            <Pressable key={m} style={[s.toggleBtn, mode === m && s.toggleActive]} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: mode === m }}>
              <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {expenses.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bar-chart-outline" size={52} color={C.textMuted} />
            <Text style={s.emptyTitle}>No data yet</Text>
            <Text style={s.emptySub}>Import a bank statement to see your spending insights.</Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              {mode === 'category' ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ paddingRight: 8 }}>
                    <Pressable style={[s.chip, filterMode === 'all' && s.chipActive]} onPress={() => selectFilter('all')}>
                      <Text style={[s.chipText, filterMode === 'all' && s.chipTextActive]}>All time</Text>
                    </Pressable>
                    <Pressable
                      style={[s.chip, filterMode === 'week' && s.chipActive]}
                      onPress={() => { setFilterMode('week'); if (!selectedWeek && availableWeeks.length) setSelectedWeek(availableWeeks[0]); }}
                    >
                      <Text style={[s.chipText, filterMode === 'week' && s.chipTextActive]}>Week</Text>
                    </Pressable>
                    <Pressable
                      style={[s.chip, filterMode === 'day' && s.chipActive]}
                      onPress={() => { setFilterMode('day'); if (!selectedDay && availableDays.length) setSelectedDay(availableDays[0]); }}
                    >
                      <Text style={[s.chipText, filterMode === 'day' && s.chipTextActive]}>Day</Text>
                    </Pressable>
                    {availableMonths.map((m) => (
                      <Pressable key={m} style={[s.chip, filterMode === 'month' && selectedMonth === m && s.chipActive]} onPress={() => selectFilter('month', m)}>
                        <Text style={[s.chipText, filterMode === 'month' && selectedMonth === m && s.chipTextActive]}>{fmtMonth(m)}</Text>
                      </Pressable>
                    ))}
                    <Pressable style={[s.chip, filterMode === 'custom' && s.chipActive]} onPress={() => selectFilter('custom')}>
                      <Text style={[s.chipText, filterMode === 'custom' && s.chipTextActive]}>Custom…</Text>
                    </Pressable>
                  </ScrollView>

                  {filterMode === 'week' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subFilterScroll} contentContainerStyle={{ paddingRight: 8 }}>
                      {availableWeeks.map((w) => (
                        <Pressable key={w} style={[s.subChip, selectedWeek === w && s.chipActive]} onPress={() => setSelectedWeek(w)}>
                          <Text style={[s.chipText, selectedWeek === w && s.chipTextActive]}>{fmtWeek(w)}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {filterMode === 'day' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subFilterScroll} contentContainerStyle={{ paddingRight: 8 }}>
                      {availableDays.map((d) => (
                        <Pressable key={d} style={[s.subChip, selectedDay === d && s.chipActive]} onPress={() => setSelectedDay(d)}>
                          <Text style={[s.chipText, selectedDay === d && s.chipTextActive]}>{fmtDay(d)}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {filterMode === 'custom' && (
                    <View style={s.customRow}>
                      <View style={s.customField}>
                        <Text style={s.customLabel}>From</Text>
                        <TextInput style={s.customInput} placeholder="YYYY-MM" placeholderTextColor={C.textMuted} value={customFrom} onChangeText={setCustomFrom} maxLength={7} keyboardType="numbers-and-punctuation" />
                      </View>
                      <Text style={s.customArrow}>→</Text>
                      <View style={s.customField}>
                        <Text style={s.customLabel}>To</Text>
                        <TextInput style={s.customInput} placeholder="YYYY-MM" placeholderTextColor={C.textMuted} value={customTo} onChangeText={setCustomTo} maxLength={7} keyboardType="numbers-and-punctuation" />
                      </View>
                    </View>
                  )}

                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <PieChart data={categoryData} />
                    <Text style={s.chartTotal}>£{totalFiltered.toFixed(2)} · {filterLabel}</Text>
                  </View>

                  {categoryData.map((d) => {
                    const isExpanded = expandedCategory === d.label;
                    const isRenaming = renamingCategory === d.label;
                    const catTxs = filteredExpenses.filter((t) => t.category === d.label).sort((a, b) => b.date.localeCompare(a.date));

                    return (
                      <View key={d.label}>
                        <Pressable style={s.legendRow} onPress={() => { setExpandedCategory(isExpanded ? null : d.label); if (isRenaming) setRenamingCategory(null); }} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${d.label}, £${d.value.toFixed(2)}, ${totalFiltered > 0 ? ((d.value / totalFiltered) * 100).toFixed(0) : 0} percent of total`} accessibilityHint={isExpanded ? 'Collapse transactions' : 'Expand transactions'} accessibilityState={{ expanded: isExpanded }}>
                          <View style={[s.dot, { backgroundColor: d.color }]} accessibilityElementsHidden />
                          <Text style={s.legendLabel} importantForAccessibility="no">{d.label}</Text>
                          <Text style={s.legendAmt} importantForAccessibility="no">£{d.value.toFixed(2)}</Text>
                          <Text style={s.legendPct} importantForAccessibility="no">{totalFiltered > 0 ? ((d.value / totalFiltered) * 100).toFixed(0) : 0}%</Text>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} accessibilityElementsHidden />
                        </Pressable>

                        {isExpanded && (
                          <View style={s.expandedSection}>
                            {isRenaming ? (
                              <View style={s.renameRow}>
                                <TextInput style={s.renameInput} value={renameInput} onChangeText={setRenameInput} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={handleRename} />
                                <Pressable style={[s.renameBtn, s.renameSave]} onPress={handleRename} disabled={renameSaving}>
                                  {renameSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.renameBtnText}>Save</Text>}
                                </Pressable>
                                <Pressable style={[s.renameBtn, s.renameCancel]} onPress={() => setRenamingCategory(null)} disabled={renameSaving}>
                                  <Text style={[s.renameBtnText, { color: C.textSecondary }]}>Cancel</Text>
                                </Pressable>
                              </View>
                            ) : (
                              <Pressable style={s.renameTrigger} onPress={() => { setRenamingCategory(d.label); setRenameInput(d.label); }}>
                                <Ionicons name="pencil-outline" size={13} color={C.brandLight} />
                                <Text style={s.renameTriggerText}> Rename category</Text>
                              </Pressable>
                            )}
                            {catTxs.map((t) => (
                              <View key={t.id} style={s.txRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={s.txDesc} numberOfLines={1}>{t.description}</Text>
                                  <Text style={s.txDate}>{t.date}</Text>
                                </View>
                                <Text style={s.txAmt}>£{t.amount.toFixed(2)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {categoryData.length === 0 && (
                    <Text style={[s.chartTotal, { textAlign: 'center', paddingBottom: 16 }]}>No expenses for this period</Text>
                  )}
                </>
              ) : mode === 'week' ? (
                <>
                  <View style={{ paddingVertical: 16 }}>
                    <BarChart data={weeklyData} />
                  </View>
                  {weeklyData.slice().reverse().map((d) => (
                    <View key={d.label} style={s.legendRow}>
                      <View style={[s.dot, { backgroundColor: C.brand }]} />
                      <Text style={s.legendLabel}>{d.label}</Text>
                      <Text style={s.legendAmt}>£{d.value.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              ) : mode === 'day' ? (
                <>
                  <View style={{ paddingVertical: 16 }}>
                    <BarChart data={dailyData} />
                  </View>
                  {dailyData.slice().reverse().map((d) => (
                    <View key={d.label} style={s.legendRow}>
                      <View style={[s.dot, { backgroundColor: C.brand }]} />
                      <Text style={s.legendLabel}>{d.label}</Text>
                      <Text style={s.legendAmt}>£{d.value.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={{ paddingVertical: 16 }}>
                    <BarChart data={monthlyData} />
                  </View>
                  {monthlyData.slice().reverse().map((d) => (
                    <View key={d.label} style={s.legendRow}>
                      <View style={[s.dot, { backgroundColor: C.brand }]} />
                      <Text style={s.legendLabel}>{d.label}</Text>
                      <Text style={s.legendAmt}>£{d.value.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <View style={s.card}>
              <View style={s.aiHeader}>
                <Ionicons name="sparkles" size={16} color={C.brandLight} />
                <Text style={s.cardTitle}>AI Insights</Text>
              </View>
              {insights ? (
                <Text style={s.insightsText}>{insights}</Text>
              ) : insightsError ? (
                <View style={s.errorBox}>
                  <Ionicons name="warning-outline" size={15} color={C.expense} />
                  <Text style={s.errorText}> {insightsError}</Text>
                </View>
              ) : null}
              <Pressable style={[s.insightsBtn, loadingInsights && { opacity: 0.6 }]} onPress={handleGenerateInsights} disabled={loadingInsights} accessibilityRole="button" accessibilityLabel={loadingInsights ? 'Generating insights, please wait' : insights ? 'Regenerate AI Insights' : 'Generate AI Insights'} accessibilityState={{ busy: loadingInsights }}>
                {loadingInsights
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Ionicons name="sparkles-outline" size={16} color="#fff" accessibilityElementsHidden /><Text style={s.insightsBtnText}> {insights ? 'Regenerate' : 'Generate AI Insights'}</Text></>
                }
              </Pressable>
              <View style={s.exportRow}>
                <Text style={s.exportLabel}>Export report</Text>
                <Pressable style={s.exportBtn} onPress={() => exportInsightsCsv(byCategory, filteredExpenses, filterLabel)} accessibilityRole="button" accessibilityLabel="Export spending report as CSV">
                  <Ionicons name="document-text-outline" size={14} color={C.brandLight} accessibilityElementsHidden />
                  <Text style={s.exportBtnText}>CSV</Text>
                </Pressable>
                <Pressable style={s.exportBtn} onPress={() => exportInsightsPdf(byCategory, monthlyData, filteredExpenses, filterLabel, insights)} accessibilityRole="button" accessibilityLabel="Export spending report as PDF">
                  <Ionicons name="print-outline" size={14} color={C.brandLight} accessibilityElementsHidden />
                  <Text style={s.exportBtnText}>PDF</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  toggle: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  toggleActive: { backgroundColor: C.brand },
  toggleText: { fontSize: 14, color: C.textMuted, fontWeight: '500' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },

  card: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 16 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },

  filterScroll: { marginHorizontal: -4, marginBottom: 4 },
  subFilterScroll: { marginHorizontal: -4, marginTop: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, marginHorizontal: 4 },
  subChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.cardHigh, marginHorizontal: 4 },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 4 },
  customField: { flex: 1 },
  customLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  customInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: C.textPrimary, backgroundColor: C.bg },
  customArrow: { fontSize: 18, color: C.textMuted, marginTop: 16 },

  chartTotal: { fontSize: 13, color: C.textMuted, marginTop: 10, fontWeight: '500' },

  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border, gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { flex: 1, fontSize: 14, color: C.textSecondary, fontWeight: '500' },
  legendAmt: { fontSize: 14, color: C.textPrimary, fontWeight: '600', marginRight: 8 },
  legendPct: { fontSize: 12, color: C.textMuted, width: 32, textAlign: 'right', marginRight: 4 },

  expandedSection: { backgroundColor: C.bg, borderRadius: 12, marginBottom: 6, paddingHorizontal: 12, paddingBottom: 8, borderWidth: 1, borderColor: C.border },
  renameTrigger: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  renameTriggerText: { fontSize: 13, color: C.brandLight, fontWeight: '600' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 4 },
  renameInput: { flex: 1, borderWidth: 1.5, borderColor: C.brand, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: C.textPrimary, backgroundColor: C.card },
  renameBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  renameSave: { backgroundColor: C.brand },
  renameCancel: { backgroundColor: C.border },
  renameBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  txDesc: { fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  txDate: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  txAmt: { fontSize: 13, color: C.expense, fontWeight: '600' },

  insightsText: { fontSize: 14, color: C.textSecondary, lineHeight: 22, marginBottom: 16 },
  errorBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  errorText: { fontSize: 14, color: C.expense },
  insightsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.brand, padding: 14, borderRadius: 12 },
  insightsBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  exportLabel: { flex: 1, fontSize: 12, color: C.textMuted, fontWeight: '500' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.brandBorder, backgroundColor: C.brandBg },
  exportBtnText: { fontSize: 12, fontWeight: '600', color: C.brandLight },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: C.textSecondary },
  emptySub: { fontSize: 14, color: C.textMuted, textAlign: 'center', paddingHorizontal: 30 },
});
