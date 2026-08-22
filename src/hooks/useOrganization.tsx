import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seedProductsByBusinessType } from "@/data/seed-products";

export const ACTIVE_ORG_KEY = "credsmart_active_org_id";
const PENDING_ONBOARDING_KEY = "credsmart_pending_onboarding_v1";
const LEGACY_PENDING_ONBOARDING_KEY = "nexis_pending_onboarding_v1";
const PENDING_ONBOARDING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_BUSINESS_TYPE = "General Store";
const DEFAULT_TAX_RATE = 18;
const DEFAULT_INVOICE_PREFIX = "INV";

export interface OrgData {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  invoice_prefix: string;
  logo_url: string;
  tax_rate: number;
  business_type: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  account_holder?: string;
  upi_id?: string;
}

export interface OrgContextValue {
  org: OrgData | null;
  orgId: string | null;
  organizations: OrgData[];
  loading: boolean;
  refresh: () => Promise<void>;
  userRole: string | null;
  switchOrganization: (id: string) => Promise<void>;
  createOrganization: (data: {
    name: string;
    business_type?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    tax_rate?: number;
    invoice_prefix?: string;
    logo_url?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
    upiId?: string;
  }) => Promise<string | null>;
}

export interface PendingOnboardingData {
  email: string;
  storeName: string;
  businessType: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  gstin: string;
  pan: string;
  taxRate: number;
  invoicePrefix: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  accountHolder?: string;
  upiId?: string;
  scrapedProducts: Array<{
    name: string;
    barcode: string;
    brand: string;
    category: string;
    costPrice: number;
    mrp: number;
  }>;
}

interface OnboardingProductSeed {
  name: string;
  barcode: string;
  brand: string;
  category: string;
  costPrice: number;
  mrp: number;
  stock: number;
  batchNumber: string;
}

interface MembershipRow {
  organization_id: string;
  role: string;
}

type BootstrapOrgResult = {
  organization_id: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getPendingOnboarding = (): PendingOnboardingData | null => {
  try {
    const raw = localStorage.getItem(PENDING_ONBOARDING_KEY) || localStorage.getItem(LEGACY_PENDING_ONBOARDING_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // New format: { __savedAt: number, payload: PendingOnboardingData }
    if (parsed && typeof parsed === "object" && "__savedAt" in parsed && "payload" in parsed) {
      const savedAt = Number((parsed as any).__savedAt) || 0;
      if (Date.now() - savedAt > PENDING_ONBOARDING_TTL_MS) {
        localStorage.removeItem(PENDING_ONBOARDING_KEY);
        localStorage.removeItem(LEGACY_PENDING_ONBOARDING_KEY);
        return null;
      }
      return (parsed as any).payload as PendingOnboardingData;
    }

    // Legacy format: raw payload object
    return parsed as PendingOnboardingData;
  } catch {
    localStorage.removeItem(PENDING_ONBOARDING_KEY);
    localStorage.removeItem(LEGACY_PENDING_ONBOARDING_KEY);
    return null;
  }
};

export const setPendingOnboarding = (payload: PendingOnboardingData) => {
  try {
    const wrapper = { __savedAt: Date.now(), payload };
    localStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(wrapper));
  } catch {
    // ignore storage errors
  }
};

export const clearPendingOnboarding = () => {
  try {
    localStorage.removeItem(PENDING_ONBOARDING_KEY);
    localStorage.removeItem(LEGACY_PENDING_ONBOARDING_KEY);
  } catch {
    // ignore
  }
};

const productKey = (name: string, barcode: string) =>
  `${name.trim().toLowerCase()}|${barcode.trim()}`;

const isMissingBootstrapFunction = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("could not find the function") ||
    (message.includes("bootstrap_organization") && message.includes("does not exist"))
  );
};

interface LocalOrgRecord {
  id: string;
  name: string;
  business_type?: string;
  address?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  tax_rate?: number;
  invoice_prefix?: string;
  logo_url?: string;
  role?: string;
}

export const getLocalOrgRegistry = (userId: string): LocalOrgRecord[] => {
  try {
    const raw = localStorage.getItem(`credsmart_org_registry_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLocalOrgRegistry = (userId: string, org: LocalOrgRecord) => {
  try {
    const current = getLocalOrgRegistry(userId);
    const exists = current.find((o) => o.id === org.id);
    const updated = exists
      ? current.map((o) => (o.id === org.id ? { ...o, ...org } : o))
      : [org, ...current];
    localStorage.setItem(`credsmart_org_registry_${userId}`, JSON.stringify(updated));
  } catch {}
};

const fetchAllMemberships = async (userId: string): Promise<MembershipRow[]> => {
  const localList = getLocalOrgRegistry(userId);
  const localMemberships: MembershipRow[] = localList.map((o) => ({
    organization_id: o.id,
    role: o.role === "cashier" ? "cashier" : "store_owner",
  }));

  try {
    const { data, error } = await supabase
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Notice reading organization memberships:", error.message);
      return localMemberships;
    }

    const remoteMemberships = (data || []).map((d) => ({
      organization_id: d.organization_id,
      role: d.role === "cashier" ? "cashier" : "store_owner",
    }));

    // Merge remote and local without duplicates
    const map = new Map<string, MembershipRow>();
    remoteMemberships.forEach((m) => map.set(m.organization_id, m));
    localMemberships.forEach((m) => {
      if (!map.has(m.organization_id)) map.set(m.organization_id, m);
    });

    return Array.from(map.values());
  } catch {
    return localMemberships;
  }
};

const fetchMembership = async (userId: string) => {
  const all = await fetchAllMemberships(userId);
  return all.length > 0 ? all[0] : null;
};

const seedOrgProducts = async (orgId: string, payload: PendingOnboardingData | { businessType: string; scrapedProducts?: any[] }) => {
  const baseSeeds = seedProductsByBusinessType[payload.businessType] || seedProductsByBusinessType["Other"];
  const scraped = payload.scrapedProducts || [];

  const onboardingProducts: OnboardingProductSeed[] = [
    ...baseSeeds.map((sp) => ({
      name: sp.name,
      barcode: sp.barcode,
      brand: sp.brand,
      category: sp.category,
      costPrice: sp.batch.costPrice,
      mrp: sp.batch.mrp,
      stock: sp.batch.stock,
      batchNumber: sp.batch.batchNumber,
    })),
    ...scraped.map((sp: any, idx: number) => ({
      name: sp.name,
      barcode: sp.barcode,
      brand: sp.brand,
      category: sp.category,
      costPrice: Number(sp.costPrice) || 0,
      mrp: Number(sp.mrp) || 0,
      stock: 0,
      batchNumber: `IMPORTED-${String(idx + 1).padStart(2, "0")}`,
    })),
  ].filter((p) => p.name.trim().length > 0);

  if (onboardingProducts.length === 0) return;

  const uniqueCandidates: OnboardingProductSeed[] = [];
  const candidateKeys = new Set<string>();
  onboardingProducts.forEach((product) => {
    const key = productKey(product.name, product.barcode);
    if (candidateKeys.has(key)) return;
    candidateKeys.add(key);
    uniqueCandidates.push(product);
  });

  if (uniqueCandidates.length === 0) return;

  try {
    const { data: insertedProducts, error: insertProductsError } = await supabase
      .from("products")
      .insert(
        uniqueCandidates.map((product) => ({
          name: product.name,
          barcode: product.barcode,
          brand: product.brand,
          category: product.category,
          organization_id: orgId,
        }))
      )
      .select("id, name, barcode");

    if (insertProductsError) {
      console.warn(`Product seed notice: ${insertProductsError.message}`);
      return;
    }

    if (!insertedProducts || insertedProducts.length === 0) return;

    const batchesToInsert = insertedProducts
      .map((product) => {
        const match = uniqueCandidates.find(
          (candidate) => productKey(candidate.name, candidate.barcode) === productKey(product.name, product.barcode || "")
        );

        if (!match) return null;

        return {
          product_id: product.id,
          batch_number: match.batchNumber,
          cost_price: match.costPrice,
          mrp: match.mrp,
          stock: match.stock,
        };
      })
      .filter(
        (batch): batch is { product_id: string; batch_number: string; cost_price: number; mrp: number; stock: number } =>
          Boolean(batch)
      );

    if (batchesToInsert.length === 0) return;

    await supabase.from("product_batches").insert(batchesToInsert);
  } catch (err) {
    console.warn("Batch seed notice:", err);
  }
};

const saveOrgBankAndUpi = (
  orgId: string,
  details: {
    businessName: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
    upiId?: string;
  }
) => {
  try {
    const bankAccount = {
      id: `bank_${Date.now()}`,
      bankName: details.bankName || "HDFC Bank Ltd.",
      accountNumber: details.accountNumber || "50200084920194",
      ifsc: details.ifsc || "HDFC0001429",
      branch: "Main Branch",
      accountHolder: details.accountHolder || details.businessName,
      isDefault: true,
    };

    const businessSettings = {
      businessName: details.businessName,
      phone: details.phone || "",
      email: details.email || "",
      billingAddress: details.address || "",
      gstin: details.gstin || "",
      pan: details.pan || "",
      upiId: details.upiId || "",
      bankAccounts: [bankAccount],
    };

    localStorage.setItem(`credsmart_business_settings_${orgId}`, JSON.stringify(businessSettings));
    localStorage.setItem("credsmart_business_settings", JSON.stringify(businessSettings));

    // Also update invoice settings QR & bank
    const invoiceSettingsRaw = localStorage.getItem("credsmart_invoice_settings");
    if (invoiceSettingsRaw) {
      try {
        const parsed = JSON.parse(invoiceSettingsRaw);
        parsed.bankAccounts = [bankAccount];
        parsed.selectedBankAccountId = bankAccount.id;
        if (details.upiId) {
          parsed.selectedPaymentQrUpi = details.upiId;
        }
        localStorage.setItem("credsmart_invoice_settings", JSON.stringify(parsed));
      } catch {}
    }
  } catch (e) {
    console.warn("Failed to cache organization bank & upi details:", e);
  }
};

const provisionOrganization = async (
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  payload: PendingOnboardingData
) => {
  const generatedOrgId = crypto.randomUUID();
  let orgId: string = generatedOrgId;

  // 1. Try bootstrap RPC first
  try {
    const { data: bootstrapData } = await supabase.rpc(
      "bootstrap_organization" as never,
      {
        p_name: payload.storeName || "My Store",
        p_business_type: payload.businessType || DEFAULT_BUSINESS_TYPE,
        p_address: payload.storeAddress || "",
        p_phone: payload.storePhone || "",
        p_email: payload.storeEmail || payload.email || user.email || "",
        p_gstin: payload.gstin || "",
        p_pan: payload.pan || "",
        p_tax_rate: payload.taxRate || DEFAULT_TAX_RATE,
        p_invoice_prefix: payload.invoicePrefix || DEFAULT_INVOICE_PREFIX,
        p_logo_url: "",
      } as never
    ).maybeSingle<BootstrapOrgResult>();

    if (bootstrapData?.organization_id) {
      orgId = bootstrapData.organization_id;
    }
  } catch {
    // Ignore RPC missing error
  }

  // 2. If RPC did not create org, perform direct insert without .select()
  if (orgId === generatedOrgId) {
    try {
      const { error: insertErr } = await supabase.from("organizations").insert({
        id: generatedOrgId,
        name: payload.storeName || "My Store",
        business_type: payload.businessType || DEFAULT_BUSINESS_TYPE,
        address: payload.storeAddress || "",
        phone: payload.storePhone || "",
        email: payload.storeEmail || payload.email || user.email || "",
        gstin: payload.gstin || "",
        pan: payload.pan || "",
        tax_rate: payload.taxRate || DEFAULT_TAX_RATE,
        invoice_prefix: payload.invoicePrefix || DEFAULT_INVOICE_PREFIX,
        logo_url: "",
      });

      if (insertErr) {
        console.warn("Direct org insert fallback notice:", insertErr.message);
        await supabase.from("organizations").insert({
          id: generatedOrgId,
          name: payload.storeName || "My Store",
        });
      }
    } catch (err) {
      console.warn("Direct org provision catch notice:", err);
    }
  }

  // 3. Ensure membership is created
  try {
    await supabase.from("organization_memberships").upsert(
      {
        organization_id: orgId,
        user_id: user.id,
        role: "store_owner",
      },
      {
        onConflict: "organization_id,user_id,role",
        ignoreDuplicates: true,
      }
    );
  } catch (e) {
    console.warn("Membership provision upsert notice:", e);
  }

  // 4. Save to local org registry
  saveLocalOrgRegistry(user.id, {
    id: orgId,
    name: payload.storeName || "My Store",
    business_type: payload.businessType || DEFAULT_BUSINESS_TYPE,
    address: payload.storeAddress || "",
    phone: payload.storePhone || "",
    email: payload.storeEmail || payload.email || user.email || "",
    gstin: payload.gstin || "",
    pan: payload.pan || "",
    tax_rate: payload.taxRate || DEFAULT_TAX_RATE,
    invoice_prefix: payload.invoicePrefix || DEFAULT_INVOICE_PREFIX,
    logo_url: "",
    role: "store_owner",
  });

  // 5. Save Bank & UPI Details
  saveOrgBankAndUpi(orgId, {
    businessName: payload.storeName,
    phone: payload.storePhone,
    email: payload.storeEmail,
    address: payload.storeAddress,
    gstin: payload.gstin,
    pan: payload.pan,
    bankName: payload.bankName,
    accountNumber: payload.accountNumber,
    ifsc: payload.ifsc,
    accountHolder: payload.accountHolder,
    upiId: payload.upiId,
  });

  try {
    await seedOrgProducts(orgId, payload);
    clearPendingOnboarding();
  } catch (seedError) {
    console.error("Organization seeded with warnings:", seedError);
  }

  localStorage.setItem(ACTIVE_ORG_KEY, orgId);

  for (let i = 0; i < 4; i++) {
    const membership = await fetchMembership(user.id);
    if (membership) return membership;
    await wait(300 * (i + 1));
  }

  return { organization_id: orgId, role: "store_owner" };
};

const OrgContext = createContext<OrgContextValue>({
  org: null,
  orgId: null,
  organizations: [],
  loading: true,
  refresh: async () => {},
  userRole: null,
  switchOrganization: async () => {},
  createOrganization: async () => null,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const provisionAttemptedRef = useRef<Set<string>>(new Set());

  const fetchOrg = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    setLoading(true);

    if (!user) {
      provisionAttemptedRef.current.clear();
      setOrg(null);
      setOrgId(null);
      setOrganizations([]);
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      let memberships = await fetchAllMemberships(user.id);
      const pending = getPendingOnboarding();
      const shouldAttemptProvision =
        memberships.length === 0 &&
        Boolean(pending) &&
        !provisionAttemptedRef.current.has(user.id);

      if (shouldAttemptProvision && pending) {
        provisionAttemptedRef.current.add(user.id);
        const newM = await provisionOrganization(
          {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata as Record<string, unknown>,
          },
          pending
        );
        if (newM) {
          memberships = [newM];
        }
      }

      if (memberships.length === 0) {
        setOrg(null);
        setOrgId(null);
        setOrganizations([]);
        setUserRole("store_owner");
        return;
      }

      // Determine active organization ID
      const savedActiveOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
      const matchedMembership = memberships.find((m) => m.organization_id === savedActiveOrgId) || memberships[0];
      const currentActiveOrgId = matchedMembership.organization_id;

      setOrgId(currentActiveOrgId);
      localStorage.setItem(ACTIVE_ORG_KEY, currentActiveOrgId);
      setUserRole(matchedMembership.role === "cashier" ? "cashier" : "store_owner");

      // Fetch all organizations user has access to from DB
      const orgIds = memberships.map((m) => m.organization_id);
      let orgRows: any[] = [];
      try {
        const { data: dbRows, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .in("id", orgIds);

        if (!orgError && dbRows) {
          orgRows = dbRows;
        } else if (orgError) {
          console.warn("Notice loading remote organization details:", orgError.message);
        }
      } catch (e) {
        console.warn("Error querying organizations:", e);
      }

      const localRegistry = getLocalOrgRegistry(user.id);

      const allOrgs: OrgData[] = memberships.map((membership) => {
        const row = orgRows.find((r) => r.id === membership.organization_id);
        const local = localRegistry.find((l) => l.id === membership.organization_id);

        let bankName = "";
        let accountNumber = "";
        let ifsc = "";
        let accountHolder = "";
        let upiId = "";

        try {
          const cached =
            localStorage.getItem(`credsmart_business_settings_${membership.organization_id}`) ||
            (membership.organization_id === currentActiveOrgId
              ? localStorage.getItem("credsmart_business_settings")
              : null);
          if (cached) {
            const parsed = JSON.parse(cached);
            upiId = parsed.upiId || "";
            if (parsed.bankAccounts && parsed.bankAccounts.length > 0) {
              const b = parsed.bankAccounts[0];
              bankName = b.bankName || "";
              accountNumber = b.accountNumber || "";
              ifsc = b.ifsc || "";
              accountHolder = b.accountHolder || "";
            }
          }
        } catch {}

        const name = row?.name || local?.name || "My Store";
        const address = row?.address || local?.address || "";
        const phone = row?.phone || local?.phone || "";
        const email = row?.email || local?.email || "";
        const gstin = row?.gstin || local?.gstin || "";
        const pan = row?.pan || local?.pan || "";
        const invoice_prefix = row?.invoice_prefix || local?.invoice_prefix || "INV";
        const logo_url = row?.logo_url || local?.logo_url || "";
        const tax_rate = row?.tax_rate ?? local?.tax_rate ?? 18;
        const business_type = row?.business_type || local?.business_type || DEFAULT_BUSINESS_TYPE;

        return {
          id: membership.organization_id,
          name,
          address,
          phone,
          email,
          gstin,
          pan,
          invoice_prefix,
          logo_url,
          tax_rate,
          business_type,
          bank_name: bankName,
          account_number: accountNumber,
          ifsc,
          account_holder: accountHolder,
          upi_id: upiId,
        };
      });

      setOrganizations(allOrgs);

      const activeOrgData = allOrgs.find((o) => o.id === currentActiveOrgId) || allOrgs[0] || null;
      setOrg(activeOrgData);
    } catch (error) {
      console.error("Failed to initialize organization context:", error);
      setOrg(null);
      setOrgId(null);
      setOrganizations([]);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  const switchOrganization = useCallback(async (newOrgId: string) => {
    localStorage.setItem(ACTIVE_ORG_KEY, newOrgId);
    setOrgId(newOrgId);
    const target = organizations.find((o) => o.id === newOrgId);
    if (target) {
      setOrg(target);
    }
    // Also dispatch custom event for components listening
    window.dispatchEvent(new CustomEvent("credsmart_org_changed", { detail: { orgId: newOrgId } }));
    await fetchOrg();
  }, [organizations, fetchOrg]);

  const createOrganization = useCallback(async (data: {
    name: string;
    business_type?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    tax_rate?: number;
    invoice_prefix?: string;
    logo_url?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolder?: string;
    upiId?: string;
  }): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const newId = crypto.randomUUID();

      // 1. Try to create organization in Supabase without .select() (avoids SELECT RLS constraint on insert)
      try {
        const { error: orgError } = await supabase
          .from("organizations")
          .insert({
            id: newId,
            name: data.name.trim(),
            business_type: data.business_type || DEFAULT_BUSINESS_TYPE,
            address: data.address?.trim() || "",
            phone: data.phone?.trim() || "",
            email: data.email?.trim() || user.email || "",
            gstin: data.gstin?.trim() || "",
            pan: data.pan?.trim() || "",
            tax_rate: data.tax_rate || DEFAULT_TAX_RATE,
            invoice_prefix: data.invoice_prefix?.trim() || DEFAULT_INVOICE_PREFIX,
            logo_url: data.logo_url || "",
          });

        if (orgError) {
          console.warn("Direct org insert fallback notice:", orgError.message);
          await supabase.from("organizations").insert({
            id: newId,
            name: data.name.trim(),
          });
        }
      } catch (err) {
        console.warn("Direct org creation catch notice:", err);
      }

      // 2. Add owner membership
      try {
        await supabase.from("organization_memberships").upsert(
          {
            organization_id: newId,
            user_id: user.id,
            role: "store_owner",
          },
          {
            onConflict: "organization_id,user_id,role",
            ignoreDuplicates: true,
          }
        );
      } catch (err) {
        console.warn("Membership insert catch notice:", err);
      }

      // 3. Save to local org registry
      saveLocalOrgRegistry(user.id, {
        id: newId,
        name: data.name.trim(),
        business_type: data.business_type || DEFAULT_BUSINESS_TYPE,
        address: data.address?.trim() || "",
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || user.email || "",
        gstin: data.gstin?.trim() || "",
        pan: data.pan?.trim() || "",
        tax_rate: data.tax_rate || DEFAULT_TAX_RATE,
        invoice_prefix: data.invoice_prefix?.trim() || DEFAULT_INVOICE_PREFIX,
        logo_url: data.logo_url || "",
        role: "store_owner",
      });

      // 4. Save Bank & UPI Details for the new store
      saveOrgBankAndUpi(newId, {
        businessName: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gstin: data.gstin,
        pan: data.pan,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        accountHolder: data.accountHolder,
        upiId: data.upiId,
      });

      // 5. Seed standard inventory
      try {
        await seedOrgProducts(newId, {
          businessType: data.business_type || DEFAULT_BUSINESS_TYPE,
        });
      } catch (seedErr) {
        console.warn("Product seed for new store notice:", seedErr);
      }

      // 6. Switch active organization
      localStorage.setItem(ACTIVE_ORG_KEY, newId);
      setOrgId(newId);
      window.dispatchEvent(new CustomEvent("credsmart_org_changed", { detail: { orgId: newId } }));

      await fetchOrg();
      return newId;
    } catch (err) {
      console.error("Failed to create organization:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchOrg]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  return (
    <OrgContext.Provider
      value={{
        org,
        orgId,
        organizations,
        loading,
        refresh: fetchOrg,
        userRole,
        switchOrganization,
        createOrganization,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrgContext);
}
