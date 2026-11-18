"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductImage from "@/components/product-image";

type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
  stock_quantity: number;
  available_quantity: number;
  image_url: string | null;
  category_name: string | null;
  condition: string;
};

const whatsapp = "https://wa.me/261385623528?text=" + encodeURIComponent(
  "Bonjour KIA PIÈCE, je souhaite vérifier une pièce pour mon véhicule Kia."
);

const steps = [
  { n: "01", title: "Identifier le véhicule", copy: "Modèle, année et motorisation : la recherche commence par les bonnes informations." },
  { n: "02", title: "Retrouver la pièce", copy: "Parcourez le catalogue ou transmettez une référence à notre équipe." },
  { n: "03", title: "Vérifier les détails", copy: "Référence, compatibilité, prix et disponibilité sont à confirmer avant commande." },
  { n: "04", title: "Confirmer la demande", copy: "Échangez directement avec l’équipe pour connaître les prochaines étapes." },
];

function formatPrice(value: string | number, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Prix à confirmer";
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "MGA", maximumFractionDigits: 0 }).format(amount);
  } catch {
    return amount.toLocaleString("fr-FR") + " " + currency;
  }
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"story-reveal " + className}>{children}</div>;
}

export default function HomeStory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Catalogue indisponible");
        return response.json();
      })
      .then((data) => {
        if (active) setProducts(Array.isArray(data.products) ? data.products.slice(0, 4) : []);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll(".story-reveal");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="story-home">
      <section className="story-hero" aria-labelledby="story-title">
        <div className="story-hero-grid" aria-hidden="true" />
        <div className="story-container story-hero-inner">
          <div className="story-hero-copy">
            <p className="story-eyebrow story-reveal">KIA PIÈCE <span>—</span> PIÈCES AUTOMOBILES</p>
            <h1 id="story-title" className="story-title">
              <span className="story-title-line">La bonne pièce.</span>
              <span className="story-title-line story-title-accent">Le bon mouvement.</span>
            </h1>
            <p className="story-hero-description story-reveal">
              Identifiez votre Kia. Retrouvez la pièce recherchée. Vérifiez les informations avant de confirmer votre demande.
            </p>
            <div className="story-actions story-reveal">
              <Link className="story-button story-button-light" href="/catalogue">Explorer le catalogue <span aria-hidden="true">↗</span></Link>
              <a className="story-button story-button-outline" href={whatsapp} target="_blank" rel="noopener noreferrer">Contacter l’équipe</a>
            </div>
            <nav className="story-language-switch story-reveal" aria-label="Langue"><Link href="/" aria-current="page">FR</Link><Link href="/en">EN</Link><Link href="/it">IT</Link></nav>
          </div>
          <div className="story-hero-art story-reveal" aria-hidden="true">
            <div className="story-art-index">K / 01</div>
            <div className="story-art-ring story-art-ring-one" />
            <div className="story-art-ring story-art-ring-two" />
            <svg className="story-car-drawing" viewBox="0 0 620 300" fill="none">
              <path d="M72 190L104 130C115 108 134 94 160 88L240 70C268 64 295 63 323 70L408 94C432 101 450 117 463 139L500 190L532 201V236H55V207L72 190Z" fill="url(#carPaint)" stroke="#D9E0E2" strokeWidth="2"/>
              <path d="M157 111L246 91C270 86 292 86 315 92L393 113L424 158H130L157 111Z" fill="#1A2A32" stroke="#AEBBC0" strokeWidth="2"/>
              <path d="M267 91V157M116 160H455" stroke="#8D9BA0" strokeWidth="2"/>
              <path d="M72 190H532" stroke="#F25B72" strokeWidth="5"/>
              <path d="M84 191H129M464 191H515" stroke="#F8D9DE" strokeWidth="7" strokeLinecap="round"/>
              <circle cx="157" cy="231" r="38" fill="#11191D" stroke="#8B9699" strokeWidth="8"/>
              <circle cx="157" cy="231" r="13" fill="#B8C1C2"/>
              <circle cx="430" cy="231" r="38" fill="#11191D" stroke="#8B9699" strokeWidth="8"/>
              <circle cx="430" cy="231" r="13" fill="#B8C1C2"/>
              <defs><linearGradient id="carPaint" x1="150" y1="65" x2="430" y2="245" gradientUnits="userSpaceOnUse"><stop stopColor="#AAB7B9"/><stop offset=".5" stopColor="#53656B"/><stop offset="1" stopColor="#26343A"/></linearGradient></defs>
            </svg>
            <div className="story-art-caption"><span>IDENTIFIER</span><span>VÉRIFIER</span><span>CONFIRMER</span></div>
          </div>
        </div>
        <a className="story-scroll" href="#manifeste"><span /> DÉFILER POUR DÉCOUVRIR</a>
        <span className="story-hero-count">01 — 07</span>
      </section>

      <section className="story-manifesto story-section" id="manifeste">
        <div className="story-container story-manifesto-grid">
          <Reveal className="story-manifesto-mark">
            <div className="story-monogram" aria-hidden="true">K.</div>
            <p>KIA PIÈCE <span>·</span> NOTRE APPROCHE</p>
          </Reveal>
          <Reveal className="story-manifesto-copy">
            <p className="story-kicker">UNE EXIGENCE / 01</p>
            <h2>La précision avant <em>la promesse.</em></h2>
            <p>KIA PIÈCE est une plateforme dédiée à la recherche et à la gestion de pièces automobiles Kia. Elle rassemble le catalogue, les informations de compatibilité et les échanges nécessaires pour préparer une demande.</p>
            <p>Chaque référence, son prix et sa disponibilité dépendent des informations enregistrées et vérifiées par l’administration. Si un détail manque, il doit être confirmé avant toute commande.</p>
            <blockquote>« Une pièce adaptée commence par une identification sérieuse. »</blockquote>
            <p className="story-founder-note">Présentation du responsable : <strong>[À COMPLÉTER — nom, rôle et portrait]</strong></p>
          </Reveal>
        </div>
      </section>

      <section className="story-method story-section" id="compatibilite">
        <div className="story-container">
          <div className="story-section-heading story-reveal">
            <div><p className="story-kicker">LE PARCOURS / 02</p><h2>Quatre étapes.<br/><em>Une demande claire.</em></h2></div>
            <p>Un chemin simple pour réduire les erreurs d’identification et préparer une vérification utile.</p>
          </div>
          <div className="story-steps">
            {steps.map((step) => (
              <article className="story-step story-reveal" key={step.n}>
                <span className="story-step-number">{step.n}</span>
                <div className="story-step-art" aria-hidden="true"><span>{step.n}</span><i /></div>
                <h3>{step.title}</h3><p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-pathways story-section">
        <div className="story-container">
          <div className="story-section-heading story-reveal">
            <div><p className="story-kicker">LES ESPACES / 03</p><h2>Le bon accès.<br/><em>Sans détour.</em></h2></div>
            <p>Chaque espace a une fonction précise. Les données commerciales restent pilotées par l’administration.</p>
          </div>
          <div className="story-pathways-grid">
            <Link className="story-pathway story-reveal" href="/catalogue"><span>01 / CATALOGUE</span><strong>Les pièces enregistrées</strong><p>Parcourez les références réellement publiées.</p><b>Explorer ↗</b></Link>
            <Link className="story-pathway story-reveal" href="/reference/recherche-vehicule"><span>02 / VÉHICULE</span><strong>Identifier votre Kia</strong><p>Orientez la recherche par modèle, année et motorisation.</p><b>Identifier ↗</b></Link>
            <Link className="story-pathway story-reveal" href="/reference/comparateur-references"><span>03 / RÉFÉRENCES</span><strong>Comparer les références</strong><p>Consultez uniquement les équivalences validées.</p><b>Comparer ↗</b></Link>
            <Link className="story-pathway story-reveal" href="/compte"><span>04 / ESPACE CLIENT</span><strong>Suivre vos demandes</strong><p>Retrouvez votre espace personnel et vos démarches.</p><b>Accéder ↗</b></Link>
          </div>
        </div>
      </section>

      <section className="story-catalogue story-section" id="catalogue">
        <div className="story-container">
          <div className="story-section-heading story-reveal">
            <div><p className="story-kicker">SÉLECTION / 04</p><h2>Le catalogue<br/><em>en temps réel.</em></h2></div>
            <Link className="story-inline-link" href="/catalogue">Voir toutes les pièces ↗</Link>
          </div>
          {loading && <p className="story-status" role="status">Chargement des références…</p>}
          {error && <p className="story-status" role="alert">Le catalogue est momentanément indisponible. Contactez l’équipe pour vérifier une référence.</p>}
          {!loading && !error && products.length > 0 && (
            <div className="story-products">
              {products.map((product) => (
                <article className="story-product" key={product.id}>
                  <Link className="story-product-image" href={"/produit/" + product.slug}>
                    <ProductImage src={product.image_url} alt={product.name} className="story-product-photo" />
                  </Link>
                  <div className="story-product-info">
                    <span>{product.category_name || "Pièce automobile"}</span>
                    <h3><Link href={"/produit/" + product.slug}>{product.name}</Link></h3>
                    <p>Réf. {product.sku}</p>
                    <div className="story-product-bottom"><strong>{formatPrice(product.price, product.currency)}</strong><small>{product.available_quantity > 0 ? "Quantité indiquée : " + product.available_quantity : "Disponibilité à confirmer"}</small></div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && products.length === 0 && (
            <div className="story-empty">
              <span className="story-kicker">CATALOGUE EN PRÉPARATION</span>
              <h3>Les références seront publiées après vérification.</h3>
              <p>Aucune pièce réelle n’est actuellement publiée. Les références, les prix et les quantités sont ajoutés par l’administration : rien n’est inventé pour remplir le catalogue.</p>
              <a className="story-button story-button-dark" href={whatsapp} target="_blank" rel="noopener noreferrer">Demander une pièce ↗</a>
            </div>
          )}
          <div className="story-more"><span/> <Link href="/catalogue">Et bien d’autres références dans le catalogue ↗</Link> <span/></div>
        </div>
      </section>

      <section className="story-history story-section">
        <div className="story-container story-history-grid">
          <div className="story-reveal"><p className="story-kicker">REPÈRES / 05</p><h2>Une histoire<br/><em>à documenter.</em></h2></div>
          <div className="story-reveal"><p>Les dates, réalisations, clients et distinctions ne seront publiés qu’après validation par le propriétaire.</p><p className="story-placeholder">[À COMPLÉTER — étapes réelles de l’activité et justificatifs éventuels]</p></div>
        </div>
      </section>

      <section className="story-contact story-section" id="contact">
        <div className="story-container story-contact-inner">
          <p className="story-kicker story-reveal">LA SUITE / 06</p>
          <h2 className="story-reveal">Une pièce à trouver.<br/><em>Une équipe à contacter.</em></h2>
          <p className="story-contact-copy story-reveal">Précisez le modèle de votre Kia et la pièce recherchée. Nous pourrons vous aider à vérifier les informations disponibles.</p>
          <div className="story-actions story-reveal"><a className="story-button story-button-light" href={whatsapp} target="_blank" rel="noopener noreferrer">Écrire sur WhatsApp ↗</a><a className="story-contact-phone" href="tel:+261385623528">038 56 235 28</a></div>
        </div>
      </section>
    </main>
  );
}
