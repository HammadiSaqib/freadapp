-- Create JKA Consulting Affiliate and 2-Month Trial Plan
-- Run this in phpMyAdmin or MySQL CLI

-- Step 1: Create the affiliate if not exists
INSERT IGNORE INTO affiliates 
    (admin_id, email, password_hash, first_name, last_name, company_name, status, email_verified, created_at, updated_at)
VALUES 
    (1, 'support@jka-consulting.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G', 'JKA', 'Consulting', 'JKA Consulting', 'active', 1, NOW(), NOW());

-- Step 2: Get the affiliate ID
SET @affiliate_id = (SELECT id FROM affiliates WHERE email = 'support@jka-consulting.com' LIMIT 1);

-- Step 3: Create 2-month trial plan (skip if already exists)
INSERT IGNORE INTO affiliates_trial_plans 
    (affiliate_id, duration_months, status, start_date, end_date, created_by, created_at, updated_at)
VALUES 
    (@affiliate_id, 2, 'active', NULL, NULL, 1, NOW(), NOW());

-- Step 4: Show what was created
SELECT 
    a.id AS affiliate_id,
    a.email AS affiliate_email,
    a.first_name,
    a.last_name,
    a.company_name,
    a.status AS affiliate_status,
    atp.id AS trial_plan_id,
    atp.duration_months,
    atp.status AS plan_status
FROM affiliates a
LEFT JOIN affiliates_trial_plans atp ON atp.affiliate_id = a.id
WHERE a.email = 'support@jka-consulting.com';
