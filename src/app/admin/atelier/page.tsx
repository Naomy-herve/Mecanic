"use client";
import { useCallback,useEffect,useState } from "react";

type Job={id:string;job_number:string;status:string;received_at:string;symptoms:string;diagnosis:string|null;customer_name:string|null;model:string|null;registration_number:string|null;mechanic_name:string|null};
type Product={id:string;sku:string;name:string;stock_quantity:number;price:string;is_active:boolean};
type Part={id:string;workshop_job_id:string;job_number:string;sku:string|null;description:string;quantity:number;unit_price:string;created_at:string};
const labels:Record<string,string>={received:"Reçu",diagnosis:"Diagnostic",quote_pending:"Devis en attente",approved:"Devis approuvé",in_repair:"En réparation",quality_check:"Contrôle qualité",completed:"Terminé",delivered:"Livré",cancelled:"Annulé"};
const statuses=Object.keys(labels);

export default function WorkshopPage(){
 const [rows,setRows]=useState<Job[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [parts,setParts]=useState<Part[]>([]);
 const [selectedJob,setSelectedJob]=useState("");
 const [selectedProduct,setSelectedProduct]=useState("");
 const [quantity,setQuantity]=useState(1);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");

 const load=useCallback(async()=>{
  setError("");
  try{
   const [r,p,m]=await Promise.all([
    fetch("/api/admin/workshop/jobs",{cache:"no-store"}),
    fetch("/api/admin/products",{cache:"no-store"}),
    fetch("/api/admin/workshop/jobs/parts",{cache:"no-store"})
   ]);
   if([r,p,m].some(x=>x.status===403)){window.location.href="/compte";return;}
   const [d,pd,md]=await Promise.all([r.json(),p.json(),m.json()]);
   if(!r.ok||!p.ok||!m.ok)throw new Error(d.error||pd.error||md.error||"Chargement impossible.");
   setRows(d.jobs||[]);setProducts((pd.products||[]).filter((x:Product)=>x.is_active));setParts(md.parts||[]);
   setSelectedJob(current=>current||(d.jobs||[]).find((x:Job)=>["approved","in_repair"].includes(x.status))?.id||"");
   setSelectedProduct(current=>current||(pd.products||[]).find((x:Product)=>x.is_active&&x.stock_quantity>0)?.id||"");
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  const f=new FormData(e.currentTarget);
  try{
   const r=await fetch("/api/admin/workshop/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobNumber:f.get("jobNumber"),symptoms:f.get("symptoms"),odometerKm:f.get("odometerKm")||null})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Création impossible.");
   e.currentTarget.reset();setSuccess("Dossier atelier créé.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Création impossible.");}
  finally{setBusy(false);}
 }

 async function change(id:string,status:string){
  setError("");setSuccess("");
  try{
   const r=await fetch("/api/admin/workshop/jobs",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Modification impossible.");
   setSuccess("Statut du dossier mis à jour.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}
 }

 async function consume(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  try{
   const r=await fetch("/api/admin/workshop/jobs/parts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workshopJobId:selectedJob,productId:selectedProduct,quantity})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Consommation impossible.");
   setSuccess("Pièce ajoutée au dossier. Stock restant : "+d.remainingStock+".");setQuantity(1);await load();
  }catch(e){setError(e instanceof Error?e.message:"Consommation impossible.");}
  finally{setBusy(false);}
 }

 const eligibleJobs=rows.filter(j=>["approved","in_repair"].includes(j.status));
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">GESTION DU GARAGE</div><h1 className="page-title">Atelier et réparations</h1>
  <p className="muted">Suivez chaque véhicule de sa réception à sa restitution. Les changements de statut sont historisés et les pièces utilisées sont déduites du stock avec une trace de mouvement.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Nouveau dossier atelier</h2>
   <form onSubmit={create}>
    <div className="field"><label htmlFor="job-number">Numéro du dossier</label><input id="job-number" name="jobNumber" required minLength={3} maxLength={40} placeholder="AT-2026-001"/></div>
    <div className="field"><label htmlFor="job-symptoms">Symptômes signalés</label><textarea id="job-symptoms" name="symptoms" required minLength={3} maxLength={5000} rows={3}/></div>
    <div className="field"><label htmlFor="job-odo">Kilométrage à la réception</label><input id="job-odo" name="odometerKm" type="number" min="0"/></div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Enregistrement…":"Créer le dossier"}</button>
   </form>
  </section>

  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Enregistrer une pièce utilisée</h2>
   <p className="muted">Disponible après approbation du devis ou au statut « en réparation ». Le stock est vérifié et décrémenté dans une transaction.</p>
   {!eligibleJobs.length&&<p className="muted">Aucun dossier approuvé ou en réparation.</p>}
   {!products.length&&<p className="muted">Aucune pièce active avec stock disponible.</p>}
   <form onSubmit={consume}>
    <div className="field"><label htmlFor="part-job">Dossier atelier</label><select id="part-job" value={selectedJob} onChange={e=>setSelectedJob(e.target.value)} required><option value="">Choisir un dossier</option>{eligibleJobs.map(j=><option key={j.id} value={j.id}>{j.job_number} — {j.symptoms.slice(0,70)}</option>)}</select></div>
    <div className="field"><label htmlFor="part-product">Pièce</label><select id="part-product" value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} required><option value="">Choisir une pièce</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (stock {p.stock_quantity})</option>)}</select></div>
    <div className="field"><label htmlFor="part-quantity">Quantité utilisée</label><input id="part-quantity" type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></div>
    <button className="btn btn-primary" disabled={busy||!eligibleJobs.length||!products.length}>{busy?"Enregistrement…":"Déduire du stock et rattacher au dossier"}</button>
   </form>
  </section>

  <h2>Pièces consommées en atelier</h2>
  <div className="table-wrap"><table><thead><tr><th>Dossier</th><th>Pièce</th><th>Quantité</th><th>Prix unitaire</th><th>Date</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.job_number}</td><td>{p.sku||"—"} — {p.description}</td><td>{p.quantity}</td><td>{Number(p.unit_price).toLocaleString("fr-FR")}</td><td>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td></tr>)}</tbody></table>{!loading&&!parts.length&&<p className="muted" style={{padding:18}}>Aucune pièce consommée.</p>}</div>

  <h2>Dossiers de réparation</h2>
  <div className="table-wrap"><table><thead><tr><th>Dossier</th><th>Véhicule / Client</th><th>Symptômes</th><th>Réception</th><th>Statut</th></tr></thead><tbody>{rows.map(j=><tr key={j.id}><td>{j.job_number}</td><td>{[j.model,j.registration_number,j.customer_name].filter(Boolean).join(" · ")||"À renseigner"}</td><td>{j.symptoms}</td><td>{new Date(j.received_at).toLocaleDateString("fr-FR")}</td><td><select aria-label={"Statut "+j.job_number} value={j.status} onChange={e=>void change(j.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></td></tr>)}</tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucun dossier atelier enregistré.</p>}</div>
 </div></main>;
}
