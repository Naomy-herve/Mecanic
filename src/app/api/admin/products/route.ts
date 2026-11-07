import { NextResponse } from "next/server";
import { z } from "zod";
import { db, query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  sku: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).default(""),
  categoryId: z.string().uuid().nullable().optional(),
  price: z.coerce.number().finite().nonnegative(),
  currency: z.enum(["MGA", "EUR", "USD"]).default("MGA"),
  stockQuantity: z.coerce.number().int().nonnegative(),
  minimumStock: z.coerce.number().int().nonnegative().default(0),
  purchasePrice: z.preprocess(value => value === "" ? null : value, z.coerce.number().finite().nonnegative().nullable().optional()),
  taxRate: z.preprocess(value => value === "" ? null : value, z.coerce.number().min(0).max(100).nullable().optional()),
  warrantyMonths: z.preprocess(value => value === "" ? null : value, z.coerce.number().int().nonnegative().nullable().optional()),
  origin: z.string().trim().max(120).nullable().optional(),
  condition: z.enum(["new", "used", "refurbished"]).default("new"),
  imageUrl: z.string().url().nullable().optional(),
  manufacturer: z.string().trim().max(120).nullable().optional(),
  manufacturerPartNumber: z.string().trim().max(120).nullable().optional(),
  oemReference: z.string().trim().max(120).nullable().optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const result = await query("SELECT p.*,c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.created_at DESC LIMIT 200");
    return NextResponse.json({ products: result.rows });
  } catch {
    return NextResponse.json({ error: "Chargement des pièces impossible." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const data = schema.parse(await req.json());
    client = await db.connect();
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO products(sku,name,slug,description,category_id,price,currency,stock_quantity,minimum_stock,purchase_price,tax_rate,warranty_months,origin,condition,image_url,manufacturer,manufacturer_part_number,oem_reference) VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id,sku,name,slug,stock_quantity",
      [data.sku,data.name,data.slug,data.description,data.categoryId || null,data.price,data.currency,data.minimumStock,data.purchasePrice ?? null,data.taxRate ?? null,data.warrantyMonths ?? null,data.origin || null,data.condition,data.imageUrl || null,data.manufacturer || null,data.manufacturerPartNumber || null,data.oemReference || null]
    );
    const product = inserted.rows[0];
    if (data.stockQuantity > 0) {
      await client.query("UPDATE products SET stock_quantity=$1 WHERE id=$2", [data.stockQuantity, product.id]);
      await client.query(
        "INSERT INTO inventory_movements(product_id,movement_type,quantity,unit_cost,reason,created_by) VALUES($1,'receipt',$2,$3,$4,$5)",
        [product.id,data.stockQuantity,data.purchasePrice ?? null,"Stock initial enregistré à la création",actor.id]
      );
    }
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'create','product',$2,$3::jsonb,$4)",
      [actor.id,product.id,JSON.stringify({...product,stock_quantity:data.stockQuantity,minimum_stock:data.minimumStock}),"Création de référence"]
    );
    await client.query("COMMIT");
    return NextResponse.json({ product: {...product,stock_quantity:data.stockQuantity} }, { status: 201 });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Données de pièce invalides." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Cette référence ou ce slug existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "Création de la pièce impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PATCH(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  let client: import("pg").PoolClient | undefined;
  try {
    const body = await req.json();
    const id = z.uuid().parse(body.id);
    const data = schema.parse(body.product);
    client = await db.connect();
    await client.query("BEGIN");
    const current = await client.query("SELECT id,stock_quantity FROM products WHERE id=$1 FOR UPDATE", [id]);
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pièce introuvable." }, { status: 404 });
    }
    if (Number(current.rows[0].stock_quantity) !== data.stockQuantity) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Le stock ne se modifie pas depuis la fiche produit. Utilisez les mouvements de stock pour conserver l’historique." },
        { status: 409 }
      );
    }
    const updated = await client.query(
      "UPDATE products SET sku=$1,name=$2,slug=$3,description=$4,category_id=$5,price=$6,currency=$7,minimum_stock=$8,purchase_price=$9,tax_rate=$10,warranty_months=$11,origin=$12,condition=$13,image_url=$14,manufacturer=$15,manufacturer_part_number=$16,oem_reference=$17,updated_at=now() WHERE id=$18 RETURNING id,sku,name,slug,stock_quantity",
      [data.sku,data.name,data.slug,data.description,data.categoryId || null,data.price,data.currency,data.minimumStock,data.purchasePrice ?? null,data.taxRate ?? null,data.warrantyMonths ?? null,data.origin || null,data.condition,data.imageUrl || null,data.manufacturer || null,data.manufacturerPartNumber || null,data.oemReference || null,id]
    );
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,before_data,after_data,reason) VALUES($1,'update','product',$2,$3::jsonb,$4::jsonb,$5)",
      [actor.id,id,JSON.stringify(current.rows[0]),JSON.stringify({...updated.rows[0],minimum_stock:data.minimumStock}),"Modification de la fiche produit"]
    );
    await client.query("COMMIT");
    return NextResponse.json({ product: updated.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Données de pièce invalides." }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Cette référence ou ce slug existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "Modification de la pièce impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function DELETE(req: Request) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  let client: import("pg").PoolClient | undefined;
  try {
    client = await db.connect();
    await client.query("BEGIN");
    const result = await client.query("UPDATE products SET is_active=false,updated_at=now() WHERE id=$1 AND is_active=true RETURNING id,sku,name", [id]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Pièce introuvable ou déjà masquée." }, { status: 404 });
    }
    await client.query(
      "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason) VALUES($1,'deactivate','product',$2,$3::jsonb,$4)",
      [actor.id,id,JSON.stringify(result.rows[0]),"Référence masquée du catalogue"]
    );
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Masquage de la pièce impossible." }, { status: 500 });
  } finally {
    client?.release();
  }
}
