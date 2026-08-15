# UI & Mobile Responsive Fix: Crew Action Buttons in Dashboard Shoot Cards

## Goal
Make the crew member rows and the "Manage Crew" header in the dashboard shoot cards (Today / Tomorrow / Day After Tomorrow) fully mobile-responsive: no overflow, proper text width, and compact action buttons.

## What we will change

### 1. `src/components/ShootDay.tsx` — crew row layout
- Switch each crew row from a single `flex justify-between` to a responsive grid:
  - Mobile: `grid-cols-[minmax(0,1fr)_auto]` with text on the left and the action stack on the right.
  - Tablet+: `sm:flex sm:items-center sm:justify-between` so the buttons sit horizontally when space allows.
- Action buttons container:
  - On mobile, stack vertically (`flex-col`) with full-width buttons and `h-9` / `min-h-[36px]` touch targets.
  - On `sm+`, keep the existing horizontal `flex-row` compact group.
- Name/role block: ensure `min-w-0` + `truncate` so text never pushes the buttons out.
- Button labels: use shorter mobile-friendly labels if needed (e.g., "Ticket" / "WhatsApp"). Keep `shrink-0` on the button container.

### 2. `src/components/ShootDay.tsx` — card header layout
- Convert the header row (title + Manage Crew) to the same grid pattern:
  - `grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2` on mobile.
  - `sm:flex sm:items-start sm:justify-between` on larger screens.
- Ensure `Manage Crew` button (EditCrewDialog trigger) has `shrink-0` and never exceeds card width.
- Verify the title/client block has `min-w-0` so long text truncates instead of forcing the button out.

### 3. `src/styles.css` — touch target & spacing helpers
- Add a small, scoped helper class or utility rule to ensure the shoot-card action buttons have minimum 44px tap targets (e.g., `min-h-9` / `min-w-11`).
- Audit the card's `surface` / `p-4` / `rounded-xl` padding to ensure no horizontal leakage on very small screens (`<360px`). No component-level color hardcodes will be introduced.

## How we will verify
- Run the dev build / typecheck to ensure no TS or build errors.
- Use a Playwright screenshot at mobile viewport (430px and 360px) of the dashboard to confirm:
  - No horizontal scroll / card overflow.
  - Crew name and role are visible and truncated cleanly.
  - Action buttons stack vertically on mobile, sit horizontally on desktop.
  - Manage Crew button stays within the card header.

## Out of scope
- No new features, no backend changes, no data model changes.
- No color palette changes; only layout and spacing.
