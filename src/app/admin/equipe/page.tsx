"use client";
import {useCallback,useEffect,useState} from "react";
type Staff={id:string;full_name:string;email:string;staff_roles:string[]};
const labels:Record<string,string>={seller:"Vendeur",mechanic:"Mécanicien",storekeeper:"Magasinier",accountant:"Comptable / responsable"};
export default function TeamPage(){
 const [rows,setRows]=useState<Staff[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState("seller");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const load=useCallback(async()=>{
  try{const r=await fetch("/api/admin/team",{cache:"no-store"});if(r.status===403){window.location.href="/compte";return;}const d=await r.json();if(!r.ok)throw new Error(d.error||"Chargement impossible.");setRows(d.staff||[]);}
  catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function grant(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setError("");setSuccess("");
  try{const r=await fetch("/api/admin/team",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,role})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Attribution impossible.");setSuccess("Rôle attribué à "+email+".");setEmail("");await load();}
  catch(e){setError(e instanceof Error?e.message:"Attribution impossible.");}
  finally{setBusy(false);}
 }
 async function revoke(userId:string,staffRole:string){
  setError("");setSuccess("");
  try{const r=await fetch("/api/admin/team",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,role:staffRole})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Retrait impossible.");setSuccess("Rôle retiré.");await load();}
  catch(e){setError(e instanceof Error?e.message:"Retrait impossible.");}
 }
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">ADMINISTRATION DU GARAGE UNIQUE</div><h1 className="page-title">Équipe et permissions</h1>
  <p className="muted">Attribuez les rôles aux comptes existants. Un même membre peut recevoir plusieurs fonctions ; l’accès est vérifié côté serveur et limité au garage KIA PIÈCE.</p>
  {error&&<p className="notice error" role="alert">{error}</p>}{success&&<p className="notice" role="status">{success}</p>}
  <section className="auth-card" style={{maxWidth:700,margin:"20px 0"}}>
   <h2>Attribuer un rôle</h2>
   <form onSubmit={grant}>
    <div className="field"><label htmlFor="staff-email">Adresse e-mail du compte existant</label><input id="staff-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} placeholder="employe@example.com"/></div>
    <div className="field"><label htmlFor="staff-role">Fonction</label><select id="staff-role" value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
    <button className="btn btn-primary" disabled={busy}>{busy?"Enregistrement…":"Attribuer le rôle"}</button>
   </form>
  </section>
  <h2>Membres et accès</h2>
  <div className="table-wrap"><table><thead><tr><th>Nom</th><th>E-mail</th><th>Rôles attribués</th><th>Actions</th></tr></thead><tbody>
   {rows.map(member=><tr key={member.id}><td>{member.full_name}</td><td>{member.email}</td><td>{member.staff_roles.map(r=><span key={r}>{labels[r]||r}</span>)}</td><td>{member.staff_roles.map(r=><button key={r} type="button" className="btn btn-outline" onClick={()=>void revoke(member.id,r)}>Retirer {labels[r]||r}</button>)}</td></tr>)}
  </tbody></table>{loading&&<p className="muted" style={{padding:18}}>Chargement…</p>}{!loading&&!rows.length&&<p className="muted" style={{padding:18}}>Aucun compte client à affecter pour le moment.</p>}</div>
 </div></main>;
}
