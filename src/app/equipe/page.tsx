import {redirect} from "next/navigation";
import Link from "next/link";
import {requireStaff} from "@/lib/auth";

const roleLabels:Record<string,string>={seller:"Vendeur",mechanic:"Mécanicien",storekeeper:"Magasinier",accountant:"Comptable / responsable"};
const sections=[
 {role:"seller",title:"Ventes et relation client",links:[["/admin/commandes","Commandes"],["/admin/clients","Clients"],["/admin/demandes","Demandes clients"],["/admin/factures","Factures"]]},
 {role:"mechanic",title:"Atelier et rendez-vous",links:[["/admin/atelier","Dossiers atelier"],["/admin/rendez-vous","Planning des rendez-vous"]]},
 {role:"storekeeper",title:"Magasin et approvisionnement",links:[["/admin/stocks","Stocks et inventaires"],["/admin/fournisseurs","Fournisseurs et réceptions"]]},
 {role:"accountant",title:"Finances",links:[["/admin/paiements","Paiements"],["/admin/factures","Factures"],["/admin/depenses","Dépenses"]]}
] as const;

export default async function StaffDashboard(){
 const staff=await requireStaff("seller","mechanic","storekeeper","accountant");
 if(!staff)redirect("/compte");
 if(staff.isAdmin)redirect("/admin");
 return <main className="page-shell"><div className="container">
  <div className="section-kicker">ESPACE ÉQUIPE · KIA PIÈCE</div>
  <h1 className="page-title">Espace de travail</h1>
  <p className="muted">Connecté en tant que {staff.email}. Vos accès sont limités aux fonctions attribuées par l’administrateur du garage.</p>
  <div className="admin-grid">
   {sections.filter(section=>staff.staffRoles.includes(section.role)).map(section=><section className="stat-card" key={section.role}>
    <small>{roleLabels[section.role]}</small><h2>{section.title}</h2>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
     {section.links.map(([href,label])=><Link className="btn btn-outline" href={href} key={href}>{label}</Link>)}
    </div>
   </section>)}
  </div>
  <p className="muted" style={{marginTop:24}}>Pour demander un autre accès, contactez l’administrateur du garage.</p>
 </div></main>;
}
