import React, { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let subscription: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Safety timeout to prevent any infinite spinner if supabase client takes time
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    // 1. Fetch current session once (safely with try/catch to swallow AbortError)
    (async () => {
      try {
        const result = await supabase.auth.getSession();
        const sess = (result as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.data?.session ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (isMounted) {
          setSession(sess);
          setUser(sess?.user ?? null);
          setLoading(false);
        }
      } catch (err: unknown) {
        // AbortErrors are expected in some environments (e.g. preview mode); log at info level.
        if (err?.name === "AbortError") {
          console.info("Session check aborted:", err?.message ?? err);
        } else {
          console.warn("Session check error:", err);
        }
        if (isMounted) setLoading(false);
      }
    })();

    // 2. Subscribe to auth state changes (defensive)
    try {
      const onAuth = supabase.auth.onAuthStateChange((_event, s) => {
        if (isMounted) {
          setSession(s);
          setUser(s?.user ?? null);
          setLoading(false);
        }
      });
      subscription = (onAuth as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.data?.subscription ?? null; // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (err) {
      console.warn("Auth subscription failed:", err);
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      try {
        subscription?.unsubscribe?.();
      } catch (_) {
        // ignore errors during cleanup
      }
    };
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

