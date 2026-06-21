# Salon Management CRM — Product Requirement Document
**Phase 1 · Owner Desktop Dashboard · v1.1 — Execution Edition**

| Field | Detail |
|---|---|
| **Author** | Product Owner |
| **Date** | June 2026 |
| **Status** | Draft v1.1 — includes Customer & Invoice features |
| **Phase** | 1 of 3 |
| **Audience** | Engineering, Design, QA, Product |

---

## Table of Contents

1. [Executive Summary & Objective](#1-executive-summary--objective)
2. [Primary User Persona](#2-primary-user-persona)
3. [Scope](#3-scope)
4. [System Architecture](#4-system-architecture)
   - [4.1 High-Level Architecture](#41-high-level-architecture)
   - [4.2 Core Data Models](#42-core-data-models)
   - [4.3 GraphQL Schema](#43-graphql-schema-key-types--queries)
   - [4.4 WebSocket Event Contract](#44-websocket-event-contract)
   - [4.5 REST Endpoints](#45-rest-endpoints-non-graphql)
5. [Feature Requirements](#5-feature-requirements)
   - [5.1 Daily Pulse — Metric Board](#51-daily-pulse--metric-board)
   - [5.2 Multi-Segment Calendar Grid](#52-multi-segment-calendar-grid)
   - [5.3 Customer Directory & Profile](#53-customer-directory--profile)
   - [5.4 Invoice & Billing](#54-invoice--billing)
   - [5.5 Staff & Analytics](#55-staff--analytics)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Role-Based Access Control Matrix](#7-role-based-access-control-matrix)
8. [Error States & Edge Cases](#8-error-states--edge-cases)
9. [Frontend Component Map](#9-frontend-component-map)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Open Questions](#11-open-questions)
12. [Indicative Timeline](#12-indicative-timeline)
- [Appendix A — Glossary](#appendix-a--glossary)

---

## 1. Executive Summary & Objective

Small-to-medium salon owners face a daily tension between operational execution and business growth. Existing tools are either too cluttered for a stylist's fast-paced workflow or too shallow to surface the financial and scheduling intelligence owners need.

Phase 1 delivers the **Owner Desktop Dashboard** — a web-based Control Tower that gives salon owners real-time operational visibility, an intelligent multi-segment scheduling engine, complete customer history at a glance, and at-a-glance business metrics. The primary outcome: maximise chair occupancy and daily revenue by eliminating unproductive gaps in the schedule.

> **Problem Statement:** Elena, a 6-chair salon owner, spends ~40 min/day manually reconciling commissions, refreshing legacy software, and firefighting scheduling gaps during colour processing windows. She has no quick way to see a customer's formula history before a service, and invoicing requires manual effort after every appointment. This dashboard eliminates all of that friction.

---

## 2. Primary User Persona

| Dimension | Detail |
|---|---|
| **Salon size** | 6 chairs, 8 stylists, single location |
| **Technical comfort** | Comfortable with web apps; no engineering background |
| **Primary device** | Desktop browser (Chrome/Safari) during business hours 08:00–20:00 |
| **Top goal** | See revenue, occupancy, customer history, and alerts without switching tabs |
| **Key pain — scheduling** | Chairs sit idle during colour processing; no tooling to double-book those windows |
| **Key pain — customers** | Formula notes are in a notebook; no quick lookup before a colour service |
| **Key pain — invoicing** | Creates invoices manually in a spreadsheet after each appointment |
| **Key pain — operations** | Manually calculates commissions; no real-time floor-to-dashboard sync |
| **Key pain — inventory** | Stockouts discovered mid-service because no proactive alerting |

---

## 3. Scope

### In Scope — Phase 1

- Owner-facing desktop dashboard (web, 1280px+ viewport minimum)
- Daily Pulse metric board: live revenue, occupancy rate, action alerts
- Multi-segment calendar grid with per-stylist columns and drag-and-drop
- Customer directory, profile pages, appointment history, and formula notes**
- Invoice creation, line-item editing, status lifecycle, and print layout**
- Staff utilisation heatmap (7-day view)
- Role-Based Access Control: Owner/Admin only for financial data
- GraphQL API with nested data support (Client → History → Formula Notes)
- WebSocket real-time sync infrastructure
- Webhook framework scaffold for async downstream jobs (no active consumers in Phase 1)

### Out of Scope — Phase 2+

- Mobile/tablet stylist-facing view
- Client-facing online booking portal
- Automated commission calculation and payroll export
- Inventory management beyond low-stock alerts
- Accounting software integrations (webhooks scaffolded now, activated Phase 2)
- SMS/email appointment reminders
- Multi-location support

---

## 4. System Architecture

### 4.1 High-Level Architecture

> The dashboard follows a three-tier architecture: React SPA frontend → GraphQL API layer → PostgreSQL + Redis data layer. A dedicated WebSocket server handles real-time push. All services containerised via Docker; deployed on cloud infrastructure (AWS/GCP — TBD by engineering).

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 18 + TypeScript | Dashboard SPA. Apollo Client for GraphQL. Socket.IO client for WebSocket. |
| API Gateway | GraphQL (Apollo Server) | Single endpoint for all data queries. Handles auth, nested resolvers, field-level permissions. |
| Real-Time | WebSocket (Socket.IO) | Bidirectional event push. Appointment state changes, inventory alerts, floor status updates. |
| Business Logic | Node.js / TypeScript | Service layer: booking engine, conflict resolution, occupancy calc, RBAC enforcement. |
| Database | PostgreSQL 15 | Primary data store: appointments, clients, stylists, services, inventory, formula notes, invoices. |
| Cache / Pub-Sub | Redis 7 | Session cache, WebSocket event bus, rate limiting, optimistic lock tokens. |
| Job Queue | Bull (Redis-backed) | Async jobs: webhook dispatch, inventory threshold checks, nightly analytics rollups. |
| Auth | JWT + OAuth 2.0 | Existing auth service (out of scope). Dashboard consumes JWTs with role claims. |

---

### 4.2 Core Data Models

Below are the minimum entity definitions engineering must implement to support all Phase 1 features.

#### Appointment

```sql
appointments
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  client_id       UUID REFERENCES clients(id)
  stylist_id      UUID REFERENCES stylists(id)
  service_id      UUID REFERENCES services(id)
  status          ENUM('pending','confirmed','in_progress','completed','cancelled')
  created_by      ENUM('online','owner','staff')
  booked_at       TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

appointment_segments  -- child table
  id              UUID PRIMARY KEY
  appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE
  segment_order   INT NOT NULL  -- 1, 2, 3...
  type            ENUM('busy','free')  -- free = double-bookable
  starts_at       TIMESTAMPTZ NOT NULL
  ends_at         TIMESTAMPTZ NOT NULL
  status          ENUM('pending','active','completed')
  CONSTRAINT no_overlap EXCLUDE USING gist (
    stylist_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  ) WHERE (type = 'busy')  -- only enforce on busy segments
```

#### Client

```sql
clients
  id              UUID PRIMARY KEY
  full_name       TEXT NOT NULL
  phone           TEXT
  email           TEXT UNIQUE
  is_vip          BOOLEAN DEFAULT false
  vip_since       DATE
  notes           TEXT
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

client_formula_notes  -- child table
  id              UUID PRIMARY KEY
  client_id       UUID REFERENCES clients(id)
  stylist_id      UUID REFERENCES stylists(id)
  service_date    DATE
  formula         JSONB  -- { brand, shade, developer, ratio, timing }
  notes           TEXT
  created_at      TIMESTAMPTZ
```

#### Stylist & Shifts

```sql
stylists
  id              UUID PRIMARY KEY
  full_name       TEXT NOT NULL
  role            ENUM('owner','admin','staff')
  is_active       BOOLEAN DEFAULT true
  avatar_url      TEXT

stylist_shifts  -- defines available working minutes for occupancy calc
  id              UUID PRIMARY KEY
  stylist_id      UUID REFERENCES stylists(id)
  shift_date      DATE NOT NULL
  starts_at       TIME NOT NULL
  ends_at         TIME NOT NULL
  UNIQUE(stylist_id, shift_date)
```

#### Invoice

```sql
invoices
  id              UUID PRIMARY KEY
  salon_id        UUID REFERENCES salons(id)
  client_id       UUID REFERENCES clients(id)
  appointment_id  UUID UNIQUE REFERENCES appointments(id)
  status          ENUM('draft','issued','paid','void')
  subtotal        DECIMAL(10,2)
  tip_amount      DECIMAL(10,2) DEFAULT 0
  tax_amount      DECIMAL(10,2) DEFAULT 0
  total           DECIMAL(10,2)
  paid_at         TIMESTAMPTZ
  notes           TEXT
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

invoice_line_items
  id              UUID PRIMARY KEY
  invoice_id      UUID REFERENCES invoices(id) ON DELETE CASCADE
  description     TEXT NOT NULL
  unit_price      DECIMAL(10,2)
  quantity        INT DEFAULT 1
  line_total      DECIMAL(10,2)
  type            TEXT  -- 'SERVICE' | 'RETAIL' | 'TIP'
```

#### Inventory

```sql
inventory_items
  id                   UUID PRIMARY KEY
  salon_id             UUID REFERENCES salons(id)
  name                 TEXT NOT NULL  -- e.g. 'Matrix Colour 7A'
  category             TEXT
  unit                 TEXT  -- 'g', 'ml', 'units'
  quantity             NUMERIC NOT NULL DEFAULT 0
  low_stock_threshold  NUMERIC NOT NULL DEFAULT 10
  supplier             TEXT
  updated_at           TIMESTAMPTZ DEFAULT now()
```

---

### 4.3 GraphQL Schema (Key Types & Queries)

This schema covers the queries needed for Phase 1 dashboard rendering. Engineering owns the full schema design; this is the minimum contract with the frontend.

```graphql
type Query {
  # Daily Pulse board
  dailyPulse(date: Date!): DailyPulse!
  actionAlerts(limit: Int = 20): [ActionAlert!]!

  # Calendar
  calendarGrid(date: Date!, stylistIds: [ID!]): [StylistColumn!]!

  # Appointment detail panel (single round-trip)
  appointmentDetail(id: ID!): AppointmentDetail!

  # Customer
  customerDetail(id: ID!): CustomerDetail!
  customerHistory(id: ID!, page: Int, limit: Int): CustomerHistoryPage!

  # Invoices
  invoice(id: ID!): Invoice!
  invoiceList(salonId: ID!, status: InvoiceStatus, date: Date): [Invoice!]!

  # Staff analytics
  utilisationHeatmap(startDate: Date!, endDate: Date!, stylistId: ID): HeatmapData!
}

type DailyPulse {
  date:             Date!
  revenueServices:  Float!
  revenueRetail:    Float!
  revenueTips:      Float!
  revenueTotal:     Float!
  occupancyRate:    Float!        # 0.0 – 100.0
  occupancyByChair: [ChairOccupancy!]!
}

type AppointmentDetail {
  id:       ID!
  status:   AppointmentStatus!
  service:  Service!
  stylist:  Stylist!
  segments: [AppointmentSegment!]!
  invoice:  Invoice            # null if not yet created
  client: {
    id, fullName, isVip, phone
    history:      [PastAppointment!]!  # last 10
    formulaNotes: [FormulaNotes!]!     # all notes for this service type
  }
}

type CustomerDetail {
  id:            ID!
  fullName:      String!
  email:         String
  phone:         String
  isVip:         Boolean!
  vipSince:      Date
  notes:         String
  totalVisits:   Int!
  lifetimeSpend: Float!
  lastVisit:     Date
  formulaNotes:  [FormulaNotes!]!
}

type CustomerHistoryPage {
  appointments: [PastAppointment!]!
  totalCount:   Int!
  page:         Int!
  totalPages:   Int!
}

type Invoice {
  id:            ID!
  status:        InvoiceStatus!
  client:        Client!
  appointment:   Appointment!
  subtotal:      Float!
  tipAmount:     Float!
  taxAmount:     Float!
  total:         Float!
  paidAt:        DateTime
  lineItems:     [InvoiceLineItem!]!
  notes:         String
  createdAt:     DateTime!
}

type Mutation {
  # Appointments
  rescheduleAppointment(id: ID!, segmentUpdates: [SegmentInput!]!): Appointment!
  approveAppointment(id: ID!): Appointment!
  updateAppointmentStatus(id: ID!, status: AppointmentStatus!): Appointment!

  # Customers
  createCustomer(input: CreateCustomerInput!): Customer!
  updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
  toggleVip(id: ID!, isVip: Boolean!): Customer!
  addFormulaNotes(input: FormulaNotesInput!): FormulaNotes!

  # Invoices
  createInvoice(input: CreateInvoiceInput!): Invoice!
  updateInvoice(id: ID!, input: UpdateInvoiceInput!): Invoice!
  issueInvoice(id: ID!): Invoice!
  markInvoicePaid(id: ID!): Invoice!
  voidInvoice(id: ID!): Invoice!
}
```

---

### 4.4 WebSocket Event Contract

All events use JSON payloads over Socket.IO. The dashboard subscribes to a salon-scoped room (`salon:{salonId}`) on connection. Engineering must implement both server emit and client handling for all events below.

| Event Name | Direction | Payload Shape | Triggers |
|---|---|---|---|
| `appointment.updated` | Server → Client | `{ appointmentId, segmentId, status, updatedAt }` | Stylist marks segment done on floor device |
| `appointment.created` | Server → Client | `{ appointment: AppointmentDetail }` | New booking confirmed (online or manual) |
| `appointment.conflict` | Server → Client | `{ slotId, conflictingIds: [ID] }` | Race condition: slot claimed by two sources simultaneously |
| `inventory.alert` | Server → Client | `{ itemId, name, quantity, threshold, type: 'LOW'|'OUT' }` | Item drops below `low_stock_threshold` or hits zero |
| `metrics.pulse` | Server → Client | `{ revenueTotal, occupancyRate, timestamp }` | Every 60s; keeps Daily Pulse live without full re-query |
| `calendar.lock` | Client → Server | `{ slotId, stylistId, lockedBy }` | Owner begins drag; optimistic lock on slot |
| `calendar.unlock` | Client → Server | `{ slotId }` | Drag cancelled or committed |

> **Race Condition Handling:** When `calendar.lock` is received for a slot already locked by another session, the server emits `appointment.conflict` to both clients. The owner's manual lock always wins. The online booking system must receive a structured conflict payload and surface the next available slot to the client automatically.

---

### 4.5 REST Endpoints (Non-GraphQL)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/refresh` | Public | Refresh JWT via refresh token. Returns new access token. |
| `GET` | `/health` | Public | Service health check. Returns `200 + { status, uptime }`. |
| `POST` | `/appointments/:id/reschedule` | Owner JWT | Move all segments atomically with conflict check. |
| `GET` | `/invoices` | Owner JWT | List invoices with optional `?status=&date=` filter. |
| `POST` | `/invoices` | Owner JWT | Create invoice from appointment; calculates totals from line items. |
| `PATCH` | `/invoices/:id` | Owner JWT | Update status, tip, notes. |
| `GET` | `/invoices/:id/print` | Owner JWT | Returns print-optimised HTML for PDF generation. |
| `GET` | `/customers` | Owner JWT | Paginated customer list with `?search=&sortBy=` support. |
| `POST` | `/customers` | Owner JWT | Create new customer record. |
| `PATCH` | `/customers/:id` | Owner JWT | Update customer details or VIP flag. |
| `POST` | `/customers/:id/formula-notes` | Owner/Admin JWT | Add formula note to customer record. |
| `GET` | `/exports/daily-report` | Owner JWT | Download today's revenue report as CSV. |
| `POST` | `/webhooks/register` | Owner JWT | Register an external webhook URL for appointment events. |
| `POST` | `/webhooks/test` | Owner JWT | Send a test payload to a registered webhook URL. |

---

## 5. Feature Requirements

### 5.1 Daily Pulse — Metric Board

The primary landing view. Owners must immediately understand business health without any navigation. All figures update via WebSocket push (`metrics.pulse` event) every 60 seconds; no manual refresh required.

| ID | Requirement | Description & Acceptance Criteria | Priority |
|---|---|---|---|
| FR-1.1 | Revenue Breakdown | Display today's total revenue split into Services, Retail, and Tips. Each segment shows absolute value and % share. All three values update within 60s of a transaction completing. Zero-state shows `0.00` not blank. | Must Have |
| FR-1.2 | Chair Occupancy Rate | Display `(Minutes Booked ÷ Total Available Working Minutes) × 100` using stylist shift data as denominator. Show per-chair and salon aggregate. Updates within 2s of any appointment segment status change. If no shift data exists for a stylist, exclude them from denominator with a visible warning icon. | Must Have |
| FR-1.3 | Action Centre Sidebar | Persistent sidebar with prioritised alerts: (1) Low inventory, (2) VIP appointments pending approval, (3) Schedule conflicts. Each card has one primary CTA (Approve / Order / Resolve). Alerts appear within 2s of triggering event via WebSocket. Max 20 alerts; oldest dismissed first when limit exceeded. | Must Have |
| FR-1.4 | Date Navigator | Toggle between Today (default), Yesterday, and custom date range (max 90 days) for all metric board figures. Historical view is read-only. | Should Have |
| FR-1.5 | Trend Indicators | Each metric card shows a directional arrow (+/- %) vs same day last week. Computed server-side in `dailyPulse` resolver. If prior week data unavailable, hide indicator rather than show 'N/A'. | Nice to Have |

---

### 5.2 Multi-Segment Calendar Grid

The scheduling engine is the operational core of the dashboard. It handles the unique complexity of salon services — where a single appointment spans multiple activity phases, some of which free the stylist to take a second client simultaneously.

> **Key Concept: Multi-Segment Booking.** A colour service splits into three phases: **Segment 1 — Application** (Stylist Busy, 20 min) → **Segment 2 — Processing** (Stylist Free — can be double-booked, 45 min) → **Segment 3 — Finishing** (Stylist Busy, 30 min). The calendar renders all three as a linked visual chain within the stylist's column. Only Free segments accept concurrent bookings without owner action.

| ID | Requirement | Description & Acceptance Criteria | Priority |
|---|---|---|---|
| FR-2.1 | Multi-Column Stylist View | Each active stylist occupies a vertical column. Owner toggles 1–8 visible columns. Column order is drag-and-drop configurable and persists per owner session. Minimum column width 140px; overflow at 8+ stylists enables horizontal scroll with sticky time axis. | Must Have |
| FR-2.2 | Multi-Segment Appointments | Appointments may contain up to 5 linked segments (Busy or Free). Free segments render with a hatched pattern and badge 'Open to double-book'. Linked segments connected by a vertical thread line. Dropping a booking onto a Busy segment is blocked. Max 5 segments validated both client and server-side. | Must Have |
| FR-2.3 | Real-Time Sync | Calendar state updates on `appointment.updated` WebSocket event within 2s. No page reload required. Optimistic UI rolls back if API returns error. Reconnect logic: if WebSocket drops, poll every 10s as fallback. | Must Have |
| FR-2.4 | Drag-and-Drop Rescheduling | Owner drags appointment to new time/stylist. Snap-to-grid: 15-min intervals. Conflict detection before drop. `calendar.lock` event sent on drag start. API sync completes <500ms P95. On API error, revert to original position with toast. | Must Have |
| FR-2.5 | Appointment Detail Panel | Click any segment → slide-over panel: client name + VIP badge, service name, stylist, full segment timeline, last 5 formula notes for this service type, invoice status with 'Create Invoice' CTA if none exists, and status action buttons. Loaded via `appointmentDetail` query (single round-trip). Panel opens within 300ms. | Should Have |
| FR-2.6 | Quick Add Appointment | Click empty slot → modal: select client (typeahead, debounced 200ms), service (auto-fills segment durations from template), stylist. Conflict check runs before modal confirm button is enabled. | Should Have |

---

### 5.3 Customer Directory & Profile

A complete customer management view so owners can look up any client's history, formula notes, and invoices without leaving the dashboard.

| ID | Requirement | Description & Acceptance Criteria | Priority |
|---|---|---|---|
| FR-C1 | Customer Directory | Searchable, sortable table at `/customers`. Columns: name, phone, email, VIP badge, last visit date, lifetime spend, total visits. Search filters by name or email in <200ms (client-side for first 500 records). Clicking a row navigates to `/customers/:id`. Zero-state shows 'No customers found' illustration. | Must Have |
| FR-C2 | Customer Profile Header | At `/customers/:id`: avatar initials, full name, VIP toggle (Owner/Admin only, optimistic update), phone, email, member-since date, stat pills — Total Visits, Lifetime Spend, Last Visit. VIP toggle fires `toggleVip` mutation; reverts with toast on error. | Must Have |
| FR-C3 | Appointment History | Paginated list (10 per page) of past appointments per customer. Each row: date, service name, stylist name, duration, status badge, total paid. Expanding a row shows segment timeline and a 'View Invoice' link. Sorted newest first. | Must Have |
| FR-C4 | Formula Notes | Grouped by service type, sorted newest first, max 5 per group with 'Show all' expand. Each card shows: service date, stylist, formula fields (brand, shade, developer, ratio, timing), free-text notes. Owner/Admin can add a note via `<FormulaNoteModal />` — all fields required. | Must Have |
| FR-C5 | Customer Notes | Free-text notes panel on the profile page, auto-saved with 1s debounce. 'Saved' indicator appears briefly on save. | Should Have |
| FR-C6 | Add Customer | `<AddCustomerModal />` reachable from directory header: collects name, phone, email, VIP flag, notes. Name is required. Duplicate email shows inline validation error. On success, new customer appears at top of directory list optimistically. | Should Have |

---

### 5.4 Invoice & Billing

Full invoice lifecycle management, triggered from appointments and manageable from a standalone invoice list.

| ID | Requirement | Description & Acceptance Criteria | Priority |
|---|---|---|---|
| FR-I1 | Invoice List | `/invoices`: table of all invoices — invoice #, customer name, date, services total, tip, tax, grand total, status badge (DRAFT / ISSUED / PAID / VOID). Filter by status and date range. Search by customer name or invoice number. PAID rows visually de-emphasised. | Must Have |
| FR-I2 | Invoice Detail Page | `/invoices/:id`: salon header, customer block, editable line items table (description, unit price, qty, line total), subtotal / tip / tax / grand total summary, status action buttons (Issue, Mark Paid, Void). Editing a line item quantity recalculates totals in real time (client-side). Voiding a PAID invoice shows confirmation modal. | Must Have |
| FR-I3 | Create Invoice from Appointment | 'Create Invoice' button in `<AppointmentDetailPanel />`. Auto-populates one SERVICE line item from appointment service + base price. Owner can add RETAIL or TIP line items manually. Tax rate field (%). Preview before save. On save, navigates to `/invoices/:id`. Appointment detail panel badge updates to 'Invoice Created'. | Must Have |
| FR-I4 | Invoice Status Lifecycle | DRAFT → ISSUED (sends to customer record) → PAID (sets `paid_at` timestamp) → VOID. Each transition requires explicit owner action. Voiding a PAID invoice requires confirmation. Status changes reflect immediately in the invoice list via optimistic update. | Must Have |
| FR-I5 | Print / PDF Layout | 'Print / Save PDF' button triggers `window.print()` with a print-optimised CSS layout (`@media print`): salon logo, address, customer details, line items table, totals, payment status watermark (PAID in green, VOID in red). No nav bars or action buttons in print view. | Should Have |
| FR-I6 | Revenue Contribution | Invoice totals feed directly into the Daily Pulse revenue breakdown (FR-1.1). `revenueServices` = sum of SERVICE line items from PAID invoices today. `revenueRetail` = sum of RETAIL line items. `revenueTips` = sum of TIP line items. | Must Have |

---

### 5.5 Staff & Analytics

| ID | Requirement | Description & Acceptance Criteria | Priority |
|---|---|---|---|
| FR-3.1 | Weekly Utilisation Heatmap | 7-day × business-hours grid; 30-min slots. Colour intensity: white (0%), light blue (1–50%), medium (51–80%), brand blue (81–100%). Filter by stylist or salon aggregate. Hover tooltip: stylist name, slot time, booking count, occupancy %. Export to CSV available. | Must Have |
| FR-3.2 | Role-Based Access Control | Entire dashboard restricted to Owner/Admin JWT role. Staff role redirected to their personal schedule view. Financial data never in API response for Staff tokens — enforced at GraphQL resolver level, not just UI. QA must verify Staff JWT returns 403 on `dailyPulse`, `utilisationHeatmap`, and `actionAlerts` queries. | Must Have |
| FR-3.3 | Revenue Trend Sparkline | 7-day and 30-day sparkline under the revenue card. Optional overlay: same period prior month. Defaults off. | Nice to Have |

---

## 6. Non-Functional Requirements

| Category | Requirement | Target / Threshold | Test Method |
|---|---|---|---|
| Performance | Dashboard initial load (metric board + first 24h calendar) | < 1.5s (P95) | Lighthouse CI on every PR |
| Performance | Calendar drag-and-drop visual update (optimistic UI) | Instant (<50ms) | Manual + Cypress E2E |
| Performance | Background API sync after drag-and-drop | < 500ms (P95) | Datadog APM trace |
| Performance | WebSocket event → visible calendar update | < 2,000ms (P95) | Load test: 50 concurrent sessions |
| Performance | Appointment detail panel open | < 300ms (P95) | Cypress component test |
| Performance | Customer profile page initial load | < 1.0s (P95) | Lighthouse CI |
| Performance | Invoice list page initial load | < 1.0s (P95) | Lighthouse CI |
| Data Integrity | Concurrent slot booking conflict resolution | Zero silent data loss; fallback <1s | Integration test: 2 simultaneous bookings on same slot |
| Data Integrity | Nested data round-trips (Client + History + Formula) | Single GraphQL round-trip; payload <50 KB | Apollo Client network inspector |
| Data Integrity | Invoice total = sum of line items + tax | Enforced server-side on create and update | Unit test on invoice service |
| Scalability | Concurrent WebSocket sessions | 50 stylists + 10 owners without degradation | k6 load test |
| Scalability | API design future-proofing | No architecture changes to support up to 50 stylists | Architecture review sign-off |
| Security | Financial endpoint RBAC | Staff JWT returns 403 on all financial queries | Automated security test in CI |
| Security | JWT expiry and refresh | Access token: 15 min. Refresh token: 7 days. | Auth service spec (existing) |
| Availability | Dashboard uptime (business hours 07:00–21:00 local) | > 99.5% monthly | Uptime monitor (PagerDuty/Datadog) |
| Accessibility | WCAG 2.1 AA compliance for all owner-facing views | No critical/serious violations | axe-core automated scan + manual keyboard test |

---

## 7. Role-Based Access Control Matrix

Engineering must implement RBAC at the API resolver layer. The UI layer may hide elements for UX, but must never be the sole enforcement mechanism.

| Feature / Data | Owner | Admin | Staff |
|---|---|---|---|
| Daily Pulse — revenue figures | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Daily Pulse — occupancy rate | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Action Centre — all alerts | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Calendar — view all stylists | ✅ Full access | ✅ Full access | ⚠️ Own column only |
| Calendar — reschedule any appointment | ✅ Full access | ✅ Full access | ⚠️ Own appointments only |
| Calendar — approve VIP appointments | ✅ Full access | ✅ Full access | ❌ Blocked |
| Utilisation Heatmap | ✅ Full access | ✅ View only | ❌ Blocked (403) |
| Appointment detail — formula notes | ✅ Full access | ✅ Full access | ⚠️ Own clients only |
| Appointment detail — revenue/tip data | ✅ Full access | ⚠️ Aggregate only | ❌ Blocked (403) |
| Customer directory | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Customer profile — lifetime spend | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Customer VIP toggle | ✅ Full access | ✅ Full access | ❌ Blocked |
| Invoice list | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Invoice create / edit | ✅ Full access | ✅ Full access | ❌ Blocked (403) |
| Invoice — mark paid / void | ✅ Full access | ⚠️ Issue only | ❌ Blocked |
| Webhook management | ✅ Full access | ❌ Blocked | ❌ Blocked |
| Staff shift management | ✅ Full access | ✅ Full access | ❌ Blocked |

---

## 8. Error States & Edge Cases

Engineering and Design must account for all states below. Each must have a defined UI treatment — no blank screens or unhandled exceptions.

| Scenario | Expected Behaviour | UI Treatment |
|---|---|---|
| WebSocket disconnects mid-session | Auto-reconnect within 5s. Fall back to 10s polling if reconnect fails 3 times. | Subtle banner: 'Reconnecting…'; disappears on reconnect. |
| Stylist has no shift data for today | Exclude from occupancy denominator. Include in calendar column. | Tooltip on their column: 'No shift data — contact admin.' |
| Appointment drag lands on locked slot | Server returns 409 Conflict. Optimistic UI reverts. | Toast: 'Slot unavailable — already being modified.' |
| Two owners race to approve same VIP appointment | First approval wins (optimistic lock). Second gets 409. | Second owner sees toast: 'Already approved by [name].' Alert auto-removed from sidebar. |
| Client books same slot owner is assigning | Owner's action wins. Client booking system receives conflict payload. | Owner sees no interruption. Client booking portal shows next available slot. |
| GraphQL query returns partial error | Apollo Client partial data policy: render available data; surface error for failed fields. | Affected metric card shows 'Unable to load' with retry button. |
| Inventory item hits zero (not just low) | Emit `inventory.alert` with `quantity: 0`. Distinguish from low-stock. | Action Centre card turns red; label: 'OUT OF STOCK' vs orange 'Low Stock'. |
| No bookings for today | Daily Pulse shows all zeros. Calendar shows empty columns. | Zero-state illustration with prompt: 'No appointments yet today.' |
| Salon has >8 stylists | Horizontal scroll on calendar. Sticky time axis. | Scroll indicator visible. Owner can pin favourite stylists to first positions. |
| Customer has no appointment history | History tab renders empty state. | Illustration: 'No visits yet — book their first appointment.' with link to calendar. |
| Customer has no formula notes | Formula notes section renders empty state. | 'Add the first formula note' CTA with link to `<FormulaNoteModal />`. |
| Invoice total mismatch (line items don't sum to total) | Server rejects with 422 and error detail. | Toast: 'Invoice total mismatch — please check line items.' Inline field highlighted. |
| Voiding a PAID invoice | Requires explicit confirmation. Sets status to VOID, preserves `paid_at` for audit trail. | Confirmation modal: 'This invoice has been paid. Voiding cannot be undone.' Red confirm button. |

---

## 9. Frontend Component Map

Reference component breakdown for engineering and design handoff. State management: React Context for session-level state; Apollo Client cache for server state; `useState` for UI-only state.

| Component | Maps to FR | Key Props / State | Notes |
|---|---|---|---|
| `<DashboardLayout />` | All | `role, salonId` | Top-level shell. Renders sidebar + main content area. |
| `<DailyPulseBoard />` | FR-1.1–1.5 | `date, metrics: DailyPulse` | Subscribes to `metrics.pulse` WS event. Re-queries on date change. |
| `<MetricCard />` | FR-1.1, 1.2 | `label, value, trend, loading` | Skeleton loader on initial fetch. Animates number on update. |
| `<ActionCentreSidebar />` | FR-1.3 | `alerts: ActionAlert[]` | Subscribes to `inventory.alert` + `appointment.conflict` WS events. |
| `<AlertCard />` | FR-1.3 | `alert, onAction` | Variants: low-stock / out-of-stock / vip-pending / conflict. |
| `<DateNavigator />` | FR-1.4 | `value, onChange, maxRange=90` | Today / Yesterday / Custom range picker. |
| `<CalendarGrid />` | FR-2.1–2.6 | `date, stylists, appointments` | Virtual scroll for performance. Manages drag state. |
| `<StylistColumn />` | FR-2.1 | `stylist, segments, date` | Renders time slots. Emits `calendar.lock` on drag start. |
| `<AppointmentBlock />` | FR-2.2 | `appointment, segments` | Multi-segment visual chain. Hatched pattern for Free segments. |
| `<AppointmentDetailPanel />` | FR-2.5 | `appointmentId, isOpen` | Slide-over. Fetches `appointmentDetail` on open. Shows 'Create Invoice' CTA. |
| `<QuickAddModal />` | FR-2.6 | `slotTime, stylistId` | Client typeahead, service picker, conflict check gate. |
| `<CustomerTable />` | FR-C1 | `customers, onSearch, onSort` | Client-side search/sort for first 500 records. |
| `<CustomerProfileHeader />` | FR-C2 | `customer, onVipToggle` | VIP toggle visible for Owner/Admin only. Optimistic update. |
| `<AppointmentHistoryList />` | FR-C3 | `customerId, page` | Paginated, 10 per page. Expandable rows with segment detail. |
| `<FormulaNotesList />` | FR-C4 | `customerId, serviceType?` | Grouped by service type. 'Show all' expand per group. |
| `<FormulaNoteModal />` | FR-C4 | `customerId, stylistId, onSave` | All formula fields required. Optimistic list update on save. |
| `<CustomerNotes />` | FR-C5 | `customerId, initialNotes` | Debounced 1s auto-save. 'Saved' indicator. |
| `<AddCustomerModal />` | FR-C6 | `onSuccess` | Validates name required, email uniqueness. |
| `<InvoiceListPage />` | FR-I1 | `filters: { status, date, search }` | Status filter + date range + search by name/number. |
| `<InvoiceDetailPage />` | FR-I2 | `invoiceId` | Editable line items. Real-time total recalculation. |
| `<CreateInvoiceFlow />` | FR-I3 | `appointmentId, onSuccess` | Pre-populates from appointment. Add RETAIL/TIP line items manually. |
| `<InvoicePrintLayout />` | FR-I5 | `invoice` | `@media print` CSS. PAID/VOID watermark. No nav/action buttons. |
| `<UtilisationHeatmap />` | FR-3.1 | `startDate, endDate, stylistId` | 7 × N grid. Colour scale via CSS custom properties. |

---

## 10. Success Metrics & KPIs

Measured at 30 and 90 days post-launch across the pilot cohort.

| KPI | Definition | Phase 1 Target | Owner |
|---|---|---|---|
| Dashboard DAU | Unique owner logins per day | >80% of pilot owners daily by Day 30 | Product |
| Processing Gap Reduction | % decrease in unbooked stylist minutes during Free segments | >20% vs pre-launch 2-week baseline | Product + Ops |
| Calendar Sync Latency | P95: floor update → owner calendar visible change | <2,000ms | Engineering |
| Drag-and-Drop Sync | P95: background API sync after reschedule | <500ms | Engineering |
| Initial Load Time | P95 dashboard load on 10 Mbps connection | <1.5s | Engineering |
| Invoice Adoption | % of completed appointments that generate an invoice within 24h | >60% by Day 60 | Product |
| Customer Profile Usage | % of sessions that include a customer profile page view | >40% by Day 30 | Product |
| CSAT (Pilot) | Post-onboarding: 'This saves me time' survey score | >4.0 / 5.0 | Product |
| Error Rate | GraphQL error rate (non-403) in production | <0.5% of requests | Engineering |

---

## 11. Open Questions

| # | Question | Owner | Needed By |
|---|---|---|---|
| Q1 | Shift data source: does the salon configure shifts in this system, or integrate with an existing HR tool? Affects occupancy denominator (FR-1.2) and `stylist_shifts` table design. | Product + Eng | Sprint 1 |
| Q2 | Inventory threshold ownership: who sets `low_stock_threshold` per product — owner manually, or auto-calculated from usage history? Affects alert logic. | Product | Sprint 1 |
| Q3 | VIP classification criteria: revenue threshold, appointment frequency, or manual flag only? Affects `is_vip` logic and Action Centre FR-1.3. | Product | Sprint 1 |
| Q4 | WebSocket infrastructure: existing service or greenfield? Greenfield adds ~1.5 sprints to timeline. | Engineering | Day 1 |
| Q5 | Pilot cohort size: how many concurrent salon owners in Phase 1? Affects WebSocket load test targets and Redis sizing. | Product | Week 2 |
| Q6 | Invoice tax handling: flat rate per salon, configurable per service, or per line item? Affects `CreateInvoiceInput` schema and UI. | Product | Sprint 2 |
| Q7 | Auth service integration: is there an existing JWT service with role claims, or does Phase 1 include building auth from scratch? | Engineering | Day 1 |
| Q8 | Customer deduplication: what happens if two staff members add the same customer with slightly different names? Is there a merge flow in Phase 1? | Product | Sprint 2 |

---

## 12. Indicative Timeline

> Dates below are indicative placeholders pending engineering estimation. Q4 and Q7 (open questions) must be resolved before Sprint 1 begins or timelines will slip. Full milestone breakdown is in `IMPLEMENTATION_PLAN.md`.

| Milestone | Target | Deliverable | Dependencies |
|---|---|---|---|
| PRD Sign-off | Week 1 | This document approved by all stakeholders | All stakeholder reviews complete |
| Design Handoff | Week 3 | Hi-fi Figma screens for all FR-1.x, FR-2.x, FR-C.x, FR-I.x | Open Questions Q1–Q3 resolved |
| Engineering Kickoff + Schema Draft | Week 4 | GraphQL schema draft + WebSocket architecture decision | Q4, Q7 resolved; auth service confirmed |
| M1–M2 Frontend (Setup + Daily Pulse) | Week 6 | Design system, MSW layer, metric board UI | DB schema finalised |
| M3 Frontend (Calendar) | Week 8 | Full calendar grid, drag-and-drop, detail panel | — |
| M4 Frontend (Analytics + RBAC) | Week 9 | Heatmap, RBAC shell, all error states | — |
| M5 Frontend (Customer) | Week 10 | Customer directory, profile, history, formula notes | M3 complete |
| M6 Frontend (Invoice) | Week 11 | Invoice list, detail, create flow, print layout, API contract locked | M5 complete |
| M7–M9 Backend (API + WebSocket) | Weeks 9–13 | All REST + GraphQL endpoints live; WebSocket layer | Running in parallel with M5–M6 |
| M10 Integration | Week 14 | MSW replaced with live API across all features | M6 + M9 complete |
| M11 QA & Launch Prep | Week 16 | Load test, RBAC sweep, axe-core, Docker Compose, stakeholder demo | M10 complete |

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| **Busy Segment** | A time block in a multi-segment appointment where the stylist is actively engaged. Cannot be double-booked. Enforced by PostgreSQL EXCLUDE constraint. |
| **Free Segment** | A time block where the stylist is not actively engaged (e.g. colour processing). Can accept a concurrent booking. Rendered with hatched pattern on calendar. |
| **Chair Occupancy Rate** | (Minutes Booked ÷ Total Available Working Minutes) × 100. Denominator derived from `stylist_shifts` table. |
| **Action Centre** | Persistent sidebar displaying time-sensitive owner alerts in priority order: inventory, VIP approvals, conflicts. |
| **Formula Notes** | Colour/treatment formula records (brand, shade, developer, ratio, timing) stored per client per service date. Visible in appointment detail panel and customer profile. |
| **Invoice Lifecycle** | DRAFT → ISSUED → PAID → VOID. Each transition is an explicit owner action. Voiding a PAID invoice requires confirmation and preserves `paid_at` for audit. |
| **Optimistic UI** | UI updates immediately on owner action before API confirmation. Reverts if API returns an error. |
| **Optimistic Lock** | Server-side mechanism using Redis to hold a slot reservation during drag-and-drop. Released on commit or cancel. Expires after 30s. |
| **RBAC** | Role-Based Access Control. Enforced at GraphQL resolver layer. Roles: Owner, Admin, Staff. |
| **WebSocket** | Persistent bidirectional connection (Socket.IO) between dashboard client and server. Used for real-time calendar sync and alerts. |
| **GraphQL** | API query language. Enables the dashboard to fetch nested data (Client → History → Formula Notes) in a single network round-trip. |
| **Webhook** | HTTP callback triggered by server-side event (e.g. `appointment.completed`). Scaffolded in Phase 1; active consumers in Phase 2. |
| **MSW** | Mock Service Worker. Intercepts API calls in the browser during frontend development (M1–M6) so the UI can be built and validated without a live backend. |
| **Bull Queue** | Redis-backed job queue for async background tasks: webhook dispatch, inventory checks, analytics rollups. |