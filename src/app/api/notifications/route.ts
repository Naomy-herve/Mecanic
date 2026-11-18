import {NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db";
import {getSession} from "@/lib/auth";

const readSchema=z.object({id:z.uuid()});

export async function GET(){
 const user=await getSession();if(!user)return NextResponse.json({error:"Connexion requise."},{status:401});
 try{
  const result=await query(
   "SELECT id,event_type,title,message,status,related_type,related_id,created_at,read_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
   [user.id]
  );
  return NextResponse.json({notifications:result.rows});
 }catch{return NextResponse.json({error:"Chargement des notifications impossible."},{status:500});}
}

export async function PATCH(req:Request){
 const user=await getSession();if(!user)return NextResponse.json({error:"Connexion requise."},{status:401});
 try{
  const data=readSchema.parse(await req.json());
  const result=await query(
   "UPDATE notifications SET status='read',read_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,status,read_at",
   [data.id,user.id]
  );
  if(!result.rowCount)return NextResponse.json({error:"Notification introuvable."},{status:404});
  return NextResponse.json({notification:result.rows[0]});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Identifiant de notification invalide.":"Mise à jour impossible."},{status:error instanceof z.ZodError?400:500});}
}
