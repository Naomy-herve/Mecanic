"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const labels = {
  fr: { catalogue: "Catalogue", method: "Méthode", contact: "Contact", account: "Mon compte", cart: "Panier", menu: "Menu", openMenu: "Ouvrir le menu de navigation", nav: "Navigation principale", mobile: "Navigation mobile", brand: "SPÉCIALISTE PIÈCES KIA" },
  en: { catalogue: "Catalogue", method: "Our process", contact: "Contact", account: "My account", cart: "Cart", menu: "Menu", openMenu: "Open navigation menu", nav: "Main navigation", mobile: "Mobile navigation", brand: "KIA PARTS SPECIALIST" },
  it: { catalogue: "Catalogo", method: "Il percorso", contact: "Contatti", account: "Il mio account", cart: "Carrello", menu: "Menu", openMenu: "Apri il menu di navigazione", nav: "Navigazione principale", mobile: "Navigazione mobile", brand: "SPECIALISTA RICAMBI KIA" },
} as const;

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/it") ? "it" : "fr";
  const t = labels[locale];
  const home = locale === "fr" ? "/" : "/" + locale;
  const navigation = (
    <>
      <Link href="/catalogue">{t.catalogue}</Link>
      <Link href={home + "#compatibilite"}>{t.method}</Link>
      <Link href={home + "#contact"}>{t.contact}</Link>
      <Link href="/compte">{t.account}</Link>
    </>
  );

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href={home} aria-label="KIA PIÈCE — Home">
          <img className="brand-logo" src="/images/kia-hyundai-mark.svg" alt="Logo Kia K5 et Hyundai Sonata" width="64" height="64" />
          <span className="brand-copy"><strong className="brand-name">Kia pièce</strong><span className="brand-slogan">{locale === "en" ? "Boost your car with the right parts" : locale === "it" ? "Dai slancio alla tua auto con i ricambi giusti" : "Boostez votre voiture avec les bonnes pièces"}</span></span>
        </Link>
        <nav className="main-nav" aria-label={t.nav}>{navigation}</nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Link className="cart-link" href="/panier">{t.cart} ↗</Link>
          <a className="btn btn-primary" href="https://wa.me/261385623528" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        </div>
        <nav className="header-languages" aria-label="Language / Lingua / Langue">
          <Link href="/">FR</Link><Link href="/en">EN</Link><Link href="/it">IT</Link>
        </nav>
        <details className="mobile-menu">
          <summary aria-label={t.openMenu}>{t.menu}</summary>
          <nav aria-label={t.mobile}>{navigation}</nav>
          <div className="mobile-language-links"><Link href="/">FR</Link><Link href="/en">EN</Link><Link href="/it">IT</Link></div>
        </details>
      </div>
    </header>
  );
}
