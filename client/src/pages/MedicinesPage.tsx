import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type MedicineRow = {
  id: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
  category: string | null;
  rackLocation: string | null;
  reorderLevel: number;
  requiresPrescription: boolean;
  defaultSellingPrice: string | null;
  totalStock: number;
  isLowStock: boolean;
};

export function MedicinesPage() {
  const [rows, setRows] = useState<MedicineRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(query = "") {
    setLoading(true);
    setError(null);
    try {
      const d = await api<{ medicines: MedicineRow[] }>(
        `/api/medicines${query ? `?q=${encodeURIComponent(query)}` : ""}`
      );
      setRows(d.medicines);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Inventory</h1>
        <Link
          to="/medicines/new"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded px-3 py-2"
        >
          + Add medicine
        </Link>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or generic…"
          className="border border-slate-300 rounded px-3 py-2 text-sm w-72"
        />
        <button className="border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-100">
          Search
        </button>
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              load();
            }}
            className="text-sm text-slate-500"
          >
            Clear
          </button>
        )}
      </form>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Rack</th>
                <th className="px-4 py-2 font-medium text-right">Stock</th>
                <th className="px-4 py-2 font-medium text-right">Price</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No medicines found.
                  </td>
                </tr>
              )}
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-slate-400 text-xs">
                      {[m.genericName, m.strength].filter(Boolean).join(" ")}
                      {m.requiresPrescription ? " · Rx" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{m.category ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{m.rackLocation ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={m.isLowStock ? "text-red-600 font-semibold" : ""}>
                      {m.totalStock}
                    </span>
                    {m.isLowStock && (
                      <span className="ml-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
                        Low
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">
                    {m.defaultSellingPrice ? `Rs ${m.defaultSellingPrice}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/medicines/${m.id}`}
                      className="text-emerald-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}