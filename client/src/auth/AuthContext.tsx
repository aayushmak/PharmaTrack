import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, clearToken } from "../api/client";

export type User = {
  id: string;
  name: string;
  username: string;
  role: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token is stored, confirm it by fetching the current user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const data = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}