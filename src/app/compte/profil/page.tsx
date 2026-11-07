import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { AccountOrders } from "./orders";
import { AccountNotifications } from "./notifications";
import { requireStaff } from "@/lib/auth";

export default async function Profile() {
  const user = await getSession();
  if (!user) redirect("/compte");
  const staff = await requireStaff("seller","mechanic","storekeeper","accountant");

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-kicker">MON ESPACE</div>
        <h1 className="page-title">Bonjour, {user.fullName}</h1>
        <p className="muted">{user.email}</p>
        <div className="admin-grid">
          <div className="stat-card"><small>Profil</small><strong>{user.role === "admin" ? "Administrateur" : "Client"}</strong></div>
          <div className="stat-card"><small>Accès</small><strong>{user.role === "admin" ? "Administrateur" : "Client"}</strong></div>
        </div>
        {staff&&!staff.isAdmin&&staff.staffRoles.length>0&&<p style={{marginTop:16}}><Link className="btn btn-outline" href="/equipe">Accéder à mon espace équipe</Link></p>}
        <h2>Mes commandes</h2>
        <AccountOrders />
        <AccountNotifications />
        <form action="/api/auth/logout" method="post" style={{ marginTop: 25 }}>
          <button className="btn btn-outline">Se déconnecter</button>
        </form>
        <p className="muted" style={{ marginTop: 20 }}><Link href="/catalogue">Continuer mes achats →</Link></p>
      </div>
    </main>
  );
}
