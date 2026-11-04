"use client";

import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  total: string;
  currency: string;
  created_at: string;
};

const statuses = [
  ["pending", "En attente"],
  ["confirmed", "Confirmée"],
  ["processing", "En préparation"],
  ["shipped", "Expédiée"],
  ["delivered", "Livrée"],
  ["cancelled", "Annulée"],
] as const;

export default function AdminOrders() {
  const [rows, setRows] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await response.json();
      if (response.status === 403) {
        window.location.href = "/compte";
        return;
      }
      if (!response.ok) throw new Error(data.error || "Chargement des commandes impossible.");
      setRows(Array.isArray(data.orders) ? data.orders : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement des commandes impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function change(id: string, status: string) {
    const previous = rows.find((row) => row.id === id);
    if (!previous || previous.status === status) return;
    setUpdating(id);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Modification impossible.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Modification impossible.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">SUIVI COMMERCIAL</div>
        <h1 className="page-title">Commandes</h1>
        <p className="muted">Suivez les demandes et actualisez leur statut selon leur progression réelle.</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "18px 0" }}>
          <button className="btn btn-outline" onClick={() => void load()} disabled={loading || updating !== null}>
            Actualiser
          </button>
        </div>
        {loading ? (
          <p className="muted" aria-live="polite">Chargement des commandes…</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Client</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>
                      {order.customer_name}<br />
                      <a href={"mailto:" + encodeURIComponent(order.customer_email)}>{order.customer_email}</a><br />
                      {order.customer_phone || "—"}
                    </td>
                    <td>{Number(order.total).toLocaleString("fr-FR")} {order.currency}</td>
                    <td>
                      <select
                        aria-label={"Statut de la commande " + order.order_number}
                        value={order.status}
                        disabled={updating !== null}
                        onChange={(event) => void change(order.id, event.target.value)}
                      >
                        {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      {updating === order.id && <small className="muted"> Enregistrement…</small>}
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="muted" style={{ padding: 20 }}>Aucune commande pour le moment.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
