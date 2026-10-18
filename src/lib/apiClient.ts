import { supabase } from "@/integrations/supabase/client";

/**
 * Standard API error contract matching CredSmart centralized client architecture.
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Normalized API response envelope returned by all apiClient invocations.
 */
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  method?: HttpMethod | string;
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>;
  organizationId?: string | null;
  skipAuth?: boolean;
  timeout?: number;
}

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

export const DEFAULT_API_BASE_URL = "https://api.credsmart.online/api";

let customBaseUrlOverride: string | null = null;

/**
 * Dynamically resolves the current API base URL following the priority order:
 * 1. Runtime override set via setApiBaseUrl(url)
 * 2. window.__API_BASE_URL__ (for browser runtime config / test environments)
 * 3. import.meta.env.VITE_API_BASE_URL (Vite build / env variable)
 * 4. Default: https://api.credsmart.online/api
 */
export function getApiBaseUrl(): string {
  if (customBaseUrlOverride) {
    return customBaseUrlOverride;
  }
  if (typeof window !== "undefined" && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__;
  }
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return DEFAULT_API_BASE_URL;
}

/**
 * Helper to override the API base URL programmatically (useful for testing or switching environments).
 * Pass null or empty string to reset to default resolution.
 */
export function setApiBaseUrl(url: string | null): void {
  customBaseUrlOverride = url && url.trim().length > 0 ? url.trim() : null;
}

/**
 * Exported constant for static consumers. Note: Prefer getApiBaseUrl() for dynamic overrides.
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Constructs a fully qualified URL by appending an endpoint to the base URL and serializing query params.
 */
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>
): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  let fullUrl: string;

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    fullUrl = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    fullUrl = `${base}${cleanEndpoint}`;
  }

  if (params && Object.keys(params).length > 0) {
    const urlObj = new URL(fullUrl);
    for (const [key, val] of Object.entries(params)) {
      if (val === undefined || val === null) {
        continue;
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== undefined && item !== null) {
            urlObj.searchParams.append(key, String(item));
          }
        }
      } else {
        urlObj.searchParams.append(key, String(val));
      }
    }
    return urlObj.toString();
  }

  return fullUrl;
}

/**
 * Core centralized HTTP client for CredSmart.
 * Encapsulates:
 * - Base URL configuration
 * - Automatic active Supabase JWT Bearer token retrieval and injection
 * - Active tenant organization ID header propagation (x-organization-id)
 * - JSON serialization of request payloads
 * - Transparent 401 token refresh via supabase.auth.refreshSession() and single retry
 * - Robust response normalization into { data, error }
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    params,
    organizationId,
    skipAuth = false,
    headers = {},
    timeout,
    signal,
    ...customConfig
  } = options;

  // 1. Build Fully Qualified URL with query parameters
  const targetUrl = buildApiUrl(endpoint, params);

  // 2. Prepare Headers
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  // Determine Body & Content-Type
  let requestBody: BodyInit | undefined = undefined;
  if (body !== undefined && body !== null) {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
    const isArrayBuffer = typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer;
    const isSearchParams = typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
    const isString = typeof body === "string";

    if (isFormData || isBlob || isArrayBuffer || isSearchParams || isString) {
      requestBody = body as BodyInit;
      if (isString && !requestHeaders.has("Content-Type")) {
        requestHeaders.set("Content-Type", "application/json");
      }
    } else {
      requestBody = JSON.stringify(body);
      if (!requestHeaders.has("Content-Type")) {
        requestHeaders.set("Content-Type", "application/json");
      }
    }
  }

  // 3. Attach Organization ID Header (x-organization-id)
  let activeOrgId: string | undefined;
  if (organizationId !== undefined) {
    if (organizationId !== null && organizationId !== "") {
      activeOrgId = organizationId;
    }
  } else if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem("credsmart_active_org_id");
      if (stored && stored.trim() !== "") {
        activeOrgId = stored.trim();
      }
    } catch {
      // localStorage may fail in restricted/sandboxed environments
    }
  }

  if (activeOrgId && !requestHeaders.has("x-organization-id")) {
    requestHeaders.set("x-organization-id", activeOrgId);
  }

  // 4. Attach Supabase JWT Bearer Token
  if (!skipAuth && !requestHeaders.has("Authorization")) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
      }
    } catch (authErr) {
      console.warn("apiClient: Failed to retrieve active session token:", authErr);
    }
  }

  // 5. Setup Timeout / Abort Handling
  let abortTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let effectiveSignal = signal;

  if (timeout && timeout > 0) {
    const controller = new AbortController();
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }
    abortTimeoutId = setTimeout(() => controller.abort(), timeout);
    effectiveSignal = controller.signal;
  }

  // 6. Execute Request Helper
  const execute = async (authOverride?: string): Promise<Response> => {
    const headersToUse = new Headers(requestHeaders);
    if (authOverride) {
      headersToUse.set("Authorization", authOverride);
    }
    return fetch(targetUrl, {
      ...customConfig,
      method,
      headers: headersToUse,
      body: requestBody,
      signal: effectiveSignal,
    });
  };

  try {
    let response: Response;
    try {
      response = await execute();
    } catch (fetchErr: unknown) {
      const isAbort =
        (fetchErr as { name?: string })?.name === "AbortError" ||
        (effectiveSignal?.aborted ?? false);
      const message = fetchErr instanceof Error ? fetchErr.message : "Network request failed";
      return {
        data: null,
        error: {
          message: isAbort ? "Request timed out or was aborted" : message,
          code: isAbort ? "ABORTED" : "NETWORK_ERROR",
          status: 0,
          details: fetchErr,
        },
      };
    }

    // 7. Transparent 401 Unauthorized Session Refresh & Single Retry
    if (response.status === 401 && !skipAuth) {
      try {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        const newToken = refreshData?.session?.access_token;
        if (!refreshErr && newToken) {
          requestHeaders.set("Authorization", `Bearer ${newToken}`);
          try {
            response = await execute(`Bearer ${newToken}`);
          } catch (retryErr: unknown) {
            const message = retryErr instanceof Error ? retryErr.message : "Network retry failed";
            return {
              data: null,
              error: {
                message,
                code: "NETWORK_ERROR",
                status: 0,
                details: retryErr,
              },
            };
          }
        }
      } catch (refreshErr) {
        console.warn("apiClient: Token refresh failed on 401:", refreshErr);
      }
    }

    // 8. Handle HTTP Error Responses (!response.ok)
    if (!response.ok) {
      let errorData: any = null;
      const contentType = response.headers.get("content-type") || "";
      try {
        if (contentType.includes("application/json")) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            errorData = text && text.trim().length > 0 ? { message: text } : null;
          }
        }
      } catch {
        errorData = null;
      }

      const message =
        errorData?.error?.message ||
        errorData?.message ||
        (typeof errorData?.error === "string" ? errorData.error : null) ||
        response.statusText ||
        `Request failed with status ${response.status}`;

      const code =
        errorData?.error?.code ||
        errorData?.code ||
        `HTTP_${response.status}`;

      return {
        data: null,
        error: {
          message,
          code,
          status: response.status,
          details: errorData,
        },
      };
    }

    // 9. Handle 204 No Content
    if (response.status === 204) {
      return { data: null, error: null };
    }

    // 10. Parse Success Body
    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      return { data: null, error: null };
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(responseText);
    } catch {
      // Body is not valid JSON (e.g., plain text or HTML)
      return {
        data: responseText as unknown as T,
        error: null,
      };
    }

    // Check if JSON payload represents an API-level error inside a 200 OK envelope
    if (
      parsedJson &&
      typeof parsedJson === "object" &&
      "error" in parsedJson &&
      parsedJson.error !== null &&
      !("data" in parsedJson && parsedJson.data !== null)
    ) {
      const err = parsedJson.error;
      const errMsg = err?.message || (typeof err === "string" ? err : "API error returned");
      const errCode = err?.code || `HTTP_${response.status}`;
      return {
        data: null,
        error: {
          message: errMsg,
          code: errCode,
          status: response.status,
          details: parsedJson,
        },
      };
    }

    // Unwrap envelope: if { data: ... } wrapped by backend envelope, unwrap to data
    let payloadResult: any = parsedJson;
    if (
      parsedJson &&
      typeof parsedJson === "object" &&
      !Array.isArray(parsedJson) &&
      "data" in parsedJson &&
      ("error" in parsedJson || "status" in parsedJson || "meta" in parsedJson || "message" in parsedJson || Object.keys(parsedJson).length <= 2)
    ) {
      payloadResult = parsedJson.data;
    }

    return {
      data: payloadResult as T,
      error: null,
    };
  } finally {
    if (abortTimeoutId) {
      clearTimeout(abortTimeoutId);
    }
  }
}

/**
 * HTTP GET helper.
 */
export async function apiGet<T>(
  endpoint: string,
  paramsOrOptions?: Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>> | RequestOptions,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  if (options) {
    return apiClient<T>(endpoint, {
      ...options,
      method: "GET",
      params: (paramsOrOptions as Record<string, string | number | boolean | null | undefined>) || options.params,
    });
  }
  if (!paramsOrOptions) {
    return apiClient<T>(endpoint, { method: "GET" });
  }

  const isOptions =
    "headers" in paramsOrOptions ||
    "params" in paramsOrOptions ||
    "organizationId" in paramsOrOptions ||
    "skipAuth" in paramsOrOptions ||
    "signal" in paramsOrOptions ||
    "timeout" in paramsOrOptions ||
    "method" in paramsOrOptions;

  if (isOptions) {
    return apiClient<T>(endpoint, { ...(paramsOrOptions as RequestOptions), method: "GET" });
  }

  return apiClient<T>(endpoint, {
    method: "GET",
    params: paramsOrOptions as Record<string, string | number | boolean | null | undefined>,
  });
}

/**
 * HTTP POST helper.
 */
export async function apiPost<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiClient<T>(endpoint, { ...options, method: "POST", body });
}

/**
 * HTTP PUT helper.
 */
export async function apiPut<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiClient<T>(endpoint, { ...options, method: "PUT", body });
}

/**
 * HTTP PATCH helper.
 */
export async function apiPatch<T>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiClient<T>(endpoint, { ...options, method: "PATCH", body });
}

/**
 * HTTP DELETE helper.
 */
export async function apiDelete<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return apiClient<T>(endpoint, { ...options, method: "DELETE" });
}
