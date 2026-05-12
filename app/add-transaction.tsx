import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { appendTransactions } from '@/services/storage';
import { C } from '@/constants/theme';

const EXPENSE_CATEGORIES = ['Groceries', 'Transport', 'Bills & Utilities', 'Shopping', 'Eating Out', 'Health', 'Entertainment', 'Personal Care'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

export default function AddTransaction() {
  const router = useRouter();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; amount?: string; category?: string; date?: string }>({});

  const isExpense = type === 'expense';
  const quickCategories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Transaction name is required';
    const parsed = parseFloat(amount);
    if (!amount.trim()) e.amount = 'Amount is required';
    else if (isNaN(parsed) || parsed <= 0) e.amount = 'Enter a valid amount greater than 0';
    if (!category.trim()) e.category = 'Please select or enter a category';
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Enter a valid date (YYYY-MM-DD)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await appendTransactions([{
        id: `manual-${Date.now()}`,
        type,
        amount: parseFloat(amount),
        category: category.trim(),
        description: name.trim(),
        date,
        source: 'manual',
      }]);
      router.back();
    } catch {
      setErrors({ name: 'Failed to save. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: keyof typeof errors) =>
    setErrors((e) => { const next = { ...e }; delete next[field]; return next; });

  return (
    <ScrollView style={[s.container, s.scroll]} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">

        {/* Type toggle */}
        <View style={s.typeRow}>
          {(['expense', 'income'] as const).map((t) => (
            <Pressable
              key={t}
              style={[s.typeBtn, type === t && (t === 'expense' ? s.typeBtnExpense : s.typeBtnIncome)]}
              onPress={() => { setType(t); setCategory(''); }}
            >
              <Ionicons
                name={t === 'expense' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                size={18}
                color={type === t ? (t === 'expense' ? C.expenseText : C.income) : C.textMuted}
              />
              <Text style={[s.typeBtnText, type === t && { color: t === 'expense' ? C.expenseText : C.income, fontWeight: '700' }]}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Amount — big and prominent */}
        <View style={[s.amountCard, { borderColor: isExpense ? C.expenseBorder : C.incomeBorder, backgroundColor: isExpense ? C.expenseBg : C.incomeBg }]}>
          <Text style={[s.currencySymbol, { color: isExpense ? C.expenseText : C.income }]}>£</Text>
          <TextInput
            style={[s.amountInput, { color: isExpense ? C.expenseText : C.income, outlineWidth: 0 } as any]}
            value={amount}
            onChangeText={(v) => { setAmount(v); clearError('amount'); }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={isExpense ? C.expenseBorder : C.incomeBorder}
            selectionColor={isExpense ? C.expense : C.income}
            underlineColorAndroid="transparent"
          />
        </View>
        {!!errors.amount && <Text style={s.errorText}>{errors.amount}</Text>}

        {/* Transaction Name */}
        <Text style={s.label}>Transaction Name</Text>
        <TextInput
          style={[s.input, !!errors.name && s.inputError]}
          value={name}
          onChangeText={(v) => { setName(v); clearError('name'); }}
          placeholder="e.g., Tesco, Monthly Rent, Payslip"
          placeholderTextColor={C.textMuted}
          selectionColor={C.brand}
          underlineColorAndroid="transparent"
          returnKeyType="next"
        />
        {!!errors.name && <Text style={s.errorText}>{errors.name}</Text>}

        {/* Category */}
        <Text style={s.label}>Category</Text>
        <TextInput
          style={[s.input, !!errors.category && s.inputError]}
          value={category}
          onChangeText={(v) => { setCategory(v); clearError('category'); }}
          placeholder="Type or pick below"
          placeholderTextColor={C.textMuted}
          selectionColor={C.brand}
          underlineColorAndroid="transparent"
        />
        {!!errors.category && <Text style={s.errorText}>{errors.category}</Text>}
        <View style={s.quickRow}>
          {quickCategories.map((cat) => (
            <Pressable
              key={cat}
              style={[s.quickPill, category === cat && s.quickPillActive]}
              onPress={() => { setCategory(cat); clearError('category'); }}
            >
              <Text style={[s.quickPillText, category === cat && s.quickPillTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </View>

        {/* Date */}
        <Text style={s.label}>Date</Text>
        <View style={[s.dateRow, !!errors.date && s.inputError]}>
          <Ionicons name="calendar-outline" size={18} color={C.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[s.dateInput, { outlineWidth: 0 } as any]}
            value={date}
            onChangeText={(v) => { setDate(v); clearError('date'); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
            selectionColor={C.brand}
            underlineColorAndroid="transparent"
          />
        </View>
        {!!errors.date && <Text style={s.errorText}>{errors.date}</Text>}

        {/* Submit */}
        <Pressable
          style={[s.submitBtn, { backgroundColor: isExpense ? C.expense : C.income }, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={isExpense ? C.bg : '#fff'} />
            : <>
                <Ionicons name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color={isExpense ? C.bg : '#fff'} />
                <Text style={[s.submitBtnText, { color: isExpense ? C.bg : '#fff' }]}>
                  Add {isExpense ? 'Expense' : 'Income'}
                </Text>
              </>
          }
        </Pressable>

        <Pressable style={s.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </Pressable>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 20 },
  label: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 22 },

  typeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  typeBtnExpense: { backgroundColor: C.expenseBg, borderColor: C.expenseBorder },
  typeBtnIncome: { backgroundColor: C.incomeBg, borderColor: C.incomeBorder },
  typeBtnText: { fontSize: 15, fontWeight: '500', color: C.textMuted },

  amountCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 20, marginTop: 24 },
  currencySymbol: { fontSize: 28, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '700', paddingVertical: 18 },

  input: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textPrimary },
  inputError: { borderColor: C.destructive },

  errorText: { fontSize: 12, color: C.destructive, marginTop: 5, marginLeft: 4 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  quickPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  quickPillText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  quickPillTextActive: { color: '#fff', fontWeight: '600' },

  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16 },
  dateInput: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 14 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: 16, marginTop: 36 },
  submitBtnText: { fontSize: 17, fontWeight: '700' },
  cancelBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: C.textMuted, fontSize: 15, fontWeight: '500' },
});
