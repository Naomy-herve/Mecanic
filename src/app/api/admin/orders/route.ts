import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db, query } from "@/lib/db";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
});

const allowed: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await query(
      "SELECT id,order_number,customer_name,customer_email,customer_phone,status,total,currency,created_at FROM orders ORDER BY created_at DESC LIMIT 200"
    );
    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les commandes pour le moment." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let client: import("pg").PoolClient | undefined;
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Identifiant ou statut invalide." }, { status: 400 });
    }

    const { id, status } = parsed.data;
    client = await db.connect();
    await client.query("BEGIN");

    const current = await client.query(
      "SELECT status,order_number FROM orders WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const previous = String(current.rows[0].status);
    if (previous === status) {
      await client.query("COMMIT");
      return NextResponse.json({ order: { id, status } });
    }

    if (!allowed[previous]?.includes(status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        error: "Transition impossible : vérifiez le statut actuel de la commande.",
      }, { status: 409 });
    }

    // The row lock and status transition ensure that stock is restored only once.
    if (status === "cancelled") {
      const items = await client.query(
        "SELECT product_id, quantity FROM order_items WHERE order_id = $1 AND product_id IS NOT NULL",
        [id]
      );

      for (const item of items.rows) {
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now() WHERE id = $2",
          [item.quantity, item.product_id]
        );
        await client.query(
          "INSERT INTO inventory_movements(product_id,movement_type,quantity,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'return',$2,$3,'order',$4,$5,$6)",
          [item.product_id,item.quantity,"Restitution après annulation de la commande "+current.rows[0].order_number,id,current.rows[0].order_number,(await requireAdmin())?.id || null]
        );
      }
    }

    const updated = await client.query(
      "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, order_number, status",
      [status, id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'status_change','order',$2,$3::jsonb,$4::jsonb,$5)",
      [(await requireAdmin())?.id || null,id,JSON.stringify({status:previous}),JSON.stringify(updated.rows[0]),"Transition de commande"]
    );

    await client.query("COMMIT");
    return NextResponse.json({ order: updated.rows[0] });
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Modification impossible pour le moment." }, { status: 500 });
  } finally {
    client?.release();
  }
}
