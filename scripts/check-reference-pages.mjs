import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const route = readFileSync("src/app/reference/[page]/page.tsx", "utf8");
const expected = [
  "accueil-premium",
  "catalogue-pieces",
  "tableau-de-bord",
  "boutique-classique",
  "catalogue-responsive",
  "comparateur-references",
  "statistiques-ventes",
  "gestion-inventaire",
  "recherche-vehicule",
  "recherche-reference",
  "rapports-admin",
  "boutique-nocturne",
  "resultats-filtres"
];

const match = route.match(/const slugs = \[([\s\S]*?)\];/);
assert.ok(match, "La liste des 13 pages de référence doit exister dans le routeur.");
const actual = [...match[1].matchAll(/"([a-z0-9-]+)"/g)].map((item) => item[1]);

assert.equal(actual.length, 13, "La plateforme doit conserver exactement 13 pages indépendantes.");
assert.deepEqual(actual, expected, "Les 13 routes doivent correspondre au parcours de référence attendu.");
assert.match(route, /generateStaticParams/, "Les 13 routes doivent être déclarées pour la génération statique.");
assert.match(route, /requireAdmin/, "Les pages administrateur doivent vérifier les droits côté serveur.");

const component = readFileSync("src/components/reference-pages.tsx", "utf8");
assert.match(component, /export function ReferencePage/, "Le composant des pages de référence doit être exporté.");

console.log("Contrôle réussi : 13 pages distinctes, routes attendues et protection administrateur présente.");
