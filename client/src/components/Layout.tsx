import { type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"

const NAV = [{ to: "/medicines", label: "Inventory"}]

export function Layout({ children }: {childern: ReactNode}) {
  const {user, logout} = useAuth()
  const loc = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/medicines" className="font-semibold text-emerald-700">
              PharmaTrack
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    loc.pathname.startsWith(n.to)
                      ? "text-emerald-700 font-medium"
                      : "text-slate-500 hover:text-slate-800"
                  }
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {user?.name} · {user?.role}
            </span>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-red-600"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}