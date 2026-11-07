import { NextResponse } from "next/server";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  workshopJobId: z.uuid(),
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive().max(100000),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query(
      "SELECT p.id,p.workshop_job_id,p.product_id,p.description,p.quantity,p.unit_price,p.created_at,j.job_number,pr.sku FROM workshop_job_parts p JOIN workshop_jobs j ON j.id=p.workshop_job_id LEFT JOIN products pr ON pr.id=p.product_id ORDER BY p.created_at DESC LIMIT 300"
    );
    return NextResponse.json({ parts: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des pièces utilisées en atelier impossible." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = schema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const job = await client.query("SELECT id,job_number,status FROM workshop_jobs WHERE id=$1 FOR UPDATE", [data.workshopJobId]);
    if (!job.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Dossier atelier introuvable." }, { status: 404 });
    }
    if (!["approved","in_repair"].includes(job.rows[0].status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Le devis doit être approuvé avant la consommation de pièces." }, { status: 409 });
    }
    const product = await client.query(
      "SELECT id,sku,name,price,purchase_price,stock_quantity FROM products WHERE id=$1 AND is_active=true FOR UPDATE",
      [data.productId]
    );
    if (!product.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pièce introuvable ou inactive." }, { status: 404 });
    }
    const row = product.rows[0];
    if (Number(row.stock_quantity) < data.quantity) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Stock insuffisant pour cette intervention." }, { status: 409 });
    }
    await client.query(
      "UPDATE products SET stock_quantity=stock_quantity-$1,updated_at=now() WHERE id=$2",
      [data.quantity,data.productId]
    );
    const movement = await client.query(
      "INSERT INTO inventory_movements(product_id,movement_type,quantity,unit_cost,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'repair_use',$2,$3,$4,'workshop_job',$5,$6,$7) RETURNING id",
      [data.productId,-data.quantity,row.purchase_price ?? null,"Pièce utilisée sur le dossier "+job.rows[0].job_number,data.workshopJobId,job.rows[0].job_number,actor.id]
    );
    const inserted = await client.query(
      "INSERT INTO workshop_job_parts(workshop_job_id,product_id,description,quantity,unit_price,inventory_movement_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,description,quantity,unit_price",
      [data.workshopJobId,data.productId,row.name,data.quantity,row.price,movement.rows[0].id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'consume_part','workshop_job',$2,$3::jsonb,$4)",
      [actor.id,data.workshopJobId,JSON.stringify({part:inserted.rows[0],sku:row.sku,remainingStock:Number(row.stock_quantity)-data.quantity}),"Consommation de pièce en atelier"]
    );
    await client.query("COMMIT");
    return NextResponse.json({ part: inserted.rows[0], remainingStock: Number(row.stock_quantity)-data.quantity }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Informations de pièce utilisées invalides." }, { status: 400 });
    return NextResponse.json({ error: "Enregistrement de la pièce utilisée impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}
