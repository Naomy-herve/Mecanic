"use client";

import { useCallback, useEffect, useState } from "react";

type Vehicle = {
  id: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  engine: string | null;
  generation: string | null;
  linked_products: number;
};

export default function AdminVehicles() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/vehicles", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) {
        window.location.href = "/compte";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Chargement des véhicules impossible.");
      setRows(Array.isArray(data.vehicles) ? data.vehicles : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des véhicules impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const start = fields.get("yearFrom") ? Number(fields.get("yearFrom")) : null;
    const end = fields.get("yearTo") ? Number(fields.get("yearTo")) : null;

    setError("");
    setSuccess("");
    if (start !== null && end !== null && end < start) {
      setError("L'année de fin doit être égale ou postérieure à l'année de début.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        model: fields.get("model"),
        yearFrom: start,
        yearTo: end,
        engine: fields.get("engine"),
        generation: fields.get("generation"),
        productSku: fields.get("productSku"),
      };
      const response = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.status === 403) {
        window.location.href = "/compte";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");

      form.reset();
      setSuccess("Véhicule enregistré. La liste a été actualisée.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">DONNÉES TECHNIQUES</div>
        <h1 className="page-title">Compatibilité véhicules</h1>
        <p className="muted">Associez des références de pièces aux modèles, années et motorisations Kia confirmés. N'ajoutez que des compatibilités vérifiées.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        {success && <p className="notice" role="status">{success}</p>}

        <form className="form-card" onSubmit={save} style={{ maxWidth: 700, margin: "25px 0" }}>
          <h2>Ajouter un véhicule compatible</h2>
          <div className="field">
            <label htmlFor="vehicle-model">Modèle Kia</label>
            <input id="vehicle-model" name="model" required minLength={2} maxLength={100} placeholder="Ex. Sportage" />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="vehicle-year-from">Année début</label>
              <input id="vehicle-year-from" name="yearFrom" type="number" min="1950" max="2100" />
            </div>
            <div className="field">
              <label htmlFor="vehicle-year-to">Année fin</label>
              <input id="vehicle-year-to" name="yearTo" type="number" min="1950" max="2100" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="vehicle-engine">Motorisation</label>
            <input id="vehicle-engine" name="engine" maxLength={100} placeholder="Ex. 1.6 T-GDi" />
          </div>
          <div className="field">
            <label htmlFor="vehicle-generation">Génération / précision</label>
            <input id="vehicle-generation" name="generation" maxLength={100} placeholder="Ex. NQ5" />
          </div>
          <div className="field">
            <label htmlFor="vehicle-sku">Référence SKU à associer (facultatif)</label>
            <input id="vehicle-sku" name="productSku" maxLength={64} />
            <small className="muted">L'association n'est créée que si le SKU correspond à une pièce active.</small>
          </div>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le véhicule"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2>Véhicules enregistrés</h2>
          <button className="btn btn-outline" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Chargement…" : "Actualiser"}
          </button>
        </div>
        {loading ? (
          <p className="muted" aria-live="polite">Chargement des véhicules…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Modèle</th><th>Années</th><th>Moteur</th><th>Génération</th><th>Pièces liées</th></tr></thead>
              <tbody>
                {rows.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>{vehicle.model}</td>
                    <td>{vehicle.year_from ?? "—"} – {vehicle.year_to ?? "—"}</td>
                    <td>{vehicle.engine || "—"}</td>
                    <td>{vehicle.generation || "—"}</td>
                    <td>{vehicle.linked_products}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="muted" style={{ padding: 15 }}>Aucun véhicule enregistré.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
