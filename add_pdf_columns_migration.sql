-- Migration: Add PDF file path columns to funding_requests table
-- Date: 2025-01-27
-- Description: Add columns to store file paths for uploaded PDF documents

ALTER TABLE `funding_requests` 
ADD COLUMN `driver_license_file_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path to uploaded driver license PDF file',
ADD COLUMN `ein_confirmation_file_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path to uploaded EIN confirmation letter PDF file',
ADD COLUMN `articles_from_state_file_path` VARCHAR(500) DEFAULT NULL COMMENT 'Path to uploaded articles from state PDF file';

-- Add indexes for better query performance if needed
-- CREATE INDEX idx_funding_requests_driver_license_file ON funding_requests(driver_license_file_path);
-- CREATE INDEX idx_funding_requests_ein_file ON funding_requests(ein_confirmation_file_path);
-- CREATE INDEX idx_funding_requests_articles_file ON funding_requests(articles_from_state_file_path);