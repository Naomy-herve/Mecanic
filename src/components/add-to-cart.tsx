"use client";

import { readCart, writeCart } from "@/lib/cart";

export function AddToCart({product,disabled=false}:{product:{id:string;sku:string;name:string;price:number;currency:string};disabled?:boolean}) {
  function add() {
    if (disabled) return;
    try {
      const cart = readCart();
      const existing = cart.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= 20) {
          window.alert("La quantité maximale pour cette pièce est de 20.");
          return;
        }
        existing.quantity += 1;
      } else {
        if (cart.length >= 30) {
          window.alert("Votre panier contient déjà 30 références différentes.");
          return;
        }
        if (!["MGA", "EUR", "USD"].includes(product.currency) || !Number.isFinite(product.price) || product.price < 0) {
          window.alert("Les informations de prix de cette pièce doivent être vérifiées.");
          return;
        }
        cart.push({...product, currency: product.currency as "MGA" | "EUR" | "USD", quantity: 1});
      }
      writeCart(cart);
      window.alert("Pièce ajoutée au panier.");
    } catch {
      window.alert("Impossible d'enregistrer le panier sur cet appareil.");
    }
  }

  return <button className="btn btn-primary" onClick={add} disabled={disabled} style={{opacity:disabled?0.5:1,cursor:disabled?"not-allowed":"pointer"}}>{disabled?"Disponibilité à confirmer":"Ajouter au panier +"}</button>;
}
