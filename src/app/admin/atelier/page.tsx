"use client";
import {useCallback,useEffect,useState} from "react";

type Job={id:string;job_number:string;status:string;received_at:string;symptoms:string;diagnosis:string|null;recommendations:string|null;internal_notes:string|null;customer_approval_note:string|null;customer_name:string|null;customer_id:string|null;model:string|null;registration_number:string|null;mechanic_name:string|null;assigned_mechanic_id:string|null};
type Product={id:string;sku:string;name:string;stock_quantity:number;reserved_quantity:number;price:string;is_active:boolean};
type Part={id:string;workshop_job_id:string;job_number:string;sku:string|null;description:string;quantity:number;unit_price:string;created_at:string};
type Customer={id:string;full_name:string;email:string};
type Vehicle={id:string;user_id:string;make:string;model:string;registration_number:string|null};
type Mechanic={id:string;full_name:string};
const labels:Record<string,string>={received:"Reçu",diagnosis:"Diagnostic",quote_pending:"Devis en attente",approved:"Devis approuvé",in_repair:"En réparation",quality_check:"Contrôle qualité",completed:"Terminé",delivered:"Livré",cancelled:"Annulé"};
const statuses=Object.keys(labels);

export default function WorkshopPage(){
 const [rows,setRows]=useState<Job[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [parts,setParts]=useState<Part[]>([]);
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [mechanics,setMechanics]=useState<Mechanic[]>([]);
 const [selectedCustomer,setSelectedCustomer]=useState("");
 const [selectedVehicle,setSelectedVehicle]=useState("");
 const [selectedMechanic,setSelectedMechanic]=useState("");
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
   setCustomers(d.customers||[]);setVehicles(d.vehicles||[]);setMechanics(d.mechanics||[]);
   const availableJobs=(d.jobs||[]).filter((x:Job)=>["approved","in_repair"].includes(x.status));
   const availableProducts=(pd.products||[]).filter((x:Product)=>x.is_active&&x.stock_quantity>x.reserved_quantity);
   setSelectedJob(current=>availableJobs.some((x:Job)=>x.id===current)?current:availableJobs[0]?.id||"");
   setSelectedProduct(current=>availableProducts.some((x:Product)=>x.id===current)?current:availableProducts[0]?.id||"");
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/workshop/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:selectedCustomer||null,customerVehicleId:selectedVehicle||null,assignedMechanicId:selectedMechanic||null,jobNumber:f.get("jobNumber"),symptoms:f.get("symptoms"),intakeCondition:f.get("intakeCondition"),odometerKm:f.get("odometerKm")||null})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Création impossible.");
   form.reset();setSelectedCustomer("");setSelectedVehicle("");setSelectedMechanic("");setSuccess("Dossier atelier créé.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Création impossible.");}
  finally{setBusy(false);}
 }

 async function change(e:React.FormEvent<HTMLFormElement>,id:string){
  e.preventDefault();setError("");setSuccess("");const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/workshop/jobs",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:f.get("status"),diagnosis:f.get("diagnosis"),recommendations:f.get("recommendations"),internalNotes:f.get("internalNotes"),customerApprovalNote:f.get("customerApprovalNote")})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Modification impossible.");
   setSuccess("Dossier mis à jour et historisé.");await load();
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
 const customerVehicles=vehicles.filter(v=>v.user_id===selectedCustomer);
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">GESTION DU GARAGE</div><h1 className="page-title">Atelier et réparations</h1>
  <p className="muted">Suivez chaque véhicule de sa réception à sa restitution. Les dossiers sont associés au client, au véhicule et au mécanicien ; les pièces utilisées sont déduites du stock disponible avec une trace de mouvement.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:800,margin:"20px 0"}}>
   <h2>Nouveau dossier atelier</h2>
   <form onSubmit={create}>
    <div className="form-grid">
     <div className="field"><label htmlFor="job-customer">Client</label><select id="job-customer" value={selectedCustomer} onChange={e=>{setSelectedCustomer(e.target.value);setSelectedVehicle("");}}><option value="">Client non associé</option>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.email}</option>)}</select></div>
     <div className="field"><label htmlFor="job-vehicle">Véhicule</label><select id="job-vehicle" value={selectedVehicle} onChange={e=>setSelectedVehicle(e.target.value)} disabled={!selectedCustomer}><option value="">Aucun véhicule</option>{customerVehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number||"Sans immatriculation"}</option>)}</select></div>
    </div>
    <div className="field"><label htmlFor="job-mechanic">Mécanicien affecté</label><select id="job-mechanic" value={selectedMechanic} onChange={e=>setSelectedMechanic(e.target.value)}><option value="">À affecter ultérieurement</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
    <div className="field"><label htmlFor="job-number">Numéro du dossier</label><input id="job-number" name="jobNumber" required minLength={3} maxLength={40} placeholder="AT-2026-001"/></div>
    <div className="field"><label htmlFor="job-symptoms">Symptômes signalés</label><textarea id="job-symptoms" name="symptoms" required minLength={3} maxLength={5000} rows={3}/></div>
    <div className="field"><label htmlFor="job-condition">État du véhicule à la réception</label><textarea id="job-condition" name="intakeCondition" maxLength={3000} rows={2}/></div>
    <div className="field"><label htmlFor="job-odo">Kilométrage à la réception</label><input id="job-odo" name="odometerKm" type="number" min="0"/></div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Enregistrement…":"Créer le dossier"}</button>
   </form>
  </section>

  <section className="auth-card" style={{maxWidth:800,margin:"20px 0"}}>
   <h2>Enregistrer une pièce utilisée</h2>
   <p className="muted">Disponible après approbation du devis ou au statut « en réparation ». Le stock réservé à d’autres commandes n’est pas consommable.</p>
   {!eligibleJobs.length&&<p className="muted">Aucun dossier approuvé ou en réparation.</p>}
   {!products.length&&<p className="muted">Aucune pièce active avec stock disponible.</p>}
   <form onSubmit={consume}>
    <div className="field"><label htmlFor="part-job">Dossier atelier</label><select id="part-job" value={selectedJob} onChange={e=>setSelectedJob(e.target.value)} required><option value="">Choisir un dossier</option>{eligibleJobs.map(j=><option key={j.id} value={j.id}>{j.job_number} — {j.symptoms.slice(0,70)}</option>)}</select></div>
    <div className="field"><label htmlFor="part-product">Pièce</label><select id="part-product" value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} required><option value="">Choisir une pièce</option>{products.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} (disponible {p.stock_quantity-p.reserved_quantity})</option>)}</select></div>
    <div className="field"><label htmlFor="part-quantity">Quantité utilisée</label><input id="part-quantity" type="number" min="1" max="100000" step="1" value={quantity} onChange={e=>setQuantity(Number(e.target.value))} required/></div>
    <button className="btn btn-primary" disabled={busy||!eligibleJobs.length||!products.length}>{busy?"Enregistrement…":"Déduire du stock et rattacher au dossier"}</button>
   </form>
  </section>

  <h2>Pièces consommées en atelier</h2>
  <div className="table-wrap"><table><thead><tr><th>Dossier</th><th>Pièce</th><th>Quantité</th><th>Prix unitaire</th><th>Date</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td>{p.job_number}</td><td>{p.sku||"—"} — {p.description}</td><td>{p.quantity}</td><td>{Number(p.unit_price).toLocaleString("fr-FR")}</td><td>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td></tr>)}</tbody></table>{!loading&&!parts.length&&<p className="muted" style={{padding:18}}>Aucune pièce consommée.</p>}</div>

  <h2>Dossiers de réparation</h2>
  <div className="stack">{rows.map(j=><article className="auth-card" key={j.id} style={{margin:"12px 0"}}>
   <div className="form-grid"><div><strong>{j.job_number}</strong><p className="muted">{j.customer_name||"Client non associé"} · {[j.model,j.registration_number].filter(Boolean).join(" · ")||"Véhicule non associé"}</p></div><div><strong>{labels[j.status]||j.status}</strong><p className="muted">Mécanicien : {j.mechanic_name||"À affecter"}</p></div></div>
   <p>{j.symptoms}</p>
   <form onSubmit={e=>void change(e,j.id)}>
    <div className="field"><label htmlFor={"job-status-"+j.id}>Étape du dossier</label><select id={"job-status-"+j.id} name="status" defaultValue={j.status}>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></div>
    <div className="field"><label htmlFor={"job-diagnosis-"+j.id}>Diagnostic</label><textarea id={"job-diagnosis-"+j.id} name="diagnosis" defaultValue={j.diagnosis||""} rows={2} maxLength={5000}/></div>
    <div className="field"><label htmlFor={"job-recommendations-"+j.id}>Recommandations / devis</label><textarea id={"job-recommendations-"+j.id} name="recommendations" defaultValue={j.recommendations||""} rows={2} maxLength={5000}/></div>
    <div className="field"><label htmlFor={"job-approval-"+j.id}>Accord du client (obligatoire pour approuver)</label><input id={"job-approval-"+j.id} name="customerApprovalNote" defaultValue={j.customer_approval_note||""} maxLength={1000}/></div>
    <div className="field"><label htmlFor={"job-notes-"+j.id}>Notes internes</label><textarea id={"job-notes-"+j.id} name="internalNotes" defaultValue={j.internal_notes||""} rows={2} maxLength={3000}/></div>
    <button className="btn btn-primary" type="submit">Enregistrer l’étape et les notes</button>
   </form>
  </article>)}</div>
  {loading&&<p className="muted">Chargement…</p>}{!loading&&!rows.length&&<p className="muted">Aucun dossier atelier enregistré.</p>}
 </div></main>;
}
