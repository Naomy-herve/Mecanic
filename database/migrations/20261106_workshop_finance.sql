-- KIA PIECE: workshop, quotations, invoicing, payment and audit extensions.
-- Additive migration, initially applied to the Neon development branch.

CREATE TABLE IF NOT EXISTS appointments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
 customer_vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL,
 service_type TEXT NOT NULL, description TEXT, requested_at TIMESTAMPTZ NOT NULL,
 scheduled_start TIMESTAMPTZ, scheduled_end TIMESTAMPTZ,
 assigned_mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','in_progress','completed','cancelled','no_show')),
 customer_notes TEXT, internal_notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start)
);

CREATE TABLE IF NOT EXISTS workshop_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), job_number TEXT NOT NULL UNIQUE,
 customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
 customer_vehicle_id UUID REFERENCES customer_vehicles(id) ON DELETE SET NULL,
 appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(), odometer_km INTEGER,
 intake_condition TEXT, intake_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
 symptoms TEXT, diagnosis TEXT, recommendations TEXT,
 status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','diagnosis','quote_pending','approved','in_repair','quality_check','completed','delivered','cancelled')),
 assigned_mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
 estimated_completion_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ,
 customer_approval_at TIMESTAMPTZ, customer_approval_note TEXT, internal_notes TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_diagnostics (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workshop_job_id UUID NOT NULL REFERENCES workshop_jobs(id) ON DELETE CASCADE,
 symptom TEXT, checks_performed TEXT, fault_codes TEXT[], findings TEXT NOT NULL,
 recommendation TEXT, diagnosed_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_operations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workshop_job_id UUID NOT NULL REFERENCES workshop_jobs(id) ON DELETE CASCADE,
 description TEXT NOT NULL, labor_minutes INTEGER, labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
 mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workshop_job_parts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workshop_job_id UUID NOT NULL REFERENCES workshop_jobs(id) ON DELETE CASCADE,
 product_id UUID REFERENCES products(id) ON DELETE RESTRICT, description TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
 inventory_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quote_number TEXT NOT NULL UNIQUE,
 customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
 order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
 workshop_job_id UUID REFERENCES workshop_jobs(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','expired','converted')),
 currency CHAR(3) NOT NULL DEFAULT 'MGA',
 subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, discount NUMERIC(12,2) NOT NULL DEFAULT 0,
 tax_total NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0,
 valid_until DATE, sent_at TIMESTAMPTZ, approved_at TIMESTAMPTZ, approval_note TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quote_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
 product_id UUID REFERENCES products(id) ON DELETE SET NULL,
 item_type TEXT NOT NULL DEFAULT 'part' CHECK (item_type IN ('part','labor','service','other')),
 description TEXT NOT NULL, quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
 unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
 line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE TABLE IF NOT EXISTS invoices (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number TEXT NOT NULL UNIQUE,
 customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
 order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
 workshop_job_id UUID REFERENCES workshop_jobs(id) ON DELETE SET NULL,
 quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','partially_paid','paid','void','refunded')),
 currency CHAR(3) NOT NULL DEFAULT 'MGA', subtotal NUMERIC(12,2) NOT NULL,
 tax_total NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL,
 amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0, issued_at TIMESTAMPTZ, due_at TIMESTAMPTZ, notes TEXT,
 created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
 description TEXT NOT NULL, quantity NUMERIC NOT NULL CHECK (quantity > 0),
 unit_price NUMERIC NOT NULL CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
 order_id UUID REFERENCES orders(id) ON DELETE SET NULL, invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
 amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), currency CHAR(3) NOT NULL DEFAULT 'MGA',
 method TEXT NOT NULL CHECK (method IN ('cash','bank_transfer','cash_on_delivery','mvola','orange_money','airtel_money','other')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','refunded')),
 transaction_reference TEXT, paid_at TIMESTAMPTZ,
 verified_by UUID REFERENCES users(id) ON DELETE SET NULL, verified_at TIMESTAMPTZ,
 verification_note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), garage_id UUID REFERENCES garages(id) ON DELETE SET NULL,
 category TEXT NOT NULL, description TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
 currency CHAR(3) NOT NULL DEFAULT 'MGA', expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
 supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL, payment_method TEXT,
 document_reference TEXT, created_by UUID REFERENCES users(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 channel TEXT NOT NULL CHECK (channel IN ('in_app','email','whatsapp','sms')),
 event_type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','read','cancelled')),
 related_type TEXT, related_id UUID, sent_at TIMESTAMPTZ, read_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
 user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 order_updates BOOLEAN NOT NULL DEFAULT true, repair_updates BOOLEAN NOT NULL DEFAULT true,
 appointment_reminders BOOLEAN NOT NULL DEFAULT true, invoice_updates BOOLEAN NOT NULL DEFAULT true,
 marketing_messages BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
 action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
 before_data JSONB, after_data JSONB, reason TEXT, ip_hash TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garage_files (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), garage_id UUID REFERENCES garages(id) ON DELETE SET NULL,
 owner_id UUID REFERENCES users(id) ON DELETE SET NULL, related_type TEXT NOT NULL,
 related_id UUID, file_url TEXT NOT NULL, file_name TEXT, mime_type TEXT, size_bytes BIGINT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_schedule_idx ON appointments(scheduled_start,scheduled_end,status);
CREATE INDEX IF NOT EXISTS workshop_jobs_status_idx ON workshop_jobs(status,created_at DESC);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type,entity_id,created_at DESC);

-- The invoice line table is extended additively so the migration can be rerun safely.
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'part';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS line_total NUMERIC(12,2) NOT NULL DEFAULT 0;
