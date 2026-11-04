import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { AccountOrders } from "./orders";

export default async function Profile() {
  const user = await getSession();
  if (!user) redirect("/compte");

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">MON ESPACE</div>
        <h1 className="page-title">Bonjour, {user.fullName}</h1>
        <p className="muted">{user.email}</p>
        <div className="admin-grid">
          <div className="stat-card"><small>Profil</small><strong>Client</strong></div>
          <div className="stat-card"><small>Accès</small><strong>{user.role === "admin" ? "Administrateur" : "Client"}</strong></div>
        </div>
        <h2>Mes commandes</h2>
        <AccountOrders />
        <form action="/api/auth/logout" method="post" style={{ marginTop: 25 }}>
          <button className="btn btn-outline">Se déconnecter</button>
        </form>
        <p className="muted" style={{ marginTop: 20 }}><Link href="/catalogue">Continuer mes achats →</Link></p>
      </div>
    </main>
  );
}
