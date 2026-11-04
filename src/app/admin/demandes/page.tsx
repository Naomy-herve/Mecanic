"use client";

import {useCallback,useEffect,useState} from "react";

type InquiryStatus="new"|"in_progress"|"resolved";
type Inquiry={id:string;name:string;email:string;phone:string|null;subject:string;message:string;status:InquiryStatus;created_at:string};
const labels:Record<InquiryStatus,string>={new:"Nouvelle",in_progress:"En cours",resolved:"Résolue"};

export default function AdminInquiries(){
  const[rows,setRows]=useState<Inquiry[]>([]);
  const[error,setError]=useState("");
  const[busyId,setBusyId]=useState("");
  const load=useCallback(async()=>{
    try{
      const r=await fetch("/api/admin/inquiries",{cache:"no-store"});
      const d=await r.json();
      if(r.status===403){window.location.href="/compte";return;}
      if(!r.ok)throw new Error(d.error||"Chargement impossible.");
      setRows(Array.isArray(d.inquiries)?d.inquiries:[]);
      setError("");
    }catch(e){setError(e instanceof Error?e.message:"Chargement impossible.");}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function updateStatus(item:Inquiry,status:InquiryStatus){
    setBusyId(item.id);setError("");
    try{
      const r=await fetch("/api/admin/inquiries",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status})});
      const d=await r.json();
      if(r.status===403){window.location.href="/compte";return;}
      if(!r.ok)throw new Error(d.error||"Modification impossible.");
      setRows(current=>current.map(x=>x.id===item.id?{...x,status:d.inquiry.status}:x));
    }catch(e){setError(e instanceof Error?e.message:"Modification impossible.");}
    finally{setBusyId("");}
  }

  return <main className="page-shell"><div className="container">
    <div className="section-kicker">SERVICE CLIENT</div>
    <h1 className="page-title">Demandes de contact</h1>
    <p className="muted">Suivez chaque demande de sa réception à sa résolution.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}
    {rows.length?rows.map(x=><article className="form-card" key={x.id} style={{margin:"14px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><b>{x.subject}</b><span className="badge">{labels[x.status]||x.status}</span></div>
      <p className="muted">{x.name} · {x.email} · {x.phone||"Sans téléphone"} · {new Date(x.created_at).toLocaleString("fr-FR")}</p>
      <p style={{whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7}}>{x.message}</p>
      <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
        <a className="btn btn-outline" href={"mailto:"+x.email+"?subject="+encodeURIComponent("Re: "+x.subject)}>Répondre par e-mail</a>
        {x.status==="new"&&<button className="btn btn-primary" disabled={busyId===x.id} onClick={()=>updateStatus(x,"in_progress")}>{busyId===x.id?"Enregistrement…":"Prendre en charge"}</button>}
        {x.status==="in_progress"&&<button className="btn btn-primary" disabled={busyId===x.id} onClick={()=>updateStatus(x,"resolved")}>{busyId===x.id?"Enregistrement…":"Marquer comme résolue"}</button>}
      </div>
    </article>):<p className="muted">{error?"Les demandes ne sont pas disponibles.":"Aucune demande reçue."}</p>}
  </div></main>;
}
