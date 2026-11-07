import {redirect} from "next/navigation";
import {requireAdmin} from "@/lib/auth";
import {query} from "@/lib/db";
import {releaseExpiredStockReservations} from "@/lib/inventory";
import Link from "next/link";

type Count={n:string};
type MoneyRow={currency:string;total:string};
type MarginRow={currency:string;revenue:string;cost:string;margin:string};
type Recent={order_number:string;customer_name:string;total:string;currency:string;status:string;created_at:string};
const money=(amount:string,currency:string)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:currency||"MGA"}).format(Number(amount));
const statusLabel:Record<string,string>={pending:"En attente",confirmed:"Confirmée",processing:"En préparation",shipped:"Expédiée",delivered:"Livrée",cancelled:"Annulée"};

export default async function Admin(){
 const u=await requireAdmin();if(!u)redirect("/compte");
 await releaseExpiredStockReservations();
 const [products,orders,inquiries,categories,today,physical,available,low,out,fulfilled,pendingAppointments,repairs,collections,expenses,margins,recent]=await Promise.all([
  query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true"),
  query<Count>("SELECT count(*)::text n FROM orders"),
  query<Count>("SELECT count(*)::text n FROM inquiries WHERE status <> 'resolved'"),
  query<Count>("SELECT count(*)::text n FROM categories"),
  query<Count>("SELECT count(*)::text n FROM orders WHERE created_at >= date_trunc('day',now())"),
  query<Count>("SELECT COALESCE(sum(stock_quantity),0)::text n FROM products WHERE is_active=true"),
  query<Count>("SELECT COALESCE(sum(GREATEST(0,stock_quantity-reserved_quantity)),0)::text n FROM products WHERE is_active=true"),
  query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true AND minimum_stock>0 AND GREATEST(0,stock_quantity-reserved_quantity)<=minimum_stock"),
  query<Count>("SELECT count(*)::text n FROM products WHERE is_active=true AND GREATEST(0,stock_quantity-reserved_quantity)=0"),
  query<Count>("SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER (WHERE status IN ('shipped','delivered'))/count(*)) END::text n FROM orders WHERE status <> 'cancelled'"),
  query<Count>("SELECT count(*)::text n FROM appointments WHERE status IN ('pending','confirmed') AND scheduled_start::date=CURRENT_DATE"),
  query<Count>("SELECT count(*)::text n FROM workshop_jobs WHERE status IN ('approved','in_repair','quality_check')"),
  query<MoneyRow>("SELECT currency,COALESCE(sum(amount),0)::text total FROM payments WHERE status='verified' GROUP BY currency ORDER BY currency"),
  query<MoneyRow>("SELECT currency,COALESCE(sum(amount),0)::text total FROM expenses GROUP BY currency ORDER BY currency"),
  query<MarginRow>(`SELECT o.currency,
    COALESCE(sum(oi.line_total),0)::text revenue,
    COALESCE(sum(COALESCE(costs.cost,0)),0)::text cost,
    (COALESCE(sum(oi.line_total),0)-COALESCE(sum(COALESCE(costs.cost,0)),0))::text margin
   FROM orders o
   JOIN order_items oi ON oi.order_id=o.id
   LEFT JOIN LATERAL (
     SELECT sum(-im.quantity*COALESCE(im.unit_cost,0)) AS cost
     FROM inventory_movements im
     WHERE im.reference_type='order' AND im.reference_id=o.id
       AND im.product_id=oi.product_id AND im.movement_type='sale'
   ) costs ON true
   WHERE o.status IN ('confirmed','processing','shipped','delivered')
   GROUP BY o.currency ORDER BY o.currency`),
  query<Recent>("SELECT order_number,customer_name,total,currency,status,created_at FROM orders ORDER BY created_at DESC LIMIT 8")
 ]);
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">ESPACE SÉCURISÉ · KIA PIÈCE</div>
  <h1 className="page-title">Tableau de bord du garage</h1>
  <p className="muted">Connecté en tant que {u.email}. Les indicateurs sont calculés sur les enregistrements de la base du garage unique.</p>
  <div className="admin-grid">
   <div className="stat-card"><small>Encaissements vérifiés</small><strong style={{fontSize:20}}>{collections.rows.length?collections.rows.map(x=>money(x.total,x.currency)).join(" · "):"—"}</strong></div>
   <div className="stat-card"><small>Commandes aujourd’hui</small><strong>{today.rows[0].n}</strong></div>
   <div className="stat-card"><small>Références actives</small><strong>{products.rows[0].n}</strong></div>
   <div className="stat-card"><small>Stock physique</small><strong>{physical.rows[0].n}</strong></div>
   <div className="stat-card"><small>Stock disponible</small><strong>{available.rows[0].n}</strong></div>
  </div>
  <h2 style={{marginTop:30}}>Alertes et activité</h2>
  <div className="admin-grid">
   <div className="stat-card"><small>Références sous seuil minimum</small><strong>{low.rows[0].n}</strong></div>
   <div className="stat-card"><small>Références sans disponibilité</small><strong>{out.rows[0].n}</strong></div>
   <div className="stat-card"><small>Rendez-vous aujourd’hui</small><strong>{pendingAppointments.rows[0].n}</strong></div>
   <div className="stat-card"><small>Réparations en cours</small><strong>{repairs.rows[0].n}</strong></div>
   <div className="stat-card"><small>Demandes clients à traiter</small><strong>{inquiries.rows[0].n}</strong></div>
   <div className="stat-card"><small>Commandes expédiées / livrées</small><strong>{fulfilled.rows[0].n}%</strong></div>
  </div>
  <h2 style={{marginTop:30}}>Suivi financier par devise</h2>
  <p className="muted">Les encaissements ne sont comptés qu’après vérification. Les marges ci-dessous sont estimées sur les ventes de pièces confirmées, avec les coûts unitaires disponibles dans l’historique des stocks.</p>
  <div className="table-wrap"><table><thead><tr><th>Devise</th><th>Ventes de pièces</th><th>Coût des pièces</th><th>Marge brute estimée</th><th>Dépenses enregistrées</th></tr></thead><tbody>
   {margins.rows.map(m=>{const expense=expenses.rows.find(e=>e.currency===m.currency);return <tr key={m.currency}><td>{m.currency}</td><td>{money(m.revenue,m.currency)}</td><td>{money(m.cost,m.currency)}</td><td>{money(m.margin,m.currency)}</td><td>{money(expense?.total||"0",m.currency)}</td></tr>;})}
   {!margins.rows.length&&expenses.rows.map(e=><tr key={e.currency}><td>{e.currency}</td><td>—</td><td>—</td><td>—</td><td>{money(e.total,e.currency)}</td></tr>)}
  </tbody></table></div>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"22px 0"}}>
   <Link className="btn btn-primary" href="/admin/produits">Gérer les pièces</Link>
   <Link className="btn btn-outline" href="/admin/categories">Catégories</Link>
   <Link className="btn btn-outline" href="/admin/clients">Clients</Link>
   <Link className="btn btn-outline" href="/admin/vehicules">Compatibilités</Link>
   <Link className="btn btn-outline" href="/admin/equivalences">Pièces équivalentes</Link>
   <Link className="btn btn-outline" href="/admin/commandes">Commandes</Link>
   <Link className="btn btn-outline" href="/admin/paiements">Paiements</Link>
   <Link className="btn btn-outline" href="/admin/factures">Factures</Link>
   <Link className="btn btn-outline" href="/admin/depenses">Dépenses</Link>
   <Link className="btn btn-outline" href="/admin/demandes">Demandes clients</Link>
   <Link className="btn btn-outline" href="/admin/atelier">Atelier</Link>
   <Link className="btn btn-outline" href="/admin/rendez-vous">Rendez-vous</Link>
   <Link className="btn btn-outline" href="/admin/stocks">Inventaire et réservations</Link>
   <Link className="btn btn-outline" href="/admin/fournisseurs">Fournisseurs et achats</Link>
  </div>
  <h2>Commandes récentes</h2>
  <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th></tr></thead><tbody>
   {recent.rows.map(x=><tr key={x.order_number}><td>{x.order_number}</td><td>{x.customer_name}</td><td>{money(x.total,x.currency)}</td><td>{statusLabel[x.status]||x.status}</td><td>{new Date(x.created_at).toLocaleDateString("fr-FR")}</td></tr>)}
  </tbody></table>{recent.rows.length===0&&<p className="muted" style={{padding:20}}>Aucune commande enregistrée pour le moment.</p>}</div>
  <p className="muted" style={{fontSize:12,marginTop:12}}>Les chiffres restent séparés par devise. Les marges sont indicatives et ne remplacent pas la validation comptable et fiscale du garage.</p>
 </div></main>;
}
