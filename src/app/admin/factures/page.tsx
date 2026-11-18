"use client";
import {useCallback,useEffect,useState} from "react";
type Invoice={id:string;invoice_number:string;status:string;currency:string;subtotal:string;tax_total:string;total:string;amount_paid:string;customer_name:string|null;issued_at:string|null};
type Customer={id:string;full_name:string;email:string};
export default function InvoicesPage(){
 const [rows,setRows]=useState<Invoice[]>([]);
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const load=useCallback(async()=>{
  try{
   const [r,c]=await Promise.all([fetch("/api/admin/invoices",{cache:"no-store"}),fetch("/api/admin/customers",{cache:"no-store"})]);
   if([r,c].some(x=>x.status===403)){window.location.href="/compte";return;}
   const [d,cd]=await Promise.all([r.json(),c.json()]);
   if(!r.ok||!c.ok)throw new Error(d.error||cd.error||"Chargement impossible.");
   setRows(d.invoices||[]);setCustomers(cd.customers||[]);
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/invoices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:f.get("customerId")||null,currency:f.get("currency"),items:[{itemType:f.get("itemType"),description:f.get("description"),quantity:f.get("quantity"),unitPrice:f.get("unitPrice"),taxRate:f.get("taxRate")}]})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Création impossible.");
   setSuccess("Facture "+d.invoice.invoice_number+" créée.");form.reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"Création impossible.");}
  finally{setBusy(false);}
 }
 const money=(v:string,c:string)=>Number(v).toLocaleString("fr-FR")+" "+c;
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">DOCUMENTS COMMERCIAUX</div><h1 className="page-title">Factures</h1>
  <p className="muted">Les montants sont calculés côté serveur. Associez chaque facture à un client ; les références de pièces utilisent leur prix enregistré et la main-d’œuvre est saisie par l’administrateur.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Créer une facture</h2>
   <form onSubmit={create}>
    <div className="field"><label htmlFor="invoice-customer">Client</label><select id="invoice-customer" name="customerId" defaultValue=""><option value="">Client non associé</option>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.email}</option>)}</select></div>
    <div className="field"><label htmlFor="invoice-currency">Devise</label><select id="invoice-currency" name="currency" defaultValue="MGA"><option>MGA</option><option>EUR</option><option>USD</option></select></div>
    <div className="field"><label htmlFor="invoice-type">Type de ligne</label><select id="invoice-type" name="itemType" defaultValue="service"><option value="part">Pièce</option><option value="labor">Main-d’œuvre</option><option value="service">Prestation</option><option value="other">Autre</option></select></div>
    <div className="field"><label htmlFor="invoice-description">Désignation</label><input id="invoice-description" name="description" required minLength={2}/></div>
    <div className="field"><label htmlFor="invoice-qty">Quantité</label><input id="invoice-qty" name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required/></div>
    <div className="field"><label htmlFor="invoice-price">Prix unitaire</label><input id="invoice-price" name="unitPrice" type="number" min="0" step="0.01" required/></div>
    <div className="field"><label htmlFor="invoice-tax">Taxe (%)</label><input id="invoice-tax" name="taxRate" type="number" min="0" max="100" step="0.01" defaultValue="0"/></div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Création…":"Créer la facture"}</button>
   </form>
  </section>
  <div className="table-wrap"><table><thead><tr><th>Facture</th><th>Client</th><th>Total</th><th>Payé</th><th>Statut</th><th>Date</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td>{i.invoice_number}</td><td>{i.customer_name||"Non associé"}</td><td>{money(i.total,i.currency)}</td><td>{money(i.amount_paid,i.currency)}</td><td>{i.status}</td><td>{i.issued_at?new Date(i.issued_at).toLocaleDateString("fr-FR"):"—"}</td></tr>)}</tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucune facture enregistrée.</p>}</div>
 </div></main>;
}
