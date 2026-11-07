"use client";
import {useCallback,useEffect,useState} from "react";
type Appointment={id:string;service_type:string;description:string|null;requested_at:string;scheduled_start:string|null;scheduled_end:string|null;status:string;customer_id:string|null;assigned_mechanic_id:string|null;customer_name:string|null;mechanic_name:string|null;model:string|null;registration_number:string|null};
type Mechanic={id:string;full_name:string};
type Customer={id:string;full_name:string;email:string};
type Vehicle={id:string;user_id:string;make:string;model:string;registration_number:string|null};
const labels:Record<string,string>={requested:"Demandé",confirmed:"Confirmé",in_progress:"En cours",completed:"Terminé",cancelled:"Annulé",no_show:"Absent"};
const toIso=(value:FormDataEntryValue|null)=>value?new Date(String(value)).toISOString():null;

export default function AppointmentsPage(){
 const [rows,setRows]=useState<Appointment[]>([]);
 const [mechanics,setMechanics]=useState<Mechanic[]>([]);
 const [customers,setCustomers]=useState<Customer[]>([]);
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [customerId,setCustomerId]=useState("");
 const [vehicleId,setVehicleId]=useState("");
 const [mechanicId,setMechanicId]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");

 const load=useCallback(async()=>{
  try{
   const r=await fetch("/api/admin/appointments",{cache:"no-store"});
   if(r.status===403){window.location.href="/compte";return;}
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Chargement impossible.");
   setRows(d.appointments||[]);setMechanics(d.mechanics||[]);setCustomers(d.customers||[]);setVehicles(d.vehicles||[]);
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerId:customerId||null,customerVehicleId:vehicleId||null,mechanicId:mechanicId||null,serviceType:f.get("serviceType"),description:f.get("description"),requestedAt:new Date().toISOString(),scheduledStart:toIso(f.get("scheduledStart")),scheduledEnd:toIso(f.get("scheduledEnd"))})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Création impossible.");
   form.reset();setCustomerId("");setVehicleId("");setMechanicId("");setSuccess("Rendez-vous enregistré.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Création impossible.");}
  finally{setBusy(false);}
 }

 async function update(e:React.FormEvent<HTMLFormElement>,id:string){
  e.preventDefault();setError("");setSuccess("");const form=e.currentTarget;const f=new FormData(form);
  try{
   const r=await fetch("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status:"confirmed",mechanicId:f.get("mechanicId"),scheduledStart:toIso(f.get("scheduledStart")),scheduledEnd:toIso(f.get("scheduledEnd"))})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Planification impossible.");
   setSuccess("Créneau confirmé.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Planification impossible.");}
 }

 async function change(id:string,status:string){
  setError("");setSuccess("");
  try{
   const r=await fetch("/api/admin/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Modification impossible.");
   setSuccess("Statut du rendez-vous mis à jour.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}
 }

 const customerVehicles=vehicles.filter(v=>v.user_id===customerId);
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">PLANNING ATELIER</div><h1 className="page-title">Rendez-vous</h1>
  <p className="muted">Les créneaux affectés à un mécanicien sont contrôlés contre les chevauchements. L’attribution exige un compte auquel l’administrateur a donné le rôle mécanicien.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  {!mechanics.length&&<p className="notice">Aucun mécanicien n’est encore affecté. L’administrateur peut attribuer ce rôle dans « Équipe et permissions ».</p>}
  <section className="auth-card" style={{maxWidth:760,margin:"20px 0"}}>
   <h2>Nouveau rendez-vous</h2>
   <form onSubmit={create}>
    <div className="field"><label htmlFor="appointment-customer">Client</label><select id="appointment-customer" value={customerId} onChange={e=>{setCustomerId(e.target.value);setVehicleId("");}}><option value="">Client non associé</option>{customers.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.email}</option>)}</select></div>
    <div className="field"><label htmlFor="appointment-vehicle">Véhicule du client</label><select id="appointment-vehicle" value={vehicleId} onChange={e=>setVehicleId(e.target.value)} disabled={!customerId}><option value="">Aucun véhicule sélectionné</option>{customerVehicles.map(v=><option key={v.id} value={v.id}>{v.make} {v.model} · {v.registration_number||"Sans immatriculation"}</option>)}</select></div>
    <div className="field"><label htmlFor="service-type">Prestation demandée</label><input id="service-type" name="serviceType" required minLength={2} maxLength={120} placeholder="Entretien, diagnostic…"/></div>
    <div className="field"><label htmlFor="service-desc">Description du problème</label><textarea id="service-desc" name="description" rows={3} maxLength={3000}/></div>
    <div className="field"><label htmlFor="appointment-mechanic">Mécanicien (requis pour réserver un créneau)</label><select id="appointment-mechanic" value={mechanicId} onChange={e=>setMechanicId(e.target.value)}><option value="">Non affecté / demande à planifier</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
    <div className="form-grid">
     <div className="field"><label htmlFor="scheduled-start">Début prévu (facultatif)</label><input id="scheduled-start" name="scheduledStart" type="datetime-local"/></div>
     <div className="field"><label htmlFor="scheduled-end">Fin prévue (facultatif)</label><input id="scheduled-end" name="scheduledEnd" type="datetime-local"/></div>
    </div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Enregistrement…":"Enregistrer le rendez-vous"}</button>
   </form>
  </section>
  <div className="table-wrap"><table><thead><tr><th>Prestation</th><th>Client</th><th>Véhicule</th><th>Mécanicien</th><th>Créneau</th><th>Statut / action</th></tr></thead><tbody>
   {rows.map(a=><tr key={a.id}>
    <td>{a.service_type}</td><td>{a.customer_name||"À renseigner"}</td><td>{[a.model,a.registration_number].filter(Boolean).join(" · ")||"—"}</td><td>{a.mechanic_name||"À affecter"}</td>
    <td>{a.scheduled_start?new Date(a.scheduled_start).toLocaleString("fr-FR"):"À planifier"}</td>
    <td><strong>{labels[a.status]||a.status}</strong>
     {a.status==="requested"&&<form onSubmit={e=>void update(e,a.id)} style={{minWidth:220,marginTop:8}}>
      <select name="mechanicId" defaultValue={a.assigned_mechanic_id||""} required><option value="">Choisir un mécanicien</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select>
      <input name="scheduledStart" type="datetime-local" required style={{marginTop:6}}/>
      <input name="scheduledEnd" type="datetime-local" required style={{marginTop:6}}/>
      <button className="btn btn-primary" type="submit">Planifier et confirmer</button>
     </form>}
     {a.status==="confirmed"&&<><button className="btn btn-primary" onClick={()=>void change(a.id,"in_progress")}>Démarrer</button> <button className="btn btn-outline" onClick={()=>void change(a.id,"cancelled")}>Annuler</button></>}
     {a.status==="in_progress"&&<><button className="btn btn-primary" onClick={()=>void change(a.id,"completed")}>Terminer</button> <button className="btn btn-outline" onClick={()=>void change(a.id,"cancelled")}>Annuler</button></>}
    </td>
   </tr>)}
  </tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucun rendez-vous enregistré.</p>}</div>
 </div></main>;
}
