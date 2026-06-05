-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 26, 2025 at 02:56 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `creditrepair_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activities`
--

CREATE TABLE `activities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `type` enum('client_added','dispute_filed','score_updated','payment_received','note_added') NOT NULL,
  `description` text NOT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activities`
--

INSERT INTO `activities` (`id`, `user_id`, `client_id`, `type`, `description`, `metadata`, `created_at`) VALUES
(1, 1, 18, 'client_added', 'New client added: test zaid', NULL, '2025-08-25 20:16:52'),
(2, 4, 19, 'client_added', 'New client added: Chucha Ray', NULL, '2025-08-28 19:07:29'),
(3, 47, 20, 'client_added', 'New client added: Adam Smith', NULL, '2025-09-04 01:21:52'),
(4, 4, 21, 'client_added', 'New client added: Ali Badi', NULL, '2025-09-11 17:21:25'),
(5, 4, 22, 'client_added', 'New client added: KRISTA BADI (via myfreescorenow)', NULL, '2025-09-17 17:58:06'),
(6, 4, 23, 'client_added', 'New client added: ENETT LEWIS (via myfreescorenow)', NULL, '2025-09-17 18:09:01'),
(7, 4, 24, 'client_added', 'New client added: SADIO DIAMBOU (via myfreescorenow)', NULL, '2025-09-17 22:43:59'),
(8, 4, 25, 'client_added', 'New client added: DARIUS WALKERSCOTT (via myfreescorenow)', NULL, '2025-09-18 21:55:34'),
(9, 4, 26, 'client_added', 'New client added: ALI BADI (via myfreescorenow)', NULL, '2025-09-18 22:04:58'),
(10, 4, 27, 'client_added', 'New client added: SEQUOYAH CLEVELAND (via myfreescorenow)', NULL, '2025-09-20 02:23:53'),
(11, 4, 32, 'client_added', 'New client added: NICKES DESHOMMES (via myfreescorenow)', NULL, '2025-09-25 02:23:18'),
(12, 4, 33, 'client_added', 'New client added: ALI BADI (via myfreescorenow)', NULL, '2025-10-15 10:32:27'),
(13, 4, 34, 'client_added', 'New client added: KYLE JOBES (via myfreescorenow)', NULL, '2025-10-24 03:11:07'),
(14, 4, 35, 'client_added', 'New client added: MICHELLE CARRASQUILLO (via myfreescorenow)', NULL, '2025-10-25 10:12:12');

-- --------------------------------------------------------

--
-- Table structure for table `admin_notifications`
--

CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL,
  `recipient_id` int(11) NOT NULL,
  `sender_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','error','success','system') NOT NULL DEFAULT 'info',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL,
  `action_url` varchar(500) DEFAULT NULL,
  `action_text` varchar(100) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_profiles`
--

CREATE TABLE `admin_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `access_level` enum('super_admin','admin','manager','support') NOT NULL DEFAULT 'admin',
  `department` varchar(100) DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_activity_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admin_profiles`
--

INSERT INTO `admin_profiles` (`id`, `user_id`, `permissions`, `access_level`, `department`, `title`, `phone`, `emergency_contact`, `notes`, `is_active`, `last_activity_at`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 1, '[\"users.create\",\"users.read\",\"users.update\",\"users.delete\",\"plans.create\",\"plans.read\",\"plans.update\",\"plans.delete\",\"subscriptions.create\",\"subscriptions.read\",\"subscriptions.update\",\"subscriptions.delete\",\"admins.create\",\"admins.read\",\"admins.update\",\"admins.delete\",\"system.settings\",\"system.logs\",\"system.backup\",\"system.maintenance\",\"analytics.view\",\"analytics.export\",\"notifications.send\",\"notifications.manage\"]', 'super_admin', 'Administration', 'Super Administrator', NULL, NULL, NULL, 1, NULL, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `admin_subscriptions`
--

CREATE TABLE `admin_subscriptions` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `billing_cycle` enum('monthly','yearly','lifetime') NOT NULL DEFAULT 'monthly',
  `status` enum('active','inactive','cancelled','expired','pending') NOT NULL DEFAULT 'pending',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT 1,
  `payment_method` varchar(50) DEFAULT NULL,
  `billing_address` text DEFAULT NULL,
  `last_payment_date` date DEFAULT NULL,
  `next_payment_date` date DEFAULT NULL,
  `payment_amount` decimal(10,2) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'USD',
  `trial_end_date` date DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliates`
--

CREATE TABLE `affiliates` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `parent_affiliate_id` int(11) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `plan_type` enum('free','paid_partner') NOT NULL DEFAULT 'free',
  `paid_referrals_count` int(11) NOT NULL DEFAULT 0,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 10.00,
  `parent_commission_rate` decimal(5,2) NOT NULL DEFAULT 5.00,
  `affiliate_level` int(11) NOT NULL DEFAULT 1,
  `total_earnings` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_referrals` int(11) NOT NULL DEFAULT 0,
  `status` enum('active','inactive','pending','suspended') NOT NULL DEFAULT 'pending',
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `failed_login_attempts` int(11) NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_login_ip` varchar(45) DEFAULT NULL,
  `last_login_user_agent` text DEFAULT NULL,
  `password_changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `routing_number` varchar(20) DEFAULT NULL,
  `account_type` enum('checking','savings') DEFAULT 'checking',
  `swift_code` varchar(20) DEFAULT NULL,
  `iban` varchar(50) DEFAULT NULL,
  `bank_address` text DEFAULT NULL,
  `payment_method` enum('bank_transfer','paypal','stripe','check') DEFAULT 'bank_transfer',
  `paypal_email` varchar(255) DEFAULT NULL,
  `stripe_account_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `affiliates`
--

INSERT INTO `affiliates` (`id`, `admin_id`, `parent_affiliate_id`, `email`, `password_hash`, `first_name`, `last_name`, `company_name`, `phone`, `address`, `city`, `state`, `zip_code`, `avatar`, `plan_type`, `paid_referrals_count`, `commission_rate`, `parent_commission_rate`, `affiliate_level`, `total_earnings`, `total_referrals`, `status`, `email_verified`, `failed_login_attempts`, `locked_until`, `last_login`, `last_login_ip`, `last_login_user_agent`, `password_changed_at`, `notes`, `created_at`, `updated_at`, `created_by`, `updated_by`, `bio`, `website`, `bank_name`, `account_holder_name`, `account_number`, `routing_number`, `account_type`, `swift_code`, `iban`, `bank_address`, `payment_method`, `paypal_email`, `stripe_account_id`) VALUES
(2, 4, NULL, 'test@trackdiv.com', '$2a$12$sapLyEUwiKM8dEVGzsepR.d.3Vw38SEARqNhQvxQN5ZMETyGIHfmG', 'Test', 'Affliss', 'abc', '002151222', NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'pending', 0, 0, NULL, NULL, NULL, NULL, '2025-08-30 21:30:25', NULL, '2025-08-30 21:30:25', '2025-08-31 16:44:00', NULL, NULL, NULL, NULL, '', '', '', '', '', '', '', '', 'paypal', 'test@trackdiv.com', ''),
(3, 1, NULL, 'test@test123.com', '$2a$12$R.aoGHzBwT5R66xJJ/9UQuVuWXEHmLKZxZ4WJwuRyWCjTo.iE8lwS', 'test', '123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'pending', 0, 0, NULL, NULL, NULL, NULL, '2025-08-31 00:55:09', NULL, '2025-08-31 00:55:09', '2025-08-31 16:44:00', NULL, NULL, NULL, NULL, 'Bank of America', 'Test User', '****5678', '026009593', 'savings', 'BOFAUS3N', '', '100 N Tryon St, Charlotte, NC 28255', 'bank_transfer', '', ''),
(4, 1, NULL, 'haddi@fia.com', '$2a$12$oCpzPinqdf3MkRXnLgKoEOV52Ej/qfvFZvv3e.8eopAa/MEElXHTa', 'haddi', '123', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'active', 0, 0, NULL, '2025-08-31 01:00:57', NULL, NULL, '2025-08-31 00:59:24', NULL, '2025-08-31 00:59:24', '2025-08-31 16:44:00', NULL, NULL, NULL, NULL, '', '', '', '', '', '', '', '', 'stripe', '', 'acct_1234567890'),
(5, 1, NULL, 'affiliate1@example.com', '$2b$10$4IMjEjn0LjSHLohSzxu9X.kVhZ9ZqmnrMmLz.B8NYX0CjQh9yNINW', 'Alex', 'Thompson', 'Thompson Marketing', '+1-555-0101', NULL, NULL, NULL, NULL, NULL, 'free', 0, 15.00, 5.00, 1, 0.00, 12, 'active', 0, 0, NULL, '2025-08-31 01:30:47', NULL, NULL, '2025-08-31 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 16:59:42', NULL, NULL, NULL, NULL, 'Wells Fargo', 'Alex Thompson', '****9012', '121000248', 'checking', 'WFBIUS6S', '', '420 Montgomery St, San Francisco, CA 94104', 'bank_transfer', '', ''),
(6, 1, NULL, 'affiliate2@example.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Maria', 'Rodriguez', 'Rodriguez Digital', '+1-555-0102', NULL, NULL, NULL, NULL, NULL, 'free', 0, 12.50, 5.00, 1, 1875.25, 8, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-08-31 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 16:44:00', NULL, NULL, NULL, NULL, '', '', '', '', '', '', '', '', 'paypal', 'maria@rodriguez.com', ''),
(7, 1, NULL, 'affiliate3@example.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'James', 'Wilson', 'Wilson Consulting', '+1-555-0103', NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 15, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-08-31 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 16:51:44', NULL, NULL, NULL, NULL, 'Citibank', 'James Wilson', '****3456', '021000089', 'checking', 'CITIUS33', '', '388 Greenwich St, New York, NY 10013', 'bank_transfer', '', ''),
(19, 1, NULL, 'testaffiliate@example.com', '$2a$10$Dh7Lba6RT1prGUSZ4xYezOUlenPhlJzIS/x1q1wje/GDDXNdJKZli', 'Test', 'Affiliate', 'Test Company', '555-0123', NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'active', 1, 0, NULL, '2025-09-25 00:11:27', NULL, NULL, '2025-09-25 00:10:56', NULL, '2025-09-25 00:10:56', '2025-09-25 00:11:27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'checking', NULL, NULL, NULL, 'bank_transfer', NULL, NULL),
(20, 55, NULL, 'yoficox540@filipx.com', '$2a$10$//UmBfBHvnDVk0238x45rejQEE8rV1K/6DEseYwSudwBEAxvQ2soS', 'Yofi', 'Cox', 'Yofi LLC', NULL, NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-10-25 19:44:30', NULL, '2025-10-25 19:44:30', '2025-10-25 19:44:30', 55, 55, NULL, NULL, NULL, NULL, NULL, NULL, 'checking', NULL, NULL, NULL, 'bank_transfer', NULL, NULL),
(21, 56, NULL, 'yotab14930@dwakm.com', '$2a$10$UunYtXVVJJZXL2.cxLZbwu6yePgOiuksCuwwq4guFWF/cM.MgHS46', 'RR', 'RR', 'yotab', NULL, NULL, NULL, NULL, NULL, NULL, 'free', 0, 10.00, 5.00, 1, 0.00, 0, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-10-25 20:08:59', NULL, '2025-10-25 20:08:59', '2025-10-25 20:08:59', 56, 56, NULL, NULL, NULL, NULL, NULL, NULL, 'checking', NULL, NULL, NULL, 'bank_transfer', NULL, NULL),
(22, 58, NULL, 'yebipo5863@hh7f.com', '', 'HH', 'HH', 'LLO', NULL, NULL, NULL, NULL, NULL, NULL, 'paid_partner', 0, 20.00, 10.00, 1, 0.00, 0, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-10-26 00:06:17', NULL, '2025-10-26 00:06:17', '2025-10-26 00:06:17', 58, 58, NULL, NULL, NULL, NULL, NULL, NULL, 'checking', NULL, NULL, NULL, 'bank_transfer', NULL, NULL),
(23, 59, NULL, 'kapiw82097@haotuwu.com', '', 'DD', 'DD', 'DD', NULL, NULL, NULL, NULL, NULL, NULL, 'paid_partner', 0, 20.00, 10.00, 1, 0.00, 0, 'active', 0, 0, NULL, NULL, NULL, NULL, '2025-10-26 00:09:51', NULL, '2025-10-26 00:09:51', '2025-10-26 00:09:51', 59, 59, NULL, NULL, NULL, NULL, NULL, NULL, 'checking', NULL, NULL, NULL, 'bank_transfer', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_clicks`
--

CREATE TABLE `affiliate_clicks` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `tracking_code` varchar(100) DEFAULT NULL,
  `campaign` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `referrer_url` text DEFAULT NULL,
  `landing_page` varchar(500) DEFAULT NULL,
  `converted` tinyint(1) DEFAULT 0,
  `conversion_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_commissions`
--

CREATE TABLE `affiliate_commissions` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `referral_id` int(11) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `customer_email` varchar(255) NOT NULL,
  `order_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
  `tier` varchar(50) NOT NULL DEFAULT 'Bronze',
  `product` varchar(255) NOT NULL,
  `order_date` datetime NOT NULL DEFAULT current_timestamp(),
  `approval_date` datetime DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `tracking_code` varchar(100) DEFAULT NULL,
  `commission_type` enum('signup','monthly','upgrade','bonus') NOT NULL DEFAULT 'signup',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_notification_settings`
--

CREATE TABLE `affiliate_notification_settings` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `email_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `sms_notifications` tinyint(1) NOT NULL DEFAULT 0,
  `push_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `commission_alerts` tinyint(1) NOT NULL DEFAULT 1,
  `referral_updates` tinyint(1) NOT NULL DEFAULT 1,
  `weekly_reports` tinyint(1) NOT NULL DEFAULT 1,
  `monthly_reports` tinyint(1) NOT NULL DEFAULT 1,
  `marketing_emails` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `affiliate_notification_settings`
--

INSERT INTO `affiliate_notification_settings` (`id`, `affiliate_id`, `email_notifications`, `sms_notifications`, `push_notifications`, `commission_alerts`, `referral_updates`, `weekly_reports`, `monthly_reports`, `marketing_emails`, `created_at`, `updated_at`) VALUES
(2, 4, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(3, 5, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(4, 6, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(5, 7, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(6, 2, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(7, 3, 1, 0, 1, 1, 1, 1, 1, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(10, 19, 1, 0, 1, 1, 1, 1, 1, 0, '2025-09-25 00:10:56', '2025-09-25 00:10:56'),
(11, 22, 1, 0, 1, 1, 1, 1, 1, 0, '2025-10-26 00:06:17', '2025-10-26 00:06:17'),
(12, 23, 1, 0, 1, 1, 1, 1, 1, 0, '2025-10-26 00:09:51', '2025-10-26 00:09:51');

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_payment_history`
--

CREATE TABLE `affiliate_payment_history` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `transaction_id` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `plan_type` varchar(50) NOT NULL,
  `payment_status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `payment_date` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `affiliate_payment_history`
--

INSERT INTO `affiliate_payment_history` (`id`, `affiliate_id`, `transaction_id`, `amount`, `plan_name`, `plan_type`, `payment_status`, `payment_date`, `created_at`, `updated_at`) VALUES
(1, 23, 'pi_3SMCqQJehHGbCsaC07JcepFB', 79.99, 'Professional', 'monthly', 'completed', '2025-10-26 00:09:51', '2025-10-26 00:09:51', '2025-10-26 00:09:51');

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_payment_settings`
--

CREATE TABLE `affiliate_payment_settings` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `payment_method` enum('bank_transfer','paypal','stripe') NOT NULL DEFAULT 'paypal',
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `routing_number` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `paypal_email` varchar(255) DEFAULT NULL,
  `stripe_account_id` varchar(255) DEFAULT NULL,
  `minimum_payout` decimal(10,2) NOT NULL DEFAULT 50.00,
  `payout_frequency` enum('weekly','monthly','quarterly') NOT NULL DEFAULT 'monthly',
  `tax_id` varchar(50) DEFAULT NULL,
  `w9_submitted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `affiliate_payment_settings`
--

INSERT INTO `affiliate_payment_settings` (`id`, `affiliate_id`, `payment_method`, `bank_name`, `account_number`, `routing_number`, `account_holder_name`, `paypal_email`, `stripe_account_id`, `minimum_payout`, `payout_frequency`, `tax_id`, `w9_submitted`, `created_at`, `updated_at`) VALUES
(2, 4, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(3, 5, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(4, 6, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(5, 7, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(6, 2, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(7, 3, 'paypal', NULL, NULL, NULL, NULL, NULL, NULL, 50.00, 'monthly', NULL, 0, '2025-08-31 02:47:17', '2025-08-31 02:47:17'),
(10, 19, 'paypal', NULL, NULL, NULL, NULL, 'testaffiliate@example.com', NULL, 50.00, 'monthly', NULL, 0, '2025-09-25 00:10:56', '2025-09-25 00:10:56'),
(11, 22, 'bank_transfer', NULL, NULL, NULL, NULL, 'yebipo5863@hh7f.com', NULL, 50.00, 'monthly', NULL, 0, '2025-10-26 00:06:17', '2025-10-26 00:06:17'),
(12, 23, 'bank_transfer', NULL, NULL, NULL, NULL, 'kapiw82097@haotuwu.com', NULL, 50.00, 'monthly', NULL, 0, '2025-10-26 00:09:51', '2025-10-26 00:09:51');

-- --------------------------------------------------------

--
-- Table structure for table `affiliate_referrals`
--

CREATE TABLE `affiliate_referrals` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `referred_user_id` int(11) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `commission_rate` decimal(5,2) NOT NULL,
  `status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  `referral_date` datetime NOT NULL DEFAULT current_timestamp(),
  `conversion_date` datetime DEFAULT NULL,
  `payment_date` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `affiliate_referrals`
--

INSERT INTO `affiliate_referrals` (`id`, `affiliate_id`, `referred_user_id`, `commission_amount`, `commission_rate`, `status`, `referral_date`, `conversion_date`, `payment_date`, `notes`, `created_at`, `updated_at`) VALUES
(1, 5, 9, 45.00, 15.00, 'paid', '2025-08-22 01:05:36', '2025-08-24 01:05:36', '2025-08-31 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(2, 5, 10, 45.00, 15.00, 'approved', '2025-08-04 01:05:36', '2025-08-20 01:05:36', NULL, NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(3, 5, 11, 45.00, 15.00, 'pending', '2025-08-26 01:05:36', '2025-08-28 01:05:36', NULL, NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(4, 6, 12, 37.50, 12.50, 'paid', '2025-08-25 01:05:36', '2025-08-20 01:05:36', '2025-08-29 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(5, 6, 13, 37.50, 12.50, 'approved', '2025-08-21 01:05:36', '2025-08-29 01:05:36', NULL, NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(6, 7, 14, 30.00, 10.00, 'paid', '2025-08-14 01:05:36', '2025-08-20 01:05:36', '2025-08-31 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(7, 7, 15, 30.00, 10.00, 'paid', '2025-08-13 01:05:36', '2025-08-14 01:05:36', '2025-08-27 01:05:36', NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(8, 7, 16, 30.00, 10.00, 'pending', '2025-08-13 01:05:36', '2025-08-17 01:05:36', NULL, NULL, '2025-08-31 01:05:36', '2025-08-31 01:05:36'),
(9, 5, 9, 45.00, 15.00, 'paid', '2025-08-12 01:06:33', '2025-08-23 01:06:33', '2025-08-29 01:06:33', NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(10, 5, 10, 45.00, 15.00, 'approved', '2025-08-06 01:06:33', '2025-08-20 01:06:33', NULL, NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(11, 5, 11, 45.00, 15.00, 'pending', '2025-08-23 01:06:33', '2025-08-18 01:06:33', NULL, NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(12, 6, 12, 37.50, 12.50, 'paid', '2025-08-14 01:06:33', '2025-08-15 01:06:33', '2025-08-27 01:06:33', NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(13, 6, 13, 37.50, 12.50, 'approved', '2025-08-12 01:06:33', '2025-08-13 01:06:33', NULL, NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(14, 7, 14, 30.00, 10.00, 'paid', '2025-08-10 01:06:33', '2025-08-14 01:06:33', '2025-08-30 01:06:33', NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(15, 7, 15, 30.00, 10.00, 'paid', '2025-08-30 01:06:33', '2025-08-14 01:06:33', '2025-08-30 01:06:33', NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(16, 7, 16, 30.00, 10.00, 'pending', '2025-08-31 01:06:33', '2025-08-18 01:06:33', NULL, NULL, '2025-08-31 01:06:33', '2025-08-31 01:06:33'),
(17, 5, 9, 45.00, 15.00, 'paid', '2025-08-05 01:06:53', '2025-08-13 01:06:53', '2025-08-22 01:06:53', NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(18, 5, 10, 45.00, 15.00, 'approved', '2025-08-05 01:06:53', '2025-08-20 01:06:53', NULL, NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(19, 5, 11, 45.00, 15.00, 'pending', '2025-08-22 01:06:53', '2025-08-16 01:06:53', NULL, NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(20, 6, 12, 37.50, 12.50, 'paid', '2025-08-02 01:06:53', '2025-08-20 01:06:53', '2025-08-23 01:06:53', NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(21, 6, 13, 37.50, 12.50, 'approved', '2025-08-12 01:06:53', '2025-08-20 01:06:53', NULL, NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(22, 7, 14, 30.00, 10.00, 'paid', '2025-08-30 01:06:53', '2025-08-22 01:06:53', '2025-08-30 01:06:53', NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(23, 7, 15, 30.00, 10.00, 'paid', '2025-08-17 01:06:53', '2025-08-13 01:06:53', '2025-08-31 01:06:53', NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(24, 7, 16, 30.00, 10.00, 'pending', '2025-08-15 01:06:53', '2025-08-19 01:06:53', NULL, NULL, '2025-08-31 01:06:53', '2025-08-31 01:06:53'),
(25, 5, 9, 45.00, 15.00, 'paid', '2025-08-16 01:07:14', '2025-08-12 01:07:14', '2025-08-28 01:07:14', NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(26, 5, 10, 45.00, 15.00, 'approved', '2025-08-07 01:07:14', '2025-08-12 01:07:14', NULL, NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(27, 5, 11, 45.00, 15.00, 'pending', '2025-08-16 01:07:14', '2025-08-20 01:07:14', NULL, NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(28, 6, 12, 37.50, 12.50, 'paid', '2025-08-18 01:07:14', '2025-08-21 01:07:14', '2025-08-30 01:07:14', NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(29, 6, 13, 37.50, 12.50, 'approved', '2025-08-19 01:07:14', '2025-08-23 01:07:14', NULL, NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(30, 7, 14, 30.00, 10.00, 'paid', '2025-08-02 01:07:14', '2025-08-19 01:07:14', '2025-08-29 01:07:14', NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(31, 7, 15, 30.00, 10.00, 'paid', '2025-08-27 01:07:14', '2025-08-28 01:07:14', '2025-08-29 01:07:14', NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14'),
(32, 7, 16, 30.00, 10.00, 'pending', '2025-08-02 01:07:14', '2025-08-31 01:07:14', NULL, NULL, '2025-08-31 01:07:14', '2025-08-31 01:07:14');

-- --------------------------------------------------------

--
-- Table structure for table `agent_performance`
--

CREATE TABLE `agent_performance` (
  `id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `performance_date` date NOT NULL,
  `tickets_assigned` int(11) NOT NULL DEFAULT 0,
  `tickets_resolved` int(11) NOT NULL DEFAULT 0,
  `avg_response_time_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `avg_resolution_time_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `customer_satisfaction_avg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `efficiency_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `analytics`
--

CREATE TABLE `analytics` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `metric_type` enum('revenue','clients','disputes','success_rate') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `period` enum('daily','weekly','monthly') NOT NULL,
  `date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `article_interactions`
--

CREATE TABLE `article_interactions` (
  `id` int(11) NOT NULL,
  `article_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `interaction_type` enum('view','like','dislike','rating') NOT NULL,
  `rating_value` tinyint(4) DEFAULT NULL CHECK (`rating_value` between 1 and 5),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `table_name` varchar(64) NOT NULL,
  `record_id` int(11) NOT NULL,
  `action` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `banks`
--

CREATE TABLE `banks` (
  `id` int(11) NOT NULL,
  `funding_manager_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `logo` varchar(500) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `routing_number` varchar(9) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `banks`
--

INSERT INTO `banks` (`id`, `funding_manager_id`, `name`, `logo`, `website`, `phone`, `email`, `address`, `city`, `state`, `zip_code`, `routing_number`, `contact_person`, `contact_phone`, `contact_email`, `notes`, `status`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 0, 'Chase', 'https://www.logo.wine/a/logo/Chase_Bank/Chase_Bank-Logo.wine.svg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 1, '2025-09-21 21:13:28', '2025-09-21 21:13:28'),
(2, 0, 'Bank of America', 'https://1000logos.net/wp-content/uploads/2016/10/Bank-of-America-Logo-1998.png', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 1, '2025-09-21 21:17:31', '2025-09-21 21:17:31'),
(3, 0, 'Citizens Trust Bank', 'https://ctbconnect.com/wp-content/uploads/2025/08/faqs.jpg', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 1, '2025-09-22 11:24:05', '2025-09-22 11:24:05'),
(4, 0, 'Truist Bank', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACoCAMAAABt9SM9AAAAnFBMVEX///8wE0cmAECAd4otDUUvEEYWADYhADw6I0+jnKl0aYA2HEvX1NoMADE8JlD19PUAAC4RADMqBUMZADjJxs1dT2zs6+5nWnSblKMIADBTQ2P39/gcADq6tb/k4uYqA0IAACqTjJyLgpTPzNKsp7K7t8AAACZQP2CDeo15boMAACFrX3hZSmiVjp1DL1Whm6hCLlUAABgAABEAAAiVagJmAAAGwklEQVR4nO2cbUOqPByHYQHLpxIwE0VCxcyyU537+3+3GxggbJMjD5XU73rn2GC7gD38WSkKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAvYRO89Wrythx+d+2/lMA0aH3c0fUv0jVzdLUR2uPku9vwVXh+M1Uhuv3djfgqnkhjWaq9/O5WfBHvWvRsGHWxI1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', 1, '2025-10-21 17:37:56', '2025-10-21 17:37:56');

-- --------------------------------------------------------

--
-- Table structure for table `billing_transactions`
--

CREATE TABLE `billing_transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `stripe_payment_intent_id` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `status` enum('pending','succeeded','failed','canceled','refunded') NOT NULL DEFAULT 'pending',
  `payment_method` enum('stripe','manual') NOT NULL DEFAULT 'stripe',
  `plan_name` varchar(100) DEFAULT NULL,
  `plan_type` enum('monthly','yearly','lifetime') NOT NULL,
  `description` text DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `billing_transactions`
--

INSERT INTO `billing_transactions` (`id`, `user_id`, `stripe_payment_intent_id`, `stripe_customer_id`, `amount`, `currency`, `status`, `payment_method`, `plan_name`, `plan_type`, `description`, `metadata`, `created_at`, `updated_at`) VALUES
(1, 4, 'pi_3S0oVVJehHGbCsaC1N5slEyl', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:55:41', '2025-08-27 23:55:41'),
(2, 4, 'pi_3S0oVaJehHGbCsaC0y65LC23', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:55:47', '2025-08-27 23:55:47'),
(3, 4, 'pi_3S0oVvJehHGbCsaC0BkMG8lB', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:56:07', '2025-08-27 23:56:07'),
(4, 4, 'pi_3S0oVxJehHGbCsaC1gtuYy95', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:56:10', '2025-08-27 23:56:10'),
(5, 4, 'pi_3S0oVzJehHGbCsaC0HJLRNgE', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:56:12', '2025-08-27 23:56:12'),
(6, 4, 'pi_3S0oXaJehHGbCsaC19BHQZqu', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-27 23:57:50', '2025-08-27 23:57:50'),
(7, 4, 'pi_3S0oaJJehHGbCsaC0HILkaCi', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:00:39', '2025-08-28 00:00:39'),
(8, 4, 'pi_3S0oc8JehHGbCsaC1yMsRbSs', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:02:34', '2025-08-28 00:02:34'),
(9, 4, 'pi_3S0oe0JehHGbCsaC0HPKMUmu', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:04:28', '2025-08-28 00:04:28'),
(10, 4, 'pi_3S0ohwJehHGbCsaC16gixfR6', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:08:33', '2025-08-28 00:08:33'),
(11, 4, 'pi_3S0oiWJehHGbCsaC1OsQk1i8', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:09:08', '2025-08-28 00:09:08'),
(12, 4, 'pi_3S0oitJehHGbCsaC14greOvh', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:09:32', '2025-08-28 00:09:32'),
(13, 4, 'pi_3S0oixJehHGbCsaC04p2pERi', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:09:35', '2025-08-28 00:09:35'),
(14, 4, 'pi_3S0oiyJehHGbCsaC170gn78Z', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:09:36', '2025-08-28 00:09:36'),
(15, 4, 'pi_3S0oj0JehHGbCsaC0OjP5cd8', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:09:38', '2025-08-28 00:09:38'),
(16, 4, 'pi_3S0p16JehHGbCsaC0CbTLjDb', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 00:28:20', '2025-08-28 00:28:20'),
(17, 4, 'pi_3S12fLJehHGbCsaC1lSWx3hP', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:02:47', '2025-08-28 15:02:47'),
(18, 4, 'pi_3S12fkJehHGbCsaC1SuILjAG', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:03:12', '2025-08-28 15:03:12'),
(19, 4, 'pi_3S12gVJehHGbCsaC1nqFVpiC', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:03:59', '2025-08-28 15:03:59'),
(20, 4, 'pi_3S12hHJehHGbCsaC1K9CX6ws', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:04:47', '2025-08-28 15:04:47'),
(21, 4, 'pi_3S12hTJehHGbCsaC0QPgnShJ', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:04:59', '2025-08-28 15:04:59'),
(22, 4, 'pi_3S12hVJehHGbCsaC0uc27l3I', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:05:01', '2025-08-28 15:05:01'),
(23, 4, 'pi_3S12j1JehHGbCsaC1IDg71af', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:06:35', '2025-08-28 15:06:35'),
(24, 4, 'pi_3S12jQJehHGbCsaC0x0FGo7c', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:07:00', '2025-08-28 15:07:00'),
(25, 1, 'pi_3S12sOJehHGbCsaC1hwM8nEv', 'cus_SwwldFmGlhVCWh', 29.99, 'usd', 'succeeded', 'stripe', 'Starter Plan', 'monthly', 'Payment for Starter Plan plan', NULL, '2025-08-28 15:16:15', '2025-08-28 16:21:31'),
(26, 4, 'pi_3S12x1JehHGbCsaC1pPZqMxD', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:21:03', '2025-08-28 15:21:03'),
(27, 4, 'pi_3S12y1JehHGbCsaC18kA9zao', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:22:05', '2025-08-28 15:22:05'),
(28, 4, 'pi_3S12yXJehHGbCsaC1XzGMwVc', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:22:37', '2025-08-28 15:22:37'),
(29, 4, 'pi_3S130JJehHGbCsaC0kk4h8cY', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:24:27', '2025-08-28 15:24:38'),
(30, 4, 'pi_3S134zJehHGbCsaC1Wb3wSei', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:29:17', '2025-08-28 15:29:28'),
(31, 4, 'pi_3S135OJehHGbCsaC0QDqCZ72', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:29:42', '2025-08-28 15:29:54'),
(32, 4, 'pi_3S13FcJehHGbCsaC1bIlp9yc', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:40:16', '2025-08-28 15:40:16'),
(33, 4, 'pi_3S13FdJehHGbCsaC0IAdNZSl', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:40:17', '2025-08-28 15:40:17'),
(34, 4, 'pi_3S13FqJehHGbCsaC1P6blpa9', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:40:29', '2025-08-28 15:40:44'),
(35, 4, 'pi_3S13NsJehHGbCsaC0I2qr8jn', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:48:48', '2025-08-28 15:48:57'),
(36, 4, 'pi_3S13UOJehHGbCsaC1w85n2zR', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:55:32', '2025-08-28 15:55:32'),
(37, 4, 'pi_3S13UXJehHGbCsaC0YmT16fC', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 15:55:41', '2025-08-28 15:55:41'),
(38, 4, 'pi_3S13WQJehHGbCsaC0WXtfwAT', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:57:38', '2025-08-28 15:57:38'),
(39, 4, 'pi_3S13WqJehHGbCsaC1TCe2eDE', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:58:04', '2025-08-28 15:58:04'),
(40, 4, 'pi_3S13WxJehHGbCsaC1OHOA6Jt', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:58:11', '2025-08-28 15:58:21'),
(41, 4, 'pi_3S13XEJehHGbCsaC1SencFZF', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'succeeded', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 15:58:28', '2025-08-28 15:58:40'),
(42, 4, 'pi_3S13cGJehHGbCsaC1vyF2X9l', 'cus_Swhv34bRo95JBS', 49.00, 'usd', 'pending', 'stripe', 'Starter', 'monthly', 'Payment for Starter plan', NULL, '2025-08-28 16:03:40', '2025-08-28 16:03:40'),
(43, 4, 'pi_3S13jFJehHGbCsaC0EkpbPn4', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 16:10:53', '2025-08-28 16:11:07'),
(44, 5, 'pi_3S14dFJehHGbCsaC0nIjeH7U', 'cus_SwyaTw8TxhkcdF', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-28 17:08:45', '2025-08-28 17:09:01'),
(45, 7, 'pi_3S1T3YJehHGbCsaC1BJQmIkz', 'cus_SxNpjG5XzV7djO', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-29 19:13:33', '2025-08-29 19:13:44'),
(46, 44, 'pi_3S284WJehHGbCsaC1jQhWG2z', 'cus_Sy4C2412T862qm', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-08-31 15:01:16', '2025-08-31 15:01:32'),
(47, 47, 'pi_3S3NAZJehHGbCsaC0lpIqqwu', 'cus_SzLsUxi2Zg2XCc', 99.00, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-09-04 01:20:38', '2025-09-04 01:20:51'),
(48, 4, 'pi_3S9IKyJehHGbCsaC1zMnyzxV', 'cus_Swhv34bRo95JBS', 99.00, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-09-20 09:23:51', '2025-09-20 09:23:51'),
(49, 54, 'pi_3SM8SpJehHGbCsaC1XQOBjO0', 'cus_TIjwPzJDMGmond', 79.99, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-10-25 19:29:01', '2025-10-25 19:29:13'),
(50, 56, 'pi_3SM96MJehHGbCsaC1TAZKX2x', 'cus_TIkb1bvntA9MhO', 79.99, 'usd', 'pending', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-10-25 20:09:52', '2025-10-25 20:09:52'),
(51, 57, 'pi_3SMCToJehHGbCsaC0Q5eCCvL', 'cus_TIo6wyfriKiTn9', 79.99, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-10-25 23:46:20', '2025-10-25 23:46:32'),
(52, 58, 'pi_3SMCmzJehHGbCsaC00ZRmy2W', 'cus_TIoPYMP8qht07m', 79.99, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-10-26 00:06:08', '2025-10-26 00:06:17'),
(53, 59, 'pi_3SMCqQJehHGbCsaC07JcepFB', 'cus_TIoTG3WgBimjun', 79.99, 'usd', 'succeeded', 'stripe', 'Professional', 'monthly', 'Payment for Professional plan', NULL, '2025-10-26 00:09:41', '2025-10-26 00:09:51');

-- --------------------------------------------------------

--
-- Table structure for table `calendar_events`
--

CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `duration` varchar(100) NOT NULL,
  `type` enum('webinar','workshop','office_hours','exam','meetup','deadline') NOT NULL,
  `instructor` varchar(255) DEFAULT NULL,
  `location` varchar(500) DEFAULT NULL,
  `is_virtual` tinyint(1) NOT NULL DEFAULT 1,
  `attendees` int(11) NOT NULL DEFAULT 0,
  `max_attendees` int(11) DEFAULT NULL,
  `meeting_link` varchar(500) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `calendar_events`
--

INSERT INTO `calendar_events` (`id`, `title`, `description`, `date`, `time`, `duration`, `type`, `instructor`, `location`, `is_virtual`, `attendees`, `max_attendees`, `meeting_link`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:07', '2025-08-26 18:56:07'),
(2, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:09', '2025-08-26 18:56:09'),
(3, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:13', '2025-08-26 18:56:13'),
(4, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:14', '2025-08-26 18:56:14'),
(5, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:14', '2025-08-26 18:56:14'),
(6, 'dfsfs', 'dsfdsf', '2025-08-26', '18:55:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:14', '2025-08-26 18:56:14'),
(7, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:49', '2025-08-26 18:56:49'),
(8, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:52', '2025-08-26 18:56:52'),
(9, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:54', '2025-08-26 18:56:54'),
(10, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:54', '2025-08-26 18:56:54'),
(11, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:55', '2025-08-26 18:56:55'),
(12, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:56:56', '2025-08-26 18:56:56'),
(13, 'dsadsa', 'asdasd', '2025-08-28', '18:56:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 18:57:51', '2025-08-26 18:57:51'),
(14, 'hammad', 'saqib', '2025-08-28', '19:00:00', '33', 'webinar', NULL, NULL, 1, 0, NULL, 'https://accountscenter.instagram.com/accounts/', 1, '2025-08-26 19:01:22', '2025-08-26 19:01:22'),
(15, 'hammad', 'saqib', '2025-08-28', '19:00:00', '33', 'webinar', NULL, NULL, 1, 0, 22, 'https://accountscenter.instagram.com/accounts/', 1, '2025-08-26 19:01:28', '2025-08-26 19:01:28'),
(16, 'saqib', 'hammad', '2025-08-27', '22:01:00', '12', 'webinar', NULL, NULL, 1, 0, NULL, 'https://meet.google.com/landing', 1, '2025-08-26 19:02:09', '2025-08-26 19:02:09'),
(17, 'refresh', 'refresh', '2025-08-28', '19:03:00', '33', 'webinar', NULL, NULL, 1, 0, 44, 'https://meet.google.com/landing', 1, '2025-08-26 19:04:08', '2025-08-26 19:04:08');

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

CREATE TABLE `cards` (
  `id` int(11) NOT NULL,
  `card_image` varchar(500) DEFAULT NULL,
  `bank_id` int(11) NOT NULL,
  `card_name` varchar(255) NOT NULL,
  `card_link` varchar(500) NOT NULL,
  `card_type` enum('business','personal') NOT NULL,
  `funding_type` varchar(100) NOT NULL,
  `credit_bureaus` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`credit_bureaus`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `amount_approved` decimal(15,2) DEFAULT NULL COMMENT 'Amount approved for this card',
  `no_of_usage` int(11) DEFAULT 0 COMMENT 'Number of times this card has been used',
  `average_amount` decimal(15,2) DEFAULT NULL COMMENT 'Average amount per usage'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cards`
--

INSERT INTO `cards` (`id`, `card_image`, `bank_id`, `card_name`, `card_link`, `card_type`, `funding_type`, `credit_bureaus`, `is_active`, `created_at`, `updated_at`, `amount_approved`, `no_of_usage`, `average_amount`) VALUES
(1, 'https://promo.bankofamerica.com/ccsearchlp10/compare-cards-3/static.27250/media/card-customizedcashrewards.ba17bb4ae3207d7f754d.png', 2, 'Bank of America® Customized Cash Rewards credit card Bank of America® Customized Cash Rewards', 'https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/?campaign=4075152~UM~en_US', 'business', 'Credit Card', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-09-21 21:19:12', '2025-09-21 21:19:12', NULL, 0, NULL),
(2, 'https://www.pointswithacrew.com/wp-content/uploads/2023/01/chase-freedom-unlimited-large.jpg', 1, 'Chase Freedom Unlimited', 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred', 'personal', 'Credit Card', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-10-21 06:07:04', '2025-10-21 13:27:38', NULL, 0, NULL),
(3, NULL, 2, 'Personal Installment Loan', 'https://www.bankofamerica.com/loans/personal-loans/', 'personal', 'Loan', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-10-21 06:07:04', '2025-10-22 11:49:38', NULL, 0, NULL),
(4, NULL, 3, 'Subprime Credit Builder', 'https://www.creditone.com/credit-cards', 'personal', 'Sub Prime Lenders', '[\"Experian\",\"Equifax\"]', 1, '2025-10-21 06:07:04', '2025-10-22 11:49:36', NULL, 0, NULL),
(5, NULL, 3, 'Personal Line of Credit', 'https://www.wellsfargo.com/personal-credit-line/', 'personal', 'Line of Credit', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-10-21 06:07:04', '2025-10-22 11:49:34', NULL, 0, NULL),
(6, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXTldnt5jiA7CSEhq7_bQ5fj9z0UH092espQ&s', 1, 'Chase Ink Business Preferred', 'https://creditcards.chase.com/business-credit-cards/ink/business-preferred', 'business', 'Credit Card', '[\"Experian\",\"Equifax\"]', 1, '2025-10-21 06:07:04', '2025-10-21 13:31:11', NULL, 0, NULL),
(7, NULL, 2, 'Business Term Loan', 'https://www.bankofamerica.com/smallbusiness/loans-credit/business-loans/', 'business', 'Loan', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-10-21 06:07:04', '2025-10-22 11:49:30', NULL, 0, NULL),
(8, NULL, 3, 'SBA 7(a) Loan Program', 'https://www.sba.gov/funding-programs/loans/7a-loans', 'business', 'SBA Loan', '[\"Experian\",\"Equifax\",\"TransUnion\"]', 1, '2025-10-21 06:07:04', '2025-10-22 11:49:32', NULL, 0, NULL),
(9, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8R6uLvposKv3Pi7vluCUMU2aRrZ15zx3aCqztLnc-uo9m0YNA-c-dpBXQ7UkKVyi9NZk&usqp=CAU', 1, 'Business Cash Advance', 'https://www.capitalone.com/small-business/merchant-services/', 'business', 'Merchant Cash Advance', '[\"Experian\"]', 1, '2025-10-21 06:07:04', '2025-10-21 13:33:04', NULL, 0, NULL),
(10, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR6xkOsuLTknOwnxSXzQ8rqyGnX6gi863pIQ&s', 1, 'Business Line of Credit', 'https://www.americanexpress.com/us/small-business/business-line-of-credit/', 'business', 'Line of Credit', '[\"Experian\",\"Equifax\"]', 1, '2025-10-21 06:07:04', '2025-10-21 13:33:41', NULL, 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `ticket_reference_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chat_messages`
--

INSERT INTO `chat_messages` (`id`, `sender_id`, `receiver_id`, `message`, `ticket_reference_id`, `is_read`, `created_at`) VALUES
(1, 6, 4, 'hammad', 12, 1, '2025-08-31 21:52:35'),
(2, 6, 4, 'hi', NULL, 1, '2025-08-31 21:53:49'),
(3, 6, 4, 'hello', NULL, 1, '2025-08-31 21:55:27'),
(4, 6, 4, 'test123', NULL, 1, '2025-08-31 22:15:06'),
(5, 6, 4, 'gulguli', NULL, 1, '2025-08-31 22:15:31'),
(6, 4, 6, 'hi', NULL, 1, '2025-08-31 22:15:46'),
(7, 4, 6, 'dsadadasdsa', NULL, 1, '2025-08-31 22:17:35'),
(8, 4, 6, 'hi', NULL, 1, '2025-08-31 22:18:46'),
(9, 4, 6, 'ddddd', NULL, 1, '2025-08-31 22:24:15'),
(10, 6, 4, 'gggg', NULL, 1, '2025-08-31 22:24:49'),
(11, 4, 6, 'dddddfdsfdsf', NULL, 1, '2025-08-31 22:24:56'),
(12, 6, 4, 'sdfdsfdsf', NULL, 1, '2025-08-31 22:25:02'),
(13, 4, 6, '1', NULL, 1, '2025-08-31 22:25:13'),
(14, 6, 4, '2', NULL, 1, '2025-08-31 22:25:22'),
(15, 6, 4, '3', NULL, 1, '2025-08-31 22:30:53'),
(16, 4, 6, '4', NULL, 1, '2025-08-31 22:31:02'),
(17, 4, 6, '5', NULL, 1, '2025-08-31 22:31:34'),
(18, 6, 4, '6', NULL, 1, '2025-08-31 22:31:48'),
(19, 4, 6, '7', NULL, 1, '2025-08-31 22:32:06'),
(20, 6, 4, '8', NULL, 1, '2025-08-31 22:32:18'),
(21, 6, 4, '9', NULL, 1, '2025-08-31 22:33:00'),
(22, 4, 6, '10', NULL, 1, '2025-08-31 22:33:09');

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `ssn` varchar(11) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `zip_code` varchar(10) DEFAULT NULL,
  `credit_score` int(11) DEFAULT NULL,
  `goal_score` int(11) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `previous_credit_score` int(11) DEFAULT NULL CHECK (`previous_credit_score` >= 300 and `previous_credit_score` <= 850),
  `ssn_last4` varchar(4) DEFAULT NULL,
  `ssn_last_four` varchar(4) DEFAULT NULL,
  `employment_status` varchar(100) DEFAULT NULL,
  `annual_income` decimal(15,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `platform` enum('myfreescorenow','identityiq','smartcredit','myscoreiq') DEFAULT NULL,
  `platform_email` varchar(255) DEFAULT NULL,
  `platform_password` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `user_id`, `first_name`, `last_name`, `email`, `phone`, `ssn`, `date_of_birth`, `address`, `city`, `state`, `zip_code`, `credit_score`, `goal_score`, `status`, `created_at`, `updated_at`, `previous_credit_score`, `ssn_last4`, `ssn_last_four`, `employment_status`, `annual_income`, `notes`, `platform`, `platform_email`, `platform_password`, `last_login`) VALUES
(33, 4, 'ALI', 'BADI', 'mrbadi1989@gmail.com', NULL, NULL, '1989-01-26', NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-10-15 05:32:27', '2025-10-25 13:34:46', NULL, NULL, NULL, NULL, NULL, 'Client created via credit report scraping from myfreescorenow', 'myfreescorenow', 'mrbadi1989@gmail.com', 'BmwNyr09262021!$', '2025-10-25 18:34:46'),
(34, 4, 'KYLE', 'JOBES', 'kyle.jobes@yahoo.com', NULL, NULL, '1989-06-28', NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-10-23 22:11:07', '2025-10-24 22:50:52', NULL, NULL, NULL, NULL, NULL, 'Client created via credit report scraping from myfreescorenow', 'myfreescorenow', 'kyle.jobes@yahoo.com', 'Creditrepair123!#', '2025-10-25 03:50:52'),
(35, 4, 'MICHELLE', 'CARRASQUILLO', 'Mcarrasquillo@uses.org', NULL, NULL, '1990-01-10', NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2025-10-25 05:12:12', '2025-10-25 13:33:41', NULL, NULL, NULL, NULL, NULL, 'Client created via credit report scraping from myfreescorenow', 'myfreescorenow', 'Mcarrasquillo@uses.org', 'Walker#35', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `comment_likes`
--

CREATE TABLE `comment_likes` (
  `id` int(11) NOT NULL,
  `comment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `comment_likes`
--

INSERT INTO `comment_likes` (`id`, `comment_id`, `user_id`, `created_at`) VALUES
(1, 2, 1, '2025-08-25 21:41:26'),
(2, 3, 1, '2025-08-25 22:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `commission_payments`
--

CREATE TABLE `commission_payments` (
  `id` int(11) NOT NULL,
  `affiliate_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `transaction_id` varchar(255) NOT NULL,
  `payment_method` enum('bank_transfer','paypal','stripe','check','other') NOT NULL DEFAULT 'bank_transfer',
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
  `payment_date` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `proof_of_payment_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `commission_payments`
--

INSERT INTO `commission_payments` (`id`, `affiliate_id`, `amount`, `transaction_id`, `payment_method`, `status`, `payment_date`, `notes`, `proof_of_payment_url`, `created_at`, `updated_at`) VALUES
(1, 7, 3200.50, '1112135351351', 'bank_transfer', 'completed', '2025-08-31 16:51:44', NULL, NULL, '2025-08-31 11:51:44', '2025-08-31 11:51:44'),
(3, 5, 2450.75, '123151451435135135', 'bank_transfer', 'completed', '2025-08-31 16:59:42', NULL, NULL, '2025-08-31 11:59:42', '2025-08-31 11:59:42');

-- --------------------------------------------------------

--
-- Table structure for table `commission_tiers`
--

CREATE TABLE `commission_tiers` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `min_referrals` int(11) NOT NULL DEFAULT 0,
  `commission_rate` decimal(5,2) NOT NULL,
  `bonuses` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bonuses`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `commission_tiers`
--

INSERT INTO `commission_tiers` (`id`, `name`, `min_referrals`, `commission_rate`, `bonuses`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Bronze', 0, 15.00, '[\"Basic support\",\"Monthly reports\"]', 1, '2025-08-31 02:42:33', '2025-08-31 02:42:33'),
(2, 'Silver', 10, 20.00, '[\"Priority support\",\"Weekly reports\",\"Marketing materials\"]', 1, '2025-08-31 02:42:33', '2025-08-31 02:42:33'),
(3, 'Gold', 25, 25.00, '[\"Dedicated support\",\"Daily reports\",\"Custom materials\",\"Performance bonuses\"]', 1, '2025-08-31 02:42:33', '2025-08-31 02:42:33'),
(4, 'Platinum', 50, 30.00, '[\"VIP support\",\"Real-time analytics\",\"Custom landing pages\",\"Quarterly bonuses\",\"Exclusive events\"]', 1, '2025-08-31 02:42:33', '2025-08-31 02:42:33');

-- --------------------------------------------------------

--
-- Table structure for table `community_posts`
--

CREATE TABLE `community_posts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `media_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media_urls`)),
  `media_type` enum('image','video','document') DEFAULT NULL,
  `likes_count` int(11) NOT NULL DEFAULT 0,
  `comments_count` int(11) NOT NULL DEFAULT 0,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `community_posts`
--

INSERT INTO `community_posts` (`id`, `user_id`, `content`, `media_urls`, `media_type`, `likes_count`, `comments_count`, `is_pinned`, `created_at`, `updated_at`) VALUES
(1, 1, 'Test post from API', NULL, NULL, 1, 1, 0, '2025-08-25 20:59:04', '2025-08-25 21:30:16'),
(2, 1, 'TEST', '[\"/uploads/community/media-1756139031307-591282071.PNG\"]', 'image', 0, 0, 0, '2025-08-25 21:23:51', '2025-08-25 21:45:07'),
(3, 1, 'adsa', NULL, NULL, 0, 2, 0, '2025-08-25 21:33:57', '2025-08-25 21:38:58'),
(4, 1, '123', '[\"/uploads/community/media-1756140132858-330488654.png\"]', 'image', 0, 2, 0, '2025-08-25 21:42:12', '2025-08-25 21:54:37'),
(5, 1, 'test asdd', NULL, NULL, 1, 1, 0, '2025-08-26 15:58:33', '2025-08-26 15:58:43'),
(6, 1, 'test', NULL, NULL, 0, 1, 0, '2025-08-26 16:31:26', '2025-09-04 01:19:20'),
(7, 46, 'test', NULL, NULL, 0, 0, 0, '2025-09-04 01:18:36', '2025-09-04 01:18:36'),
(8, 46, 'test', '[\"/uploads/community/media-1756930746121-152261535.PNG\"]', 'image', 0, 1, 0, '2025-09-04 01:19:06', '2025-09-04 01:19:14');

-- --------------------------------------------------------

--
-- Table structure for table `courses`
--

CREATE TABLE `courses` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `instructor` varchar(255) NOT NULL,
  `duration` varchar(100) NOT NULL,
  `difficulty` enum('beginner','intermediate','advanced') NOT NULL,
  `points` int(11) NOT NULL DEFAULT 0,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `is_free` tinyint(1) NOT NULL DEFAULT 0,
  `category_id` int(11) DEFAULT NULL,
  `instructor_id` int(11) DEFAULT NULL,
  `enrollment_count` int(11) NOT NULL DEFAULT 0,
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `review_count` int(11) NOT NULL DEFAULT 0,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `preview_video_url` varchar(500) DEFAULT NULL,
  `duration_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `difficulty_level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `prerequisites` text DEFAULT NULL,
  `learning_objectives` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`learning_objectives`)),
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `updated_by` int(11) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `archived_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `courses`
--

INSERT INTO `courses` (`id`, `title`, `description`, `instructor`, `duration`, `difficulty`, `points`, `featured`, `created_by`, `created_at`, `updated_at`, `status`, `is_free`, `category_id`, `instructor_id`, `enrollment_count`, `rating`, `review_count`, `thumbnail_url`, `preview_video_url`, `duration_hours`, `difficulty_level`, `prerequisites`, `learning_objectives`, `tags`, `price`, `updated_by`, `published_at`, `archived_at`) VALUES
(11, 'Credit Fundamentals 101', 'Learn the basics of credit scores, credit reports, and how credit works in the financial system.', 'Sarah Mitchell, CFP', '2 hours', 'beginner', 100, 1, 1, '2025-08-26 17:01:24', '2025-08-26 17:01:24', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
(12, 'Advanced Dispute Strategies', 'Master advanced techniques for disputing inaccurate items on credit reports and maximizing success rates.', 'Michael Rodriguez, Credit Expert', '3.5 hours', 'advanced', 200, 0, 1, '2025-08-26 17:01:24', '2025-08-26 17:02:21', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
(13, 'Credit Building for Beginners', 'Step-by-step guide to building credit from scratch or rebuilding after financial difficulties.', 'Jennifer Adams, Financial Advisor', '1.5 hours', 'beginner', 75, 0, 1, '2025-08-26 17:01:24', '2025-08-26 17:01:24', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
(14, 'Debt Management Strategies', 'Learn effective strategies for managing and reducing debt while improving your credit score.', 'David Thompson, Debt Counselor', '2.5 hours', 'intermediate', 150, 1, 1, '2025-08-26 17:01:24', '2025-08-26 17:01:24', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
(15, 'test', 'test', 'test', '1h 00m', 'beginner', 100, 0, 1, '2025-08-26 17:24:23', '2025-08-26 17:24:23', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL),
(16, 'test', 'etstesfgds', 'testst', '2h', 'beginner', 100, 0, 1, '2025-08-26 17:25:50', '2025-08-26 17:25:50', 'draft', 0, NULL, NULL, 0, 0.00, 0, NULL, NULL, 0.00, 'beginner', NULL, NULL, NULL, 0.00, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `course_categories`
--

CREATE TABLE `course_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `parent_category_id` int(11) DEFAULT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `color` varchar(7) DEFAULT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `course_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_categories`
--

INSERT INTO `course_categories` (`id`, `name`, `description`, `parent_category_id`, `icon`, `color`, `order_index`, `is_active`, `course_count`, `created_at`, `updated_at`) VALUES
(1, 'Credit Repair', 'Learn the fundamentals of credit repair and improvement', NULL, 'credit-card', '#3B82F6', 1, 1, 0, '2025-10-25 05:56:18', '2025-10-25 05:56:18'),
(2, 'Business Credit', 'Build and establish business credit profiles', NULL, 'building', '#10B981', 2, 1, 0, '2025-10-25 05:56:18', '2025-10-25 05:56:18'),
(3, 'Personal Finance', 'Master personal financial management skills', NULL, 'dollar-sign', '#F59E0B', 3, 1, 0, '2025-10-25 05:56:18', '2025-10-25 05:56:18'),
(4, 'Debt Management', 'Strategies for managing and reducing debt', NULL, 'chart-line', '#EF4444', 4, 1, 0, '2025-10-25 05:56:18', '2025-10-25 05:56:18'),
(5, 'Investment Basics', 'Introduction to investing and wealth building', NULL, 'trending-up', '#8B5CF6', 5, 1, 0, '2025-10-25 05:56:18', '2025-10-25 05:56:18');

-- --------------------------------------------------------

--
-- Table structure for table `course_chapters`
--

CREATE TABLE `course_chapters` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text DEFAULT NULL,
  `video_url` varchar(500) DEFAULT NULL,
  `duration` varchar(100) NOT NULL,
  `order_index` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_chapters`
--

INSERT INTO `course_chapters` (`id`, `course_id`, `title`, `content`, `video_url`, `duration`, `order_index`, `created_at`) VALUES
(55, 11, 'What is Credit?', 'Understanding the concept of credit and its importance in personal finance.', NULL, '15 min', 1, '2025-08-26 17:01:24'),
(56, 11, 'Credit Scores Explained', 'Deep dive into FICO scores, VantageScore, and factors that affect your credit score.', NULL, '20 min', 2, '2025-08-26 17:01:24'),
(57, 11, 'Reading Your Credit Report', 'How to obtain and interpret your credit report from the three major bureaus.', NULL, '25 min', 3, '2025-08-26 17:01:24'),
(58, 12, 'Legal Framework for Disputes', 'Understanding FCRA, FDCPA, and your rights as a consumer.', NULL, '30 min', 1, '2025-08-26 17:01:24'),
(59, 12, 'Documentation and Evidence', 'Gathering and organizing supporting documentation for disputes.', NULL, '25 min', 2, '2025-08-26 17:01:24'),
(60, 13, 'Starting Your Credit Journey', 'First steps to establishing credit history.', NULL, '20 min', 1, '2025-08-26 17:01:24'),
(61, 13, 'Secured Credit Cards', 'How to use secured cards to build credit.', NULL, '15 min', 2, '2025-08-26 17:01:24'),
(62, 14, 'Debt Avalanche vs Snowball', 'Comparing different debt payoff strategies.', NULL, '25 min', 1, '2025-08-26 17:01:24'),
(63, 14, 'Negotiating with Creditors', 'How to negotiate payment plans and settlements.', NULL, '30 min', 2, '2025-08-26 17:01:24'),
(64, 16, 'Introduction', 'tesffdscv', NULL, '2h', 1, '2025-08-26 17:25:50');

-- --------------------------------------------------------

--
-- Table structure for table `course_enrollments`
--

CREATE TABLE `course_enrollments` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `progress` int(11) NOT NULL DEFAULT 0 CHECK (`progress` >= 0 and `progress` <= 100),
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `enrolled_at` datetime NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `course_enrollments`
--

INSERT INTO `course_enrollments` (`id`, `user_id`, `course_id`, `progress`, `completed`, `enrolled_at`, `completed_at`) VALUES
(1, 1, 13, 0, 0, '2025-08-26 17:03:27', NULL),
(2, 1, 11, 0, 0, '2025-08-26 17:10:43', NULL),
(3, 1, 12, 0, 0, '2025-08-26 17:14:50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `course_materials`
--

CREATE TABLE `course_materials` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `video_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `file_url` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` enum('pdf','image','document','audio','archive','other') NOT NULL,
  `file_size` bigint(20) NOT NULL DEFAULT 0,
  `mime_type` varchar(100) DEFAULT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_downloadable` tinyint(1) NOT NULL DEFAULT 1,
  `download_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_modules`
--

CREATE TABLE `course_modules` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `duration_minutes` int(11) NOT NULL DEFAULT 0,
  `is_locked` tinyint(1) NOT NULL DEFAULT 0,
  `unlock_after_module_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_quizzes`
--

CREATE TABLE `course_quizzes` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `video_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `instructions` text DEFAULT NULL,
  `quiz_type` enum('assessment','practice','final_exam') NOT NULL DEFAULT 'practice',
  `time_limit_minutes` int(11) DEFAULT NULL,
  `attempts_allowed` int(11) NOT NULL DEFAULT 3,
  `passing_score` decimal(5,2) NOT NULL DEFAULT 70.00,
  `randomize_questions` tinyint(1) NOT NULL DEFAULT 0,
  `show_correct_answers` tinyint(1) NOT NULL DEFAULT 1,
  `show_results_immediately` tinyint(1) NOT NULL DEFAULT 1,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `course_videos`
--

CREATE TABLE `course_videos` (
  `id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `module_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `video_url` varchar(500) NOT NULL,
  `video_type` enum('upload','youtube','vimeo','external') NOT NULL DEFAULT 'upload',
  `video_id` varchar(255) DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `duration_seconds` int(11) NOT NULL DEFAULT 0,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `is_preview` tinyint(1) NOT NULL DEFAULT 0,
  `transcript` text DEFAULT NULL,
  `captions_url` varchar(500) DEFAULT NULL,
  `quality_options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`quality_options`)),
  `view_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `credit_reports`
--

CREATE TABLE `credit_reports` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `bureau` enum('experian','equifax','transunion') NOT NULL,
  `report_date` date NOT NULL,
  `credit_score` int(11) DEFAULT NULL CHECK (`credit_score` >= 300 and `credit_score` <= 850),
  `report_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`report_data`)),
  `status` enum('pending','completed','error') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `credit_reports`
--

INSERT INTO `credit_reports` (`id`, `client_id`, `bureau`, `report_date`, `credit_score`, `report_data`, `status`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 33, 'experian', '2024-01-15', 650, '{\"personalInfo\":{\"name\":\"ALI BADI\",\"address\":\"123 Main St, City, State 12345\",\"ssn\":\"***-**-1234\",\"dateOfBirth\":\"1985-05-15\"},\"summary\":{\"creditScore\":650,\"totalAccounts\":12,\"openAccounts\":8,\"closedAccounts\":4,\"totalBalance\":15420,\"totalCreditLimit\":25000,\"utilization\":61.7},\"accounts\":[{\"id\":1,\"creditor\":\"Chase Bank\",\"accountNumber\":\"****1234\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":2500,\"limit\":5000,\"utilization\":50,\"opened\":\"2020-03-15\",\"paymentHistory\":\"Current\"},{\"id\":2,\"creditor\":\"Bank of America\",\"accountNumber\":\"****5678\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":1200,\"limit\":3000,\"utilization\":40,\"opened\":\"2019-08-22\",\"paymentHistory\":\"Current\"},{\"id\":3,\"creditor\":\"Capital One\",\"accountNumber\":\"****9012\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":800,\"limit\":2000,\"utilization\":40,\"opened\":\"2021-01-10\",\"paymentHistory\":\"30 days late\"}],\"inquiries\":[{\"creditor\":\"Wells Fargo\",\"date\":\"2023-12-01\",\"type\":\"Hard Inquiry\"},{\"creditor\":\"Discover\",\"date\":\"2023-11-15\",\"type\":\"Hard Inquiry\"}],\"publicRecords\":[],\"negativeItems\":[{\"creditor\":\"Capital One\",\"type\":\"Late Payment\",\"date\":\"2023-10-15\",\"status\":\"Verified\"}]}', 'completed', '2025-10-22 21:09:00', '2025-10-22 21:09:00', 9, 9),
(2, 33, 'equifax', '2024-01-15', 645, '{\"personalInfo\":{\"name\":\"ALI BADI\",\"address\":\"123 Main St, City, State 12345\",\"ssn\":\"***-**-1234\",\"dateOfBirth\":\"1985-05-15\"},\"summary\":{\"creditScore\":645,\"totalAccounts\":11,\"openAccounts\":7,\"closedAccounts\":4,\"totalBalance\":14800,\"totalCreditLimit\":24000,\"utilization\":61.7},\"accounts\":[{\"id\":1,\"creditor\":\"Chase Bank\",\"accountNumber\":\"****1234\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":2500,\"limit\":5000,\"utilization\":50,\"opened\":\"2020-03-15\",\"paymentHistory\":\"Current\"},{\"id\":2,\"creditor\":\"Bank of America\",\"accountNumber\":\"****5678\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":1200,\"limit\":3000,\"utilization\":40,\"opened\":\"2019-08-22\",\"paymentHistory\":\"Current\"}],\"inquiries\":[{\"creditor\":\"Wells Fargo\",\"date\":\"2023-12-01\",\"type\":\"Hard Inquiry\"}],\"publicRecords\":[],\"negativeItems\":[]}', 'completed', '2025-10-22 21:09:00', '2025-10-22 21:09:00', 9, 9),
(3, 33, 'transunion', '2024-01-15', 655, '{\"personalInfo\":{\"name\":\"ALI BADI\",\"address\":\"123 Main St, City, State 12345\",\"ssn\":\"***-**-1234\",\"dateOfBirth\":\"1985-05-15\"},\"summary\":{\"creditScore\":655,\"totalAccounts\":13,\"openAccounts\":9,\"closedAccounts\":4,\"totalBalance\":16200,\"totalCreditLimit\":26000,\"utilization\":62.3},\"accounts\":[{\"id\":1,\"creditor\":\"Chase Bank\",\"accountNumber\":\"****1234\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":2500,\"limit\":5000,\"utilization\":50,\"opened\":\"2020-03-15\",\"paymentHistory\":\"Current\"},{\"id\":2,\"creditor\":\"Bank of America\",\"accountNumber\":\"****5678\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":1200,\"limit\":3000,\"utilization\":40,\"opened\":\"2019-08-22\",\"paymentHistory\":\"Current\"},{\"id\":3,\"creditor\":\"Capital One\",\"accountNumber\":\"****9012\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":800,\"limit\":2000,\"utilization\":40,\"opened\":\"2021-01-10\",\"paymentHistory\":\"Current\"},{\"id\":4,\"creditor\":\"Citi Bank\",\"accountNumber\":\"****3456\",\"type\":\"Credit Card\",\"status\":\"Open\",\"balance\":1500,\"limit\":4000,\"utilization\":37.5,\"opened\":\"2018-06-20\",\"paymentHistory\":\"Current\"}],\"inquiries\":[{\"creditor\":\"Wells Fargo\",\"date\":\"2023-12-01\",\"type\":\"Hard Inquiry\"},{\"creditor\":\"Discover\",\"date\":\"2023-11-15\",\"type\":\"Hard Inquiry\"},{\"creditor\":\"American Express\",\"date\":\"2023-10-20\",\"type\":\"Hard Inquiry\"}],\"publicRecords\":[],\"negativeItems\":[]}', 'completed', '2025-10-22 21:09:00', '2025-10-22 21:09:00', 9, 9);

-- --------------------------------------------------------

--
-- Table structure for table `credit_report_history`
--

CREATE TABLE `credit_report_history` (
  `id` int(11) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `platform` varchar(255) NOT NULL,
  `report_path` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'completed',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `credit_report_history`
--

INSERT INTO `credit_report_history` (`id`, `client_id`, `platform`, `report_path`, `status`, `created_at`, `updated_at`) VALUES
(22, '33', 'myfreescorenow', 'scraper-output\\client_unknown_report_2025-10-15T05-19-12-067Z.json', 'completed', '2025-10-15 10:19:12', '2025-10-15 10:32:27'),
(23, '33', 'myfreescorenow', 'scraper-output\\client_unknown_report_2025-10-15T05-32-27-428Z.json', 'completed', '2025-10-15 10:32:27', '2025-10-15 10:32:27'),
(24, '34', 'myfreescorenow', 'scraper-output\\client_unknown_report_2025-10-23T22-11-07-755Z.json', 'completed', '2025-10-24 03:11:07', '2025-10-24 03:11:07'),
(25, '35', 'myfreescorenow', 'scraper-output\\client_unknown_report_2025-10-25T05-12-12-418Z.json', 'completed', '2025-10-25 10:12:12', '2025-10-25 10:12:12');

-- --------------------------------------------------------

--
-- Table structure for table `disputes`
--

CREATE TABLE `disputes` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `bureau` varchar(50) NOT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `dispute_reason` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `date_submitted` date DEFAULT NULL,
  `date_resolved` date DEFAULT NULL,
  `result` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `disputes`
--

INSERT INTO `disputes` (`id`, `client_id`, `bureau`, `account_name`, `account_number`, `dispute_reason`, `status`, `date_submitted`, `date_resolved`, `result`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 'experian', 'ABC Medical', NULL, 'Not mine - never had services', 'investigating', NULL, NULL, NULL, NULL, '2025-08-08 12:59:48', '2025-08-08 12:59:48'),
(2, 1, 'equifax', 'Old Credit Card', NULL, 'Paid in full - should be removed', 'pending', NULL, NULL, NULL, NULL, '2025-08-08 12:59:48', '2025-08-08 12:59:48'),
(3, 2, 'transunion', 'Collection Account', NULL, 'Duplicate listing', 'verified', NULL, NULL, NULL, NULL, '2025-08-08 12:59:48', '2025-08-08 12:59:48');

-- --------------------------------------------------------

--
-- Table structure for table `email_verification_codes`
--

CREATE TABLE `email_verification_codes` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `code` varchar(6) NOT NULL,
  `type` enum('affiliate_registration','password_reset','email_change','admin_registration') NOT NULL DEFAULT 'affiliate_registration',
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `email_verification_codes`
--

INSERT INTO `email_verification_codes` (`id`, `email`, `code`, `type`, `expires_at`, `used`, `used_at`, `created_at`) VALUES
(1, 'hunai2248n@gmail.com', '745229', 'admin_registration', '2025-10-26 13:58:57', 0, NULL, '2025-10-25 18:58:57'),
(2, 'hunai2248n@gmail.com', '184452', 'admin_registration', '2025-10-26 14:09:46', 0, NULL, '2025-10-25 19:09:46'),
(3, 'hunai2248n@gmail.com', '551213', 'admin_registration', '2025-10-26 14:10:24', 0, NULL, '2025-10-25 19:10:24'),
(4, 'hunai2248n@gmail.com', '609732', 'admin_registration', '2025-10-26 14:16:27', 1, '2025-10-25 19:16:43', '2025-10-25 19:16:27'),
(5, 'gotey74368@dwakm.com', '478597', 'admin_registration', '2025-10-26 14:27:41', 1, '2025-10-25 19:28:19', '2025-10-25 19:27:41'),
(6, 'yoficox540@filipx.com', '576548', 'admin_registration', '2025-10-26 14:43:48', 1, '2025-10-25 19:44:30', '2025-10-25 19:43:48'),
(7, 'yotab14930@dwakm.com', '194622', 'admin_registration', '2025-10-26 15:08:23', 1, '2025-10-25 20:08:59', '2025-10-25 20:08:23'),
(8, 'xisav87409@filipx.com', '508868', 'admin_registration', '2025-10-26 15:57:22', 1, '2025-10-25 20:57:48', '2025-10-25 20:57:22'),
(9, 'yebipo5863@hh7f.com', '627717', 'admin_registration', '2025-10-26 19:05:23', 1, '2025-10-26 00:05:41', '2025-10-26 00:05:23'),
(10, 'kapiw82097@haotuwu.com', '614274', 'admin_registration', '2025-10-26 19:08:54', 1, '2025-10-26 00:09:15', '2025-10-26 00:08:54');

-- --------------------------------------------------------

--
-- Table structure for table `event_registrations`
--

CREATE TABLE `event_registrations` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `registered_at` datetime NOT NULL DEFAULT current_timestamp(),
  `attended` tinyint(1) DEFAULT NULL,
  `attended_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `event_registrations`
--

INSERT INTO `event_registrations` (`id`, `event_id`, `user_id`, `registered_at`, `attended`, `attended_at`) VALUES
(1, 2, 1, '2025-08-26 19:14:45', NULL, NULL),
(2, 1, 1, '2025-08-26 19:14:51', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `faqs`
--

CREATE TABLE `faqs` (
  `id` int(11) NOT NULL,
  `question` varchar(1000) NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(100) NOT NULL,
  `order_index` int(11) NOT NULL DEFAULT 0,
  `views` int(11) NOT NULL DEFAULT 0,
  `helpful` int(11) NOT NULL DEFAULT 0,
  `not_helpful` int(11) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `faqs`
--

INSERT INTO `faqs` (`id`, `question`, `answer`, `category`, `order_index`, `views`, `helpful`, `not_helpful`, `status`, `created_at`, `updated_at`) VALUES
(1, 'How long does it take to see improvements in my credit score?', 'Credit score improvements can be seen as quickly as 30-45 days after positive changes are reported to credit bureaus. However, significant improvements may take 3-6 months.', 'General', 1, 0, 0, 0, 'active', '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(2, 'What is the difference between a credit report and credit score?', 'A credit report is a detailed record of your credit history, while a credit score is a numerical representation (300-850) of your creditworthiness based on that report.', 'Credit Basics', 2, 0, 0, 0, 'active', '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(3, 'Can I remove accurate negative information from my credit report?', 'Generally, accurate negative information cannot be removed and will remain on your credit report for 7-10 years. However, you can dispute inaccurate information.', 'Credit Repair', 3, 0, 0, 0, 'active', '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(4, 'test', 'tes', 'Credit Basics', 0, 0, 0, 0, 'active', '2025-09-23 02:12:17', '2025-09-23 02:12:17'),
(5, 'rar', 'arar', 'Credit Basics', 0, 1, 1, 2, 'active', '2025-09-23 02:24:06', '2025-09-23 02:24:40');

-- --------------------------------------------------------

--
-- Table structure for table `faq_interactions`
--

CREATE TABLE `faq_interactions` (
  `id` int(11) NOT NULL,
  `faq_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `interaction_type` enum('view','helpful','not_helpful') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `faq_interactions`
--

INSERT INTO `faq_interactions` (`id`, `faq_id`, `user_id`, `interaction_type`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 5, NULL, 'view', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 02:24:35'),
(2, 5, NULL, 'not_helpful', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 02:24:38'),
(3, 5, NULL, 'helpful', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 02:24:39'),
(4, 5, NULL, 'not_helpful', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', '2025-09-23 02:24:40');

-- --------------------------------------------------------

--
-- Table structure for table `funding_requests`
--

CREATE TABLE `funding_requests` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `purpose` enum('equipment','marketing','expansion','inventory','technology','training','other') NOT NULL,
  `funding_type` enum('done-for-you','diy') DEFAULT NULL,
  `title_position` varchar(255) DEFAULT NULL,
  `intended_use` text DEFAULT NULL,
  `business_name` varchar(255) DEFAULT NULL,
  `business_phone` varchar(20) DEFAULT NULL,
  `business_email` varchar(255) DEFAULT NULL,
  `business_address` text DEFAULT NULL,
  `business_city` varchar(100) DEFAULT NULL,
  `business_state` varchar(50) DEFAULT NULL,
  `business_zip` varchar(10) DEFAULT NULL,
  `date_commenced` date DEFAULT NULL,
  `business_website` varchar(255) DEFAULT NULL,
  `business_industry` varchar(100) DEFAULT NULL,
  `entity_type` enum('LLC','Corporation','Partnership','Sole Proprietorship') DEFAULT NULL,
  `incorporation_state` varchar(50) DEFAULT NULL,
  `number_of_employees` int(11) DEFAULT NULL,
  `ein` varchar(20) DEFAULT NULL,
  `monthly_gross_sales` decimal(12,2) DEFAULT NULL,
  `projected_annual_revenue` decimal(12,2) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `birth_city` varchar(100) DEFAULT NULL,
  `ssn` varchar(20) DEFAULT NULL,
  `mothers_maiden_name` varchar(100) DEFAULT NULL,
  `home_address` text DEFAULT NULL,
  `personal_city` varchar(100) DEFAULT NULL,
  `personal_state` varchar(50) DEFAULT NULL,
  `personal_zip` varchar(10) DEFAULT NULL,
  `home_phone` varchar(20) DEFAULT NULL,
  `mobile_phone` varchar(20) DEFAULT NULL,
  `housing_status` enum('rent','own','other') DEFAULT NULL,
  `monthly_housing_payment` decimal(10,2) DEFAULT NULL,
  `years_at_address` decimal(4,2) DEFAULT NULL,
  `drivers_license` varchar(50) DEFAULT NULL,
  `issuing_state` varchar(50) DEFAULT NULL,
  `issue_date` date DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `current_employer` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `years_at_employer` decimal(4,2) DEFAULT NULL,
  `employer_phone` varchar(20) DEFAULT NULL,
  `employer_address` text DEFAULT NULL,
  `personal_bank_name` varchar(100) DEFAULT NULL,
  `personal_bank_balance` decimal(12,2) DEFAULT NULL,
  `business_bank_name` varchar(100) DEFAULT NULL,
  `business_bank_balance` decimal(12,2) DEFAULT NULL,
  `us_citizen` enum('yes','no') DEFAULT NULL,
  `savings_account` enum('yes','no') DEFAULT NULL,
  `investment_accounts` enum('yes','no') DEFAULT NULL,
  `military_affiliation` enum('yes','no') DEFAULT NULL,
  `other_income` enum('yes','no') DEFAULT NULL,
  `other_assets` enum('yes','no') DEFAULT NULL,
  `banks_to_ignore` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`banks_to_ignore`)),
  `status` enum('pending','approved','rejected','under_review') DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `requested_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_date` timestamp NULL DEFAULT NULL,
  `reviewer_notes` text DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `reviewer_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `funding_requests`
--

INSERT INTO `funding_requests` (`id`, `title`, `description`, `amount`, `purpose`, `funding_type`, `title_position`, `intended_use`, `business_name`, `business_phone`, `business_email`, `business_address`, `business_city`, `business_state`, `business_zip`, `date_commenced`, `business_website`, `business_industry`, `entity_type`, `incorporation_state`, `number_of_employees`, `ein`, `monthly_gross_sales`, `projected_annual_revenue`, `first_name`, `middle_name`, `last_name`, `date_of_birth`, `birth_city`, `ssn`, `mothers_maiden_name`, `home_address`, `personal_city`, `personal_state`, `personal_zip`, `home_phone`, `mobile_phone`, `housing_status`, `monthly_housing_payment`, `years_at_address`, `drivers_license`, `issuing_state`, `issue_date`, `expiration_date`, `current_employer`, `position`, `years_at_employer`, `employer_phone`, `employer_address`, `personal_bank_name`, `personal_bank_balance`, `business_bank_name`, `business_bank_balance`, `us_citizen`, `savings_account`, `investment_accounts`, `military_affiliation`, `other_income`, `other_assets`, `banks_to_ignore`, `status`, `priority`, `requested_date`, `reviewed_date`, `reviewer_notes`, `user_id`, `reviewer_id`, `created_at`, `updated_at`) VALUES
(1, 'Marketing Campaign Equipment', 'Need funding for new marketing equipment including cameras, lighting, and editing software', 15000.00, 'marketing', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approved', 'high', '2024-01-15 05:30:00', '2024-01-18 09:20:00', 'Approved for marketing expansion initiative', 1, 48, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(2, 'Office Expansion Project', 'Funding required for expanding office space and purchasing new furniture', 25000.00, 'expansion', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approved', 'medium', '2024-01-20 04:15:00', '2024-01-22 11:45:00', 'Approved for Q1 expansion plan', 1, 48, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(3, 'Technology Infrastructure Upgrade', 'Investment in new servers, software licenses, and IT equipment', 35000.00, 'technology', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pending', 'high', '2024-01-25 06:00:00', NULL, NULL, 1, NULL, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(4, 'Staff Training Program', 'Professional development and certification programs for team members', 8000.00, 'training', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'under_review', 'medium', '2024-01-28 09:30:00', NULL, NULL, 1, NULL, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(5, 'Inventory Management System', 'New inventory tracking and management software implementation', 12000.00, 'inventory', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'approved', 'medium', '2024-02-01 03:45:00', '2024-02-03 08:15:00', 'Approved for operational efficiency improvement', 1, 48, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(6, 'Equipment Maintenance Fund', 'Annual maintenance and repair budget for existing equipment', 5000.00, 'equipment', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'rejected', 'low', '2024-02-05 11:20:00', '2024-02-07 05:30:00', 'Rejected - maintenance should be covered by operational budget', 1, 48, '2025-09-22 11:58:52', '2025-09-22 11:58:52'),
(7, 'TrackDiv - Done for You Funding Request', 'Done for You funding application for TrackDiv requesting $62545 for tewsa', 62545.00, 'other', 'done-for-you', 'tret', 'tewsa', 'TrackDiv', '03337008731', 'hammadisaqib@gmail.com', 'H.M Academy Street 7, Block A, Nawabad', 'Karachi', 'Sindh', '75660', '2025-10-22', 'TrackDiv', 'TrackDiv', 'LLC', 'Sindh', 4, '3453', 3432.00, 34324.00, 'Hammad', NULL, 'Saqib', '2025-10-22', 'Karachi', '2222', 'test', '2nd Floor, AL NOOR MULLA HAJI MANSION, ST 6B, UC5 BAGHDADI L', 'Karachi', 'Sindh', '75660', '03337008731', '+1 09144400719', 'own', 234.00, 3.00, '345346454565', 'Sindh', '2025-10-23', '2025-10-30', 'test', 'tset', 4.00, '43534534', 'hammdsfds', 'gfdgfd', 34.00, 'dsfdsf', 324.00, 'yes', 'yes', 'yes', 'yes', 'yes', 'yes', '[]', 'pending', 'medium', '2025-10-22 11:55:06', NULL, NULL, 4, NULL, '2025-10-22 11:55:06', '2025-10-22 11:55:06');

-- --------------------------------------------------------

--
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `privacy` enum('public','private','secret') NOT NULL DEFAULT 'public',
  `created_by` int(11) NOT NULL,
  `member_count` int(11) NOT NULL DEFAULT 1,
  `post_count` int(11) NOT NULL DEFAULT 0,
  `avatar_url` varchar(500) DEFAULT NULL,
  `cover_url` varchar(500) DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`id`, `name`, `description`, `privacy`, `created_by`, `member_count`, `post_count`, `avatar_url`, `cover_url`, `settings`, `created_at`, `updated_at`) VALUES
(1, 'Credit Repair Community', 'A community for credit repair professionals', 'public', 3, 1, 0, NULL, NULL, NULL, '2025-08-25 22:37:46', '2025-08-25 22:37:46'),
(2, 'test', 'tests', 'public', 1, 1, 0, NULL, NULL, NULL, '2025-08-25 22:52:03', '2025-08-25 22:52:03');

-- --------------------------------------------------------

--
-- Table structure for table `group_members`
--

CREATE TABLE `group_members` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `role` enum('admin','moderator','member') NOT NULL DEFAULT 'member',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `invited_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `group_members`
--

INSERT INTO `group_members` (`id`, `group_id`, `user_id`, `role`, `joined_at`, `invited_by`) VALUES
(1, 1, 3, 'admin', '2025-08-25 22:37:46', 3),
(2, 2, 1, 'admin', '2025-08-25 22:52:03', 1);

-- --------------------------------------------------------

--
-- Table structure for table `group_posts`
--

CREATE TABLE `group_posts` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `media_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media_urls`)),
  `media_type` enum('image','video','document') DEFAULT NULL,
  `likes_count` int(11) NOT NULL DEFAULT 0,
  `comments_count` int(11) NOT NULL DEFAULT 0,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invitations`
--

CREATE TABLE `invitations` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` enum('admin','client','affiliate') NOT NULL,
  `token` text NOT NULL,
  `meeting_link` text DEFAULT NULL,
  `status` enum('sent','pending','accepted','declined','expired') NOT NULL DEFAULT 'sent',
  `sent_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `knowledge_articles`
--

CREATE TABLE `knowledge_articles` (
  `id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `content` text NOT NULL,
  `category` varchar(100) NOT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `author_id` int(11) NOT NULL,
  `status` enum('published','draft','archived') NOT NULL DEFAULT 'draft',
  `views` int(11) NOT NULL DEFAULT 0,
  `likes` int(11) NOT NULL DEFAULT 0,
  `dislikes` int(11) NOT NULL DEFAULT 0,
  `rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `knowledge_articles`
--

INSERT INTO `knowledge_articles` (`id`, `title`, `content`, `category`, `tags`, `author_id`, `status`, `views`, `likes`, `dislikes`, `rating`, `featured`, `created_at`, `updated_at`) VALUES
(1, 'Understanding Your Credit Score', 'Your credit score is a three-digit number that represents your creditworthiness. It typically ranges from 300 to 850, with higher scores indicating better credit health.', 'Credit Basics', '[\"credit score\",\"credit report\",\"FICO\"]', 2, 'published', 0, 0, 0, 0.00, 1, '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(2, 'How to Dispute Credit Report Errors', 'Credit report errors are more common than you might think. Here\'s how to dispute them effectively and improve your credit score.', 'Credit Repair', '[\"dispute\",\"credit report\",\"errors\"]', 2, 'published', 0, 0, 0, 0.00, 0, '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(3, 'Building Credit from Scratch', 'If you\'re new to credit or rebuilding after financial difficulties, here are the best strategies to establish a positive credit history.', 'Credit Building', '[\"credit building\",\"new credit\",\"secured cards\"]', 2, 'published', 0, 0, 0, 0.00, 1, '2025-08-29 22:24:09', '2025-08-29 22:24:09'),
(4, 'test', 'test', 'Credit Basics', '[\"test\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:11:43', '2025-09-23 02:11:43'),
(5, 'test', 'test', 'Credit Basics', '[\"test\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:11:58', '2025-09-23 02:11:58'),
(6, 'rwar', 'rwar', 'Credit Basics', '[\"rwar\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:12:05', '2025-09-23 02:12:05'),
(7, 'test', 'test', 'Credit Basics', '[\"test\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:23:49', '2025-09-23 02:23:49'),
(8, 'test', 'test', 'Credit Basics', '[\"test\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:25:43', '2025-09-23 02:25:43'),
(9, 'test', 'setes', 'Credit Basics', '[\"test\"]', 6, 'draft', 0, 0, 0, 0.00, 0, '2025-09-23 02:29:35', '2025-09-23 02:29:35');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_codes`
--

CREATE TABLE `password_reset_codes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `code` varchar(6) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pending_registrations`
--

CREATE TABLE `pending_registrations` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `role` enum('user','admin','support','super_admin','funding_manager') NOT NULL DEFAULT 'admin',
  `plan_id` int(11) DEFAULT NULL,
  `billing_cycle` enum('monthly','yearly') DEFAULT NULL,
  `referral_affiliate_id` varchar(255) DEFAULT NULL,
  `referral_affiliate_name` varchar(255) DEFAULT NULL,
  `referral_commission_rate` decimal(5,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `post_comments`
--

CREATE TABLE `post_comments` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `parent_comment_id` int(11) DEFAULT NULL,
  `likes_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_comments`
--

INSERT INTO `post_comments` (`id`, `post_id`, `user_id`, `content`, `parent_comment_id`, `likes_count`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '123', NULL, 0, '2025-08-25 21:30:16', '2025-08-25 21:30:16'),
(2, 3, 1, 'test', NULL, 1, '2025-08-25 21:35:30', '2025-08-25 21:41:26'),
(3, 3, 1, 'testccc', NULL, 1, '2025-08-25 21:38:58', '2025-08-25 22:00:00'),
(4, 4, 1, 'test', NULL, 0, '2025-08-25 21:48:31', '2025-08-25 21:48:31'),
(5, 4, 1, 'dfds', NULL, 0, '2025-08-25 21:54:37', '2025-08-25 21:54:37'),
(6, 5, 1, 'test', NULL, 0, '2025-08-26 15:58:43', '2025-08-26 15:58:43'),
(7, 8, 46, 'trdfgdfg', NULL, 0, '2025-09-04 01:19:14', '2025-09-04 01:19:14'),
(8, 6, 46, 'sdfdsf', NULL, 0, '2025-09-04 01:19:20', '2025-09-04 01:19:20');

-- --------------------------------------------------------

--
-- Table structure for table `post_likes`
--

CREATE TABLE `post_likes` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_likes`
--

INSERT INTO `post_likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES
(4, 1, 1, '2025-08-25 21:30:11'),
(10, 5, 1, '2025-08-26 15:58:35');

-- --------------------------------------------------------

--
-- Table structure for table `post_reactions`
--

CREATE TABLE `post_reactions` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `reaction_type` enum('like','love','laugh','wow','sad','angry') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_reactions`
--

INSERT INTO `post_reactions` (`id`, `post_id`, `user_id`, `reaction_type`, `created_at`) VALUES
(1, 2, 1, 'laugh', '2025-08-25 21:29:54'),
(2, 1, 1, 'laugh', '2025-08-25 21:30:00'),
(3, 3, 1, 'love', '2025-08-25 21:34:18'),
(4, 4, 1, 'love', '2025-08-25 21:47:09'),
(5, 5, 1, 'love', '2025-08-26 15:58:37'),
(6, 8, 46, 'love', '2025-09-04 01:19:09');

-- --------------------------------------------------------

--
-- Table structure for table `post_shares`
--

CREATE TABLE `post_shares` (
  `id` int(11) NOT NULL,
  `post_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `platform` enum('facebook','twitter','linkedin','email','copy') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `post_shares`
--

INSERT INTO `post_shares` (`id`, `post_id`, `user_id`, `platform`, `created_at`) VALUES
(1, 4, 1, 'copy', '2025-08-25 22:02:44');

-- --------------------------------------------------------

--
-- Table structure for table `stripe_config`
--

CREATE TABLE `stripe_config` (
  `id` int(11) NOT NULL,
  `stripe_publishable_key` varchar(500) NOT NULL,
  `stripe_secret_key` varchar(500) NOT NULL,
  `webhook_endpoint_secret` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stripe_config`
--

INSERT INTO `stripe_config` (`id`, `stripe_publishable_key`, `stripe_secret_key`, `webhook_endpoint_secret`, `is_active`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(5, 'pk_test_51JIdZVJehHGbCsaCYiCquX3mKuZDrym2d3EU31L8fDxs8886NBrqsg3rYrp8bHIdl7wvARE7vxLuNfhsrY5SFbCw00tHX5coQC', 'sk_test_51JIdZVJehHGbCsaCtO53jxO0sNp5ENohIDu08KlDU7Xh5AroEdegLfy0bnjOd3rtfsAhJA19TiE2mEspXsFwGjdr00lF3TxhRG', NULL, 1, '2025-08-27 23:24:13', '2025-08-28 19:06:15', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `stripe_subscription_id` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL,
  `plan_name` varchar(100) NOT NULL,
  `plan_type` enum('monthly','yearly','lifetime') NOT NULL,
  `status` enum('active','canceled','past_due','unpaid','incomplete') NOT NULL DEFAULT 'active',
  `current_period_start` datetime DEFAULT NULL,
  `current_period_end` datetime DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subscriptions`
--

INSERT INTO `subscriptions` (`id`, `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `plan_name`, `plan_type`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`) VALUES
(1, 4, NULL, 'cus_Swhv34bRo95JBS', 'Professional', 'monthly', 'active', '2025-08-28 11:11:07', '2025-09-28 11:11:07', 0, '2025-08-28 15:24:38', '2025-08-28 16:11:07'),
(9, 1, NULL, 'cus_SwwldFmGlhVCWh', 'Starter Plan', 'monthly', 'active', '2025-08-28 11:21:31', '2025-09-28 11:21:31', 0, '2025-08-28 11:21:31', '2025-08-28 11:21:31'),
(10, 5, NULL, 'cus_SwyaTw8TxhkcdF', 'Professional', 'monthly', '', '2025-08-28 12:09:01', '2025-09-28 12:09:01', 0, '2025-08-28 17:09:01', '2025-08-31 16:38:42'),
(11, 7, NULL, 'cus_SxNpjG5XzV7djO', 'Professional', 'monthly', 'active', '2025-08-29 14:13:44', '2025-09-29 14:13:44', 0, '2025-08-29 19:13:44', '2025-08-29 19:13:44'),
(12, 44, NULL, 'cus_Sy4C2412T862qm', 'Professional', 'monthly', '', '2025-08-31 10:01:32', '2025-10-01 10:01:32', 0, '2025-08-31 15:01:32', '2025-09-21 18:28:01'),
(13, 47, NULL, 'cus_SzLsUxi2Zg2XCc', 'Professional', 'monthly', 'active', '2025-09-03 20:20:51', '2025-10-03 20:20:51', 0, '2025-09-04 01:20:51', '2025-09-04 01:20:51'),
(14, 54, NULL, NULL, 'Professional', 'monthly', 'active', '2025-10-25 14:29:13', '2025-11-25 14:29:13', 0, '2025-10-25 19:29:13', '2025-10-25 19:29:13'),
(15, 57, NULL, NULL, 'Professional', 'monthly', 'active', '2025-10-25 18:46:32', '2025-11-25 18:46:32', 0, '2025-10-25 23:46:32', '2025-10-25 23:46:32'),
(16, 58, NULL, NULL, 'Professional', 'monthly', 'active', '2025-10-25 19:06:17', '2025-11-25 19:06:17', 0, '2025-10-26 00:06:17', '2025-10-26 00:06:17'),
(17, 59, NULL, NULL, 'Professional', 'monthly', 'active', '2025-10-25 19:09:51', '2025-11-25 19:09:51', 0, '2025-10-26 00:09:51', '2025-10-26 00:09:51');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `billing_cycle` enum('monthly','yearly','lifetime') NOT NULL DEFAULT 'monthly',
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `max_users` int(11) DEFAULT NULL,
  `max_clients` int(11) DEFAULT NULL,
  `max_disputes` int(11) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL,
  `page_permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`page_permissions`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `name`, `description`, `price`, `billing_cycle`, `features`, `max_users`, `max_clients`, `max_disputes`, `is_active`, `sort_order`, `created_at`, `updated_at`, `created_by`, `updated_by`, `page_permissions`) VALUES
(3, 'Starter', 'Perfect for small credit repair businesses', 49.99, 'monthly', '[\"Up to 50 clients\",\"Basic dispute management\",\"Email support\",\"Standard reporting\"]', 2, 50, 500, 1, 1, '2025-08-26 21:34:09', '2025-10-25 18:57:59', 1, 1, '[\"dashboard\",\"clients\",\"credit-report\",\"reports\",\"school\",\"support\",\"settings\"]'),
(5, 'Professional', 'For growing credit repair businesses', 79.99, 'monthly', '[\"Up to 200 clients\",\"Advanced dispute management\",\"Priority support\",\"Advanced reporting\",\"API access\",\"White-label options\"]', 5, 200, 2000, 1, 2, '2025-08-26 21:34:09', '2025-10-25 21:25:42', 1, 1, '[\"dashboard\",\"clients\",\"reports\",\"credit-report\",\"disputes\",\"ai-coach\",\"school\",\"analytics\",\"settings\",\"support\"]'),
(6, 'Enterprise', 'For large credit repair organizations', 199.99, 'monthly', '[\"Unlimited clients\",\"Full feature access\",\"24/7 phone support\",\"Custom reporting\",\"Full API access\",\"Custom integrations\",\"Dedicated account manager\"]', NULL, NULL, NULL, 1, 3, '2025-08-26 21:34:09', '2025-10-25 21:25:42', 1, 1, '[\"dashboard\",\"clients\",\"reports\",\"credit-report\",\"disputes\",\"ai-coach\",\"school\",\"analytics\",\"compliance\",\"automations\",\"settings\",\"support\"]');

-- --------------------------------------------------------

--
-- Table structure for table `support_general_settings`
--

CREATE TABLE `support_general_settings` (
  `id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `support_email` varchar(255) NOT NULL,
  `timezone` varchar(100) NOT NULL DEFAULT 'UTC',
  `language` varchar(10) NOT NULL DEFAULT 'en',
  `auto_assignment` tinyint(1) NOT NULL DEFAULT 1,
  `ticket_auto_close_days` int(11) NOT NULL DEFAULT 30,
  `max_tickets_per_agent` int(11) NOT NULL DEFAULT 50,
  `response_time_target` int(11) NOT NULL DEFAULT 24,
  `resolution_time_target` int(11) NOT NULL DEFAULT 72,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_metrics`
--

CREATE TABLE `support_metrics` (
  `id` int(11) NOT NULL,
  `metric_date` date NOT NULL,
  `total_tickets` int(11) NOT NULL DEFAULT 0,
  `resolved_tickets` int(11) NOT NULL DEFAULT 0,
  `avg_response_time_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `avg_resolution_time_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `customer_satisfaction_avg` decimal(3,2) NOT NULL DEFAULT 0.00,
  `first_response_sla_met` int(11) NOT NULL DEFAULT 0,
  `resolution_sla_met` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_notification_settings`
--

CREATE TABLE `support_notification_settings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `email_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `push_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `sms_notifications` tinyint(1) NOT NULL DEFAULT 0,
  `new_ticket_alerts` tinyint(1) NOT NULL DEFAULT 1,
  `ticket_updates` tinyint(1) NOT NULL DEFAULT 1,
  `escalation_alerts` tinyint(1) NOT NULL DEFAULT 1,
  `daily_reports` tinyint(1) NOT NULL DEFAULT 0,
  `weekly_reports` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_team_members`
--

CREATE TABLE `support_team_members` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(100) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`permissions`)),
  `avatar` varchar(500) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `last_active` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_working_hours`
--

CREATE TABLE `support_working_hours` (
  `id` int(11) NOT NULL,
  `day_of_week` enum('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_working_day` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text NOT NULL,
  `setting_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `category` enum('general','security','billing','notifications','features') NOT NULL DEFAULT 'general',
  `description` text DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `created_at`, `updated_at`, `updated_by`) VALUES
(1, 'app.name', 'CreditRepair Pro', 'string', 'general', 'Application name', 1, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(2, 'app.version', '1.0.0', 'string', 'general', 'Application version', 1, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(3, 'security.session_timeout', '3600', 'number', 'security', 'Session timeout in seconds', 0, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(4, 'security.max_login_attempts', '5', 'number', 'security', 'Maximum login attempts before lockout', 0, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(5, 'billing.currency', 'USD', 'string', 'billing', 'Default currency', 1, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(6, 'notifications.email_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications', 0, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(7, 'features.community_enabled', 'true', 'boolean', 'features', 'Enable community features', 1, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1),
(8, 'features.calendar_enabled', 'true', 'boolean', 'features', 'Enable calendar features', 1, '2025-08-26 21:34:09', '2025-08-26 21:34:09', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `customer_id` int(11) NOT NULL,
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `status` enum('open','in_progress','pending','resolved','closed') NOT NULL DEFAULT 'open',
  `category` varchar(100) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `title`, `description`, `customer_id`, `priority`, `status`, `category`, `assignee_id`, `created_at`, `updated_at`, `created_by`, `updated_by`) VALUES
(1, 'Unable to access credit report', 'I\'m having trouble accessing my credit report. The page keeps loading but never shows any data. I\'ve tried refreshing multiple times.', 2, 'high', 'open', 'Technical', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 2),
(2, 'Billing question about subscription', 'I was charged twice this month for my subscription. Can someone please help me understand why this happened and process a refund?', 2, 'medium', 'in_progress', 'Billing', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 2),
(3, 'Request for credit score improvement tips', 'My credit score has been stuck at 650 for months. I\'ve been paying all my bills on time. What else can I do to improve it?', 2, 'low', 'resolved', 'General', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 6),
(4, 'Dispute letter template request', 'I need help creating a dispute letter for an incorrect item on my credit report. Do you have templates available?', 2, 'medium', 'pending', 'General', NULL, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 2),
(5, 'System performance issues', 'Users are reporting slow loading times across the platform. Database queries seem to be taking longer than usual.', 2, 'urgent', 'open', 'Technical', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 2),
(6, 'Feature request: Bulk user import', 'We need the ability to import multiple users at once via CSV file. This would save significant time for onboarding new clients.', 2, 'low', 'open', 'Feature Request', NULL, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 2),
(7, 'User account access issue', 'Client John Doe (john.doe@email.com) cannot log into his account. Password reset emails are not being received.', 2, 'high', 'in_progress', 'Account', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 6),
(8, 'Monthly report generation failed', 'The automated monthly report for client analytics failed to generate. Error logs show database connection timeout.', 2, 'medium', 'resolved', 'Technical', 6, '2025-08-29 21:13:48', '2025-08-29 21:13:48', 2, 6),
(9, 'Unable to access credit report', 'I\'m having trouble accessing my credit report. The page keeps loading but never shows any data. I\'ve tried refreshing multiple times.', 2, 'high', 'open', 'Technical', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 2),
(10, 'Billing question about subscription', 'I was charged twice this month for my subscription. Can someone please help me understand why this happened and process a refund?', 2, 'medium', 'in_progress', 'Billing', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 2),
(11, 'Request for credit score improvement tips', 'My credit score has been stuck at 650 for months. I\'ve been paying all my bills on time. What else can I do to improve it?', 2, 'low', 'resolved', 'General', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 6),
(12, 'Dispute letter template request', 'I need help creating a dispute letter for an incorrect item on my credit report. Do you have templates available?', 2, 'medium', 'pending', 'General', NULL, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 2),
(13, 'System performance issues', 'Users are reporting slow loading times across the platform. Database queries seem to be taking longer than usual.', 2, 'urgent', 'open', 'Technical', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 2),
(14, 'Feature request: Bulk user import', 'We need the ability to import multiple users at once via CSV file. This would save significant time for onboarding new clients.', 2, 'low', 'open', 'Feature Request', NULL, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 2),
(15, 'User account access issue', 'Client John Doe (john.doe@email.com) cannot log into his account. Password reset emails are not being received.', 2, 'high', 'in_progress', 'Account', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 6),
(16, 'Monthly report generation failed', 'The automated monthly report for client analytics failed to generate. Error logs show database connection timeout.', 2, 'medium', 'resolved', 'Technical', 6, '2025-08-29 23:08:07', '2025-08-29 23:08:07', 2, 6);

-- --------------------------------------------------------

--
-- Table structure for table `ticket_analytics`
--

CREATE TABLE `ticket_analytics` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `first_response_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `response_time_hours` decimal(5,2) DEFAULT NULL,
  `resolution_time_hours` decimal(5,2) DEFAULT NULL,
  `customer_satisfaction_rating` tinyint(4) DEFAULT NULL CHECK (`customer_satisfaction_rating` between 1 and 5),
  `escalated` tinyint(1) NOT NULL DEFAULT 0,
  `escalated_at` datetime DEFAULT NULL,
  `sla_response_met` tinyint(1) NOT NULL DEFAULT 0,
  `sla_resolution_met` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_analytics`
--

INSERT INTO `ticket_analytics` (`id`, `ticket_id`, `first_response_at`, `resolved_at`, `response_time_hours`, `resolution_time_hours`, `customer_satisfaction_rating`, `escalated`, `escalated_at`, `sla_response_met`, `sla_resolution_met`, `created_at`, `updated_at`) VALUES
(1, 1, '2025-08-29 23:13:48', NULL, 2.97, NULL, NULL, 0, NULL, 1, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(2, 2, '2025-08-30 13:13:48', NULL, 16.11, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(3, 3, '2025-08-30 06:13:48', '2025-08-30 02:08:25', 9.04, 4.91, 5, 0, NULL, 0, 1, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(4, 4, '2025-08-30 02:13:48', NULL, 5.02, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(5, 5, '2025-08-30 07:13:48', NULL, 10.36, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(6, 6, '2025-08-30 21:13:48', NULL, 24.32, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(7, 7, '2025-08-30 17:13:48', NULL, 20.12, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(8, 8, '2025-08-29 22:13:48', '2025-08-31 01:48:12', 1.05, 28.57, 4, 0, NULL, 1, 1, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(9, 9, '2025-08-30 21:08:07', NULL, 22.90, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(10, 10, '2025-08-30 13:08:07', NULL, 14.43, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(11, 11, '2025-08-30 10:08:07', '2025-09-01 22:34:48', 11.06, 71.44, 5, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(12, 12, '2025-08-30 23:08:07', NULL, 24.29, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(13, 13, '2025-08-30 21:08:07', NULL, 22.08, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(14, 14, '2025-08-30 12:08:07', NULL, 13.44, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(15, 15, '2025-08-30 05:08:07', NULL, 6.76, NULL, NULL, 0, NULL, 0, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54'),
(16, 16, '2025-08-30 00:08:07', '2025-09-01 15:08:43', 1.84, 64.01, 3, 0, NULL, 1, 0, '2025-08-29 23:08:54', '2025-08-29 23:08:54');

-- --------------------------------------------------------

--
-- Table structure for table `ticket_messages`
--

CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL,
  `ticket_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `author_id` int(11) NOT NULL,
  `author_type` enum('customer','support') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_messages`
--

INSERT INTO `ticket_messages` (`id`, `ticket_id`, `content`, `author_id`, `author_type`, `created_at`) VALUES
(1, 1, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 21:13:48'),
(2, 1, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 21:13:48'),
(3, 2, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 21:13:48'),
(4, 2, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 21:13:48'),
(5, 3, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 21:13:48'),
(6, 3, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 21:13:48'),
(7, 9, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 23:08:07'),
(8, 9, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 23:08:07'),
(9, 10, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 23:08:07'),
(10, 10, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 23:08:07'),
(11, 11, 'Thank you for contacting support. We have received your ticket and will respond within 24 hours.', 6, 'support', '2025-08-29 23:08:07'),
(12, 11, 'I appreciate the quick response. Looking forward to resolving this issue.', 2, 'customer', '2025-08-29 23:08:07');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role` enum('user','admin','support','super_admin','funding_manager') NOT NULL DEFAULT 'user',
  `status` enum('active','inactive','locked','pending') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `stripe_customer_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `company_name`, `avatar`, `role`, `status`, `created_at`, `updated_at`, `is_active`, `last_login`, `stripe_customer_id`) VALUES
(1, 'demo@creditrepairpro.com', '$2a$10$7hKImSh5JACyhDrhZt1KYupQksnUyAS0B1D18AIw4yflrrCs8p7Iq', 'Hammad', 'Saqib', NULL, '/uploads/profiles/profile-1758549461098-481775424.jpg', 'super_admin', 'active', '2025-08-08 12:59:48', '2025-10-25 13:52:15', 1, '2025-10-25 18:52:15', 'cus_SwwldFmGlhVCWh'),
(2, 'test@example.com', '$2a$10$cpI3lm4WvB6SSnYYxC01XuEiM6Byyyg4c6gesoIn0/MLaUJler5a.', 'John', 'Doe', 'Test Company', NULL, 'super_admin', 'active', '2025-08-25 17:29:59', '2025-09-20 23:02:26', 1, '2025-09-16 15:21:13', NULL),
(3, 'test2@example.com', '$2a$10$S0Af70X9nDbwVkLab503eOrL4c1d4CN2We2tjE0f0TwqcJgoWHgrW', 'Jane', 'Smith', 'Test Company 2', NULL, 'admin', 'active', '2025-08-25 17:31:10', '2025-08-27 12:55:27', 1, '2025-08-25 22:37:20', NULL),
(4, 'hammadisaqib@gmail.com', '$2a$10$tTvZyRcptIaX6Y/w1zt5g.jU9t5QBYOaUt3L3SbeMgDRaHKAERp5e', 'Hammadi', 'Saqib', 'TrackDiv', 'http://localhost:3001/uploads/profiles/profile-1760615717431-604733710.jpg', 'admin', 'active', '2025-08-27 13:43:32', '2025-10-25 18:52:59', 1, '2025-10-25 23:52:59', 'cus_Swhv34bRo95JBS'),
(5, 'abc@gmail.com', '$2a$10$HpsEBR38/DpLw0SA1ExzA.OwvDsf/Cu8qLZi/LVz88GBXn9Gm/M6O', 'zaid', 'abc', 'rwar', NULL, 'admin', 'active', '2025-08-28 12:08:37', '2025-08-31 14:54:25', 1, NULL, 'cus_SwyaTw8TxhkcdF'),
(6, 'support@creditrepair.com', '$2a$12$NrOF09FzeT3TsLoRevfIj.eD3gTratUS5P9Ptn0f3iwOfCwBJENpa', 'Support', 'Team', 'Credit Repair Support', NULL, 'support', 'active', '2025-08-29 14:01:15', '2025-09-24 17:41:22', 1, '2025-09-24 22:41:22', NULL),
(7, 'munibahmed125521@gmail.com', '$2a$10$.CcX0wtJq6G36J7/nPwde.WVuU1lEfWwIuLtlSTmnR/63.rqOxuci', 'Hammadi', 'Saqib', 'TrackDiv', NULL, 'admin', 'active', '2025-08-29 14:13:07', '2025-08-29 15:05:38', 1, NULL, 'cus_SxNpjG5XzV7djO'),
(8, 'admin@creditrepair.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Admin', 'User', NULL, NULL, 'admin', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(9, 'john.doe@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'John', 'Doe', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(10, 'jane.smith@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Jane', 'Smith', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(11, 'mike.johnson@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Mike', 'Johnson', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(12, 'sarah.wilson@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Sarah', 'Wilson', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(13, 'david.brown@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'David', 'Brown', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(14, 'lisa.davis@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Lisa', 'Davis', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(15, 'robert.miller@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Robert', 'Miller', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(16, 'emily.garcia@email.com', '$2b$10$aqBpWKngrTAm.31uZuLVF.rJdm4qYiacYwyDRulHddO68IOpekBXK', 'Emily', 'Garcia', NULL, NULL, 'user', 'active', '2025-08-30 20:05:36', '2025-08-30 20:05:36', 1, NULL, NULL),
(44, 'rc@creditrepairpro.com', '$2a$10$2njt9uWbE0HUOqNtJLZS..D/JYSxqk.EFJerd34aNEMl8yJHy.5Ka', 'Refer', 'client', 'test', NULL, 'admin', 'active', '2025-08-31 10:01:05', '2025-08-31 14:54:44', 1, NULL, 'cus_Sy4C2412T862qm'),
(45, 'ali@example.com', '$2a$10$/gjdSb1F8KXEpqZJX8SLWuE94maE9L/oW31lwyroskKhJmtJ/fgS.', 'Ali', 'Badi', 'abc', NULL, 'admin', 'active', '2025-09-03 17:15:19', '2025-09-03 17:15:19', 1, NULL, NULL),
(46, 'is@example.com', '$2a$10$qgTUS8QmKoNFhEGoHR5ue.c7H.59s4lPxJizy9vIwctgd.K6CTyQe', 'Irfan', 'Shreefi', 'abc', NULL, 'admin', 'active', '2025-09-03 20:18:12', '2025-09-03 20:18:12', 1, NULL, NULL),
(47, 'admintest@example.com', '$2a$10$fkBB.lAQx3dTII6cAWkLgObfrnziXsdWlea1LIBcujkI/41JydgOm', 'test', '1234', 'abc', NULL, 'admin', 'active', '2025-09-03 20:20:22', '2025-09-03 20:20:37', 1, NULL, 'cus_SzLsUxi2Zg2XCc'),
(48, 'funding@creditrepairpro.com', '$2a$10$eef5tVoxX0W/gFXPWOvpKeoAkc9.nbuLWGYE7Z6UTm.q6apSZzp/2', 'Funding', 'Managers', NULL, '/uploads/profiles/profile-1758540489623-705678040.PNG', 'funding_manager', 'active', '2025-09-21 17:03:24', '2025-10-23 20:12:52', 1, '2025-10-24 01:12:52', NULL),
(52, 'testadmin@example.com', '$2a$10$2ziZ16wNuhXdS9.KsOyjQeOdaJnHpbBJzZ031YS.TXHdRTWXThLEO', 'Test', 'Admin', 'Test Company', NULL, 'admin', 'active', '2025-09-22 13:31:16', '2025-09-22 13:38:22', 1, '2025-09-22 18:38:22', NULL),
(53, 'hunai2248n@gmail.com', '$2a$10$SEKOKSUMg5BAhf1f/C0if.L2PZ5pCuFvzJleWxljFgQHekR1Z9FZW', 'Admin', 'Test', 'ABC LLC', NULL, 'admin', 'active', '2025-10-25 14:16:43', '2025-10-25 14:17:37', 1, '2025-10-25 19:17:37', NULL),
(54, 'gotey74368@dwakm.com', '$2a$10$LoLbDyuzjqYW1EFooGYGXe.YnPe7XUh7XRFL3aCLYKc0gHBgiNo2e', 'Test', 'ABC', 'Test Comp LLC', NULL, 'admin', 'active', '2025-10-25 14:28:19', '2025-10-25 14:29:01', 1, '2025-10-25 19:28:48', 'cus_TIjwPzJDMGmond'),
(55, 'yoficox540@filipx.com', '$2a$10$//UmBfBHvnDVk0238x45rejQEE8rV1K/6DEseYwSudwBEAxvQ2soS', 'Yofi', 'Cox', 'Yofi LLC', NULL, 'admin', 'active', '2025-10-25 14:44:29', '2025-10-25 14:44:29', 1, NULL, NULL),
(56, 'yotab14930@dwakm.com', '$2a$10$UunYtXVVJJZXL2.cxLZbwu6yePgOiuksCuwwq4guFWF/cM.MgHS46', 'RR', 'RR', 'yotab', NULL, 'admin', 'active', '2025-10-25 15:08:59', '2025-10-25 15:34:22', 1, '2025-10-25 20:34:22', 'cus_TIkb1bvntA9MhO'),
(57, 'xisav87409@filipx.com', '$2b$10$NP7SyYYJryxLI.nVC3HbIOEoYmF8IAY2jEudjJXvEBxAk9WEOI6hC', 'FF', 'FF', 'asdsa', NULL, 'admin', 'active', '2025-10-25 15:57:48', '2025-10-25 18:54:17', 1, '2025-10-25 23:54:17', 'cus_TIo6wyfriKiTn9'),
(58, 'yebipo5863@hh7f.com', '$2a$10$8Eyp1/rhxf3yGUOJngjQb.dHJXdjvbjyC2mu7isqPlPrmbkZv.oZG', 'HH', 'HH', 'LLO', NULL, 'admin', 'active', '2025-10-25 19:05:41', '2025-10-25 19:06:07', 1, '2025-10-26 00:05:59', 'cus_TIoPYMP8qht07m'),
(59, 'kapiw82097@haotuwu.com', '$2a$10$FjlGCjnutS/sK0EUJdbaqOlA0g/clFg6b.5Pd.kySsoCMe6l1V2sm', 'DD', 'DD', 'DD', NULL, 'admin', 'active', '2025-10-25 19:09:15', '2025-10-25 19:11:47', 1, '2025-10-26 00:11:47', 'cus_TIoTG3WgBimjun');

-- --------------------------------------------------------

--
-- Table structure for table `user_activities`
--

CREATE TABLE `user_activities` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity_type` enum('login','logout','create','update','delete','view','export','import') NOT NULL,
  `resource_type` varchar(50) DEFAULT NULL,
  `resource_id` int(11) DEFAULT NULL,
  `description` text NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activities`
--
ALTER TABLE `activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_recipient_id` (`recipient_id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_access_level` (`access_level`),
  ADD KEY `idx_department` (`department`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_last_activity_at` (`last_activity_at`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `admin_subscriptions`
--
ALTER TABLE `admin_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_plan_id` (`plan_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_start_date` (`start_date`),
  ADD KEY `idx_end_date` (`end_date`),
  ADD KEY `idx_next_payment_date` (`next_payment_date`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `affiliates`
--
ALTER TABLE `affiliates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `idx_parent_affiliate_id` (`parent_affiliate_id`);

--
-- Indexes for table `affiliate_clicks`
--
ALTER TABLE `affiliate_clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`),
  ADD KEY `idx_tracking_code` (`tracking_code`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_converted` (`converted`);

--
-- Indexes for table `affiliate_commissions`
--
ALTER TABLE `affiliate_commissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_referral_id` (`referral_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_tier` (`tier`),
  ADD KEY `idx_order_date` (`order_date`),
  ADD KEY `idx_tracking_code` (`tracking_code`);

--
-- Indexes for table `affiliate_notification_settings`
--
ALTER TABLE `affiliate_notification_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `affiliate_id` (`affiliate_id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`);

--
-- Indexes for table `affiliate_payment_history`
--
ALTER TABLE `affiliate_payment_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`),
  ADD KEY `idx_transaction_id` (`transaction_id`),
  ADD KEY `idx_payment_date` (`payment_date`);

--
-- Indexes for table `affiliate_payment_settings`
--
ALTER TABLE `affiliate_payment_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `affiliate_id` (`affiliate_id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`);

--
-- Indexes for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`),
  ADD KEY `idx_referred_user_id` (`referred_user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_referral_date` (`referral_date`);

--
-- Indexes for table `agent_performance`
--
ALTER TABLE `agent_performance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_agent_date` (`agent_id`,`performance_date`),
  ADD KEY `idx_agent_id` (`agent_id`),
  ADD KEY `idx_performance_date` (`performance_date`);

--
-- Indexes for table `analytics`
--
ALTER TABLE `analytics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_metric_period_date` (`user_id`,`metric_type`,`period`,`date`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_metric_type` (`metric_type`),
  ADD KEY `idx_period` (`period`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `article_interactions`
--
ALTER TABLE `article_interactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_article_interaction` (`article_id`,`user_id`,`interaction_type`),
  ADD KEY `idx_article` (`article_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_type` (`interaction_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_table_name` (`table_name`),
  ADD KEY `idx_record_id` (`record_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_changed_by` (`changed_by`),
  ADD KEY `idx_changed_at` (`changed_at`);

--
-- Indexes for table `banks`
--
ALTER TABLE `banks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bank_name` (`name`),
  ADD KEY `idx_banks_funding_manager_id` (`funding_manager_id`),
  ADD KEY `idx_banks_status` (`status`),
  ADD KEY `idx_banks_active` (`is_active`);

--
-- Indexes for table `billing_transactions`
--
ALTER TABLE `billing_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_stripe_payment_intent` (`stripe_payment_intent_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_is_virtual` (`is_virtual`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_card_per_bank` (`bank_id`,`card_name`),
  ADD KEY `idx_cards_bank_id` (`bank_id`),
  ADD KEY `idx_cards_type` (`card_type`),
  ADD KEY `idx_cards_active` (`is_active`),
  ADD KEY `idx_cards_amount_approved` (`amount_approved`),
  ADD KEY `idx_cards_no_of_usage` (`no_of_usage`),
  ADD KEY `idx_cards_average_amount` (`average_amount`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_receiver_id` (`receiver_id`),
  ADD KEY `idx_ticket_reference_id` (`ticket_reference_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `comment_likes`
--
ALTER TABLE `comment_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_comment_user_like` (`comment_id`,`user_id`),
  ADD KEY `idx_comment_id` (`comment_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `idx_affiliate_id` (`affiliate_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_date` (`payment_date`);

--
-- Indexes for table `commission_tiers`
--
ALTER TABLE `commission_tiers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_min_referrals` (`min_referrals`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `community_posts`
--
ALTER TABLE `community_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_pinned` (`is_pinned`);

--
-- Indexes for table `courses`
--
ALTER TABLE `courses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_difficulty` (`difficulty`),
  ADD KEY `idx_featured` (`featured`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_courses_status` (`status`),
  ADD KEY `idx_courses_featured` (`featured`),
  ADD KEY `idx_courses_is_free` (`is_free`),
  ADD KEY `idx_courses_category_id` (`category_id`),
  ADD KEY `idx_courses_instructor_id` (`instructor_id`),
  ADD KEY `idx_courses_rating` (`rating`),
  ADD KEY `idx_courses_difficulty` (`difficulty_level`);

--
-- Indexes for table `course_categories`
--
ALTER TABLE `course_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_parent_category` (`parent_category_id`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_order` (`order_index`);

--
-- Indexes for table `course_chapters`
--
ALTER TABLE `course_chapters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_order_index` (`order_index`);

--
-- Indexes for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_course` (`user_id`,`course_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_completed` (`completed`);

--
-- Indexes for table `course_materials`
--
ALTER TABLE `course_materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_module_id` (`module_id`),
  ADD KEY `idx_video_id` (`video_id`),
  ADD KEY `idx_file_type` (`file_type`),
  ADD KEY `idx_order` (`order_index`);

--
-- Indexes for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_order` (`order_index`),
  ADD KEY `unlock_after_module_id` (`unlock_after_module_id`);

--
-- Indexes for table `course_quizzes`
--
ALTER TABLE `course_quizzes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_module_id` (`module_id`),
  ADD KEY `idx_video_id` (`video_id`),
  ADD KEY `idx_quiz_type` (`quiz_type`),
  ADD KEY `idx_order` (`order_index`);

--
-- Indexes for table `course_videos`
--
ALTER TABLE `course_videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_course_id` (`course_id`),
  ADD KEY `idx_module_id` (`module_id`),
  ADD KEY `idx_order` (`order_index`),
  ADD KEY `idx_is_preview` (`is_preview`);

--
-- Indexes for table `credit_reports`
--
ALTER TABLE `credit_reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_client_bureau_date` (`client_id`,`bureau`,`report_date`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_bureau` (`bureau`),
  ADD KEY `idx_report_date` (`report_date`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `credit_report_history`
--
ALTER TABLE `credit_report_history`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `disputes`
--
ALTER TABLE `disputes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Indexes for table `email_verification_codes`
--
ALTER TABLE `email_verification_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_used` (`used`);

--
-- Indexes for table `event_registrations`
--
ALTER TABLE `event_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_event_user` (`event_id`,`user_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_registered_at` (`registered_at`);

--
-- Indexes for table `faqs`
--
ALTER TABLE `faqs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_order` (`order_index`);
ALTER TABLE `faqs` ADD FULLTEXT KEY `idx_search` (`question`,`answer`);

--
-- Indexes for table `faq_interactions`
--
ALTER TABLE `faq_interactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_faq_interaction` (`faq_id`,`user_id`,`interaction_type`),
  ADD KEY `idx_faq` (`faq_id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_type` (`interaction_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `funding_requests`
--
ALTER TABLE `funding_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewer_id` (`reviewer_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_requested_date` (`requested_date`);

--
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_privacy` (`privacy`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `group_members`
--
ALTER TABLE `group_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_group_user` (`group_id`,`user_id`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `invited_by` (`invited_by`);

--
-- Indexes for table `group_posts`
--
ALTER TABLE `group_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_pinned` (`is_pinned`);

--
-- Indexes for table `invitations`
--
ALTER TABLE `invitations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invitations_email` (`email`),
  ADD KEY `idx_invitations_status` (`status`),
  ADD KEY `idx_invitations_type` (`type`),
  ADD KEY `sent_by` (`sent_by`);

--
-- Indexes for table `knowledge_articles`
--
ALTER TABLE `knowledge_articles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_featured` (`featured`),
  ADD KEY `idx_author` (`author_id`),
  ADD KEY `idx_created_at` (`created_at`);
ALTER TABLE `knowledge_articles` ADD FULLTEXT KEY `idx_search` (`title`,`content`);

--
-- Indexes for table `password_reset_codes`
--
ALTER TABLE `password_reset_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_active_code` (`user_id`,`used`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `pending_registrations`
--
ALTER TABLE `pending_registrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `post_comments`
--
ALTER TABLE `post_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_parent_comment_id` (`parent_comment_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `post_likes`
--
ALTER TABLE `post_likes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_post_user_like` (`post_id`,`user_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `post_reactions`
--
ALTER TABLE `post_reactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_post_user_reaction` (`post_id`,`user_id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_reaction_type` (`reaction_type`);

--
-- Indexes for table `post_shares`
--
ALTER TABLE `post_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_post_id` (`post_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_platform` (`platform`);

--
-- Indexes for table `stripe_config`
--
ALTER TABLE `stripe_config`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_stripe_subscription` (`stripe_subscription_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_billing_cycle` (`billing_cycle`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_sort_order` (`sort_order`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `support_general_settings`
--
ALTER TABLE `support_general_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `support_metrics`
--
ALTER TABLE `support_metrics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_metric_date` (`metric_date`),
  ADD KEY `idx_metric_date` (`metric_date`);

--
-- Indexes for table `support_notification_settings`
--
ALTER TABLE `support_notification_settings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `support_team_members`
--
ALTER TABLE `support_team_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_role` (`role`);

--
-- Indexes for table `support_working_hours`
--
ALTER TABLE `support_working_hours`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_day` (`day_of_week`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `idx_setting_key` (`setting_key`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_is_public` (`is_public`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_assignee_id` (`assignee_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `ticket_analytics`
--
ALTER TABLE `ticket_analytics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_ticket_analytics` (`ticket_id`),
  ADD KEY `idx_ticket_id` (`ticket_id`),
  ADD KEY `idx_first_response` (`first_response_at`),
  ADD KEY `idx_resolved_at` (`resolved_at`),
  ADD KEY `idx_satisfaction` (`customer_satisfaction_rating`);

--
-- Indexes for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_id` (`ticket_id`),
  ADD KEY `idx_author_id` (`author_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_stripe_customer_id` (`stripe_customer_id`);

--
-- Indexes for table `user_activities`
--
ALTER TABLE `user_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_activity_type` (`activity_type`),
  ADD KEY `idx_resource_type` (`resource_type`),
  ADD KEY `idx_resource_id` (`resource_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_ip_address` (`ip_address`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activities`
--
ALTER TABLE `activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `admin_subscriptions`
--
ALTER TABLE `admin_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `affiliates`
--
ALTER TABLE `affiliates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `affiliate_clicks`
--
ALTER TABLE `affiliate_clicks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `affiliate_commissions`
--
ALTER TABLE `affiliate_commissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `affiliate_notification_settings`
--
ALTER TABLE `affiliate_notification_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `affiliate_payment_history`
--
ALTER TABLE `affiliate_payment_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `affiliate_payment_settings`
--
ALTER TABLE `affiliate_payment_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `agent_performance`
--
ALTER TABLE `agent_performance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `analytics`
--
ALTER TABLE `analytics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `article_interactions`
--
ALTER TABLE `article_interactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `banks`
--
ALTER TABLE `banks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `billing_transactions`
--
ALTER TABLE `billing_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `cards`
--
ALTER TABLE `cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `comment_likes`
--
ALTER TABLE `comment_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `commission_payments`
--
ALTER TABLE `commission_payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `commission_tiers`
--
ALTER TABLE `commission_tiers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `community_posts`
--
ALTER TABLE `community_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `courses`
--
ALTER TABLE `courses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `course_categories`
--
ALTER TABLE `course_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `course_chapters`
--
ALTER TABLE `course_chapters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `course_materials`
--
ALTER TABLE `course_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_modules`
--
ALTER TABLE `course_modules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_quizzes`
--
ALTER TABLE `course_quizzes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `course_videos`
--
ALTER TABLE `course_videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `credit_reports`
--
ALTER TABLE `credit_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `credit_report_history`
--
ALTER TABLE `credit_report_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `disputes`
--
ALTER TABLE `disputes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `email_verification_codes`
--
ALTER TABLE `email_verification_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `event_registrations`
--
ALTER TABLE `event_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `faqs`
--
ALTER TABLE `faqs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `faq_interactions`
--
ALTER TABLE `faq_interactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `funding_requests`
--
ALTER TABLE `funding_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `group_members`
--
ALTER TABLE `group_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `group_posts`
--
ALTER TABLE `group_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invitations`
--
ALTER TABLE `invitations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `knowledge_articles`
--
ALTER TABLE `knowledge_articles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `password_reset_codes`
--
ALTER TABLE `password_reset_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pending_registrations`
--
ALTER TABLE `pending_registrations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `post_comments`
--
ALTER TABLE `post_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `post_likes`
--
ALTER TABLE `post_likes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `post_reactions`
--
ALTER TABLE `post_reactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `post_shares`
--
ALTER TABLE `post_shares`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `stripe_config`
--
ALTER TABLE `stripe_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `support_general_settings`
--
ALTER TABLE `support_general_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_metrics`
--
ALTER TABLE `support_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_notification_settings`
--
ALTER TABLE `support_notification_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_team_members`
--
ALTER TABLE `support_team_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_working_hours`
--
ALTER TABLE `support_working_hours`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `ticket_analytics`
--
ALTER TABLE `ticket_analytics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `user_activities`
--
ALTER TABLE `user_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activities`
--
ALTER TABLE `activities`
  ADD CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD CONSTRAINT `admin_notifications_ibfk_1` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admin_notifications_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admin_profiles_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `admin_profiles_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `admin_subscriptions`
--
ALTER TABLE `admin_subscriptions`
  ADD CONSTRAINT `admin_subscriptions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admin_profiles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `admin_subscriptions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  ADD CONSTRAINT `admin_subscriptions_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `admin_subscriptions_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `affiliates`
--
ALTER TABLE `affiliates`
  ADD CONSTRAINT `affiliates_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `affiliates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `affiliates_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `affiliates_ibfk_4` FOREIGN KEY (`parent_affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `affiliate_clicks`
--
ALTER TABLE `affiliate_clicks`
  ADD CONSTRAINT `affiliate_clicks_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_commissions`
--
ALTER TABLE `affiliate_commissions`
  ADD CONSTRAINT `affiliate_commissions_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `affiliate_commissions_ibfk_2` FOREIGN KEY (`referral_id`) REFERENCES `affiliate_referrals` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `affiliate_commissions_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_notification_settings`
--
ALTER TABLE `affiliate_notification_settings`
  ADD CONSTRAINT `affiliate_notification_settings_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_payment_history`
--
ALTER TABLE `affiliate_payment_history`
  ADD CONSTRAINT `affiliate_payment_history_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_payment_settings`
--
ALTER TABLE `affiliate_payment_settings`
  ADD CONSTRAINT `affiliate_payment_settings_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `affiliate_referrals`
--
ALTER TABLE `affiliate_referrals`
  ADD CONSTRAINT `affiliate_referrals_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `affiliate_referrals_ibfk_2` FOREIGN KEY (`referred_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `agent_performance`
--
ALTER TABLE `agent_performance`
  ADD CONSTRAINT `agent_performance_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `analytics`
--
ALTER TABLE `analytics`
  ADD CONSTRAINT `analytics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `article_interactions`
--
ALTER TABLE `article_interactions`
  ADD CONSTRAINT `article_interactions_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `knowledge_articles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `article_interactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `billing_transactions`
--
ALTER TABLE `billing_transactions`
  ADD CONSTRAINT `billing_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cards`
--
ALTER TABLE `cards`
  ADD CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`bank_id`) REFERENCES `banks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chat_messages_ibfk_3` FOREIGN KEY (`ticket_reference_id`) REFERENCES `tickets` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `comment_likes`
--
ALTER TABLE `comment_likes`
  ADD CONSTRAINT `comment_likes_ibfk_1` FOREIGN KEY (`comment_id`) REFERENCES `post_comments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comment_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `commission_payments`
--
ALTER TABLE `commission_payments`
  ADD CONSTRAINT `commission_payments_ibfk_1` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `community_posts`
--
ALTER TABLE `community_posts`
  ADD CONSTRAINT `community_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `courses`
--
ALTER TABLE `courses`
  ADD CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_courses_category` FOREIGN KEY (`category_id`) REFERENCES `course_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_courses_instructor` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_categories`
--
ALTER TABLE `course_categories`
  ADD CONSTRAINT `course_categories_ibfk_1` FOREIGN KEY (`parent_category_id`) REFERENCES `course_categories` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_chapters`
--
ALTER TABLE `course_chapters`
  ADD CONSTRAINT `course_chapters_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_enrollments`
--
ALTER TABLE `course_enrollments`
  ADD CONSTRAINT `course_enrollments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_enrollments_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `course_materials`
--
ALTER TABLE `course_materials`
  ADD CONSTRAINT `course_materials_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_materials_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `course_materials_ibfk_3` FOREIGN KEY (`video_id`) REFERENCES `course_videos` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_modules`
--
ALTER TABLE `course_modules`
  ADD CONSTRAINT `course_modules_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_modules_ibfk_2` FOREIGN KEY (`unlock_after_module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_quizzes`
--
ALTER TABLE `course_quizzes`
  ADD CONSTRAINT `course_quizzes_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_quizzes_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `course_quizzes_ibfk_3` FOREIGN KEY (`video_id`) REFERENCES `course_videos` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `course_videos`
--
ALTER TABLE `course_videos`
  ADD CONSTRAINT `course_videos_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `course_videos_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `course_modules` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `credit_reports`
--
ALTER TABLE `credit_reports`
  ADD CONSTRAINT `credit_reports_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `credit_reports_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `credit_reports_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `disputes`
--
ALTER TABLE `disputes`
  ADD CONSTRAINT `disputes_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Constraints for table `event_registrations`
--
ALTER TABLE `event_registrations`
  ADD CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `calendar_events` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `faq_interactions`
--
ALTER TABLE `faq_interactions`
  ADD CONSTRAINT `faq_interactions_ibfk_1` FOREIGN KEY (`faq_id`) REFERENCES `faqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `faq_interactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `funding_requests`
--
ALTER TABLE `funding_requests`
  ADD CONSTRAINT `funding_requests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `funding_requests_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `group_members`
--
ALTER TABLE `group_members`
  ADD CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_members_ibfk_3` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `group_posts`
--
ALTER TABLE `group_posts`
  ADD CONSTRAINT `group_posts_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `invitations`
--
ALTER TABLE `invitations`
  ADD CONSTRAINT `invitations_ibfk_1` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `knowledge_articles`
--
ALTER TABLE `knowledge_articles`
  ADD CONSTRAINT `knowledge_articles_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_codes`
--
ALTER TABLE `password_reset_codes`
  ADD CONSTRAINT `password_reset_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `post_comments`
--
ALTER TABLE `post_comments`
  ADD CONSTRAINT `post_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_comments_ibfk_3` FOREIGN KEY (`parent_comment_id`) REFERENCES `post_comments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `post_likes`
--
ALTER TABLE `post_likes`
  ADD CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `post_reactions`
--
ALTER TABLE `post_reactions`
  ADD CONSTRAINT `post_reactions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `post_shares`
--
ALTER TABLE `post_shares`
  ADD CONSTRAINT `post_shares_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `community_posts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `post_shares_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stripe_config`
--
ALTER TABLE `stripe_config`
  ADD CONSTRAINT `stripe_config_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `stripe_config_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD CONSTRAINT `subscription_plans_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `subscription_plans_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `support_notification_settings`
--
ALTER TABLE `support_notification_settings`
  ADD CONSTRAINT `support_notification_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tickets_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticket_analytics`
--
ALTER TABLE `ticket_analytics`
  ADD CONSTRAINT `ticket_analytics_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ticket_messages`
--
ALTER TABLE `ticket_messages`
  ADD CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_activities`
--
ALTER TABLE `user_activities`
  ADD CONSTRAINT `user_activities_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
