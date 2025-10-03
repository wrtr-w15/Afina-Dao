# ⚡ Quick Deploy - Afina DAO Wiki

Быстрая инструкция для опытных пользователей.

## 🚀 Одна команда (для Ubuntu 20.04+)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/deploy.sh | bash
```

## 📋 Пошаговый деплой (5 минут)

### 1. Подготовка сервера

```bash
# Обновление и установка необходимого ПО
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
sudo npm install -g pm2
```

### 2. MySQL

```bash
sudo mysql << 'EOF'
CREATE DATABASE afina_dao_wiki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'afina_user'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'afina_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 3. Проект

```bash
# Клонирование
git clone YOUR_REPO afina-dao
cd afina-dao/Afina-Dao/frontend

# Зависимости
npm install --production

# .env.local
cat > .env.local << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=afina_user
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=afina_dao_wiki
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
ADMIN_SESSION_SECRET=$(openssl rand -hex 32)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://yourdomain.com
EOF

# Сборка
npm run build

# Импорт базы данных
mysql -u afina_user -pYOUR_PASSWORD afina_dao_wiki < ../../database/backup/afina_dao_wiki_full_*.sql
```

### 4. PM2

```bash
# ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'afina-dao',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
};
EOF

# Запуск
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx

```bash
# Конфигурация
sudo tee /etc/nginx/sites-available/afina-dao << 'EOF'
upstream nextjs { server 127.0.0.1:3000; }
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://nextjs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активация
sudo ln -s /etc/nginx/sites-available/afina-dao /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### 6. SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email your@email.com --redirect
```

## ✅ Проверка

```bash
# Статус сервисов
sudo systemctl status nginx
pm2 status

# Логи
pm2 logs afina-dao --lines 50
sudo tail -f /var/log/nginx/error.log

# Тест
curl http://localhost:3000/api/projects
```

## 🔄 Обновление

```bash
cd ~/afina-dao
pm2 stop afina-dao
git pull origin main
cd Afina-Dao/frontend
npm ci --production
npm run build
pm2 restart afina-dao
```

## 🔥 Откат

```bash
cd ~/afina-dao
git log --oneline  # Найти commit
git checkout COMMIT_HASH
cd Afina-Dao/frontend
npm ci --production
npm run build
pm2 restart afina-dao
```

## 📊 Важные порты

- **3000** - Next.js приложение
- **3306** - MySQL
- **80** - HTTP
- **443** - HTTPS

## 🔐 Безопасность (1 минута)

```bash
# Файрвол
sudo ufw allow ssh && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable

# Ежедневный бэкап
echo '0 2 * * * mysqldump -u afina_user -pYOUR_PASSWORD afina_dao_wiki | gzip > /home/$(whoami)/backup_$(date +\%Y\%m\%d).sql.gz' | crontab -
```

## 🆘 Проблемы?

```bash
# Перезапуск всего
sudo systemctl restart nginx
pm2 restart afina-dao

# Проверка логов
pm2 logs --lines 100
journalctl -xe

# Проверка портов
sudo netstat -tulpn | grep -E "3000|80|443|3306"
```

---

📖 **Полная документация:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

