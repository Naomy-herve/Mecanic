"use client";
import {useCallback,useEffect,useState} from "react";
type Row={id:string;category:string;description:string;amount:string;currency:string;expense_date:string;supplier_name:string|null};
type Supplier={id:string;name:string};
export default function Depenses(){
 const[rows,setRows]=useState<Row[]>([]);
 const[suppliers,setSuppliers]=useState<Supplier[]>([]);
 const[error,setError]=useState("");
 const[success,setSuccess]=useState("");
 const[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  try{
   const [r,s]=await Promise.all([fetch("/api/admin/expenses",{cache:"no-store"}),fetch("/api/admin/suppliers",{cache:"no-store"})]);
   if([r,s].some(x=>x.status===403)){window.location.href="/compte";return;}
   const [d,sd]=await Promise.all([r.json(),s.json()]);
   if(!r.ok||!s.ok)throw new Error(d.error||sd.error||"Chargement impossible.");
   setRows(d.expenses||[]);setSuppliers(sd.suppliers||[]);
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/expenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:f.get("category"),description:f.get("description"),amount:f.get("amount"),currency:f.get("currency"),expenseDate:f.get("date")||undefined,supplierId:f.get("supplierId")||null,paymentMethod:f.get("method"),documentReference:f.get("reference")})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Enregistrement impossible.");
   form.reset();setSuccess("Dépense enregistrée.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">GESTION FINANCIÈRE</div><h1 className="page-title">Dépenses</h1>
  <p className="muted">Enregistrez les frais du garage avec leur devise, fournisseur éventuel et référence de justificatif. Les montants restent séparés par devise.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:700,margin:"20px 0"}}>
   <h2>Enregistrer une dépense</h2>
   <form onSubmit={submit}>
    <div className="field"><label htmlFor="expense-category">Catégorie</label><input id="expense-category" name="category" required minLength={2} maxLength={100}/></div>
    <div className="field"><label htmlFor="expense-description">Description</label><input id="expense-description" name="description" required minLength={2} maxLength={500}/></div>
    <div className="field"><label htmlFor="expense-amount">Montant</label><input id="expense-amount" name="amount" type="number" min="0.01" step="0.01" required/></div>
    <div className="field"><label htmlFor="expense-currency">Devise</label><select id="expense-currency" name="currency"><option>MGA</option><option>EUR</option><option>USD</option></select></div>
    <div className="field"><label htmlFor="expense-date">Date</label><input id="expense-date" name="date" type="date"/></div>
    <div className="field"><label htmlFor="expense-supplier">Fournisseur (facultatif)</label><select id="expense-supplier" name="supplierId"><option value="">Non associé</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    <div className="field"><label htmlFor="expense-method">Mode de paiement</label><input id="expense-method" name="method" maxLength={80}/></div>
    <div className="field"><label htmlFor="expense-reference">Référence justificatif</label><input id="expense-reference" name="reference" maxLength={120}/></div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Enregistrement…":"Enregistrer"}</button>
   </form>
  </section>
  <div className="table-wrap"><table><thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Montant</th><th>Fournisseur</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.expense_date).toLocaleDateString("fr-FR")}</td><td>{x.category}</td><td>{x.description}</td><td>{Number(x.amount).toLocaleString("fr-FR")} {x.currency}</td><td>{x.supplier_name||"—"}</td></tr>)}</tbody></table>{!rows.length&&<p className="muted" style={{padding:18}}>Aucune dépense enregistrée.</p>}</div>
 </div></main>;
}
