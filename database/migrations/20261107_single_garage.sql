-- KIA PIÈCE single-garage deployment.
-- Apply only to the isolated kia-piece-dev branch before production review.
-- The unique constant index makes a second garage record impossible.
CREATE UNIQUE INDEX IF NOT EXISTS garages_singleton_guard ON garages ((true));

INSERT INTO garages (name, phone, email, address, timezone, currency, is_active)
SELECT 'KIA PIÈCE', '0385623528', 'kohlernaomy@gmail.com', '{}'::jsonb, 'Indian/Antananarivo', 'MGA', true
WHERE NOT EXISTS (SELECT 1 FROM garages);

UPDATE users
SET garage_id = (SELECT id FROM garages WHERE is_active = true ORDER BY created_at LIMIT 1)
WHERE role = 'admin' AND garage_id IS NULL;

INSERT INTO schema_migrations(version)
VALUES ('20261107_single_garage')
ON CONFLICT (version) DO NOTHING;
