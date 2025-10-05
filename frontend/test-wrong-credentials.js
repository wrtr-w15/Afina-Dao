require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'afina_dao_wiki',
};

console.log('🔧 Текущая конфигурация из .env.local:');
console.log('   Host:', dbConfig.host);
console.log('   Port:', dbConfig.port);
console.log('   User:', dbConfig.user);
console.log('   Password:', dbConfig.password ? `'${dbConfig.password}'` : '(empty)');
console.log('   Database:', dbConfig.database);
console.log();

async function testConnection() {
  try {
    console.log('📡 Попытка подключения...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Подключение успешно!');
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM projects');
    console.log('✅ Запрос выполнен!');
    console.log('📊 Проектов в БД:', rows[0].count);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.log();
    console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Код ошибки:', error.code);
    console.error('Сообщение:', error.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Проблема: Неверный пользователь или пароль');
      console.log('   Проверьте DB_USER и DB_PASSWORD в .env.local');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Проблема: База данных не существует');
      console.log('   Проверьте DB_NAME в .env.local');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Проблема: MySQL сервер не запущен');
      console.log('   Запустите: sudo systemctl start mysql');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Проблема: Не удается подключиться к хосту');
      console.log('   Проверьте DB_HOST и DB_PORT в .env.local');
    }
    
    process.exit(1);
  }
}

testConnection();
