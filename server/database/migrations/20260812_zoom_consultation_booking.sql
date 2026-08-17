CREATE TABLE IF NOT EXISTS meeting_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/New_York',
  slot_duration_minutes TINYINT UNSIGNED NOT NULL DEFAULT 30,
  booking_window_days SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  minimum_notice_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 120,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_meeting_duration_30 CHECK (slot_duration_minutes = 30)
);

INSERT IGNORE INTO meeting_settings
  (id, timezone, slot_duration_minutes, booking_window_days, minimum_notice_minutes, active)
VALUES (1, 'America/New_York', 30, 60, 120, TRUE);

CREATE TABLE IF NOT EXISTS meeting_availability (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  day_of_week TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meeting_availability_day (day_of_week, active),
  CONSTRAINT chk_meeting_availability_day CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT chk_meeting_availability_range CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS meeting_blocked_dates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  blocked_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meeting_blocked_date (blocked_date),
  CONSTRAINT chk_meeting_blocked_range CHECK (
    (start_time IS NULL AND end_time IS NULL) OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE TABLE IF NOT EXISTS consultation_appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  booking_source ENUM('admin_dashboard', 'public_website') NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  company_name VARCHAR(180) NULL,
  meeting_reason VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  start_datetime_utc DATETIME NOT NULL,
  end_datetime_utc DATETIME NOT NULL,
  timezone VARCHAR(100) NOT NULL,
  status ENUM('pending_zoom', 'confirmed', 'completed', 'cancelled', 'no_show', 'zoom_failed') NOT NULL DEFAULT 'pending_zoom',
  active_slot_key VARCHAR(40) NULL,
  idempotency_key VARCHAR(100) NOT NULL,
  zoom_meeting_id VARCHAR(100) NULL,
  zoom_meeting_uuid VARCHAR(255) NULL,
  zoom_join_url TEXT NULL,
  zoom_start_url TEXT NULL,
  cancellation_token_hash CHAR(64) NOT NULL,
  reschedule_token_hash CHAR(64) NOT NULL,
  admin_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelled_at DATETIME NULL,
  UNIQUE KEY uq_consultation_active_slot (active_slot_key),
  UNIQUE KEY uq_consultation_idempotency (idempotency_key),
  UNIQUE KEY uq_consultation_cancel_token (cancellation_token_hash),
  UNIQUE KEY uq_consultation_reschedule_token (reschedule_token_hash),
  INDEX idx_consultation_admin (admin_id, start_datetime_utc),
  INDEX idx_consultation_status_start (status, start_datetime_utc)
);

INSERT INTO meeting_availability (day_of_week, start_time, end_time, active)
SELECT weekday, '09:00:00', '17:00:00', TRUE
FROM (
  SELECT 1 AS weekday UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) weekdays
WHERE NOT EXISTS (SELECT 1 FROM meeting_availability LIMIT 1);
