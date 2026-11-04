"use client";
import {useState} from "react";
export default function ProductImageField({defaultValue=""}:{defaultValue?:string}){
 const[url,setUrl]=useState(defaultValue);
 return <div className="field"><label>URL de la photo (facultatif)</label><input name="imageUrl" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" />
 {url&&<div style={{marginTop:12,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}><img src={url} alt="Aperçu de la pièce" style={{width:130,height:100,objectFit:"contain",background:"#fff",border:"1px solid #ddd",borderRadius:10,padding:6}} onError={e=>{e.currentTarget.style.display="none";}} onLoad={e=>{e.currentTarget.style.display="block";}}/><span className="muted">Aperçu de la photo avant enregistrement</span></div>}
 </div>;
}
