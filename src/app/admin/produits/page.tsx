"use client";

import { useCallback, useEffect, useState } from "react";
import ProductCsvImport from "./csv-import";
import ProductImageField from "./image-field";

type Product = {
  id: string; sku: string; name: string; slug: string; description: string;
  category_id: string | null; price: string; currency: string; stock_quantity: number;
  condition: string; image_url: string | null; manufacturer: string | null;
  manufacturer_part_number: string | null; oem_reference: string | null; is_active: boolean;
};
type Category = { id: string; name: string };

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        fetch("/api/admin/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);
      if (productResponse.status === 403) {
        window.location.href = "/compte";
        return;
      }
      const productData = await productResponse.json();
      const categoryData = await categoryResponse.json();
      if (!productResponse.ok) throw new Error(productData.error || "Chargement des pièces impossible.");
      if (!categoryResponse.ok) throw new Error(categoryData.error || "Chargement des catégories impossible.");
      setProducts(Array.isArray(productData.products) ? productData.products : []);
      setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des données impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("kia-products-imported", refresh);
    return () => window.removeEventListener("kia-products-imported", refresh);
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = String(fields.get("name") || "").trim();
    const slug = String(fields.get("slug") || name.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    const product = {
      sku: fields.get("sku"), name, slug, description: fields.get("description"),
      categoryId: fields.get("categoryId") || null, price: Number(fields.get("price")),
      currency: fields.get("currency"), stockQuantity: Number(fields.get("stockQuantity")),
      condition: fields.get("condition"), imageUrl: fields.get("imageUrl") || null,
      manufacturer: fields.get("manufacturer") || null,
      manufacturerPartNumber: fields.get("manufacturerPartNumber") || null,
      oemReference: fields.get("oemReference") || null,
    };
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/products" + (editing ? "?id=" + editing.id : ""), {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, product } : product),
      });
      const data = await response.json();
      if (response.status === 403) {
        window.location.href = "/compte";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Enregistrement impossible.");
      setSuccess(editing ? "Pièce modifiée avec succès." : "Pièce ajoutée avec succès.");
      setEditing(null);
      form.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (deletingId) return;
    if (!window.confirm("Masquer cette référence du catalogue ? L'historique des commandes sera conservé.")) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/products?id=" + encodeURIComponent(id), { method: "DELETE" });
      const data = await response.json();
      if (response.status === 403) {
        window.location.href = "/compte";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Masquage impossible.");
      setSuccess("Référence masquée du catalogue.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Masquage impossible.");
    } finally {
      setDeletingId("");
    }
  }

  function beginEdit(product: Product) {
    setEditing(product);
    setError("");
    setSuccess("");
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">GESTION DU CATALOGUE</div>
        <h1 className="page-title">Produits & inventaire</h1>
        <p className="muted">Espace réservé à l'administrateur : gérez les références, prix, photos, catégories et quantités en stock.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        {success && <p className="notice" role="status">{success}</p>}

        <ProductCsvImport />

        <form className="form-card" onSubmit={save} style={{ maxWidth: 820, margin: "25px 0" }}>
          <h2>{editing ? "Modifier la pièce" : "Ajouter une pièce"}</h2>
          <div className="form-grid">
            <div className="field"><label htmlFor="product-sku">Référence SKU</label><input id="product-sku" name="sku" key={(editing?.id || "new") + "sku"} defaultValue={editing?.sku || ""} required minLength={2} maxLength={64} /></div>
            <div className="field"><label htmlFor="product-name">Nom de la pièce</label><input id="product-name" name="name" key={(editing?.id || "new") + "name"} defaultValue={editing?.name || ""} required minLength={2} maxLength={180} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="product-category">Catégorie</label><select id="product-category" name="categoryId" key={(editing?.id || "new") + "cat"} defaultValue={editing?.category_id || ""}><option value="">Sans catégorie</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="field"><label htmlFor="product-slug">Slug URL (facultatif)</label><input id="product-slug" name="slug" key={(editing?.id || "new") + "slug"} defaultValue={editing?.slug || ""} maxLength={180} /></div>
          </div>
          <div className="field"><label htmlFor="product-description">Description</label><textarea id="product-description" name="description" key={(editing?.id || "new") + "desc"} defaultValue={editing?.description || ""} maxLength={5000} /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="product-price">Prix</label><input id="product-price" name="price" type="number" min="0" step="0.01" key={(editing?.id || "new") + "price"} defaultValue={editing?.price || ""} required /></div>
            <div className="field"><label htmlFor="product-currency">Devise</label><select id="product-currency" name="currency" key={(editing?.id || "new") + "currency"} defaultValue={editing?.currency || "MGA"} required><option value="MGA">Ariary (MGA)</option><option value="EUR">Euro (EUR)</option><option value="USD">Dollar US (USD)</option></select></div>
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="product-stock">Quantité en stock</label><input id="product-stock" name="stockQuantity" type="number" min="0" step="1" key={(editing?.id || "new") + "stock"} defaultValue={editing?.stock_quantity ?? 0} required /></div>
            <div className="field"><label htmlFor="product-condition">État</label><select id="product-condition" name="condition" key={(editing?.id || "new") + "condition"} defaultValue={editing?.condition || "new"}><option value="new">Neuf</option><option value="used">Occasion</option><option value="refurbished">Reconditionné</option></select></div>
          </div>
          <ProductImageField key={editing?.id || "new"} defaultValue={editing?.image_url || ""} />
          <div className="form-grid">
            <div className="field"><label htmlFor="product-manufacturer">Fabricant (facultatif)</label><input id="product-manufacturer" name="manufacturer" key={(editing?.id || "new") + "manufacturer"} defaultValue={editing?.manufacturer || ""} maxLength={120} placeholder="Ex. Kia" /></div>
            <div className="field"><label htmlFor="product-manufacturer-part">Référence fabricant</label><input id="product-manufacturer-part" name="manufacturerPartNumber" key={(editing?.id || "new") + "manufacturerPart"} defaultValue={editing?.manufacturer_part_number || ""} maxLength={120} /></div>
          </div>
          <div className="field"><label htmlFor="product-oem">Référence OEM (à vérifier)</label><input id="product-oem" name="oemReference" key={(editing?.id || "new") + "oem"} defaultValue={editing?.oem_reference || ""} maxLength={120} placeholder="Référence constructeur exacte" /></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={saving}>{saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la pièce"}</button>
            {editing && <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setEditing(null)}>Annuler</button>}
          </div>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2>Références enregistrées</h2>
          <button className="btn btn-outline" type="button" onClick={() => void load()} disabled={loading}>Actualiser</button>
        </div>
        {loading ? <p className="muted" aria-live="polite">Chargement des références…</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>SKU</th><th>Produit</th><th>Prix</th><th>Stock</th><th>État</th><th>Actions</th></tr></thead>
              <tbody>{products.map(product => (
                <tr key={product.id}>
                  <td>{product.sku}</td><td>{product.name}</td><td>{product.price} {product.currency}</td><td>{product.stock_quantity}</td>
                  <td>{product.is_active ? "Actif" : "Masqué"}</td>
                  <td><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {product.is_active && <button className="btn btn-outline" type="button" disabled={saving || !!deletingId} onClick={() => beginEdit(product)}>Modifier</button>}
                    {product.is_active && <button className="btn btn-outline" type="button" disabled={saving || !!deletingId} onClick={() => void deactivate(product.id)}>{deletingId === product.id ? "Masquage…" : "Masquer"}</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
            {!products.length && <p className="muted" style={{ padding: 20 }}>Aucune pièce enregistrée. Ajoutez vos premières références ci-dessus.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
