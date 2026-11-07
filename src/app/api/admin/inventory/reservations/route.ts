import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { releaseExpiredStockReservations } from "@/lib/inventory";

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    await releaseExpiredStockReservations();
    const result = await query(
      "SELECT r.id,r.quantity,r.status,r.expires_at,r.created_at,p.sku,p.name,o.order_number,o.customer_name FROM stock_reservations r JOIN products p ON p.id=r.product_id LEFT JOIN orders o ON o.id=r.order_id ORDER BY r.created_at DESC LIMIT 300"
    );
    return NextResponse.json({ reservations: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des réservations de stock impossible." }, { status: 500 });
  }
}
