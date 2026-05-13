import { Alert, Platform } from 'react-native';
import { Transaction } from './storage';

// ─── helpers ──────────────────────────────────────────────────────────────────

function csv(v: string | number): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function longDate(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrint(html: string) {
  const win = window.open('', '_blank');
  if (!win) { alert('Allow pop-ups to export PDF.'); return; }
  win.document.write(html);
  win.document.close();
}

const BASE_CSS = `
  body { font-family: -apple-system, system-ui, Arial, sans-serif; color: #1e293b; margin: 0; padding: 32px; font-size: 13px; }
  h1 { margin: 0 0 2px; font-size: 20px; color: #0d9488; }
  .sub { font-size: 11px; color: #64748b; }
  .divider { border: none; border-top: 2px solid #0d9488; margin: 16px 0; }
  .summary { display: flex; gap: 12px; margin-bottom: 24px; }
  .stat { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; }
  .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .green { color: #22c55e; }
  .red   { color: #ef4444; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 20px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 28px; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 12px; } }
`;

// ─── Transaction history ───────────────────────────────────────────────────────

function buildTxCsv(transactions: Transaction[]): string {
  const header = ['Date', 'Description', 'Category', 'Amount (£)', 'Type', 'Source', 'Items'].map(csv).join(',');
  const rows = transactions.map((t) =>
    [
      t.date,
      t.description,
      t.category,
      t.amount.toFixed(2),
      t.type,
      t.source,
      t.items?.map((i) => i.name).join('; ') ?? '',
    ].map(csv).join(',')
  );
  return [header, ...rows].join('\n');
}

export function exportTransactionsCsv(transactions: Transaction[]) {
  if (Platform.OS !== 'web') {
    Alert.alert('Web only', 'Open the web app to export files.');
    return;
  }
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  downloadBlob(buildTxCsv(sorted), `transactions-${today()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportTransactionsPdf(transactions: Transaction[]) {
  if (Platform.OS !== 'web') {
    Alert.alert('Web only', 'Open the web app to export files.');
    return;
  }
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
  const income  = sorted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = sorted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  const rows = sorted.map((t) => `
    <tr>
      <td>${t.date}</td>
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td class="${t.type === 'income' ? 'green' : 'red'}">${t.type === 'income' ? '+' : '−'}£${t.amount.toFixed(2)}</td>
      <td style="color:#64748b;font-size:11px">${t.items?.map((i) => i.name).join(', ') || '—'}</td>
    </tr>`).join('');

  openPrint(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <title>Transaction History — DWK Finance</title>
    <style>${BASE_CSS}</style></head><body>
    <h1>DWK Finance</h1>
    <div class="sub">Transaction History &nbsp;·&nbsp; Generated ${longDate()}</div>
    <hr class="divider">
    <div class="summary">
      <div class="stat"><div class="stat-label">Income</div><div class="stat-value green">+£${income.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Expenses</div><div class="stat-value red">£${expense.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Net</div><div class="stat-value ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}£${net.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Transactions</div><div class="stat-value">${sorted.length}</div></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Items</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">DWK Finance &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; ${new Date().toISOString()}</div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
}

// ─── Insights report ──────────────────────────────────────────────────────────

export function exportInsightsCsv(
  byCategory: Record<string, number>,
  filteredTransactions: Transaction[],
  filterLabel: string,
) {
  if (Platform.OS !== 'web') {
    Alert.alert('Web only', 'Open the web app to export files.');
    return;
  }
  const lines = [
    `DWK Finance — Spending Report — ${filterLabel} — Generated ${today()}`,
    '',
    'SPENDING BY CATEGORY',
    ['Category', 'Amount (£)'].map(csv).join(','),
    ...Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => [cat, amt.toFixed(2)].map(csv).join(',')),
    '',
    'TRANSACTIONS',
    buildTxCsv([...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date))),
  ];
  downloadBlob(lines.join('\n'), `report-${today()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportInsightsPdf(
  byCategory: Record<string, number>,
  monthlyData: { label: string; value: number }[],
  filteredTransactions: Transaction[],
  filterLabel: string,
  aiInsights: string,
) {
  if (Platform.OS !== 'web') {
    Alert.alert('Web only', 'Open the web app to export files.');
    return;
  }
  const totalExpense = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const totalIncome  = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const catRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `
      <tr>
        <td>${cat}</td>
        <td>£${amt.toFixed(2)}</td>
        <td>${totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0}%</td>
      </tr>`).join('');

  const monthRows = monthlyData.map((d) => `
    <tr><td>${d.label}</td><td>£${d.value.toFixed(2)}</td></tr>`).join('');

  const insightsBlock = aiInsights
    ? `<h2>AI Insights</h2><p style="line-height:1.7;color:#334155">${aiInsights.replace(/\n/g, '<br>')}</p>`
    : '';

  openPrint(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
    <title>Spending Report — DWK Finance</title>
    <style>${BASE_CSS}</style></head><body>
    <h1>DWK Finance</h1>
    <div class="sub">Spending Report &nbsp;·&nbsp; ${filterLabel} &nbsp;·&nbsp; Generated ${longDate()}</div>
    <hr class="divider">
    <div class="summary">
      <div class="stat"><div class="stat-label">Total Expenses</div><div class="stat-value red">£${totalExpense.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Total Income</div><div class="stat-value green">+£${totalIncome.toFixed(2)}</div></div>
      <div class="stat"><div class="stat-label">Net</div><div class="stat-value ${net >= 0 ? 'green' : 'red'}">${net >= 0 ? '+' : ''}£${net.toFixed(2)}</div></div>
    </div>
    <h2>Spending by Category</h2>
    <table>
      <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>
    ${monthlyData.length > 0 ? `
    <h2>Monthly Breakdown</h2>
    <table>
      <thead><tr><th>Month</th><th>Expenses</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table>` : ''}
    ${insightsBlock}
    <div class="footer">DWK Finance &nbsp;·&nbsp; Confidential &nbsp;·&nbsp; ${new Date().toISOString()}</div>
    <script>window.onload=()=>window.print();</script>
    </body></html>`);
}
