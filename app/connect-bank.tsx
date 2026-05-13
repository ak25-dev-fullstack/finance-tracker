import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appendTransactions,
  loadCategoryMemory,
  updateCategoryMemory,
  saveImportBatch,
  type Transaction,
} from '@/services/storage';
import { categorize, CATEGORIES, normalizeKey, CategorizationResult } from '@/services/categorizer';
import { C } from '@/constants/theme';

export interface ConnectedBank {
  id: string;
  name: string;
  color: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  balance: number;
  connectedAt: string;
}

const BANKS = [
  { id: 'monzo',    name: 'Monzo',    color: '#FF5A00', icon: 'flame-outline',    tagline: 'Digital banking · Instant notifications' },
  { id: 'starling', name: 'Starling', color: '#7048E8', icon: 'star-outline',     tagline: 'Smart current account' },
  { id: 'barclays', name: 'Barclays', color: '#00AEEF', icon: 'shield-outline',   tagline: "UK's largest retail bank" },
  { id: 'hsbc',     name: 'HSBC',     color: '#DB0011', icon: 'globe-outline',    tagline: "World's local bank" },
  { id: 'lloyds',   name: 'Lloyds',   color: '#006A4D', icon: 'business-outline', tagline: 'By your side' },
  { id: 'natwest',  name: 'NatWest',  color: '#42145F', icon: 'card-outline',     tagline: 'Another way forward' },
] as const;

type BankId = (typeof BANKS)[number]['id'];
type Step = 'select' | 'connecting' | 'authorize' | 'success' | 'categorizing' | 'review' | 'done';

const MOCK_ACCOUNT: Record<BankId, { accountName: string; sortCode: string; accountNumber: string; balance: number }> = {
  monzo:    { accountName: 'Personal Account', sortCode: '04-00-04', accountNumber: '12345678', balance: 2_840.55 },
  starling: { accountName: 'Personal Account', sortCode: '60-83-71', accountNumber: '87654321', balance: 1_520.00 },
  barclays: { accountName: 'Current Account',  sortCode: '20-00-00', accountNumber: '23456789', balance: 3_102.90 },
  hsbc:     { accountName: 'Bank Account',     sortCode: '40-00-00', accountNumber: '34567890', balance: 950.25 },
  lloyds:   { accountName: 'Classic Account',  sortCode: '30-98-12', accountNumber: '45678901', balance: 4_200.00 },
  natwest:  { accountName: 'Select Account',   sortCode: '60-00-01', accountNumber: '56789012', balance: 1_875.40 },
};

interface ParsedRow {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: 'income' | 'expense';
}

function buildMockTransactions(bankId: BankId): ParsedRow[] {
  const now = new Date();
  const raw = [
    { desc: 'Tesco Superstore',      amount: 62.45,   type: 'expense' as const, daysAgo: 1  },
    { desc: 'TfL Travel',            amount: 4.80,    type: 'expense' as const, daysAgo: 2  },
    { desc: 'Salary - DWK Ltd',      amount: 3500.00, type: 'income'  as const, daysAgo: 3  },
    { desc: 'Netflix',               amount: 17.99,   type: 'expense' as const, daysAgo: 5  },
    { desc: "Sainsbury's",           amount: 38.20,   type: 'expense' as const, daysAgo: 6  },
    { desc: 'Deliveroo',             amount: 24.50,   type: 'expense' as const, daysAgo: 8  },
    { desc: 'British Gas',           amount: 85.00,   type: 'expense' as const, daysAgo: 10 },
    { desc: 'Amazon Prime',          amount: 8.99,    type: 'expense' as const, daysAgo: 12 },
    { desc: 'Costa Coffee',          amount: 5.20,    type: 'expense' as const, daysAgo: 13 },
    { desc: 'Transfer from savings', amount: 500.00,  type: 'income'  as const, daysAgo: 14 },
    { desc: 'Boots',                 amount: 18.75,   type: 'expense' as const, daysAgo: 16 },
    { desc: 'Uber',                  amount: 12.30,   type: 'expense' as const, daysAgo: 18 },
    { desc: 'Spotify',               amount: 11.99,   type: 'expense' as const, daysAgo: 20 },
    { desc: 'M&S Food',              amount: 44.60,   type: 'expense' as const, daysAgo: 22 },
    { desc: 'EE Mobile',             amount: 35.00,   type: 'expense' as const, daysAgo: 25 },
    { desc: 'HMRC Tax Refund',       amount: 240.00,  type: 'income'  as const, daysAgo: 27 },
    { desc: 'Waterstones',           amount: 22.00,   type: 'expense' as const, daysAgo: 28 },
    { desc: 'Vue Cinema',            amount: 14.00,   type: 'expense' as const, daysAgo: 30 },
    { desc: 'J HENDERSON',           amount: 50.00,   type: 'expense' as const, daysAgo: 4  },
    { desc: 'SUM UP * GRN MRKT',     amount: 9.80,    type: 'expense' as const, daysAgo: 7  },
    { desc: 'FASTER PAYMENT 882931', amount: 120.00,  type: 'expense' as const, daysAgo: 15 },
    { desc: 'PMT REF 00492-B',       amount: 34.99,   type: 'expense' as const, daysAgo: 21 },
  ];
  return raw.map((r, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - r.daysAgo);
    return { id: `${bankId}-${Date.now()}-${i}`, date: d.toISOString().split('T')[0], amount: r.amount, description: r.desc, type: r.type };
  });
}

export const CONNECTED_BANKS_KEY = 'connected_banks';

const HEADER_TITLES: Record<Step, string> = {
  select: 'Connect Bank', connecting: 'Connecting…', authorize: 'Authorise Access',
  success: 'Connected', categorizing: 'Categorising…', review: 'Review Transactions', done: 'Done',
};

export default function ConnectBank() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [selectedBank, setSelectedBank] = useState<(typeof BANKS)[number] | null>(null);
  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);

  // categorization state
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<CategorizationResult[]>([]);
  const [userChoices, setUserChoices] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [expandAuto, setExpandAuto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // per-bank inline sync state
  const [syncState, setSyncState] = useState<Record<string, 'syncing' | 'synced'>>({});

  useEffect(() => {
    AsyncStorage.getItem(CONNECTED_BANKS_KEY).then((d) => {
      if (d) setConnectedBanks(JSON.parse(d));
    });
  }, []);

  // ─── bank connection flow ────────────────────────────────────────────────────

  const handleSelectBank = async (bank: (typeof BANKS)[number]) => {
    setSelectedBank(bank);
    setStep('connecting');
    await new Promise((r) => setTimeout(r, 1800));
    setStep('authorize');
  };

  const handleAuthorize = () => setStep('success');

  // ─── quick sync (auto-categorise + save inline, no review step) ──────────────

  const handleQuickSync = async (bank: (typeof BANKS)[number]) => {
    if (syncState[bank.id]) return;
    setSyncState((p) => ({ ...p, [bank.id]: 'syncing' }));
    try {
      const rows = buildMockTransactions(bank.id as BankId);
      const memory = await loadCategoryMemory();
      let cats: CategorizationResult[];
      try {
        cats = await categorize(rows.map((r) => ({ id: r.id, description: r.description, amount: r.amount, type: r.type })), memory);
      } catch {
        cats = rows.map((r) => ({ id: r.id, category: 'Other', confidence: 'high' as const, fromMemory: false }));
      }
      const importId = `${bank.id}-sync-${Date.now()}`;
      const memoryUpdates: Record<string, string> = {};
      const transactions: Transaction[] = rows.map((row) => {
        const category = cats.find((c) => c.id === row.id)?.category ?? 'Other';
        memoryUpdates[normalizeKey(row.description)] = category;
        return { id: row.id, date: row.date, amount: row.amount, category, description: row.description, type: row.type, source: 'monzo' as const, importId };
      });
      await appendTransactions(transactions);
      await updateCategoryMemory(memoryUpdates);
      await saveImportBatch({ id: importId, fileName: `${bank.name} sync`, date: new Date().toISOString(), count: rows.length });
      const account = MOCK_ACCOUNT[bank.id as BankId];
      const newBank: ConnectedBank = { id: bank.id, name: bank.name, color: bank.color, ...account, connectedAt: new Date().toISOString() };
      const updated = [...connectedBanks.filter((b) => b.id !== bank.id), newBank];
      await AsyncStorage.setItem(CONNECTED_BANKS_KEY, JSON.stringify(updated));
      setConnectedBanks(updated);
      setSyncState((p) => ({ ...p, [bank.id]: 'synced' }));
    } catch {
      Alert.alert('Sync failed', 'Could not sync transactions. Please try again.');
      setSyncState((p) => { const n = { ...p }; delete n[bank.id]; return n; });
    }
  };

  // ─── sync → categorize → review ─────────────────────────────────────────────

  const handleSync = async (bank: (typeof BANKS)[number]) => {
    setSelectedBank(bank);
    setStep('categorizing');
    try {
      const rows = buildMockTransactions(bank.id as BankId);
      const memory = await loadCategoryMemory();
      const cats = await categorize(rows.map((r) => ({ id: r.id, description: r.description, amount: r.amount, type: r.type })), memory);
      setParsed(rows);
      setResults(cats);
      setUserChoices({});
      setCustomInputs({});
      setStep('review');
    } catch {
      Alert.alert('Categorisation failed', 'Check your connection and try again.');
      setStep(selectedBank ? 'success' : 'select');
    }
  };

  // ─── review helpers (same logic as import.tsx) ───────────────────────────────

  const getCategory = (id: string) => {
    if (customInputs[id]?.trim()) return customInputs[id].trim();
    if (userChoices[id]) return userChoices[id];
    return results.find((r) => r.id === id)?.category ?? 'Other';
  };

  const reviewResults = results.filter((r) => r.confidence === 'low');
  const autoResults   = results.filter((r) => r.confidence === 'high' && !customInputs[r.id]?.trim() && !userChoices[r.id]);

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

  // ─── save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedBank) return;
    setSaving(true);
    try {
      const importId = `${selectedBank.id}-connect-${Date.now()}`;
      const memoryUpdates: Record<string, string> = {};
      const transactions: Transaction[] = parsed.map((row) => {
        const category = getCategory(row.id);
        memoryUpdates[normalizeKey(row.description)] = category;
        return { id: row.id, date: row.date, amount: row.amount, category, description: row.description, type: row.type, source: 'monzo' as const, importId };
      });
      const added = await appendTransactions(transactions);
      await updateCategoryMemory(memoryUpdates);
      await saveImportBatch({ id: importId, fileName: `${selectedBank.name} sync`, date: new Date().toISOString(), count: added });

      const account = MOCK_ACCOUNT[selectedBank.id as BankId];
      const newBank: ConnectedBank = { id: selectedBank.id, name: selectedBank.name, color: selectedBank.color, ...account, connectedAt: new Date().toISOString() };
      const updated = [...connectedBanks.filter((b) => b.id !== selectedBank.id), newBank];
      await AsyncStorage.setItem(CONNECTED_BANKS_KEY, JSON.stringify(updated));
      setConnectedBanks(updated);
      setSavedCount(added);
      setStep('done');
    } catch {
      Alert.alert('Save failed', 'Could not save transactions.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = (bankId: string) => {
    const doDisconnect = async () => {
      const updated = connectedBanks.filter((b) => b.id !== bankId);
      await AsyncStorage.setItem(CONNECTED_BANKS_KEY, JSON.stringify(updated));
      setConnectedBanks(updated);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this bank connection? Your transactions will remain.')) doDisconnect();
    } else {
      Alert.alert('Disconnect bank', 'Remove this bank connection? Your transactions will remain.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: doDisconnect },
      ]);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => (step === 'review' ? setStep('success') : router.back())}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>{HEADER_TITLES[step]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SELECT */}
      {step === 'select' && (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={s.sectionLabel}>Connected accounts</Text>
          {connectedBanks.length === 0 ? (
            <View style={s.emptyConnected}>
              <Ionicons name="link-outline" size={28} color={C.textMuted} />
              <Text style={s.emptyConnectedText}>No accounts connected yet</Text>
            </View>
          ) : (
            connectedBanks.map((b) => {
              const bankDef = BANKS.find((bk) => bk.id === b.id);
              return (
                <View key={b.id} style={[s.connectedCard, { borderLeftColor: b.color }]}>
                  <View style={[s.connectedDot, { backgroundColor: b.color + '20' }]}>
                    <View style={[s.connectedDotInner, { backgroundColor: b.color }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.connectedName}>{b.name} · {b.accountName}</Text>
                    <Text style={s.connectedMeta}>{b.sortCode} · ••••{b.accountNumber.slice(-4)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[s.connectedBalance, { color: C.income }]}>£{b.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      {bankDef && (() => {
                        const ss = syncState[b.id];
                        return (
                          <Pressable onPress={() => handleQuickSync(bankDef)} disabled={!!ss}>
                            {ss === 'syncing'
                              ? <ActivityIndicator size="small" color={b.color} />
                              : <Text style={[s.disconnectText, { color: ss === 'synced' ? C.income : b.color }]}>
                                  {ss === 'synced' ? 'Synced ✓' : 'Sync'}
                                </Text>
                            }
                          </Pressable>
                        );
                      })()}
                      <Pressable onPress={() => handleDisconnect(b.id)}>
                        <Text style={s.disconnectText}>Disconnect</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <Text style={[s.sectionLabel, { marginTop: 28 }]}>Add a bank</Text>
          <Text style={s.sectionSub}>Powered by Open Banking · 256-bit encryption · FCA regulated</Text>
          <View style={s.bankGrid}>
            {BANKS.map((bank) => {
              const isConnected = connectedBanks.some((b) => b.id === bank.id);
              return (
                <Pressable key={bank.id} style={[s.bankCard, isConnected && s.bankCardConnected]} onPress={() => !isConnected && handleSelectBank(bank)} disabled={isConnected}>
                  <View style={[s.bankIcon, { backgroundColor: bank.color + '20' }]}>
                    <Ionicons name={bank.icon as any} size={26} color={bank.color} />
                  </View>
                  <Text style={s.bankName}>{bank.name}</Text>
                  <Text style={s.bankTagline} numberOfLines={1}>{isConnected ? '✓ Connected' : bank.tagline}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.securityRow}>
            <Ionicons name="lock-closed" size={13} color={C.textMuted} />
            <Text style={s.securityText}>Read-only access · No payment permissions · Disconnect anytime</Text>
          </View>
        </ScrollView>
      )}

      {/* CONNECTING */}
      {step === 'connecting' && selectedBank && (
        <View style={s.centred}>
          <View style={[s.bigIcon, { backgroundColor: selectedBank.color + '20' }]}>
            <Ionicons name={selectedBank.icon as any} size={48} color={selectedBank.color} />
          </View>
          <ActivityIndicator color={selectedBank.color} size="large" style={{ marginTop: 28 }} />
          <Text style={s.connectingTitle}>Connecting to {selectedBank.name}</Text>
          <Text style={s.connectingSub}>Establishing a secure Open Banking session…</Text>
          <View style={s.stepRow}>
            {['Verify identity', 'Open Banking handshake', 'Prepare authorisation'].map((label, i) => (
              <View key={i} style={s.stepItem}>
                <View style={[s.stepDot, { backgroundColor: selectedBank.color }]} />
                <Text style={s.stepText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AUTHORIZE */}
      {step === 'authorize' && selectedBank && (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[s.authHeader, { backgroundColor: selectedBank.color + '15', borderColor: selectedBank.color + '30' }]}>
            <View style={[s.authIcon, { backgroundColor: selectedBank.color + '20' }]}>
              <Ionicons name={selectedBank.icon as any} size={28} color={selectedBank.color} />
            </View>
            <Text style={s.authBankName}>{selectedBank.name}</Text>
            <Text style={s.authTagline}>{selectedBank.tagline}</Text>
          </View>
          <View style={s.authCard}>
            <Text style={s.authTitle}>Authorise DWK Finance</Text>
            <Text style={s.authSub}>DWK Finance is requesting read-only access to your {selectedBank.name} account.</Text>
            <View style={s.accountPreview}>
              <View style={[s.accountIcon, { backgroundColor: selectedBank.color + '20' }]}>
                <Ionicons name="card-outline" size={18} color={selectedBank.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.accountName}>{MOCK_ACCOUNT[selectedBank.id as BankId].accountName}</Text>
                <Text style={s.accountDetail}>{MOCK_ACCOUNT[selectedBank.id as BankId].sortCode} · ••••{MOCK_ACCOUNT[selectedBank.id as BankId].accountNumber.slice(-4)}</Text>
              </View>
            </View>
            <Text style={s.permTitle}>DWK Finance will be able to:</Text>
            {[
              { icon: 'eye-outline', text: 'View your account balance' },
              { icon: 'list-outline', text: 'Read your transaction history' },
              { icon: 'analytics-outline', text: 'Analyse spending patterns' },
            ].map((p, i) => (
              <View key={i} style={s.permRow}>
                <View style={s.permCheck}><Ionicons name="checkmark" size={13} color={C.income} /></View>
                <Ionicons name={p.icon as any} size={15} color={C.textSecondary} />
                <Text style={s.permText}>{p.text}</Text>
              </View>
            ))}
            <View style={s.cannotRow}>
              <Ionicons name="close-circle" size={15} color={C.expense} />
              <Text style={s.cannotText}>Cannot make payments or move money</Text>
            </View>
          </View>
          <Pressable style={[s.primaryBtn, { backgroundColor: selectedBank.color }]} onPress={handleAuthorize}>
            <Text style={s.primaryBtnText}>Authorise Access</Text>
          </Pressable>
          <Pressable style={s.ghostBtn} onPress={() => setStep('select')}>
            <Text style={s.ghostBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* SUCCESS — account confirmed, ready to sync */}
      {step === 'success' && selectedBank && (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.successCard}>
            <View style={s.successCheck}><Ionicons name="checkmark" size={32} color={C.income} /></View>
            <Text style={s.successTitle}>{selectedBank.name} connected</Text>
            <Text style={s.successSub}>Your account is linked and ready to sync.</Text>
          </View>
          <View style={s.accountSummaryCard}>
            <View style={s.accountSummaryRow}>
              <View style={[s.accountSummaryIcon, { backgroundColor: selectedBank.color + '20' }]}>
                <Ionicons name={selectedBank.icon as any} size={22} color={selectedBank.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.accountSummaryName}>{selectedBank.name} · {MOCK_ACCOUNT[selectedBank.id as BankId].accountName}</Text>
                <Text style={s.accountSummaryMeta}>{MOCK_ACCOUNT[selectedBank.id as BankId].sortCode} · {MOCK_ACCOUNT[selectedBank.id as BankId].accountNumber}</Text>
              </View>
            </View>
            <View style={s.accountSummaryBalance}>
              <Text style={s.accountSummaryBalanceLabel}>Available balance</Text>
              <Text style={[s.accountSummaryBalanceAmt, { color: C.income }]}>
                £{MOCK_ACCOUNT[selectedBank.id as BankId].balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          {(() => {
            const ss = selectedBank ? syncState[selectedBank.id] : undefined;
            return (
              <Pressable
                style={[s.primaryBtn, ss === 'synced' && { backgroundColor: C.income }, ss === 'syncing' && { opacity: 0.7 }]}
                onPress={() => selectedBank && handleQuickSync(selectedBank)}
                disabled={!!ss}
              >
                {ss === 'syncing'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : ss === 'synced'
                  ? <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={s.primaryBtnText}>Transactions synced</Text></>
                  : <><Ionicons name="sync-outline" size={18} color="#fff" /><Text style={s.primaryBtnText}>Sync Transactions</Text></>
                }
              </Pressable>
            );
          })()}
          <Pressable style={s.ghostBtn} onPress={() => router.back()}>
            <Text style={s.ghostBtnText}>Done for now</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* CATEGORIZING */}
      {step === 'categorizing' && (
        <View style={s.centred}>
          <ActivityIndicator color={C.brandLight} size="large" />
          <Text style={s.connectingTitle}>Categorising transactions…</Text>
          <Text style={s.connectingSub}>Checking saved rules, then asking Claude AI</Text>
        </View>
      )}

      {/* REVIEW — identical flow to CSV import */}
      {step === 'review' && (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Auto-categorized */}
          <Pressable style={s.sectionToggle} onPress={() => setExpandAuto((v) => !v)}>
            <View style={s.sectionLeft}>
              <View style={[s.badge, { backgroundColor: C.incomeBg, borderColor: C.incomeBorder }]}>
                <Text style={[s.badgeText, { color: C.income }]}>{autoResults.length}</Text>
              </View>
              <Text style={s.sectionTitle}>Auto-categorised</Text>
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

          {/* Needs input */}
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

          <Pressable style={[s.primaryBtn, { backgroundColor: C.income, marginTop: 16 }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={s.primaryBtnText}>Save {parsed.length} transactions</Text></>
            }
          </Pressable>
          <Pressable style={s.ghostBtn} onPress={() => setStep('success')}>
            <Text style={s.ghostBtnText}>Start over</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* DONE */}
      {step === 'done' && (
        <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.successCard}>
            <View style={s.successCheck}><Ionicons name="checkmark" size={32} color={C.income} /></View>
            <Text style={s.successTitle}>{savedCount} transactions saved</Text>
            <Text style={s.successSub}>Categories learned and stored for next time.</Text>
          </View>
          <Pressable style={s.primaryBtn} onPress={() => router.back()}>
            <Ionicons name="wallet-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Go to Home</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  sectionSub: { fontSize: 12, color: C.textMuted, marginBottom: 14 },

  emptyConnected: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 4 },
  emptyConnectedText: { fontSize: 13, color: C.textMuted },

  connectedCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectedDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  connectedDotInner: { width: 12, height: 12, borderRadius: 6 },
  connectedName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  connectedMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  connectedBalance: { fontSize: 15, fontWeight: '700' },
  disconnectText: { fontSize: 11, color: C.expense, fontWeight: '600' },

  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  bankCard: { width: '47%', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center', gap: 8 },
  bankCardConnected: { opacity: 0.5, borderColor: C.income, borderWidth: 1.5 },
  bankIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  bankTagline: { fontSize: 10, color: C.textMuted, textAlign: 'center' },

  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingTop: 4 },
  securityText: { fontSize: 11, color: C.textMuted, flex: 1, flexWrap: 'wrap' },

  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  bigIcon: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  connectingTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginTop: 20, textAlign: 'center' },
  connectingSub: { fontSize: 14, color: C.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  stepRow: { marginTop: 32, gap: 12, width: '100%' },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepText: { fontSize: 13, color: C.textSecondary },

  authHeader: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', marginVertical: 16, gap: 8 },
  authIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  authBankName: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
  authTagline: { fontSize: 12, color: C.textMuted },
  authCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 16 },
  authTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  authSub: { fontSize: 13, color: C.textSecondary, lineHeight: 19, marginBottom: 16 },
  accountPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  accountIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  accountDetail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  permTitle: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  permCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.incomeBg, borderWidth: 1, borderColor: C.incomeBorder, alignItems: 'center', justifyContent: 'center' },
  permText: { fontSize: 13, color: C.textSecondary, flex: 1 },
  cannotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  cannotText: { fontSize: 13, color: C.textMuted },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brand, padding: 16, borderRadius: 14, marginBottom: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ghostBtn: { alignItems: 'center', paddingVertical: 12 },
  ghostBtnText: { color: C.textMuted, fontSize: 14, fontWeight: '500' },

  successCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.incomeBorder, padding: 32, alignItems: 'center', marginTop: 12, marginBottom: 16 },
  successCheck: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.incomeBg, borderWidth: 1.5, borderColor: C.incomeBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  successSub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  accountSummaryCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 14 },
  accountSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  accountSummaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountSummaryName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  accountSummaryMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  accountSummaryBalance: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  accountSummaryBalanceLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500', marginBottom: 4 },
  accountSummaryBalanceAmt: { fontSize: 26, fontWeight: '700' },

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
});
