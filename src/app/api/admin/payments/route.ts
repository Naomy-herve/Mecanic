import { NextResponse } from "next/server";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  invoiceId: z.uuid().nullable().optional(),
  orderId: z.uuid().nullable().optional(),
  amount: z.coerce.number().finite().positive(),
  currency: z.enum(["MGA", "EUR", "USD"]).default("MGA"),
  method: z.enum(["cash", "bank_transfer", "cash_on_delivery", "mvola", "orange_money", "airtel_money", "other"]),
  transactionReference: z.string().trim().max(160).optional(),
}).refine(data => Boolean(data.invoiceId || data.orderId), {
  message: "Un paiement doit être associé à une facture ou une commande.",
});

const updateSchema = z.object({
  id: z.uuid(),
  status: z.enum(["verified", "rejected", "refunded"]),
  note: z.string().trim().max(500).optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query(
      "SELECT p.*,u.full_name AS customer_name,i.invoice_number,o.order_number FROM payments p LEFT JOIN users u ON u.id=p.customer_id LEFT JOIN invoices i ON i.id=p.invoice_id LEFT JOIN orders o ON o.id=p.order_id ORDER BY p.created_at DESC LIMIT 300"
    );
    return NextResponse.json({ payments: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des paiements impossible." }, { status: 500 });
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

    let invoice: { id: string; customer_id: string | null; order_id: string | null; total: string; currency: string; status: string } | null = null;
    if (data.invoiceId) {
      const result = await client.query(
        "SELECT id,customer_id,order_id,total,currency,status FROM invoices WHERE id=$1 FOR UPDATE",
        [data.invoiceId]
      );
      invoice = result.rows[0] ?? null;
      if (!invoice) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
      }
      if (["void", "refunded"].includes(invoice.status)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Cette facture ne peut plus recevoir de paiement." }, { status: 409 });
      }
    }

    if (data.invoiceId && data.orderId && invoice?.order_id !== data.orderId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La facture ne correspond pas à cette commande." }, { status: 409 });
    }

    const linkedOrderId = data.orderId ?? invoice?.order_id ?? null;
    let order: { id: string; customer_id: string | null; total: string; currency: string; status: string } | null = null;
    if (linkedOrderId) {
      const result = await client.query(
        "SELECT id,user_id AS customer_id,total,currency,status FROM orders WHERE id=$1 FOR UPDATE",
        [linkedOrderId]
      );
      order = result.rows[0] ?? null;
      if (!order) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
      }
      if (order.status === "cancelled") {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Une commande annulée ne peut plus recevoir de paiement." }, { status: 409 });
      }
    }

    const total = Number(invoice?.total ?? order?.total);
    const expectedCurrency = (invoice?.currency ?? order?.currency ?? "").trim();
    if (!Number.isFinite(total) || expectedCurrency !== data.currency) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "La devise du paiement doit correspondre à celle du document." }, { status: 409 });
    }

    const paidResult = invoice
      ? await client.query("SELECT COALESCE(sum(amount),0)::numeric AS paid FROM payments WHERE invoice_id=$1 AND status='verified'", [invoice.id])
      : await client.query("SELECT COALESCE(sum(amount),0)::numeric AS paid FROM payments WHERE order_id=$1 AND status='verified'", [linkedOrderId]);
    const remaining = Math.max(0, total - Number(paidResult.rows[0].paid));
    if (data.amount > remaining) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Le montant dépasse le solde restant dû." }, { status: 409 });
    }

    const customerId = invoice?.customer_id ?? order?.customer_id ?? null;
    const inserted = await client.query(
      "INSERT INTO payments(customer_id,invoice_id,order_id,amount,currency,method,status,transaction_reference) VALUES($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING id,status,amount,currency,method,invoice_id,order_id",
      [customerId,data.invoiceId || null,linkedOrderId,data.amount,data.currency,data.method,data.transactionReference || null]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data) VALUES($1,'payment_pending','payment',$2,$3::jsonb)",
      [actor.id,inserted.rows[0].id,JSON.stringify(inserted.rows[0])]
    );
    await client.query("COMMIT");
    return NextResponse.json({ payment: inserted.rows[0] }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Données de paiement invalides." }, { status: 400 });
    return NextResponse.json({ error: "Enregistrement du paiement impossible." }, { status: 500 });
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
    const result = await client.query("SELECT * FROM payments WHERE id=$1 FOR UPDATE", [data.id]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    const payment = result.rows[0];
    if (payment.status !== "pending" && payment.status !== data.status) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Ce paiement a déjà été traité." }, { status: 409 });
    }

    await client.query(
      "UPDATE payments SET status=$1,verified_by=$2,verified_at=now(),verification_note=$3 WHERE id=$4",
      [data.status,actor.id,data.note || null,data.id]
    );

    if (payment.invoice_id) {
      const sum = await client.query("SELECT COALESCE(sum(amount),0)::numeric AS paid FROM payments WHERE invoice_id=$1 AND status='verified'", [payment.invoice_id]);
      const invoice = await client.query("SELECT total FROM invoices WHERE id=$1 FOR UPDATE", [payment.invoice_id]);
      if (invoice.rowCount) {
        const paid = Number(sum.rows[0].paid);
        const total = Number(invoice.rows[0].total);
        await client.query(
          "UPDATE invoices SET amount_paid=$1,status=$2,updated_at=now() WHERE id=$3",
          [paid,paid>=total?"paid":paid>0?"partially_paid":"issued",payment.invoice_id]
        );
      }
    }

    if (payment.order_id) {
      const sum = await client.query("SELECT COALESCE(sum(amount),0)::numeric AS paid FROM payments WHERE order_id=$1 AND status='verified'", [payment.order_id]);
      const order = await client.query("SELECT total FROM orders WHERE id=$1 FOR UPDATE", [payment.order_id]);
      if (order.rowCount) {
        const paid = Number(sum.rows[0].paid);
        const total = Number(order.rows[0].total);
        await client.query(
          "UPDATE orders SET payment_status=$1,updated_at=now() WHERE id=$2",
          [paid>=total?"paid":paid>0?"partial":"unpaid",payment.order_id]
        );
      }
    }

    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'payment_status_change','payment',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,data.id,JSON.stringify({status:payment.status}),JSON.stringify({status:data.status}),data.note || null]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, status: data.status });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: error instanceof z.ZodError ? "Modification invalide." : "Validation du paiement impossible." }, { status: error instanceof z.ZodError ? 400 : 500 });
  } finally {
    client?.release();
  }
}
