-- Создание таблицы для управления ценами подписок на странице private-community

CREATE TABLE IF NOT EXISTS subscription_pricing (
  id VARCHAR(36) PRIMARY KEY,
  period_months INT NOT NULL UNIQUE COMMENT 'Период подписки в месяцах (1, 3, 6)',
  monthly_price DECIMAL(10, 2) NOT NULL COMMENT 'Цена за месяц в долларах',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_period_months (period_months)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Вставка начальных значений
INSERT INTO subscription_pricing (id, period_months, monthly_price) VALUES
  (UUID(), 1, 99.00),
  (UUID(), 3, 89.00),
  (UUID(), 6, 79.00)
ON DUPLICATE KEY UPDATE monthly_price = VALUES(monthly_price);

