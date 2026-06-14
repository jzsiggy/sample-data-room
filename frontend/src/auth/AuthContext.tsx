import { ReactNode, createContext, useEffect, useState } from "react";
import { apiFetch, apiJson } from "../api";

export interface Owner {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthContextValue {
  owner: Owner | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function submitCredentials(
  path: string,
  email: string,
  password: string,
): Promise<Owner> {
  return apiJson<Owner>(path, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the session on load so a returning owner stays signed in.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/auth/me")
      .then(async (res) => (res.ok ? ((await res.json()) as Owner) : null))
      .then((value) => {
        if (!cancelled) setOwner(value);
      })
      .catch(() => {
        if (!cancelled) setOwner(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = async (email: string, password: string) => {
    setOwner(await submitCredentials("/auth/register", email, password));
  };

  const login = async (email: string, password: string) => {
    setOwner(await submitCredentials("/auth/login", email, password));
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setOwner(null);
  };

  return (
    <AuthContext.Provider value={{ owner, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
