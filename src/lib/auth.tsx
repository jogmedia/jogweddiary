import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "staff" | null;

type AuthState = {
  user: User | null;
  session: Session | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role);
        setRole(roles.includes("admin") ? "admin" : roles.length ? "staff" : null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value: AuthState = {
    user: session?.user ?? null,
    session,
    role,
    loading,
    isAdmin: role === "admin",
    signOut: async () => {
      await supabase.auth.signOut();
      setRole(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
