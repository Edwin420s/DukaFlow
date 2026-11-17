# Kane CLI Verification & AI Coding Agent Closed-Loop Integration

This document outlines the Kane CLI automated verification suite, the test execution procedures, and the closed-loop agent repair workflow implemented for DukaFlow.

---

## 1. Test Suite Structure

The Kane CLI verification suite is organized under `tests/kane/` as natural-language test markdown files:

| File | Module Verified | Key Assertions |
| :--- | :--- | :--- |
| `01_customer_browse_and_cart_test.md` | Customer Storefront | Catalog display, category filter, KES pricing, dynamic cart quantity updates |
| `02_coupon_and_checkout_test.md` | Checkout & M-Pesa | Coupon calculation (`KARIBU10`), delivery zone fees, STK Push initiation |
| `03_pos_cashier_sale_test.md` | Point of Sale (POS) | Barcode search, live cart, cash tendered & change calculation, instant receipt |
| `04_inventory_adjustment_and_ledger_test.md` | Inventory Invariants | On-hand vs reserved math, mandatory adjustment reasons, immutable ledger |
| `05_order_fulfilment_lifecycle_test.md` | Order Lifecycle | Valid state machine (`Pending` → `Confirmed` → `Preparing` → `Completed`) |
| `06_returns_and_restock_test.md` | Returns & Restock | Inspection disposition, restock stock increase, ledger entry |

---

## 2. Executing Kane CLI Tests

### Prerequisites
- Install Kane CLI globally:
  ```bash
  npm install -g @testmuai/kane-cli
  ```
- Start the DukaFlow application:
  ```bash
  npm run dev
  ```
  (App runs API on `http://localhost:4000` and Client on `http://localhost:5173`)

### Running Individual Tests
```bash
kane-cli testmd run tests/kane/01_customer_browse_and_cart_test.md --agent
kane-cli testmd run tests/kane/02_coupon_and_checkout_test.md --agent
kane-cli testmd run tests/kane/03_pos_cashier_sale_test.md --agent
```

### Running Entire Verification Suite
```bash
kane-cli testrun run --tags retail --parallel 2
```

---

## 3. The AI Agent Closed-Loop Repair Story

A central capability demonstrated in DukaFlow is the closed-loop feedback mechanism between the AI coding agent and Kane CLI:

```
+─────────────────────────────────────────────────────────────+
|                AI Coding Agent + Kane CLI Loop              |
+─────────────────────────────────────────────────────────────+
                               |
               1. Kane executes verification flow
                               |
                               v
                     [ Controlled Defect ]
               (e.g., checkout allowed negative stock)
                               |
                               v
               2. Kane CLI records failure evidence
                  (NDJSON failure log + screenshot)
                               |
                               v
               3. Agent ingests failure diagnosis
                  (Identifies race condition in stock)
                               |
                               v
               4. Agent modifies backend service
                  (Applies atomic $expr update in MongoDB)
                               |
                               v
               5. Kane CLI reruns exact testmd flow
                               |
                               v
               6. GREEN PASS: Evidence Pack Sealed
```

### Controlled Defect Scenario: Concurrent Stock Reservation
- **Scenario**: When two concurrent shoppers attempt to purchase the last item in stock.
- **Initial State**: A non-atomic check allowed both requests to proceed, driving `available` below zero.
- **Kane Failure**: Kane CLI asserted `available >= 0`, but caught `available == -1` and emitted a failure event.
- **Agent Diagnosis**: Identified that a read-then-write pattern in `stockService.js` was susceptible to race conditions.
- **Code Correction**: Refactored `reserveStock` to use atomic MongoDB `findOneAndUpdate` with `$expr: { $gte: [{ $subtract: ['$onHand', '$reserved'] }, quantity] }`.
- **Rerun Verification**: Kane CLI re-executed the checkout flow with concurrent threads. The second reservation was cleanly rejected with `INSUFFICIENT_STOCK`. Test passed 100%.

---

## 4. Acceptance Criteria Checklist

- [x] **KANE-001**: Application runnable with single command (`npm run dev`).
- [x] **KANE-002**: Meaningful end-to-end browser workflows exercised (Storefront, Checkout, POS, Fulfilment).
- [x] **KANE-003**: Controlled defect scenario defined and verified.
- [x] **KANE-004**: Closed loop failure diagnostics ingested and resolved.
- [x] **KANE-005**: 100% reproducible test suite committed in repository.
