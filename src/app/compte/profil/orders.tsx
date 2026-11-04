"use client";

import { useEffect, useState } from "react";

type OrderItem = {
  name: string;
  sku: string;
  quantity: number;
  lineTotal: number | string;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  total: number | string;
  currency: string;
  created_at: string;
  items: OrderItem[];
};

const labels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export function AccountOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/account/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Chargement impossible.");
        return data.orders as Order[];
      })
      .then((data) => { if (active) setOrders(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Impossible de charger vos commandes.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <p className="muted" aria-live="polite">Chargement de vos commandes…</p>;
  if (error) return <p className="notice error" role="alert">{error}</p>;
  if (!orders.length) return <div className="stat-card"><strong>Aucune commande</strong><p className="muted">Vos prochaines commandes apparaîtront ici.</p></div>;

  return <div className="account-orders">
    {orders.map((order) => (
      <article className="stat-card" key={order.id} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div><small>COMMANDE</small><strong>{order.order_number}</strong><p className="muted">{new Date(order.created_at).toLocaleDateString("fr-FR")}</p></div>
          <div><small>STATUT</small><strong>{labels[order.status] || order.status}</strong><p>{Number(order.total).toLocaleString("fr-FR")} {order.currency}</p></div>
        </div>
        {order.items?.length > 0 && <div className="table-wrap" style={{ marginTop: 14 }}>
          <table><thead><tr><th>Pièce</th><th>Référence</th><th>Qté</th><th>Montant</th></tr></thead>
            <tbody>{order.items.map((item, index) => <tr key={item.sku + "-" + index}>
              <td>{item.name}</td><td>{item.sku}</td><td>{item.quantity}</td>
              <td>{Number(item.lineTotal).toLocaleString("fr-FR")} {order.currency}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </article>
    ))}
  </div>;
}
