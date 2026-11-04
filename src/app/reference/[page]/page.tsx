import { notFound } from "next/navigation";
import { ReferencePage } from "@/components/reference-pages";

const slugs = [
  "accueil-premium","catalogue-pieces","tableau-de-bord","boutique-classique",
  "catalogue-responsive","comparateur-references","statistiques-ventes","gestion-inventaire",
  "recherche-vehicule","recherche-reference","rapports-admin","boutique-nocturne","resultats-filtres"
];

export function generateStaticParams(){ return slugs.map(page=>({page})); }

export default async function ReferenceExperience({params}:{params:Promise<{page:string}>}){
  const {page}=await params;
  if(!slugs.includes(page)) notFound();
  return <ReferencePage slug={page}/>;
}
