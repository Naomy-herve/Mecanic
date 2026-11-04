import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ReferencePage } from "@/components/reference-pages";

const slugs = [
  "accueil-premium","catalogue-pieces","tableau-de-bord","boutique-classique",
  "catalogue-responsive","comparateur-references","statistiques-ventes","gestion-inventaire",
  "recherche-vehicule","recherche-reference","rapports-admin","boutique-nocturne","resultats-filtres"
];

const adminPages = new Set([
  "tableau-de-bord",
  "statistiques-ventes",
  "gestion-inventaire",
  "rapports-admin"
]);

export function generateStaticParams(){ return slugs.map(page=>({page})); }

export default async function ReferenceExperience({params}:{params:Promise<{page:string}>}){
  const {page}=await params;
  if(!slugs.includes(page)) notFound();

  // These four reference experiences display operational inventory and admin
  // indicators, so they must follow the same server-side access rule as /admin.
  if(adminPages.has(page)){
    const admin=await requireAdmin();
    if(!admin) redirect("/compte");
  }

  return <ReferencePage slug={page}/>;
}
