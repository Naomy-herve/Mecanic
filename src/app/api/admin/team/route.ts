import {NextResponse} from "next/server";
import {z} from "zod";
import {db,query} from "@/lib/db";
import {requireAdmin} from "@/lib/auth";

const roleSchema=z.enum(["seller","mechanic","storekeeper","accountant"]);
const grantSchema=z.object({email:z.string().trim().email().max(254),role:roleSchema});
const revokeSchema=z.object({userId:z.uuid(),role:roleSchema});

export async function GET(){
 if(!await requireAdmin())return NextResponse.json({error:"Accès refusé."},{status:403});
 try{
  const result=await query(
   `SELECT u.id,u.full_name,u.email,
     COALESCE(json_agg(ura.role) FILTER (WHERE g.id IS NOT NULL),'[]'::json) AS staff_roles
    FROM users u
    LEFT JOIN user_role_assignments ura ON ura.user_id=u.id
    LEFT JOIN garages g ON g.id=ura.garage_id AND g.is_active=true
    WHERE u.role='customer'
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`
  );
  return NextResponse.json({staff:result.rows});
 }catch{return NextResponse.json({error:"Chargement de l’équipe impossible."},{status:500});}
}

export async function POST(req:Request){
 const actor=await requireAdmin();if(!actor)return NextResponse.json({error:"Accès refusé."},{status:403});
 let client:import("pg").PoolClient|undefined;
 try{
  const data=grantSchema.parse(await req.json());
  client=await db.connect();await client.query("BEGIN");
  const user=await client.query("SELECT id,full_name,email FROM users WHERE lower(email)=lower($1) AND role='customer' FOR UPDATE",[data.email]);
  if(!user.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Compte client introuvable. La personne doit d’abord créer son compte."},{status:404});}
  const garage=await client.query("SELECT id FROM garages WHERE is_active=true LIMIT 1 FOR SHARE");
  if(!garage.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Garage unique non configuré."},{status:503});}
  const inserted=await client.query(
   "INSERT INTO user_role_assignments(user_id,role,garage_id,granted_by) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,role,garage_id) DO NOTHING RETURNING user_id,role,garage_id",
   [user.rows[0].id,data.role,garage.rows[0].id,actor.id]
  );
  await client.query(
   "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'grant_staff_role','user',$2,$3::jsonb,$4)",
   [actor.id,user.rows[0].id,JSON.stringify({email:user.rows[0].email,role:data.role}),"Attribution d’un rôle au sein du garage unique"]
  );
  await client.query("COMMIT");
  return NextResponse.json({ok:true,assignment:inserted.rows[0]||{userId:user.rows[0].id,role:data.role}},{status:201});
 }catch(error){
  if(client)await client.query("ROLLBACK").catch(()=>{});
  if(error instanceof z.ZodError)return NextResponse.json({error:"Adresse e-mail ou rôle invalide."},{status:400});
  return NextResponse.json({error:"Attribution du rôle impossible."},{status:500});
 }finally{client?.release();}
}

export async function DELETE(req:Request){
 const actor=await requireAdmin();if(!actor)return NextResponse.json({error:"Accès refusé."},{status:403});
 let client:import("pg").PoolClient|undefined;
 try{
  const data=revokeSchema.parse(await req.json());
  client=await db.connect();await client.query("BEGIN");
  const garage=await client.query("SELECT id FROM garages WHERE is_active=true LIMIT 1 FOR SHARE");
  if(!garage.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Garage unique non configuré."},{status:503});}
  const removed=await client.query(
   "DELETE FROM user_role_assignments WHERE user_id=$1 AND role=$2 AND garage_id=$3 RETURNING user_id,role",
   [data.userId,data.role,garage.rows[0].id]
  );
  if(!removed.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Affectation introuvable."},{status:404});}
  await client.query(
   "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,reason) VALUES($1,'revoke_staff_role','user',$2,$3::jsonb,$4)",
   [actor.id,data.userId,JSON.stringify(removed.rows[0]),"Retrait d’un rôle du garage unique"]
  );
  await client.query("COMMIT");return NextResponse.json({ok:true});
 }catch(error){
  if(client)await client.query("ROLLBACK").catch(()=>{});
  if(error instanceof z.ZodError)return NextResponse.json({error:"Identifiant ou rôle invalide."},{status:400});
  return NextResponse.json({error:"Retrait du rôle impossible."},{status:500});
 }finally{client?.release();}
}
