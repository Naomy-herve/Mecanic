"use client";

import { useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; slug: string; description: string | null; product_count: number };

function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/categories", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Chargement des catégories impossible.");
      setRows(Array.isArray(data.categories) ? data.categories : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des catégories impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(""); setOk("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") || "").trim();
    const typedSlug = String(values.get("slug") || "").trim();
    const category = { name, slug: typedSlug || makeSlug(name), description: String(values.get("description") || "").trim() };
    try {
      const response = await fetch("/api/admin/categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, category } : category),
      });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setOk(editing ? "Catégorie modifiée." : "Catégorie créée.");
      setEditing(null);
      form.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (deletingId || !window.confirm("Supprimer cette catégorie ? Les catégories contenant des pièces ne peuvent pas être supprimées.")) return;
    setDeletingId(id); setError(""); setOk("");
    try {
      const response = await fetch("/api/admin/categories?id=" + encodeURIComponent(id), { method: "DELETE" });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Suppression impossible.");
      setOk("Catégorie supprimée.");
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page-shell"><div className="container">
      <div className="section-kicker">GESTION DU CATALOGUE</div>
      <h1 className="page-title">Catégories</h1>
      <p className="muted">Créez et organisez les familles de pièces affichées dans la boutique.</p>
      {error && <p className="notice error" role="alert">{error}</p>}
      {ok && <p className="notice" role="status">{ok}</p>}
      <form className="form-card" onSubmit={save} style={{ maxWidth: 720, margin: "25px 0" }}>
        <h2>{editing ? "Modifier la catégorie" : "Ajouter une catégorie"}</h2>
        <div className="form-grid">
          <div className="field"><label htmlFor="category-name">Nom</label><input id="category-name" name="name" key={editing?.id || "new"} defaultValue={editing?.name || ""} required minLength={2} maxLength={100} /></div>
          <div className="field"><label htmlFor="category-slug">URL (slug)</label><input id="category-slug" name="slug" key={(editing?.id || "new") + "-slug"} defaultValue={editing?.slug || ""} maxLength={100} placeholder="ex. freinage" /></div>
        </div>
        <div className="field"><label htmlFor="category-description">Description</label><textarea id="category-description" name="description" key={(editing?.id || "new") + "-description"} defaultValue={editing?.description || ""} maxLength={500} /></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer la catégorie"}</button>
          {editing && <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setEditing(null)}>Annuler</button>}
        </div>
      </form>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, margin: "22px 0" }}>
        <h2>Catégories enregistrées</h2>
        <button className="btn btn-outline" type="button" onClick={() => void load()} disabled={loading || saving || deletingId !== null}>Actualiser</button>
      </div>
      {loading ? <p className="muted" aria-live="polite">Chargement des catégories…</p> : (
        <div className="table-wrap"><table><thead><tr><th>Nom</th><th>URL</th><th>Pièces liées</th><th>Actions</th></tr></thead>
          <tbody>{rows.map((category) => <tr key={category.id}>
            <td>{category.name}</td><td>{category.slug}</td><td>{category.product_count}</td>
            <td><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-outline" type="button" disabled={saving || deletingId !== null} onClick={() => { setEditing(category); setOk(""); setError(""); }}>Modifier</button>
              <button className="btn btn-outline" type="button" disabled={saving || deletingId !== null} onClick={() => void remove(category.id)}>{deletingId === category.id ? "Suppression…" : "Supprimer"}</button>
            </div></td>
          </tr>)}</tbody>
        </table>{!rows.length && <p className="muted" style={{ padding: 15 }}>Aucune catégorie enregistrée.</p>}</div>
      )}
    </div></main>
  );
}
