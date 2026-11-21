<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend (`/frontend`)

Family Finance Management System UI. Project-wide context and backend rules are in the root `AGENTS.md`. This file applies to everything under `/frontend`.

## Tech Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Recharts (via shadcn chart), sonner, lucide-react, react-hook-form + zod (via shadcn Form). The backend is FastAPI on http://localhost:8000.

Check the installed Next.js version in `package.json` and use patterns that match it. Do not assume older Next.js conventions.

## Structure

```
src/app/(dashboard)/layout.tsx         shared shell: sidebar + header
src/app/(dashboard)/<route>/page.tsx   dashboard, income, expenses, budgets,
                                       bills, savings, reports, settings
src/app/page.tsx                       redirects to /dashboard
src/components/ui/                     shadcn generated components (do not hand-edit)
src/components/layout/                 app-sidebar, app-header, page-container
src/components/shared/                 page-header, status-badge, empty/loading/error
                                       states, amount (PKR display), month-picker
src/components/<feature>/              expenses/, income/, bills/, savings/, budgets/,
                                       reports/, settings/, dashboard/
src/lib/api.ts                         the only place that calls fetch
src/lib/formatters.ts                  currency (Rs. 25,000.00) and date formatting
src/hooks/                             data hooks (useExpenses, useAccounts, ...)
src/types/api.d.ts                     generated from FastAPI /openapi.json
```

Pages (8): Dashboard, Income, Expenses, Budgets, Bills, Savings Goals, Reports, Settings (tabs: Members, Accounts, Categories, Income Sources).

Build order: shell + api client, Expenses, Income, Bills, Savings, Budgets, Reports then Dashboard, Settings. One page per slice, from its spec in `frontend_spec/`.

## Approach

- Component-based: `page.tsx` only composes components and holds page state; UI lives in `components/<feature>/`; HTTP lives in `lib/api.ts`; data fetching lives in `hooks/`.
- shadcn/ui first. Use the shadcn skill/MCP to add components (Card, Table, Dialog, Form, Select, Calendar, Tabs, Badge, Progress, Skeleton, Sheet, Alert Dialog, Dropdown Menu). Never hand-build what shadcn provides.
- Small reusable components with one responsibility. Share table and dialog patterns by passing columns/fields, not by building one giant generic component.
- Look: modern finance dashboard. Light background, white cards, navy sidebar (#0F172A). Income green (#16A34A), expense red (#DC2626), warning amber (#D97706). Inter or Geist Sans, tabular numbers for amounts. Responsive: sidebar collapses to a Sheet on mobile.
- Every data view has loading (Skeleton), empty and error states. Every mutation shows a sonner toast.

## Rules

- All HTTP goes through `lib/api.ts`. No `fetch` inside components. API base URL comes from `NEXT_PUBLIC_API_URL`; no secrets in `NEXT_PUBLIC_` variables.
- Types come from `src/types/api.d.ts` (generated). Never invent field names or endpoints; read the backend routers or `/openapi.json`.
- No financial calculation in the browser. Never compute balances, totals, budget usage or warnings; display what the API returns. After a mutation, refetch.
- The frontend never talks to the database and contains no SQL.
- Show money as `Rs. 25,000.00` using `formatters.ts`. Amounts from the API are decimals; never use float math on them.
- Show backend validation errors (`detail`) to the user; client-side zod validation is for UX only, the database remains the authority.
- Auth and roles are not implemented in the backend. Do not build fake login or role-based hiding.
- Do not edit files in `components/ui/`; compose them.
- Do not add features or libraries that were not asked for. Plan briefly before coding.

## Commands (from `/frontend`)

- `npm install`
- `npm run dev` (http://localhost:3000)
- `npm run lint`
- `npm run build`
- `npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts` (run with the backend up; regenerate after any API change)
