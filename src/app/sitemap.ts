import type { MetadataRoute } from "next";

const siteUrl = "https://kia-piece-naomy-herve.vercel.app";

const publicPaths = [
  "",
  "/en",
  "/it",
  "/catalogue",
  "/reference/accueil-premium",
  "/reference/catalogue-pieces",
  "/reference/tableau-de-bord",
  "/reference/boutique-classique",
  "/reference/catalogue-responsive",
  "/reference/comparateur-references",
  "/reference/statistiques-ventes",
  "/reference/gestion-inventaire",
  "/reference/recherche-vehicule",
  "/reference/recherche-reference",
  "/reference/rapports-admin",
  "/reference/boutique-nocturne",
  "/reference/resultats-filtres",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path, index) => ({
    url: siteUrl + path,
    changeFrequency: index < 4 ? "weekly" : "monthly",
    priority: index === 0 ? 1 : index === 1 || index === 2 ? 0.8 : index === 3 ? 0.9 : 0.6,
  }));
}
