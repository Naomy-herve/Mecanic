import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./story-home.css";
import "./theme.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteUrl = "https://kia-piece-naomy-herve.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f0eb" },
    { media: "(prefers-color-scheme: dark)", color: "#101619" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KIA PIÈCE — La bonne pièce pour votre Kia",
    template: "%s | KIA PIÈCE",
  },
  description:
    "Recherchez des pièces automobiles Kia, consultez les références enregistrées et contactez notre équipe pour vérifier la compatibilité et la disponibilité.",
  applicationName: "KIA PIÈCE",
  keywords: [
    "KIA PIÈCE",
    "pièces automobiles Kia",
    "catalogue pièces Kia",
    "pièces détachées Kia",
    "compatibilité véhicule Kia",
    "recherche référence Kia",
  ],
  robots: {
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
    title: "KIA PIÈCE — La bonne pièce pour votre Kia",
    description:
      "Identifiez votre véhicule, recherchez une pièce et confirmez les informations avec notre équipe.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KIA PIÈCE — Pièces automobiles Kia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KIA PIÈCE — La bonne pièce pour votre Kia",
    description:
      "Identifiez votre véhicule, recherchez une pièce et confirmez les informations avec notre équipe.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
