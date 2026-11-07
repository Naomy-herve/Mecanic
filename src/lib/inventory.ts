import { query } from "@/lib/db";

/**
 * Release expired order reservations once, and subtract their quantities from
 * each product's reserved balance. Safe to call before public/admin stock reads.
 */
export async function releaseExpiredStockReservations() {
  await query(`
    WITH expired AS (
      UPDATE stock_reservations
      SET status='expired',updated_at=now()
      WHERE status='reserved' AND expires_at IS NOT NULL AND expires_at <= now()
      RETURNING product_id,quantity
    )
    UPDATE products p
    SET reserved_quantity=GREATEST(0,p.reserved_quantity-expired_totals.quantity),updated_at=now()
    FROM (
      SELECT product_id,sum(quantity)::int AS quantity
      FROM expired
      GROUP BY product_id
    ) expired_totals
    WHERE p.id=expired_totals.product_id
  `);
}
