# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Expo dev server (scan QR with Expo Go)
npm run web        # Web target via Expo
npm run proxy      # Local CORS proxy for web dev (reads .env automatically)
npm run android    # Run on Android emulator/device
npm run ios        # Run on iOS simulator/device
npm run lint       # ESLint with Expo config
```

For web development, run `npm run proxy` alongside `npm run web` so Claude API calls route through the local proxy rather than exposing the API key client-side.

## Architecture

**Framework:** Expo SDK 54 / React Native 0.81.5 with React 19. Targets iOS, Android, and web. New Architecture enabled.

**Routing:** Expo Router (file-based). The root layout (`app/_layout.tsx`) guards all routes — unauthenticated users are redirected to `/login`. Authenticated users land in `app/(tabs)/` which renders the 5-tab shell (Home, Save, Invest, Credit, Adviser). Modal screens live at the root of `app/` (e.g., `add-transaction`, `import`, `insights`).

**State:** Context API + AsyncStorage only. `context/auth.tsx` holds the session (persisted to AsyncStorage on login). Screen-level state uses `useState`/`useCallback`/`useFocusEffect`. No Redux or external state library.

**AI:** Three capabilities in `services/categorizer.ts`:
- `categorize()` — batch-categorizes up to 80 transactions per Claude API call; uses `CategoryMemory` (merchant→category cache in AsyncStorage under `category_memory`) to skip known merchants
- `generateInsights()` — produces natural-language spending analysis
- `runAgentCommand()` — parses free-text user commands (e.g., "rename all Tesco to Groceries")

Model: `claude-haiku-4-5`. API routing: if `EXPO_PUBLIC_API_URL` is set, calls go through the proxy/Vercel function (`api/claude.js`); otherwise direct to Anthropic with `EXPO_PUBLIC_ANTHROPIC_API_KEY`.

**Storage keys (AsyncStorage):**
- `transactions_v2` — all transactions
- `import_batches` — CSV import metadata (soft-deleted with `removedAt`)
- `category_memory` — learned merchant→category mappings
- `category_colors_v1` — custom category color overrides
- `connected_banks` — mock bank account data

**Transaction schema:**
```typescript
{
  id: string;
  date: string;           // YYYY-MM-DD
  amount: number;
  category: string;
  description: string;
  type: 'income' | 'expense';
  source: 'manual' | 'monzo';
  importId?: string;      // links to ImportBatch.id
}
```

## Key Files

| Path | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout; auth guard |
| `app/(tabs)/_layout.tsx` | Bottom tab navigator (5 tabs) |
| `services/categorizer.ts` | All Claude API calls + CategoryMemory |
| `services/storage.ts` | AsyncStorage CRUD for all entities |
| `context/auth.tsx` | Auth state; mock credentials `customer` / `customer123` |
| `constants/theme.ts` | Color palette, category colors, typography sizes |
| `api/claude.js` | Vercel serverless proxy (production) |
| `proxy.js` | Local dev proxy (CORS bypass) |

## Environment Variables

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=   # Direct key (embedded in app bundle — dev/mobile only)
EXPO_PUBLIC_API_URL=             # Proxy base URL (e.g. http://localhost:3000 or Vercel URL)
EXPO_PUBLIC_API_SECRET=          # Optional shared secret sent with proxied requests
ANTHROPIC_API_KEY=               # Server-side key for Vercel function
API_SECRET=                      # Server-side validation secret for Vercel function
```

## Design System

Dark fintech palette defined in `constants/theme.ts`:
- Background `#0F172A`, Card `#1E293B`, Brand teal `#0d9488`, Active `#6bd8cb`
- Income `#22C55E`, Expense `#EF4444`, Text `#F8FAFC` / `#94A3B8` / `#64748B`

13 fixed categories each have a deterministic color. Custom categories fall back to a `djb2` hash. Use `getCategoryColor(category)` from `constants/theme.ts` — never hardcode category colors.

Typography: Inter for UI text, JetBrains Mono for monetary values.

## Adding New Screens

Create a file in `app/` or `app/(tabs)/`. Expo Router picks it up automatically. Use typed routes (`href` as `Href<...>`) — `typedRoutes` experiment is enabled in `app.json`.

## TypeScript

Path alias `@/*` resolves to the repo root. Strict mode is on. Prefer `@/services/storage` style imports over relative paths.
