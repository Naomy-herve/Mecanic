"use client";

import { useCallback, useEffect, useState } from "react";

type Supplier = { id: string; name: string };
type Product = { id: string; sku: string; name: string; price: string; currency: string };
type PurchaseLine = { productId: string; reference: string; description: string; quantity: number; unitCost: number };
type PurchaseOrderItem = { id: string; product_id: string | null; reference: string | null; description: string; quantity_ordered: number; quantity_received: number; unit_cost: string };
type PurchaseOrder = { id: string; order_number: string; status: string; ordered_at: string | null; expected_at: string | null; received_at: string | null; currency: string; subtotal: string; supplier_name: string; items: PurchaseOrderItem[] };

const statusLabels: Record<string,string> = { draft:"Brouillon", sent:"Envoyée", partially_received:"Partiellement reçue", received:"Réceptionnée", cancelled:"Annulée" };

export default function SupplierOrders() {
  const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [products,setProducts]=useState<Product[]>([]);
  const [orders,setOrders]=useState<PurchaseOrder[]>([]);
  const [supplierId,setSupplierId]=useState("");
  const [currency,setCurrency]=useState("MGA");
  const [expectedDate,setExpectedDate]=useState("");
  const [notes,setNotes]=useState("");
  const [lines,setLines]=useState<PurchaseLine[]>([{productId:"",reference:"",description:"",quantity:1,unitCost:0}]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");

  const load=useCallback(async()=>{
    try{
      const [s,p,o]=await Promise.all([
        fetch("/api/admin/suppliers",{cache:"no-store"}),
        fetch("/api/admin/products",{cache:"no-store"}),
        fetch("/api/admin/supplier-orders",{cache:"no-store"})
      ]);
      if([s,p,o].some(r=>r.status===403)){window.location.href="/compte";return;}
      const [sd,pd,od]=await Promise.all([s.json(),p.json(),o.json()]);
      if(!s.ok||!p.ok||!o.ok)throw new Error(sd.error||pd.error||od.error||"Chargement des approvisionnements impossible.");
      setSuppliers(sd.suppliers||[]);setProducts(pd.products||[]);setOrders(od.orders||[]);
      if(!supplierId&&sd.suppliers?.length)setSupplierId(sd.suppliers[0].id);
    }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
    finally{setLoading(false);}
  },[supplierId]);

  useEffect(()=>{void load();},[load]);

  function updateLine(index:number,patch:Partial<PurchaseLine>){
    setLines(current=>current.map((line,i)=>i===index?{...line,...patch}:line));
  }

  async function createOrder(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    setBusy(true);setError("");setSuccess("");
    try{
      const payload={
        supplierId,currency,expectedAt:expectedDate?new Date(expectedDate+"T12:00:00+03:00").toISOString():null,notes,
        items:lines.map(line=>({...line,productId:line.productId||null}))
      };
      const response=await fetch("/api/admin/supplier-orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Création impossible.");
      setSuccess("Bon de commande "+data.order.order_number+" créé.");
      setLines([{productId:"",reference:"",description:"",quantity:1,unitCost:0}]);setNotes("");setExpectedDate("");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Création impossible.");}
    finally{setBusy(false);}
  }

  async function changeOrder(id:string,action:"mark_sent"|"cancel"){
    setError("");setSuccess("");
    try{
      const response=await fetch("/api/admin/supplier-orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Modification impossible.");
      setSuccess(action==="mark_sent"?"Commande marquée comme envoyée.":"Commande annulée.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}
  }

  async function receiveOrder(event:React.FormEvent<HTMLFormElement>,id:string){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const items=Array.from(form.entries()).filter(([key])=>key.startsWith("receive-")).map(([key,value])=>({itemId:key.slice(8),quantity:Number(value)})).filter(item=>Number.isInteger(item.quantity)&&item.quantity>0);
    if(!items.length){setError("Saisissez au moins une quantité réellement reçue.");return;}
    setError("");setSuccess("");
    try{
      const response=await fetch("/api/admin/supplier-orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action:"receive",items})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Réception impossible.");
      setSuccess("Réception enregistrée. Le stock des pièces liées a été actualisé.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Réception impossible.");}
  }

  return <section className="page-shell"><div className="container">
    <div className="section-kicker">ACHATS ET RÉAPPROVISIONNEMENT</div>
    <h2 className="page-title">Commandes fournisseurs et réceptions</h2>
    <p className="muted">Créez des bons de commande, marquez leur envoi, puis saisissez les quantités réellement livrées. Les pièces réceptionnées mettent à jour le stock avec un mouvement traçable.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
    <section className="auth-card" style={{maxWidth:900,margin:"20px 0"}}>
      <h3>Nouveau bon de commande</h3>
      <form onSubmit={createOrder}>
        <div className="form-grid">
          <div className="field"><label htmlFor="po-supplier">Fournisseur</label><select id="po-supplier" value={supplierId} onChange={e=>setSupplierId(e.target.value)} required><option value="">Choisir</option>{suppliers.filter(s=>s.id).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor="po-currency">Devise</label><select id="po-currency" value={currency} onChange={e=>setCurrency(e.target.value)}><option value="MGA">MGA</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div>
          <div className="field"><label htmlFor="po-expected">Livraison prévue</label><input id="po-expected" type="date" value={expectedDate} onChange={e=>setExpectedDate(e.target.value)}/></div>
        </div>
        {lines.map((line,index)=><div className="auth-card" key={index} style={{margin:"12px 0",padding:14}}>
          <div className="form-grid">
            <div className="field"><label htmlFor={"po-product-"+index}>Pièce du catalogue (facultatif)</label><select id={"po-product-"+index} value={line.productId} onChange={e=>{const p=products.find(x=>x.id===e.target.value);updateLine(index,{productId:e.target.value,description:p?.name||line.description,reference:p?.sku||line.reference});}}><option value="">Article libre</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></div>
            <div className="field"><label htmlFor={"po-reference-"+index}>Référence fournisseur</label><input id={"po-reference-"+index} value={line.reference} onChange={e=>updateLine(index,{reference:e.target.value})} maxLength={120}/></div>
          </div>
          <div className="field"><label htmlFor={"po-description-"+index}>Désignation</label><input id={"po-description-"+index} value={line.description} onChange={e=>updateLine(index,{description:e.target.value})} required minLength={2} maxLength={500}/></div>
          <div className="form-grid">
            <div className="field"><label htmlFor={"po-quantity-"+index}>Quantité commandée</label><input id={"po-quantity-"+index} type="number" min="1" step="1" value={line.quantity} onChange={e=>updateLine(index,{quantity:Number(e.target.value)})} required/></div>
            <div className="field"><label htmlFor={"po-cost-"+index}>Coût unitaire ({currency})</label><input id={"po-cost-"+index} type="number" min="0" step="0.01" value={line.unitCost} onChange={e=>updateLine(index,{unitCost:Number(e.target.value)})} required/></div>
          </div>
          {lines.length>1&&<button type="button" className="btn btn-secondary" onClick={()=>setLines(current=>current.filter((_,i)=>i!==index))}>Retirer cette ligne</button>}
        </div>)}
        <div className="form-grid">
          <button type="button" className="btn btn-secondary" onClick={()=>setLines(current=>[...current,{productId:"",reference:"",description:"",quantity:1,unitCost:0}])}>Ajouter une ligne</button>
          <button type="submit" className="btn btn-primary" disabled={busy||!supplierId||!lines.length}>{busy?"Création…":"Créer le bon de commande"}</button>
        </div>
        <div className="field"><label htmlFor="po-notes">Notes</label><textarea id="po-notes" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} maxLength={3000}/></div>
      </form>
    </section>
    <h3>Historique des commandes fournisseurs</h3>
    {loading&&<p className="muted">Chargement…</p>}
    {!loading&&!orders.length&&<p className="muted">Aucun bon de commande fournisseur.</p>}
    <div className="stack">
      {orders.map(order=><article className="auth-card" key={order.id} style={{margin:"14px 0"}}>
        <div className="form-grid"><div><strong>{order.order_number}</strong><p className="muted">{order.supplier_name}</p></div><div><strong>{statusLabels[order.status]||order.status}</strong><p className="muted">{Number(order.subtotal).toLocaleString("fr-FR")} {order.currency}</p></div></div>
        <ul>{(order.items||[]).map(item=><li key={item.id}>{item.reference?item.reference+" — ":""}{item.description} : {item.quantity_received}/{item.quantity_ordered} reçue(s) · {Number(item.unit_cost).toLocaleString("fr-FR")} {order.currency}</li>)}</ul>
        {order.expected_at&&<p className="muted">Livraison prévue : {new Date(order.expected_at).toLocaleDateString("fr-FR")}</p>}
        {order.status==="draft"&&<button type="button" className="btn btn-primary" onClick={()=>void changeOrder(order.id,"mark_sent")}>Marquer comme envoyée</button>}
        {["sent","partially_received"].includes(order.status)&&<form onSubmit={e=>void receiveOrder(e,order.id)}>
          <h4>Enregistrer une réception partielle ou complète</h4>
          {(order.items||[]).filter(item=>item.quantity_received<item.quantity_ordered).map(item=><div className="field" key={item.id}><label htmlFor={"receive-"+item.id}>{item.description} — reste {item.quantity_ordered-item.quantity_received}</label><input id={"receive-"+item.id} name={"receive-"+item.id} type="number" min="0" max={item.quantity_ordered-item.quantity_received} step="1" defaultValue="0"/></div>)}
          <button type="submit" className="btn btn-primary">Valider les quantités reçues</button>
        </form>}
        {["draft","sent"].includes(order.status)&&<button type="button" className="btn btn-secondary" onClick={()=>void changeOrder(order.id,"cancel")}>Annuler le bon</button>}
      </article>)}
    </div>
  </div></section>;
}
