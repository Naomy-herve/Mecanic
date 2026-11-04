"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  order_count: number;
};

export default function AdminCustomers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/admin/customers", { cache: "no-store" });
        const data = await response.json();
        if (response.status === 403) {
          window.location.href = "/compte";
          return;
        }
        if (!response.ok) throw new Error(data.error || "Chargement impossible.");
        if (active) setRows(Array.isArray(data.customers) ? data.customers : []);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Chargement impossible.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");
    if (!term) return rows;
    return rows.filter((customer) =>
      [customer.full_name, customer.email, customer.phone || ""]
        .some((value) => value.toLocaleLowerCase("fr").includes(term))
    );
  }, [rows, search]);

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">RELATION CLIENT</div>
        <h1 className="page-title">Clients</h1>
        <p className="muted">
          Consultez les comptes clients et leur historique de commandes.
          Les mots de passe ne sont jamais affichés.
        </p>
        {error && <p className="notice error" role="alert">{error}</p>}
        {!loading && !error && (
          <div className="catalogue-search-row" style={{ margin: "22px 0" }}>
            <label className="catalogue-search-field">
              <span>Rechercher un client</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, e-mail ou téléphone…"
                type="search"
              />
            </label>
            <p className="muted" aria-live="polite">
              {filtered.length} client{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
        {loading ? (
          <p className="muted" aria-live="polite">Chargement des clients…</p>
        ) : !error ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Client</th><th>E-mail</th><th>Téléphone</th><th>Commandes</th><th>Inscription</th></tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.full_name}</td>
                    <td><a href={"mailto:" + encodeURIComponent(customer.email)}>{customer.email}</a></td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.order_count}</td>
                    <td>{new Date(customer.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="muted" style={{ padding: 18 }}>
                {rows.length ? "Aucun client ne correspond à cette recherche." : "Aucun compte client enregistré."}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
