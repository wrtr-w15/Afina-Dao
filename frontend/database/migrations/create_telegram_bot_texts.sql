-- Таблица редактируемых текстов Telegram-бота (админка → Telegram)
CREATE TABLE IF NOT EXISTS telegram_bot_texts (
  id VARCHAR(36) PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  section VARCHAR(50) NOT NULL DEFAULT 'common',
  value TEXT,
  description VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Запись по умолчанию: уведомление «осталось 3 дня до конца подписки»
-- Подстановки: {{endDate}}, {{daysLeft}}
INSERT IGNORE INTO telegram_bot_texts (id, `key`, section, value, description, sort_order)
VALUES (
  UUID(),
  'subscription_expiring_3_days',
  'notifications',
  '⚠️ <b>Ваша подписка скоро истечёт!</b>\n\n📅 Дата окончания: {{endDate}}\n⏳ Осталось: {{daysLeft}} дн.\n\nПродлите подписку, чтобы не потерять доступ. Нажмите /start или кнопку «Продлить подписку».',
  'Уведомление в Telegram, когда до конца подписки остаётся 3 дня. Подстановки: {{endDate}}, {{daysLeft}}',
  10
);
