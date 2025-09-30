-- Создание таблицы категорий
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Вставка базовых категорий
INSERT INTO categories (id, name, description, color, icon, sort_order) VALUES
('1', 'DeFi', 'Децентрализованные финансы', '#EF4444', 'TrendingUp', 1),
('2', 'NFT', 'Незаменяемые токены', '#8B5CF6', 'Image', 2),
('3', 'Gaming', 'Игровые проекты', '#10B981', 'Gamepad2', 3),
('4', 'DAO', 'Децентрализованные автономные организации', '#F59E0B', 'Users', 4),
('5', 'Infrastructure', 'Инфраструктурные решения', '#6366F1', 'Server', 5),
('6', 'Tools', 'Инструменты разработки', '#06B6D4', 'Wrench', 6),
('7', 'Other', 'Прочие проекты', '#6B7280', 'MoreHorizontal', 7)
ON DUPLICATE KEY UPDATE name = VALUES(name);
