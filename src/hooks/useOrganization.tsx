import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { seedProductsByBusinessType } from "@/data/seed-products";

const PENDING_ONBOARDING_KEY = "credsmart_pending_onboarding_v1";
const LEGACY_PENDING_ONBOARDING_KEY = "nexis_pending_onboarding_v1";
const PENDING_ONBOARDING_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_BUSINESS_TYPE = "General Store";
const DEFAULT_TAX_RATE = 18;
const DEFAULT_INVOICE_PREFIX = "INV";

interface OrgData {
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
}

interface OrgContextValue {
  org: OrgData | null;
  orgId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  userRole: string | null;
}

interface PendingOnboardingData {
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

const fetchMembership = async (userId: string) => {
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (error) {
    console.warn("Failed to fetch organization membership:", error.message);
    return null;
  }

  if (data) {
    return {
      organization_id: data.organization_id,
      role: data.role === "cashier" ? "cashier" : "store_owner",
    };
  }

  return null;
};

const seedOrgProducts = async (orgId: string, payload: PendingOnboardingData) => {
  const baseSeeds = seedProductsByBusinessType[payload.businessType] || seedProductsByBusinessType["Other"];

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
    ...payload.scrapedProducts.map((sp, idx) => ({
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
    throw new Error(`Failed to import products: ${insertProductsError.message}`);
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

  const { error: insertBatchesError } = await supabase
    .from("product_batches")
    .insert(batchesToInsert);

  if (insertBatchesError) {
    throw new Error(`Failed to create product batches: ${insertBatchesError.message}`);
  }
};

const provisionOrganization = async (
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
  payload: PendingOnboardingData
) => {
  const bootstrapQuery = supabase.rpc(
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
  );

  const { data: bootstrapData, error: bootstrapError } = await bootstrapQuery
    .maybeSingle<BootstrapOrgResult>();

  if (bootstrapData?.organization_id) {
    try {
      await seedOrgProducts(bootstrapData.organization_id, payload);
      clearPendingOnboarding();
    } catch (seedError) {
      console.error("Organization seeded with warnings:", seedError);
    }

    for (let i = 0; i < 4; i++) {
      const membership = await fetchMembership(user.id);
      if (membership) return membership;
      await wait(300 * (i + 1));
    }

    return null;
  }
  // If RPC did not return an organization id, decide whether to fallback.
  if (!bootstrapData?.organization_id) {
    if (bootstrapError) {
      // If the error is _not_ a missing function, abort and surface the error.
      if (!isMissingBootstrapFunction(bootstrapError)) {
        console.error("Organization provisioning failed:", bootstrapError.message || "Unknown error");
        return null;
      }
      // else: bootstrap function missing -> fall back to client-side provisioning below
    } else {
      // RPC returned no data and no error: unexpected, abort to avoid unsafe fallback.
      console.error("bootstrap_organization returned no data; aborting client-side fallback.");
      return null;
    }
  }

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
    // Support older DB schemas where onboarding columns may not exist yet.
    const { data: fallbackOrgData, error: fallbackOrgError } = await supabase
      .from("organizations")
      .insert({ name: richOrganizationInsert.name })
      .select("id")
      .single();

    if (fallbackOrgData?.id) {
      orgId = fallbackOrgData.id;
    } else {
      console.error(
        "Organization provisioning failed:",
        fallbackOrgError?.message || richOrgError?.message || "Unknown error"
      );
      return null;
    }
  }

  // Best-effort fallback for environments where org trigger is missing.
  // If policy blocks this insert, membership should still be created by DB trigger.
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

  try {
    await seedOrgProducts(orgId, payload);
    clearPendingOnboarding();
  } catch (seedError) {
    console.error("Organization seeded with warnings:", seedError);
  }

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
  loading: true,
  refresh: async () => {},
  userRole: null,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const provisionAttemptedRef = useRef<Set<string>>(new Set());

  const fetchOrg = useCallback(async () => {
    setLoading(true);

    if (!user) {
      provisionAttemptedRef.current.clear();
      setOrg(null);
      setOrgId(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      let membership = await fetchMembership(user.id);
      const pending = getPendingOnboarding();
      const shouldAttemptProvision =
        !membership &&
        Boolean(pending) &&
        !provisionAttemptedRef.current.has(user.id);

      if (shouldAttemptProvision && pending) {
        provisionAttemptedRef.current.add(user.id);
        membership = await provisionOrganization(
          {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata as Record<string, unknown>,
          },
          pending
        );
      }

      if (!membership) {
        setOrg(null);
        setOrgId(null);
        setUserRole("store_owner");
        return;
      }

      setOrgId(membership.organization_id);
      const finalRole = membership.role === "cashier" ? "cashier" : "store_owner";
      setUserRole(finalRole);

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", membership.organization_id)
        .maybeSingle();

      if (orgError) {
        console.warn("Failed to load organization details:", orgError.message);
      }

      if (orgData) {
        setOrg({
          id: orgData.id,
          name: orgData.name || "",
          address: orgData.address || "",
          phone: orgData.phone || "",
          email: orgData.email || "",
          gstin: orgData.gstin || "",
          pan: orgData.pan || "",
          invoice_prefix: orgData.invoice_prefix || "INV",
          logo_url: orgData.logo_url || "",
          tax_rate: orgData.tax_rate ?? 18,
          business_type: orgData.business_type || "",
        });
      } else {
        setOrg(null);
      }
    } catch (error) {
      console.error("Failed to initialize organization context:", error);
      setOrg(null);
      setOrgId(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  return (
    <OrgContext.Provider value={{ org, orgId, loading, refresh: fetchOrg, userRole }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrganization() {
  return useContext(OrgContext);
}
