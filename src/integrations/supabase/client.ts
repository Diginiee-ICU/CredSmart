// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

const API_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://api.credsmart.online"
).replace(/\/api\/?$/, "");

const TOKEN_KEY = "credsmart_auth_token";
const REFRESH_KEY = "credsmart_refresh_token";
const USER_KEY = "credsmart_auth_user";

export interface User {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  user: User;
}

type AuthListener = (event: string, session: Session | null) => void;
const authListeners = new Set<AuthListener>();

const notifyAuth = (event: string, session: Session | null) => {
  authListeners.forEach((cb) => cb(event, session));
};

const saveSession = (data: any): Session | null => {
  const accessToken = data?.session?.access_token || data?.access_token || data?.accessToken;
  const refreshToken = data?.session?.refresh_token || data?.refresh_token || data?.refreshToken;
  const user = data?.session?.user || data?.user;

  if (!accessToken || !user) return null;

  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return { access_token: accessToken, refresh_token: refreshToken, user };
};

const getHeaders = (isJson = true): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  const orgId = localStorage.getItem("credsmart_active_org_id");
  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { "x-organization-id": orgId } : {}),
  };
};

class QueryBuilder {
  private table: string;
  private method: "GET" | "POST" | "PATCH" | "DELETE" = "GET";
  private queryParams = new URLSearchParams();
  private bodyData: any = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    if (this.method === "GET") this.queryParams.set("select", columns);
    return this;
  }

  insert(values: any) {
    this.method = "POST";
    this.bodyData = values;
    return this;
  }

  upsert(values: any, _options?: any) {
    this.method = "POST";
    this.bodyData = values;
    return this;
  }

  update(values: any) {
    this.method = "PATCH";
    this.bodyData = values;
    return this;
  }

  delete() {
    this.method = "DELETE";
    return this;
  }

  eq(column: string, value: any) {
    if (value !== undefined && value !== null) this.queryParams.set(column, String(value));
    return this;
  }

  or(filters: string) {
    this.queryParams.set("or", filters);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.queryParams.set("order", `${column}.${options?.ascending === false ? "desc" : "asc"}`);
    return this;
  }

  limit(count: number) {
    this.queryParams.set("limit", String(count));
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const qs = this.queryParams.toString();
      const res = await fetch(`${API_ORIGIN}/rest/v1/${this.table}${qs ? `?${qs}` : ""}`, {
        method: this.method,
        headers: getHeaders(true),
        ...(this.bodyData ? { body: JSON.stringify(this.bodyData) } : {}),
      });
      const result = await res.json();
      if (!res.ok) return { data: null, error: { message: result.error || "Request failed" } };
      let data = result;
      if (this.isSingle || this.isMaybeSingle) {
        data = Array.isArray(data) ? data[0] || null : data;
      }
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),

  rpc: async (fn: string, args: Record<string, any> = {}) => {
    try {
      const res = await fetch(`${API_ORIGIN}/rpc/${fn}`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(args),
      });
      const data = await res.json();
      return { data: res.ok ? data : null, error: res.ok ? null : { message: data.error } };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  },

  auth: {
    getSession: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY) || undefined;
      const rawUser = localStorage.getItem(USER_KEY);
      if (!token || !rawUser) return { data: { session: null }, error: null };
      try {
        return { data: { session: { access_token: token, refresh_token: refresh, user: JSON.parse(rawUser) } }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    refreshSession: async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return { data: { session: null, user: null }, error: { message: "No refresh token" } };
      try {
        const res = await fetch(`${API_ORIGIN}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await res.json();
        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(USER_KEY);
          notifyAuth("SIGNED_OUT", null);
          return { data: { session: null, user: null }, error: { message: data.error || "Refresh failed" } };
        }
        const session = saveSession(data);
        notifyAuth("TOKEN_REFRESHED", session);
        return { data: { session, user: session?.user || null }, error: null };
      } catch (err: any) {
        return { data: { session: null, user: null }, error: { message: err.message } };
      }
    },

    getUser: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return { data: { user: null }, error: null };
      try {
        const res = await fetch(`${API_ORIGIN}/api/auth/user`, { headers: getHeaders(true) });
        const data = await res.json();
        if (!res.ok) return { data: { user: null }, error: { message: data.error } };
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { data: { user: data.user }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },

    signUp: async ({ email, password, options }: any) => {
      const res = await fetch(`${API_ORIGIN}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, data: options?.data || {} }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error } };
      const session = saveSession(data);
      notifyAuth("SIGNED_IN", session);
      return { data: { user: session?.user || null, session }, error: null };
    },

    signInWithPassword: async ({ email, password }: any) => {
      const res = await fetch(`${API_ORIGIN}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { data: { user: null, session: null }, error: { message: data.error } };
      const session = saveSession(data);
      notifyAuth("SIGNED_IN", session);
      return { data: { user: session?.user || null, session }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("credsmart_active_org_id");
      notifyAuth("SIGNED_OUT", null);
      return { error: null };
    },

    onAuthStateChange: (callback: AuthListener) => {
      authListeners.add(callback);
      const token = localStorage.getItem(TOKEN_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY) || undefined;
      const rawUser = localStorage.getItem(USER_KEY);
      const session = token && rawUser ? { access_token: token, refresh_token: refresh, user: JSON.parse(rawUser) } : null;
      setTimeout(() => callback("INITIAL_SESSION", session), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (_path: string, file: File) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_ORIGIN}/api/upload/${bucket}`, {
          method: "POST",
          headers: getHeaders(false),
          body: form,
        });
        const data = await res.json();
        return { data: res.ok ? data : null, error: res.ok ? null : { message: data.error } };
      },
      getPublicUrl: (filePath: string) => {
        const cleanPath = filePath.replace(new RegExp(`^${bucket}/`), "");
        return {
          data: {
            publicUrl: `${API_ORIGIN}/storage/v1/object/public/${bucket}/${cleanPath}`,
          },
        };
      },
      remove: async (_paths: string[]) => ({ data: {}, error: null }),
    }),
  },

  functions: {
    invoke: async (name: string, options?: { body?: any }) => {
      const res = await fetch(`${API_ORIGIN}/functions/v1/${name}`, {
        method: "POST",
        headers: getHeaders(true),
        body: JSON.stringify(options?.body || {}),
      });
      const data = await res.json();
      return { data: res.ok ? data : null, error: res.ok ? null : { message: data.error } };
    },
  },

  // Instant joined channel stub for networkInvoicingService.ts
  channel: (_name: string, _config?: any) => {
    const ch = {
      state: "joined",
      on: () => ch,
      subscribe: (cb?: (status: string) => void) => {
        if (cb) setTimeout(() => cb("SUBSCRIBED"), 0);
        return ch;
      },
      send: async (_payload: any) => ({ status: "ok" }),
      unsubscribe: async () => "ok",
    };
    return ch;
  },
  removeChannel: async (_ch: any) => "ok",
};