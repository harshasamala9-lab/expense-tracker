-- ===========================================================================
-- DEVELOPMENT / DEMO DATA ONLY
--
-- This file is NOT part of the production migration and must never be run
-- against a production Supabase project unless you intentionally want sample
-- records. It inserts data only when the expenses table is completely empty.
--
-- Usage (local database):
--   psql "$DATABASE_URL" -f database/sample-data.sql
-- ===========================================================================

INSERT INTO expenses (amount, category, description, expense_date)
SELECT *
FROM (
    VALUES
        (28.50,  'Food',     'Lunch with team',        DATE '2026-11-22'),
        (120.00, 'Travel',   'Train tickets',          DATE '2026-11-21'),
        (86.20,  'Food',     'Weekly groceries',       DATE '2026-11-21'),
        (89.99,  'Shopping', 'Running shoes',          DATE '2026-11-20'),
        (78.30,  'Bills',    'Electricity bill',       DATE '2026-11-19'),
        (65.40,  'Travel',   'Fuel',                   DATE '2026-11-18'),
        (149.00, 'Shopping', 'Wireless headphones',    DATE '2026-11-17'),
        (45.00,  'Bills',    'Internet bill',          DATE '2026-11-15'),
        (4.75,   'Food',     'Morning coffee',         DATE '2026-11-12'),
        (1200.00,'Bills',    'Monthly rent',           DATE '2026-11-10'),
        (35.00,  'Other',    'Gym membership',         DATE '2026-11-08'),
        (42.00,  'Food',     'Dinner with friends',    DATE '2026-11-05')
) AS seed(amount, category, description, expense_date)
WHERE NOT EXISTS (SELECT 1 FROM expenses);
