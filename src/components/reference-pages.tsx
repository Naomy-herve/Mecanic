"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string | number;
  currency: string;
  stock_quantity: number;
  condition?: string | null;
  image_url?: string | null;
  category_name: string | null;
};

function ContactButton({label="Demander cette pièce", reference=""}:{label?:string;reference?:string}) {
  const message = reference
    ? "Bonjour KIA PIÈCE, je souhaite des informations sur la référence " + reference + ". Merci de confirmer le prix et la disponibilité."
    : "Bonjour KIA PIÈCE, je souhaite obtenir des informations sur une pièce. Merci.";
  return <a className="ref-cta" href={"https://wa.me/261385623528?text="+encodeURIComponent(message)} target="_blank" rel="noopener noreferrer">{label} ↗</a>;
}

export function ReferencePage({slug}:{slug:string}) {
  const page=pages.find(p=>p.slug===slug);
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState("");
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("Toutes");
  const [vehicle,setVehicle]=useState("");
  const [year,setYear]=useState("");
  const [engine,setEngine]=useState("");
  const [selected,setSelected]=useState<Product|null>(null);
  const [equivalents,setEquivalents]=useState<Equivalent[]>([]);
  const [equivalentsLoading,setEquivalentsLoading]=useState(false);
  const [equivalentsError,setEquivalentsError]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    let active=true;
    (async()=>{
      try {
        const response=await fetch("/api/products",{cache:"no-store"});
        const data=await response.json();
        if(!response.ok) throw new Error(data.error||"Catalogue indisponible.");
        if(active) setProducts(Array.isArray(data.products)?data.products:[]);
      } catch(error) {
        if(active) setLoadError(error instanceof Error?error.message:"Catalogue indisponible.");
      } finally {
        if(active) setLoading(false);
      }
    })();
    return ()=>{active=false;};
  },[]);

  useEffect(()=>{
    let active=true;
    if(!selected){setEquivalents([]);setEquivalentsError("");return;}
    setEquivalentsLoading(true);
    setEquivalentsError("");
    fetch("/api/products/"+encodeURIComponent(selected.slug)+"/equivalents",{cache:"no-store"})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Équivalences indisponibles.");return data;})
      .then(data=>{if(active)setEquivalents(Array.isArray(data.equivalents)?data.equivalents:[]);})
      .catch(error=>{if(active)setEquivalentsError(error instanceof Error?error.message:"Équivalences indisponibles.");})
      .finally(()=>{if(active)setEquivalentsLoading(false);});
    return ()=>{active=false;};
  },[selected]);

  const categories=useMemo(()=>["Toutes",...Array.from(new Set(products.map(p=>p.category_name).filter((x):x is string=>Boolean(x)))).sort((a,b)=>a.localeCompare(b,"fr"))],[products]);
  const filtered=useMemo(()=>products.filter(p=>
    (category==="Toutes"||p.category_name===category) &&
    (p.name+" "+p.sku+" "+(p.description||"")).toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"))
  ),[products,search,category]);
  const currency=(p:Product)=>Number(p.price).toLocaleString("fr-FR")+" "+p.currency;
  const productCards=<>
    <div className="ref-toolbar">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nom, référence ou mot-clé…" aria-label="Rechercher une pièce"/>
      <select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Filtrer par catégorie">{categories.map(c=><option key={c}>{c}</option>)}</select>
    </div>
    {loading&&<p className="ref-notice" role="status">Chargement du catalogue réel…</p>}
    {loadError&&<p className="ref-notice" role="alert">{loadError}</p>}
    {!loading&&!loadError&&!filtered.length&&<div className="ref-notice">Aucune pièce enregistrée ne correspond à cette recherche. Vous pouvez nous demander une référence.</div>}
    <div className="ref-products">
      {filtered.map((p,i)=><article className="ref-product" key={p.id}>
        <div className="ref-product-art">
          {p.image_url?<img src={p.image_url} alt={p.name} loading="lazy" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<span>{["⚙","◉","▤","◇","⌁","ϟ"][i%6]}</span>}
          <small>{p.category_name||"Pièce Kia"}</small>
        </div>
        <div className="ref-product-body">
          <small>RÉF. {p.sku}</small>
          <h3>{p.name}</h3>
          <p>{p.stock_quantity>0?"Stock indiqué : "+p.stock_quantity:"Disponibilité à confirmer"} · {currency(p)}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <Link href={"/produit/"+p.slug}>Détails ↗</Link>
            <button type="button" onClick={()=>{setSelected(p);setNotice("Référence "+p.sku+" sélectionnée.");}}>Sélectionner</button>
          </div>
        </div>
      </article>)}
    </div>
    {notice&&<p className="ref-notice" role="status">{notice}</p>}
  </>;

  const adminTable=<div className="ref-table-wrap">
    <table><thead><tr><th>Référence</th><th>Pièce</th><th>Catégorie</th><th>Stock</th><th>Prix</th><th>Action</th></tr></thead>
      <tbody>{products.map(p=><tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{p.category_name||"—"}</td><td>{p.stock_quantity}</td><td>{currency(p)}</td><td><Link href="/admin/produits">Gérer</Link></td></tr>)}</tbody>
    </table>
    {!loading&&!products.length&&<p className="ref-notice">Aucune pièce réelle enregistrée. Ajoutez vos références depuis l’administration.</p>}
  </div>;

  if(!page) return <main className="ref-page"><div className="ref-container"><h1>Page introuvable</h1><Link href="/reference/accueil-premium">Retour aux pages de démonstration</Link></div></main>;

  return <main className={"ref-page ref-"+page.style}>
    <div className="ref-container">
      <div className="ref-breadcrumb"><Link href="/">KIA PIÈCE</Link><span>/</span><span>Pages de référence</span><span>/</span><b>{page.title}</b></div>
      <div className="ref-heading"><div><div className="ref-eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.desc}</p></div><div className="ref-page-number">{page.n}<small>/ 13</small></div></div>

      {page.kind==="home"||page.kind==="premium" ? <>
        <section className="ref-hero-art"><div><span className="ref-eyebrow">PIÈCES AUTOMOBILES KIA</span><h2>La précision<br/><em>dans chaque pièce.</em></h2><p>Identifiez votre véhicule, explorez les familles de pièces et contactez notre équipe pour confirmer la disponibilité.</p><div className="ref-actions"><Link className="ref-cta" href="/reference/catalogue-pieces">Explorer le catalogue ↗</Link><ContactButton label="Contacter l’équipe"/></div></div><div className="ref-car-shape"><div className="ref-car-line"/><span>KIA</span></div></section>
        <div className="ref-categories">{categories.slice(1).map((c,i)=><Link key={c} href="/reference/catalogue-pieces"><b>{String(i+1).padStart(2,"0")}</b><span>{c}</span><i>↗</i></Link>)}</div>
        <section className="ref-panel"><div className="ref-panel-head"><div><div className="ref-eyebrow">SÉLECTION DU CATALOGUE</div><h2>Quelques références disponibles</h2></div><Link href="/reference/catalogue-pieces">Voir le catalogue complet ↗</Link></div>{productCards}</section>
      </> :
      page.kind==="vehicle" ? <section className="ref-panel ref-vehicle-panel"><div className="ref-eyebrow">TROUVER LES PIÈCES ADAPTÉES</div><h2>Quel est votre véhicule ?</h2><div className="ref-form-grid">
        <label>Modèle Kia<input value={vehicle} onChange={e=>setVehicle(e.target.value)} placeholder="Ex. Sportage" required/></label>
        <label>Année<input type="number" min="1980" max="2035" value={year} onChange={e=>setYear(e.target.value)} placeholder="Ex. 2020"/></label>
        <label>Motorisation<input value={engine} onChange={e=>setEngine(e.target.value)} placeholder="Motorisation (facultatif)"/></label>
      </div>
      <button className="ref-cta" onClick={()=>{if(!vehicle.trim()){setNotice("Saisissez le modèle de votre Kia.");return;}const params=new URLSearchParams({model:vehicle.trim()});if(year)params.set("year",year);window.location.href="/catalogue?"+params.toString();}}>Afficher les pièces compatibles ↗</button>
      <p className="ref-notice">La sélection du véhicule ne certifie pas à elle seule la compatibilité. Demandez confirmation avant achat.</p>
      {notice&&<p className="ref-notice" role="status">{notice}</p>}<ContactButton label="Confirmer la compatibilité"/></section> :
      page.kind==="reference" ? <section className="ref-panel ref-reference-panel"><div className="ref-search-icon">⌕</div><h2>Rechercher une référence constructeur</h2><p>Entrez le numéro figurant sur votre ancienne pièce ou votre documentation.</p>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Saisir une référence constructeur"/>
        {productCards}
      </section> :
      page.kind==="compare" ? <section className="ref-panel"><div className="ref-compare-grid">
        <div><span className="ref-eyebrow">RÉFÉRENCE D’ORIGINE</span><h2>Pièce sélectionnée</h2><div className="ref-compare-art">◈</div><b>{selected?.sku||"Choisissez une pièce ci-dessous"}</b><p>{selected?.name||"Aucune référence sélectionnée."}</p></div>
        <div><span className="ref-eyebrow">ÉQUIVALENCES VALIDÉES</span><h2>Alternatives enregistrées</h2>
          {!selected&&<p>Sélectionnez une pièce pour consulter ses équivalences validées.</p>}
          {equivalentsLoading&&<p role="status">Recherche des équivalences…</p>}
          {equivalentsError&&<p role="alert">{equivalentsError}</p>}
          {selected&&!equivalentsLoading&&!equivalentsError&&!equivalents.length&&<p>Aucune équivalence validée n’est enregistrée pour cette référence.</p>}
          {equivalents.map(item=><article className="ref-product" key={item.id}><div className="ref-product-body"><small>RÉF. {item.sku}</small><h3>{item.name}</h3><p>{item.notes||"Équivalence validée par l’administration."}</p><p>{currency(item)} · {item.stock_quantity>0?"Stock indiqué : "+item.stock_quantity:"Disponibilité à confirmer"}</p><Link href={"/produit/"+item.slug}>Voir la pièce ↗</Link></div></article>)}
        </div>
      </div>
      {productCards}<ContactButton label="Faire vérifier la compatibilité" reference={selected?.sku||""}/></section> :
      page.style==="admin" ? <>
        <div className="ref-metrics">{["Pièces enregistrées","Références affichées","Catégories","Stock faible"].map((x,i)=><div key={x}><small>{x}</small><strong>{i===0||i===1?products.length:i===2?categories.length-1:"À vérifier"}</strong><span>{["Catalogue réel","Données actives","Familles renseignées","Seuil administrateur"][i]}</span></div>)}</div>
        <section className="ref-panel"><div className="ref-panel-head"><div><div className="ref-eyebrow">GESTION</div><h2>{page.kind==="inventory"?"Inventaire des pièces":page.kind==="reports"?"Rapports et activité":page.kind==="stats"?"Indicateurs de la boutique":"Dernières références"}</h2></div><Link href="/admin">Ouvrir l’administration complète ↗</Link></div>{adminTable}</section>
      </> :
      <section className="ref-panel"><div className="ref-panel-head"><div><div className="ref-eyebrow">{page.kind==="responsive"?"MOBILE · TABLETTE · DESKTOP":"SÉLECTION DE PIÈCES"}</div><h2>{page.kind==="results"?"Affinez votre sélection":"Pièces disponibles dans le catalogue"}</h2></div><span className="ref-live">● Catalogue connecté</span></div>{productCards}
        <div className="ref-selected">Référence sélectionnée : <b>{selected?.sku||"Aucune"}</b> {selected&&<ContactButton label="Demander le prix et la disponibilité" reference={selected.sku}/>}</div>
      </section>}
      <nav className="ref-page-nav" aria-label="Navigation des 13 pages">{pages.map(p=><Link className={p.slug===slug?"active":""} href={"/reference/"+p.slug} key={p.slug}><b>{p.n}</b><span>{p.title}</span></Link>)}</nav>
    </div>
  </main>;
}
