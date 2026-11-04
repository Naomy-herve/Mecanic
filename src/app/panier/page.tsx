"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {readCart,writeCart,type CartItem} from "@/lib/cart";

const money=(amount:number,currency:string)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency}).format(amount);

export default function Cart() {
  const [items,setItems]=useState<CartItem[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState("");

  useEffect(()=>{
    setItems(readCart());
    const refresh=()=>setItems(readCart());
    window.addEventListener("kia-cart-update",refresh);
    window.addEventListener("storage",refresh);
    return ()=>{
      window.removeEventListener("kia-cart-update",refresh);
      window.removeEventListener("storage",refresh);
    };
  },[]);

  function save(next:CartItem[]) {
    try {
      writeCart(next);
      setItems(next);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error?reason.message:"Impossible d'enregistrer le panier.");
    }
  }

  const total=useMemo(()=>items.reduce((n,x)=>n+x.price*x.quantity,0),[items]);
  const mixedCurrency=items.some(x=>x.currency!==items[0]?.currency);

  async function order(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f=new FormData(e.currentTarget);
    const address={line1:f.get("line1"),city:f.get("city"),postalCode:f.get("postalCode"),country:f.get("country")};
    const payload={items:items.map(x=>({productId:x.id,quantity:x.quantity})),customerName:f.get("customerName"),customerEmail:f.get("customerEmail"),customerPhone:f.get("customerPhone"),shippingAddress:address,notes:f.get("notes")};
    try {
      const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Commande impossible.");
      setDone("Commande "+d.order.order_number+" enregistrée. Total calculé côté serveur : "+Number(d.order.total).toLocaleString("fr-FR")+" "+d.order.currency+". Notre équipe vous contactera pour confirmer les modalités de paiement et de livraison.");
      save([]);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"Commande impossible.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="page-shell"><div className="container">
    <div className="section-kicker">VOTRE SÉLECTION</div><h1 className="page-title">Mon panier</h1>
    {done&&<p className="notice" role="status">{done}</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    {items.length===0?<div className="empty-state"><h3>Votre panier est vide</h3><p>Explorez le catalogue pour ajouter les pièces adaptées à votre Kia.</p><Link className="btn btn-primary" href="/catalogue">Voir le catalogue</Link></div>:
    <div className="contact-grid" style={{marginTop:25}}>
      <section><h2>Articles sélectionnés</h2>
        {items.map(x=><div className="cart-row" key={x.id}>
          <div><b>{x.name}</b><p className="muted">Réf. {x.sku}</p><span className="price">{money(x.price*x.quantity,x.currency)}</span></div>
          <div className="quantity">
            <button type="button" aria-label={"Diminuer la quantité de "+x.name} onClick={()=>save(items.map(i=>i.id===x.id?{...i,quantity:Math.max(1,i.quantity-1)}:i))}>−</button>
            <span aria-live="polite">{x.quantity}</span>
            <button type="button" aria-label={"Augmenter la quantité de "+x.name} disabled={x.quantity>=20} onClick={()=>save(items.map(i=>i.id===x.id?{...i,quantity:Math.min(20,i.quantity+1)}:i))}>+</button>
          </div>
          <button type="button" className="btn btn-outline" onClick={()=>save(items.filter(i=>i.id!==x.id))}>Retirer</button>
        </div>)}
        <h3 style={{textAlign:"right"}}>Total estimé : <span className="price">{mixedCurrency?"Devises différentes":money(total,items[0]?.currency||"MGA")}</span></h3>
        {mixedCurrency&&<p className="notice error" role="alert">Votre panier contient plusieurs devises. Retirez les articles dans une autre devise avant de commander.</p>}
        <p className="muted">Les frais de livraison et les modalités de paiement seront confirmés par notre équipe.</p>
      </section>
      <form className="form-card" onSubmit={order}>
        <h2>Informations de commande</h2>
        <div className="field"><label htmlFor="customerName">Nom complet</label><input id="customerName" name="customerName" required minLength={2}/></div>
        <div className="field"><label htmlFor="customerEmail">E-mail</label><input id="customerEmail" name="customerEmail" type="email" required/></div>
        <div className="field"><label htmlFor="customerPhone">Téléphone</label><input id="customerPhone" name="customerPhone" required minLength={5}/></div>
        <div className="field"><label htmlFor="line1">Adresse</label><input id="line1" name="line1" required minLength={4} placeholder="Rue et numéro"/></div>
        <div className="form-grid"><div className="field"><label htmlFor="city">Ville</label><input id="city" name="city" required minLength={2}/></div><div className="field"><label htmlFor="postalCode">Code postal</label><input id="postalCode" name="postalCode"/></div></div>
        <div className="field"><label htmlFor="country">Pays</label><input id="country" name="country" required minLength={2}/></div>
        <div className="field"><label htmlFor="notes">Note (facultatif)</label><textarea id="notes" name="notes"/></div>
        <button className="btn btn-primary" disabled={busy||mixedCurrency} style={{width:"100%"}}>{busy?"Enregistrement…":mixedCurrency?"Harmoniser les devises":"Envoyer ma commande"}</button>
      </form>
    </div>}
  </div></main>;
}
