import { NextResponse } from "next/server";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  customerId: z.uuid().nullable().optional(),
  customerVehicleId: z.uuid().nullable().optional(),
  jobNumber: z.string().trim().min(3).max(40),
  odometerKm: z.coerce.number().int().nonnegative().nullable().optional(),
  intakeCondition: z.string().trim().max(3000).optional(),
  symptoms: z.string().trim().min(3).max(5000),
  assignedMechanicId: z.uuid().nullable().optional(),
  estimatedCompletionAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
const updateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["received","diagnosis","quote_pending","approved","in_repair","quality_check","completed","delivered","cancelled"]),
  note: z.string().trim().max(2000).optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query(
      "SELECT j.id,j.job_number,j.status,j.received_at,j.estimated_completion_at,j.symptoms,j.diagnosis,j.recommendations,j.odometer_km,j.customer_approval_at,u.full_name AS customer_name,cv.make,cv.model,cv.model_year,cv.registration_number,me.full_name AS mechanic_name FROM workshop_jobs j LEFT JOIN users u ON u.id=j.customer_id LEFT JOIN customer_vehicles cv ON cv.id=j.customer_vehicle_id LEFT JOIN users me ON me.id=j.assigned_mechanic_id ORDER BY j.created_at DESC LIMIT 200"
    );
    return NextResponse.json({ jobs: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des dossiers atelier impossible." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = createSchema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO workshop_jobs(job_number,customer_id,customer_vehicle_id,odometer_km,intake_condition,symptoms,assigned_mechanic_id,estimated_completion_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,job_number,status,received_at",
      [data.jobNumber,data.customerId || null,data.customerVehicleId || null,data.odometerKm ?? null,data.intakeCondition || null,data.symptoms,data.assignedMechanicId || null,data.estimatedCompletionAt || null,actor.id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data) VALUES($1,'create','workshop_job',$2,$3::jsonb)",
      [actor.id,inserted.rows[0].id,JSON.stringify(inserted.rows[0])]
    );
    await client.query("COMMIT");
    return NextResponse.json({ job: inserted.rows[0] }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Vérifiez les informations du dossier." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Ce numéro de dossier existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "Création du dossier impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = updateSchema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const current = await client.query("SELECT status FROM workshop_jobs WHERE id=$1 FOR UPDATE", [data.id]);
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    }
    const previous = String(current.rows[0].status);
    const transitions: Record<string,string[]> = {
      received:["diagnosis","cancelled"], diagnosis:["quote_pending","approved","cancelled"],
      quote_pending:["approved","diagnosis","cancelled"], approved:["in_repair","cancelled"],
      in_repair:["quality_check","cancelled"], quality_check:["in_repair","completed"],
      completed:["delivered"], delivered:[], cancelled:[]
    };
    if (previous !== data.status && !transitions[previous]?.includes(data.status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Transition de statut non autorisée." }, { status: 409 });
    }
    const updated = await client.query(
      "UPDATE workshop_jobs SET status=$1,diagnosis=CASE WHEN $1='diagnosis' AND $2<>'' THEN $2 ELSE diagnosis END,customer_approval_at=CASE WHEN $1='approved' THEN now() ELSE customer_approval_at END,completed_at=CASE WHEN $1='completed' THEN now() ELSE completed_at END,delivered_at=CASE WHEN $1='delivered' THEN now() ELSE delivered_at END,updated_at=now() WHERE id=$3 RETURNING id,job_number,status",
      [data.status,data.note || "",data.id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'status_change','workshop_job',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,data.id,JSON.stringify({status:previous}),JSON.stringify(updated.rows[0]),data.note || null]
    );
    await client.query("COMMIT");
    return NextResponse.json({ job: updated.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: error instanceof z.ZodError ? "Données de modification invalides." : "Modification du dossier impossible." }, { status: error instanceof z.ZodError ? 400 : 500 });
  } finally {
    client?.release();
  }
}
