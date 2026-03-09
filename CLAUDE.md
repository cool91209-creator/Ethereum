# CLAUDE.md - Project Guidelines

## Project Overview
Ethereum Airdrop Dashboard — a Next.js 14 frontend with an Express backend that monitors ERC-20 token transfers via the Etherscan API.

## Architecture
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + next-intl (i18n: en/zh/vi)
- **Backend**: Express + TypeScript (in `server/` directory, same git repo)
- **API Proxy**: Next.js rewrites `/api/proxy/:path*` → `http://localhost:4000/api/:path*`

## Key Directories
- `src/features/contracts/` — Contract table, config modal, status badge
- `src/features/metrics/` — Bar chart component
- `src/features/dashboard/` — Dashboard shell & header
- `src/lib/api/` — API client (get, post, patch, delete)
- `src/lib/hooks/` — React hooks (use-contracts, use-metrics)
- `server/src/services/` — Backend services (contractsService, etherscanService, priceService)
- `server/src/controllers/` — Express route handlers

## Important Conventions
- **Gas Limit**: Always hardcoded to `0.03` gwei — do NOT use live gas oracle for this field
- **Token Fee**: `todayAmount × tokenPriceUsd` (token value in USD)
- **Gas Cost**: `sum(gasUsed × gasPrice / 10^18) × ETH_price` (real Etherscan data)
- **Direction filter**: Only count OUTGOING transfers (from === wallet/WATCH_ADDRESS)
- **Day boundaries**: GMT+7 midnight (not UTC)
- **WATCH_ADDRESS**: `0x28C6c06298d514Db089934071355E5743bf21d60` (Binance Hot Wallet)
- **Mode detection**: Sample 50 transfers; if >50% have `contractAddress === addr`, it's token mode; otherwise wallet mode

## Environment
- Frontend: `Ethereum/.env` (BACKEND_API_URL=http://localhost:4000, NEXT_PUBLIC_USE_MOCKS=false)
- Backend: `Ethereum/server/.env` (ETHERSCAN_API_KEY)
- Both servers bind to `0.0.0.0` for LAN access
- Frontend port: 3000, Backend port: 4000

## Git
- Branch: `hak`
- Remote: `origin` → `https://github.com/cool91209-creator/Ethereum.git`
- Commit and push after each major change

## API Endpoints
- `GET /api/contracts` — List contracts (paginated)
- `GET /api/contracts/:id` — Get contract detail
- `POST /api/contracts/config` — Add new contract (triggers Etherscan fetch)
- `PATCH /api/contracts/:id` — Inline edit (contractNumber, contractAddress, deliveryStrategy)
- `DELETE /api/contracts/:id` — Delete contract
- `POST /api/contracts/refresh` — Re-fetch all contracts from Etherscan
- `GET /api/metrics` — Chart data (one bar per contract)
- `GET /api/dashboard` — ETH price, gas price summary

## Auto-refresh
- Table and chart auto-refresh after config add, inline edit, or delete (200ms delay)
- Backend auto-refreshes all contracts every 5 minutes
- Events: `contracts:refresh` (config add), `contracts:updated` (inline edit/delete)
