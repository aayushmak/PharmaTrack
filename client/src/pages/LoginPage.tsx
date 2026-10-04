import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, user } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Skip the form.
  if (user) return <Navigate to="/medicines" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      nav("/medicines", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-emerald-700 mb-1">PharmaTrack</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to continue</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <label className="block text-sm mb-3">
          <span className="text-slate-600">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
            autoFocus
          />
        </label>
        <label className="block text-sm mb-5">
          <span className="text-slate-600">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
          />
        </label>

        <button
          disabled={busy}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}