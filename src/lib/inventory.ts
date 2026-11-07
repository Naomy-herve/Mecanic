import { query } from "@/lib/db";

/**
 * Release expired order reservations, restore available stock, and cancel
 * pending orders whose reservations have all expired.
 */
export async function releaseExpiredStockReservations() {
  await query(`
    WITH expired AS (
      UPDATE stock_reservations
      SET status='expired',updated_at=now()
      WHERE status='reserved' AND expires_at IS NOT NULL AND expires_at <= now()
      RETURNING id,product_id,quantity,order_id
    ),
    adjusted AS (
      UPDATE products p
      SET reserved_quantity=GREATEST(0,p.reserved_quantity-expired_totals.quantity),updated_at=now()
      FROM (
        SELECT product_id,sum(quantity)::int AS quantity
        FROM expired
        GROUP BY product_id
      ) expired_totals
      WHERE p.id=expired_totals.product_id
      RETURNING p.id
    ),
    cancelled_orders AS (
      UPDATE orders o
      SET status='cancelled',cancelled_at=now(),updated_at=now()
      WHERE o.status='pending'
        AND o.id IN (SELECT order_id FROM expired WHERE order_id IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1 FROM stock_reservations sr
          WHERE sr.order_id=o.id AND sr.status='reserved'
        )
      RETURNING o.id,o.order_number
    ),
    logged AS (
      INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,after_data,reason)
      SELECT NULL,'reservation_expired','order',id,
        jsonb_build_object('status','cancelled','orderNumber',order_number),
        'Réservation de stock expirée'
      FROM cancelled_orders
      RETURNING id
    )
    SELECT
      (SELECT count(*) FROM expired) AS expired_reservations,
      (SELECT count(*) FROM adjusted) AS products_updated,
      (SELECT count(*) FROM cancelled_orders) AS orders_cancelled,
      (SELECT count(*) FROM logged) AS audit_entries
  `);
}
