# CredSmart POS — Free GST Billing & Point of Sale for Indian Businesses

**CredSmart POS** is a modern, blazing-fast, and comprehensive GST billing, inventory management, and point-of-sale platform tailored specifically for Indian retail, wholesale, and MSME businesses (Kirana stores, Supermarkets, Electronics, Garments, Pharmacies, Hardware, etc.).

---

## 🚀 Key Features

- **⚡ Lightning-Fast POS Terminal**
  - Instant barcode and QR code scanning with camera or dedicated hardware scanners.
  - Hold & resume multiple customer carts seamlessly.
  - Multi-tender split payment support (Cash, UPI/QR code, Card, and Udhar/Credit).
  - Customizable 80mm/58mm thermal receipts and full A4 GST tax invoices.

- **📜 100% GST Compliant Billing**
  - Automated CGST, SGST, and IGST calculations.
  - HSN/SAC code management and GSTIN verification.
  - Real-time tax breakdowns per line item.

- **📦 Inventory & Batch Management**
  - Multi-batch tracking with expiry dates and custom batch numbers.
  - MRP, selling price, and wholesale purchase price tracking.
  - Low-stock warnings and real-time inventory adjustments with audit trail.
  - CSV bulk product import & barcode label generator.

- **📒 Udhar Khata & Customer Ledger**
  - Track customer & supplier credit balances (Udhar Khata).
  - Partial payments, credit limits, and full transaction history.

- **🔍 B2B Vendor Discovery**
  - Integrated vendor discovery to explore MCA-registered suppliers and manufacturers across India.

- **📊 Analytics & Business Reports**
  - Daily/monthly sales velocity, revenue, profit margins, and tax liability summaries.
  - Top-selling items and cashier performance metrics.
  - Comprehensive activity and audit logs for store accountability.

- **📱 Multi-Platform Ready**
  - Runs in any modern web browser.
  - Packaged for Android & iOS via Capacitor.
  - Offline-resilient local state with automatic sync.

---

## 🛠️ Tech Stack

- **Frontend:** [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Styling & UI:** [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Auth)
- **State & Data Fetching:** [TanStack Query v5](https://tanstack.com/query/latest)
- **Mobile Runtime:** [Capacitor](https://capacitorjs.com/) (Android / iOS)
- **Testing:** [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/)

---

## 🏁 Getting Started

### Prerequisites
- Node.js (v18 or newer)
- JDK 21 (Android Studio's bundled JBR is supported)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <REPO_URL>
   cd CREDSMART
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

---

## 🧪 Scripts

- `npm run dev` — Start Vite development server
- `npm run build` — Build production bundle
- `npm run build:dev` — Build development bundle
- `npm run lint` — Run ESLint
- `npm run test` — Run unit and integration tests with Vitest
- `npm run test:watch` — Run tests in watch mode
- `npm run preview` — Preview the production build locally
- `npm run tally:bridge` — Start the authenticated Windows/local Tally bridge on port 9005
- `npm run tally:bridge:exe` — Build `dist/CredSmartTallyBridge.exe` for Windows x64

## Direct Tally Import (Windows)

CredSmart supports a one-click live import from Tally Prime or Tally.ERP 9 when
Tally's HTTP server is enabled on `127.0.0.1:9000`.

1. Open the authenticated **Import from Tally / Excel** page.
2. Generate or register the pairing token shown in the live-sync panel.
3. Start the CredSmart Tally Bridge with the generated token:

   ```powershell
   $env:CREDSMART_SYNC_TOKEN = "<pairing-token>"
   npm run tally:bridge
   ```

   The bridge binds only to `127.0.0.1:9005`, proxies XML requests to Tally,
   and rejects requests without the pairing token. The browser origin must be
   listed in `CREDSMART_ALLOWED_ORIGINS` when using a non-default deployment.
4. Click **Sync Live Tally Now**. CredSmart requests masters and daybook data,
   parses them, and imports products, parties, and enabled voucher scopes.

For a customer machine, build the Windows companion executable:

```powershell
npm run tally:bridge:exe
```

Run `dist\CredSmartTallyBridge.exe` with runtime environment variables such as
`CREDSMART_SYNC_TOKEN`, `CREDSMART_TALLY_URL`, and
`CREDSMART_BRIDGE_PORT`. Pairing tokens are runtime configuration and must
never be committed or embedded in the executable. If Tally or the bridge is
unavailable, the existing XML/CSV file import remains available on
`/tally-import`.

---

## 📱 Mobile App (Capacitor)

The default Android build embeds the production Vite bundle. Ensure the Android release signing
file is available locally at `android/signing.properties` (never commit it), then run:

```bash
npm run android:release
```

The signed APK is written to `android/app/build/outputs/apk/release/app-release.apk` and the
signed Play Store bundle to `android/app/build/outputs/bundle/release/app-release.aab`.
Set `VERSION_CODE` and `VERSION_NAME` as Gradle project properties when publishing an update,
for example `gradlew.bat bundleRelease -PVERSION_CODE=2 -PVERSION_NAME=1.1.0`.

For a separate remote-server build, set `CAP_SERVER_URL` to an HTTPS deployment URL before
running `npm run cap:sync`; only localhost/127.0.0.1 HTTP URLs are accepted for development.

---

## 📄 License

This project is licensed under the MIT License.
