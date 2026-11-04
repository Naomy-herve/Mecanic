import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {query} from "@/lib/db";

const updateSchema=z.object({
  id:z.uuid(),
  status:z.enum(["new","in_progress","resolved"])
});

export async function GET(){
  if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
  try{
    const r=await query("SELECT id,name,email,phone,subject,message,status,created_at FROM inquiries ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,created_at DESC LIMIT 100");
    return NextResponse.json({inquiries:r.rows});
  }catch{
    return NextResponse.json({error:"Impossible de charger les demandes."},{status:500});
  }
}

export async function PATCH(req:Request){
  if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
  try{
    const parsed=updateSchema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:"Identifiant ou statut invalide."},{status:400});
    const r=await query("UPDATE inquiries SET status=$1 WHERE id=$2 RETURNING id,status",[parsed.data.status,parsed.data.id]);
    if(!r.rowCount)return NextResponse.json({error:"Demande introuvable."},{status:404});
    return NextResponse.json({inquiry:r.rows[0]});
  }catch{
    return NextResponse.json({error:"Modification impossible pour le moment."},{status:500});
  }
}
