import Link from "next/link";
import ProductImage from "@/components/product-image";
import { query } from "@/lib/db";

type Product = {
  id: string; sku: string; name: string; slug: string; description: string;
  price: string; currency: string; stock_quantity: number; condition: string;
  image_url: string | null; category_name: string | null;
};
type Params = {
  q?: string; category?: string; model?: string; year?: string; engine?: string;
  availability?: string; min?: string; max?: string; sort?: string;
  view?: string; page?: string;
};
const PAGE_SIZE = 12;
const ORDER_BY: Record<string, string> = {
  recent: "p.created_at DESC",
  price_asc: "p.price ASC, p.name ASC",
  price_desc: "p.price DESC, p.name ASC",
  name: "p.name ASC",
  stock: "p.stock_quantity DESC, p.name ASC",
};

function money(value: string, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "EUR" }).format(Number(value));
}

export default async function Catalogue({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const q = (p.q || "").trim().slice(0, 100);
  const cat = (p.category || "").trim().slice(0, 80);
  const model = (p.model || "").trim().slice(0, 80);
  const year = /^\\d{4}$/.test(p.year || "") ? Number(p.year) : null;
  const engine = (p.engine || "").trim().slice(0, 80);
  const min = p.min && Number.isFinite(Number(p.min)) && Number(p.min) >= 0 ? Number(p.min) : null;
  const max = p.max && Number.isFinite(Number(p.max)) && Number(p.max) >= 0 ? Number(p.max) : null;
  const availability = p.availability === "available" ? "available" : "";
  const sort = ORDER_BY[p.sort || ""] ? p.sort! : "recent";
  const view = p.view === "list" ? "list" : "grid";
  const requestedPage = Math.max(1, Math.min(1000, Number.parseInt(p.page || "1", 10) || 1));
  const values = [q, cat, model, year, engine, min, max, availability];
  let products: Product[] = [];
  let cats: { name: string; slug: string }[] = [];
  let total = 0;
  let error = false;

  const where = `p.is_active = true
    AND ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%' OR p.description ILIKE '%' || $1 || '%')
    AND ($2 = '' OR c.slug = $2)
    AND ($3 = '' OR EXISTS (
      SELECT 1 FROM product_compatibility pc
      JOIN vehicles v ON v.id = pc.vehicle_id
      WHERE pc.product_id = p.id AND v.model = $3
      AND ($4::int IS NULL OR ((v.year_from IS NULL OR v.year_from <= $4) AND (v.year_to IS NULL OR v.year_to >= $4)))
      AND ($5 = '' OR coalesce(v.engine, '') ILIKE '%' || $5 || '%')
    ))
    AND ($6::numeric IS NULL OR p.price >= $6)
    AND ($7::numeric IS NULL OR p.price <= $7)
    AND ($8 = '' OR p.stock_quantity > 0)`;

  try {
    cats = (await query<{ name: string; slug: string }>("SELECT name, slug FROM categories ORDER BY name")).rows;
    const count = await query<{ total: string }>(
      `SELECT count(*)::text AS total FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${where}`,
      values
    );
    total = Number(count.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    products = (await query<Product>(
      `SELECT p.id, p.sku, p.name, p.slug, p.description, p.price, p.currency,
        p.stock_quantity, p.condition, p.image_url, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${where} ORDER BY ${ORDER_BY[sort]} LIMIT $9 OFFSET $10`,
      [...values, PAGE_SIZE, (page - 1) * PAGE_SIZE]
    )).rows;
  } catch {
    error = true;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const queryString = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q, category: cat, model, year: year?.toString() || "", engine, min: min?.toString() || "", max: max?.toString() || "", availability, sort, view })) {
      if (value) params.set(key, value);
    }
    params.set("page", String(nextPage));
    return "/catalogue?" + params.toString();
  };

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">KIA PIÈCE / BOUTIQUE</div>
        <h1 className="page-title">Catalogue de pièces</h1>
        <p className="muted">Recherchez une référence, comparez les prix et filtrez les pièces compatibles avec votre Kia.</p>

        <form action="/catalogue" method="get" className="catalogue-filter-panel">
          <div className="catalogue-search-row">
            <label className="catalogue-search-field">
              <span>Nom ou référence</span>
              <input name="q" defaultValue={q} placeholder="Ex. filtre à huile, 26300-35505…" />
            </label>
            <label><span>Catégorie</span><select name="category" defaultValue={cat}><option value="">Toutes</option>{cats.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label><span>Modèle Kia</span><input name="model" defaultValue={model} placeholder="Ex. Sportage" /></label>
            <label><span>Année</span><input name="year" type="number" min="1980" max="2035" defaultValue={year || ""} placeholder="2018" /></label>
            <label><span>Motorisation</span><input name="engine" defaultValue={engine} placeholder="Ex. 1.6 T-GDi" /></label>
          </div>
          <div className="catalogue-filter-row">
            <label><span>Prix minimum</span><input name="min" type="number" min="0" step="0.01" defaultValue={min ?? ""} placeholder="0" /></label>
            <label><span>Prix maximum</span><input name="max" type="number" min="0" step="0.01" defaultValue={max ?? ""} placeholder="Sans limite" /></label>
            <label><span>Trier par</span><select name="sort" defaultValue={sort}><option value="recent">Plus récents</option><option value="price_asc">Prix croissant</option><option value="price_desc">Prix décroissant</option><option value="name">Nom A à Z</option><option value="stock">Disponibilité</option></select></label>
            <label className="catalogue-check"><input type="checkbox" name="availability" value="available" defaultChecked={!!availability} /> En stock uniquement</label>
            <input type="hidden" name="view" value={view} />
            <button className="btn btn-primary">Appliquer les filtres</button>
            <Link className="btn btn-outline" href="/catalogue">Réinitialiser</Link>
          </div>
        </form>

        <div className="catalogue-results-heading">
          <div><strong>{total} résultat{total === 1 ? "" : "s"}</strong>{model && <span className="muted"> · Kia {model}{year ? " " + year : ""}</span>}</div>
          <div className="catalogue-view-switch"><Link aria-current={view === "grid" ? "page" : undefined} href={queryString(1).replace("view=list", "view=grid")}>Grille</Link><Link aria-current={view === "list" ? "page" : undefined} href={queryString(1).replace("view=grid", "view=list")}>Liste</Link></div>
        </div>

        {error ? (
          <div className="empty-state"><h3>Catalogue momentanément indisponible</h3><p>La connexion à la base de données n'a pas permis de charger les références.</p><Link className="btn btn-outline" href="/#contact">Contacter KIA PIÈCE</Link></div>
        ) : products.length ? (
          <>
            <div className={view === "list" ? "product-grid product-list-view" : "product-grid"}>
              {products.map(p => (
                <article className="product-card" key={p.id}>
                  <ProductImage className="product-image" src={p.image_url} alt={p.name}/>
                  <div className="product-info">
                    <span className="badge">{p.category_name || "Pièce Kia"} · {p.condition === "new" ? "Neuf" : p.condition === "used" ? "Occasion" : "Reconditionné"}</span>
                    <h3>{p.name}</h3>
                    <p className="muted">Réf. {p.sku}</p>
                    <p className="muted">{p.stock_quantity > 0 ? `${p.stock_quantity} disponible(s)` : "Disponibilité à confirmer"}</p>
                    <div className="price">{money(p.price, p.currency)}</div>
                    <Link className="btn btn-primary" style={{ marginTop: 12, width: "100%" }} href={"/produit/" + p.slug}>Voir la pièce</Link>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && <nav className="catalogue-pagination" aria-label="Pagination">
              {page > 1 && <Link className="btn btn-outline" href={queryString(page - 1)}>← Précédent</Link>}
              <span>Page {page} sur {totalPages}</span>
              {page < totalPages && <Link className="btn btn-outline" href={queryString(page + 1)}>Suivant →</Link>}
            </nav>}
          </>
        ) : (
          <div className="empty-state"><div>⌕</div><h3>{q || cat || model ? "Aucun résultat pour ces critères" : "Les références arrivent prochainement"}</h3><p>{q || cat || model ? "Modifiez vos filtres ou contactez notre équipe pour vérifier une référence." : "Le catalogue est prêt à recevoir ses premières pièces. Contactez-nous pour rechercher une référence précise."}</p><Link className="btn btn-primary" href="/#contact">Demander une pièce</Link></div>
        )}
      </div>
    </main>
  );
}
