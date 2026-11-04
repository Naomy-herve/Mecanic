import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug || slug.length > 160) {
    return NextResponse.json({ error: "Référence de pièce invalide." }, { status: 400 });
  }
  try {
    const result = await query(
      `SELECT p.id, p.sku, p.name, p.slug, p.price, p.currency, p.stock_quantity,
              p.condition, p.image_url, e.notes
       FROM products base
       JOIN product_equivalents e
         ON (e.product_id = base.id OR e.equivalent_product_id = base.id)
        AND e.verified = true
       JOIN products p
         ON p.id = CASE WHEN e.product_id = base.id THEN e.equivalent_product_id ELSE e.product_id END
       WHERE base.slug = $1 AND base.is_active = true AND p.is_active = true
       ORDER BY p.name
       LIMIT 30`,
      [slug]
    );
    return NextResponse.json({ equivalents: result.rows });
  } catch {
    return NextResponse.json({ error: "Équivalences momentanément indisponibles." }, { status: 503 });
  }
}
