import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

export interface LegacyRedirectProps {
  to: string;
}

/**
 * Universal LegacyRedirect component that forwards legacy route accesses
 * to their new destination while preserving all dynamic path parameters (:id, :slug, etc.),
 * URL query parameters (?tab=..., ?page=...), and hash fragments (#section).
 * Uses HTTP replace to prevent cluttering the browser history stack.
 */
export function LegacyRedirect({ to }: LegacyRedirectProps) {
  const location = useLocation();
  const params = useParams();

  let destination = to;

  // Substitute all dynamic path parameters (:paramName and wildcard *)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      if (key === "*") {
        destination = destination.replace("/*", `/${value}`).replace("*", value);
      } else {
        destination = destination.replace(`:${key}`, encodeURIComponent(value));
      }
    }
  }

  // Preserve query string and hash fragment
  const search = location.search || "";
  const hash = location.hash || "";
  const fullTarget = `${destination}${search}${hash}`;

  return <Navigate to={fullTarget} replace />;
}

export default LegacyRedirect;
