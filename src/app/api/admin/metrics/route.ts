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
        (SELECT count(*)::int FROM products WHERE is_active = true AND stock_quantity <= 5) AS low_stock_products`
    );
    return NextResponse.json({ metrics: result.rows[0] });
  } catch {
    return NextResponse.json(
      { error: "Indicateurs administrateur momentanément indisponibles." },
      { status: 500 }
    );
  }
}
