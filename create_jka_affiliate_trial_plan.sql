-- SQL Script to create affiliate and 2-month trial plan
-- Affiliate email: support@jka-consulting.com
-- Duration: 2 months

-- First check if affiliate exists
SET @affiliate_email = 'support@jka-consulting.com';
SET @admin_id = 1; -- Super admin ID
SET @password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G'; -- bcrypt hash for 'password123'

-- Check if affiliate already exists
SELECT id INTO @affiliate_id FROM affiliates WHERE email = @affiliate_email LIMIT 1;

-- If affiliate doesn't exist, create it
SET @affiliate_id = IFNULL(@affiliate_id, NULL);

-- Insert affiliate if not exists (using INSERT IGNORE for safety)
INSERT IGNORE INTO affiliates 
    (admin_id, email, password_hash, first_name, last_name, company_name, status, email_verified, created_at, updated_at)
VALUES 
    (@admin_id, @affiliate_email, @password_hash, 'JKA', 'Consulting', 'JKA Consulting', 'active', TRUE, NOW(), NOW());

-- Get the affiliate ID (either existing or newly created)
SET @affiliate_id = (SELECT id FROM affiliates WHERE email = @affiliate_email LIMIT 1);

-- Check if trial plan already exists for this affiliate
SET @existing_plan = (SELECT id FROM affiliates_trial_plans WHERE affiliate_id = @affiliate_id LIMIT 1);

-- Create trial plan with 2 months duration (only if doesn't exist)
INSERT INTO affiliates_trial_plans 
    (affiliate_id, duration_months, status, start_date, end_date, created_by, created_at, updated_at)
SELECT 
    @affiliate_id, 
    2, 
    'active', 
    NULL, 
    NULL, 
    @admin_id, 
    NOW(), 
    NOW()
WHERE @existing_plan IS NULL;

-- Show results
SELECT 
    a.id AS affiliate_id,
    a.email AS affiliate_email,
    a.first_name,
    a.last_name,
    a.company_name,
    a.status AS affiliate_status,
    atp.id AS trial_plan_id,
    atp.duration_months,
    atp.status AS plan_status,
    atp.created_at AS plan_created
FROM affiliates a
LEFT JOIN affiliates_trial_plans atp ON atp.affiliate_id = a.id
WHERE a.email = @affiliate_email;
