-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 20, 2025 at 01:17 AM
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
-- Database: `cleaning_service`
--

-- --------------------------------------------------------

--
-- Table structure for table `bills`
--

CREATE TABLE `bills` (
  `bill_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('open','paid','disputed','revised') NOT NULL DEFAULT 'open',
  `admin_note` text DEFAULT NULL,
  `client_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `client_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `email` varchar(200) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `stripe_customer_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `cc_last4` char(4) DEFAULT NULL,
  `cc_brand` varchar(20) DEFAULT NULL,
  `total_jobs` int(11) DEFAULT 0,
  `completed_jobs` int(11) DEFAULT 0,
  `on_time_payments` int(11) DEFAULT 0,
  `late_payments` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`client_id`, `username`, `name`, `email`, `phone`, `address`, `password_hash`, `stripe_customer_id`, `created_at`, `cc_last4`, `cc_brand`, `total_jobs`, `completed_jobs`, `on_time_payments`, `late_payments`) VALUES
(1, 'js_sageotter765', 'Jordan Smith', 'js2001@gmail.com', '3132887890', '123 Greenfield st, Detroit michigan ', '$2b$10$RRFfNlI5lFPVq9NBaDqvEOK.COl7m5raHV2gHoY3of/2T30r2aeLm', NULL, '2025-11-14 07:51:57', NULL, NULL, 0, 0, 0, 0),
(2, 'rt_quickraven774', 'Richard Thomas', 'RichThommas@gmail.com', '3234567898', '23 Court Detroit, Michigan 48226', '$2b$10$cPuN5xezg9u.BWjK0r6zG.2cEu/mGD7JdeijASpSmPbGk6TRzZ.dW', NULL, '2025-11-16 20:57:41', NULL, NULL, 0, 0, 0, 0),
(3, 'tj_sageotter526', 'Tasha Johnson', 'TashaJ25@gmail.colm', '2345678989', '17 Luke Street Detroit Mc', '$2b$10$RNIhDfbPCEsfqGf0ml1mqe7lery0ONCPoAGLKPVCPCB7TtJTmPDTu', NULL, '2025-11-16 21:05:57', '9364', 'Visa', 0, 0, 0, 0),
(4, 'sarah_thompson', 'Sarah Thompson', 'sarah.thompson@example.com', '313-555-0141', '1240 Maple St, Detroit, MI 48201', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '1234', 'Visa', 10, 10, 8, 2),
(5, 'michael_lee', 'Michael Lee', 'michael.lee@example.com', '248-555-0222', '892 Grand Ave, Ferndale, MI 48220', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '5678', 'Mastercard', 9, 9, 7, 2),
(6, 'jasmine_roberts', 'Jasmine Roberts', 'jasmine.roberts@example.com', '586-555-0333', '441 Pine Ridge Dr, Warren, MI 48088', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '9012', 'Visa', 8, 8, 8, 0),
(7, 'david_martinez', 'David Martinez', 'david.martinez@example.com', '734-555-0444', '77 Lakeview Blvd, Ann Arbor, MI 48103', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '3456', 'Discover', 7, 7, 7, 0),
(8, 'nicole_jackson', 'Nicole Jackson', 'nicole.jackson@example.com', '313-555-0555', '2090 Clover Ln, Detroit, MI 48221', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '7890', 'Amex', 6, 6, 6, 0),
(9, 'brian_williams', 'Brian Williams', 'brian.williams@example.com', '248-555-0666', '560 Orchard Way, Royal Oak, MI 48067', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '2222', 'Visa', 5, 5, 5, 0),
(10, 'taylor_brown', 'Taylor Brown', 'taylor.brown@example.com', '586-555-0777', '339 Sunset Ct, Sterling Heights, MI 48310', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '3333', 'Mastercard', 4, 4, 4, 0),
(11, 'kevin_patel', 'Kevin Patel', 'kevin.patel@example.com', '734-555-0888', '980 Willowbrook Dr, Ypsilanti, MI 48197', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '4444', 'Visa', 3, 3, 3, 0),
(12, 'amanda_davis', 'Amanda Davis', 'amanda.davis@example.com', '313-555-0999', '1510 Lincoln St, Detroit, MI 48208', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '5555', 'Discover', 2, 2, 2, 0),
(13, 'jordan_clark', 'Jordan Clark', 'jordan.clark@example.com', '248-555-0101', '220 Greenfield Rd, Oak Park, MI 48237', '$2b$10$abcdefghijklmnopqrstuv12345678901234567890123456789012', NULL, '2025-11-17 21:53:05', '6666', 'Visa', 1, 1, 1, 0),
(14, 'tr_bravepuma230', 'Tim Robert', 'Timrobert123@gmail.com', '3453453453', '123 Court Ave detroit ', '$2b$10$Ac.wP9kfTG0dK9q47NH1Y.DaMal8Fov6cJiULL8jO6G0UlITyGulK', NULL, '2025-11-17 22:27:39', '5566', 'Visa', 0, 0, 0, 0),
(15, 'nw_calmraven244', 'North West', 'Nwest@example.com', '234567898', '10 Row st Roseville Michiagn', '$2b$10$Gc2e9Mp4DQo3YFCM/W2x8e/NQAjSAVPdKeizJJ.P.p9p50oQb5.oO', NULL, '2025-11-18 16:57:39', NULL, NULL, 0, 0, 0, 0),
(16, 'rl_sageraven707', 'Rachel Long', 'RLong@gmail.com', '3135678909', '1500 Red St Detroit', '$2b$10$ooHctJP.mH9UutrYWii3QO3FzIILF7Ox1494f.2dF3ASiayjZoy7C', NULL, '2025-11-18 17:38:27', NULL, NULL, 0, 0, 0, 0),
(17, 'aj_calmotter101', 'Alex Johnson', 'alex.johnson@example.com', '313-555-0101', '123 Oak St, Detroit, MI 48201', 'dummyhash1', NULL, '2025-01-05 15:15:00', '4242', 'Visa', 0, 0, 0, 0),
(18, 'mb_brightfox202', 'Maria Brown', 'maria.brown@example.com', '313-555-0102', '456 Pine Ave, Detroit, MI 48202', 'dummyhash2', NULL, '2025-02-10 14:00:00', '1881', 'Mastercard', 0, 0, 0, 0),
(19, 'ts_sharplynx303', 'Tony Smith', 'tony.smith@example.com', '313-555-0103', '789 Maple Blvd, Detroit, MI 48203', 'dummyhash3', NULL, '2025-03-03 16:20:00', NULL, NULL, 0, 0, 0, 0),
(20, 'kc_mightyowl404', 'Karen Cole', 'karen.cole@example.com', '313-555-0104', '321 Cedar Rd, Detroit, MI 48204', 'dummyhash4', NULL, '2025-04-15 18:45:00', '9999', 'Visa', 0, 0, 0, 0),
(21, 'dl_kindraven505', 'Derek Lee', 'derek.lee@example.com', '313-555-0105', '654 Birch Ln, Detroit, MI 48205', 'dummyhash5', NULL, '2025-05-01 17:10:00', '5555', 'Discover', 0, 0, 0, 0),
(22, 'hc_quickotter606', 'Hannah Clark', 'hannah.clark@example.com', '313-555-0106', '987 Walnut St, Detroit, MI 48206', 'dummyhash6', NULL, '2025-06-01 13:30:00', NULL, NULL, 0, 0, 0, 0),
(23, 'rb_sagewolf707', 'Ryan Bell', 'ryan.bell@example.com', '313-555-0107', '159 Elm Dr, Detroit, MI 48207', 'dummyhash7', NULL, '2025-07-12 20:22:00', NULL, NULL, 0, 0, 0, 0),
(24, 'at_kindraven390', 'Alice Taylor', 'alicetaylor@gmail.com', '2564563698', '15 Court Ave Detroit Michigan', '$2b$10$5sKTsgRkBGf2LOirt.ZF2ee284ent/mO6TgyeyFJ05LY289y2cgc2', NULL, '2025-11-20 00:00:45', NULL, NULL, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `client_cards`
--

CREATE TABLE `client_cards` (
  `card_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `cc_last4` char(4) NOT NULL,
  `cc_brand` varchar(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `client_cards`
--

INSERT INTO `client_cards` (`card_id`, `client_id`, `cc_last4`, `cc_brand`, `created_at`) VALUES
(1, 1, '7777', 'Visa', '2025-11-14 12:46:44');

-- --------------------------------------------------------

--
-- Table structure for table `client_request_ratings`
--

CREATE TABLE `client_request_ratings` (
  `rating_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comments` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `status` enum('scheduled','completed','approved','disputed','cancelled') NOT NULL DEFAULT 'scheduled',
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('not_due','due','paid','disputed','waived') NOT NULL DEFAULT 'not_due',
  `payment_due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `admin_note` text DEFAULT NULL,
  `client_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `request_id`, `client_id`, `scheduled_date`, `status`, `total_amount`, `payment_status`, `payment_due_date`, `created_at`, `admin_note`, `client_note`) VALUES
(1, 1, 1, '2025-11-15 09:52:00', 'completed', 140.00, 'paid', '2025-11-22', '2025-11-15 16:26:02', NULL, NULL),
(2, 3, 3, '2025-11-17 08:06:00', 'completed', 500.00, 'paid', '2025-11-24', '2025-11-16 21:08:36', NULL, NULL),
(3, 3, 3, '2025-11-17 08:06:00', 'completed', 500.00, 'paid', '2025-11-24', '2025-11-16 21:10:10', NULL, 'Thank you nice work'),
(4, 3, 3, '2025-11-17 08:06:00', 'completed', 500.00, 'paid', '2025-11-24', '2025-11-17 01:45:01', NULL, NULL),
(5, 2, 2, '2025-11-17 15:58:00', 'completed', 500.00, 'due', '2025-11-24', '2025-11-17 04:27:07', NULL, NULL),
(6, 3, 3, '2025-11-17 08:06:00', 'completed', 500.00, 'paid', '2025-11-24', '2025-11-17 16:22:51', NULL, NULL),
(7, 4, 14, '2025-12-18 17:28:00', 'completed', 500.00, 'due', '2025-11-24', '2025-11-17 22:30:14', NULL, NULL),
(8, 4, 14, '2025-12-18 17:28:00', 'completed', 450.00, 'due', '2025-11-24', '2025-11-17 22:35:11', NULL, NULL),
(9, 5, 16, '2025-12-17 13:41:00', 'scheduled', 0.00, 'not_due', NULL, '2025-11-18 19:42:12', NULL, NULL),
(10, 5, 16, '2025-12-17 13:41:00', 'completed', 300.00, 'due', '2025-11-25', '2025-11-18 20:27:37', NULL, NULL),
(11, 6, 17, '2025-01-10 09:00:00', 'completed', 150.00, 'paid', '2025-01-17', '2025-01-10 17:00:00', 'We can fit you in Friday morning.', 'Thanks, that works great.'),
(12, 7, 17, '2025-03-15 13:30:00', 'completed', 280.00, 'paid', '2025-03-22', '2025-03-15 20:30:00', 'Deep clean confirmed for Saturday.', 'The house looked amazing, thank you!'),
(13, 8, 18, '2025-04-02 10:00:00', 'completed', 360.00, 'paid', '2025-04-10', '2025-04-02 20:10:00', 'We will bring extra supplies for heavy cleaning.', 'Inspector said everything was spotless.'),
(14, 13, 20, '2025-06-05 13:00:00', 'completed', 280.00, '', '2025-06-15', '2025-06-05 21:20:00', 'We will focus on bathrooms and baseboards.', 'Please send pictures after you finish.'),
(15, 14, 20, '2025-08-15 09:00:00', 'completed', 160.00, 'due', '2025-11-25', '2025-08-15 15:45:00', 'Scheduled after your last open house.', NULL),
(16, 15, 21, '2025-07-18 14:00:00', 'completed', 130.00, 'disputed', '2025-07-25', '2025-07-18 21:00:00', 'We will only use pet-safe cleaners.', 'There was some dust left on shelves. I would like a partial refund.'),
(17, 16, 24, '2025-11-20 11:01:00', 'scheduled', 0.00, 'not_due', NULL, '2025-11-20 00:10:32', NULL, NULL),
(18, 12, 19, '2025-09-10 08:00:00', 'scheduled', 0.00, 'not_due', NULL, '2025-11-20 00:12:44', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `quotes`
--

CREATE TABLE `quotes` (
  `quote_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_photos`
--

CREATE TABLE `request_photos` (
  `photo_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_photos`
--

INSERT INTO `request_photos` (`photo_id`, `request_id`, `file_path`, `uploaded_at`) VALUES
(1, 1, '5095e98162354d5eb027f93c891ed7fe', '2025-11-14 07:54:12'),
(2, 2, 'da29aa99912acb9e57aa37e10f9db79a', '2025-11-16 21:01:21'),
(3, 2, 'c3a9b3f25a16f5e884fcd61338a905b2', '2025-11-16 21:01:21'),
(4, 2, '4e3472aea7828145bc80f9e032a6f90e', '2025-11-16 21:01:21'),
(5, 2, '6eafe531637008066946f476d7b5bc45', '2025-11-16 21:01:21'),
(6, 2, 'f8c06cfd6d156e8c48986ad1512f0047', '2025-11-16 21:01:21'),
(7, 3, '2878706ed2e06b62ce8b2140356d31bb', '2025-11-16 21:07:13'),
(8, 3, 'd281053b163b8f2c45bf39f8fc2c5590', '2025-11-16 21:07:13'),
(9, 3, 'e693cb69a7798f6f2335c8bf094b3f6a', '2025-11-16 21:07:13'),
(10, 3, '04f2825ce57b8a52fcfbebe71f0d4aad', '2025-11-16 21:07:13'),
(11, 3, '6ba3e5d3a238498ea9338b7cce88ab5b', '2025-11-16 21:07:13'),
(12, 4, 'e083665e2454f4aa43dfac6f41ec46b8', '2025-11-17 22:28:31'),
(13, 4, '028ed66bdd10b30c80f2e0b1577b6d12', '2025-11-17 22:28:31'),
(14, 4, '7db72184e16514d68d87726caf7d52cf', '2025-11-17 22:28:31'),
(15, 4, 'b4269551a2d20e4b943095bf72f61207', '2025-11-17 22:28:31'),
(16, 4, '8311926ba55f42882935afab29dbb0c0', '2025-11-17 22:28:31'),
(17, 5, '8003462cc8842de60a01eacf4c3293f4', '2025-11-18 17:41:20'),
(18, 5, 'caea4c53cc2dcda46f7ab01540bba640', '2025-11-18 17:41:20'),
(19, 5, 'd51e674cb0d19eb2cc1bf3106b5deb82', '2025-11-18 17:41:20'),
(20, 5, '2c24f4cb38bcc4bdce5d6c9128ea88c6', '2025-11-18 17:41:20'),
(21, 5, '31a4bba4fc2da4535d5f6138b978e831', '2025-11-18 17:41:20'),
(22, 16, 'd1ec3107e48b195688929560c1b12095', '2025-11-20 00:02:02'),
(23, 16, '5df6e4cb45c5969a5f3a6dbb981d3bdc', '2025-11-20 00:02:02'),
(24, 16, '60f9c315203b74afcd401945faca0e64', '2025-11-20 00:02:02'),
(25, 16, 'e956d64617bc63b0c2943653c0521ee7', '2025-11-20 00:02:02'),
(26, 16, '6bbed34c3f6479eb0ea1477641a8d6cf', '2025-11-20 00:02:02');

-- --------------------------------------------------------

--
-- Table structure for table `service_requests`
--

CREATE TABLE `service_requests` (
  `request_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `service_address` varchar(255) NOT NULL,
  `cleaning_type` varchar(50) NOT NULL,
  `num_rooms` int(11) NOT NULL DEFAULT 1,
  `preferred_start` datetime DEFAULT NULL,
  `proposed_budget` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','quoted','accepted','rejected','counter') NOT NULL DEFAULT 'pending',
  `quote_price` decimal(10,2) DEFAULT NULL,
  `quote_time_window` varchar(255) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `client_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_requests`
--

INSERT INTO `service_requests` (`request_id`, `client_id`, `service_address`, `cleaning_type`, `num_rooms`, `preferred_start`, `proposed_budget`, `notes`, `status`, `quote_price`, `quote_time_window`, `admin_note`, `client_note`, `created_at`) VALUES
(1, 1, '123 greenfield st detroit michigan', 'basic', 3, '2025-11-15 09:52:00', 200.00, 'Pet friendly ', 'accepted', 140.00, NULL, NULL, NULL, '2025-11-14 07:54:12'),
(2, 2, '23 Court Detroit Michigan 48226 ', 'deep', 5, '2025-11-17 15:58:00', 500.00, NULL, 'accepted', 250.00, 'works', NULL, NULL, '2025-11-16 21:01:21'),
(3, 3, '17 Luke street detroit michigan', 'deep', 5, '2025-11-17 08:06:00', 500.00, 'Pet friendly i need it done while kids are in school', 'accepted', 250.00, NULL, NULL, NULL, '2025-11-16 21:07:13'),
(4, 14, '23 Court Detroit Michigan 48226 ', 'basic', 10, '2025-12-18 17:28:00', NULL, NULL, 'accepted', 500.00, 'December 18th', NULL, NULL, '2025-11-17 22:28:31'),
(5, 16, '1500 Red Street Detroit', 'deep', 5, '2025-12-17 13:41:00', NULL, NULL, '', 300.00, 'December 17', NULL, NULL, '2025-11-18 17:41:20'),
(6, 17, '123 Oak St, Detroit, MI 48201', 'basic', 3, '2025-01-10 09:00:00', 140.00, 'Regular maintenance clean before hosting family.', 'accepted', 150.00, 'Fri 9–11am', 'We can fit you in Friday morning.', 'Thanks, that works great.', '2025-01-05 16:00:00'),
(7, 17, '123 Oak St, Detroit, MI 48201', 'deep', 4, '2025-03-15 13:30:00', 260.00, 'Spring deep clean – focus on kitchen and bathrooms.', '', 280.00, 'Sat 1–4pm', 'Deep clean confirmed for Saturday.', 'The house looked amazing, thank you!', '2025-03-01 15:45:00'),
(8, 18, '456 Pine Ave, Detroit, MI 48202', 'move-out', 5, '2025-04-02 10:00:00', 350.00, 'Move-out clean before inspection.', '', 360.00, 'Wed 10–2pm', 'We will bring extra supplies for heavy cleaning.', 'Inspector said everything was spotless.', '2025-03-20 13:15:00'),
(9, 18, '456 Pine Ave, Detroit, MI 48202', 'basic', 2, '2025-10-05 15:00:00', 110.00, 'Quick clean after birthday party.', 'quoted', 120.00, 'Sun 3–5pm', 'Quote sent: includes kitchen and living room.', NULL, '2025-09-25 16:10:00'),
(10, 19, '789 Maple Blvd, Detroit, MI 48203', 'basic', 2, '2025-02-12 09:30:00', 100.00, 'Thinking about a basic clean, price-sensitive.', '', 120.00, 'Wed 9–11am', 'We can do it Wednesday morning.', 'That is a little high, I will hold off.', '2025-02-01 19:30:00'),
(11, 19, '789 Maple Blvd, Detroit, MI 48203', 'deep', 3, '2025-05-20 10:00:00', 180.00, 'Considering a deep clean once work slows down.', '', 210.00, 'Tue 10–1pm', 'This deep clean includes appliance surfaces.', 'I will reach back out closer to summer.', '2025-05-05 20:00:00'),
(12, 19, '789 Maple Blvd, Detroit, MI 48203', 'basic', 1, '2025-09-10 08:00:00', 70.00, 'Maybe just a quick refresh.', 'accepted', 90.00, 'Thu 8–10am', NULL, 'Can you do $75 instead?', '2025-09-01 13:45:00'),
(13, 20, '321 Cedar Rd, Detroit, MI 48204', 'deep', 4, '2025-06-05 13:00:00', 260.00, 'Deep clean for listing the home.', '', 280.00, 'Thu 1–4pm', 'We will focus on bathrooms and baseboards.', 'Please send pictures after you finish.', '2025-05-25 12:40:00'),
(14, 20, '321 Cedar Rd, Detroit, MI 48204', 'basic', 3, '2025-08-15 09:00:00', 150.00, 'Follow-up basic clean after showings.', '', 160.00, 'Fri 9–11am', 'Scheduled after your last open house.', NULL, '2025-08-01 14:05:00'),
(15, 21, '654 Birch Ln, Detroit, MI 48205', 'basic', 2, '2025-07-18 14:00:00', 120.00, 'Pet-friendly products only.', '', 130.00, 'Fri 2–4pm', 'We will only use pet-safe cleaners.', 'There was some dust left on shelves.', '2025-07-05 15:55:00'),
(16, 24, '15 Court Ave Detroit Michigan', 'deep', 5, '2025-11-20 11:01:00', 450.00, 'Pet friendly products only', 'accepted', 450.00, '11/20/25 11am ', NULL, NULL, '2025-11-20 00:02:02');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bills`
--
ALTER TABLE `bills`
  ADD PRIMARY KEY (`bill_id`),
  ADD KEY `fk_bills_order` (`order_id`),
  ADD KEY `fk_bills_client` (`client_id`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`client_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `client_cards`
--
ALTER TABLE `client_cards`
  ADD PRIMARY KEY (`card_id`);

--
-- Indexes for table `client_request_ratings`
--
ALTER TABLE `client_request_ratings`
  ADD PRIMARY KEY (`rating_id`),
  ADD KEY `fk_rating_client` (`client_id`),
  ADD KEY `fk_rating_request` (`request_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `fk_orders_request` (`request_id`),
  ADD KEY `fk_orders_client` (`client_id`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
  ADD PRIMARY KEY (`quote_id`),
  ADD KEY `fk_quotes_request` (`request_id`);

--
-- Indexes for table `request_photos`
--
ALTER TABLE `request_photos`
  ADD PRIMARY KEY (`photo_id`),
  ADD KEY `fk_photos_request` (`request_id`);

--
-- Indexes for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_requests_client` (`client_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bills`
--
ALTER TABLE `bills`
  MODIFY `bill_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `client_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `client_cards`
--
ALTER TABLE `client_cards`
  MODIFY `card_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `client_request_ratings`
--
ALTER TABLE `client_request_ratings`
  MODIFY `rating_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
  MODIFY `quote_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request_photos`
--
ALTER TABLE `request_photos`
  MODIFY `photo_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `service_requests`
--
ALTER TABLE `service_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bills`
--
ALTER TABLE `bills`
  ADD CONSTRAINT `fk_bills_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bills_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE;

--
-- Constraints for table `client_request_ratings`
--
ALTER TABLE `client_request_ratings`
  ADD CONSTRAINT `fk_rating_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_rating_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_orders_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `quotes`
--
ALTER TABLE `quotes`
  ADD CONSTRAINT `fk_quotes_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `request_photos`
--
ALTER TABLE `request_photos`
  ADD CONSTRAINT `fk_photos_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`request_id`) ON DELETE CASCADE;

--
-- Constraints for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD CONSTRAINT `fk_requests_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`client_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
