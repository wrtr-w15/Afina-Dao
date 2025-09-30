-- Схема базы данных для Afina DAO Wiki

CREATE DATABASE IF NOT EXISTS afina_dao_wiki;
USE afina_dao_wiki;

-- Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sidebar_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('active', 'draft', 'inactive') NOT NULL DEFAULT 'draft',
    category VARCHAR(255) NOT NULL,
    budget DECIMAL(15,2) NULL,
    website VARCHAR(500) NULL,
    telegram_post VARCHAR(500) NULL,
    image VARCHAR(500) NULL,
    compatibility JSON NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица блоков проектов
CREATE TABLE IF NOT EXISTS project_blocks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    gif_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Таблица ссылок блоков
CREATE TABLE IF NOT EXISTS project_block_links (
    id VARCHAR(36) PRIMARY KEY,
    block_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type ENUM('website', 'github', 'documentation', 'demo', 'other') NOT NULL DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES project_blocks(id) ON DELETE CASCADE
);

-- Индексы для оптимизации
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_project_blocks_project_id ON project_blocks(project_id);
CREATE INDEX idx_project_block_links_block_id ON project_block_links(block_id);

-- Вставка начальных данных
INSERT INTO projects (id, name, sidebar_name, description, status, category, budget, website, telegram_post, compatibility) VALUES
('1', 'Afina DeFi Protocol', 'DeFi Protocol', 'Децентрализованный протокол для управления ликвидностью и автоматизированного маркет-мейкинга', 'active', 'DeFi', 50000.00, 'https://afina-defi.com', 'https://t.me/afina_dao/123', '["windows", "macos"]'),
('2', 'NFT Marketplace', 'NFT Market', 'Маркетплейс для торговли NFT с поддержкой различных блокчейнов', 'draft', 'NFT', 30000.00, 'https://afina-nft.com', 'https://t.me/afina_dao/124', '["windows"]'),
('3', 'DAO Governance Tool', 'DAO Governance', 'Инструмент для управления DAO с голосованием и предложениями', 'active', 'DAO', 40000.00, 'https://afina-dao.com', 'https://t.me/afina_dao/125', '["macos"]');

-- Вставка блоков для первого проекта
INSERT INTO project_blocks (id, project_id, title, content, gif_url) VALUES
('1', '1', 'Основные функции', '## Основные функции протокола\n\n- **Управление ликвидностью**: Автоматическое перераспределение средств\n- **Маркет-мейкинг**: Интеллектуальные алгоритмы торговли\n- **Стейкинг**: Возможность заработка на депозитах', 'https://example.com/defi-demo.gif');

-- Вставка ссылок для первого блока
INSERT INTO project_block_links (id, block_id, title, url, type) VALUES
('1', '1', 'Документация', 'https://docs.afina-defi.com', 'documentation');
