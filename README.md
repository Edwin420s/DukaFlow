# DukaFlow — Smart Digital Commerce & Operations Platform

DukaFlow is a clean, production-grade retail commerce and business operations platform built for modern retail businesses and micro-retailers in Kenya and East Africa. It unites customer storefront ordering, rapid point-of-sale (POS), authoritative inventory tracking, purchase orders, returns disposition, and M-Pesa Daraja payment integration in a modular architecture.

---

## 1. System Architecture

- **Backend**: Node.js (ESM), Express.js, MongoDB (Mongoose), Zod contracts, Jose JWT authentication.
- **Frontend**: React 18, Vite, React Router 7, Lucide Icons.
- **Persistence & Audit**: Immutable Stock Movement Ledger, Append-Only Compliance Audit Logs.
- **Payments**: Safaricom M-Pesa Daraja STK Push (idempotent webhooks), Cash at POS (with cash tendered and change calculator), and Instant Simulation.
- **Monetary Representation**: Integer minor units (KES cents) throughout the domain model to eliminate binary floating-point roundoff issues.

---

## 2. Key Modules & Features

### 🛍️ Customer Storefront (`/storefront`)
- **Product Catalog**: Live search, category filtering, availability badges ("In Stock", "Only X Left", "Out of Stock").
- **Authoritative Cart**: Server-calculated pricing, tax, coupons, and delivery zones. Front-end prices are never authoritative.
- **Multi-Step Checkout**:
  - Express collection (In-Store Pickup) vs Doorstep Delivery (dynamic zone pricing: Nairobi CBD, Westlands, Kilimani, Karen).
  - Promotional coupon engine (e.g. `KARIBU10` for 10% off, `DUKA200` for KES 200 off).
  - Integrated payment selection: M-Pesa STK Push, Cash on Delivery/Pickup, or Online Card/Simulation.
- **Order Tracking & Receipt**:
  - Visual step progress timeline (`Placed` → `Confirmed` → `Packing` → `Out for Delivery / Ready` → `Completed`).
  - Printable receipt formatted for thermal or standard A4 printing.

### ⚡ Rapid Point of Sale (POS) (`/pos`)
- High-speed cashier interface with instant barcode / SKU search.
- Live active cart on right panel.
- Built-in cash tender calculator with real-time change calculation.
- 1-click completed sale with automatic stock commit and thermal receipt printing.

### 📦 Inventory & Stock Movement Ledger (`/inventory`)
- Real-time stock breakdown: On-Hand, Reserved, and Available (`onHand - reserved`).
- Prevents overselling via atomic reservation and rollback mechanisms.
- Direct Stock Receiving.
- Manual Stock Adjustments requiring mandatory reason codes (`count_correction`, `damaged`, `expired`, `manual_adjustment`) and audit explanations.
- **Immutable Movement Ledger**: Complete chronological ledger of every single stock change with quantity before/after, reason, reference ID, and actor.

### 📋 Orders & Fulfilment Workflow (`/orders`)
- Validated state transition machine:
  `pending` → `confirmed` → `preparing` → `ready_for_pickup` / `dispatched` → `completed` (or `cancelled`).
- Order cancellation automatically releases reserved stock or returns committed stock to inventory with audit movement records.
- Order detail drawer with item snapshots, customer contacts, delivery instructions, and audit timeline.

### 🚚 Suppliers & Purchase Orders (`/suppliers`)
- Supplier directory with contact details, address, and KRA Tax PIN.
- Purchase order issuance with multi-item quantities and unit costs.
- Partial and full goods receiving that automatically updates product inventory and records movement ledger entries.

### 🔄 Returns, Inspections & Refunds (`/returns`)
- Return requests created from completed customer orders.
- Inspection & Disposition workflow:
  - **Restock**: Safely increments on-hand stock and writes movement ledger entry.
  - **Damaged Write-Off**: Writes off damaged stock without polluting sellable inventory.
  - **Supplier Return**: Tracks goods returned to suppliers.
- Direct refund processing against the captured payment (enforcing refund limits).

### 👥 Staff Accounts & Permissions (`/staff`)
- Role-based access control (RBAC): `Owner`, `Manager`, `Cashier`, `Inventory Staff`, `Fulfilment Staff`.
- Capability-based API enforcement on all protected routes.
- Suspend and activate staff accounts.

### 📊 Financial & Operational Reports (`/reports`)
- Settled Revenue, paid orders count, gross margins, delivery fees, and statutory VAT (16%) collected.
- Payment breakdown across M-Pesa, Cash, and Card channels.
- Comprehensive Inventory Asset Valuation report (Cost Value vs Retail Value vs Projected Gross Margin).
- **One-click CSV Exports**: Download Sales reports and Inventory Valuation CSVs.

### 🛡️ Compliance Audit Trail (`/audit`)
- Append-only log recording actor, role, action, entity type, entity ID, timestamp, IP address, and before/after state snapshots.

### ⚙️ Shop Profile & Gateway Settings (`/settings`)
- Business name, contact details, currency symbol, default VAT rate.
- M-Pesa Daraja configuration: Shortcode, Passkey, Environment (`sandbox` / `production`), and callback endpoint.
- Printable receipt header and footer templates.

---

## 3. Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB 7.0+ (Auto-bootstrapped locally on demand)

### Installation
```bash
cd retail-platform
npm install
```

### Seed Enterprise Demo Data
Populates the database with realistic retail products (maize flour, fresh milk, cooking oil, produce), suppliers, coupons, and orders:
```bash
npm --workspace server run seed
# or
node server/src/seed.js
```

### Run Automated Tests
Executes the comprehensive suite of 25 backend and frontend domain invariant tests:
```bash
npm test
```

### Start Development Server
Starts the Express API on `:4000` and Vite client on `:5173`:
```bash
npm run dev
```
Open your browser to:
- **Customer Storefront**: `http://localhost:5173/storefront`
- **Shop Management Backoffice & POS**: `http://localhost:5173/`

---

## 4. Default Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Shop Owner** | `owner@dukaflow.co.ke` | `DukaFlow2026!` | Full administrative & financial authority (`*`) |
| **Manager** | `manager@dukaflow.co.ke` | `DukaFlow2026!` | Operations, inventory, orders, purchasing |
| **Cashier** | `cashier@dukaflow.co.ke` | `DukaFlow2026!` | POS sales, cash recording, order lookup |

---

## 5. Core Business Invariants Enforced

1. **Available Stock Invariant**: `Available = OnHand - Reserved`. Orders cannot exceed available stock.
2. **Immutable Stock Ledger**: No inventory count changes without a corresponding ledger record.
3. **Server-Authoritative Pricing**: Frontend prices and totals are advisory; checkout strictly validates prices, active coupons, tax rates, and delivery zones against the database.
4. **Idempotent Webhooks**: M-Pesa Daraja callbacks can be retried indefinitely by Safaricom without duplicate financial or inventory effects.
5. **Separation of Concerns**: Order status and Payment status are distinct, validated state machines.
6. **Minor Unit Arithmetic**: All currency calculations are handled as integers (KES cents) to prevent rounding discrepancies.
