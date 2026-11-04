"use client";

import { useCallback, useEffect, useState } from "react";

type Product = { id: string; sku: string; name: string };
type Equivalent = { id: string; sku: string; name: string; slug: string; notes: string | null; verified: boolean };

export default function EquivalentsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [items, setItems] = useState<Equivalent[]>([]);
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Chargement des pièces impossible.");
      const list = Array.isArray(data.products) ? data.products : [];
      setProducts(list);
      setProductId((current) => current && list.some((product: Product) => product.id === current) ? current : list[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des pièces impossible.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadItems = useCallback(async (id: string) => {
    if (!id) { setItems([]); return; }
    setLoadingItems(true);
    try {
      const response = await fetch("/api/admin/equivalents?productId=" + encodeURIComponent(id), { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Chargement des équivalences impossible.");
      setItems(Array.isArray(data.equivalents) ? data.equivalents : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des équivalences impossible.");
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadItems(productId); }, [loadItems, productId]);

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !productId) return;
    setSaving(true); setError(""); setOk("");
    try {
      const response = await fetch("/api/admin/equivalents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, equivalentSku: sku.trim(), notes: notes.trim(), verified }),
      });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setSku(""); setNotes(""); setVerified(false); setOk("Équivalence enregistrée.");
      await loadItems(productId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (deletingId || !window.confirm("Supprimer cette association ?")) return;
    setDeletingId(id); setError(""); setOk("");
    try {
      const response = await fetch("/api/admin/equivalents", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, equivalentId: id }),
      });
      const data = await response.json();
      if (response.status === 403) { window.location.href = "/compte"; return; }
      if (!response.ok) throw new Error(data.error || "Suppression impossible.");
      setOk("Association supprimée.");
      await loadItems(productId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  return <div style={{ maxWidth: 850, marginTop: 25 }}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {ok && <p className="notice" role="status">{ok}</p>}
    <div className="form-card">
      <div className="field"><label htmlFor="equivalent-main-product">Pièce principale</label>
        <select id="equivalent-main-product" value={productId} disabled={loadingProducts || saving || deletingId !== null} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Choisir une pièce</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}
        </select>
      </div>
      {!loadingProducts && !products.length && <p className="muted">Aucune pièce enregistrée. Ajoutez d’abord les références réelles dans la gestion des produits.</p>}
      <form onSubmit={add}>
        <div className="field"><label htmlFor="equivalent-sku">SKU de la pièce équivalente</label><input id="equivalent-sku" value={sku} onChange={(event) => setSku(event.target.value)} required minLength={2} maxLength={64} placeholder="Saisir la référence exacte" /></div>
        <div className="field"><label htmlFor="equivalent-notes">Note de compatibilité (facultatif)</label><input id="equivalent-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Précision technique ou condition" /></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /> Correspondance vérifiée</label>
        <button className="btn btn-primary" disabled={!productId || !sku.trim() || saving || loadingProducts}>{saving ? "Enregistrement…" : "Ajouter l'équivalence"}</button>
      </form>
    </div>
    <h2 style={{ marginTop: 28 }}>Associations enregistrées</h2>
    {loadingItems ? <p className="muted" aria-live="polite">Chargement des équivalences…</p> : (
      <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Pièce équivalente</th><th>Vérification</th><th>Note</th><th>Action</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}><td>{item.sku}</td><td>{item.name}</td><td>{item.verified ? "Vérifiée" : "À vérifier"}</td><td>{item.notes || "—"}</td><td><button className="btn btn-outline" type="button" disabled={deletingId !== null || saving} onClick={() => void remove(item.id)}>{deletingId === item.id ? "Suppression…" : "Retirer"}</button></td></tr>)}</tbody>
      </table>{!items.length && <p className="muted" style={{ padding: 18 }}>Aucune équivalence enregistrée pour cette pièce.</p>}</div>
    )}
  </div>;
}
