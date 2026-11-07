import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  items: z.array(z.object({
    productId: z.uuid(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(30),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  customerPhone: z.string().trim().min(5).max(40),
  shippingAddress: z.object({
    line1: z.string().trim().min(4).max(180),
    city: z.string().trim().min(2).max(100),
    postalCode: z.string().trim().max(20),
    country: z.string().trim().min(2).max(80),
  }),
  notes: z.string().trim().max(1000).optional(),
});

class OrderValidationError extends Error {}

export async function POST(req: Request) {
  let client;
  try {
    const data = schema.parse(await req.json());
    const user = await getSession();
    const quantities = new Map<string, number>();

    for (const item of data.items) {
      const total = (quantities.get(item.productId) || 0) + item.quantity;
      if (total > 20) throw new OrderValidationError("Quantité maximale dépassée pour une même pièce.");
      quantities.set(item.productId, total);
    }

    const normalizedItems = [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
    const customerEmail = user?.email || data.customerEmail;
    const customerName = user?.fullName || data.customerName;

    client = await db.connect();
    await client.query("BEGIN");

    await client.query(`
      WITH expired AS (
        UPDATE stock_reservations
        SET status='expired',updated_at=now()
        WHERE status='reserved' AND expires_at IS NOT NULL AND expires_at <= now()
        RETURNING product_id,quantity
      )
      UPDATE products p
      SET reserved_quantity=GREATEST(0,p.reserved_quantity-expired.quantity)
      FROM (
        SELECT product_id,sum(quantity)::int AS quantity
        FROM expired GROUP BY product_id
      ) expired
      WHERE p.id=expired.product_id
    `);

    const ids = normalizedItems.map(item => item.productId);
    const locked = await client.query(
      "SELECT id,sku,name,price,currency,stock_quantity,reserved_quantity,purchase_price FROM products WHERE id=ANY($1::uuid[]) AND is_active=true FOR UPDATE",
      [ids]
    );

    if (locked.rows.length !== ids.length) {
      throw new OrderValidationError("Une pièce du panier n'est plus disponible.");
    }

    const byId = new Map(locked.rows.map((product: any) => [product.id, product]));
    let subtotal = 0;
    const rows = normalizedItems.map(item => {
      const product = byId.get(item.productId);
      if (!product || Number(product.stock_quantity) - Number(product.reserved_quantity) < item.quantity) {
        throw new OrderValidationError("Stock disponible insuffisant pour " + (product?.name || "une pièce") + ".");
      }
      const unit = Number(product.price);
      subtotal += unit * item.quantity;
      return { ...item, product, unit, line: unit * item.quantity };
    });

    const currency = rows[0].product.currency;
    if (rows.some(item => item.product.currency !== currency)) {
      throw new OrderValidationError("Le panier contient plusieurs devises.");
    }

    const garage = await client.query("SELECT id FROM garages WHERE is_active=true LIMIT 1 FOR SHARE");
    if (!garage.rowCount) throw new OrderValidationError("Le garage KIA PIÈCE n’est pas configuré.");

    const orderNumber = "KP-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + randomUUID().slice(0, 6).toUpperCase();
    const inserted = await client.query(
      "INSERT INTO orders(order_number,user_id,customer_name,customer_email,customer_phone,shipping_address,subtotal,shipping_fee,total,currency,notes,garage_id) VALUES($1,$2,$3,$4,$5,$6,$7,0,$7,$8,$9,$10) RETURNING id,order_number,total,currency",
      [orderNumber, user?.id || null, customerName, customerEmail, data.customerPhone, JSON.stringify(data.shippingAddress), subtotal, currency, data.notes || null, garage.rows[0].id]
    );

    for (const item of rows) {
      await client.query(
        "INSERT INTO order_items(order_id,product_id,sku,product_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [inserted.rows[0].id, item.productId, item.product.sku, item.product.name, item.quantity, item.unit, item.line]
      );
      await client.query(
        "UPDATE products SET reserved_quantity=reserved_quantity+$1,updated_at=now() WHERE id=$2",
        [item.quantity,item.productId]
      );
      await client.query(
        "INSERT INTO stock_reservations(product_id,order_id,quantity,status,expires_at,created_by) VALUES($1,$2,$3,'reserved',now()+interval '24 hours',$4)",
        [item.productId,inserted.rows[0].id,item.quantity,user?.id || null]
      );
    }
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'create','order',$2,$3::jsonb,$4)",
      [user?.id || null,inserted.rows[0].id,JSON.stringify(inserted.rows[0]),"Commande client enregistrée"]
    );

    await client.query("COMMIT");
    return NextResponse.json({ order: inserted.rows[0] }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Informations de commande incomplètes." }, { status: 400 });
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Do not expose database errors, SQL details, or infrastructure information to customers.
    return NextResponse.json({ error: "Commande impossible pour le moment. Réessayez ultérieurement." }, { status: 500 });
  } finally {
    client?.release();
  }
}
