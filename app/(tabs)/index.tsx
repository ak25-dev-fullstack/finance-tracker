import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONNECTED_BANKS_KEY, ConnectedBank } from '@/app/connect-bank';
import {
  loadTransactions,
  updateTransactionCategory,
  deleteTransaction,
  bulkUpdateCategory,
  clearAllData,
  Transaction,
} from '@/services/storage';
import { CATEGORIES, runAgentCommand } from '@/services/categorizer';
import { C, getCategoryColor } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function Index() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAgent, setShowAgent] = useState(false);

  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);

  const load = async () => {
    setTransactions(await loadTransactions());
    const raw = await AsyncStorage.getItem(CONNECTED_BANKS_KEY);
    setConnectedBanks(raw ? JSON.parse(raw) : []);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setEditCategory(t.category);
    setCustomCategory(CATEGORIES.includes(t.category as any) ? '' : t.category);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const finalCategory = customCategory.trim() || editCategory;
    if (!finalCategory) return;
    await updateTransactionCategory(editing.id, finalCategory);
    setEditing(null);
    await load();
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert('Delete transaction', `Remove "${editing.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(editing.id); setEditing(null); await load(); } },
    ]);
  };

  const handleAgentCommand = async () => {
    const cmd = agentInput.trim();
    if (!cmd || agentLoading) return;
    setAgentLoading(true);
    setAgentResult(null);
    try {
      const txForAgent = transactions.map((t) => ({
        id: t.id, description: t.description, amount: t.amount, type: t.type, category: t.category,
      }));
      const action = await runAgentCommand(cmd, txForAgent as any);
      if (action.action === 'bulk_rename' && action.newCategory && action.filter) {
        let ids: string[];
        if (action.filter.all) {
          ids = transactions.map((t) => t.id);
        } else if (action.filter.description) {
          const needle = action.filter.description.toLowerCase();
          ids = transactions.filter((t) => t.description.toLowerCase().includes(needle)).map((t) => t.id);
        } else if (action.filter.category) {
          const cat = action.filter.category.toLowerCase();
          ids = transactions.filter((t) => t.category.toLowerCase() === cat).map((t) => t.id);
        } else {
          ids = [];
        }
        if (ids.length === 0) {
          setAgentResult({ ok: false, text: 'No matching transactions found.' });
        } else {
          await bulkUpdateCategory(ids, action.newCategory);
          await load();
          setAgentInput('');
          setAgentResult({ ok: true, text: action.message ?? `Renamed ${ids.length} transaction${ids.length !== 1 ? 's' : ''} to ${action.newCategory}` });
        }
      } else {
        setAgentResult({ ok: false, text: action.message });
      }
    } catch {
      setAgentResult({ ok: false, text: 'AI unavailable. Check your connection.' });
    } finally {
      setAgentLoading(false);
    }
  };

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const isCustomActive = !!customCategory.trim();
  const activeCategory = isCustomActive ? customCategory.trim() : editCategory;
  const recent = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brandLight} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>DWK Finance</Text>
              <Text style={s.subGreeting}>{user?.name ?? 'Personal Account'}</Text>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                style={s.avatarBtn}
                onPress={() => Alert.alert(user?.name ?? 'Account', user?.email ?? '', [
                  { text: 'Clear all data', style: 'destructive', onPress: async () => { await clearAllData(); await load(); } },
                  { text: 'Cancel', style: 'cancel' },
                ])}
              >
                <Ionicons name="person" size={18} color={C.brandLight} />
              </TouchableOpacity>
              <TouchableOpacity style={s.logoutBtn} onPress={() => logout()}>
                <Ionicons name="log-out-outline" size={20} color={C.expense} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance Card */}
          <View style={s.balanceCard}>
            <Text style={s.balanceLabel}>Total Balance</Text>
            <Text style={s.balanceAmount}>
              £{Math.abs(balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Text>
            <View style={[s.balanceBadge, { backgroundColor: balance >= 0 ? C.incomeBg : C.expenseBg }]}>
              <Ionicons
                name={balance >= 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={balance >= 0 ? C.income : C.expense}
              />
              <Text style={[s.balanceBadgeText, { color: balance >= 0 ? C.income : C.expense }]}>
                {balance >= 0 ? ' Positive' : ' Negative'} balance
              </Text>
            </View>
          </View>

          {/* Summary Row */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderColor: C.incomeBorder }]}>
              <View style={[s.summaryIcon, { backgroundColor: C.incomeBg }]}>
                <Ionicons name="arrow-down" size={16} color={C.income} />
              </View>
              <Text style={s.summaryLabel}>Income</Text>
              <Text style={[s.summaryAmount, { color: C.income }]}>
                £{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[s.summaryCard, { borderColor: C.expenseBorder }]}>
              <View style={[s.summaryIcon, { backgroundColor: C.expenseBg }]}>
                <Ionicons name="arrow-up" size={16} color={C.expense} />
              </View>
              <Text style={s.summaryLabel}>Expenses</Text>
              <Text style={[s.summaryAmount, { color: C.expense }]}>
                £{totalExpense.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={s.actionsRow}>
            {[
              { icon: 'add-circle-outline', label: 'Add', action: () => router.push('/add-transaction') },
              { icon: 'cloud-upload-outline', label: 'Import', action: () => router.push('/(tabs)/import') },
              { icon: 'bar-chart-outline', label: 'Insights', action: () => router.push('/(tabs)/insights') },
              { icon: 'chatbubble-ellipses-outline', label: 'AI Chat', action: () => setShowAgent(true) },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={s.actionBtn} onPress={item.action}>
                <View style={s.actionIcon}>
                  <Ionicons name={item.icon as any} size={22} color={C.brandLight} />
                </View>
                <Text style={s.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Connected Banks */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Connected Accounts</Text>
              <TouchableOpacity onPress={() => router.push('/connect-bank')}>
                <Text style={s.viewAll}>{connectedBanks.length > 0 ? 'Manage' : 'Connect'}</Text>
              </TouchableOpacity>
            </View>
            {connectedBanks.length === 0 ? (
              <TouchableOpacity style={s.connectBankBtn} onPress={() => router.push('/connect-bank')}>
                <View style={s.connectBankIcon}>
                  <Ionicons name="link-outline" size={20} color={C.brandLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectBankTitle}>Connect your bank</Text>
                  <Text style={s.connectBankSub}>Link an account to sync transactions automatically</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ) : (
              connectedBanks.map((b) => (
                <View key={b.id} style={s.bankRow}>
                  <View style={[s.bankDot, { backgroundColor: b.color + '20' }]}>
                    <View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: b.color }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankRowName}>{b.name} · {b.accountName}</Text>
                    <Text style={s.bankRowMeta}>••••{b.accountNumber.slice(-4)}</Text>
                  </View>
                  <Text style={[s.bankRowBalance, { color: C.income }]}>
                    £{b.balance.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Recent Transactions */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent Transactions</Text>
              {transactions.length > 5 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/insights')}>
                  <Text style={s.viewAll}>View all</Text>
                </TouchableOpacity>
              )}
            </View>

            {transactions.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={44} color={C.textMuted} />
                <Text style={s.emptyTitle}>No transactions yet</Text>
                <Text style={s.emptySub}>Add one manually or import from your bank</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/add-transaction')}>
                  <Text style={s.emptyBtnText}>Add Transaction</Text>
                </TouchableOpacity>
              </View>
            ) : (
              recent.map((t) => (
                <TouchableOpacity key={t.id} style={s.txRow} onPress={() => openEdit(t)}>
                  <View style={[s.txIcon, { backgroundColor: getCategoryColor(t.category) + '22' }]}>
                    <Text style={[s.txIconLetter, { color: getCategoryColor(t.category) }]}>
                      {t.category.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.txInfo}>
                    <Text style={s.txCategory} numberOfLines={1}>{t.description || t.category}</Text>
                    <Text style={s.txMeta}>{t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <Text style={[s.txAmount, { color: t.type === 'income' ? C.income : C.expense }]}>
                    {t.type === 'income' ? '+' : '−'}£{t.amount.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Market Insight Card */}
          <View style={s.insightCard}>
            <View style={s.insightHeader}>
              <Ionicons name="trending-up" size={18} color={C.brandLight} />
              <Text style={s.insightTitle}>Market Insight</Text>
            </View>
            <Text style={s.insightText}>
              Connect with a Financial Adviser in the Advisor tab for personalised wealth management and portfolio analysis.
            </Text>
            <TouchableOpacity style={s.insightBtn} onPress={() => router.push('/(tabs)/advisor')}>
              <Text style={s.insightBtnText}>Connect to Advisor</Text>
              <Ionicons name="arrow-forward" size={14} color={C.brandLight} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Agent Modal */}
      <Modal visible={showAgent} animationType="slide" transparent onRequestClose={() => setShowAgent(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAgent(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>AI Assistant</Text>
            <Text style={s.sheetSub}>Ask me to rename or organise your transactions</Text>
            <View style={s.agentRow}>
              <TextInput
                style={s.agentInput}
                placeholder="e.g. rename all McDonald's to Eating Out"
                placeholderTextColor={C.textMuted}
                value={agentInput}
                onChangeText={(v) => { setAgentInput(v); setAgentResult(null); }}
                returnKeyType="send"
                onSubmitEditing={handleAgentCommand}
                editable={!agentLoading}
              />
              <TouchableOpacity
                style={[s.agentSend, (!agentInput.trim() || agentLoading) && { opacity: 0.4 }]}
                onPress={handleAgentCommand}
                disabled={agentLoading || !agentInput.trim()}
              >
                {agentLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={18} color="#fff" />
                }
              </TouchableOpacity>
            </View>
            {agentResult && (
              <View style={[s.agentResult, agentResult.ok ? s.agentResultOk : s.agentResultErr]}>
                <Ionicons name={agentResult.ok ? 'checkmark-circle' : 'warning'} size={16} color={agentResult.ok ? C.income : C.warning} />
                <Text style={[s.agentResultText, { color: agentResult.ok ? C.income : C.warning }]}>
                  {'  '}{agentResult.text}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setEditing(null)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetDesc}>{editing?.description}</Text>
                <Text style={s.sheetDate}>{editing ? new Date(editing.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</Text>
              </View>
              <Text style={[s.sheetAmt, { color: editing?.type === 'income' ? C.income : C.expense }]}>
                {editing?.type === 'income' ? '+' : '−'}£{editing?.amount.toFixed(2)}
              </Text>
            </View>

            <Text style={s.sheetLabel}>Category</Text>
            <View style={s.pills}>
              {CATEGORIES.filter((c) => c !== 'Other').map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.pill, !isCustomActive && activeCategory === cat && s.pillActive]}
                  onPress={() => { setEditCategory(cat); setCustomCategory(''); }}
                >
                  <Text style={[s.pillText, !isCustomActive && activeCategory === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[s.customInput, isCustomActive && s.customInputActive]}
              placeholder="Or type a custom category…"
              placeholderTextColor={C.textMuted}
              value={customCategory}
              onChangeText={setCustomCategory}
            />
            <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit}>
              <Text style={s.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>Delete Transaction</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: C.textPrimary },
  subGreeting: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.expenseBg, borderWidth: 1, borderColor: C.expenseBorder, alignItems: 'center', justifyContent: 'center' },

  balanceCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.brand, borderRadius: 20, padding: 24 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 6 },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: 12 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  balanceBadgeText: { fontSize: 12, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  summaryCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: C.textMuted, fontWeight: '500', marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  section: { marginTop: 24, marginHorizontal: 20, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  viewAll: { fontSize: 13, color: C.brandLight, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.borderLight, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txIconLetter: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  txMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },

  empty: { padding: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: C.brand, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  connectBankBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  connectBankIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.brandBg, borderWidth: 1, borderColor: C.brandBorder, alignItems: 'center', justifyContent: 'center' },
  connectBankTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  connectBankSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  bankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.borderLight, gap: 12 },
  bankDot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bankRowName: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  bankRowMeta: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  bankRowBalance: { fontSize: 15, fontWeight: '700' },

  insightCard: { marginHorizontal: 20, marginBottom: 8, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.brandBorder, padding: 18 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  insightText: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 14 },
  insightBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightBtnText: { fontSize: 13, fontWeight: '600', color: C.brandLight },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  sheetSub: { fontSize: 13, color: C.textMuted, marginBottom: 16 },

  agentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  agentInput: { flex: 1, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: C.textPrimary },
  agentSend: { backgroundColor: C.brand, width: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  agentResult: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 12, borderWidth: 1 },
  agentResultOk: { backgroundColor: C.incomeBg, borderColor: C.incomeBorder },
  agentResultErr: { backgroundColor: C.warningBg, borderColor: C.warningBorder },
  agentResultText: { fontSize: 13, fontWeight: '500', flex: 1 },

  sheetTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  sheetDesc: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  sheetDate: { fontSize: 12, color: C.textMuted, marginTop: 4 },
  sheetAmt: { fontSize: 22, fontWeight: '700' },
  sheetLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  pillActive: { backgroundColor: C.brand, borderColor: C.brand },
  pillText: { fontSize: 12, fontWeight: '500', color: C.textSecondary },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  customInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textPrimary, backgroundColor: C.bg, marginBottom: 16 },
  customInputActive: { borderColor: C.brand },

  saveBtn: { backgroundColor: C.brand, padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  deleteBtn: { padding: 14, alignItems: 'center' },
  deleteBtnText: { color: C.expense, fontSize: 14, fontWeight: '500' },
});
