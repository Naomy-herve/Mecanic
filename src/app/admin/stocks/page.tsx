"use client";
import {useCallback,useEffect,useState} from "react";

type Product={id:string;sku:string;name:string;stock_quantity:number;reserved_quantity:number;currency:string};
type Movement={id:string;movement_type:string;quantity:number;reason:string;created_at:string;sku:string;name:string};
type Reservation={id:string;quantity:number;status:string;expires_at:string|null;created_at:string;sku:string;name:string;order_number:string|null;customer_name:string|null};
const labels:Record<string,string>={receipt:"Réception",sale:"Vente",return:"Retour",damage:"Endommagé",loss:"Perte",adjustment:"Ajustement",repair_use:"Utilisation atelier"};
const reservationLabels:Record<string,string>={reserved:"Réservé",consumed:"Consommé",released:"Libéré",expired:"Expiré"};

export default function StockPage(){
 const [products,setProducts]=useState<Product[]>([]);
 const [rows,setRows]=useState<Movement[]>([]);
 const [reservations,setReservations]=useState<Reservation[]>([]);
 const [countProductId,setCountProductId]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");

 const load=useCallback(async()=>{
  try{
   const [p,m,r]=await Promise.all([fetch("/api/admin/products",{cache:"no-store"}),fetch("/api/admin/inventory/movements",{cache:"no-store"}),fetch("/api/admin/inventory/reservations",{cache:"no-store"})]);
   if([p,m,r].some(x=>x.status===403)){window.location.href="/compte";return;}
   const [pd,md,rd]=await Promise.all([p.json(),m.json(),r.json()]);
   if(!p.ok||!m.ok||!r.ok)throw new Error(pd.error||md.error||rd.error||"Chargement impossible.");
   setProducts(pd.products||[]);setRows(md.movements||[]);setReservations(rd.reservations||[]);
   setCountProductId(current=>current||(pd.products||[])[0]?.id||"");
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/inventory/movements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:f.get("productId"),movementType:f.get("movementType"),quantity:f.get("quantity"),unitCost:f.get("unitCost")||null,reason:f.get("reason"),documentNumber:f.get("documentNumber")})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Mouvement impossible.");
   setSuccess("Mouvement enregistré. Nouveau stock : "+d.stockQuantity);form.reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"Mouvement impossible.");}
  finally{setBusy(false);}
 }

 async function countStock(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/inventory/counts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({productId:countProductId,countedQuantity:f.get("countedQuantity"),reason:f.get("countReason")})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Inventaire impossible.");
   setSuccess(d.difference===0?"Inventaire validé : aucun écart.":"Inventaire validé : écart de "+(d.difference>0?"+":"")+d.difference+" unité(s).");
   form.reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"Inventaire impossible.");}
  finally{setBusy(false);}
 }

 return <main className="page-shell"><div className="container">
  <div className="section-kicker">MAGASIN ET INVENTAIRE</div><h1 className="page-title">Mouvements de stock</h1>
  <p className="muted">Chaque entrée, sortie, perte, retour ou correction est enregistrée avec son motif et son auteur. Le stock ne peut pas devenir négatif.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}

  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Enregistrer un mouvement</h2>
   {!products.length&&!loading&&<p className="muted">Ajoutez d’abord les références réelles dans la gestion des produits.</p>}
   <form onSubmit={submit}>
    <div className="field"><label htmlFor="stock-product">Pièce</label><select id="stock-product" name="productId" required defaultValue=""><option value="" disabled>Choisir une pièce</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (disponible : {Math.max(0,p.stock_quantity-p.reserved_quantity)} / réservé : {p.reserved_quantity})</option>)}</select></div>
    <div className="field"><label htmlFor="stock-type">Type de mouvement</label><select id="stock-type" name="movementType" defaultValue="receipt">{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
    <div className="form-grid">
     <div className="field"><label htmlFor="stock-quantity">Quantité</label><input id="stock-quantity" name="quantity" type="number" min="1" required/></div>
     <div className="field"><label htmlFor="stock-unit-cost">Coût unitaire (facultatif)</label><input id="stock-unit-cost" name="unitCost" type="number" min="0" step="0.01"/></div>
    </div>
    <div className="field"><label htmlFor="stock-reason">Motif obligatoire</label><input id="stock-reason" name="reason" required minLength={3} maxLength={500}/></div>
    <div className="field"><label htmlFor="stock-document">Document de référence (facultatif)</label><input id="stock-document" name="documentNumber" maxLength={100}/></div>
    <button className="btn btn-primary" disabled={busy||!products.length}>{busy?"Enregistrement…":"Valider le mouvement"}</button>
   </form>
  </section>

  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Inventaire physique et correction des écarts</h2>
   <p className="muted">Saisissez la quantité réellement comptée. L’application calcule l’écart, ajuste le stock et conserve une écriture corrective dans l’historique.</p>
   <form onSubmit={countStock}>
    <div className="field"><label htmlFor="count-product">Pièce comptée</label><select id="count-product" value={countProductId} onChange={e=>setCountProductId(e.target.value)} required><option value="">Choisir une pièce</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (stock physique : {p.stock_quantity} / réservé : {p.reserved_quantity})</option>)}</select></div>
    <div className="field"><label htmlFor="count-quantity">Quantité réellement comptée</label><input id="count-quantity" name="countedQuantity" type="number" min="0" step="1" required/></div>
    <div className="field"><label htmlFor="count-reason">Motif / référence du comptage</label><input id="count-reason" name="countReason" required minLength={3} maxLength={500} placeholder="Inventaire physique du magasin"/></div>
    <button className="btn btn-primary" disabled={busy||!countProductId}>{busy?"Validation…":"Valider le comptage physique"}</button>
   </form>
  </section>

  <h2>Réservations de stock</h2>
  <p className="muted">Les commandes en attente immobilisent temporairement les quantités pendant 24 heures. La confirmation transforme la réservation en vente ; l’annulation libère le stock.</p>
  <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Client</th><th>Pièce</th><th>Quantité</th><th>État</th><th>Expiration</th></tr></thead><tbody>{reservations.map(r=><tr key={r.id}><td>{r.order_number||"—"}</td><td>{r.customer_name||"—"}</td><td>{r.sku} — {r.name}</td><td>{r.quantity}</td><td>{reservationLabels[r.status]||r.status}</td><td>{r.expires_at?new Date(r.expires_at).toLocaleString("fr-FR"):"—"}</td></tr>)}</tbody></table>{!loading&&!reservations.length&&<p className="muted" style={{padding:18}}>Aucune réservation de stock.</p>}</div>
  <div className="table-wrap"><table><thead><tr><th>Pièce</th><th>Mouvement</th><th>Quantité</th><th>Motif</th><th>Date</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td>{m.sku} — {m.name}</td><td>{labels[m.movement_type]||m.movement_type}</td><td>{m.quantity>0?"+":""}{m.quantity}</td><td>{m.reason}</td><td>{new Date(m.created_at).toLocaleString("fr-FR")}</td></tr>)}</tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucun mouvement enregistré.</p>}</div>
 </div></main>;
}
