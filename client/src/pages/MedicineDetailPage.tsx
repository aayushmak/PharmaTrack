import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

type Batch = {
  id: string;
  batchNumber: string | null;
  expiryDate: string;
  quantityInStock: number;
  sellingPrice: string;
  purchasePrice: string | null;
}

type Medicine = {
  id: string
  name: string
  genericName: string | null
  strength: string | null
  category: string | null
  reorderLevel: number
  totalStock: number
  requiresPrescription: boolean
  defaultSellingPrice: string | null
  batches: Batch[]
}

export function MedicineDetailPage() {
  const { id } = useParams()
  const [med, setMed] = useState<Medicine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReceive, setShowReceive] = useState(false)

  async function load() {
    try {
      const d = await api<{ medicine: Medicine}>(`/api/medicines/${id}`)
      setMed(d.medicine)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medicine")
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) return <div className="text-red-600">{error}</div>
  if (!med) return <div className="text-gray-600">Loading...</div>

  return (
        <div>
      <Link to="/medicines" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to inventory
      </Link>
 
      <div className="flex items-center justify-between mt-2 mb-4">
        <div>
          <h1 className="text-xl font-semibold">{med.name}</h1>
          <p className="text-sm text-slate-500">
            {[med.genericName, med.strength].filter(Boolean).join(" ")} ·{" "}
            {med.category ?? "—"}
            {med.requiresPrescription ? " · Rx only" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/medicines/${med.id}/edit`}
            className="border border-slate-300 rounded px-3 py-2 text-sm hover:bg-slate-100"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowReceive((s) => !s)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2 text-sm"
          >
            Receive stock
          </button>
        </div>
      </div>
 
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex gap-8 text-sm">
        <div>
          <div className="text-slate-400">Total stock</div>
          <div
            className={
              "text-lg font-semibold " +
              (med.totalStock <= med.reorderLevel ? "text-red-600" : "")
            }
          >
            {med.totalStock}
          </div>
        </div>
        <div>
          <div className="text-slate-400">Reorder level</div>
          <div className="text-lg font-semibold">{med.reorderLevel}</div>
        </div>
        <div>
          <div className="text-slate-400">Default price</div>
          <div className="text-lg font-semibold">
            {med.defaultSellingPrice ? `Rs ${med.defaultSellingPrice}` : "—"}
          </div>
        </div>
      </div>
 
      {showReceive && (
        <ReceiveStock
          medicineId={med.id}
          onDone={() => {
            setShowReceive(false);
            load();
          }}
        />
      )}
 
      <h2 className="text-sm font-semibold text-slate-600 mt-6 mb-2">Batches</h2>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Batch</th>
              <th className="px-4 py-2 font-medium">Expiry</th>
              <th className="px-4 py-2 font-medium text-right">In stock</th>
              <th className="px-4 py-2 font-medium text-right">Price</th>
              <th className="px-4 py-2 font-medium text-right">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {med.batches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No batches yet. Receive stock to add one.
                </td>
              </tr>
            )}
            {med.batches.map((b) => (
              <BatchRow key={b.id} batch={b} onDone={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Receive new stck into a fresh batch ---
function ReceiveStock({
  medicineId,
  onDone,
}: {
  medicineId: string;
  onDone: () => void;
}) {
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/batches", {
        method: "POST",
        body: {
          medicineId,
          batchNumber: batchNumber || undefined,
          expiryDate,
          quantity: Number(quantity),
          sellingPrice: Number(sellingPrice),
          purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setBusy(false);
      }
    }

    const cell = "mt-1 w-full border border-slate-300 rounded px-2 py-1.5"

    return (
    <form
      onSubmit={submit}
      className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4"
    >
      <h3 className="text-sm font-semibold text-emerald-800 mb-3">Receive new stock</h3>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-5 gap-3 text-sm">
        <label>
          Batch no.
          <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={cell} />
        </label>
        <label>
          Expiry *
          <input type="date" required value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={cell} />
        </label>
        <label>
          Quantity *
          <input type="number" required min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={cell} />
        </label>
        <label>
          Selling price *
          <input type="number" required min="0" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className={cell} />
        </label>
        <label>
          Purchase price
          <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className={cell} />
        </label>
      </div>
      <div className="mt-3">
        <button
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add batch"}
        </button>
      </div>
    </form>
  );
}

// --- One batch row, with an inline manual adjustment form ---
function BatchRow({ batch, onDone }: { batch: Batch; onDone: () => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = new Date(batch.expiryDate) < new Date();
 
  async function adjust() {
    setError(null);
    try {
      await api(`/api/batches/${batch.id}/adjust`, {
        method: "POST",
        body: { quantity: Number(delta), reason },
      });
      setOpen(false);
      setDelta("");
      setReason("");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed");
    }
  }
 
  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-4 py-2">{batch.batchNumber ?? "—"}</td>
        <td className="px-4 py-2">
          <span className={expired ? "text-red-600" : ""}>
            {new Date(batch.expiryDate).toLocaleDateString()}
          </span>
          {expired && <span className="ml-2 text-xs text-red-600">expired</span>}
        </td>
        <td className="px-4 py-2 text-right">{batch.quantityInStock}</td>
        <td className="px-4 py-2 text-right">Rs {batch.sellingPrice}</td>
        <td className="px-4 py-2 text-right">
          <button onClick={() => setOpen((o) => !o)} className="text-emerald-700 hover:underline">
            Adjust
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3">
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <div className="flex items-end gap-3 text-sm">
              <label>
                Change (+/−)
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. -3"
                  className="mt-1 block w-28 border border-slate-300 rounded px-2 py-1.5"
                />
              </label>
              <label className="flex-1">
                Reason
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Breakage, recount…"
                  className="mt-1 block w-full border border-slate-300 rounded px-2 py-1.5"
                />
              </label>
              <button
                onClick={adjust}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-3 py-2"
              >
                Apply
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
 
