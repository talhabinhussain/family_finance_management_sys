# Frontend Design Theme Specification

**Project:** Family Finance Management System
**Location:** `.cursor/spec/frontend_spec/frontend_design_theme.md`
**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI)

---

## 1. Objective

Establish ONE consistent, reusable global design system for the whole frontend, so every existing and future page shares the same colors, typography, spacing, component styling, borders/radii and responsive rules. The app must look like one professionally designed household finance platform, not separately built pages.

This spec controls **visual presentation only**. It must not change business logic, API contracts, database structures or functionality.

## 2. Design Direction

Modern, clean, professional financial dashboard. Minimal and functional.

| Property                     | Decision                  |
| ---------------------------- | ------------------------- |
| Theme                        | Light only                |
| Sidebar                      | Deep navy                 |
| Main content                 | White / very light grey   |
| Primary actions              | Navy blue                 |
| Income / Expenses / Warnings | Green / Muted red / Amber |
| Typography                   | Existing Geist Sans       |
| Components                   | Existing shadcn/ui        |
| Icons                        | Lucide React              |
| Styling                      | Tailwind CSS v4           |

Do NOT turn the app into a banking website, an analytics-only dashboard or a generic SaaS template. Preserve the existing identity and navigation.

## 3. Global Design Tokens

All global values live in `frontend/src/app/globals.css`, using CSS custom properties and the existing Tailwind v4 `@theme inline` setup. Do not scatter hardcoded colors in feature components. Remove duplicate token declarations.

### 3.1 Light palette

| Token                                        | Value     | Purpose                      |
| -------------------------------------------- | --------- | ---------------------------- |
| `--background`                               | `#F8FAFC` | App background               |
| `--foreground`                               | `#0F172A` | Main text                    |
| `--card` / `--popover`                       | `#FFFFFF` | Cards, surfaces, dropdowns   |
| `--card-foreground` / `--popover-foreground` | `#0F172A` | Text on those                |
| `--primary`                                  | `#123253` | Primary buttons/actions      |
| `--primary-foreground`                       | `#FFFFFF` | Text on primary              |
| `--secondary`                                | `#EEF2F7` | Secondary surfaces           |
| `--secondary-foreground`                     | `#1E293B` | Secondary text               |
| `--muted`                                    | `#F1F5F9` | Muted backgrounds            |
| `--muted-foreground`                         | `#64748B` | Descriptions, secondary text |
| `--accent`                                   | `#EAF1F8` | Hover/selected backgrounds   |
| `--accent-foreground`                        | `#123253` | Accent text                  |
| `--destructive`                              | `#B42318` | Destructive actions          |
| `--border`                                   | `#E2E8F0` | Borders, separators          |
| `--input`                                    | `#CBD5E1` | Input borders                |
| `--ring`                                     | `#315A7D` | Focus indicators             |

### 3.2 Sidebar

| Token                          | Value     |
| ------------------------------ | --------- |
| `--sidebar`                    | `#0B203B` |
| `--sidebar-foreground`         | `#F8FAFC` |
| `--sidebar-primary`            | `#315A7D` |
| `--sidebar-primary-foreground` | `#FFFFFF` |
| `--sidebar-accent`             | `#173858` |
| `--sidebar-accent-foreground`  | `#FFFFFF` |
| `--sidebar-border`             | `#1E3A56` |
| `--sidebar-ring`               | `#93C5FD` |

Requirements: keep existing structure, navigation order and dark navy background; subtle blue highlight for the active item; consistent icon size/spacing; readable contrast; **no new navigation items**.

### 3.3 Financial semantic colors

| Token                  | Value     | Usage                               |
| ---------------------- | --------- | ----------------------------------- |
| `--income`             | `#15803D` | Income amounts, positive indicators |
| `--expense`            | `#B42318` | Expense amounts                     |
| `--warning`            | `#B45309` | Budget warnings, caution            |
| `--warning-foreground` | `#92400E` | Warning text                        |

- Use the existing Tailwind mappings: `text-income`, `text-expense`, `text-warning`, `bg-income`, `bg-expense`, `bg-warning`.
- Use these colors selectively for financial information. Never as full-page backgrounds.
- A destructive **button** and an expense **amount** are different concepts. Do not style every expense-related action as destructive.

### 3.4 Chart colors

Define chart tokens for future reports/dashboard: Income = green, Expenses = muted red, Budget = navy/blue, Savings = teal, Warnings = amber. Charts must stay readable and distinguishable without relying only on color.

## 4. Typography

Use the existing Geist Sans. Do not install another font library or change font loading. One font family, one consistent scale; use reusable typography classes or consistent Tailwind combinations instead of per-page overrides.

| Element                           | Size | Weight |
| --------------------------------- | ---: | ------ |
| Page title                        | 24px | 600    |
| Section heading                   | 18px | 600    |
| Card heading                      | 15px | 600    |
| Body / table content / input text | 14px | 400    |
| Form labels                       | 13px | 500    |
| Description                       | 13px | 400    |
| Navigation text                   | 14px | 500    |
| Helper text                       | 12px | 400    |
| Small badges                      | 12px | 500    |

Rules: `font-semibold` for page and section headings; `tabular-nums` for monetary amounts and numeric columns; muted foreground for descriptions; readable line heights; avoid oversized headings and unnecessarily small text.

## 5. Layout and Spacing

Keep the existing app shell: sidebar, header, responsive sidebar behavior, centered container with `max-w-6xl`, and `bg-muted/30` main treatment (unless a component needs a specific surface). Page padding is `p-4 md:p-6`.

| Element                   | Spacing |
| ------------------------- | ------- |
| Page section gap          | 24px    |
| Page heading to content   | 24px    |
| Card internal padding     | 20–24px |
| Form field spacing        | 16px    |
| Table cell padding        | 12–16px |
| Button horizontal padding | 16px    |
| Icon-to-label gap         | 8px     |

Prefer Tailwind spacing utilities over arbitrary pixel values.

## 6. Component Styling

Style the existing shadcn/ui components. Do not create duplicate primitives where shadcn already provides the function.

**Buttons**

- Primary: navy, white text, medium weight, consistent height/padding, subtle hover and focus. Icons only when they aid clarity.
- Secondary: neutral background, readable text, subtle border where appropriate.
- Destructive: only for destructive actions.
- Keep the existing Add Expense button behavior and action.

**Cards:** white, subtle grey border, consistent radius and padding, no heavy shadows, consistent heading/content spacing. Do not wrap everything in a card.

**Inputs and Selects:** white background, consistent height/border/radius, readable placeholder, visible focus ring, clear disabled state, consistent label-to-field spacing. Use existing shadcn Input/Select/form components. Preserve all validation.

**Tables:** white background, subtle borders, clear column headings, consistent padding and text size, **right-aligned monetary values with `tabular-nums`**, subtle row hover, no unnecessary shadows, readable long descriptions, semantic income/expense colors. Do NOT add pagination, sorting or editing.

**Badges / status:** Paid = green; Upcoming = neutral or blue; Overdue = red; Budget warning = amber; Completed savings goal = green. Use only statuses the API already returns. Do not invent new business states.

**Dialogs:** consistent width, clear title and description, consistent form spacing, clearly distinguished primary/secondary actions, consistent footer alignment. Preserve submission, validation and API behavior.

**Empty / Loading / Error states:** use shared components, not page-specific designs.

- Empty: short message plus relevant primary action where applicable.
- Loading: existing skeleton/loading components, no blank screens.
- Error: clear message, existing Retry where supported, never hide backend validation messages.

## 7. Page-Level Consistency

**Page header:** title 24px, description 13px, primary action aligned right when present, consistent bottom spacing and separator.

| Page                | Requirements                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Expenses / Income   | Consistent table layout, date format, amount format, filters and dialogs; expenses use expense color, income uses income color |
| Bills               | Consistent status badges and due-date presentation; clear paid/overdue states                                                  |
| Savings             | Consistent cards, progress indicators on the shared color system, consistent money format                                      |
| Budgets             | Consistent progress indicators; warnings amber; over-budget uses expense/destructive color                                     |
| Reports / Dashboard | Reuse global card, typography and chart conventions and consistent chart spacing/labels; no separate dashboard theme           |
| Settings            | Consistent form layouts, tables, buttons and inputs                                                                            |

Do not implement missing pages or features.

## 8. Responsive Design

The existing desktop design must remain intact. Improve consistency across desktop, tablet and mobile.

- Preserve the collapsible/offcanvas sidebar behavior.
- No horizontal overflow in page content; tables scroll horizontally when needed.
- Forms usable on small screens; buttons/inputs comfortable on touch.
- Stack page-header actions when width is insufficient.
- Keep text readable.
- Do not redesign navigation or add mobile-only features.

## 9. Accessibility

- Readable text/background contrast and visible keyboard focus.
- Never communicate financial status by color alone (pair with text/icon/label).
- Labels associated with inputs; accessible names on icon-only buttons.
- Semantic table structure; keep all existing ARIA attributes.

## 10. Implementation Constraints

This is strictly a visual foundation. The coding agent MUST NOT:

1. Change backend endpoints, API request/response types, database schemas or SQL scripts.
2. Change business logic or transaction calculations.
3. Introduce authentication or role-based access.
4. Add dark mode or a theme toggle.
5. Add animations or unnecessary visual effects.
6. Add new UI libraries or dependencies (unless an existing one is genuinely insufficient).
7. Rebuild the app shell from scratch or replace working components without clear technical reason.
8. Introduce features outside the approved project scope.
9. Create a `tailwind.config` file. Keep the CSS-first Tailwind v4 configuration.

Keep the existing Next.js, Tailwind v4 and shadcn/ui architecture. Modify only files needed; do not rewrite working components unnecessarily.

## 11. Files to Inspect (before modifying anything)

Primary:

- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/layout/app-sidebar.tsx`
- `frontend/src/components/layout/app-header.tsx`
- `frontend/src/components/layout/dashboard-shell.tsx`
- `frontend/src/components/shared/page-header.tsx`
- `frontend/src/components/shared/data-state.tsx`
- `frontend/src/components/shared/money.tsx`

Also: existing shadcn UI component files, the current Expenses page and its components, and other feature components showing current styling patterns.

## 12. Specification Integration

This document is the authoritative source for **visual design**. Feature specs remain authoritative for behavior, API integration and data presentation.

Before implementing any frontend slice, read in order:

1. `00_frontend_overview.md`
2. `frontend_design_theme.md`
3. The relevant feature spec

Required spec updates as part of this task:

- Update `00_frontend_overview.md` to explicitly require reading this design theme spec before every frontend slice.
- Review `01_shell_and_api_client.md` and remove/revise any instruction that treats the old global color tokens as immutable.

Conflicts: follow this document for visual styling, the feature spec for functionality. Never change business behavior just to satisfy a visual requirement.

## 13. Implementation Workflow

1. **Inspect:** review current CSS tokens, root layout, shell and shared components; note styling that already satisfies this spec.
2. **Global tokens:** update palette and semantic mappings in `globals.css`; keep Tailwind v4 architecture; remove duplicates.
3. **Typography:** standardize sizes, weights and line heights; keep Geist setup.
4. **Shared components:** update existing button, card, input, select, table, badge and dialog styling where necessary.
5. **Apply to existing pages:** Dashboard and Expenses only. Do not build future pages.
6. **Responsive review:** check desktop, tablet and mobile widths.
7. **Verify:** run `npm run lint` and `npm run build`; fix regressions.

## 14. Acceptance Criteria

- [ ] All global colors centralized in `globals.css`
- [ ] Sidebar keeps its navy identity; primary buttons use the shared navy
- [ ] Income/expense semantic colors consistent
- [ ] Typography follows the defined scale; headings and descriptions consistent
- [ ] Buttons, inputs, selects, tables, cards and dialogs follow common styling
- [ ] Financial amounts right-aligned with tabular numbers
- [ ] Loading, empty and error states remain functional
- [ ] Existing functionality unchanged; no API, database or out-of-scope changes
- [ ] Desktop and mobile layouts usable
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `00_frontend_overview.md` references this spec

## 15. Final Deliverable

Provide an implementation summary with:

1. Files inspected
2. Files modified
3. Global design tokens established
4. Typography changes
5. Shared component styling changes
6. Existing pages updated
7. Responsive behavior verified
8. Lint and build results
9. Remaining visual inconsistencies

Do not claim verification succeeded unless the commands were actually executed.

**Final objective:** a reusable, consistent global design system that every future frontend feature can follow without inventing its own colors, typography, spacing or component styles.
