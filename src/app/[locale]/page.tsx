import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Locale = "en" | "it";
const content = {
  en: {
    title: "The right part. The right move.",
    intro: "Identify your Kia, find the part you need and check the available information before confirming your request.",
    approach: "Accuracy before promises.",
    approachText: "KIA PIÈCE is a platform dedicated to finding and managing Kia automotive parts. Catalogue information, compatibility, prices and availability are based on data entered and checked by the administrator.",
    quote: "A suitable part starts with accurate vehicle identification.",
    method: "Four steps. A clearer request.",
    methodIntro: "A simple process to reduce identification errors and prepare a useful parts check.",
    steps: [["01","Identify your vehicle","Start with the model, year and engine details."],["02","Find the part","Browse the catalogue or send a part number to our team."],["03","Check the details","Compatibility, price and availability must be confirmed."],["04","Confirm your request","Contact the team to discuss the next steps."]],
    spaces: "The right place. No detours.",
    spaceIntro: "Each area has a clear purpose. Commercial data remains managed by the administrator.",
    cards: [["01 / CATALOGUE","Published parts","Browse parts that have actually been added.","Explore","/catalogue"],["02 / VEHICLE","Identify your Kia","Search by model, year and engine.","Identify","/reference/recherche-vehicule"],["03 / REFERENCES","Compare part numbers","Review validated equivalents only.","Compare","/reference/comparateur-references"],["04 / CUSTOMER AREA","Your account","Access your personal area and requests.","Open","/compte"]],
    catalogue: "Real catalogue information.",
    emptyTitle: "Parts will appear after verification.",
    emptyText: "No real parts are currently published. Part numbers, prices and quantities are managed by the administrator; nothing is invented to fill the catalogue.",
    history: "A story to be documented.",
    historyText: "Dates, achievements, customers and awards will only be published after they have been confirmed by the owner.",
    historyNote: "[TO COMPLETE — verified business milestones and supporting information]",
    contact: "Looking for a part? Talk to our team.",
    contactText: "Tell us your Kia model and the part you are looking for. We can help check the information available.",
    catalogueLink: "Explore the catalogue", contactLink: "Contact the team", ask: "Ask about a part", language: "Language"
  },
  it: {
    title: "Il ricambio giusto. La scelta giusta.",
    intro: "Identifica la tua Kia, trova il ricambio che cerchi e verifica le informazioni disponibili prima di confermare la richiesta.",
    approach: "Precisione prima delle promesse.",
    approachText: "KIA PIÈCE è una piattaforma dedicata alla ricerca e alla gestione dei ricambi auto Kia. Catalogo, compatibilità, prezzi e disponibilità si basano sui dati inseriti e verificati dall'amministratore.",
    quote: "Un ricambio adatto inizia da una corretta identificazione del veicolo.",
    method: "Quattro passaggi. Una richiesta più chiara.",
    methodIntro: "Un percorso semplice per ridurre gli errori di identificazione e preparare una verifica utile.",
    steps: [["01","Identifica il veicolo","Inizia da modello, anno e motorizzazione."],["02","Trova il ricambio","Consulta il catalogo o invia un codice al nostro team."],["03","Verifica i dettagli","Compatibilità, prezzo e disponibilità devono essere confermati."],["04","Conferma la richiesta","Contatta il team per concordare i passaggi successivi."]],
    spaces: "L'accesso giusto. Senza deviazioni.",
    spaceIntro: "Ogni area ha una funzione precisa. I dati commerciali restano gestiti dall'amministratore.",
    cards: [["01 / CATALOGO","Ricambi pubblicati","Consulta i ricambi realmente inseriti.","Esplora","/catalogue"],["02 / VEICOLO","Identifica la tua Kia","Cerca per modello, anno e motore.","Identifica","/reference/recherche-vehicule"],["03 / CODICI","Confronta i codici","Consulta solo le equivalenze convalidate.","Confronta","/reference/comparateur-references"],["04 / AREA CLIENTE","Il tuo account","Accedi alla tua area personale e alle richieste.","Accedi","/compte"]],
    catalogue: "Informazioni reali del catalogo.",
    emptyTitle: "I ricambi saranno pubblicati dopo la verifica.",
    emptyText: "Al momento non sono pubblicati ricambi reali. Codici, prezzi e quantità sono gestiti dall'amministratore; non vengono inventati dati per riempire il catalogo.",
    history: "Una storia da documentare.",
    historyText: "Date, risultati, clienti e riconoscimenti saranno pubblicati solo dopo la conferma del proprietario.",
    historyNote: "[DA COMPLETARE — tappe aziendali verificate e informazioni di supporto]",
    contact: "Cerchi un ricambio? Parla con il nostro team.",
    contactText: "Indicaci il modello della tua Kia e il ricambio che cerchi. Possiamo aiutarti a verificare le informazioni disponibili.",
    catalogueLink: "Esplora il catalogo", contactLink: "Contatta il team", ask: "Chiedi un ricambio", language: "Lingua"
  }
} as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "it" }]; }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en" && locale !== "it") return {};
  const t = content[locale];
  return {
    title: t.title,
    description: t.intro,
    alternates: { canonical: "/" + locale, languages: { fr: "/", en: "/en", it: "/it" } },
    openGraph: { type: "website", title: t.title + " | KIA PIÈCE", description: t.intro, locale: locale === "en" ? "en_GB" : "it_IT" }
  };
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "it") notFound();
  const t = content[locale as Locale];
  const whatsapp = "https://wa.me/261385623528?text=" + encodeURIComponent(locale === "en" ? "Hello KIA PIÈCE, I would like to check a part for my Kia." : "Buongiorno KIA PIÈCE, vorrei verificare un ricambio per la mia Kia.");
  return (
    <main className="story-home" lang={locale}>
      <section className="story-hero">
        <div className="story-hero-grid" aria-hidden="true" />
        <div className="story-container story-hero-inner">
          <div className="story-hero-copy">
            <p className="story-eyebrow">KIA PIÈCE — {locale === "en" ? "KIA AUTOMOTIVE PARTS" : "RICAMBI AUTO KIA"}</p>
            <h1 className="story-title"><span className="story-title-line">{t.title.split(". ")[0]}.</span><span className="story-title-line story-title-accent">{t.title.split(". ").slice(1).join(". ")}</span></h1>
            <p className="story-hero-description">{t.intro}</p>
            <div className="story-actions"><Link className="story-button story-button-light" href="/catalogue">{t.catalogueLink} ↗</Link><a className="story-button story-button-outline" href={whatsapp} target="_blank" rel="noopener noreferrer">{t.contactLink}</a></div>
            <nav className="story-language-switch" aria-label={t.language}><Link href="/">FR</Link><Link href="/en" aria-current={locale === "en" ? "page" : undefined}>EN</Link><Link href="/it" aria-current={locale === "it" ? "page" : undefined}>IT</Link></nav>
          </div>
          <div className="story-hero-art" aria-hidden="true"><div className="story-art-index">K / 01</div><div className="story-art-ring story-art-ring-one"/><div className="story-art-ring story-art-ring-two"/><svg className="story-car-drawing" viewBox="0 0 620 300" fill="none"><path d="M72 190L104 130C115 108 134 94 160 88L240 70C268 64 295 63 323 70L408 94C432 101 450 117 463 139L500 190L532 201V236H55V207L72 190Z" fill="#53656B" stroke="#D9E0E2" strokeWidth="2"/><path d="M157 111L246 91C270 86 292 86 315 92L393 113L424 158H130L157 111Z" fill="#1A2A32" stroke="#AEBBC0" strokeWidth="2"/><path d="M267 91V157M116 160H455M72 190H532" stroke="#F25B72" strokeWidth="3"/><circle cx="157" cy="231" r="38" fill="#11191D" stroke="#8B9699" strokeWidth="8"/><circle cx="430" cy="231" r="38" fill="#11191D" stroke="#8B9699" strokeWidth="8"/></svg></div>
        </div>
      </section>
      <section className="story-manifesto story-section"><div className="story-container story-manifesto-grid"><div className="story-manifesto-mark"><div className="story-monogram">K.</div><p>KIA PIÈCE · 01</p></div><div className="story-manifesto-copy"><p className="story-kicker">01 / {locale === "en" ? "OUR APPROACH" : "IL NOSTRO APPROCCIO"}</p><h2>{t.approach}</h2><p>{t.approachText}</p><blockquote>“{t.quote}”</blockquote></div></div></section>
      <section className="story-method story-section"><div className="story-container"><div className="story-section-heading"><div><p className="story-kicker">02 / {locale === "en" ? "THE PROCESS" : "IL PERCORSO"}</p><h2>{t.method}</h2></div><p>{t.methodIntro}</p></div><div className="story-steps">{t.steps.map(([n, title, text]) => <article className="story-step" key={n}><span className="story-step-number">{n}</span><div className="story-step-art"><span>{n}</span><i/></div><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="story-pathways story-section"><div className="story-container"><div className="story-section-heading"><div><p className="story-kicker">03 / {locale === "en" ? "THE PLATFORM" : "LA PIATTAFORMA"}</p><h2>{t.spaces}</h2></div><p>{t.spaceIntro}</p></div><div className="story-pathways-grid">{t.cards.map(([number,title,description,action,path]) => <Link className="story-pathway" href={path} key={number}><span>{number}</span><strong>{title}</strong><p>{description}</p><b>{action} ↗</b></Link>)}</div></div></section>
      <section className="story-catalogue story-section"><div className="story-container"><div className="story-section-heading"><div><p className="story-kicker">04 / CATALOGUE</p><h2>{t.catalogue}</h2></div><Link className="story-inline-link" href="/catalogue">{t.catalogueLink} ↗</Link></div><div className="story-empty"><span className="story-kicker">KIA PIÈCE</span><h3>{t.emptyTitle}</h3><p>{t.emptyText}</p><a className="story-button story-button-dark" href={whatsapp} target="_blank" rel="noopener noreferrer">{t.ask} ↗</a></div></div></section>
      <section className="story-history story-section"><div className="story-container story-history-grid"><div><p className="story-kicker">05 / {locale === "en" ? "BACKGROUND" : "STORIA"}</p><h2>{t.history}</h2></div><div><p>{t.historyText}</p><p className="story-placeholder">{t.historyNote}</p></div></div></section>
      <section className="story-contact story-section"><div className="story-container story-contact-inner"><p className="story-kicker">06 / CONTACT</p><h2>{t.contact}</h2><p className="story-contact-copy">{t.contactText}</p><div className="story-actions"><a className="story-button story-button-light" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><a className="story-contact-phone" href="tel:+261385623528">+261 38 56 235 28</a></div><nav className="story-language-switch" aria-label={t.language}><Link href="/">FR</Link><Link href="/en">EN</Link><Link href="/it">IT</Link></nav></div></section>
    </main>
  );
}
