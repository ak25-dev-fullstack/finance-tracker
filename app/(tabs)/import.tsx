import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system/next';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  appendTransactions,
  loadCategoryMemory,
  updateCategoryMemory,
  loadImportBatches,
  saveImportBatch,
  deleteImportBatch,
  checkForDuplicates,
  ImportBatch,
  DuplicateWarning,
  type Transaction,
} from '@/services/storage';
import { categorize, CATEGORIES, normalizeKey, CategorizationResult } from '@/services/categorizer';
import { C } from '@/constants/theme';

interface ParsedRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
}

type ImportStep = 'idle' | 'parsed' | 'categorizing' | 'review' | 'saving' | 'done';

function normalizeDate(raw: string): string {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return raw;
}

function parseMonzoCSV(csv: string): ParsedRow[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, '').toLowerCase());
  const col = (name: string) => headers.findIndex((h) => h.includes(name));
  const dateIdx = col('date');
  const descIdx = col('description') !== -1 ? col('description') : col('name');
  const amountIdx = col('amount');
  if (dateIdx === -1 || amountIdx === -1) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    values.push(cur.trim());
    const raw = values[amountIdx]?.replace(/[£$,\s]/g, '') ?? '0';
    const amount = parseFloat(raw);
    if (isNaN(amount)) continue;
    rows.push({
      id: `monzo-${Date.now()}-${i}`,
      date: normalizeDate(values[dateIdx] ?? new Date().toISOString().split('T')[0]),
      amount: Math.abs(amount),
      description: values[descIdx] ?? 'Transaction',
      type: amount >= 0 ? 'income' : 'expense',
    });
  }
  return rows;
}

export default function Import() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>('idle');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<CategorizationResult[]>([]);
  const [userChoices, setUserChoices] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [expandAuto, setExpandAuto] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [warning, setWarning] = useState<DuplicateWarning | null>(null);

  useFocusEffect(useCallback(() => { loadImportBatches().then(setBatches); }, []));

  const handlePickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (picked.canceled) return;
      const file = picked.assets[0];
      setFileName(file.name);
      const content = await new File(file.uri).text();
      const rows = parseMonzoCSV(content);
      if (rows.length === 0) {
        Alert.alert('No transactions found', 'Make sure this is a CSV export from your bank.');
        return;
      }
      setParsed(rows);
      setWarning(await checkForDuplicates(rows));
      setStep('parsed');
    } catch (e: any) {
      Alert.alert('Could not read file', e?.message ?? String(e));
    }
  };

  const handleCategorize = async () => {
    setStep('categorizing');
    try {
      const memory = await loadCategoryMemory();
      const cats = await categorize(parsed.map((r) => ({ id: r.id, description: r.description, amount: r.amount, type: r.type })), memory);
      setResults(cats);
      setUserChoices({});
      setCustomInputs({});
      setStep('review');
    } catch {
      Alert.alert('Categorization failed', 'Check your internet connection and try again.');
      setStep('parsed');
    }
  };

  const getCategory = (id: string) => {
    if (customInputs[id]?.trim()) return customInputs[id].trim();
    if (userChoices[id]) return userChoices[id];
    return results.find((r) => r.id === id)?.category ?? 'Other';
  };

  const reviewResults = results.filter((r) => r.confidence === 'low');
  const autoResults = results.filter((r) => r.confidence === 'high' && !customInputs[r.id]?.trim() && !userChoices[r.id]);

  const setGroupChoice = (description: string, category: string) => {
    const ids = reviewResults.filter((r) => parsed.find((p) => p.id === r.id)?.description === description).map((r) => r.id);
    setUserChoices((p) => { const n = { ...p }; ids.forEach((id) => (n[id] = category)); return n; });
    setCustomInputs((p) => { const n = { ...p }; ids.forEach((id) => (n[id] = '')); return n; });
  };

  const setGroupCustom = (description: string, text: string) => {
    const ids = reviewResults.filter((r) => parsed.find((p) => p.id === r.id)?.description === description).map((r) => r.id);
    setCustomInputs((p) => { const n = { ...p }; ids.forEach((id) => (n[id] = text)); return n; });
    if (text.trim()) setUserChoices((p) => { const n = { ...p }; ids.forEach((id) => (n[id] = text.trim())); return n; });
  };

  const getGroupCategory = (description: string) => {
    const first = reviewResults.find((r) => parsed.find((p) => p.id === r.id)?.description === description);
    return first ? getCategory(first.id) : 'Other';
  };

  const isGroupCustomActive = (description: string) => {
    const first = reviewResults.find((r) => parsed.find((p) => p.id === r.id)?.description === description);
    return first ? !!customInputs[first.id]?.trim() : false;
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      const importId = `import-${Date.now()}`;
      const memoryUpdates: Record<string, string> = {};
      const transactions: Transaction[] = parsed.map((row) => {
        const category = getCategory(row.id);
        memoryUpdates[normalizeKey(row.description)] = category;
        return { id: row.id, date: row.date, amount: row.amount, category, description: row.description, type: row.type, source: 'monzo' as const, importId };
      });
      const added = await appendTransactions(transactions);
      await updateCategoryMemory(memoryUpdates);
      await saveImportBatch({ id: importId, fileName, date: new Date().toISOString(), count: added });
      setBatches(await loadImportBatches());
      setSavedCount(added);
      setStep('done');
    } catch {
      Alert.alert('Save failed', 'Could not save transactions.');
      setStep('review');
    }
  };

  const handleDeleteBatch = (batch: ImportBatch) => {
    Alert.alert('Remove import', `Remove all ${batch.count} transactions from "${batch.fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteImportBatch(batch.id); setBatches(await loadImportBatches()); } },
    ]);
  };

  const reset = () => {
    setStep('idle'); setFileName(''); setParsed([]); setResults([]);
    setUserChoices({}); setCustomInputs({}); setExpandAuto(false); setWarning(null);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.title}>Import</Text>

        {step === 'idle' && (
          <>
            <Pressable style={s.uploadZone} onPress={handlePickFile}>
              <View style={s.uploadIconWrap}>
                <Ionicons name="cloud-upload-outline" size={36} color={C.brandLight} />
              </View>
              <Text style={s.uploadTitle}>Upload Bank Statement</Text>
              <Text style={s.uploadSub}>CSV or Excel · Bank app → Account → Statements → Download</Text>
              <View style={s.uploadBadge}>
                <Text style={s.uploadBadgeText}>Browse Files</Text>
              </View>
            </Pressable>

            {batches.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Import History</Text>
                {batches.map((b) => {
                  const removed = !!b.removedAt;
                  return (
                    <View key={b.id} style={[s.batchRow, removed && { opacity: 0.4 }]}>
                      <View style={[s.batchIconWrap, { backgroundColor: removed ? C.border : C.brandBg }]}>
                        <Ionicons name="document-text-outline" size={18} color={removed ? C.textMuted : C.brandLight} />
                      </View>
                      <View style={s.batchLeft}>
                        <Text style={[s.batchName, removed && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{b.fileName}</Text>
                        <Text style={s.batchMeta}>
                          {new Date(b.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {b.count} transactions{removed ? ' · removed' : ''}
                        </Text>
                      </View>
                      {!removed && (
                        <Pressable onPress={() => handleDeleteBatch(b)}>
                          <Ionicons name="trash-outline" size={18} color={C.expense} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={s.hintCard}>
              <Text style={s.hintTitle}>How it works</Text>
              {[
                { icon: 'cloud-upload-outline', text: 'Upload your bank CSV' },
                { icon: 'sparkles-outline', text: 'AI categorizes your transactions' },
                { icon: 'checkmark-circle-outline', text: 'Review anything it\'s unsure about' },
                { icon: 'save-outline', text: 'Save — it learns for next time' },
              ].map((item, i) => (
                <View key={i} style={s.hintRow}>
                  <View style={s.hintNum}>
                    <Text style={s.hintNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.hintLine}>{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 'parsed' && (
          <>
            <View style={s.fileCard}>
              <View style={s.fileIconWrap}>
                <Ionicons name="document-text" size={28} color={C.brandLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fileLabel}>File loaded</Text>
                <Text style={s.fileName} numberOfLines={1}>{fileName}</Text>
                <Text style={s.fileSub}>{parsed.length} transactions found</Text>
              </View>
            </View>

            {warning && (warning.overlappingMonths.length > 0 || warning.duplicateCount > 0) && (
              <View style={s.warningCard}>
                <View style={s.warningHeader}>
                  <Ionicons name="warning" size={16} color={C.warning} />
                  <Text style={s.warningTitle}>Potential duplicates detected</Text>
                </View>
                {warning.overlappingMonths.length > 0 && (
                  <Text style={s.warningLine}>
                    Already imported:{' '}
                    <Text style={{ fontWeight: '700' }}>
                      {warning.overlappingMonths.map((m) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })).join(', ')}
                    </Text>
                  </Text>
                )}
                {warning.duplicateCount > 0 && (
                  <Text style={s.warningLine}>
                    <Text style={{ fontWeight: '700' }}>{warning.duplicateCount} transaction{warning.duplicateCount !== 1 ? 's' : ''}</Text>
                    {' '}already exist and will be skipped.
                  </Text>
                )}
              </View>
            )}

            <Pressable style={s.primaryBtn} onPress={handleCategorize}>
              <Ionicons name="sparkles-outline" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>Categorize with AI</Text>
            </Pressable>
            <Pressable style={s.ghostBtn} onPress={reset}>
              <Text style={s.ghostBtnText}>Choose a different file</Text>
            </Pressable>
          </>
        )}

        {step === 'categorizing' && (
          <View style={s.loadingCard}>
            <ActivityIndicator color={C.brandLight} size="large" />
            <Text style={s.loadingText}>Categorizing transactions…</Text>
            <Text style={s.loadingSub}>Checking saved rules, then asking Claude AI</Text>
          </View>
        )}

        {step === 'review' && (
          <>
            <Pressable style={s.sectionToggle} onPress={() => setExpandAuto((v) => !v)}>
              <View style={s.sectionLeft}>
                <View style={[s.badge, { backgroundColor: C.incomeBg, borderColor: C.incomeBorder }]}>
                  <Text style={[s.badgeText, { color: C.income }]}>{autoResults.length}</Text>
                </View>
                <Text style={s.sectionTitle}>Auto-categorized</Text>
              </View>
              <Ionicons name={expandAuto ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} />
            </Pressable>

            {expandAuto && autoResults.map((r) => {
              const row = parsed.find((p) => p.id === r.id)!;
              return (
                <View key={r.id} style={s.autoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.autoDesc}>{row.description}</Text>
                    <Text style={s.autoDate}>{row.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.autoCat}>{r.fromMemory ? '🧠 ' : ''}{r.category}</Text>
                    <Text style={[s.autoAmt, { color: row.type === 'income' ? C.income : C.expense }]}>
                      {row.type === 'income' ? '+' : '−'}£{row.amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              );
            })}

            {reviewResults.length > 0 && (
              <>
                <View style={[s.sectionToggle, { marginTop: 12 }]}>
                  <View style={s.sectionLeft}>
                    <View style={[s.badge, { backgroundColor: C.warningBg, borderColor: C.warningBorder }]}>
                      <Text style={[s.badgeText, { color: C.warning }]}>{reviewResults.length}</Text>
                    </View>
                    <Text style={s.sectionTitle}>Needs your input</Text>
                  </View>
                </View>
                <Text style={s.reviewHint}>Applies to all transactions from the same recipient</Text>

                {Object.entries(
                  reviewResults.reduce((groups, r) => {
                    const desc = parsed.find((p) => p.id === r.id)?.description ?? '';
                    if (!groups[desc]) groups[desc] = [];
                    groups[desc].push(r);
                    return groups;
                  }, {} as Record<string, CategorizationResult[]>)
                ).map(([description, groupResults]) => {
                  const rows = groupResults.map((r) => parsed.find((p) => p.id === r.id)!);
                  const chosen = getGroupCategory(description);
                  const isCustomActive = isGroupCustomActive(description);
                  const groupTotal = rows.reduce((s, r) => s + r.amount, 0);

                  return (
                    <View key={description} style={s.reviewCard}>
                      <View style={s.reviewTop}>
                        <Text style={s.reviewDesc}>{description}</Text>
                        <View style={s.aiTag}>
                          <Text style={s.aiTagText}>AI: {groupResults[0].category}</Text>
                        </View>
                      </View>
                      <View style={s.txList}>
                        {rows.map((row) => (
                          <View key={row.id} style={s.txListRow}>
                            <Text style={s.txListDate}>{row.date}</Text>
                            <Text style={[s.txListAmt, { color: row.type === 'income' ? C.income : C.expense }]}>
                              {row.type === 'income' ? '+' : '−'}£{row.amount.toFixed(2)}
                            </Text>
                          </View>
                        ))}
                        {rows.length > 1 && (
                          <View style={[s.txListRow, { backgroundColor: C.bg }]}>
                            <Text style={{ fontSize: 12, color: C.textMuted }}>{rows.length} transactions</Text>
                            <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '600' }}>£{groupTotal.toFixed(2)} total</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.reviewPrompt}>What is this?</Text>
                      <View style={s.pills}>
                        {CATEGORIES.filter((c) => c !== 'Other').map((cat) => (
                          <Pressable
                            key={cat}
                            style={[s.pill, !isCustomActive && chosen === cat && s.pillActive]}
                            onPress={() => setGroupChoice(description, cat)}
                          >
                            <Text style={[s.pillText, !isCustomActive && chosen === cat && s.pillTextActive]}>{cat}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        style={[s.customInput, isCustomActive && s.customInputActive]}
                        placeholder="Or type a custom category…"
                        placeholderTextColor={C.textMuted}
                        value={customInputs[groupResults[0].id] ?? ''}
                        onChangeText={(text) => setGroupCustom(description, text)}
                      />
                    </View>
                  );
                })}
              </>
            )}

            <Pressable style={s.saveBtn} onPress={handleSave}>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Save {parsed.length} transactions</Text>
            </Pressable>
            <Pressable style={s.ghostBtn} onPress={reset}>
              <Text style={s.ghostBtnText}>Start over</Text>
            </Pressable>
          </>
        )}

        {step === 'saving' && (
          <View style={s.loadingCard}>
            <ActivityIndicator color={C.brandLight} size="large" />
            <Text style={s.loadingText}>Saving transactions…</Text>
          </View>
        )}

        {step === 'done' && (
          <View style={s.doneCard}>
            <View style={s.doneCheck}>
              <Ionicons name="checkmark" size={32} color={C.income} />
            </View>
            <Text style={s.doneTitle}>{savedCount} transactions saved</Text>
            <Text style={s.doneSub}>Categories learned and stored for next time.</Text>
            <Pressable style={s.primaryBtn} onPress={() => { reset(); router.push('/(tabs)'); }}>
              <Ionicons name="wallet-outline" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>View in Home</Text>
            </Pressable>
            <Pressable style={[s.ghostBtn, { marginTop: 4 }]} onPress={reset}>
              <Text style={s.ghostBtnText}>Import another file</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', color: C.textPrimary, marginTop: 20, marginBottom: 20 },

  uploadZone: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.brandBorder, borderStyle: 'dashed', padding: 32, alignItems: 'center', marginBottom: 16 },
  uploadIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  uploadSub: { fontSize: 12, color: C.textMuted, textAlign: 'center', marginBottom: 20 },
  uploadBadge: { backgroundColor: C.brand, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  uploadBadgeText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary, padding: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  batchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 12 },
  batchIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  batchLeft: { flex: 1 },
  batchName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  batchMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  hintCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20 },
  hintTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  hintNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  hintNumText: { fontSize: 12, fontWeight: '700', color: C.brandLight },
  hintLine: { fontSize: 14, color: C.textSecondary, flex: 1 },

  fileCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  fileIconWrap: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.brandBg, alignItems: 'center', justifyContent: 'center' },
  fileLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  fileName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  fileSub: { fontSize: 13, color: C.textSecondary, marginTop: 2 },

  warningCard: { backgroundColor: C.warningBg, borderRadius: 12, borderWidth: 1, borderColor: C.warningBorder, padding: 14, marginBottom: 14 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  warningTitle: { fontSize: 13, fontWeight: '700', color: C.warning },
  warningLine: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 4 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brand, padding: 16, borderRadius: 14, marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ghostBtn: { alignItems: 'center', paddingVertical: 12 },
  ghostBtnText: { color: C.textMuted, fontSize: 14, fontWeight: '500' },

  loadingCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 48, alignItems: 'center', marginTop: 20 },
  loadingText: { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginTop: 20 },
  loadingSub: { fontSize: 13, color: C.textMuted, marginTop: 8, textAlign: 'center' },

  sectionToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 2 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: C.textPrimary },

  autoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  autoDesc: { fontSize: 13, fontWeight: '500', color: C.textPrimary },
  autoDate: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  autoCat: { fontSize: 11, color: C.textSecondary, marginBottom: 2 },
  autoAmt: { fontSize: 13, fontWeight: '700' },

  reviewHint: { fontSize: 12, color: C.textMuted, marginBottom: 10, marginTop: 6 },
  reviewCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reviewDesc: { fontSize: 16, fontWeight: '700', color: C.textPrimary, flex: 1 },
  aiTag: { backgroundColor: C.warningBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8, borderWidth: 1, borderColor: C.warningBorder },
  aiTagText: { fontSize: 11, color: C.warning, fontWeight: '600' },

  txList: { borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 14 },
  txListRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  txListDate: { fontSize: 13, color: C.textSecondary },
  txListAmt: { fontSize: 13, fontWeight: '600' },

  reviewPrompt: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  pillActive: { backgroundColor: C.brand, borderColor: C.brand },
  pillText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  customInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.textPrimary, backgroundColor: C.bg },
  customInputActive: { borderColor: C.brand },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.income, padding: 16, borderRadius: 14, marginTop: 16, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  doneCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 40, alignItems: 'center', marginTop: 20 },
  doneCheck: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.incomeBg, borderWidth: 1.5, borderColor: C.incomeBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  doneSub: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 28 },
});
