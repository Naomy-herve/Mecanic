import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    // Always scope the query to the authenticated account; never accept a user ID from the URL.
    const result = await query(
      `SELECT
        o.id,
        o.order_number,
        o.status,
        o.total,
        o.currency,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'name', i.product_name,
              'sku', i.sku,
              'quantity', i.quantity,
              'lineTotal', i.line_total
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      LEFT JOIN order_items i ON i.order_id = o.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 100`,
      [user.id]
    );

    return NextResponse.json({ orders: result.rows });
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger votre historique de commandes pour le moment." },
      { status: 500 }
    );
  }
}
