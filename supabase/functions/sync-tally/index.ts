import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-credsmart-organization, x-credsmart-sync-token, x-credsmart-export-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const text = (element: Element | null, name: string) =>
  element?.querySelector(name)?.textContent?.trim() || "";

const amount = (value: string) => {
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dateValue(value: string) {
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T10:00:00.000Z`;
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST is supported" }, 405);

  try {
    const pairingToken = req.headers.get("X-CredSmart-Sync-Token") || req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    const organizationId = req.headers.get("X-CredSmart-Organization");
    const exportType = req.headers.get("X-CredSmart-Export-Type") || "masters";
    if (!pairingToken || !organizationId) return json({ error: "Missing organization or pairing token" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tokenHash = await sha256(pairingToken);
    const { data: credential, error: credentialError } = await supabase
      .from("sync_pairing_tokens")
      .select("id, organization_id, user_id, active, expires_at")
      .eq("token_hash", tokenHash)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (credentialError || !credential?.active || (credential.expires_at && new Date(credential.expires_at) <= new Date())) {
      return json({ error: "Invalid or expired pairing token" }, 401);
    }

    const xml = await req.text();
    if (!xml.trim() || xml.length > 25 * 1024 * 1024) return json({ error: "Invalid XML payload" }, 400);
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (!document || document.querySelector("parsererror")) return json({ error: "Malformed XML payload" }, 400);

    let items = 0;
    let parties = 0;
    let vouchers = 0;
    const unsupported: string[] = [];

    if (exportType === "masters") {
      for (const item of Array.from(document.querySelectorAll("STOCKITEM"))) {
        const name = item.getAttribute("NAME")?.trim() || text(item, "NAME");
        if (!name) continue;
        const sku = `TALLY-${await sha256(name.toLowerCase()).then((hash) => hash.slice(0, 12).toUpperCase())}`;
        const stock = amount(text(item, "OPENINGBALANCE"));
        const sellingPrice = amount(text(item, "STANDARDPRICELIST RATE"));
        const purchasePrice = amount(text(item, "STANDARDCOSTLIST RATE")) || amount(text(item, "OPENINGRATE"));
        const { error } = await supabase.from("products").upsert({
          organization_id: organizationId,
          name,
          sku,
          category: text(item, "PARENT") || "General",
          tags: { stock, opening_stock: stock, selling_price: sellingPrice, purchase_price: purchasePrice, imported_from: "tally", auto_synced: true },
        }, { onConflict: "organization_id,sku" });
        if (!error) items++;
      }

      for (const ledger of Array.from(document.querySelectorAll("LEDGER"))) {
        const name = ledger.getAttribute("NAME")?.trim() || text(ledger, "NAME");
        const parent = text(ledger, "PARENT").toLowerCase();
        if (!name || parent.includes("bank") || parent.includes("cash")) continue;
        const isSupplier = parent.includes("creditor") || parent.includes("supplier") || parent.includes("vendor");
        const table = isSupplier ? "suppliers" : "customers";
        const payload = { organization_id: organizationId, name, gstin: text(ledger, "PARTYGSTIN") || null, pan: text(ledger, "INCOMETAXNUMBER") || null, address: text(ledger, "ADDRESS") || null };
        const { error } = await supabase.from(table).upsert(payload, { onConflict: "organization_id,name" });
        if (!error) parties++;
      }
    } else if (exportType === "daybook") {
      for (const voucher of Array.from(document.querySelectorAll("VOUCHER"))) {
        const type = (voucher.getAttribute("VCHTYPE") || text(voucher, "VOUCHERTYPENAME")).trim();
        const number = text(voucher, "VOUCHERNUMBER") || voucher.getAttribute("REMOTEID") || "";
        const value = amount(text(voucher, "AMOUNT"));
        const date = dateValue(text(voucher, "DATE"));
        const partyName = text(voucher, "PARTYLEDGERNAME");
        if (!number || !value) continue;
        if (type.toLowerCase().includes("sales") || type.toLowerCase().includes("credit note")) {
          const { error } = await supabase.from("sales").upsert({ organization_id: organizationId, invoice_number: number, subtotal: value, total: value, tax: 0, payment_method: "Credit", created_by: credential.user_id, created_at: date }, { onConflict: "organization_id,invoice_number" });
          if (!error) vouchers++;
        } else if (type.toLowerCase().includes("purchase") || type.toLowerCase().includes("debit note")) {
          const { data: supplier } = await supabase.from("suppliers").upsert({ organization_id: organizationId, name: partyName || "Imported Vendor", category: "Wholesaler" }, { onConflict: "organization_id,name" }).select("id").single();
          if (supplier) {
            const { error } = await supabase.from("purchase_invoices").upsert({ organization_id: organizationId, supplier_id: supplier.id, invoice_number: number, total_amount: value, status: "received", notes: `Tally ${type}`, created_by: credential.user_id, created_at: date }, { onConflict: "organization_id,invoice_number" });
            if (!error) vouchers++;
          }
        } else if (["receipt", "payment", "journal"].some((name) => type.toLowerCase().includes(name))) {
          unsupported.push(type || "Unknown");
        } else {
          unsupported.push(type || "Unknown");
        }
      }
    } else {
      return json({ error: "Unsupported export type" }, 400);
    }

    await supabase.from("sync_pairing_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", credential.id);
    return json({ success: unsupported.length === 0, exportType, items, parties, vouchers, unsupported });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Tally sync failed" }, 500);
  }
});
