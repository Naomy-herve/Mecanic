"use client";
import {useState} from "react";
export default function ProductImage({src,alt,className,style}:{src:string|null;alt:string;className?:string;style?:React.CSSProperties}){
 const[failed,setFailed]=useState(false);
 if(!src||failed)return <div className={className} style={{display:"grid",placeItems:"center",background:"linear-gradient(145deg,#171b22,#252c36)",color:"#aeb8c5",...style}} role="img" aria-label={alt}><span aria-hidden="true" style={{fontSize:38}}>⚙</span><span style={{fontSize:11,marginTop:6}}>Photo à venir</span></div>;
 return <div className={className} style={{overflow:"hidden",...style}}><img src={src} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(true)} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>;
}
