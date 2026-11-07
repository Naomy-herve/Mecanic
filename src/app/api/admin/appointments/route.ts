import { NextResponse } from "next/server";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { queueInAppNotification } from "@/lib/notifications";

const schema = z.object({
  customerId: z.uuid().nullable().optional(),
  customerVehicleId: z.uuid().nullable().optional(),
  serviceType: z.string().trim().min(2).max(120),
  description: z.string().trim().max(3000).optional(),
  requestedAt: z.iso.datetime({ offset: true }),
  scheduledStart: z.iso.datetime({ offset: true }).nullable().optional(),
  scheduledEnd: z.iso.datetime({ offset: true }).nullable().optional(),
  mechanicId: z.uuid().nullable().optional(),
}).refine(v => Boolean(v.scheduledStart) === Boolean(v.scheduledEnd), { message: "Le début et la fin du créneau doivent être renseignés ensemble." })
  .refine(v => !v.scheduledStart || Boolean(v.mechanicId), { message: "Un mécanicien doit être affecté à tout créneau confirmé." })
  .refine(v => !v.scheduledStart || new Date(v.scheduledEnd!) > new Date(v.scheduledStart), { message: "La fin doit être postérieure au début." });

const updateSchema = z.object({
  id:z.uuid(),
  status:z.enum(["requested","confirmed","in_progress","completed","cancelled","no_show"]),
  mechanicId:z.uuid().nullable().optional(),
  scheduledStart:z.iso.datetime({offset:true}).nullable().optional(),
  scheduledEnd:z.iso.datetime({offset:true}).nullable().optional(),
}).refine(v=>Boolean(v.scheduledStart)===Boolean(v.scheduledEnd),{message:"Le début et la fin doivent être renseignés ensemble."});

export async function GET() {
  if (!await requireStaff("mechanic","seller")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const [result,mechanics,customers,vehicles] = await Promise.all([
      query("SELECT a.*,u.full_name AS customer_name,me.full_name AS mechanic_name,cv.make,cv.model,cv.registration_number FROM appointments a LEFT JOIN users u ON u.id=a.customer_id LEFT JOIN users me ON me.id=a.assigned_mechanic_id LEFT JOIN customer_vehicles cv ON cv.id=a.customer_vehicle_id ORDER BY COALESCE(a.scheduled_start,a.requested_at) DESC LIMIT 200"),
      query("SELECT u.id,u.full_name FROM users u JOIN user_role_assignments ura ON ura.user_id=u.id JOIN garages g ON g.id=ura.garage_id AND g.is_active=true WHERE ura.role='mechanic' ORDER BY u.full_name"),
      query("SELECT id,full_name,email FROM users WHERE role='customer' ORDER BY full_name LIMIT 500"),
      query("SELECT cv.id,cv.user_id,cv.make,cv.model,cv.registration_number FROM customer_vehicles cv ORDER BY cv.created_at DESC LIMIT 500")
    ]);
    return NextResponse.json({ appointments: result.rows, mechanics: mechanics.rows, customers: customers.rows, vehicles: vehicles.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des rendez-vous impossible." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await requireStaff("mechanic","seller");
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = schema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    if (data.customerVehicleId) {
      if (!data.customerId) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Sélectionnez le client associé au véhicule." }, { status: 400 }); }
      const vehicle = await client.query("SELECT id FROM customer_vehicles WHERE id=$1 AND user_id=$2 FOR SHARE", [data.customerVehicleId,data.customerId]);
      if (!vehicle.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Ce véhicule n’appartient pas au client sélectionné." }, { status: 404 }); }
    }
    if (data.mechanicId) {
      const assigned = await client.query("SELECT 1 FROM user_role_assignments ura JOIN garages g ON g.id=ura.garage_id AND g.is_active=true WHERE ura.user_id=$1 AND ura.role='mechanic' LIMIT 1", [data.mechanicId]);
      if (!assigned.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Le compte sélectionné n’a pas le rôle mécanicien dans ce garage." }, { status: 400 }); }
    }
    if (data.mechanicId && data.scheduledStart && data.scheduledEnd) {
      // Serialize bookings for this mechanic; row locks alone do not protect an empty time range.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [data.mechanicId]);
      const conflict = await client.query(
        "SELECT id FROM appointments WHERE assigned_mechanic_id=$1 AND status IN ('requested','confirmed','in_progress') AND scheduled_start < $3 AND scheduled_end > $2 FOR UPDATE",
        [data.mechanicId,data.scheduledStart,data.scheduledEnd]
      );
      if (conflict.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Ce mécanicien a déjà un rendez-vous sur ce créneau." }, { status: 409 });
      }
    }
    const inserted = await client.query(
      "INSERT INTO appointments(customer_id,customer_vehicle_id,service_type,description,requested_at,scheduled_start,scheduled_end,assigned_mechanic_id,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,status,requested_at,scheduled_start,scheduled_end",
      [data.customerId || null,data.customerVehicleId || null,data.serviceType,data.description || null,data.requestedAt,data.scheduledStart || null,data.scheduledEnd || null,data.mechanicId || null,data.scheduledStart ? "confirmed" : "requested"]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data) VALUES($1,'create','appointment',$2,$3::jsonb)",
      [actor.id,inserted.rows[0].id,JSON.stringify(inserted.rows[0])]
    );
    await queueInAppNotification(client,data.customerId,"appointment_reminders","Rendez-vous enregistré",data.scheduledStart?"Votre rendez-vous est confirmé pour le créneau choisi.":"Votre demande de rendez-vous a été reçue et attend une confirmation.","appointment",inserted.rows[0].id);
    await client.query("COMMIT");
    return NextResponse.json({ appointment: inserted.rows[0] }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: error instanceof z.ZodError ? "Informations de rendez-vous invalides." : "Création du rendez-vous impossible." }, { status: error instanceof z.ZodError ? 400 : 500 });
  } finally {
    client?.release();
  }
}


export async function PATCH(req:Request) {
  const actor=await requireStaff("mechanic","seller");
  if(!actor)return NextResponse.json({error:"Accès refusé."},{status:403});
  let client:import("pg").PoolClient|undefined;
  try{
    const data=updateSchema.parse(await req.json());
    client=await db.connect();await client.query("BEGIN");
    const current=await client.query("SELECT customer_id,status,assigned_mechanic_id,scheduled_start,scheduled_end FROM appointments WHERE id=$1 FOR UPDATE",[data.id]);
    if(!current.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Rendez-vous introuvable."},{status:404});}
    const previous=String(current.rows[0].status);
    const transitions:Record<string,string[]>={requested:["confirmed","cancelled","no_show"],confirmed:["in_progress","cancelled","no_show"],in_progress:["completed","cancelled"],completed:[],cancelled:[],no_show:[]};
    if(previous!==data.status&&!transitions[previous]?.includes(data.status)){await client.query("ROLLBACK");return NextResponse.json({error:"Transition de rendez-vous non autorisée."},{status:409});}
    const mechanicId=data.mechanicId===undefined?current.rows[0].assigned_mechanic_id:data.mechanicId;
    const start=data.scheduledStart===undefined?current.rows[0].scheduled_start:data.scheduledStart;
    const end=data.scheduledEnd===undefined?current.rows[0].scheduled_end:data.scheduledEnd;
    if(data.status==="confirmed"&&(!mechanicId||!start||!end)){await client.query("ROLLBACK");return NextResponse.json({error:"Affectez un mécanicien et un créneau complet avant confirmation."},{status:400});}
    if(mechanicId){
      const assigned=await client.query("SELECT 1 FROM user_role_assignments ura JOIN garages g ON g.id=ura.garage_id AND g.is_active=true WHERE ura.user_id=$1 AND ura.role='mechanic' LIMIT 1",[mechanicId]);
      if(!assigned.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Le compte sélectionné n’a pas le rôle mécanicien."},{status:400});}
    }
    if(mechanicId&&start&&end){
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",[mechanicId]);
      const conflict=await client.query("SELECT id FROM appointments WHERE id<>$4 AND assigned_mechanic_id=$1 AND status IN ('requested','confirmed','in_progress') AND scheduled_start<$3 AND scheduled_end>$2 FOR UPDATE",[mechanicId,start,end,data.id]);
      if(conflict.rowCount){await client.query("ROLLBACK");return NextResponse.json({error:"Ce mécanicien a déjà un rendez-vous sur ce créneau."},{status:409});}
    }
    const updated=await client.query("UPDATE appointments SET status=$1,assigned_mechanic_id=$2,scheduled_start=$3,scheduled_end=$4,updated_at=now() WHERE id=$5 RETURNING id,status,scheduled_start,scheduled_end",[data.status,mechanicId,start,end,data.id]);
    await client.query("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data) VALUES($1,'appointment_update','appointment',$2,$3::jsonb,$4::jsonb)",[actor.id,data.id,JSON.stringify({status:previous}),JSON.stringify(updated.rows[0])]);
    await queueInAppNotification(client,current.rows[0].customer_id,"appointment_reminders","Mise à jour du rendez-vous",data.status==="cancelled"?"Votre rendez-vous a été annulé.":data.status==="confirmed"?"Votre rendez-vous est confirmé.":"Le statut de votre rendez-vous a été mis à jour.","appointment",data.id);
    await client.query("COMMIT");
    return NextResponse.json({appointment:updated.rows[0]});
  }catch(error){
    if(client)await client.query("ROLLBACK").catch(()=>{});
    return NextResponse.json({error:error instanceof z.ZodError?"Informations de rendez-vous invalides.":"Modification du rendez-vous impossible."},{status:error instanceof z.ZodError?400:500});
  }finally{client?.release();}
}
