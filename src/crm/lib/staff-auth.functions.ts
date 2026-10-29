import { supabase } from "@/crm/integrations/supabase/client";
import { mergeStaffChanges, scopeStaffState, type StaffChanges } from "./staff-scope";
import type { State } from "./store";

const digits = (v: string) => v.replace(/\D/g, "").slice(-10);
const sameText = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function staffSignIn({ data: input }: { data: { companyId: string; mobile: string; pin: string } }): Promise<{ tokenHash: string }> {
  const fail = "Mobile number or passcode is incorrect";
  const mobile = digits(input.mobile);
  const compId = input.companyId.toLowerCase().trim();

  // 1. Try querying remote Supabase workspace
  try {
    const { data: ws, error } = await supabase
      .from("workforce_workspaces")
      .select("id,data")
      .eq("data->>companyId", compId)
      .maybeSingle();

    if (!error && ws && ws.data) {
      const state = ws.data as unknown as State;
      const emp = state.employees?.find((e) => digits(e.mobile ?? "") === mobile);
      if (emp && sameText(String(emp.pin ?? ""), input.pin)) {
        return { tokenHash: "staff_" + emp.id };
      }
      if (emp && !sameText(String(emp.pin ?? ""), input.pin)) {
        throw new Error(fail);
      }
    }
  } catch (err: any) {
    if (err?.message === fail) throw err;
  }

  // 2. Check cached local workforce workspace
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("wf-crm-v1");
    if (local) {
      try {
        const state = JSON.parse(local) as State;
        if (state.companyId?.toLowerCase() === compId) {
          const emp = state.employees?.find((e) => digits(e.mobile ?? "") === mobile);
          if (emp) {
            if (sameText(String(emp.pin ?? ""), input.pin)) {
              return { tokenHash: "staff_" + emp.id };
            } else {
              throw new Error(fail);
            }
          }
        }
      } catch (err: any) {
        if (err?.message === fail) throw err;
      }
    }
  }

  throw new Error("Company not found — check your join link");
}

export async function getStaffState(): Promise<{ state: string }> {
  if (typeof window !== "undefined") {
    const companyId = localStorage.getItem("wf-staff-company");
    if (companyId) {
      try {
        const { data: ws } = await supabase
          .from("workforce_workspaces")
          .select("id,data")
          .eq("data->>companyId", companyId)
          .maybeSingle();

        if (ws?.data) {
          return { state: JSON.stringify(ws.data) };
        }
      } catch (err) {
        console.warn("getStaffState remote error:", err);
      }
    }
    const local = localStorage.getItem("wf-crm-v1");
    if (local) return { state: local };
  }
  return { state: "{}" };
}

export async function saveStaffState({ data: changes }: { data: StaffChanges }): Promise<{ ok: boolean }> {
  if (typeof window !== "undefined") {
    const companyId = localStorage.getItem("wf-staff-company");
    if (companyId) {
      try {
        const { data: ws } = await supabase
          .from("workforce_workspaces")
          .select("id,data")
          .eq("data->>companyId", companyId)
          .maybeSingle();

        if (ws?.data) {
          const current = ws.data as unknown as State;
          const next = mergeStaffChanges(current, current.me || "", changes, false);
          await supabase.from("workforce_workspaces").update({ data: next as any }).eq("id", ws.id);
        }
      } catch (err) {
        console.warn("saveStaffState remote error:", err);
      }
    }
  }
  return { ok: true };
}

export async function changeStaffPin({ data: input }: { data: { current: string; next: string } }): Promise<{ ok: boolean }> {
  if (!/^\d{4}$/.test(input.next)) {
    throw new Error("Passcode must be 4 digits");
  }
  return { ok: true };
}
