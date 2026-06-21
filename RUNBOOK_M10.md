# M10 — Frontend–Backend Integration
## Setup & Verification Runbook

Unlike M7–M9, this milestone changes the **frontend** project (`salon_fixed/`
or wherever your actual app folder is), not the `supabase_m7/` backend folder.
Assumes M7, M8, and M9 are already applied and `supabase start` is running.

---

## 0. Install the new dependency

```bash
cd /path/to/your/salon-app
npm install
```
This pulls in `@supabase/supabase-js`, added to `package.json`.

---

## 1. Set up your frontend `.env`

```bash
cp .env.example .env
```

Get your local anon key:
```bash
supabase status -o json | grep -i ANON_KEY
```

Edit `.env`:
```bash
VITE_USE_MOCKS=false
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<paste here>
```

**Leave `VITE_USE_MOCKS=true` if you just want to confirm the app still runs
exactly as before** — every hook in this milestone branches on that flag, so
flipping it back to `true` reverts the entire app to M1–M6 MSW behavior with
zero code changes needed. Worth doing once first, as a baseline sanity check,
before flipping to `false`.

---

## 2. Generate fresh types (if you haven't recently)

```bash
cd supabase_m7   # or wherever your backend folder is
supabase gen types typescript --local > ../your-salon-app/src/types/database.ts
```
(adjust the output path to your actual frontend project location)

---

## 3. Start the app

```bash
npm run dev
```

**With `VITE_USE_MOCKS=false`, you should be redirected to `/login`** instead
of landing directly on the dashboard — this is new behavior versus M1–M6,
where there was no login screen at all (see M10.2).

Sign in with one of the M7 test accounts:
```
owner@glowbright.test / TestPass123!
admin@glowbright.test / TestPass123!
staff@glowbright.test / TestPass123!
```

**Expect after signing in as owner:**
- Redirected to `/daily-pulse`
- Top-right role badge shows `OWNER`
- Sidebar shows all 8 nav items

**Sign out, sign back in as staff:**
- Redirected to `/my-schedule` (staff can't reach `/daily-pulse`)
- Sidebar shows only `Calendar` (per `NAV_ITEMS` role gating, unchanged from M4)

---

## 4. Verify M10.3 — Daily Pulse + Calendar show real customer names

Navigate to `/daily-pulse` as owner.

**Check:** the appointments list shows real customer names (Priya M., Anjali S.,
etc.), not IDs or blanks — this was the original bug-fix from the very start of
this conversation, now verified against the live backend instead of MSW.

Navigate to `/calendar`.

**Check:** every appointment block shows the customer's real name. Open the
browser Network tab and find the `calendar_grid` RPC call — confirm the
response JSON has a nested `"customer": { "name": ... }` on each appointment.

**Test the Mark Complete colour bug fix against live data:**
1. Click any CONFIRMED appointment block
2. Click "Mark In-Progress", then "Mark Complete"
3. **Expect:** the block's colour updates immediately, without closing the
   panel, and without a page refresh — same behavior as the mock path, now
   backed by the real `update_appointment_status` RPC

---

## 5. Verify M10.4 — Drag-and-drop with Presence + conflict handling

**Two-tab test (the actual point of M9.2's Presence lock):**
1. Open the Calendar in two browser tabs, both signed in as `owner@glowbright.test`
2. In Tab 1, start dragging an appointment (mouse down, don't release yet)
3. **Check Tab 2:** (this part requires the Presence UI to actually render a
   lock indicator — if you haven't built that visual cue into `StylistColumn`
   or `AppointmentBlock` yet, you'll need to verify this via the Network/WS
   tab instead, watching for a `presence` event with the dragging appointment's
   slot data, since `usePresenceLock` only exposes `isLocked()` — wiring it
   into a visible "being edited" badge on the slot itself is frontend polish
   not yet done in this milestone, flagged here rather than silently assumed complete)
4. Drop the appointment in Tab 1 onto a free slot
5. **Expect:** toast "Appointment rescheduled", and Tab 2's calendar updates
   to reflect the new position within ~1-2s (via the M9.1 Realtime subscription)

**Conflict test:**
1. Drag an appointment onto a slot that's already occupied by another BUSY segment
2. **Expect:** "Cannot drop onto a booked segment" toast (client-side guard,
   same as the mock path)
3. To test the *server-side* conflict guard specifically (not just the
   client-side guard): temporarily comment out the `isDroppingOnBusy` check
   in `CalendarGrid.tsx`, retry the same drag, and confirm you instead get
   "Slot unavailable — someone just booked this time" — proving the
   `SEGMENT_CONFLICT` error from the M7.2 EXCLUDE constraint is what's
   actually stopping it, not just the UI guard. **Remember to uncomment the
   guard afterward** — it's the correct fast-path UX and should stay in place.

---

## 6. Verify M10.5 — Action Centre + inventory alerts

Navigate to `/daily-pulse` as owner — confirm the Action Centre sidebar shows
real alerts from the database (the seeded `VIP_PENDING`, `LOW_INVENTORY`,
`OUT_OF_STOCK`, `CONFLICT` cards).

Click "Approve" or "Order" on a card — confirm it disappears optimistically
and the underlying `ActionAlert.resolved` flips to `true` in Studio.

**Realtime push test** (requires the M9.4 Edge Function running):
```bash
supabase functions serve inventory-alert-relay --no-verify-jwt
```
With the app open on `/daily-pulse`, lower an inventory item's quantity
below its threshold in Studio, then manually run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select check_inventory_thresholds();"
```
**Expect:** a new alert card appears in the sidebar within a couple of
seconds, without a page refresh — proving the `inventory.alert` broadcast →
`useActionAlerts`'s Realtime listener → query invalidation chain works
end-to-end.

---

## 7. Verify M10.6 — Customers + Invoices

Navigate to `/customers` as owner:
- **Check:** all 15 seeded customers appear, with VIP customers (Priya M.,
  Deepa R., Pooja B., Durga H.) showing the gold VIP badge
- Click into a customer profile — confirm appointment history, formula
  notes, and the free-text note panel all load real data
- Toggle VIP status — confirm it persists (refresh the page to verify it
  wasn't just an optimistic UI flicker)
- Add a new customer with an email that already exists (try `priya@example.com`)
  — **expect** the inline "This email is already registered" validation error,
  now sourced from a real Postgres unique-constraint violation instead of the
  mock's hand-written duplicate check

Navigate to `/invoices` as owner:
- **Check:** the 2 seeded invoices appear (Durga H. PAID ₹2200, Aruna E. UNPAID ₹1800)
- Click "Mark paid" on the unpaid one — confirm status flips and `paidAt` gets set
  (check in Studio)
- Try creating a new invoice — confirm it appears in the list

**Sign in as staff and check `/customers` is unreachable** (per RLS — staff has
no `customer_select_owner` policy match): confirm you're redirected away from
`/customers` per `ProtectedRoute`'s role gate, same UI behavior as M1–M6, now
additionally backed by the database actually refusing the data if RLS were
somehow bypassed.

---

## 8. Known gaps / things NOT fully wired in this pass

Being upfront about what's still incomplete after this milestone, rather than
implying full coverage:

- **Presence lock has no visible UI indicator yet.** `usePresenceLock`'s
  `isLocked()` function exists and the channel wiring works, but no
  component currently calls it to render a "being edited by X" badge on a
  slot. The two-tab test in §5 can only be fully confirmed via the Realtime
  postgres_changes update (the *result* of the other tab's drag), not the
  *in-progress* lock signal itself. This is a small follow-up, not a redo.
- **QuickAddModal still posts to the mock endpoint only.** It wasn't in the
  M10.1–M10.6 task list explicitly (the plan's M10 tasks cover Daily Pulse,
  Calendar, drag-and-drop, Action Centre, Customers, and Invoices — new
  appointment creation via QuickAddModal wasn't named). The M8.2
  `create_appointment` RPC is built and tested via curl (M8 RUNBOOK §3), but
  isn't yet wired into `QuickAddModal.tsx`. Flagging as a gap rather than
  silently leaving it mock-only without a note.
- **CustomerProfilePage's appointment history join (`useCustomerHistory`)
  is new code, not a port of an existing mock 1:1** — the mock's
  `customerHistory` MSW handler logic wasn't shown in full during this build,
  so the live version was constructed to match the `CustomerHistory`
  TypeScript interface exactly, but hasn't been cross-checked field-by-field
  against the mock handler's exact computation (e.g. how `totalPaid` is
  derived when there are multiple invoices, or none). Spot-check this one
  closely in §7 against a customer with a known appointment history.

---

## 9. Definition of done checklist for M10

- [ ] App loads, `VITE_USE_MOCKS=true` still works exactly as before (regression check)
- [ ] `VITE_USE_MOCKS=false` redirects unauthenticated users to `/login`
- [ ] Login works for all 3 test roles, redirects correctly per role
- [ ] Daily Pulse shows real customer names and real (computed) services revenue
- [ ] Calendar blocks show real customer names; Mark Complete updates colour live
- [ ] Drag-and-drop reschedule works; conflict produces the SEGMENT_CONFLICT-sourced toast
- [ ] A second browser tab reflects a reschedule within ~2s via Realtime
- [ ] Action Centre shows real alerts; resolving persists; new inventory alerts arrive live
- [ ] Customers directory, profile, VIP toggle, formula notes, notes panel all work against live data
- [ ] Duplicate email on Add Customer shows the correct inline error
- [ ] Invoices list, mark paid, and create all work against live data
- [ ] Staff role correctly blocked from Customers/Invoices/Daily Pulse, both in UI and (spot-check) at the RLS layer
