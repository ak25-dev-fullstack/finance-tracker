import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  source: 'manual' | 'monzo';
  importId?: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  date: string;
  count: number;
  removedAt?: string;
}

export type CategoryMemory = Record<string, string>;

const TRANSACTIONS_KEY = 'transactions_v2';
const MEMORY_KEY = 'category_memory';
const BATCHES_KEY = 'import_batches';

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

function txContentKey(t: { date: string; description: string; amount: number }): string {
  return `${t.date}|${t.description.toLowerCase().trim()}|${t.amount.toFixed(2)}`;
}

export async function appendTransactions(incoming: Transaction[]): Promise<number> {
  const existing = await loadTransactions();
  const existingIds = new Set(existing.map((t) => t.id));
  const existingKeys = new Set(existing.map(txContentKey));
  const toAdd = incoming.filter((t) => !existingIds.has(t.id) && !existingKeys.has(txContentKey(t)));
  await saveTransactions([...existing, ...toAdd]);
  return toAdd.length;
}

export interface DuplicateWarning {
  overlappingMonths: string[];
  duplicateCount: number;
}

export async function checkForDuplicates(
  rows: { date: string; description: string; amount: number }[]
): Promise<DuplicateWarning> {
  const existing = await loadTransactions();

  const parsedMonths = [...new Set(rows.map((r) => r.date.slice(0, 7)))];
  const existingMonzoMonths = new Set(
    existing.filter((t) => t.source === 'monzo').map((t) => t.date.slice(0, 7))
  );
  const overlappingMonths = parsedMonths.filter((m) => existingMonzoMonths.has(m));

  const existingKeys = new Set(existing.map(txContentKey));
  const duplicateCount = rows.filter((r) => existingKeys.has(txContentKey(r))).length;

  return { overlappingMonths, duplicateCount };
}

export async function updateTransactionCategory(id: string, category: string): Promise<void> {
  const transactions = await loadTransactions();
  await saveTransactions(transactions.map((t) => (t.id === id ? { ...t, category } : t)));
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await loadTransactions();
  await saveTransactions(transactions.filter((t) => t.id !== id));
}

export async function loadImportBatches(): Promise<ImportBatch[]> {
  try {
    const data = await AsyncStorage.getItem(BATCHES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveImportBatch(batch: ImportBatch): Promise<void> {
  const batches = await loadImportBatches();
  await AsyncStorage.setItem(BATCHES_KEY, JSON.stringify([batch, ...batches]));
}

export async function deleteImportBatch(importId: string): Promise<void> {
  const [transactions, batches] = await Promise.all([loadTransactions(), loadImportBatches()]);
  await Promise.all([
    saveTransactions(transactions.filter((t) => t.importId !== importId)),
    AsyncStorage.setItem(
      BATCHES_KEY,
      JSON.stringify(batches.map((b) => b.id === importId ? { ...b, removedAt: new Date().toISOString() } : b))
    ),
  ]);
}

export async function loadCategoryMemory(): Promise<CategoryMemory> {
  try {
    const data = await AsyncStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function updateCategoryMemory(updates: CategoryMemory): Promise<void> {
  const existing = await loadCategoryMemory();
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify({ ...existing, ...updates }));
}

export async function renameCategory(oldName: string, newName: string): Promise<void> {
  const [transactions, memory] = await Promise.all([loadTransactions(), loadCategoryMemory()]);
  await saveTransactions(transactions.map((t) => t.category === oldName ? { ...t, category: newName } : t));
  const updatedMemory: CategoryMemory = {};
  for (const [k, v] of Object.entries(memory)) updatedMemory[k] = v === oldName ? newName : v;
  await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(updatedMemory));
}

export async function bulkUpdateCategory(ids: string[], category: string): Promise<void> {
  const transactions = await loadTransactions();
  await saveTransactions(transactions.map((t) => ids.includes(t.id) ? { ...t, category } : t));
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([TRANSACTIONS_KEY, MEMORY_KEY, BATCHES_KEY]);
}
