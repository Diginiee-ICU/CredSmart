import * as React from "react";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { toast } from "@/hooks/use-toast";

/**
 * Props for the CRMPermissionGate component.
 */
export interface CRMPermissionGateProps {
  /** CRM Module name to verify (e.g. "attendance", "salary", "tasks", "roles", "broadcasts", "meetings", "ai_assistant", "support") */
  module: string;
  /** Action required on the module (e.g. "view", "edit", "create", "approve", "manage", "send", "access") */
  action: string;
  /** Content rendered when permission is granted */
  children: React.ReactNode;
  /** Optional fallback component rendered if permission is denied (defaults to null) */
  fallback?: React.ReactNode;
  /**
   * If true, fires a "Not Authorized" toast when access is denied.
   * @default true
   */
  showToast?: boolean;
  /**
   * If true, suppresses the "Not Authorized" toast notification on denial.
   * @default false
   */
  suppressToast?: boolean;
  /** Optional custom message displayed in the toast notification */
  toastMessage?: string;
}

/**
 * CRMPermissionGate
 * Conditional permission wrapper. If permission is denied, renders fallback (or null)
 * and dispatches a "Not Authorized" toast safely inside a useEffect hook.
 */
export function CRMPermissionGate({
  module,
  action,
  children,
  fallback = null,
  showToast = true,
  suppressToast = false,
  toastMessage,
}: CRMPermissionGateProps): React.ReactElement | null {
  const { hasPermission, loading, isSuperAdmin } = useCRMPermission(module, action);
  const isAllowed = isSuperAdmin || hasPermission(module, action);
  const toastFiredRef = React.useRef(false);

  React.useEffect(() => {
    const shouldNotify = showToast && !suppressToast;
    if (!loading && !isAllowed && shouldNotify && !toastFiredRef.current) {
      toastFiredRef.current = true;
      toast({
        title: "Not Authorized",
        description:
          toastMessage ?? `You do not have permission to ${action} in ${module}.`,
        variant: "destructive",
      });
    }
  }, [loading, isAllowed, module, action, showToast, suppressToast, toastMessage]);

  if (loading) {
    return null;
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
