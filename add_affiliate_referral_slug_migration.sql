-- Migration: Add referral_slug column to affiliates table
-- Date: 2025-11-20
-- Description: Adds unique slug support for custom referral links

ALTER TABLE `affiliates`
ADD COLUMN `referral_slug` VARCHAR(64) UNIQUE;

-- Optional: create explicit unique index if needed
-- CREATE UNIQUE INDEX `idx_affiliates_referral_slug` ON `affiliates` (`referral_slug`);