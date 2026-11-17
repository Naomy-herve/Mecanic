import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="story-footer">
      <div className="story-container story-footer-main">
        <div className="story-footer-brand">
          <Link className="brand footer-brand" href="/">
            <span className="brand-mark">K</span>
            <span>KIA <b>PIÈCE</b><small>SPÉCIALISTE PIÈCES KIA</small></span>
          </Link>
          <p>Identifier. Vérifier. Confirmer.</p>
        </div>

        <nav aria-label="Liens de la boutique">
          <span>EXPLORER</span>
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/reference/recherche-vehicule">Recherche par véhicule</Link>
          <Link href="/reference/comparateur-references">Comparateur</Link>
        </nav>

        <nav aria-label="Contact et espace client">
          <span>CONTACT</span>
          <Link href="/compte">Mon compte</Link>
          <a href="tel:+261385623528">038 56 235 28</a>
          <a href="https://wa.me/261385623528" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        </nav>
      </div>

      <div className="story-container story-footer-bottom">
        <span>© {new Date().getFullYear()} KIA PIÈCE</span>
        <span>Les informations de disponibilité sont confirmées avant commande.</span>
      </div>
    </footer>
  );
}
