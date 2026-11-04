"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const pages = [
  { slug:"accueil-premium", n:"01", title:"Accueil premium", eyebrow:"KIA PIÈCE · LA PERFORMANCE AU QUOTIDIEN", desc:"La bonne pièce, le bon conseil, au bon moment.", style:"dark", kind:"home" },
  { slug:"catalogue-pieces", n:"02", title:"Catalogue des pièces", eyebrow:"TOUTES LES RÉFÉRENCES", desc:"Parcourez les pièces disponibles et affinez votre recherche.", style:"light", kind:"catalogue" },
  { slug:"tableau-de-bord", n:"03", title:"Tableau de bord", eyebrow:"ESPACE ADMINISTRATEUR", desc:"Pilotez votre activité depuis une vue d’ensemble.", style:"admin", kind:"dashboard" },
  { slug:"boutique-classique", n:"04", title:"Boutique classique", eyebrow:"PIÈCES & ACCESSOIRES", desc:"Une boutique claire pour trouver rapidement l’essentiel.", style:"blue", kind:"shop" },
  { slug:"catalogue-responsive", n:"05", title:"Catalogue responsive", eyebrow:"UNE EXPÉRIENCE SUR TOUS LES ÉCRANS", desc:"Retrouvez les références et filtres dans une interface adaptée au mobile.", style:"light", kind:"responsive" },
  { slug:"comparateur-references", n:"06", title:"Comparateur de références", eyebrow:"COMPARER AVANT DE CHOISIR", desc:"Comparez une référence d’origine et ses alternatives compatibles.", style:"compare", kind:"compare" },
  { slug:"statistiques-ventes", n:"07", title:"Statistiques & activité", eyebrow:"ANALYSE DE L’ACTIVITÉ", desc:"Suivez les demandes, les références et les tendances.", style:"admin", kind:"stats" },
  { slug:"gestion-inventaire", n:"08", title:"Gestion de l’inventaire", eyebrow:"ESPACE ADMINISTRATEUR", desc:"Organisez les références, catégories et niveaux de stock.", style:"admin", kind:"inventory" },
  { slug:"recherche-vehicule", n:"09", title:"Recherche par véhicule", eyebrow:"IDENTIFICATION DU VÉHICULE", desc:"Sélectionnez votre Kia pour orienter la recherche de pièces.", style:"dark", kind:"vehicle" },
  { slug:"recherche-reference", n:"10", title:"Recherche par référence", eyebrow:"RECHERCHE DIRECTE", desc:"Saisissez un numéro de pièce pour préparer votre demande.", style:"blue", kind:"reference" },
  { slug:"rapports-admin", n:"11", title:"Rapports administrateur", eyebrow:"VUE D’ENSEMBLE", desc:"Consultez les indicateurs utiles à la gestion de la boutique.", style:"admin", kind:"reports" },
  { slug:"boutique-nocturne", n:"12", title:"Boutique premium sombre", eyebrow:"KIA PIÈCE · PREMIUM", desc:"Une présentation immersive des familles de pièces.", style:"dark", kind:"premium" },
  { slug:"resultats-filtres", n:"13", title:"Résultats & filtres", eyebrow:"RÉSULTATS DU CATALOGUE", desc:"Affinez les résultats par catégorie, état et disponibilité.", style:"light", kind:"results" },
] as const;

const sample = [
  {name:"Filtre à huile Kia", ref:"26300-35505", category:"Filtration", price:"Sur demande", status:"Disponible"},
  {name:"Plaquettes de frein avant", ref:"58101-D4A00", category:"Freinage", price:"Sur demande", status:"À confirmer"},
  {name:"Filtre à air moteur", ref:"28113-L1000", category:"Filtration", price:"Sur demande", status:"Disponible"},
  {name:"Amortisseur avant", ref:"54651-G2000", category:"Suspension", price:"Sur demande", status:"À confirmer"},
  {name:"Kit courroie accessoire", ref:"25212-2B140", category:"Moteur", price:"Sur demande", status:"Disponible"},
  {name:"Rétroviseur extérieur", ref:"87610-D9000", category:"Carrosserie", price:"Sur demande", status:"Disponible"},
];

function ContactButton({label="Demander cette pièce"}:{label?:string}) {
  const msg=encodeURIComponent("Bonjour KIA PIÈCE, je souhaite obtenir des informations sur une pièce. Merci.");
  return <a className="ref-cta" href={"https://wa.me/261385623528?text="+msg} target="_blank" rel="noreferrer">{label} ↗</a>;
}

export function ReferencePage({slug}:{slug:string}) {
  const page=pages.find(p=>p.slug===slug);
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("Toutes");
  const [vehicle,setVehicle]=useState("Sportage");
  const [year,setYear]=useState("2020");
  const [selected,setSelected]=useState("26300-35505");
  const [notice,setNotice]=useState("");
  const filtered=useMemo(()=>sample.filter(p=>(category==="Toutes"||p.category===category)&&((p.name+" "+p.ref).toLowerCase().includes(search.toLowerCase()))),[search,category]);
  if(!page) return <main className="ref-page"><div className="ref-container"><h1>Page introuvable</h1><Link href="/reference/accueil-premium">Retour aux pages de démonstration</Link></div></main>;
  const categories=["Toutes","Moteur","Freinage","Filtration","Carrosserie","Suspension"];
  const catalog=<><div className="ref-toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom ou référence de pièce…"/><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="ref-products">{filtered.map((p,i)=><article className="ref-product" key={p.ref}><div className="ref-product-art"><span>{["⚙","◉","▤","◇","⌁","ϟ"][i%6]}</span><small>{p.category}</small></div><div className="ref-product-body"><small>RÉF. {p.ref}</small><h3>{p.name}</h3><p>{p.status} · Prix à confirmer</p><button onClick={()=>{setSelected(p.ref);setNotice("Référence "+p.ref+" sélectionnée. Vous pouvez contacter KIA PIÈCE.");}}>Sélectionner</button></div></article>)}</div>{notice&&<p className="ref-notice" role="status">{notice}</p>}</>;
  const adminTable=<div className="ref-table-wrap"><table><thead><tr><th>Référence</th><th>Pièce</th><th>Catégorie</th><th>Statut</th><th>Action</th></tr></thead><tbody>{sample.map(p=><tr key={p.ref}><td>{p.ref}</td><td>{p.name}</td><td>{p.category}</td><td><span className="ref-pill">{p.status}</span></td><td><button onClick={()=>setNotice("Élément "+p.ref+" prêt à être géré depuis l’administration connectée.")}>Gérer</button></td></tr>)}</tbody></table></div>;
  return <main className={"ref-page ref-"+page.style}>
    <div className="ref-container">
      <div className="ref-breadcrumb"><Link href="/">KIA PIÈCE</Link><span>/</span><span>Pages de référence</span><span>/</span><b>{page.title}</b></div>
      <div className="ref-heading"><div><div className="ref-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.desc}</p></div><div className="ref-page-number">{page.n}<small>/ 13</small></div></div>
      {page.kind==="home"||page.kind==="premium" ? <><section className="ref-hero-art"><div><span className="ref-eyebrow">PIÈCES AUTOMOBILES KIA</span><h2>La précision<br/><em>dans chaque pièce.</em></h2><p>Identifiez votre véhicule, explorez les familles de pièces et contactez notre équipe pour confirmer la disponibilité.</p><div className="ref-actions"><Link className="ref-cta" href="/reference/catalogue-pieces">Explorer le catalogue ↗</Link><ContactButton label="Contacter l’équipe"/></div></div><div className="ref-car-shape"><div className="ref-car-line"/><span>KIA</span></div></section><div className="ref-categories">{categories.slice(1).map((c,i)=><Link key={c} href="/reference/catalogue-pieces"><b>0{i+1}</b><span>{c}</span><i>↗</i></Link>)}</div></> :
      page.kind==="vehicle" ? <section className="ref-panel ref-vehicle-panel"><div className="ref-eyebrow">TROUVER LES PIÈCES ADAPTÉES</div><h2>Quel est votre véhicule ?</h2><div className="ref-form-grid"><label>Modèle<select value={vehicle} onChange={e=>setVehicle(e.target.value)}>{["Picanto","Rio","Ceed","Cerato","Sportage","Sorento","Seltos"].map(x=><option key={x}>{x}</option>)}</select></label><label>Année<select value={year} onChange={e=>setYear(e.target.value)}>{Array.from({length:20},(_,i)=>String(2026-i)).map(x=><option key={x}>{x}</option>)}</select></label><label>Motorisation<input placeholder="Ex. 1.6 CRDi"/></label><label>Immatriculation (facultatif)<input placeholder="Votre immatriculation"/></label></div><button className="ref-cta" onClick={()=>setNotice("Recherche préparée pour Kia "+vehicle+" ("+year+"). Contactez-nous pour confirmer les pièces compatibles.")}>Voir les pièces compatibles ↗</button>{notice&&<p className="ref-notice">{notice}</p>}</section> :
      page.kind==="reference" ? <section className="ref-panel ref-reference-panel"><div className="ref-search-icon">⌕</div><h2>Rechercher une référence constructeur</h2><p>Entrez le numéro figurant sur votre ancienne pièce ou votre documentation.</p><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ex. 26300-35505"/><button className="ref-cta" onClick={()=>setNotice(search.trim()?"Votre demande pour « "+search+" » est prête. Transmettez-la à notre équipe.":"Saisissez une référence pour continuer.")}>Rechercher la référence</button>{notice&&<p className="ref-notice">{notice}</p>}<ContactButton label="Envoyer la demande sur WhatsApp"/></section> :
      page.kind==="compare" ? <section className="ref-panel"><div className="ref-compare-grid"><div><span className="ref-eyebrow">RÉFÉRENCE D’ORIGINE</span><h2>Pièce constructeur</h2><div className="ref-compare-art">◈</div><b>26300-35505</b><p>Référence d’origine à confirmer selon le véhicule.</p></div><div><span className="ref-eyebrow">ALTERNATIVE</span><h2>Équivalence proposée</h2><div className="ref-compare-art alt">◇</div><b>Équivalence à vérifier</b><p>La compatibilité doit être validée avant toute commande.</p></div></div><label className="ref-check"><input type="checkbox" onChange={e=>setNotice(e.target.checked?"Comparaison enregistrée dans cette session.":"Comparaison décochée.")}/> J’ai compris que l’équivalence doit être confirmée</label>{notice&&<p className="ref-notice">{notice}</p>}<ContactButton label="Faire vérifier la compatibilité"/></section> :
      page.style==="admin" ? <><div className="ref-metrics">{["Demandes reçues","Références affichées","Catégories","À confirmer"].map((x,i)=><div key={x}><small>{x}</small><strong>{["—","—","6","—"][i]}</strong><span>{["Suivi des contacts","Catalogue actuel","Familles de pièces","Disponibilité"][i]}</span></div>)}</div><section className="ref-panel"><div className="ref-panel-head"><div><div className="ref-eyebrow">GESTION</div><h2>{page.kind==="inventory"?"Inventaire des pièces":page.kind==="reports"?"Rapports et activité":page.kind==="stats"?"Indicateurs de la boutique":"Dernières références"}</h2></div><Link href="/admin">Ouvrir l’administration complète ↗</Link></div>{adminTable}{notice&&<p className="ref-notice">{notice}</p>}</section></> :
      <><section className="ref-panel"><div className="ref-panel-head"><div><div className="ref-eyebrow">{page.kind==="responsive"?"MOBILE · TABLETTE · DESKTOP":"SÉLECTION DE PIÈCES"}</div><h2>{page.kind==="results"?"Affinez votre sélection":"Pièces disponibles dans le catalogue"}</h2></div><span className="ref-live">● Recherche interactive</span></div>{catalog}<div className="ref-selected">Référence sélectionnée : <b>{selected}</b> <ContactButton label="Demander le prix et la disponibilité"/></div></section></>}
      <nav className="ref-page-nav" aria-label="Navigation des 13 pages">{pages.map(p=><Link className={p.slug===slug?"active":""} href={"/reference/"+p.slug} key={p.slug}><b>{p.n}</b><span>{p.title}</span></Link>)}</nav>
    </div>
  </main>;
}
