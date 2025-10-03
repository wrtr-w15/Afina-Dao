-- MySQL dump 10.13  Distrib 9.4.0, for macos15.4 (arm64)
--
-- Host: localhost    Database: afina_dao_wiki
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `id` varchar(36) NOT NULL,
  `ip` varchar(45) NOT NULL,
  `user_agent` text NOT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_sessions`
--

LOCK TABLES `auth_sessions` WRITE;
/*!40000 ALTER TABLE `auth_sessions` DISABLE KEYS */;
INSERT INTO `auth_sessions` VALUES ('0e78b9eb-8b3b-4d4d-b2ea-fbfbc560feb7','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:24:56','2025-10-02 16:24:56'),('10fedde9-be3c-46f2-87f4-ae166aae4d75','::1','curl/8.7.1','approved','2025-10-02 16:22:06','2025-10-02 16:22:12'),('23d85954-2988-42f2-877e-37aa881e4c17','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','approved','2025-10-03 07:49:54','2025-10-03 07:49:58'),('2f422a7b-d0b6-4c9a-994b-b3f5c1ffa9ae','::1','curl/8.7.1','approved','2025-10-02 16:15:28','2025-10-02 16:15:34'),('30cb960e-60b2-4410-a1a2-558a19e308a7','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:14:39','2025-10-02 16:14:39'),('50b12f86-f579-4b42-a09e-12ccd94c1e61','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:16:16','2025-10-02 16:16:16'),('51262117-ddf5-415c-9dee-ac2b094a870d','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:20:43','2025-10-02 16:20:43'),('864570ec-7e5d-4cc7-9beb-5db3911d9e08','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:27:41','2025-10-02 16:27:41'),('8c43b3eb-2e19-4669-806c-966a3a3126a5','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','pending','2025-10-02 16:16:06','2025-10-02 16:16:06'),('ac72bc5e-ee13-4562-a820-77727357debc','::1','curl/8.7.1','approved','2025-10-02 16:18:53','2025-10-02 16:18:58'),('beb112aa-e668-495a-8ec9-f30ee024564c','::1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36','approved','2025-10-02 16:44:33','2025-10-02 16:44:35'),('c39a0413-72fb-4e2e-aee7-976eb5baad43','::1','curl/8.7.1','approved','2025-10-02 16:18:12','2025-10-02 16:18:41'),('e7f46b4a-60d2-4b2f-838c-788db328c18b','::1','curl/8.7.1','pending','2025-10-02 16:30:25','2025-10-02 16:30:25'),('f70de696-2481-4377-bd74-f0f5490e1e10','::1','curl/8.7.1','approved','2025-10-02 16:27:05','2025-10-02 16:27:11');
/*!40000 ALTER TABLE `auth_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `name` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(7) DEFAULT '#3B82F6',
  `icon` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES ('0c244c06-a036-11f0-8754-eb7fb81f72dd','PerpDex',NULL,'#EC4899','Target',1,4,'2025-10-03 08:50:44','2025-10-03 08:50:44'),('e9a40cb6-a035-11f0-8754-eb7fb81f72dd','Testnet',NULL,'#06B6D4','Bookmark',1,1,'2025-10-03 08:49:46','2025-10-03 08:49:46'),('f0b33b94-a035-11f0-8754-eb7fb81f72dd','Mainnet',NULL,'#EF4444','Tag',1,2,'2025-10-03 08:49:58','2025-10-03 08:49:58'),('f7fb6692-a035-11f0-8754-eb7fb81f72dd','NFT',NULL,'#6366F1','Tag',1,3,'2025-10-03 08:50:10','2025-10-03 08:50:10');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pricing_settings`
--

DROP TABLE IF EXISTS `pricing_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_settings` (
  `id` varchar(36) NOT NULL,
  `installation_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `monthly_price_per_account` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_multipliers` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pricing_settings`
--

LOCK TABLES `pricing_settings` WRITE;
/*!40000 ALTER TABLE `pricing_settings` DISABLE KEYS */;
INSERT INTO `pricing_settings` VALUES ('default-settings',100.00,0.50,'{\"1\": 1, \"2\": 0.95, \"3\": 0.9, \"4\": 0.9, \"5\": 0.85, \"6\": 0.85, \"7\": 0.75, \"8\": 0.75, \"9\": 0.75, \"10\": 0.75}','2025-10-02 14:30:11','2025-10-02 14:58:57');
/*!40000 ALTER TABLE `pricing_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_block_links`
--

DROP TABLE IF EXISTS `project_block_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_block_links` (
  `id` varchar(36) NOT NULL,
  `block_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `type` enum('website','github','documentation','demo','other') NOT NULL DEFAULT 'other',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_block_links_block_id` (`block_id`),
  CONSTRAINT `project_block_links_ibfk_1` FOREIGN KEY (`block_id`) REFERENCES `project_blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_block_links`
--

LOCK TABLES `project_block_links` WRITE;
/*!40000 ALTER TABLE `project_block_links` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_block_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_block_translations`
--

DROP TABLE IF EXISTS `project_block_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_block_translations` (
  `id` varchar(36) NOT NULL,
  `block_id` varchar(36) NOT NULL,
  `locale` varchar(10) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `gif_caption` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_block_locale` (`block_id`,`locale`),
  CONSTRAINT `project_block_translations_ibfk_1` FOREIGN KEY (`block_id`) REFERENCES `project_blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_block_translations`
--

LOCK TABLES `project_block_translations` WRITE;
/*!40000 ALTER TABLE `project_block_translations` DISABLE KEYS */;
INSERT INTO `project_block_translations` VALUES ('3d6d93da-05f5-4470-bdc8-cc7f807920b8','60815d5b-1fb4-4e8d-ab78-9988dc52a580','ua','✅ Скрипти які будуть запущені','- Щоденне спілкування за допомогою ІІ-агентів **Nous** та **HyperBolic**, що дозволяє фармити відразу кілька дропів.  \n\nКлієнт може:  \n- Надати власні API-ключі (у цьому випадку дропи належать клієнту, і він може відстежувати їхній стан у особистому кабінеті).  \n- Використовувати орендні ключі нашої команди (дропи за такі ключі клієнту не нараховуються).  ',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26'),('8452c009-9c8a-43c2-ab3a-a28b58b1fcf0','f6d918af-e32e-45c4-8c04-d55fb2fdd380','en','⚒️ Available Activities','### Registration  \n- When creating an account on the platform, the user receives **1000 points**.  \n- Points are credited immediately after confirming registration.  \n\n### Daily Login  \n- For each login to the platform, the user receives **10 points**.  \n- Points are credited once per day.  \n- The system tracks login time to prevent abuse.  \n\n### Interaction with the Robot  \n- The platform provides a **chat for live interaction** with robots.  \n- The user writes a command or message in the chat.  \n- The robot performs the specified action in **real time**.  \n- This activity is recorded in the system and grants **additional points**.  ',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26'),('8b1de073-cd2d-4c9d-a871-24e3e51ee657','f6d918af-e32e-45c4-8c04-d55fb2fdd380','ru','⚒️ Доступные Активности','### Регистрация\n- При создании аккаунта на платформе пользователь получает 1000 поинтов.  \n- Поинты зачисляются сразу после подтверждения регистрации.  \n\n### Ежедневный вход\n- За каждый вход на платформу начисляется 10 поинтов.  \n- Начисления происходят один раз в день.  \n- Система фиксирует время входа, чтобы избежать накрутки.  \n\n### Общение с роботом\n- В платформе доступен чат для взаимодействия с роботами в режиме стрима.  \n- Пользователь пишет команду или сообщение в чат.  \n- Робот в прямом эфире выполняет действие, указанное пользователем.  \n- Активность учитывается в системе и приносит дополнительные поинты. ',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26'),('93bfc8d2-5cd2-4528-851c-ebf5a133cb22','60815d5b-1fb4-4e8d-ab78-9988dc52a580','ru','✅ Скрипты которые будут запущены ','- **Ежедневное взаимодействие** с ИИ-агентами **Nous** и **HyperBolic**, что позволяет **фармить сразу несколько дропов**.  \n\n**Клиент может:**  \n- **Предоставить собственные API-ключи** — дропы **принадлежат клиенту**, и он может **отслеживать их в личном кабинете**.  \n- **Использовать арендные ключи нашей команды** — дропы за **арендные ключи клиенту не начисляются**.  ',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26'),('c0cea89b-018c-4847-a035-651901d526a0','60815d5b-1fb4-4e8d-ab78-9988dc52a580','en','✅ Scripts to be launched','- **Daily interaction** with AI agents **Nous** and **HyperBolic**, enabling **farming multiple drops at once**.\n\n**Client can:**\n- **Provide own API keys** — drops **belong to the client** and can be **tracked in the personal dashboard**.  \n- **Use rental keys from our team** — drops from **rental keys are not credited** to the client.',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26'),('cefcafd0-4cb0-4439-b9d8-17995f7f8798','f6d918af-e32e-45c4-8c04-d55fb2fdd380','ua','⚒️ Доступні активності','### Реєстрація\n- При створенні акаунта на платформі користувач отримує 1000 поінтів.  \n- Поінти зараховуються одразу після підтвердження реєстрації.  \n\n### Щоденний вхід\n- За кожен вхід на платформу нараховується 10 поінтів.  \n- Нарахування відбувається один раз на день.  \n- Система фіксує час входу, щоб уникнути накрутки.  \n\n### Спілкування з роботом\n- На платформі доступний чат для взаємодії з роботами в режимі стріму.  \n- Користувач пише команду або повідомлення в чат.  \n- Робот у прямому ефірі виконує дію, вказану користувачем.  \n- Активність враховується в системі та приносить додаткові поінти.  ',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26');
/*!40000 ALTER TABLE `project_block_translations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_blocks`
--

DROP TABLE IF EXISTS `project_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_blocks` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `gif_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gif_caption` text,
  PRIMARY KEY (`id`),
  KEY `idx_project_blocks_project_id` (`project_id`),
  CONSTRAINT `project_blocks_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_blocks`
--

LOCK TABLES `project_blocks` WRITE;
/*!40000 ALTER TABLE `project_blocks` DISABLE KEYS */;
INSERT INTO `project_blocks` VALUES ('60815d5b-1fb4-4e8d-ab78-9988dc52a580','01a37a7c-1b9c-4bde-b363-0da9efe72719','','',NULL,'2025-10-03 10:09:26','2025-10-03 10:09:26',NULL),('f6d918af-e32e-45c4-8c04-d55fb2fdd380','01a37a7c-1b9c-4bde-b363-0da9efe72719','⚒️ Доступные Активности','## Регистрация\n- При создании аккаунта на платформе пользователь получает 1000 поинтов.  \n- Поинты зачисляются сразу после подтверждения регистрации.  \n\n## Ежедневный вход\n- За каждый вход на платформу начисляется 10 поинтов.  \n- Начисления происходят один раз в день.  \n- Система фиксирует время входа, чтобы избежать накрутки.  \n\n## Общение с роботом\n- В платформе доступен чат для взаимодействия с роботами в режиме стрима.  \n- Пользователь пишет команду или сообщение в чат.  \n- Робот в прямом эфире выполняет действие, указанное пользователем.  \n- Активность учитывается в системе и приносит дополнительные поинты. ','https://pbs.twimg.com/media/G14n8JpboAAHi_u?format=jpg&name=4096x4096','2025-10-03 08:59:33','2025-10-03 10:09:26',NULL);
/*!40000 ALTER TABLE `project_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_translations`
--

DROP TABLE IF EXISTS `project_translations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_translations` (
  `id` varchar(36) NOT NULL,
  `project_id` varchar(36) NOT NULL,
  `locale` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_project_locale` (`project_id`,`locale`),
  CONSTRAINT `project_translations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_translations`
--

LOCK TABLES `project_translations` WRITE;
/*!40000 ALTER TABLE `project_translations` DISABLE KEYS */;
INSERT INTO `project_translations` VALUES ('02d70015-8c3f-454a-a303-5d2ec04550d0','01a37a7c-1b9c-4bde-b363-0da9efe72719','en','Prismax','PrismaX is a decentralized data collection platform designed for training artificial intelligence and robotics. The project has received $11 million in funding from a16z CSX (Tier1).','2025-10-03 09:00:04','2025-10-03 10:09:26'),('14c4537f-b3ff-4dd8-b7d8-62e862c96d5a','01a37a7c-1b9c-4bde-b363-0da9efe72719','ru','Prismax','PrismaX — децентрализованная платформа для сбора данных, созданная для обучения искусственного интеллекта и робототехники. Проект получил инвестиции в размере 11 млн долларов от a16z CSX (Tier1).','2025-10-03 09:00:04','2025-10-03 10:09:26'),('27461fd1-f058-4185-a8a4-22300f17cdcc','01a37a7c-1b9c-4bde-b363-0da9efe72719','ua','Prismax','PrismaX — децентралізована платформа для збору даних, створена для навчання штучного інтелекту та робототехніки. Проєкт отримав інвестиції у розмірі 11 млн доларів від a16z CSX (Tier1).','2025-10-03 09:00:04','2025-10-03 10:09:26');
/*!40000 ALTER TABLE `project_translations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `sidebar_name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `status` enum('active','draft','inactive') NOT NULL DEFAULT 'draft',
  `category` varchar(255) NOT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `website` varchar(500) DEFAULT NULL,
  `telegram_post` varchar(500) DEFAULT NULL,
  `image` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_status` (`status`),
  KEY `idx_projects_category` (`category`),
  KEY `idx_projects_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('01a37a7c-1b9c-4bde-b363-0da9efe72719','Prismax','🧬 Prismax','PrismaX — децентрализованная платформа для сбора данных, созданная для обучения искусственного интеллекта и робототехники. Проект получил инвестиции в размере 11 млн долларов от a16z CSX (Tier1).','active','Testnet',NULL,'https://app.prismax.ai/',NULL,'https://miro.medium.com/v2/resize:fit:1400/1*Ax0KRL9P145SAUmNw9C88w.png','2025-10-03 08:59:33','2025-10-03 10:09:26');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-03 18:28:13
