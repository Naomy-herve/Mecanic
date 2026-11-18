"use client";
import {useCallback,useEffect,useState} from "react";
type Notification={id:string;event_type:string;title:string;message:string;status:string;created_at:string};
type Preferences={order_updates:boolean;repair_updates:boolean;appointment_reminders:boolean;invoice_updates:boolean;marketing_messages:boolean};
const defaults:Preferences={order_updates:true,repair_updates:true,appointment_reminders:true,invoice_updates:true,marketing_messages:false};
export function AccountNotifications(){
 const [rows,setRows]=useState<Notification[]>([]);
 const [preferences,setPreferences]=useState<Preferences>(defaults);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const load=useCallback(async()=>{
  try{
   const [n,p]=await Promise.all([fetch("/api/notifications",{cache:"no-store"}),fetch("/api/notifications/preferences",{cache:"no-store"})]);
   if([n,p].some(x=>x.status===401)){window.location.href="/compte";return;}
   const [nd,pd]=await Promise.all([n.json(),p.json()]);
   if(!n.ok||!p.ok)throw new Error(nd.error||pd.error||"Chargement impossible.");
   setRows(nd.notifications||[]);setPreferences({...defaults,...pd.preferences});
  }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function markRead(id:string){
  try{const r=await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Mise à jour impossible.");setRows(current=>current.map(x=>x.id===id?{...x,status:"read"}:x));}
  catch(e){setError(e instanceof Error?e.message:"Mise à jour impossible.");}
 }
 async function save(){
  if(busy)return;setBusy(true);setError("");setSuccess("");
  try{
   const r=await fetch("/api/notifications/preferences",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderUpdates:preferences.order_updates,repairUpdates:preferences.repair_updates,appointmentReminders:preferences.appointment_reminders,invoiceUpdates:preferences.invoice_updates,marketingMessages:preferences.marketing_messages})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Enregistrement impossible.");setPreferences({...defaults,...d.preferences});setSuccess("Préférences enregistrées.");
  }catch(e){setError(e instanceof Error?e.message:"Enregistrement impossible.");}
  finally{setBusy(false);}
 }
 const options:[keyof Preferences,string][]=[["order_updates","Commandes"],["repair_updates","Réparations et atelier"],["appointment_reminders","Rendez-vous"],["invoice_updates","Factures et paiements"],["marketing_messages","Informations commerciales"]];
 return <section style={{marginTop:30}}>
  <h2>Notifications et préférences</h2>
  <p className="muted">Les alertes sont disponibles dans cet espace. Les messages commerciaux sont désactivés par défaut.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <div className="auth-card" style={{maxWidth:760,margin:"16px 0"}}>
   <h3>Mes notifications</h3>
   {loading&&<p className="muted">Chargement…</p>}
   {!loading&&!rows.length&&<p className="muted">Aucune notification pour le moment.</p>}
   <div className="stack">{rows.map(n=><article key={n.id} style={{padding:"12px 0",borderBottom:"1px solid var(--border)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>{n.title}</strong><small className="muted">{new Date(n.created_at).toLocaleString("fr-FR")}</small></div>
    <p>{n.message}</p>
    {n.status!=="read"&&<button type="button" className="btn btn-outline" onClick={()=>void markRead(n.id)}>Marquer comme lue</button>}
   </article>)}</div>
  </div>
  <div className="auth-card" style={{maxWidth:760,margin:"16px 0"}}>
   <h3>Mes préférences</h3>
   {options.map(([key,label])=><label key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0"}}><input type="checkbox" checked={preferences[key]} onChange={e=>setPreferences(p=>({...p,[key]:e.target.checked}))}/>{label}</label>)}
   <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void save()}>{busy?"Enregistrement…":"Enregistrer mes préférences"}</button>
  </div>
 </section>;
}
