import {NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db";
import {getSession} from "@/lib/auth";

const schema=z.object({
 orderUpdates:z.boolean(),
 repairUpdates:z.boolean(),
 appointmentReminders:z.boolean(),
 invoiceUpdates:z.boolean(),
 marketingMessages:z.boolean(),
});

export async function GET(){
 const user=await getSession();if(!user)return NextResponse.json({error:"Connexion requise."},{status:401});
 try{
  const result=await query(
   "SELECT order_updates,repair_updates,appointment_reminders,invoice_updates,marketing_messages FROM notification_preferences WHERE user_id=$1",
   [user.id]
  );
  return NextResponse.json({preferences:result.rows[0]||{order_updates:true,repair_updates:true,appointment_reminders:true,invoice_updates:true,marketing_messages:false}});
 }catch{return NextResponse.json({error:"Chargement des préférences impossible."},{status:500});}
}

export async function PUT(req:Request){
 const user=await getSession();if(!user)return NextResponse.json({error:"Connexion requise."},{status:401});
 try{
  const data=schema.parse(await req.json());
  const result=await query(
   `INSERT INTO notification_preferences(user_id,order_updates,repair_updates,appointment_reminders,invoice_updates,marketing_messages)
    VALUES($1,$2,$3,$4,$5,$6)
    ON CONFLICT(user_id) DO UPDATE SET
     order_updates=EXCLUDED.order_updates,
     repair_updates=EXCLUDED.repair_updates,
     appointment_reminders=EXCLUDED.appointment_reminders,
     invoice_updates=EXCLUDED.invoice_updates,
     marketing_messages=EXCLUDED.marketing_messages,
     updated_at=now()
    RETURNING order_updates,repair_updates,appointment_reminders,invoice_updates,marketing_messages`,
   [user.id,data.orderUpdates,data.repairUpdates,data.appointmentReminders,data.invoiceUpdates,data.marketingMessages]
  );
  return NextResponse.json({preferences:result.rows[0]});
 }catch(error){return NextResponse.json({error:error instanceof z.ZodError?"Préférences invalides.":"Enregistrement impossible."},{status:error instanceof z.ZodError?400:500});}
}
