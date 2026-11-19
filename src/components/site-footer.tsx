"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const copy = {
  fr: { tagline: "Identifier. Vérifier. Confirmer.", explore: "EXPLORER", catalogue: "Catalogue", vehicle: "Recherche par véhicule", compare: "Comparateur", contact: "CONTACT", account: "Mon compte", note: "Les informations de disponibilité sont confirmées avant commande.", phone: "038 56 235 28" },
  en: { tagline: "Identify. Verify. Confirm.", explore: "EXPLORE", catalogue: "Catalogue", vehicle: "Search by vehicle", compare: "Reference comparison", contact: "CONTACT", account: "My account", note: "Availability is confirmed before an order is placed.", phone: "+261 38 56 235 28" },
  it: { tagline: "Identificare. Verificare. Confermare.", explore: "ESPLORA", catalogue: "Catalogo", vehicle: "Ricerca per veicolo", compare: "Confronto codici", contact: "CONTATTI", account: "Il mio account", note: "La disponibilità viene confermata prima dell'ordine.", phone: "+261 38 56 235 28" },
} as const;

export function SiteFooter() {
  const pathname = usePathname() || "/";
  const locale = pathname.startsWith("/en") ? "en" : pathname.startsWith("/it") ? "it" : "fr";
  const t = copy[locale];
  const home = locale === "fr" ? "/" : "/" + locale;
  return (
    <footer className="story-footer">
      <div className="story-container story-footer-main">
        <div className="story-footer-brand">
          <Link className="brand footer-brand" href={home}><img className="brand-logo footer-logo" src="/images/kia-hyundai-mark.svg" alt="KIA K5 et Hyundai Sonata" width="142" height="80" /></Link>
          <p>{t.tagline}</p>
        </div>
        <nav aria-label={t.explore}>
          <span>{t.explore}</span><Link href="/catalogue">{t.catalogue}</Link><Link href="/reference/recherche-vehicule">{t.vehicle}</Link><Link href="/reference/comparateur-references">{t.compare}</Link>
        </nav>
        <nav aria-label={t.contact}>
          <span>{t.contact}</span><Link href="/compte">{t.account}</Link><a href="tel:+261385623528">{t.phone}</a><a href="https://wa.me/261385623528" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        </nav>
      </div>
      <div className="story-container story-footer-bottom">
        <span>© {new Date().getFullYear()} KIA PIÈCE</span><span>{t.note}</span>
        <nav aria-label="Language / Lingua / Langue"><Link href="/">FR</Link> · <Link href="/en">EN</Link> · <Link href="/it">IT</Link></nav>
      </div>
    </footer>
  );
}
