import { CategoryMemory } from './storage';

export const CATEGORIES = [
  'Groceries',
  'Eating Out',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Health',
  'Personal Care',
  'Education',
  'Subscriptions',
  'Transfers',
  'Income',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface TransactionInput {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface CategorizationResult {
  id: string;
  category: string;
  confidence: 'high' | 'low';
  fromMemory: boolean;
}

export function normalizeKey(description: string): string {
  return description.toLowerCase().trim();
}

async function claudeFetch(body: object): Promise<any> {
  const proxyUrl = process.env.EXPO_PUBLIC_API_URL;
  const secret = process.env.EXPO_PUBLIC_API_SECRET;

  let response: Response;

  if (proxyUrl) {
    response = await fetch(`${proxyUrl}/api/claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-api-secret': secret } : {}),
      },
      body: JSON.stringify(body),
    });
  } else {
    const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No API key or proxy URL configured');
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API ${response.status}: ${err}`);
  }
  return response.json();
}

async function callClaude(transactions: TransactionInput[], memory: CategoryMemory): Promise<CategorizationResult[]> {
  const memoryText = Object.entries(memory)
    .slice(0, 60)
    .map(([desc, cat]) => `"${desc}" → ${cat}`)
    .join('\n') || 'None yet';

  const txText = transactions
    .map((t) => `${t.id}|${t.description}|£${t.amount.toFixed(2)}|${t.type}`)
    .join('\n');

  const prompt = `You are categorizing UK bank transactions. Use ONLY these categories:
${CATEGORIES.join(', ')}

Previously learned mappings (use these as strong hints):
${memoryText}

For each transaction, assign a category and confidence:
- "high" = you're confident (known merchant, clear pattern, or matches memory)
- "low" = you're guessing (person name, unclear description, first time seen)

Return ONLY a JSON array, nothing else:
[{"id":"...","category":"...","confidence":"high"}]

Transactions (id|description|amount|type):
${txText}`;

  const data = await claudeFetch({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text: string = data.content[0].text;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');

  const parsed: { id: string; category: string; confidence: 'high' | 'low' }[] = JSON.parse(match[0]);
  return parsed.map((r) => ({ ...r, fromMemory: false }));
}

export async function categorize(
  transactions: TransactionInput[],
  memory: CategoryMemory
): Promise<CategorizationResult[]> {
  const results: CategorizationResult[] = [];
  const needsAI: TransactionInput[] = [];

  for (const t of transactions) {
    const key = normalizeKey(t.description);
    if (memory[key]) {
      results.push({ id: t.id, category: memory[key], confidence: 'high', fromMemory: true });
    } else {
      needsAI.push(t);
    }
  }

  if (needsAI.length === 0) return results;

  const BATCH = 80;
  for (let i = 0; i < needsAI.length; i += BATCH) {
    const batch = needsAI.slice(i, i + BATCH);
    const aiResults = await callClaude(batch, memory);
    results.push(...aiResults);
  }

  return results;
}

export interface AgentAction {
  action: 'bulk_rename' | 'none';
  filter?: { description?: string; category?: string; all?: boolean };
  newCategory?: string;
  message: string;
}

export async function runAgentCommand(
  command: string,
  transactions: TransactionInput[]
): Promise<AgentAction> {
  const txLines = transactions
    .slice(0, 120)
    .map((t) => `${t.id}|${t.description}|${(t as any).category ?? '?'}|£${t.amount.toFixed(2)}|${t.type}`)
    .join('\n');

  const data = await claudeFetch({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `You manage personal finance transactions. The user has these transactions (id|description|category|amount|type):\n${txLines}\n\nUser command: "${command}"\n\nRespond ONLY with a JSON object — no other text.\n\nSupported actions:\n1. Bulk rename matching transactions:\n{"action":"bulk_rename","filter":{"description":"substring"},"newCategory":"Name","message":"..."}\n   OR filter by category: {"action":"bulk_rename","filter":{"category":"OldName"},"newCategory":"Name","message":"..."}\n   OR all transactions: {"action":"bulk_rename","filter":{"all":true},"newCategory":"Name","message":"..."}\n2. Cannot understand: {"action":"none","message":"hint for user"}\n\nRules:\n- filter.description is a lowercase substring matched case-insensitively against descriptions\n- "rename all of these to X" means all:true\n- message describes what will happen or explains the problem`,
    }],
  });

  const text: string = data.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { action: 'none', message: "Couldn't understand that. Try: 'rename all McDonald's to Eating Out'" };
  try {
    return JSON.parse(match[0]) as AgentAction;
  } catch {
    return { action: 'none', message: "Couldn't understand that. Try: 'rename all McDonald's to Eating Out'" };
  }
}

export async function generateInsights(
  spendingByCategory: Record<string, number>,
  monthlyTotals: Record<string, number>
): Promise<string> {
  const categoryText = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: £${amt.toFixed(2)}`)
    .join('\n');

  const monthlyText = Object.entries(monthlyTotals)
    .map(([month, amt]) => `${month}: £${amt.toFixed(2)}`)
    .join('\n');

  const data = await claudeFetch({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Analyse this person's UK spending and give 3-4 specific, actionable insights. Be friendly and concise. Under 160 words.\n\nSpending by category:\n${categoryText}\n\nMonthly totals:\n${monthlyText}`,
    }],
  });

  return data.content[0].text;
}
