import { useState, useCallback } from "react";
import { ArrowLeft, FileSpreadsheet, HelpCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TallyImportModal } from "@/components/TallyImportModal";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItem } from "@/types/inventory";
import { Party } from "@/types/parties";
import { TallyBankAccount, TallyVoucher } from "@/utils/tallyXmlParser";
import { toast } from "sonner";
import { ROUTE_PATHS } from "@/config/routes";

export default function TallyImport() {
  const navigate = useNavigate();
  const { orgId } = useOrganization();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(true);

  // ── Import Items Handler ───────────────────────────────────────────────────

  const handleImportItems = useCallback(async (items: Partial<InventoryItem>[]) => {
    if (!orgId) throw new Error("No organization found. Please ensure you are logged in.");
    if (items.length === 0) return;

    let totalInserted = 0;

    for (const item of items) {
      const sPrice = item.sellingPrice || 100;
      const pPrice = item.purchasePrice || Math.round(sPrice * 0.8);
      const stock = item.openingStock ?? item.currentStock ?? 0;
      const skuVal = item.sku || `TLY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const tagsPayload = {
        selling_price: sPrice,
        purchase_price: pPrice,
        mrp: item.mrp ?? sPrice,
        unit: item.unit ?? "PCS",
        gst_rate: Number(item.gstRate ?? 18),
        hsn_code: item.hsnCode ? String(item.hsnCode).trim() : null,
        opening_stock: stock,
        min_stock_alert: Number(item.minStockAlert ?? 5),
        tally_import: true,
        imported_at: new Date().toISOString(),
      };

      const { data: newProd, error: pErr } = await supabase
        .from("products")
        .insert({
          organization_id: orgId,
          name: item.name || "Tally Item",
          brand: item.brand ?? null,
          category: item.category ?? "General",
          barcode: item.barcode ?? null,
          sku: skuVal,
          tags: tagsPayload,
        })
        .select()
        .single();

      if (pErr) {
        console.error("Tally item insert error:", pErr);
        continue;
      }

      if (newProd) {
        await supabase.from("product_batches").insert({
          product_id: newProd.id,
          batch_number: "TALLY-INIT",
          cost_price: pPrice,
          mrp: item.mrp || sPrice,
          stock: stock,
        });
        totalInserted++;
      }
    }

    toast.success(`✅ Successfully imported ${totalInserted} items from Tally into Inventory!`);
  }, [orgId]);

  // ── Import Parties Handler ─────────────────────────────────────────────────

  const handleImportParties = useCallback(async (parties: Partial<Party>[]) => {
    if (!orgId) throw new Error("No organization found. Please ensure you are logged in.");
    if (parties.length === 0) return;

    let totalInserted = 0;

    for (const party of parties) {
      const isSupplier = party.partyType === "supplier";
      const targetTable = isSupplier ? "suppliers" : "customers";

      const { data: newParty, error: pErr } = await supabase
        .from(targetTable)
        .insert({
          organization_id: orgId,
          name: party.name || "Unnamed Party",
          phone: party.phone || undefined,
          email: party.email || undefined,
          address: party.address || undefined,
          gstin: party.gstin || undefined,
          trade_name: party.tradeName || undefined,
          pan: party.pan || undefined,
          pincode: party.pincode || undefined,
          category: party.category || "General",
          credit_limit: party.creditLimit || 50000,
          credit_period_days: party.creditPeriodDays || 30,
          custom_fields: {
            tally_import: true,
            imported_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (pErr) {
        console.error("Tally party insert error:", pErr);
        continue;
      }

      if (newParty) {
        totalInserted++;

        const opBal = Number(party.balance ?? party.openingBalance ?? 0);
        if (opBal !== 0) {
          await supabase.from("credit_transactions").insert({
            organization_id: orgId,
            party_id: newParty.id,
            party_type: isSupplier ? "supplier" : "customer",
            amount: Math.abs(opBal),
            type: opBal >= 0 ? "credit" : "payment",
            description: "Tally opening balance import",
            created_by: user?.id || "admin",
          });
        }
      }
    }

    toast.success(`✅ Successfully imported ${totalInserted} parties from Tally!`);
  }, [orgId, user]);

  // ── Import Bank Accounts Handler ───────────────────────────────────────────

  const handleImportBankAccounts = useCallback(async (banks: TallyBankAccount[], cashInHand: number) => {
    if (!orgId) return;
    const storageKeyAccounts = `credsmart_bank_accounts_${orgId}`;
    const storageKeyCash = `credsmart_cash_in_hand_${orgId}`;

    const existingRaw = localStorage.getItem(storageKeyAccounts);
    let existingAccounts: unknown[] = [];
    try {
      existingAccounts = existingRaw ? JSON.parse(existingRaw) : [];
    } catch {
      existingAccounts = [];
    }

    const newAccounts = banks.map((b, i) => ({
      id: `bank-tly-${Date.now()}-${i}`,
      name: b.name,
      bankName: b.bankName,
      accountNumber: b.accountNumber || "—",
      ifscCode: b.ifscCode || "—",
      accountType: b.name.toLowerCase().includes("overdraft") || b.name.toLowerCase().includes("occ") ? "overdraft" : "current",
      balance: b.balance,
      isPrimary: existingAccounts.length === 0 && i === 0,
      createdAt: new Date().toISOString(),
    }));

    localStorage.setItem(storageKeyAccounts, JSON.stringify([...existingAccounts, ...newAccounts]));

    if (cashInHand > 0) {
      const prevCash = Number(localStorage.getItem(storageKeyCash)) || 0;
      localStorage.setItem(storageKeyCash, String(prevCash + cashInHand));
    }

    toast.success(`✅ Imported ${newAccounts.length} Bank Account(s) & Cash in Hand to Cash & Bank!`);
  }, [orgId]);

  // ── Import Vouchers / Ledger Entries Handler ────────────────────────────────

  const handleImportVouchers = useCallback(async (vouchers: TallyVoucher[]) => {
    if (!orgId) return;

    // Fetch existing customers and suppliers to link vouchers by name
    const { data: customers } = await supabase.from("customers").select("id, name").eq("organization_id", orgId);
    const { data: suppliers } = await supabase.from("suppliers").select("id, name").eq("organization_id", orgId);

    const partyMap = new Map<string, { id: string; type: "customer" | "supplier" }>();
    (customers || []).forEach((c) => partyMap.set(c.name.toLowerCase().trim(), { id: c.id, type: "customer" }));
    (suppliers || []).forEach((s) => partyMap.set(s.name.toLowerCase().trim(), { id: s.id, type: "supplier" }));

    let insertedCount = 0;

    for (const v of vouchers) {
      const party = partyMap.get(v.partyName.toLowerCase().trim());
      if (!party) continue;

      const txnType = (v.voucherType === "Sales" || v.voucherType === "Purchase") ? "credit" : "payment";

      const { error } = await supabase.from("credit_transactions").insert({
        organization_id: orgId,
        party_id: party.id,
        party_type: party.type,
        amount: v.amount,
        type: txnType,
        reference_id: v.voucherNumber,
        description: v.narration || `Tally ${v.voucherType} #${v.voucherNumber}`,
        created_by: user?.id || "admin",
        created_at: v.date ? new Date(v.date).toISOString() : new Date().toISOString(),
      });

      if (!error) insertedCount++;
    }

    toast.success(`✅ Imported ${insertedCount} ledger voucher entries into Party Ledgers!`);
  }, [orgId, user]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(ROUTE_PATHS.businessSettings)}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>

        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              Tally Data Import
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-mono">
                TALLY PRIME / ERP 9
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Migrate your complete data — Stock Items, Parties, Ledgers — from Tally into CredSmart
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 hidden sm:flex bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">
            <Zap className="w-3 h-3" />
            Zero Data Loss
          </Badge>
        </div>
      </div>

      {/* Info cards */}
      <div className="p-4 sm:p-6 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 w-fit">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-foreground">XML & CSV Support</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Upload Tally's XML export (recommended) or CSV from Stock Summary / Ledger reports
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 w-fit">
            <HelpCircle className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-foreground">Smart Auto-Detection</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Automatically detects Stock Items, Parties, opening balances, GSTIN and HSN codes
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold text-foreground">One-Click Migration</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Preview all data before importing. Skip, overwrite or merge duplicates as needed
          </p>
        </div>
      </div>

      {/* Launch modal button (shows if modal was closed) */}
      {!modalOpen && (
        <div className="flex items-center justify-center p-8">
          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-6 text-base rounded-2xl shadow-lg shadow-amber-600/30"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Launch Tally Import Wizard
          </Button>
        </div>
      )}

      {/* Main Import Modal */}
      <TallyImportModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          navigate(ROUTE_PATHS.businessSettings);
        }}
        onImportItems={handleImportItems}
        onImportParties={handleImportParties}
        onImportBankAccounts={handleImportBankAccounts}
        onImportVouchers={handleImportVouchers}
        defaultTab="all"
      />
    </div>
  );
}
