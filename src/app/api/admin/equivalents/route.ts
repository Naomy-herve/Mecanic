import {NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";

const uuid=z.string().uuid();
export async function GET(req:Request){
  if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
  const productId=new URL(req.url).searchParams.get("productId");
  if(!productId||!uuid.safeParse(productId).success)return NextResponse.json({error:"Identifiant de pièce invalide."},{status:400});
  const r=await query("SELECT p.id,p.sku,p.name,p.slug,e.notes,e.verified FROM product_equivalents e JOIN products p ON p.id=CASE WHEN e.product_id=$1 THEN e.equivalent_product_id ELSE e.product_id END WHERE e.product_id=$1 OR e.equivalent_product_id=$1 ORDER BY p.name",[productId]);
  return NextResponse.json({equivalents:r.rows});
}
export async function POST(req:Request){
  if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
  try{
    const d=z.object({productId:uuid,equivalentSku:z.string().trim().min(2).max(64),notes:z.string().trim().max(500).optional().default(""),verified:z.boolean().optional().default(false)}).parse(await req.json());
    const r=await query("INSERT INTO product_equivalents(product_id,equivalent_product_id,notes,verified) SELECT LEAST(a.id,b.id),GREATEST(a.id,b.id),$3,$4 FROM products a CROSS JOIN products b WHERE a.id=$1 AND upper(b.sku)=upper($2) AND a.is_active=true AND b.is_active=true AND a.id<>b.id RETURNING product_id,equivalent_product_id",[d.productId,d.equivalentSku,d.notes||null,d.verified]);
    if(!r.rowCount)return NextResponse.json({error:"Pièce introuvable, masquée ou identique à la pièce principale."},{status:404});
    return NextResponse.json({ok:true},{status:201});
  }catch(e){
    if(e instanceof z.ZodError)return NextResponse.json({error:"Données invalides."},{status:400});
    if((e as {code?:string}).code==="23505")return NextResponse.json({error:"Cette équivalence existe déjà."},{status:409});
    return NextResponse.json({error:"Enregistrement impossible."},{status:500});
  }
}
export async function DELETE(req:Request){
  if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
  try{
    const d=z.object({productId:uuid,equivalentId:uuid}).parse(await req.json());
    const r=await query("DELETE FROM product_equivalents WHERE (product_id=$1 AND equivalent_product_id=$2) OR (product_id=$2 AND equivalent_product_id=$1) RETURNING product_id",[d.productId,d.equivalentId]);
    if(!r.rowCount)return NextResponse.json({error:"Équivalence introuvable."},{status:404});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"Données invalides."},{status:400});}
}
