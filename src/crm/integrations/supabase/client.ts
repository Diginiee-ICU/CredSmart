import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const CRM_SUPABASE_URL = "https://wqllixoghlxvapmziilk.supabase.co";
const CRM_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GP55TeYmJ05j2ypHUzlHvA_GtQFSPqA";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

// Custom fetch to safely handle opaque publishable API keys
const createSupabaseFetch = (customFetch?: typeof fetch) => {
  const baseFetch = customFetch || fetch;
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (isNewSupabaseApiKey(CRM_SUPABASE_PUBLISHABLE_KEY) && headers.get("Authorization") === `Bearer ${CRM_SUPABASE_PUBLISHABLE_KEY}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", CRM_SUPABASE_PUBLISHABLE_KEY);
    return baseFetch(input, { ...init, headers });
  };
};

export const supabase = createClient<Database>(
  CRM_SUPABASE_URL,
  CRM_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storageKey: "crm_supabase_auth_token", // STRICT ISOLATION FROM POS
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      fetch: createSupabaseFetch(),
    },
  }
);

export function disconnectCrmRealtime(): void {
  try {
    if (supabase && supabase.realtime) {
      void supabase.realtime.disconnect();
    }
  } catch (err) {
    console.warn("disconnectCrmRealtime error:", err);
  }
}
