# 05 — Savings

Read `00_frontend_overview.md` and `frontend_design_theme.md` first. Where this file and `00` disagree, `00` wins except where this file explicitly overrides for slice 05. Slices 03 (`03_income.md`) and 04 (`04_bills.md`) are the reference implementations: copy their structure, hooks, dialog conventions (`bill-form-dialog.tsx`, `bill-payment-dialog.tsx`) and the `DataState` pattern. A savings contribution is **not** an expense: it has no category and no budget flags, so the budget toast from slices 02 and 04 does not apply here.

## Goal

Build the `/savings` page: goal cards with progress taken from the savings-progress report, an "Add contribution" action on each active goal, an "Add goal" dialog with activate/deactivate, and a contribution history.

This page shows the savings rules in a demo: progress computed in SQL (`LEFT JOIN` + `SUM` + `GROUP BY`), a contribution that is a row insert plus a balance debit in **one transaction**, and an insufficient balance rejected by the atomic `UPDATE` guard.

## Decisions (read first)

- **Add goal and activate/deactivate are in this slice.** `00` §2 lists only "Goal cards, contribution dialog", and slice 08 (Settings) covers members, accounts, categories and income sources only. Without them no goal can be created from the UI, but the proposal (step 6) says contributions go toward savings goals. If time is short, drop the "Add goal" dialog and the inactive group and seed goals instead.
- **Progress numbers come only from `GET /reports/savings-progress`.** Never sum contributions in the browser. The history table lists single contributions and shows no totals.
- **Two endpoints, one merged list.** The report has no `is_active`, `target_date` or creator, and `GET /savings-goals` has no progress. Join them by `goal_id` inside one query (display mapping, not arithmetic).
- **Inactive goals** are still returned by both endpoints. Show them in a separate "Inactive goals" group without an "Add contribution" button (the service rejects contributions to them).
- **"Completed" badge** appears when `toProgress(progress.completion_percent) === 100` (no `Number()` in the component). The theme sanctions a green completed state. Goals can be over-funded (no cap in the backend): show the real percent through `formatPercent` (for example `120%`), clamp only the bar, and keep the contribution button available.
- **New shadcn components: `card` and `progress`** (both listed in `00` §3 and the AGENTS.md component list). Add them with the CLI. No other packages or components.
- **No tabs, no filters, no editing of existing goals.** Sections are stacked.

## Route

- `app/(dashboard)/savings/page.tsx` renders only `<SavingsView />`. Server component (no `"use client"`).
- `<PageHeader>` lives **inside** `SavingsView` (its "Add goal" action controls dialog state), same as `bills-view.tsx`.
- The `00` §4 tree shows `app/savings/page.tsx`. It is stale: use the `(dashboard)` route group path above.
- The sidebar already links to `/savings` (Goal icon). No nav changes. Do not import `DashboardShell`.

## Endpoints used

Copied from `routers/setup.py`, `routers/transactions.py` and `routers/reports.py`. No other endpoints.

| Method  | Path                                  | Used for                                                                                                                                                                                                          |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/savings-goals`                      | All goals, **including inactive**. Returns `SavingsGoalRead[]` (`goal_id`, `goal_name`, `target_amount`, `target_date`, `created_by_member_id`, `is_active`).                                                     |
| `GET`   | `/reports/savings-progress`           | Progress per goal, including inactive, ordered by `goal_id`. No params. Returns `SavingsProgressRow[]` (`goal_id`, `goal_name`, `target_amount`, `contributed_amount`, `remaining_amount`, `completion_percent`). |
| `POST`  | `/savings-goals`                      | Create. Body `SavingsGoalCreate`. `201` with `SavingsGoalRead`.                                                                                                                                                   |
| `PATCH` | `/savings-goals/{goal_id}`            | Body `{ "is_active": boolean }` only. Goals have no DELETE.                                                                                                                                                       |
| `POST`  | `/transactions/savings-contribution`  | Record a contribution. Body `SavingsContributionCreate`. `201` with `SavingsContributionRead`. No budget flags.                                                                                                   |
| `GET`   | `/transactions/savings-contributions` | History. No params sent (the `member_id`, `from`, `to` filters are unused). Returns `SavingsContributionRead[]`.                                                                                                  |
| `GET`   | `/members`, `/accounts`               | Existing hooks: options and name lookup.                                                                                                                                                                          |

Not used: `GET /savings-goals/{goal_id}`, `GET /transactions/savings-contributions/{contribution_id}`.

Errors to show (always display the server's `detail` as given; never hard-code message text):

- `POST /transactions/savings-contribution`
  - 400 `"Insufficient account balance"`: the atomic debit matched no row. Nothing is inserted. Dialog stays open.
  - 400 `"Member is inactive"`, 404 `"Member not found"`, `"Account not found"`, `"Savings goal not found"`: stale lists.
  - 400 `"Savings goal is not active"`: the goal was deactivated after the page loaded.
  - 422 array `detail`: `ApiError.fieldErrors` maps onto fields; keys with no matching form field (`goal_id`) go to the root `Alert`.
- `POST /savings-goals`: 404 `"Member not found"`, 409 with a generic conflict message (most likely a duplicate `goal_name`; show whatever `detail` says), 422 field errors.
- `PATCH /savings-goals/{id}`: 404 `"Savings goal not found"`, shown as an error toast.
- `GET` 422 or network failure: `ErrorState` with Retry, through `DataState`.

## Types

From `src/types/api.d.ts` (run `npm run gen:api` first only if the backend changed; the savings schemas are already generated).

| Alias                       | Source schema               | Notes                                                                                                      |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `SavingsGoal`               | `SavingsGoalRead`           | Exists.                                                                                                    |
| `SavingsContribution`       | `SavingsContributionRead`   | Exists. Has `created_at` (a timestamp): do not display it.                                                 |
| `SavingsProgressRow`        | `SavingsProgressRow`        | Exists. All amounts and `completion_percent` are decimal strings.                                          |
| `SavingsGoalCreate`         | `SavingsGoalCreate`         | **Add** to `types/index.ts`.                                                                               |
| `SavingsGoalUpdate`         | `SavingsGoalUpdate`         | **Add**.                                                                                                   |
| `SavingsContributionCreate` | `SavingsContributionCreate` | **Add**.                                                                                                   |
| `SavingsGoalWithProgress`   | none (not an API schema)    | Declare and export in `hooks/use-savings-goals.ts`: `{ goal: SavingsGoal; progress: SavingsProgressRow }`. |

Do not hand-write a field name that is not in these schemas.

## Setup

From `frontend/`: `npx shadcn@latest add card progress`. Before using them, read the generated `components/ui/card.tsx` and `components/ui/progress.tsx` (style `base-nova`, built on Base UI, not Radix) and the installed shadcn skill. Do not hand-edit them. If the CLI changes any other file, stop and say which one.

## Files

Paths are under `frontend/src/`.

| File                                                   | Action    | Content                                                                                                   |
| ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------- |
| `components/ui/card.tsx`, `components/ui/progress.tsx` | Add (CLI) | Generated by the command above.                                                                           |
| `hooks/query-keys.ts`                                  | Change    | Add `savingsGoals: ["savings-goals"]` and `savingsContributions: ["savings-contributions"]` (`as const`). |
| `types/index.ts`                                       | Change    | Add the three aliases above.                                                                              |
| `hooks/use-savings-goals.ts`                           | Add       | `useSavingsGoals()` (with `byId`), `useCreateSavingsGoal()`, `useSetSavingsGoalActive()`.                 |
| `hooks/use-savings-contributions.ts`                   | Add       | `useSavingsContributions()`, `useCreateSavingsContribution()`.                                            |
| `components/savings/savings-view.tsx`                  | Add       | `"use client"`. Owns `contributingGoal`, add-goal dialog state; header, two sections, both dialogs.       |
| `components/savings/savings-goals-section.tsx`         | Add       | Title, `DataState`, active grid, inactive grid.                                                           |
| `components/savings/savings-goal-card.tsx`             | Add       | One goal: progress, figures, actions.                                                                     |
| `components/savings/contribution-form-dialog.tsx`      | Add       | react-hook-form dialog opened from a goal card.                                                           |
| `components/savings/goal-form-dialog.tsx`              | Add       | "Add goal" dialog.                                                                                        |
| `components/savings/contribution-history.tsx`          | Add       | Contribution history table.                                                                               |
| `app/(dashboard)/savings/page.tsx`                     | Add       | `export default function SavingsPage() { return <SavingsView /> }`.                                       |

One component per file, kebab-case filename, PascalCase export. Do not edit `components/bills/`, `components/expenses/`, `components/income/` or their hooks.

## UI

Page container `max-w-6xl` (inherited). Visual tokens from `frontend_design_theme.md`; do not add tokens (there is no savings token: keep the default `Progress` colour and let badges carry status). Section titles `text-lg font-medium`, sections separated by `gap-8`. Ids prefixed `savings-`, `savings-goal-form-` and `savings-contribution-`.

**Header.** `PageHeader` title "Savings", description "Set goals, record contributions and see how close you are.", action = "Add goal" `Button` with `PlusIcon data-icon="inline-start"`.

**Section 1: Goals (`savings-goals-section.tsx`, `savings-goal-card.tsx`).** Title "Goals". Active goals in `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`, in the order the API returns (`goal_id`). If any goal is inactive, a `text-sm font-medium text-muted-foreground` heading "Inactive goals" and a second grid below. Filtering by `goal.is_active` is display grouping, not computation. Card (shadcn `Card`, no heavy shadow, per the theme):

| Part     | Content                                                                                                                                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header   | `goal_name` as card title. Badge: **Completed** (`variant="outline"`, `className="border-income/30 bg-income/10 text-income"`) when complete; **Inactive** (`variant="outline"`) when inactive; none otherwise. The badge text is mandatory.                                                    |
| Progress | `Progress` with `value={toProgress(progress.completion_percent)}` and `aria-label="{goal_name} progress"`, and beside it `formatPercent(progress.completion_percent)` (`text-sm tabular-nums`).                                                                                                 |
| Figures  | A `dl` in two columns: **Saved** `<Money value={contributed_amount} />`, **Target** `<Money value={target_amount} />`, **Remaining** `<Money value={remaining_amount} />`, **Target date** `formatDate(target_date)` or "No target date". All neutral colour (these are not income or expense). |
| Meta     | `text-xs text-muted-foreground`: `Created by {member full_name}` (`members.byId`, or `—`).                                                                                                                                                                                                      |
| Footer   | Active goals: `Button size="sm"` "Add contribution", `aria-label="Add contribution to {goal_name}"`. All goals: `Button variant="outline" size="sm"` "Deactivate" or "Activate", disabled while that goal's mutation is pending.                                                                |

Figures use the `progress` row (report numbers). Goal fields (`target_date`, `is_active`, `created_by_member_id`) use the `goal` row. States: `DataState` with `LoadingState rows={3}`; empty (no goals) → `EmptyState` title "No savings goals yet", description "Add a goal to start tracking your savings.", action = "Add goal" button.

**Section 2: Contribution history (`contribution-history.tsx`).** Title "Contribution history". Rows sorted by `contribution_date` desc, then `contribution_id` desc, in the hook's `select`. Table wrapper as in `registered-bills-table.tsx`:

| Column      | Content                                                               | Alignment |
| ----------- | --------------------------------------------------------------------- | --------- |
| Date        | `formatDate(contribution_date)`                                       | left      |
| Goal        | `goals.byId.get(goal_id)?.goal_name ?? "—"` (includes inactive goals) | left      |
| Member      | `members.byId.get(member_id)?.full_name ?? "—"`                       | left      |
| Account     | `accounts.byId.get(account_id)?.account_name ?? "—"`                  | left      |
| Description | `description` or a muted `—`; `max-w-xs truncate`                     | left      |
| Amount      | `<Money value={amount} className="font-medium" />`                    | right     |

No totals, no filters. Empty: `EmptyState` "No contributions yet", "Contributions you record toward a goal appear here." (no action).

**Contribution dialog (`contribution-form-dialog.tsx`).** Props `{ goal: SavingsGoal | null; onOpenChange }`; open when `goal !== null`. Same `DialogContent` sizing, `grid sm:grid-cols-2 gap-4`, footer and root-error `Alert` as `bill-payment-dialog.tsx`. Title "Add contribution". Description `Saving toward {goal_name}. This debits the selected account.` Submit "Add contribution", pending "Adding…" with the spinner. Reset to empty defaults (date `todayISO()`) every time the dialog opens for a goal.

| Field        | Control                                            | Rules                                                                                                                              |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Member       | `Select`                                           | required; active members only                                                                                                      |
| Account      | `Select`                                           | required; all accounts; same label rule as the expense dialog (append the type in parentheses unless the name already contains it) |
| Amount (PKR) | text `Input`, `inputMode="decimal"`                | required; `^\d{1,10}(\.\d{1,2})?$`; refine `> 0`. No default, no "remaining" hint (that would be money arithmetic)                 |
| Date         | native `<input type="date">`                       | required; label "Contribution date"; default `todayISO()`; no future-date rule (the API has none)                                  |
| Goal         | disabled `Input` showing the goal name, full width | not a form field; `goal_id` comes from the prop                                                                                    |
| Description  | `Input`, full width                                | optional; `.max(500)`; send `null` when blank (trim first)                                                                         |

Form fields: `member_id`, `account_id`, `amount`, `contribution_date`, `description`. On submit build the `SavingsContributionCreate` body by adding `goal_id` from `goal`. Never let the user edit it. Layout: Member / Account, Amount / Date, Goal, Description.

**Add goal dialog (`goal-form-dialog.tsx`).** Title "Add goal", description "Set a target and, optionally, a date to reach it by.", submit "Add goal", pending "Adding…".

| Field                  | Control               | Rules                                                                       |
| ---------------------- | --------------------- | --------------------------------------------------------------------------- |
| `goal_name`            | `Input`               | required after trim; max 100 (backend `Name100`)                            |
| `target_amount`        | text `Input`, decimal | same regex and `> 0` rule as amounts elsewhere; label "Target amount (PKR)" |
| `target_date`          | native date           | optional; label "Target date"; helper "Optional."; send `null` when blank   |
| `created_by_member_id` | `Select`              | required; label "Created by"; active members only                           |

Field names equal the `SavingsGoalCreate` keys exactly. Layout: `goal_name` full width, then two columns: target amount / target date, then `created_by_member_id` full width.

## Behaviour

**Goals query (`useSavingsGoals()`).** One query so `DataState` keeps a single loading/error/retry path. It iterates the report rows (already ordered by `goal_id`), so no client sorting:

```ts
useQuery({
  queryKey: queryKeys.savingsGoals,
  queryFn: async () => {
    const [goals, progress] = await Promise.all([
      apiGet<SavingsGoal[]>("/savings-goals"),
      apiGet<SavingsProgressRow[]>("/reports/savings-progress"),
    ]);
    const goalById = new Map(goals.map((goal) => [goal.goal_id, goal]));
    return progress.flatMap((row): SavingsGoalWithProgress[] => {
      const goal = goalById.get(row.goal_id);
      return goal ? [{ goal, progress: row }] : [];
    });
  },
});
```

Return `{ ...query, byId }`, where `byId` is a `Map<number, SavingsGoal>` built with `useMemo` from `query.data`, as in `useBills()`. Add no `as` casts.

**Contribution mutation (`useCreateSavingsContribution`).**

- `mutationFn: (body: SavingsContributionCreate) => apiPost<SavingsContribution>("/transactions/savings-contribution", body)`.
- `onSuccess`: `toast.success("Contribution recorded.")`, then invalidate `savingsGoals` (progress changed), `savingsContributions` and `accounts` (the balance was debited in SQL). Do **not** invalidate `expenses` or budget keys: no expense is created. Leave a one-line comment: slices 06/07 must add their report and dashboard keys here (account balances and monthly `total_savings`; `00` §6.15).
- `onError`: invalidate `savingsGoals` and `accounts` (a stale goal or balance is the likely cause). The dialog still shows the server message.
- The dialog calls `mutateAsync`. On success it closes and resets. On `ApiError` it stays open, shows `error.message` in the root `Alert` and maps `fieldErrors` onto fields that exist in the form.

**Goal mutations.** `useCreateSavingsGoal`: `apiPost<SavingsGoal>("/savings-goals", body)`; success toast "Goal added."; invalidate `savingsGoals`. `useSetSavingsGoalActive`: `apiPatch<SavingsGoal>(`/savings-goals/${goalId}`, { is_active } satisfies SavingsGoalUpdate)`; success toast "Goal activated." or "Goal deactivated. It no longer accepts contributions."; invalidate `savingsGoals`; on error `toast.error(getErrorMessage(error))`. No confirm dialog: the change is reversible.

**Lookups.** Selects render from `(query.data ?? [])`; dialogs do not block while lookups load. Active members are filtered with `is_active`, as in the other dialogs. Contribution history needs both `useSavingsGoals()` (for names) and its own query; use the contributions query for `DataState` and render `—` for missing names while lookups load.

**Where each rule lives (viva).** In the database: `CHECK (amount > 0)`, `CHECK (target_amount > 0)`, `UNIQUE (goal_name)`, foreign keys with `ON DELETE RESTRICT`. In the SQL of the atomic `UPDATE account SET balance = balance - :amount ... WHERE balance >= :amount`: the insufficient-balance guard. In the service only: "goal must be active" and "member must be active".

**Trace for the viva:** `ContributionFormDialog.onSubmit` → `useCreateSavingsContribution` → `apiPost` → `POST /transactions/savings-contribution` → router `_write` → `transactions.create_savings_contribution` (member active and account exists, goal exists and is active, adds the `SavingsContribution`, runs the atomic debit, flush) → one commit, or rollback on any error. Progress is then read by `sql/reports/savings_progress.sql` (`LEFT JOIN` contributions, `SUM`, `GROUP BY`).

## Backend gaps

None blocking. Limits, not gaps (do not work around them with client logic):

- `GET /reports/savings-progress` has no `is_active`, `target_date` or creator, so the page merges it with `GET /savings-goals`. If that becomes awkward, the fix is a backend change (extend the report, add a test), then drop the merge.
- `GET /transactions/savings-contributions` has no `goal_id` filter, so history is one list with a Goal column.
- The backend does not cap contributions at the target; `completion_percent` can exceed 100.
- `completion_percent` is rounded to two decimals, so a goal a cent short of target can read as complete. This is display only.
- Goals have no DELETE. `PATCH` also accepts `goal_name`, `target_amount` and `target_date`, but this slice patches `is_active` only.

## Out of scope

- Editing a goal's name, target or date, deleting goals or contributions, undoing a contribution, withdrawals or transfers between goals.
- Totals across goals, "total saved", counts or any money arithmetic; charts. Reports and dashboard are slice 07.
- Goal filters, sorting UI, pagination, export, URL query sync, per-goal detail pages, reminders, projected completion dates.
- Treating a contribution as an expense, budget display or budget toasts (slice 06).
- Role-based rules, a "current user", login.
- New endpoints, packages or shadcn components beyond `card` and `progress`; edits to other slices' files.

## Done when

Verify against the running backend (`uv run fastapi dev main.py`) with the default seed: Emergency Fund (target Rs. 200,000.00, two contributions of Rs. 20,000.00 and Rs. 10,000.00) and Vacation Fund (target Rs. 100,000.00, one contribution of Rs. 15,000.00), all from Household Bank. Compare against `GET /reports/savings-progress` in `/docs`. Global checks from `00` §14 also apply.

- [ ] `npm run lint` and `npm run build` pass; no `any`, no `console.log`, no raw colour classes, no `fetch` outside `lib/api.ts`, no `as` casts, no money arithmetic, no summing of contributions.
- [ ] `/savings` shows the header and two sections. Both seeded goals appear as cards whose Saved, Remaining and percent match the report exactly (`Rs. 30,000.00`, `15%`); bars reflect the API percent; dates read `15 Nov 2026`; the Savings sidebar item is highlighted.
- [ ] Contribution history shows the three seeded contributions with date, goal, member, account and amount filled in (no `—` while data exists), newest first.
- [ ] Stopping the backend shows `ErrorState` with the "Cannot reach the backend" message in each section; Retry works after restart.
- [ ] "Add contribution" opens a dialog titled with the goal; the Goal field is disabled and shows its name; Member lists only active members; the date defaults to today.
- [ ] Dialog validation fires client-side, with no request in the Network tab, for: empty member or account, amount `abc`, `0` and `10.999`, and a description over 500 characters.
- [ ] A valid contribution: success toast, dialog closes, the card's Saved, Remaining and percent update and a new history row appears at the top, without a reload. `GET /accounts` shows the chosen account's `balance` reduced by exactly the amount, `GET /reports/account-balances` still shows `is_reconciled: true`, and `/expenses` has **no** new row.
- [ ] Insufficient balance: contribute from Cash Wallet an amount above its balance (check `GET /accounts`). The dialog stays open with the server's message, no history row is added, and the balance and the card are unchanged.
- [ ] Stale-member rejection: open the dialog, set the chosen member inactive in `/docs` (`PATCH /members/{id}` with `{"is_active": false}`), submit. The dialog stays open with "Member is inactive" and nothing is inserted. Re-activate the member afterwards.
- [ ] Stale-goal rejection: open the dialog, set that goal inactive in `/docs` (`PATCH /savings-goals/{id}` with `{"is_active": false}`), submit. The dialog stays open with "Savings goal is not active" and nothing is inserted. After closing, the card sits under "Inactive goals".
- [ ] Over-funding: contribute enough to pass a goal's target. The server accepts it, the card shows the **Completed** badge, the percent reads above `100%` and the bar is full width. Re-seed afterwards if you want the original demo data.
- [ ] "Add goal": a valid goal appears as a card at `0%` with `Rs. 0.00` saved. A duplicate name shows the server's 409 message in the dialog. A blank target date is sent as `null`. Created by lists active members only.
- [ ] "Deactivate" moves the card to "Inactive goals", removes its "Add contribution" button, and keeps its rows in the history. "Activate" restores it.
