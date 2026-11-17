# Product Requirements — Retail Platform

## 1. Product principles

1. Product quality and real user needs determine scope; external demonstrations do not.
2. The shop has one branch, but the domain model must not create artificial limits that prevent future extension.
3. The server is authoritative for prices, discounts, stock, order state and payment state.
4. Every stock-affecting action creates an immutable movement record.
5. Payment confirmation must be verified server-to-server; a browser redirect is never proof of payment.
6. Offline operations must be explicit about pending, synced, rejected and conflicting actions.
7. Every privileged action is authorized and auditable.
8. No feature is declared complete solely because its UI exists.

## 2. Users and access

- Shop owner: full business configuration, staff, products, stock, suppliers, orders, returns, reports and audit access.
- Manager: operational access granted by the owner; financial and staff permissions configurable.
- Cashier: customer assistance, POS/cart checkout, cash recording and permitted order operations.
- Inventory staff: catalogue availability, stock counts, receiving and adjustments according to permissions.
- Fulfilment staff: picking, packing, collection handover and delivery status updates.
- Customer account: profile, addresses, orders, returns and notifications.
- Guest customer: browse, purchase and access an order using a secure order lookup mechanism.

Permissions are capability-based and checked by the API on every protected operation. Hiding a button is not authorization.

## 3. Functional domains

### Identity and access
Registration, login, logout, password reset, email/phone verification hooks, session revocation, role/permission assignment, account suspension and secure guest-order access.

### Shop configuration
Business profile, contact details, currency (KES default), timezone, tax settings, receipt details, collection instructions, delivery zones/fees, payment methods, notification settings and operational policies.

### Catalogue
Products, categories, SKU, barcode, descriptions, images, variants, cost and selling prices, tax category, active/archived state, low-stock threshold and customer visibility.

### Inventory
On-hand, reserved, available and reorder quantities; receiving; adjustment with reason; stock count; reservation/release/commit; movement ledger; low-stock alerts; duplicate and concurrent update protection.

### Suppliers and purchasing
Supplier contacts and status; purchase orders; line items; expected quantities/costs; partial receiving; rejected/damaged quantities; supplier references; purchase history and payable summaries.

### Customer commerce
Search, filter, sort, product detail, availability, cart persistence, guest/account checkout, address/contact capture, delivery/collection selection, promotion validation, authoritative totals and order confirmation.

### Payments
Cash collection/delivery recording; simulated provider for development/demo; M-Pesa Daraja STK Push, callback validation, transaction references, timeout/pending handling, reconciliation, duplicate callback idempotency and refunds where supported. Secrets are server-only.

### Orders and fulfilment
Order history, status transitions, picking, packing, collection-ready, collection handover, delivery assignment, dispatch, delivery confirmation, failed delivery and cancellation rules. Every transition is validated and recorded.

### Returns and exchanges
Return request, eligibility policy, item/quantity/reason, inspection, disposition (restock, damaged, supplier return), refund or exchange, stock movement and audit history.

### Staff
Invitations/account provisioning, role templates, custom permissions, activation/suspension, last-login visibility and action audit.

### Reporting
Sales, orders, payment methods, refunds, taxes, discounts, inventory valuation, stock movement, low-stock, supplier purchasing and staff activity. Date filters, CSV export and permission enforcement.

### Offline operation
Installable PWA; cached application shell; IndexedDB catalogue snapshot and permitted operational data; durable outbox; idempotency keys; retry/backoff; sync status; conflict handling; explicit restrictions for payments and other operations requiring live provider confirmation. Offline cash/POS operations may be queued with clear pending state and reconciled on reconnect. Never claim a payment is confirmed offline.

### Notifications
In-app notification centre and provider adapters for email/SMS/WhatsApp where configured. Delivery attempts, retry policy, templates and opt-out/preferences where applicable.

### Audit and administration
Append-only audit events for sensitive actions, actor, timestamp, target, before/after summary, request correlation and source. Retention/export controls and backup/restore procedures.

## 4. Core business invariants

- Available stock = on-hand minus active reservations; never sell below available stock unless an explicit owner policy allows backorders.
- Cart prices are indicative; checkout recalculates prices, discounts, tax, delivery fees and availability on the server.
- A successful order creation and stock reservation/commit must be atomic or recoverable through an explicit transaction/outbox strategy.
- Payment status and order status are separate state machines.
- A payment callback can be processed repeatedly without duplicate financial or order effects.
- Refunds cannot exceed captured/settled payment value.
- Returns do not automatically increase sellable stock until inspection disposition permits restocking.
- Order and payment state transitions are validated; arbitrary client-supplied status updates are rejected.
- All monetary values use integer minor units (KES cents) or a rigorously defined decimal representation; never binary floating-point arithmetic for money.
- Every mutation validates input, authenticates the actor, authorizes the action and records appropriate audit evidence.

## 5. Quality attributes

Security: password hashing, secure cookies/token strategy, CSRF protection where cookie auth is used, rate limiting, input validation, output encoding, secret management, least privilege, webhook verification, dependency hygiene and secure headers.

Reliability: health checks, structured logs, request IDs, idempotency, retry-safe jobs, graceful shutdown, backup/restore and clear degraded-mode behaviour.

Performance: pagination, indexes, bounded queries, image optimization, caching where safe and no unbounded report queries.

Accessibility: keyboard operation, semantic structure, labels, visible focus, contrast and responsive layouts.

Maintainability: modular domain boundaries, shared validation/contracts, migrations/index management, automated tests and clear runbooks.

Privacy: collect only necessary customer data, restrict staff visibility, protect exports and define retention/deletion processes consistent with applicable law.
