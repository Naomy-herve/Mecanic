import Link from "next/link";

const navigation = (
  <>
    <Link href="/catalogue">Catalogue</Link>
    <Link href="/#compatibilite">Méthode</Link>
    <Link href="/#contact">Contact</Link>
    <Link href="/compte">Mon compte</Link>
  </>
);

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/" aria-label="KIA PIÈCE — Accueil">
          <span className="brand-mark">K</span>
          <span>
            KIA <b>PIÈCE</b>
            <small>SPÉCIALISTE PIÈCES KIA</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Navigation principale">
          {navigation}
        </nav>

        <div className="nav-actions">
          <Link className="cart-link" href="/panier">Panier ↗</Link>
          <a
            className="btn btn-primary"
            href="https://wa.me/261385623528"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp ↗
          </a>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Ouvrir le menu de navigation">Menu</summary>
          <nav aria-label="Navigation mobile">
            {navigation}
          </nav>
        </details>
      </div>
    </header>
  );
}
