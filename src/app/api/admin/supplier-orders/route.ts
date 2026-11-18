import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireStaff } from "@/lib/auth";

const createSchema = z.object({
  supplierId: z.uuid(),
  currency: z.enum(["MGA", "EUR", "USD"]).default("MGA"),
  expectedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  notes: z.string().trim().max(3000).optional(),
  items: z.array(z.object({
    productId: z.uuid().nullable().optional(),
    reference: z.string().trim().max(120).optional(),
    description: z.string().trim().min(2).max(500),
    quantity: z.coerce.number().int().positive().max(100000),
    unitCost: z.coerce.number().finite().nonnegative(),
  })).min(1).max(100),
});

const updateSchema = z.discriminatedUnion("action", [
  z.object({ id: z.uuid(), action: z.literal("mark_sent") }),
  z.object({ id: z.uuid(), action: z.literal("cancel") }),
  z.object({
    id: z.uuid(),
    action: z.literal("receive"),
    items: z.array(z.object({ itemId: z.uuid(), quantity: z.coerce.number().int().positive().max(100000) })).min(1).max(100),
  }),
]);

export async function GET() {
  if (!await requireStaff("storekeeper")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query(
      `SELECT so.id,so.order_number,so.status,so.ordered_at,so.expected_at,so.received_at,so.currency,so.subtotal,so.notes,s.name AS supplier_name,
        COALESCE(json_agg(json_build_object('id',i.id,'product_id',i.product_id,'reference',i.reference,'description',i.description,'quantity_ordered',i.quantity_ordered,'quantity_received',i.quantity_received,'unit_cost',i.unit_cost)) FILTER (WHERE i.id IS NOT NULL),'[]'::json) AS items
       FROM supplier_orders so JOIN suppliers s ON s.id=so.supplier_id
       LEFT JOIN supplier_order_items i ON i.supplier_order_id=so.id
       GROUP BY so.id,s.name ORDER BY so.created_at DESC LIMIT 200`
    );
    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des commandes fournisseurs impossible." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await requireStaff("storekeeper");
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = createSchema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const supplier = await client.query("SELECT id FROM suppliers WHERE id=$1 AND is_active=true FOR SHARE", [data.supplierId]);
    if (!supplier.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Fournisseur introuvable ou inactif." }, { status: 404 });
    }

    let subtotal = 0;
    for (const item of data.items) {
      if (item.productId) {
        const product = await client.query("SELECT id FROM products WHERE id=$1 FOR SHARE", [item.productId]);
        if (!product.rowCount) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Une pièce de la commande est introuvable." }, { status: 404 });
        }
      }
      subtotal += item.quantity * item.unitCost;
    }

    const orderNumber = "KIA-PO-" + new Date().toISOString().slice(0,10).replaceAll("-","") + "-" + randomUUID().slice(0,6).toUpperCase();
    const order = await client.query(
      "INSERT INTO supplier_orders(supplier_id,order_number,status,ordered_at,expected_at,currency,subtotal,notes,created_by) VALUES($1,$2,'draft',NULL,$3,$4,$5,$6,$7) RETURNING id,order_number,status,subtotal,currency",
      [data.supplierId,orderNumber,data.expectedAt || null,data.currency,subtotal,data.notes || null,actor.id]
    );

    for (const item of data.items) {
      await client.query(
        "INSERT INTO supplier_order_items(supplier_order_id,product_id,reference,description,quantity_ordered,unit_cost) VALUES($1,$2,$3,$4,$5,$6)",
        [order.rows[0].id,item.productId || null,item.reference || null,item.description,item.quantity,item.unitCost]
      );
    }

    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'create','supplier_order',$2,$3::jsonb,$4)",
      [actor.id,order.rows[0].id,JSON.stringify({...order.rows[0],supplierId:data.supplierId,itemCount:data.items.length}),"Création d’un bon de commande fournisseur"]
    );
    await client.query("COMMIT");
    return NextResponse.json({ order: order.rows[0] }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Données de commande fournisseur invalides." }, { status: 400 });
    return NextResponse.json({ error: "Création du bon de commande impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(req: Request) {
  const actor = await requireStaff("storekeeper");
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = updateSchema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const current = await client.query("SELECT id,order_number,status FROM supplier_orders WHERE id=$1 FOR UPDATE", [data.id]);
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Bon de commande introuvable." }, { status: 404 });
    }
    const status = String(current.rows[0].status);

    if (data.action === "mark_sent") {
      if (status !== "draft") {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Seul un brouillon peut être marqué comme envoyé." }, { status: 409 });
      }
      await client.query("UPDATE supplier_orders SET status='sent',ordered_at=now(),updated_at=now() WHERE id=$1", [data.id]);
    } else if (data.action === "cancel") {
      if (!["draft","sent"].includes(status)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Cette commande ne peut plus être annulée après réception." }, { status: 409 });
      }
      await client.query("UPDATE supplier_orders SET status='cancelled',updated_at=now() WHERE id=$1", [data.id]);
    } else {
      if (!["sent","partially_received"].includes(status)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "La commande doit être envoyée avant sa réception." }, { status: 409 });
      }
      for (const receipt of data.items) {
        const item = await client.query(
          "SELECT id,product_id,description,quantity_ordered,quantity_received,unit_cost FROM supplier_order_items WHERE id=$1 AND supplier_order_id=$2 FOR UPDATE",
          [receipt.itemId,data.id]
        );
        if (!item.rowCount) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Une ligne de réception n’appartient pas à cette commande." }, { status: 404 });
        }
        const row = item.rows[0];
        const outstanding = Number(row.quantity_ordered) - Number(row.quantity_received);
        if (receipt.quantity > outstanding) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "La quantité reçue dépasse la quantité encore attendue pour " + row.description + "." }, { status: 409 });
        }
        await client.query("UPDATE supplier_order_items SET quantity_received=quantity_received+$1 WHERE id=$2", [receipt.quantity,row.id]);
        if (row.product_id) {
          const product = await client.query("SELECT id,stock_quantity FROM products WHERE id=$1 AND is_active=true FOR UPDATE", [row.product_id]);
          if (!product.rowCount) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "La pièce liée à une réception est introuvable ou inactive." }, { status: 409 });
          }
          const nextStock = Number(product.rows[0].stock_quantity) + receipt.quantity;
          await client.query("UPDATE products SET stock_quantity=$1,updated_at=now() WHERE id=$2", [nextStock,row.product_id]);
          await client.query(
            "INSERT INTO inventory_movements(product_id,movement_type,quantity,unit_cost,reason,reference_type,reference_id,document_number,created_by) VALUES($1,'receipt',$2,$3,$4,'supplier_order',$5,$6,$7)",
            [row.product_id,receipt.quantity,row.unit_cost,"Réception du bon fournisseur "+current.rows[0].order_number,data.id,current.rows[0].order_number,actor.id]
          );
        }
      }
      const remaining = await client.query(
        "SELECT count(*) FILTER (WHERE quantity_received < quantity_ordered)::int AS open_lines FROM supplier_order_items WHERE supplier_order_id=$1",
        [data.id]
      );
      const nextStatus = Number(remaining.rows[0].open_lines) === 0 ? "received" : "partially_received";
      await client.query(
        "UPDATE supplier_orders SET status=$1,received_at=CASE WHEN $1='received' THEN now() ELSE received_at END,updated_at=now() WHERE id=$2",
        [nextStatus,data.id]
      );
    }

    const updated = await client.query("SELECT id,order_number,status,ordered_at,expected_at,received_at,subtotal,currency FROM supplier_orders WHERE id=$1", [data.id]);
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'supplier_order_update','supplier_order',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,data.id,JSON.stringify({status}),JSON.stringify(updated.rows[0]),data.action]
    );
    await client.query("COMMIT");
    return NextResponse.json({ order: updated.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Modification de commande fournisseur invalide." }, { status: 400 });
    return NextResponse.json({ error: "Mise à jour de la commande fournisseur impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}
