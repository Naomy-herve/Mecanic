import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteUrl = "https://kia-piece-naomy-herve.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KIA PIÈCE — Pièces automobiles Kia",
    template: "%s | KIA PIÈCE",
  },
  description:
    "Trouvez les pièces adaptées à votre véhicule Kia. Catalogue, compatibilité et demande de devis.",
  applicationName: "KIA PIÈCE",
  keywords: [
    "pièces automobiles Kia",
    "catalogue pièces Kia",
    "compatibilité véhicule Kia",
    "garage Kia",
    "pièces détachées",
  ],
  robots: {
    // Preview deployments must not appear in search results.
    index: process.env.VERCEL_ENV === "production",
    follow: true,
    googleBot: {
      index: process.env.VERCEL_ENV === "production",
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "KIA PIÈCE",
    title: "KIA PIÈCE — Pièces automobiles Kia",
    description:
      "Trouvez les pièces adaptées à votre véhicule Kia. Consultez le catalogue et demandez un devis.",
  },
  twitter: {
    card: "summary",
    title: "KIA PIÈCE — Pièces automobiles Kia",
    description:
      "Catalogue de pièces Kia, informations de compatibilité et demande de devis.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#main-content">
          Passer au contenu
        </a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
