-- Create affiliate with email support@jka-consulting.com if not exists
-- Then create a 2-month trial plan for that affiliate

-- First, check if affiliate exists and get ID, or create new one
SET @affiliate_email = 'support@jka-consulting.com';
SET @affiliate_id = (SELECT id FROM affiliates WHERE email = @affiliate_email LIMIT 1);

-- If affiliate doesn't exist, create it
IF @affiliate_id IS NULL THEN
    INSERT INTO affiliates (email, first_name, last_name, status, created_at, updated_at)
    VALUES (@affiliate_email, 'JKA', 'Consulting', 'active', NOW(), NOW());
    SET @affiliate_id = LAST_INSERT_ID();
END IF;

-- Create the trial plan with 2 months duration
INSERT INTO affiliates_trial_plans 
    (affiliate_id, duration_months, status, start_date, end_date, created_by, created_at, updated_at)
VALUES 
    (@affiliate_id, 2, 'active', NULL, NULL, 1, NOW(), NOW());

SELECT 
    atp.id AS plan_id,
    atp.affiliate_id,
    a.email AS affiliate_email,
    atp.duration_months,
    atp.status,
    atp.created_at
FROM affiliates_trial_plans atp
JOIN affiliates a ON a.id = atp.affiliate_id
WHERE a.email = @affiliate_email;
