import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const money = (v: string | number) => "Rs " + Number(v).toFixed(2);

type SaleRow = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  total: string;
  discount: string;
  paymentMethod: string;
  customerName: string | null;
  soldByName: string;
  itemCount: number;
};

export function SalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ sales: SaleRow[] }>("/api/sales")
      .then((d) => setRows(d.sales))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Sales</h1>
        <Link
          to="/sell"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded px-3 py-2"
        >
          + New sale
        </Link>
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Invoice</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium text-right">Items</th>
                <th className="px-4 py-2 font-medium">Payment</th>
                <th className="px-4 py-2 font-medium">Cashier</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No sales yet.
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{s.invoiceNumber}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(s.saleDate).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600">{s.itemCount}</td>
                  <td className="px-4 py-2 text-slate-600">{s.paymentMethod}</td>
                  <td className="px-4 py-2 text-slate-600">{s.soldByName}</td>
                  <td className="px-4 py-2 text-right font-medium">{money(s.total)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/sales/${s.id}`} className="text-emerald-700 hover:underline">
                      Receipt
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