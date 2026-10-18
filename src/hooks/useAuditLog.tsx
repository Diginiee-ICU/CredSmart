import { useCallback } from "react";
import { settingsApi } from "@/services/settingsApi";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function useAuditLog() {
  const { user } = useAuth();
  const { orgId } = useOrganization();

  const log = useCallback(
    async ({ action, entity_type, entity_id, details }: AuditLogEntry) => {
      if (!user || !orgId) return;
      try {
        await settingsApi.createAuditLog({
          organization_id: orgId,
          user_id: user.id,
          action,
          resource_type: entity_type,
          resource_id: entity_id || null,
          details: details || {},
        }, orgId);
      } catch (err) {
        console.error("Audit log failed:", err);
      }
    },
    [user, orgId]
  );

  return { log };
}
