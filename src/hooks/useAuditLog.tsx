import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
}

export function useAuditLog() {
  const { user } = useAuth();
  const { orgId } = useOrganization();

  const log = useCallback(
    async ({ action, entity_type, entity_id, details }: AuditLogEntry) => {
      if (!user || !orgId) return;
      try {
        await supabase.from("audit_logs").insert({
          organization_id: orgId,
          user_id: user.id,
          action,
          entity_type,
          entity_id: entity_id || null,
          details: details || {},
        });
      } catch (err) {
        console.error("Audit log failed:", err);
      }
    },
    [user, orgId]
  );

  return { log };
}
