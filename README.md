# Ethereum Airdrop Dashboard

Production-ready Next.js dashboard for Ethereum airdrop contract management.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (utility-first styling)
- **TanStack Table** (table with sorting, pagination, row selection)
- **Zod** (runtime schema validation)
- **next-intl** (i18n with en/zh/vi)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Architecture Decisions

### SSR vs CSR Split

| Component | Rendering | Why |
|---|---|---|
| `layout.tsx` | Server | Static shell, i18n provider |
| `page.tsx` | Server | Fetches initial data for fast first paint |
| `DashboardHeader` | Server | Static data, no interactivity needed |
| `DashboardShell` | Client | Manages selection state, orchestrates interactive children |
| `ContractsTable` | Client | TanStack Table requires client-side JS for sorting/pagination/selection |
| `ContractDetailPanel` | Client | Updates reactively when a row is selected |
| `MetricsChart` | Client | Fetches chart data and renders interactive bars |

### Folder Structure

```
src/
  app/                    # Next.js App Router pages, layout, loading, error
    api/                  # Route handlers (mock endpoints)
      contracts/route.ts
      metrics/route.ts
      dashboard/route.ts
  actions/                # Server Actions
    contracts.ts
  components/ui/          # Shared UI primitives (Skeleton, ErrorDisplay, LocaleSwitcher)
  features/
    dashboard/components/ # Dashboard-specific components (header, shell)
    contracts/components/ # Contract table, detail panel, status badge, skeletons
    metrics/components/   # Metrics chart and skeleton
  lib/
    api/                  # API client, typed fetch functions
      client.ts           # Central API client with proxy support
      contracts.ts        # Contract API functions
      metrics.ts          # Metrics API functions
      dashboard.ts        # Dashboard summary API function
    hooks/                # Custom React hooks
      use-contracts.ts    # Contract data fetching hook
      use-metrics.ts      # Metrics data fetching hook
    i18n/                 # Internationalization
      config.ts           # Locale config (en, zh, vi)
      request.ts          # next-intl server config
      messages/           # Translation JSON files
    schemas/              # Zod validation schemas
  mocks/                  # Mock data generators
  types/                  # TypeScript type definitions
```

## Backend Integration Checklist

### Step 1: Environment Variables
Set in `.env.local`:
```
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
BACKEND_API_URL=https://your-api.example.com
```

### Step 2: Replace Mock Endpoints

| File | What to change |
|---|---|
| `src/app/api/contracts/route.ts` | Replace `generateMockContractsResponse()` with real backend call |
| `src/app/api/metrics/route.ts` | Replace `generateMockMetricsResponse()` with real backend call |
| `src/app/api/dashboard/route.ts` | Replace `generateMockDashboardSummary()` with real backend call |
| `src/app/page.tsx` | Replace `generateMock*()` with `fetch*()` from `lib/api/` |
| `src/actions/contracts.ts` | Replace mock detail lookup with real session/DB call |

### Step 3: Proxy Configuration
The `next.config.js` already has rewrite rules:
- `/api/proxy/*` routes to `BACKEND_API_URL/api/*`
- The `apiClient` in `lib/api/client.ts` uses this automatically when `NEXT_PUBLIC_USE_MOCKS=false`

### Step 4: Verify
1. Start with one endpoint (e.g., `/api/dashboard`)
2. Set `NEXT_PUBLIC_USE_MOCKS=false`
3. Confirm the Zod schemas match your real API response shapes
4. Adjust schemas if needed, then move to the next endpoint

## i18n

Three languages supported: English (`en`), Chinese (`zh`), Vietnamese (`vi`).

Translation files are in `src/lib/i18n/messages/`. All UI text uses translation keys via `useTranslations()`.

To switch locale at runtime, the `LocaleSwitcher` component is in the header. In production, implement cookie-based locale persistence.

## API Contract

### GET /api/contracts
Query: `page`, `pageSize`, `sortBy`, `sortOrder`
Response: `{ data: Contract[], totals: ContractTotals, pagination: PaginationMeta }`

### GET /api/metrics
Query: `from`, `to`, `page`, `pageSize`
Response: `{ data: MetricsBucket[], pagination: PaginationMeta }`

### GET /api/dashboard
Response: `{ ethPrice, ethPriceChange, gasPrice, totalAirdropAmount }`

## Error Handling

- `global-error.tsx` - catches root-level errors
- `error.tsx` - route-level error boundary with retry
- `ErrorDisplay` component - reusable error UI with retry button
- `ApiClientError` class - normalized API errors with code/status/message
- Request timeout handling in the API client (default 10s)
