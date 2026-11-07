"use client";
import {useCallback,useEffect,useState} from "react";

type Payment={id:string;amount:string;currency:string;method:string;status:string;transaction_reference:string|null;invoice_number:string|null;order_number:string|null;created_at:string;customer_name:string|null};
type Invoice={id:string;invoice_number:string;status:string;total:string;amount_paid:string;currency:string};
type Order={id:string;order_number:string;status:string;payment_status:string;total:string;currency:string};
const statusLabels:Record<string,string>={pending:"À vérifier",verified:"Confirmé",rejected:"Rejeté",refunded:"Remboursé"};
const methodLabels:Record<string,string>={cash:"Espèces",bank_transfer:"Virement",cash_on_delivery:"À la livraison",mvola:"MVola",orange_money:"Orange Money",airtel_money:"Airtel Money",other:"Autre"};

export default function PaymentsPage(){
 const [rows,setRows]=useState<Payment[]>([]);
 const [invoices,setInvoices]=useState<Invoice[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");

 const load=useCallback(async()=>{
  try{
   const [p,i,o]=await Promise.all([fetch("/api/admin/payments",{cache:"no-store"}),fetch("/api/admin/invoices",{cache:"no-store"}),fetch("/api/admin/orders",{cache:"no-store"})]);
   if([p,i,o].some(x=>x.status===403)){window.location.href="/compte";return;}
   const [pd,id,od]=await Promise.all([p.json(),i.json(),o.json()]);
   if(!p.ok||!i.ok||!o.ok)throw new Error(pd.error||id.error||od.error||"Chargement des paiements impossible.");
   setRows(pd.payments||[]);setInvoices(id.invoices||[]);setOrders(od.orders||[]);
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);const target=String(f.get("target"));
  try{
   const r=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({[target.startsWith("invoice:")?"invoiceId":"orderId"]:target.split(":")[1],amount:f.get("amount"),currency:f.get("currency"),method:f.get("method"),transactionReference:f.get("reference")})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Enregistrement impossible.");
   setSuccess("Paiement enregistré en attente de vérification.");form.reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }

 async function change(id:string,status:"verified"|"rejected"|"refunded"){
  setError("");setSuccess("");
  try{
   const note=status==="refunded"?"Remboursement enregistré par l’administration.":status==="rejected"?"Paiement non confirmé.":"Paiement vérifié par l’administration.";
   const r=await fetch("/api/admin/payments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status,note})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Validation impossible.");
   setSuccess(status==="verified"?"Paiement confirmé.":status==="rejected"?"Paiement rejeté.":"Remboursement enregistré.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Validation impossible.");}
 }

 const payableInvoices=invoices.filter(i=>["issued","partially_paid"].includes(i.status)&&Number(i.amount_paid)<Number(i.total));
 const payableOrders=orders.filter(o=>o.status!=="cancelled"&&o.payment_status!=="paid"&&o.payment_status!=="refunded");

 return <main className="page-shell"><div className="container">
  <div className="section-kicker">ENCAISSEMENTS</div><h1 className="page-title">Paiements</h1>
  <p className="muted">Les paiements reçus restent en attente tant qu’ils n’ont pas été vérifiés. Les soldes sont contrôlés sur les factures et commandes ; les remboursements sont historisés.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Enregistrer un paiement reçu</h2>
   <form onSubmit={create}>
    <div className="field"><label htmlFor="payment-target">Facture ou commande avec solde dû</label><select id="payment-target" name="target" required defaultValue=""><option value="" disabled>Choisir un document</option><optgroup label="Factures">{payableInvoices.map(i=><option key={i.id} value={"invoice:"+i.id}>{i.invoice_number} · reste {Math.max(0,Number(i.total)-Number(i.amount_paid)).toLocaleString("fr-FR")} {i.currency}</option>)}</optgroup><optgroup label="Commandes">{payableOrders.map(o=><option key={o.id} value={"order:"+o.id}>{o.order_number} · {o.total} {o.currency}</option>)}</optgroup></select></div>
    <div className="field"><label htmlFor="payment-amount">Montant reçu</label><input id="payment-amount" name="amount" type="number" min="0.01" step="0.01" required/></div>
    <div className="field"><label htmlFor="payment-currency">Devise</label><select id="payment-currency" name="currency" defaultValue="MGA"><option>MGA</option><option>EUR</option><option>USD</option></select></div>
    <div className="field"><label htmlFor="payment-method">Mode de paiement</label><select id="payment-method" name="method"><option value="cash">Espèces</option><option value="bank_transfer">Virement bancaire</option><option value="cash_on_delivery">Paiement à la livraison</option><option value="mvola">MVola</option><option value="orange_money">Orange Money</option><option value="airtel_money">Airtel Money</option><option value="other">Autre</option></select></div>
    <div className="field"><label htmlFor="payment-reference">Référence de transaction</label><input id="payment-reference" name="reference" maxLength={160}/></div>
    <button className="btn btn-primary" disabled={busy||(!payableInvoices.length&&!payableOrders.length)}>{busy?"Enregistrement…":"Enregistrer en attente"}</button>
   </form>
  </section>
  <div className="table-wrap"><table><thead><tr><th>Client</th><th>Document</th><th>Montant</th><th>Mode</th><th>Référence</th><th>Statut</th><th>Action</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{p.customer_name||"—"}</td><td>{p.invoice_number||p.order_number||"—"}</td><td>{Number(p.amount).toLocaleString("fr-FR")} {p.currency}</td><td>{methodLabels[p.method]||p.method}</td><td>{p.transaction_reference||"—"}</td><td>{statusLabels[p.status]||p.status}</td><td>{p.status==="pending"?<><button className="btn btn-primary" onClick={()=>void change(p.id,"verified")}>Confirmer</button> <button className="btn btn-outline" onClick={()=>void change(p.id,"rejected")}>Rejeter</button></>:p.status==="verified"?<button className="btn btn-outline" onClick={()=>void change(p.id,"refunded")}>Enregistrer le remboursement</button>:"—"}</td></tr>)}</tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucun paiement enregistré.</p>}</div>
 </div></main>;
}
