import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const money = (v: string | number) => "Rs " + Number(v).toFixed(2);

type SearchRow = {
  id: string;
  name: string;
  genericName: string | null;
  strength: string | null;
  unit: string | null;
  requiresPrescription: boolean;
  defaultSellingPrice: string | null;
  totalStock: number;
};

type CartLine = {
  medicineId: string;
  name: string;
  strength: string | null;
  unit: string | null;
  requiresPrescription: boolean;
  price: number;
  stock: number;
  qty: number;
};

export function SellPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live search (debounced) against the inventory list endpoint.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api<{ medicines: SearchRow[] }>(`/api/medicines?q=${encodeURIComponent(term)}`)
        .then((d) => setResults(d.medicines))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function addToCart(row: SearchRow) {
    if (row.totalStock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.medicineId === row.id);
      if (existing) {
        return prev.map((l) =>
          l.medicineId === row.id
            ? { ...l, qty: Math.min(l.qty + 1, l.stock) }
            : l
        );
      }
      return [
        ...prev,
        {
          medicineId: row.id,
          name: row.name,
          strength: row.strength,
          unit: row.unit,
          requiresPrescription: row.requiresPrescription,
          price: Number(row.defaultSellingPrice ?? 0),
          stock: row.totalStock,
          qty: 1,
        },
      ];
    });
  }

  function setQty(medicineId: string, qty: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.medicineId === medicineId
          ? { ...l, qty: Math.max(1, Math.min(qty || 1, l.stock)) }
          : l
      )
    );
  }

  function removeLine(medicineId: string) {
    setCart((prev) => prev.filter((l) => l.medicineId !== medicineId));
  }

  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const discountNum = Math.max(0, Math.min(Number(discount) || 0, subtotal));
  const total = subtotal - discountNum;
  const hasRx = cart.some((l) => l.requiresPrescription);

  async function completeSale() {
    if (cart.length === 0) return;
    if (
      hasRx &&
      !window.confirm(
        "This sale includes prescription-only medicines. Continue anyway?"
      )
    ) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const d = await api<{ sale: { id: string } }>("/api/sales", {
        method: "POST",
        body: {
          paymentMethod,
          discount: discountNum,
          items: cart.map((l) => ({ medicineId: l.medicineId, quantity: l.qty })),
        },
      });
      nav(`/sales/${d.sale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">New sale</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: search + results */}
        <div className="lg:col-span-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a medicine to add…"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-3"
            autoFocus
          />
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {q.trim() && results.length === 0 && (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No matches.
              </div>
            )}
            {!q.trim() && (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                Start typing to find medicines.
              </div>
            )}
            {results.map((r) => {
              const out = r.totalStock <= 0;
              return (
                <button
                  key={r.id}
                  onClick={() => addToCart(r)}
                  disabled={out}
                  className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>
                    <span className="font-medium">{r.name}</span>{" "}
                    <span className="text-slate-400 text-xs">
                      {[r.genericName, r.strength].filter(Boolean).join(" ")}
                      {r.requiresPrescription ? " · Rx" : ""}
                    </span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {money(r.defaultSellingPrice ?? 0)} ·{" "}
                    <span className={out ? "text-red-600" : ""}>
                      {out ? "out of stock" : `${r.totalStock} in stock`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: cart + checkout */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 h-fit">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Cart</h2>
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          {cart.length === 0 ? (
            <div className="text-slate-400 text-sm py-6 text-center">
              No items yet.
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((l) => (
                <div key={l.medicineId} className="flex items-center gap-2 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">
                      {l.name}
                      {l.requiresPrescription && (
                        <span className="ml-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1">
                          Rx
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs">{money(l.price)} each</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={l.stock}
                    value={l.qty}
                    onChange={(e) => setQty(l.medicineId, Number(e.target.value))}
                    className="w-16 border border-slate-300 rounded px-2 py-1"
                  />
                  <div className="w-20 text-right">{money(l.price * l.qty)}</div>
                  <button
                    onClick={() => removeLine(l.medicineId)}
                    className="text-slate-400 hover:text-red-600"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 border border-slate-300 rounded px-2 py-1 text-right"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="WALLET">Wallet</option>
              </select>
            </div>
            <div className="flex justify-between text-base font-semibold pt-1">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
          </div>

          <button
            onClick={completeSale}
            disabled={submitting || cart.length === 0}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 disabled:opacity-50"
          >
            {submitting ? "Completing…" : "Complete sale"}
          </button>
          <p className="mt-2 text-xs text-slate-400 text-center">
            Final total is confirmed by the server at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}