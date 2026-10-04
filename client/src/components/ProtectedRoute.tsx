import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Gate for authenticated pages: waits for the auth check, then either renders the page or redirects to login.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className = "p-8 text-slate-500">Loading...</div>
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}