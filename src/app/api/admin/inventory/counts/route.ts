import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

const schema = z.object({
  productId: z.uuid(),
  countedQuantity: z.coerce.number().int().nonnegative().max(1000000),
  reason: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  const actor = await requireStaff("storekeeper");
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = schema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT id,sku,name,stock_quantity,reserved_quantity FROM products WHERE id=$1 AND is_active=true FOR UPDATE",
      [data.productId]
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pièce introuvable ou inactive." }, { status: 404 });
    }
    const before = Number(current.rows[0].stock_quantity);
    if (data.countedQuantity < Number(current.rows[0].reserved_quantity)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Le comptage ne peut pas être inférieur aux quantités déjà réservées." }, { status: 409 });
    }
    const difference = data.countedQuantity - before;
    if (difference !== 0) {
      await client.query(
        "UPDATE products SET stock_quantity=$1,updated_at=now() WHERE id=$2",
        [data.countedQuantity,data.productId]
      );
      await client.query(
        "INSERT INTO inventory_movements(product_id,movement_type,quantity,reason,reference_type,document_number,created_by) VALUES($1,'adjustment',$2,$3,'physical_count',$4,$5)",
        [data.productId,difference,data.reason,"INV-"+new Date().toISOString().slice(0,10).replaceAll("-",""),actor.id]
      );
    }
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'physical_inventory_count','product',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,data.productId,JSON.stringify({stockQuantity:before}),JSON.stringify({stockQuantity:data.countedQuantity,difference}),data.reason]
    );
    await client.query("COMMIT");
    return NextResponse.json({ product: current.rows[0].name, previousStock: before, countedQuantity: data.countedQuantity, difference });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Données d’inventaire physique invalides." }, { status: 400 });
    return NextResponse.json({ error: "Enregistrement de l’inventaire physique impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}
