import {redirect} from "next/navigation";
import {getSession} from "@/lib/auth";
import EquivalentsManager from "./manager";
export default async function AdminEquivalents(){
 const u=await getSession();
 if(!u)redirect("/compte");
 if(u.role!=="admin")redirect("/");
 return <main className="page-shell"><div className="container"><div className="section-kicker">GESTION DU CATALOGUE</div><h1 className="page-title">Pièces équivalentes</h1><p className="muted">Associez des références alternatives uniquement après vérification de leur correspondance technique.</p><EquivalentsManager/></div></main>;
}
