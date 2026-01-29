-- Создание таблиц для системы подписок
-- Миграция: create_subscription_system.sql

-- Таблица пользователей (связь Telegram + Discord + Email)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL COMMENT 'Telegram user ID',
  telegram_username VARCHAR(100) COMMENT 'Telegram username без @',
  telegram_first_name VARCHAR(100) COMMENT 'Имя в Telegram',
  telegram_last_name VARCHAR(100) COMMENT 'Фамилия в Telegram',
  discord_id VARCHAR(50) COMMENT 'Discord user ID',
  discord_username VARCHAR(100) COMMENT 'Discord username',
  email VARCHAR(255) COMMENT 'Email для Notion',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_telegram_id (telegram_id),
  INDEX idx_discord_id (discord_id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица подписок
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT 'Ссылка на пользователя',
  pricing_id VARCHAR(36) COMMENT 'Ссылка на тариф подписки',
  period_months INT NOT NULL COMMENT 'Период подписки в месяцах',
  amount DECIMAL(10, 2) NOT NULL COMMENT 'Сумма оплаты',
  currency VARCHAR(10) DEFAULT 'RUB' COMMENT 'Валюта',
  status ENUM('pending', 'active', 'expired', 'cancelled') DEFAULT 'pending' COMMENT 'Статус подписки',
  start_date TIMESTAMP NULL COMMENT 'Дата начала подписки',
  end_date TIMESTAMP NULL COMMENT 'Дата окончания подписки',
  discord_role_granted BOOLEAN DEFAULT FALSE COMMENT 'Выдана ли роль Discord',
  notion_access_granted BOOLEAN DEFAULT FALSE COMMENT 'Выдан ли доступ к Notion',
  auto_renew BOOLEAN DEFAULT FALSE COMMENT 'Автопродление',
  notes TEXT COMMENT 'Заметки админа',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  subscription_id VARCHAR(36) NOT NULL COMMENT 'Ссылка на подписку',
  user_id VARCHAR(36) NOT NULL COMMENT 'Ссылка на пользователя',
  amount DECIMAL(10, 2) NOT NULL COMMENT 'Сумма платежа',
  currency VARCHAR(10) DEFAULT 'RUB' COMMENT 'Валюта',
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending' COMMENT 'Статус платежа',
  payment_method VARCHAR(50) COMMENT 'Способ оплаты (telegram_stars, crypto, card, etc)',
  external_id VARCHAR(255) COMMENT 'ID транзакции во внешней системе',
  provider_data JSON COMMENT 'Дополнительные данные от провайдера',
  error_message TEXT COMMENT 'Сообщение об ошибке',
  paid_at TIMESTAMP NULL COMMENT 'Дата успешной оплаты',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_external_id (external_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица состояний пользователей в боте (для хранения промежуточных данных)
CREATE TABLE IF NOT EXISTS user_bot_states (
  id VARCHAR(36) PRIMARY KEY,
  telegram_id BIGINT NOT NULL COMMENT 'Telegram user ID',
  state VARCHAR(50) NOT NULL COMMENT 'Текущее состояние (awaiting_discord, awaiting_email, awaiting_payment)',
  data JSON COMMENT 'Данные состояния (выбранный тариф, введенные данные)',
  expires_at TIMESTAMP NULL COMMENT 'Время истечения состояния',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_telegram_id (telegram_id),
  INDEX idx_state (state),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица логов действий (для отладки и аудита)
CREATE TABLE IF NOT EXISTS subscription_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) COMMENT 'Ссылка на пользователя',
  subscription_id VARCHAR(36) COMMENT 'Ссылка на подписку',
  action VARCHAR(50) NOT NULL COMMENT 'Тип действия',
  details JSON COMMENT 'Детали действия',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
