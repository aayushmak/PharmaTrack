import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

type Form = {
  name: string;
  genericName: string;
  form: string;
  strength: string;
  unit: string;
  manufacturer: string;
  category: string;
  rackLocation: string;
  reorderLevel: string;
  requiresPrescription: boolean;
  defaultSellingPrice: string;
};

const EMPTY: Form = {
  name: "",
  genericName: "",
  form: "",
  strength: "",
  unit: "",
  manufacturer: "",
  category: "",
  rackLocation: "",
  reorderLevel: "0",
  requiresPrescription: false,
  defaultSellingPrice: "",
};

export function MedicineFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // When editing, pull the current values in.
  useEffect(() => {
    if (!id) return;
    api<{ medicine: Record<string, unknown> }>(`/api/medicines/${id}`)
      .then((d) => {
        const m = d.medicine;
        setForm({
          name: (m.name as string) ?? "",
          genericName: (m.genericName as string) ?? "",
          form: (m.form as string) ?? "",
          strength: (m.strength as string) ?? "",
          unit: (m.unit as string) ?? "",
          manufacturer: (m.manufacturer as string) ?? "",
          category: (m.category as string) ?? "",
          rackLocation: (m.rackLocation as string) ?? "",
          reorderLevel: String(m.reorderLevel ?? 0),
          requiresPrescription: Boolean(m.requiresPrescription),
          defaultSellingPrice: (m.defaultSellingPrice as string) ?? "",
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      name: form.name,
      genericName: form.genericName || undefined,
      form: form.form || undefined,
      strength: form.strength || undefined,
      unit: form.unit || undefined,
      manufacturer: form.manufacturer || undefined,
      category: form.category || undefined,
      rackLocation: form.rackLocation || undefined,
      reorderLevel: Number(form.reorderLevel) || 0,
      requiresPrescription: form.requiresPrescription,
      defaultSellingPrice: form.defaultSellingPrice
        ? Number(form.defaultSellingPrice)
        : undefined,
    };
    try {
      if (editing) await api(`/api/medicines/${id}`, { method: "PUT", body: payload });
      else await api(`/api/medicines`, { method: "POST", body: payload });
      nav("/medicines");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const text = (label: string, k: keyof Form) => (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        value={form[k] as string}
        onChange={(e) => set(k, e.target.value as Form[typeof k])}
        className="mt-1 w-full border border-slate-300 rounded px-3 py-2"
      />
    </label>
  );

  return (
    <div className="max-w-2xl">
      <h1 className="text-lg font-semibold mb-4">
        {editing ? "Edit medicine" : "Add medicine"}
      </h1>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-2 gap-4 bg-white border border-slate-200 rounded-lg p-5"
      >
        <div className="col-span-2">{text("Name *", "name")}</div>
        {text("Generic name", "genericName")}
        {text("Category", "category")}
        {text("Form (tablet, syrup…)", "form")}
        {text("Strength (500mg…)", "strength")}
        {text("Unit (strip, bottle…)", "unit")}
        {text("Manufacturer", "manufacturer")}
        {text("Rack location", "rackLocation")}
        {text("Reorder level", "reorderLevel")}
        {text("Default selling price (Rs)", "defaultSellingPrice")}
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requiresPrescription}
            onChange={(e) => set("requiresPrescription", e.target.checked)}
          />
          <span className="text-slate-600">Requires prescription</span>
        </label>
        <div className="col-span-2 flex gap-3">
          <button
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => nav("/medicines")}
            className="text-slate-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}