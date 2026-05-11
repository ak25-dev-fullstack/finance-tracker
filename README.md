# DWK Banking — Finance Tracker

A personal finance app built with Expo SDK 54 and React Native, featuring AI-powered transaction categorisation using Claude Haiku.

---

## Project Structure

```
finance-tracker/
├── app/
│   ├── _layout.tsx           # Root layout: auth guard + role-based routing
│   ├── login.tsx             # Login screen (mock auth)
│   ├── add-transaction.tsx   # Modal: manually add a transaction
│   ├── connect-bank.tsx      # Modal: add/manage connected bank accounts
│   └── (tabs)/
│       ├── _layout.tsx       # Tab bar configuration
│       ├── index.tsx         # Home dashboard
│       ├── import.tsx        # Monzo CSV import + AI categorisation
│       └── insights.tsx      # Spending charts + AI insights
│
├── services/
│   ├── categorizer.ts        # Claude API calls: categorize(), generateInsights(), runAgentCommand()
│   └── storage.ts            # AsyncStorage CRUD: transactions, import batches, CategoryMemory
│
├── context/
│   └── auth.tsx              # AuthContext: mock login, role, logout, persisted session
│
├── constants/
│   └── theme.ts              # Dark fintech colour palette (C.*), category colour map
│
├── api/
│   └── claude.js             # Vercel serverless proxy — forwards requests to Anthropic API
│
├── proxy.js                  # Local dev proxy (same purpose, plain Node HTTP server)
├── vercel.json               # Vercel deployment config
└── .env                      # API keys (not committed — see setup below)
```

---

## Getting Started

### Prerequisites

- Node 18+
- Expo CLI (`npm install -g expo-cli`)
- An Anthropic API key

### Environment setup

Create a `.env` file in the project root:

```
# Direct mode (mobile/dev): key is embedded in the app bundle
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...

# Proxy mode (web or when you don't want the key in the bundle)
EXPO_PUBLIC_API_URL=http://localhost:3000   # local proxy
EXPO_PUBLIC_API_SECRET=                    # optional shared secret

# For the Vercel serverless proxy (server-side only, not EXPO_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...
API_SECRET=                                # optional, locks /api/claude to trusted callers
```

`categorizer.ts` checks for `EXPO_PUBLIC_API_URL` first. If set, requests go through the proxy. If not, it falls back to calling the Anthropic API directly with `EXPO_PUBLIC_ANTHROPIC_API_KEY`.

### Running locally

```bash
npm install

# Start the Expo dev server
npm start          # opens Expo Go QR code
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # browser (needs proxy for CORS)

# If running on web, start the local proxy in a second terminal:
npm run proxy      # starts proxy.js on http://localhost:3000
```

---

## Demo Login

Authentication is mocked in `context/auth.tsx` — no backend required. Use username `customer` / password `customer123` to sign in.

To reset all stored data: tap the avatar icon on the Home screen → **Clear all data**.

---

## Features

### Home (`index.tsx`)

- Balance card (income minus expenses), income/expense summary cards
- Quick actions: Add transaction, Import CSV, Insights, AI Chat
- Connected accounts list (mock bank data from `connect-bank.tsx`)
- 5 most recent transactions with tap-to-edit (category picker + custom category + delete)
- **Fin AI modal** — natural language command bar powered by `runAgentCommand()`. Example: *"rename all McDonald's to Eating Out"*

### CSV Import (`import.tsx`)

Multi-step flow for importing Monzo transaction exports:

1. **Pick file** — `expo-document-picker` selects a `.csv` file
2. **Parse** — `parseMonzoCSV()` reads columns by name (date, description/name, amount), handles `DD/MM/YYYY` and `YYYY-MM-DD` formats
3. **Duplicate check** — before calling the AI, checks whether the uploaded file's months overlap with already-imported Monzo data; warns the user with an exact duplicate count
4. **AI categorisation** — sends transactions in batches of 80 to `categorize()`. Transactions already in CategoryMemory are resolved locally and never sent to the API
5. **Review** — list of results with low-confidence items flagged. User can change any category before saving
6. **Save** — confirmed transactions are appended (deduplication by content key `date|description|amount`) and CategoryMemory is updated with the user's confirmed choices
7. **Batch management** — each import is logged with filename, date, and count. Batches can be removed (soft-deletes the transactions, keeps the batch entry marked `removedAt`)

### Insights (`insights.tsx`)

- Pie chart: spending by category (SVG via `react-native-svg`)
- Bar chart: monthly spending totals
- **AI Insights** button — calls `generateInsights()` with the category/monthly breakdown and returns 3-4 actionable observations from Claude Haiku (under 160 words)

---

## Feature Decisions

**CategoryMemory over pure AI.** Every time a user confirms a category on import, the normalised merchant name (lowercase, trimmed) is stored in `CategoryMemory`. On the next import, matching descriptions are resolved instantly without an API call. This makes repeat imports near-instant and cheaper; Claude is only called for genuinely new merchants.

**Batch size of 80.** The Monzo CSV prompt fits comfortably within Haiku's context window at this size. Larger batches risk truncation; smaller batches increase round-trips. The categoriser loops automatically for files with more than 80 new transactions.

**Direct fetch instead of the Anthropic SDK.** React Native's bundler doesn't support all Node built-ins the SDK relies on. A plain `fetch()` wrapper (`claudeFetch`) keeps the dependency surface minimal and works on both native and web targets.

**Soft-delete for import batches.** Removing a batch sets `removedAt` on the batch record rather than deleting it. This preserves the audit trail of what was imported and when, while still removing the associated transactions from the active list.

**Mock auth with session persistence.** The logged-in user is serialised to AsyncStorage so the app relaunches without re-authenticating. No real auth backend is required.

**Two proxy options.** `proxy.js` is for local web development (avoids CORS). `api/claude.js` is a Vercel serverless function for deployed builds — it keeps the API key server-side and optionally validates a shared secret (`API_SECRET`) to lock down the endpoint.

---

## Design System

The app uses a dark fintech theme defined in `constants/theme.ts`, originally specified as a Stitch design system.

### Colour palette

| Token             | Hex       | Usage                                    |
|-------------------|-----------|------------------------------------------|
| `C.bg`            | `#0F172A` | Screen backgrounds                       |
| `C.card`          | `#1E293B` | Cards, modals, elevated surfaces         |
| `C.brand`         | `#0d9488` | Primary actions, balance card fill       |
| `C.brandLight`    | `#6bd8cb` | Links, active icons, tab indicator       |
| `C.income`        | `#22C55E` | Positive amounts, income badges          |
| `C.expense`       | `#EF4444` | Negative amounts, expense badges         |
| `C.textPrimary`   | `#F8FAFC` | Headlines and primary labels             |
| `C.textSecondary` | `#94A3B8` | Supporting text                          |
| `C.textMuted`     | `#64748B` | Placeholders, timestamps                 |
| `C.warning`       | `#F59E0B` | Low-confidence categorisation flags      |

Category chips use a fixed colour map (`CATEGORY_COLORS`) with a deterministic hash fallback (`djb2`) for user-defined categories.

### Typography

- **Headlines**: Inter, SemiBold (600), 20–28 px
- **Body**: Inter, Regular (400), 14–16 px
- **Monetary figures**: JetBrains Mono, Medium (500) — keeps decimal points column-aligned in transaction lists

### Stitch design source

The screen layout was prototyped in Stitch before being implemented in code (dark fintech, teal primary `#0d9488`, Inter + JetBrains Mono):

- Customer Dashboard — `projects/11622395102439996580`

---

## AI Integration

All AI calls go through `services/categorizer.ts` using the `claude-haiku-4-5-20251001` model.

| Function              | Called from                   | What it does                                                                  |
|-----------------------|-------------------------------|-------------------------------------------------------------------------------|
| `categorize()`        | Import tab                    | Assigns one of 13 fixed categories + high/low confidence to each transaction  |
| `generateInsights()`  | Insights tab                  | Returns 3-4 plain-English spending observations (≤160 words)                  |
| `runAgentCommand()`   | Home AI modal                 | Parses a natural-language command into a structured `bulk_rename` action       |

`categorize()` injects up to 60 previously learned mappings from CategoryMemory into the prompt so the model can reuse confirmed choices as "strong hints." Transactions already in memory skip the API entirely.

`runAgentCommand()` returns a JSON action object (`bulk_rename` with a filter, or `none` with a hint message). The UI applies the action locally — no writes happen inside the service layer.
