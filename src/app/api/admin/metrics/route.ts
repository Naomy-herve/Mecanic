import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await query(
      `SELECT
        (SELECT count(*)::int FROM products WHERE is_active = true) AS active_products,
        (SELECT count(*)::int FROM vehicles) AS vehicles,
        (SELECT count(*)::int FROM categories) AS categories,
        (SELECT count(*)::int FROM products WHERE is_active = true AND (stock_quantity - reserved_quantity) <= minimum_stock) AS low_stock_products,
        (SELECT count(*)::int FROM orders) AS total_orders,
        (SELECT count(*)::int FROM orders WHERE status = 'pending') AS pending_orders,
        (SELECT count(*)::int FROM inquiries) AS total_inquiries,
        (SELECT count(*)::int FROM inquiries WHERE status = 'new') AS new_inquiries`
    );
    return NextResponse.json({ metrics: result.rows[0] });
  } catch {
    return NextResponse.json(
      { error: "Indicateurs administrateur momentanément indisponibles." },
      { status: 500 }
    );
  }
}
