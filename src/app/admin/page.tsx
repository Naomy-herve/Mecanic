import {redirect} from "next/navigation";
import {getSession} from "@/lib/auth";
import {query} from "@/lib/db";
import Link from "next/link";

type Count = { n: string };
type Revenue = { currency: string; total: string };
type Recent = { order_number: string; customer_name: string; total: string; currency: string; status: string; created_at: string };

const money = (amount: string, currency: string) => new Intl.NumberFormat("fr-FR", {style:"currency",currency:currency || "EUR"}).format(Number(amount));
const statusLabel: Record<string,string> = {pending:"En attente",confirmed:"Confirmée",processing:"En préparation",shipped:"Expédiée",delivered:"Livrée",cancelled:"Annulée"};

export default async function Admin(){
  const u=await getSession();
  if(!u)redirect("/compte");
  if(u.role!=="admin")redirect("/");
  const [p,o,i,c,today,stock,low,out,fulfilled,revenue,recent]=await Promise.all([
    query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true"),
    query<Count>("SELECT count(*)::text n FROM orders"),
    query<Count>("SELECT count(*)::text n FROM inquiries WHERE status <> 'resolved'"),
    query<Count>("SELECT count(*)::text n FROM categories"),
    query<Count>("SELECT count(*)::text n FROM orders WHERE created_at >= date_trunc('day',now())"),
    query<Count>("SELECT COALESCE(sum(stock_quantity),0)::text n FROM products WHERE is_active=true"),
    query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true AND stock_quantity BETWEEN 1 AND 5"),
    query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true AND stock_quantity=0"),
    query<Count>("SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER (WHERE status IN ('shipped','delivered'))/count(*)) END::text n FROM orders WHERE status <> 'cancelled'"),
    query<Revenue>("SELECT currency,COALESCE(sum(total),0)::text total FROM orders WHERE status <> 'cancelled' GROUP BY currency ORDER BY currency"),
    query<Recent>("SELECT order_number,customer_name,total,currency,status,created_at FROM orders ORDER BY created_at DESC LIMIT 8")
  ]);
  return <main className="page-shell"><div className="container">
    <div className="section-kicker">ESPACE SÉCURISÉ · KIA PIÈCE</div>
    <h1 className="page-title">Tableau de bord</h1>
    <p className="muted">Connecté en tant que {u.email}. Les indicateurs sont calculés à partir des données enregistrées.</p>
    <div className="admin-grid">
      <div className="stat-card"><small>Chiffre d'affaires · hors annulations</small><strong style={{fontSize:22}}>{revenue.rows.length?revenue.rows.map(x=>money(x.total,x.currency)).join(" · "):"—"}</strong></div>
      <div className="stat-card"><small>Commandes aujourd'hui</small><strong>{today.rows[0].n}</strong></div>
      <div className="stat-card"><small>Références actives</small><strong>{p.rows[0].n}</strong></div>
      <div className="stat-card"><small>Articles en stock</small><strong>{stock.rows[0].n}</strong></div>
      <div className="stat-card"><small>Commandes expédiées / livrées</small><strong>{fulfilled.rows[0].n}%</strong></div>
    </div>
    <h2 style={{marginTop:30}}>État de l'inventaire</h2>
    <div className="admin-grid">
      <div className="stat-card"><small>Stock faible · 1 à 5 unités</small><strong>{low.rows[0].n}</strong></div>
      <div className="stat-card"><small>Ruptures de stock</small><strong>{out.rows[0].n}</strong></div>
      <div className="stat-card"><small>Commandes totales</small><strong>{o.rows[0].n}</strong></div>
      <div className="stat-card"><small>Demandes à traiter</small><strong>{i.rows[0].n}</strong></div>
      <div className="stat-card"><small>Catégories</small><strong>{c.rows[0].n}</strong></div>
    </div>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"22px 0"}}>
      <Link className="btn btn-primary" href="/admin/produits">Gérer les pièces</Link>
      <Link className="btn btn-outline" href="/admin/categories">Catégories</Link>
      <Link className="btn btn-outline" href="/admin/clients">Clients</Link>
      <Link className="btn btn-outline" href="/admin/vehicules">Compatibilités</Link>
      <Link className="btn btn-outline" href="/admin/equivalences">Pièces équivalentes</Link>
      <Link className="btn btn-outline" href="/admin/commandes">Commandes</Link>
      <Link className="btn btn-outline" href="/admin/demandes">Demandes clients</Link>
    </div>
    <h2>Commandes récentes</h2>
    <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead><tbody>
      {recent.rows.map(x=><tr key={x.order_number}><td>{x.order_number}</td><td>{x.customer_name}</td><td>{money(x.total,x.currency)}</td><td>{statusLabel[x.status]||x.status}</td><td>{new Date(x.created_at).toLocaleDateString("fr-FR")}</td></tr>)}
    </tbody></table>{recent.rows.length===0&&<p className="muted" style={{padding:20}}>Aucune commande enregistrée pour le moment.</p>}</div>
    <p className="muted" style={{fontSize:12,marginTop:12}}>Le seuil d'alerte de stock faible est fixé à 5 unités. Les montants sont séparés par devise pour éviter les totaux trompeurs.</p>
  </div></main>;
}
