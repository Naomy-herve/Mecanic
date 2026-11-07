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
}).refine(v => !v.scheduledStart || !v.scheduledEnd || new Date(v.scheduledEnd) > new Date(v.scheduledStart), {
  message: "La fin doit être postérieure au début."
});

export async function GET() {
  if (!await requireStaff("mechanic","seller")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query(
      "SELECT a.*,u.full_name AS customer_name,me.full_name AS mechanic_name,cv.make,cv.model,cv.registration_number FROM appointments a LEFT JOIN users u ON u.id=a.customer_id LEFT JOIN users me ON me.id=a.assigned_mechanic_id LEFT JOIN customer_vehicles cv ON cv.id=a.customer_vehicle_id ORDER BY COALESCE(a.scheduled_start,a.requested_at) DESC LIMIT 200"
    );
    return NextResponse.json({ appointments: result.rows });
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
