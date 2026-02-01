// Конфигурация базы данных MySQL
import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'afina_dao_wiki',
  charset: 'utf8mb4',
  timezone: '+00:00',
  ssl: false as any,
  // Убираем устаревшие опции
};

// Connection Pool для эффективного управления соединениями
// Предотвращает утечки соединений и оптимизирует производительность
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 50, // Увеличено для большого количества пользователей
  queueLimit: 0, // Без ограничения очереди
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  acquireTimeout: 60000, // 60 секунд на получение соединения
  timeout: 60000, // 60 секунд таймаут запросов
});

// Хелпер для безопасного получения соединения из pool
// Используйте этот метод вместо createConnection
export async function getConnection() {
  return await pool.getConnection();
}

// Типы для работы с базой данных
export interface DatabaseProject {
  id: string;
  name: string;
  sidebar_name: string;
  description: string;
  status: string;
  category: string;
  budget?: number;
  website?: string;
  telegram_post?: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProjectBlock {
  id: string;
  project_id: string;
  title: string;
  content: string;
  gif_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProjectBlockLink {
  id: string;
  block_id: string;
  title: string;
  url: string;
  type: string;
  created_at: string;
}
