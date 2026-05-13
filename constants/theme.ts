export const Colors = {
  light: { text: '#F8FAFC', background: '#0F172A', tint: '#00b4d8', icon: '#94A3B8', tabIconDefault: '#64748B', tabIconSelected: '#00b4d8' },
  dark: { text: '#F8FAFC', background: '#0F172A', tint: '#00b4d8', icon: '#94A3B8', tabIconDefault: '#64748B', tabIconSelected: '#00b4d8' },
};

export const C = {
  bg: '#0F172A',
  card: '#1E293B',
  cardHigh: '#263446',
  border: '#334155',
  borderLight: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  brand: '#00b4d8',
  brandLight: '#48cae4',
  brandBg: 'rgba(0,180,216,0.15)',
  brandBorder: 'rgba(0,180,216,0.3)',
  income: '#22C55E',
  incomeBg: 'rgba(34,197,94,0.12)',
  incomeBorder: 'rgba(34,197,94,0.3)',
  incomeText: '#4ADE80',
  expense: '#F8FAFC',
  expenseBg: 'rgba(248,250,252,0.08)',
  expenseBorder: 'rgba(248,250,252,0.2)',
  expenseText: '#F8FAFC',
  balance: '#00b4d8',
  balanceBg: 'rgba(0,180,216,0.12)',
  balanceBorder: 'rgba(0,180,216,0.3)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.12)',
  warningBorder: 'rgba(245,158,11,0.3)',
  destructive: '#EF4444',
  destructiveLight: 'rgba(239,68,68,0.12)',
};

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries:           '#FF7043',
  'Eating Out':        '#EF5350',
  Transport:           '#42A5F5',
  Shopping:            '#AB47BC',
  Entertainment:       '#FFCA28',
  'Bills & Utilities': '#26C6DA',
  Health:              '#66BB6A',
  'Personal Care':     '#EC407A',
  Education:           '#5C6BC0',
  Subscriptions:       '#7E57C2',
  Transfers:           '#78909C',
  Income:              '#26A69A',
  Other:               '#607D8B',
};

const FALLBACK_PALETTE = [
  '#F44336','#E91E63','#9C27B0','#673AB7','#3F51B5',
  '#2196F3','#03A9F4','#00BCD4','#009688','#4CAF50',
  '#8BC34A','#CDDC39','#FFC107','#FF9800','#FF5722',
  '#795548','#9E9E9E','#607D8B','#E64A19','#1565C0',
];

function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}

export function getCategoryColor(category: string, custom: Record<string, string> = {}): string {
  return custom[category] ?? CATEGORY_COLORS[category] ?? FALLBACK_PALETTE[djb2(category) % FALLBACK_PALETTE.length];
}

export const COLOR_PALETTE = [
  '#FF7043','#EF5350','#EC407A','#AB47BC',
  '#7E57C2','#5C6BC0','#42A5F5','#26C6DA',
  '#26A69A','#66BB6A','#CDDC39','#FFCA28',
  '#FFA726','#FF5722','#8D6E63','#78909C',
  '#F06292','#80CBC4','#CE93D8','#90CAF9',
];
