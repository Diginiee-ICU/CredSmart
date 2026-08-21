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

const fetchAllMemberships = async (userId: string): Promise<MembershipRow[]> => {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to fetch organization memberships:", error.message);
    return [];
  }

  return (data || []).map((d) => ({
    organization_id: d.organization_id,
    role: d.role === "cashier" ? "cashier" : "store_owner",
  }));
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

  try {
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
  const richOrganizationInsert = {
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
  };

  let orgId: string | null = null;

  const { data: richOrgData, error: richOrgError } = await supabase
    .from("organizations")
    .insert(richOrganizationInsert)
    .select("id")
    .single();

  if (richOrgData?.id) {
    orgId = richOrgData.id;
  } else {
    const { data: fallbackOrgData } = await supabase
      .from("organizations")
      .insert({ name: richOrganizationInsert.name })
      .select("id")
      .single();

    if (fallbackOrgData?.id) {
      orgId = fallbackOrgData.id;
    } else {
      console.error(
        "Organization provisioning failed:",
        richOrgError?.message || "Unknown error"
      );
      return null;
    }
  }

  // Create membership
  await supabase.from("organization_memberships").upsert(
    {
      organization_id: orgId,
      user_id: user.id,
      role: "store_owner",
    },
    {
      onConflict: "organization_id,user_id,role,location_id",
      ignoreDuplicates: true,
    }
  );

  // Save Bank & UPI Details
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

  return null;
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
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const provisionAttemptedRef = useRef<Set<string>>(new Set());

  const fetchOrg = useCallback(async () => {
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

      // Fetch all organizations user has access to
      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgRows, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds);

      if (orgError) {
        console.warn("Failed to load organization details:", orgError.message);
      }

      const allOrgs: OrgData[] = (orgRows || []).map((row) => {
        // Retrieve local bank & upi details if cached
        let bankName = "";
        let accountNumber = "";
        let ifsc = "";
        let accountHolder = "";
        let upiId = "";

        try {
          const cached = localStorage.getItem(`credsmart_business_settings_${row.id}`) ||
            (row.id === currentActiveOrgId ? localStorage.getItem("credsmart_business_settings") : null);
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

        return {
          id: row.id,
          name: row.name || "My Store",
          address: row.address || "",
          phone: row.phone || "",
          email: row.email || "",
          gstin: row.gstin || "",
          pan: row.pan || "",
          invoice_prefix: row.invoice_prefix || "INV",
          logo_url: row.logo_url || "",
          tax_rate: row.tax_rate ?? 18,
          business_type: row.business_type || DEFAULT_BUSINESS_TYPE,
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
  }, [user]);

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
      const { data: newOrg, error: orgError } = await supabase
        .from("organizations")
        .insert({
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
        })
        .select("id")
        .single();

      if (orgError || !newOrg?.id) {
        throw new Error(orgError?.message || "Failed to create store record");
      }

      const newId = newOrg.id;

      // Add owner membership
      await supabase.from("organization_memberships").insert({
        organization_id: newId,
        user_id: user.id,
        role: "store_owner",
      });

      // Save Bank & UPI Details for the new store
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

      // Seed standard inventory
      try {
        await seedOrgProducts(newId, {
          businessType: data.business_type || DEFAULT_BUSINESS_TYPE,
        });
      } catch (seedErr) {
        console.warn("Product seed for new store notice:", seedErr);
      }

      // Switch active organization
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
