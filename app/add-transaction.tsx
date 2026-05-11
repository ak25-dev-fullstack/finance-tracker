import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { appendTransactions } from '@/services/storage';
import { C } from '@/constants/theme';

export default function AddTransaction() {
  const router = useRouter();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async () => {
    if (!amount || !category) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }
    try {
      await appendTransactions([{
        id: `manual-${Date.now()}`,
        type,
        amount: parseFloat(amount),
        category,
        description: category,
        date,
        source: 'manual',
      }]);
      Alert.alert('Saved', 'Transaction added!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const quickCategories = type === 'expense'
    ? ['Groceries', 'Transport', 'Bills & Utilities', 'Shopping', 'Eating Out', 'Health']
    : ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

  const isExpense = type === 'expense';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Type toggle */}
        <Text style={s.label}>Transaction Type</Text>
        <View style={s.typeRow}>
          {(['expense', 'income'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.typeBtn, type === t && (t === 'expense' ? s.typeBtnExpense : s.typeBtnIncome)]}
              onPress={() => setType(t)}
            >
              <Ionicons
                name={t === 'expense' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                size={18}
                color={type === t ? (t === 'expense' ? C.expense : C.income) : C.textMuted}
              />
              <Text style={[s.typeBtnText, type === t && { color: t === 'expense' ? C.expense : C.income, fontWeight: '700' }]}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount */}
        <Text style={s.label}>Amount</Text>
        <View style={[s.amountRow, {
          borderColor: isExpense ? C.expenseBorder : C.incomeBorder,
          backgroundColor: isExpense ? C.expenseBg : C.incomeBg,
        }]}>
          <Text style={[s.currency, { color: isExpense ? C.expense : C.income }]}>£</Text>
          <TextInput
            style={[s.amountInput, { color: isExpense ? C.expense : C.income }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={isExpense ? C.expenseBorder : C.incomeBorder}
          />
        </View>

        {/* Category */}
        <Text style={s.label}>Category</Text>
        <TextInput
          style={s.input}
          value={category}
          onChangeText={setCategory}
          placeholder="e.g., Groceries, Rent, Salary"
          placeholderTextColor={C.textMuted}
        />
        <View style={s.quickRow}>
          {quickCategories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.quickPill, category === cat && s.quickPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[s.quickPillText, category === cat && s.quickPillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <Text style={s.label}>Date</Text>
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={18} color={C.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={s.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: isExpense ? C.expense : C.income }]}
          onPress={handleSubmit}
        >
          <Ionicons name={isExpense ? 'arrow-up-circle' : 'arrow-down-circle'} size={20} color="#fff" />
          <Text style={s.submitBtnText}>Add {isExpense ? 'Expense' : 'Income'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, padding: 20 },
  label: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 22 },

  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  typeBtnExpense: { backgroundColor: C.expenseBg, borderColor: C.expenseBorder },
  typeBtnIncome: { backgroundColor: C.incomeBg, borderColor: C.incomeBorder },
  typeBtnText: { fontSize: 15, fontWeight: '500', color: C.textMuted },

  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18 },
  currency: { fontSize: 24, fontWeight: '700', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '700', paddingVertical: 16 },

  input: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textPrimary },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  quickPillActive: { backgroundColor: C.brand, borderColor: C.brand },
  quickPillText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  quickPillTextActive: { color: '#fff', fontWeight: '600' },

  dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16 },
  dateInput: { flex: 1, fontSize: 15, color: C.textPrimary, paddingVertical: 14 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: 16, marginTop: 36 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: C.textMuted, fontSize: 15, fontWeight: '500' },
});
