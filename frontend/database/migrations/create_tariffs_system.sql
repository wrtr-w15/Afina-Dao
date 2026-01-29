-- Создание таблиц для системы тарифов
-- Миграция: create_tariffs_system.sql

-- Таблица тарифов (основная информация о тарифном плане)
CREATE TABLE IF NOT EXISTS tariffs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT 'Название тарифа',
  description TEXT COMMENT 'Описание тарифа',
  features JSON COMMENT 'Список включённых функций/возможностей',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Активен ли тариф (можно выбирать для новых подписок)',
  is_archived TINYINT(1) DEFAULT 0 COMMENT 'Архивный тариф (нельзя выбирать, но виден в истории)',
  is_custom TINYINT(1) DEFAULT 0 COMMENT 'Индивидуальный тариф для конкретного пользователя',
  custom_for_user_id VARCHAR(36) COMMENT 'ID пользователя для кастомного тарифа',
  sort_order INT DEFAULT 0 COMMENT 'Порядок сортировки',
  color VARCHAR(50) DEFAULT 'indigo' COMMENT 'Цвет для отображения',
  badge VARCHAR(50) COMMENT 'Бейдж (например: Популярный, Выгодный)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_is_archived (is_archived),
  INDEX idx_is_custom (is_custom),
  INDEX idx_custom_for_user (custom_for_user_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица ценовых опций тарифа (пак цен: месяцы + цена за месяц)
CREATE TABLE IF NOT EXISTS tariff_prices (
  id VARCHAR(36) PRIMARY KEY,
  tariff_id VARCHAR(36) NOT NULL COMMENT 'Ссылка на тариф',
  period_months INT NOT NULL COMMENT 'Количество месяцев',
  monthly_price DECIMAL(12, 2) NOT NULL COMMENT 'Цена за месяц в USDT',
  is_popular TINYINT(1) DEFAULT 0 COMMENT 'Отметка популярного варианта',
  sort_order INT DEFAULT 0 COMMENT 'Порядок сортировки',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tariff_id) REFERENCES tariffs(id) ON DELETE CASCADE,
  UNIQUE KEY uk_tariff_period (tariff_id, period_months),
  INDEX idx_tariff_id (tariff_id),
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Добавляем tariff_id в таблицу subscriptions если его ещё нет
-- (выполняется отдельно, чтобы не конфликтовать с существующими данными)
-- ALTER TABLE subscriptions ADD COLUMN tariff_id VARCHAR(36) COMMENT 'Ссылка на использованный тариф' AFTER pricing_id;
-- ALTER TABLE subscriptions ADD INDEX idx_tariff_id (tariff_id);

-- История изменений тарифов (для аудита)
CREATE TABLE IF NOT EXISTS tariff_history (
  id VARCHAR(36) PRIMARY KEY,
  tariff_id VARCHAR(36) NOT NULL COMMENT 'ID тарифа',
  changed_by VARCHAR(36) COMMENT 'Кто изменил (admin user id)',
  change_type ENUM('created', 'updated', 'archived', 'activated', 'deactivated') NOT NULL,
  old_values JSON COMMENT 'Предыдущие значения',
  new_values JSON COMMENT 'Новые значения',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tariff_id (tariff_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Связь пользователей с доступными им кастомными тарифами
CREATE TABLE IF NOT EXISTS user_available_tariffs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL COMMENT 'ID пользователя',
  tariff_id VARCHAR(36) NOT NULL COMMENT 'ID тарифа',
  granted_by VARCHAR(36) COMMENT 'Кто выдал доступ',
  valid_until TIMESTAMP NULL COMMENT 'До какой даты действует доступ к тарифу',
  notes TEXT COMMENT 'Заметки',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_tariff (user_id, tariff_id),
  INDEX idx_user_id (user_id),
  INDEX idx_tariff_id (tariff_id),
  INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
