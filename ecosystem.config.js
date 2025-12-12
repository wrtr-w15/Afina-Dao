// Загружаем переменные окружения из .env.local
const fs = require('fs');
const path = require('path');

// Функция для чтения .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, 'frontend', '.env.local');
  const env = {};
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          env[key] = value;
        }
      }
    });
  }
  
  return env;
}

const env = loadEnvFile();
const port = env.PORT || process.env.PORT || 3000;

module.exports = {
  apps: [
    {
      name: 'afina-dao-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: parseInt(port, 10)
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
