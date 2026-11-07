import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  if (!await requireStaff("seller")) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.created_at,
        COUNT(DISTINCT o.id)::int AS order_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT 500`
    );
    return NextResponse.json({ customers: result.rows });
  } catch {
    return NextResponse.json(
      { error: "Impossible de charger les clients pour le moment." },
      { status: 500 }
    );
  }
}
