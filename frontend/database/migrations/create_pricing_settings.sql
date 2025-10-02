-- Создание таблицы для настроек цен
CREATE TABLE IF NOT EXISTS pricing_settings (
  id VARCHAR(36) PRIMARY KEY,
  installation_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  monthly_price_per_account DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_multipliers JSON NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Вставляем начальные настройки, если их еще нет
INSERT IGNORE INTO pricing_settings (id, installation_price, monthly_price_per_account, discount_multipliers) 
VALUES (
  'default-settings',
  1000.00,
  100.00,
  '{"1": 1.0, "2": 0.95, "3": 0.90, "4": 0.85, "5": 0.80, "6": 0.75, "7": 0.70, "8": 0.65, "9": 0.60, "10": 0.55}'
);
