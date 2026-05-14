import Logo from '@/app/components/Logo';
import { CONNECTED_BANKS_KEY, ConnectedBank } from '@/app/connect-bank';
import { C, COLOR_PALETTE, getCategoryColor } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useOnboardingTarget } from '@/context/onboarding';
import { CATEGORIES, runAgentCommand } from '@/services/categorizer';
import {
  bulkUpdateCategory,
  deleteTransaction,
  loadCustomCategoryColors,
  loadTransactions,
  saveCustomCategoryColor,
  Transaction,
  updateTransactionCategory,
  updateTransactionName
} from '@/services/storage';
import { exportTransactionsCsv, exportTransactionsPdf } from '@/services/export';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function Index() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [editName, setEditName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAgent, setShowAgent] = useState(false);

  const [connectedBanks, setConnectedBanks] = useState<ConnectedBank[]>([]);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});

  const [openAccounts, setOpenAccounts] = useState(true);
  const [openTransactions, setOpenTransactions] = useState(true);
  const [openAdviser, setOpenAdviser] = useState(true);

  const addActionRef = useOnboardingTarget('home_actions');
  const importRef = useOnboardingTarget('home_import');
  const aiInsightsRef = useOnboardingTarget('home_ai');
  const aiChatRef = useOnboardingTarget('home_ai_chat');
  const connectBankRef = useOnboardingTarget('home_connect');

  const catColor = (cat: string) => getCategoryColor(cat, customColors);

  const load = useCallback(async () => {
    const [txs, raw, colors] = await Promise.all([
      loadTransactions(),
      AsyncStorage.getItem(CONNECTED_BANKS_KEY),
      loadCustomCategoryColors(),
    ]);
    setTransactions(txs);
    setConnectedBanks(raw ? JSON.parse(raw) : []);
    setCustomColors(colors);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setEditCategory(t.category);
    setCustomCategory(CATEGORIES.includes(t.category as any) ? '' : t.category);
    setEditName(t.description);
    setShowColorPicker(false);
    setConfirmDelete(false);
  };

  const handlePickColor = async (color: string) => {
    const cat = customCategory.trim() || editCategory;
    if (!cat) return;
    await saveCustomCategoryColor(cat, color);
    setCustomColors((prev) => ({ ...prev, [cat]: color }));
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const finalCategory = customCategory.trim() || editCategory;
    const finalName = editName.trim() || editing.description;
    if (!finalCategory) return;
    await Promise.all([
      updateTransactionCategory(editing.id, finalCategory),
      finalName !== editing.description ? updateTransactionName(editing.id, finalName) : Promise.resolve(),
    ]);
    setEditing(null);
    await load();
  };

  const handleSaveAll = async () => {
    if (!editing) return;
    const finalCategory = customCategory.trim() || editCategory;
    if (!finalCategory) return;
    const needle = editing.description.toLowerCase().trim();
    const ids = transactions
      .filter((t) => t.description.toLowerCase().trim() === needle)
      .map((t) => t.id);
    await bulkUpdateCategory(ids, finalCategory);
    setEditing(null);
    await load();
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    const id = editing.id;
    // Optimistic update — remove from UI immediately
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setEditing(null);
    setConfirmDelete(false);
    try {
      await deleteTransaction(id);
    } catch {
      // Rollback on failure
      await load();
    } finally {
      setDeleting(false);
    }
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

      if (action.action === 'rename_description' && action.id && action.newDescription) {
        const target = transactions.find((t) => t.id === action.id);
        if (!target) {
          setAgentResult({ ok: false, text: 'Could not find that transaction.' });
        } else {
          await updateTransactionName(action.id, action.newDescription);
          await load();
          setAgentInput('');
          setAgentResult({ ok: true, text: action.message ?? `Renamed "${target.description}" → "${action.newDescription}"` });
        }
      } else if (action.action === 'single_rename' && action.id && action.newCategory) {
        const target = transactions.find((t) => t.id === action.id);
        if (!target) {
          setAgentResult({ ok: false, text: 'Could not find that specific transaction.' });
        } else {
          await updateTransactionCategory(action.id, action.newCategory);
          await load();
          setAgentInput('');
          setAgentResult({ ok: true, text: action.message ?? `Renamed "${target.description}" (£${target.amount.toFixed(2)}) to ${action.newCategory}` });
        }
      } else if (action.action === 'bulk_rename' && action.newCategory && action.filter) {
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
  const matchCount = editing
    ? transactions.filter((t) => t.description.toLowerCase().trim() === editing.description.toLowerCase().trim()).length
    : 0;

  return (
    <>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brandLight} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header */}
          <View style={s.header}>
            <View style={{ gap: 4 }}>
              <Logo height={26} />
              <Text style={s.subGreeting}>{user?.name ?? 'Personal Account'}</Text>
            </View>
            <View style={s.headerActions}>
              <Pressable style={s.avatarBtn} onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel="Search transactions">
                <Ionicons name="search-outline" size={18} color={C.brandLight} />
              </Pressable>
              <Pressable
                style={s.avatarBtn}
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="View profile"
              >
                <Ionicons name="person" size={18} color={C.brandLight} />
              </Pressable>
              <Pressable style={s.logoutBtn} onPress={() => { logout(); router.replace('/login'); }} accessibilityRole="button" accessibilityLabel="Sign out">
                <Ionicons name="log-out-outline" size={20} color={C.expense} />
              </Pressable>
            </View>
          </View>

          {/* Balance Card */}
          <View
            style={s.balanceCard}
            accessible
            accessibilityLabel={`Total balance: £${Math.abs(balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}. ${balance >= 0 ? 'Positive' : 'Negative'} balance`}
          >
            <Text style={s.balanceLabel}>Total Balance</Text>
            <Text style={s.balanceAmount}>
              £{Math.abs(balance).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </Text>
            <View style={[s.balanceBadge, { backgroundColor: balance >= 0 ? C.incomeBg : C.expenseBg }]}>
              <Ionicons
                name={balance >= 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={balance >= 0 ? C.income : C.expense}
                accessibilityElementsHidden
              />
              <Text style={[s.balanceBadgeText, { color: balance >= 0 ? C.income : C.expense }]}>
                {balance >= 0 ? ' Positive' : ' Negative'} balance
              </Text>
            </View>
          </View>

          {/* Summary Row */}
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { borderColor: C.incomeBorder }]} accessible accessibilityLabel={`Income: £${totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}>
              <View style={[s.summaryIcon, { backgroundColor: C.incomeBg }]}>
                <Ionicons name="arrow-down" size={16} color={C.income} accessibilityElementsHidden />
              </View>
              <Text style={s.summaryLabel}>Income</Text>
              <Text style={[s.summaryAmount, { color: C.income }]}>
                £{totalIncome.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[s.summaryCard, { borderColor: C.expenseBorder }]} accessible accessibilityLabel={`Expenses: £${totalExpense.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`}>
              <View style={[s.summaryIcon, { backgroundColor: C.expenseBg }]}>
                <Ionicons name="arrow-up" size={16} color={C.expense} accessibilityElementsHidden />
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
              { icon: 'add-circle-outline', label: 'Add', action: () => router.push('/add-transaction'), ref: addActionRef },
              { icon: 'cloud-upload-outline', label: 'Import', action: () => router.push('/import'), ref: importRef },
              { icon: 'bar-chart-outline', label: 'Insights', action: () => router.push('/insights'), ref: aiInsightsRef },
              { icon: 'chatbubble-ellipses-outline', label: 'AI Chat', action: () => setShowAgent(true), ref: aiChatRef },
            ].map((item) => (
              <View key={item.label} ref={(item as any).ref} collapsable={false}>
                <Pressable style={s.actionBtn} onPress={item.action} accessibilityRole="button" accessibilityLabel={item.label}>
                  <View style={s.actionIcon}>
                    <Ionicons name={item.icon as any} size={22} color={C.brandLight} accessibilityElementsHidden />
                  </View>
                  <Text style={s.actionLabel} importantForAccessibility="no">{item.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Connected Banks */}
          <View style={s.section}>
            <Pressable style={s.sectionHeader} onPress={() => setOpenAccounts((v) => !v)} accessibilityRole="button" accessibilityLabel="Connected Accounts" accessibilityHint={openAccounts ? 'Collapse section' : 'Expand section'} accessibilityState={{ expanded: openAccounts }}>
              <Text style={s.sectionTitle}>Connected Accounts</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => router.push('/connect-bank')} accessibilityRole="button" accessibilityLabel={connectedBanks.length > 0 ? 'Manage connected banks' : 'Connect a bank'}>
                  <Text style={s.viewAll}>{connectedBanks.length > 0 ? 'Manage' : 'Connect'}</Text>
                </Pressable>
                <Ionicons name={openAccounts ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} accessibilityElementsHidden />
              </View>
            </Pressable>
            {openAccounts && (connectedBanks.length === 0 ? (
              <Pressable ref={connectBankRef} style={s.connectBankBtn} onPress={() => router.push('/connect-bank')} accessibilityRole="button" accessibilityLabel="Connect your bank. Link an account to sync transactions automatically">
                <View style={s.connectBankIcon}>
                  <Ionicons name="link-outline" size={20} color={C.brandLight} accessibilityElementsHidden />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.connectBankTitle}>Connect your bank</Text>
                  <Text style={s.connectBankSub}>Link an account to sync transactions automatically</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} accessibilityElementsHidden />
              </Pressable>
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
            ))}
          </View>

          {/* Recent Transactions */}
          <View style={s.section}>
            <Pressable style={s.sectionHeader} onPress={() => setOpenTransactions((v) => !v)} accessibilityRole="button" accessibilityLabel="Recent Transactions" accessibilityHint={openTransactions ? 'Collapse section' : 'Expand section'} accessibilityState={{ expanded: openTransactions }}>
              <Text style={s.sectionTitle}>Recent Transactions</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {transactions.length > 5 && (
                  <Pressable onPress={() => router.push('/insights')} accessibilityRole="button" accessibilityLabel="View all transactions">
                    <Text style={s.viewAll}>View all</Text>
                  </Pressable>
                )}
                <Ionicons name={openTransactions ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} accessibilityElementsHidden />
              </View>
            </Pressable>

            {openTransactions && (transactions.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="receipt-outline" size={44} color={C.textMuted} />
                <Text style={s.emptyTitle}>No transactions yet</Text>
                <Text style={s.emptySub}>Add one manually or import from your bank</Text>
                <Pressable style={s.emptyBtn} onPress={() => router.push('/add-transaction')} accessibilityRole="button" accessibilityLabel="Add Transaction">
                  <Text style={s.emptyBtnText}>Add Transaction</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {recent.map((t) => (
                  <Pressable
                    key={t.id}
                    style={s.txRow}
                    onPress={() => router.push({ pathname: '/transaction-detail', params: { id: t.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.description || t.category}, ${t.category}, ${new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}, ${t.type === 'income' ? 'income' : 'expense'} £${t.amount.toFixed(2)}${t.items && t.items.length > 0 ? `, items: ${t.items.map((i) => i.name).join(', ')}` : ''}`}
                    accessibilityHint="Double tap to view transaction details"
                  >
                    <View style={[s.txIcon, { backgroundColor: catColor(t.category) + '22' }]} accessibilityElementsHidden>
                      <Text style={[s.txIconLetter, { color: catColor(t.category) }]}>
                        {t.category.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.txInfo} importantForAccessibility="no">
                      <Text style={s.txCategory} numberOfLines={1}>{t.description || t.category}</Text>
                      <Text style={s.txMeta}>{t.category} · {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</Text>
                      {t.items && t.items.length > 0 && (
                        <Text style={s.txItems} numberOfLines={1}>
                          {t.items.map((i) => i.name).join(' · ')}
                        </Text>
                      )}
                    </View>
                    <Text style={[s.txAmount, { color: t.type === 'income' ? C.income : C.expense }]} importantForAccessibility="no">
                      {t.type === 'income' ? '+' : '−'}£{t.amount.toFixed(2)}
                    </Text>
                  </Pressable>
                ))}
                <View style={s.exportRow}>
                  <Pressable style={s.exportBtn} onPress={() => exportTransactionsCsv(transactions)} accessibilityRole="button" accessibilityLabel="Export transaction history as CSV">
                    <Ionicons name="document-text-outline" size={14} color={C.brandLight} accessibilityElementsHidden />
                    <Text style={s.exportBtnText}>CSV</Text>
                  </Pressable>
                  <Pressable style={s.exportBtn} onPress={() => exportTransactionsPdf(transactions)} accessibilityRole="button" accessibilityLabel="Export transaction history as PDF">
                    <Ionicons name="print-outline" size={14} color={C.brandLight} accessibilityElementsHidden />
                    <Text style={s.exportBtnText}>PDF</Text>
                  </Pressable>
                </View>
              </>
            ))}
          </View>

          {/* Adviser Recommendations Card */}
          <View style={s.insightCard}>
            <Pressable style={s.insightHeader} onPress={() => setOpenAdviser((v) => !v)} accessibilityRole="button" accessibilityLabel="Adviser's Recommendations" accessibilityHint={openAdviser ? 'Collapse section' : 'Expand section'} accessibilityState={{ expanded: openAdviser }}>
              <Ionicons name="trending-up" size={18} color={C.brandLight} accessibilityElementsHidden />
              <Text style={s.insightTitle}>Adviser's Recommendations</Text>
              <Ionicons name={openAdviser ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMuted} style={{ marginLeft: 'auto' }} accessibilityElementsHidden />
            </Pressable>
            {openAdviser && (
              <>
                <Text style={s.insightText}>
                  Your portfolio is visible to your assigned DWK adviser. They will reach out with personalised wealth management and portfolio analysis.
                </Text>
                <Pressable style={s.adviserBtn} onPress={() => router.push('/(tabs)/invest?tab=adviser' as any)} accessibilityRole="button" accessibilityLabel="Consult Adviser">
                  <Ionicons name="people-outline" size={16} color="#fff" accessibilityElementsHidden />
                  <Text style={s.adviserBtnText}>Consult Adviser</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Agent Modal */}
      <Modal visible={showAgent} animationType="slide" transparent onRequestClose={() => setShowAgent(false)}>
        <Pressable style={s.overlay} onPress={() => setShowAgent(false)}>
          <Pressable style={s.sheet}>
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
              <Pressable
                style={[s.agentSend, (!agentInput.trim() || agentLoading) && { opacity: 0.4 }]}
                onPress={handleAgentCommand}
                disabled={agentLoading || !agentInput.trim()}
              >
                {agentLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="send" size={18} color="#fff" />
                }
              </Pressable>
            </View>
            {agentResult && (
              <View style={[s.agentResult, agentResult.ok ? s.agentResultOk : s.agentResultErr]}>
                <Ionicons name={agentResult.ok ? 'checkmark-circle' : 'warning'} size={16} color={agentResult.ok ? C.income : C.warning} />
                <Text style={[s.agentResultText, { color: agentResult.ok ? C.income : C.warning }]}>
                  {'  '}{agentResult.text}
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <Pressable style={s.overlay} onPress={() => setEditing(null)}>
          <Pressable style={[s.sheet, { opacity: 1 }]}>
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

            <Text style={s.sheetLabel}>Name</Text>
            <TextInput
              style={s.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Transaction name"
              placeholderTextColor={C.textMuted}
              selectionColor={C.brand}
              underlineColorAndroid="transparent"
            />

            <Text style={s.sheetLabel}>Category</Text>
            <View style={s.pills}>
              {CATEGORIES.filter((c) => c !== 'Other').map((cat) => (
                <Pressable
                  key={cat}
                  style={[s.pill, !isCustomActive && activeCategory === cat && s.pillActive]}
                  onPress={() => { setEditCategory(cat); setCustomCategory(''); }}
                >
                  <Text style={[s.pillText, !isCustomActive && activeCategory === cat && s.pillTextActive]}>{cat}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[s.customInput, isCustomActive && s.customInputActive]}
              placeholder="Or type a custom category…"
              placeholderTextColor={C.textMuted}
              value={customCategory}
              onChangeText={setCustomCategory}
            />

            {/* Category colour */}
            <Pressable style={s.colorRow} onPress={() => setShowColorPicker((v) => !v)}>
              <View style={[s.colorDot, { backgroundColor: catColor(activeCategory) }]} />
              <Text style={s.colorRowLabel}>Category colour</Text>
              <Ionicons name={showColorPicker ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
            </Pressable>
            {showColorPicker && (
              <View style={s.colorGrid}>
                {COLOR_PALETTE.map((col) => {
                  const selected = catColor(activeCategory) === col;
                  return (
                    <Pressable key={col} onPress={() => handlePickColor(col)} style={[s.colorSwatch, { backgroundColor: col }, selected && s.colorSwatchSelected]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Save scope — single vs all */}
            <View style={s.saveScopeRow}>
              <Pressable style={s.saveScopeBtn} onPress={handleSaveEdit}>
                <Ionicons name="bookmark-outline" size={15} color={C.brand} style={{ marginBottom: 4 }} />
                <Text style={s.saveScopeBtnText}>This transaction</Text>
                <Text style={s.saveScopeBtnSub}>only this one</Text>
              </Pressable>
              <Pressable
                style={[s.saveScopeBtn, matchCount > 1 ? s.saveScopeBtnAll : s.saveScopeBtnDisabled]}
                onPress={handleSaveAll}
                disabled={matchCount <= 1}
              >
                <Ionicons name="layers-outline" size={15} color={matchCount > 1 ? C.brandLight : C.textMuted} style={{ marginBottom: 4 }} />
                <Text style={[s.saveScopeBtnText, matchCount <= 1 && { color: C.textMuted }]}>
                  All "{editing?.description}"
                </Text>
                <Text style={[s.saveScopeBtnSub, matchCount <= 1 && { color: C.textMuted }]}>
                  {matchCount} transaction{matchCount !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>

            {!confirmDelete ? (
              <Pressable style={s.deleteBtn} onPress={() => setConfirmDelete(true)}>
                <Ionicons name="trash-outline" size={15} color={C.destructive} style={{ marginRight: 6 }} />
                <Text style={s.deleteBtnText}>Delete Transaction</Text>
              </Pressable>
            ) : (
              <View style={s.deleteConfirmRow}>
                <Text style={s.deleteConfirmText}>Remove this transaction?</Text>
                <View style={s.deleteConfirmBtns}>
                  <Pressable style={s.deleteCancelBtn} onPress={() => setConfirmDelete(false)}>
                    <Text style={s.deleteCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={s.deleteConfirmBtn} onPress={handleDelete} disabled={deleting}>
                    {deleting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.deleteConfirmBtnText}>Delete</Text>
                    }
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
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

  balanceCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: '#1E86C3', borderRadius: 20, borderWidth: 1, borderColor: '#13263E', padding: 24 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 6 },
  balanceAmount: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: 12 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  balanceBadgeText: { fontSize: 12, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 16 },
  summaryCard: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: C.textMuted, fontWeight: '500', marginBottom: 4 },
  summaryAmount: { fontSize: 18, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16 },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  section: { marginTop: 16, marginHorizontal: 20, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, width: '100%' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  viewAll: { fontSize: 13, color: C.brandLight, fontWeight: '600' },

  txRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.borderLight, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txIconLetter: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txCategory: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  txMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  txItems: { fontSize: 11, color: C.brandLight, marginTop: 3, opacity: 0.8 },
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

  insightCard: { marginTop: 16, marginHorizontal: 20, marginBottom: 8, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.brandBorder, padding: 18 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, width: '100%' },
  insightTitle: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  insightText: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 14 },
  adviserBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 11 },
  adviserBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

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

  nameInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.textPrimary, backgroundColor: C.bg, marginBottom: 16, outlineWidth: 0 } as any,
  customInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.textPrimary, backgroundColor: C.bg, marginBottom: 12 },
  customInputActive: { borderColor: C.brand },

  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 4 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  colorRowLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textSecondary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#fff' },

  saveScopeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  saveScopeBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.brandBorder, backgroundColor: C.brandBg },
  saveScopeBtnAll: { borderColor: C.brandBorder, backgroundColor: C.brandBg },
  saveScopeBtnDisabled: { borderColor: C.border, backgroundColor: C.bg },
  saveScopeBtnText: { fontSize: 13, fontWeight: '700', color: C.brand, textAlign: 'center' },
  saveScopeBtnSub: { fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: 'center' },
  deleteBtn: { flexDirection: 'row', padding: 14, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: C.destructive, fontSize: 14, fontWeight: '500' },

  deleteConfirmRow: { marginTop: 4, borderRadius: 14, borderWidth: 1.5, borderColor: C.destructive, padding: 14, backgroundColor: C.destructiveLight },
  deleteConfirmText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 12 },
  deleteConfirmBtns: { flexDirection: 'row', gap: 10 },
  deleteCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  deleteCancelText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  deleteConfirmBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, backgroundColor: C.destructive, alignItems: 'center' },
  deleteConfirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  exportRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.borderLight },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.brandBorder, backgroundColor: C.brandBg },
  exportBtnText: { fontSize: 12, fontWeight: '600', color: C.brandLight },
});
