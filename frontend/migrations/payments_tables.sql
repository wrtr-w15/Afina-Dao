-- Миграция для таблиц платежей и подписок
-- Запустите этот скрипт в MySQL: mysql -u root -p afina_dao_wiki < migrations/payments_tables.sql

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  subscription_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'crypto',
  external_id VARCHAR(255) DEFAULT NULL COMMENT 'ID платежа в NOWPayments',
  provider_data JSON DEFAULT NULL COMMENT 'Данные от платёжного провайдера',
  error_message TEXT DEFAULT NULL,
  paid_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_external_id (external_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица подписок (если не существует)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  tariff_id VARCHAR(36) DEFAULT NULL,
  tariff_price_id VARCHAR(36) DEFAULT NULL,
  period_months INT DEFAULT 1,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDT',
  status ENUM('pending', 'active', 'expired', 'cancelled') DEFAULT 'pending',
  start_date TIMESTAMP NULL DEFAULT NULL,
  end_date TIMESTAMP NULL DEFAULT NULL,
  discord_role_granted BOOLEAN DEFAULT FALSE,
  notion_access_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Добавляем внешний ключ для платежей -> подписки (если подписки уже созданы)
-- ALTER TABLE payments ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Таблица логов подписок
CREATE TABLE IF NOT EXISTS subscription_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_id VARCHAR(36) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Готово!
SELECT 'Таблицы payments, subscriptions и subscription_logs созданы!' AS status;
