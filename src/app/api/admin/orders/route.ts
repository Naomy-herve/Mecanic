import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { db, query } from "@/lib/db";
import { releaseExpiredStockReservations } from "@/lib/inventory";

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
  if (!await requireStaff("seller","accountant")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    await releaseExpiredStockReservations();
    const result = await query(
      "SELECT id,order_number,customer_name,customer_email,customer_phone,status,payment_status,total,currency,created_at FROM orders ORDER BY created_at DESC LIMIT 200"
    );
    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les commandes pour le moment." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const actor = await requireStaff("seller","accountant");
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  let client: import("pg").PoolClient | undefined;
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Identifiant ou statut invalide." }, { status: 400 });

    const { id, status } = parsed.data;
    client = await db.connect();
    await client.query("BEGIN");
    const current = await client.query("SELECT status,order_number FROM orders WHERE id=$1 FOR UPDATE", [id]);
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
      return NextResponse.json({ error: "Transition impossible : vérifiez le statut actuel de la commande." }, { status: 409 });
    }

    const reservations = await client.query(
      "SELECT id,product_id,quantity,status,expires_at FROM stock_reservations WHERE order_id=$1 ORDER BY product_id FOR UPDATE",
      [id]
    );

    if (previous === "pending" && status === "confirmed" && reservations.rowCount) {
      const expired = reservations.rows.some((r:any)=>r.status!=="reserved" || (r.expires_at && new Date(r.expires_at).getTime()<=Date.now()));
      if (expired) {
        for (const reservation of reservations.rows) {
          if (reservation.status === "reserved") {
            await client.query(
              "UPDATE products SET reserved_quantity=GREATEST(0,reserved_quantity-$1),updated_at=now() WHERE id=$2",
              [reservation.quantity,reservation.product_id]
            );
            await client.query("UPDATE stock_reservations SET status='expired',updated_at=now() WHERE id=$1", [reservation.id]);
          }
        }
        const cancelled = await client.query(
          "UPDATE orders SET status='cancelled',cancelled_at=now(),updated_at=now() WHERE id=$1 RETURNING id,order_number,status",
          [id]
        );
        await client.query(
          "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'reservation_expired','order',$2,$3::jsonb,$4::jsonb,$5)",
          [actor.id,id,JSON.stringify({status:previous}),JSON.stringify(cancelled.rows[0]),"La réservation de stock a expiré"]
        );
        await client.query("COMMIT");
        return NextResponse.json({ error: "La réservation de stock a expiré. La commande a été annulée ; vérifiez à nouveau les disponibilités." }, { status: 409 });
      }

      for (const reservation of reservations.rows) {
        const product = await client.query(
          "SELECT id,sku,name,purchase_price,stock_quantity,reserved_quantity FROM products WHERE id=$1 AND is_active=true FOR UPDATE",
          [reservation.product_id]
        );
        if (!product.rowCount || Number(product.rows[0].stock_quantity)<Number(reservation.quantity) || Number(product.rows[0].reserved_quantity)<Number(reservation.quantity)) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Une réservation ne correspond plus au stock disponible. Vérifiez l’inventaire avant confirmation." }, { status: 409 });
        }
        await client.query(
          "UPDATE products SET stock_quantity=stock_quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() WHERE id=$2",
          [reservation.quantity,reservation.product_id]
        );
        await client.query(
          "INSERT INTO inventory_movements(product_id,movement_type,quantity,unit_cost,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'sale',$2,$3,$4,'order',$5,$6,$7)",
          [reservation.product_id,-Number(reservation.quantity),product.rows[0].purchase_price ?? null,"Commande confirmée "+current.rows[0].order_number,id,current.rows[0].order_number,actor.id]
        );
        await client.query("UPDATE stock_reservations SET status='consumed',updated_at=now() WHERE id=$1", [reservation.id]);
      }
    }

    if (status === "cancelled") {
      const activeReservations = reservations.rows.filter((r:any)=>r.status==="reserved");
      const consumedReservations = reservations.rows.filter((r:any)=>r.status==="consumed");

      for (const reservation of activeReservations) {
        await client.query(
          "UPDATE products SET reserved_quantity=GREATEST(0,reserved_quantity-$1),updated_at=now() WHERE id=$2",
          [reservation.quantity,reservation.product_id]
        );
        await client.query("UPDATE stock_reservations SET status='released',updated_at=now() WHERE id=$1", [reservation.id]);
      }

      for (const reservation of consumedReservations) {
        const product = await client.query("SELECT id FROM products WHERE id=$1 FOR UPDATE", [reservation.product_id]);
        if (product.rowCount) {
          await client.query("UPDATE products SET stock_quantity=stock_quantity+$1,updated_at=now() WHERE id=$2", [reservation.quantity,reservation.product_id]);
          await client.query(
            "INSERT INTO inventory_movements(product_id,movement_type,quantity,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'return',$2,$3,'order',$4,$5,$6)",
            [reservation.product_id,reservation.quantity,"Restitution après annulation de la commande "+current.rows[0].order_number,id,current.rows[0].order_number,actor.id]
          );
        }
        await client.query("UPDATE stock_reservations SET status='released',updated_at=now() WHERE id=$1", [reservation.id]);
      }

      // Compatibility for orders created before the reservation workflow existed.
      if (!reservations.rowCount) {
        const items = await client.query(
          "SELECT product_id,quantity FROM order_items WHERE order_id=$1 AND product_id IS NOT NULL",
          [id]
        );
        for (const item of items.rows) {
          await client.query("UPDATE products SET stock_quantity=stock_quantity+$1,updated_at=now() WHERE id=$2", [item.quantity,item.product_id]);
          await client.query(
            "INSERT INTO inventory_movements(product_id,movement_type,quantity,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'return',$2,$3,'order',$4,$5,$6)",
            [item.product_id,item.quantity,"Restitution après annulation de la commande "+current.rows[0].order_number,id,current.rows[0].order_number,actor.id]
          );
        }
      }
    }

    const updated = await client.query(
      "UPDATE orders SET status=$1,cancelled_at=CASE WHEN $1='cancelled' THEN now() ELSE cancelled_at END,updated_at=now() WHERE id=$2 RETURNING id,order_number,status",
      [status,id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'status_change','order',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,id,JSON.stringify({status:previous}),JSON.stringify(updated.rows[0]),"Transition de commande"]
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
