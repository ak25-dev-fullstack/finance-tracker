import { C, getCategoryColor } from '@/constants/theme';
import { CATEGORIES } from '@/services/categorizer';
import {
  Transaction,
  TransactionItem,
  deleteTransaction,
  loadTransactions,
  updateTransactionCategory,
  updateTransactionItems,
  updateTransactionName,
} from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function TransactionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tx, setTx] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const [items, setItems] = useState<TransactionItem[]>([]);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');

  const load = useCallback(async () => {
    const txs = await loadTransactions();
    const found = txs.find((t) => t.id === id) ?? null;
    if (found) {
      setTx(found);
      setEditName(found.description);
      setEditCategory(found.category);
      setItems(found.items ?? []);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!tx) return null;

  const catColor = getCategoryColor(tx.category);
  const itemsWithPrice = items.filter((i) => i.price !== undefined);
  const itemsTotal = itemsWithPrice.reduce((s, i) => s + (i.price ?? 0), 0);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const saveName = async () => {
    const name = editName.trim();
    if (!name) return;
    await updateTransactionName(tx.id, name);
    setTx((prev) => prev ? { ...prev, description: name } : prev);
    setEditingName(false);
  };

  const saveCategory = async (cat: string) => {
    if (!cat) return;
    await updateTransactionCategory(tx.id, cat);
    setTx((prev) => prev ? { ...prev, category: cat } : prev);
    setEditCategory(cat);
    setEditingCategory(false);
    setCustomCategory('');
  };

  const handleDelete = () => {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteTransaction(tx.id); router.back(); },
      },
    ]);
  };

  const commitItems = async (updated: TransactionItem[]) => {
    setItems(updated);
    await updateTransactionItems(tx.id, updated);
  };

  const addItem = async () => {
    const name = newItemName.trim();
    if (!name) return;
    const price = newItemPrice.trim() ? parseFloat(newItemPrice.trim()) : undefined;
    const item: TransactionItem = { id: `item-${Date.now()}`, name, price };
    await commitItems([...items, item]);
    setNewItemName('');
    setNewItemPrice('');
    setAddingItem(false);
  };

  const startEditItem = (item: TransactionItem) => {
    setEditingItem(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price !== undefined ? item.price.toFixed(2) : '');
  };

  const saveEditItem = async () => {
    const name = editItemName.trim();
    if (!name || !editingItem) return;
    const price = editItemPrice.trim() ? parseFloat(editItemPrice.trim()) : undefined;
    await commitItems(items.map((i) => i.id === editingItem ? { ...i, name, price } : i));
    setEditingItem(null);
  };

  const deleteItem = async (itemId: string) => {
    await commitItems(items.filter((i) => i.id !== itemId));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Amount hero */}
        <View
          style={[s.hero, { backgroundColor: (tx.type === 'income' ? C.incomeBg : C.expenseBg) }]}
          accessible
          accessibilityLabel={`${tx.type === 'income' ? 'Income' : 'Expense'} of £${tx.amount.toFixed(2)}, category ${tx.category}, on ${new Date(tx.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        >
          <View style={[s.heroIconWrap, { backgroundColor: catColor + '33' }]} accessibilityElementsHidden>
            <Text style={[s.heroIconLetter, { color: catColor }]}>{tx.category.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[s.heroAmount, { color: tx.type === 'income' ? C.income : C.expense }]} importantForAccessibility="no">
            {tx.type === 'income' ? '+' : '−'}£{tx.amount.toFixed(2)}
          </Text>
          <Text style={s.heroDate} importantForAccessibility="no">
            {new Date(tx.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Info card */}
        <View style={s.card}>

          {/* Description */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Description</Text>
            {editingName ? (
              <View style={s.inlineEdit}>
                <TextInput
                  style={s.inlineInput}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  selectionColor={C.brand}
                />
                <Pressable style={s.inlineConfirm} onPress={saveName} accessibilityRole="button" accessibilityLabel="Save name">
                  <Ionicons name="checkmark" size={16} color="#fff" accessibilityElementsHidden />
                </Pressable>
                <Pressable style={s.inlineClose} onPress={() => { setEditingName(false); setEditName(tx.description); }} accessibilityRole="button" accessibilityLabel="Cancel editing">
                  <Ionicons name="close" size={16} color={C.textMuted} accessibilityElementsHidden />
                </Pressable>
              </View>
            ) : (
              <Pressable style={s.fieldValue} onPress={() => setEditingName(true)} accessibilityRole="button" accessibilityLabel={`Description: ${tx.description}. Double tap to edit`}>
                <Text style={s.fieldValueText} numberOfLines={1} importantForAccessibility="no">{tx.description}</Text>
                <Ionicons name="pencil-outline" size={13} color={C.textMuted} accessibilityElementsHidden />
              </Pressable>
            )}
          </View>

          {/* Category */}
          <View style={s.fieldRow}>
            <Text style={s.fieldLabel}>Category</Text>
            <Pressable style={s.fieldValue} onPress={() => setEditingCategory((v) => !v)} accessibilityRole="button" accessibilityLabel={`Category: ${tx.category}. Double tap to change`} accessibilityState={{ expanded: editingCategory }}>
              <View style={[s.catBadge, { backgroundColor: catColor + '22' }]} accessibilityElementsHidden>
                <Text style={[s.catBadgeText, { color: catColor }]}>{tx.category}</Text>
              </View>
              <Ionicons name={editingCategory ? 'chevron-up' : 'chevron-down'} size={13} color={C.textMuted} accessibilityElementsHidden />
            </Pressable>
          </View>

          {editingCategory && (
            <View style={s.catPicker}>
              <View style={s.catPills}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[s.catPill, editCategory === cat && s.catPillActive]}
                    onPress={() => saveCategory(cat)}
                    accessibilityRole="button"
                    accessibilityLabel={cat}
                    accessibilityState={{ selected: editCategory === cat }}
                  >
                    <Text style={[s.catPillText, editCategory === cat && s.catPillTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={s.customCatInput}
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Custom category…"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
                onSubmitEditing={() => saveCategory(customCategory.trim())}
                selectionColor={C.brand}
              />
            </View>
          )}

          {/* Type */}
          <View style={[s.fieldRow, { borderBottomWidth: 0 }]}>
            <Text style={s.fieldLabel}>Type</Text>
            <View style={[s.typeBadge, { backgroundColor: tx.type === 'income' ? C.incomeBg : C.expenseBg }]}>
              <Text style={[s.typeBadgeText, { color: tx.type === 'income' ? C.income : C.expense }]}>
                {tx.type === 'income' ? 'Income' : 'Expense'} · {tx.source}
              </Text>
            </View>
          </View>
        </View>

        {/* Items section */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Items</Text>
              <Text style={s.sectionSub}>What did this transaction cover?</Text>
            </View>
            {!addingItem && (
              <Pressable style={s.addBtn} onPress={() => setAddingItem(true)} accessibilityRole="button" accessibilityLabel="Add item">
                <Ionicons name="add" size={20} color="#fff" accessibilityElementsHidden />
              </Pressable>
            )}
          </View>

          {/* Empty state */}
          {items.length === 0 && !addingItem && (
            <Pressable style={s.emptyItems} onPress={() => setAddingItem(true)} accessibilityRole="button" accessibilityLabel="No items yet. Double tap to add items to this transaction">
              <Ionicons name="receipt-outline" size={36} color={C.textMuted} accessibilityElementsHidden />
              <Text style={s.emptyTitle} importantForAccessibility="no">No items yet</Text>
              <Text style={s.emptySub} importantForAccessibility="no">Tap + to list what was in this transaction</Text>
            </Pressable>
          )}

          {/* Item rows */}
          {items.map((item) => (
            editingItem === item.id ? (
              <View key={item.id} style={s.itemEditRow}>
                <TextInput
                  style={s.itemEditInput}
                  value={editItemName}
                  onChangeText={setEditItemName}
                  placeholder="Item name"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  selectionColor={C.brand}
                />
                <TextInput
                  style={[s.itemEditInput, s.itemEditPrice]}
                  value={editItemPrice}
                  onChangeText={setEditItemPrice}
                  placeholder="£"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  selectionColor={C.brand}
                />
                <Pressable style={s.inlineConfirm} onPress={saveEditItem} accessibilityRole="button" accessibilityLabel="Save item">
                  <Ionicons name="checkmark" size={16} color="#fff" accessibilityElementsHidden />
                </Pressable>
                <Pressable style={s.inlineClose} onPress={() => setEditingItem(null)} accessibilityRole="button" accessibilityLabel="Cancel editing item">
                  <Ionicons name="close" size={16} color={C.textMuted} accessibilityElementsHidden />
                </Pressable>
              </View>
            ) : (
              <Pressable
                key={item.id}
                style={s.itemRow}
                onPress={() => startEditItem(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}${item.price !== undefined ? `, £${item.price.toFixed(2)}` : ''}. Double tap to edit`}
              >
                <View style={s.itemDot} accessibilityElementsHidden />
                <Text style={s.itemName} numberOfLines={1} importantForAccessibility="no">{item.name}</Text>
                {item.price !== undefined && (
                  <Text style={s.itemPrice} importantForAccessibility="no">£{item.price.toFixed(2)}</Text>
                )}
                <Pressable onPress={() => deleteItem(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`}>
                  <Ionicons name="close-circle" size={18} color={C.textMuted} accessibilityElementsHidden />
                </Pressable>
              </Pressable>
            )
          ))}

          {/* Total bar */}
          {itemsWithPrice.length > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Items total</Text>
              <Text style={[s.totalValue, itemsTotal > tx.amount && { color: C.expense }]}>
                £{itemsTotal.toFixed(2)}
                {itemsTotal > tx.amount && ' (over)'}
              </Text>
            </View>
          )}

          {/* Add item form */}
          {addingItem && (
            <View style={s.addForm}>
              <TextInput
                style={s.addInput}
                value={newItemName}
                onChangeText={setNewItemName}
                placeholder="Item name (e.g. Milk, Bus fare)"
                placeholderTextColor={C.textMuted}
                autoFocus
                returnKeyType="next"
                selectionColor={C.brand}
              />
              <View style={s.addRow}>
                <TextInput
                  style={[s.addInput, { flex: 1, marginBottom: 0 }]}
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  placeholder="Price (optional)"
                  placeholderTextColor={C.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={addItem}
                  selectionColor={C.brand}
                />
                <Pressable
                  style={[s.addConfirmBtn, !newItemName.trim() && { opacity: 0.4 }]}
                  onPress={addItem}
                  disabled={!newItemName.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Add item"
                  accessibilityState={{ disabled: !newItemName.trim() }}
                >
                  <Text style={s.addConfirmBtnText}>Add</Text>
                </Pressable>
                <Pressable style={s.addCancelBtn} onPress={() => { setAddingItem(false); setNewItemName(''); setNewItemPrice(''); }} accessibilityRole="button" accessibilityLabel="Cancel adding item">
                  <Text style={s.addCancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Delete */}
        <Pressable style={s.deleteBtn} onPress={handleDelete} accessibilityRole="button" accessibilityLabel="Delete transaction">
          <Ionicons name="trash-outline" size={15} color={C.destructive} accessibilityElementsHidden />
          <Text style={s.deleteBtnText}>Delete transaction</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
  heroIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroIconLetter: { fontSize: 26, fontWeight: '700' },
  heroAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  heroDate: { fontSize: 13, color: '#94A3B8' },

  card: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },

  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 },
  fieldValue: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  fieldValueText: { fontSize: 14, color: C.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1 },

  inlineEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  inlineInput: { flex: 1, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1.5, borderColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: C.textPrimary },
  inlineConfirm: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  inlineClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' },

  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  catBadgeText: { fontSize: 13, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeBadgeText: { fontSize: 12, fontWeight: '500' },

  catPicker: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  catPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  catPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  catPillText: { fontSize: 12, color: C.textSecondary, fontWeight: '500' },
  catPillTextActive: { color: '#fff', fontWeight: '600' },
  customCatInput: { borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.textPrimary, backgroundColor: C.bg },

  section: { marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  sectionSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },

  emptyItems: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 6 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  emptySub: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: C.border },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.brand, flexShrink: 0 },
  itemName: { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '500' },
  itemPrice: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginRight: 4 },

  itemEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  itemEditInput: { flex: 2, backgroundColor: C.bg, borderRadius: 8, borderWidth: 1.5, borderColor: C.brand, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, color: C.textPrimary },
  itemEditPrice: { flex: 1 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg },
  totalLabel: { fontSize: 12, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  totalValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary },

  addForm: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  addInput: { backgroundColor: C.bg, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.textPrimary, marginBottom: 0 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addConfirmBtn: { backgroundColor: C.brand, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addConfirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  addCancelBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  addCancelBtnText: { color: C.textMuted, fontSize: 14 },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, marginHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.expenseBorder, backgroundColor: C.expenseBg },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: C.destructive },
});
