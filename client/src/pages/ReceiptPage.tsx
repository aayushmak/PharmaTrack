import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

const money = (v: string | number) => "Rs " + Number(v).toFixed(2);

type Item = {
  id: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  medicine: { name: string; strength: string | null; unit: string | null };
  batch: { batchNumber: string | null; expiryDate: string } | null;
}

type Sale = {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  subtotal: string;
  discount: string;
  total: string;
  paymentMethod: string;
  customer: { name: string; phone: string | null } | null;
  soldBy: { name: string; username: string };
  items: Item[];
}

export function ReceiptPage() {
  const { id} = useParama()
  const [sale, setSale] = useState<Sale | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ sale: Sale}>(`/api/sales/${id}`)
      .then((d) => setSale(d.sale))
      .catch((e) => setError( e instanceof Error ? e.message : "Falied to load"))
  }, [id])

  if (error ) return <div className = "text-red-600>{error}</div>
  if (!sale) return <div className = "text-slate-500">Loading...</div>

  return (
    <div className="max-w-md mx-auto">
      {/* Actions — hidden when printing */}
      <div className="no-print flex items-center justify-between mb-4">
        <Link to="/sales" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to sales
        </Link>
        <div className="flex gap-2">
          <Link
            to="/sell"
            className="border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-100"
          >
            New sale
          </Link>
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 text-sm"
          >
            Print receipt
          </button>
        </div>
      </div>
 
      {/* Receipt */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-center mb-4">
          <div className="text-lg font-semibold text-emerald-700">PharmaTrack</div>
          <div className="text-xs text-slate-500">Sales Receipt</div>
        </div>
 
        <div className="text-sm text-slate-600 space-y-1 mb-4">
          <div className="flex justify-between">
            <span>Invoice</span>
            <span className="font-medium text-slate-800">{sale.invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date</span>
            <span>{new Date(sale.saleDate).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier</span>
            <span>{sale.soldBy.name}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between">
              <span>Customer</span>
              <span>{sale.customer.name}</span>
            </div>
          )}
        </div>
 
        <table className="w-full text-sm mb-4">
          <thead className="text-slate-400 text-left border-b border-slate-200">
            <tr>
              <th className="py-1 font-medium">Item</th>
              <th className="py-1 font-medium text-right">Qty</th>
              <th className="py-1 font-medium text-right">Price</th>
              <th className="py-1 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="border-b border-slate-50">
                <td className="py-1">
                  {it.medicine.name}
                  {it.medicine.strength ? ` ${it.medicine.strength}` : ""}
                </td>
                <td className="py-1 text-right">{it.quantity}</td>
                <td className="py-1 text-right">{money(it.unitPrice)}</td>
                <td className="py-1 text-right">{money(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
 
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>{money(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>{money(sale.discount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold border-t border-slate-200 pt-1 mt-1">
            <span>Total</span>
            <span>{money(sale.total)}</span>
          </div>
          <div className="flex justify-between text-slate-500 pt-1">
            <span>Paid by</span>
            <span>{sale.paymentMethod}</span>
          </div>
        </div>
 
        <p className="text-center text-xs text-slate-400 mt-6">
          Thank you! Prices are MRP (tax inclusive).
        </p>
      </div>
    </div>
  );
}