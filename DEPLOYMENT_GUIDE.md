# 🚀 Deployment Guide - Afina DAO Wiki

Подробная инструкция по развертыванию проекта на продакшн сервере.

## 📋 Содержание

- [Требования к серверу](#требования-к-серверу)
- [Подготовка сервера](#подготовка-сервера)
- [Установка зависимостей](#установка-зависимостей)
- [Настройка базы данных](#настройка-базы-данных)
- [Деплой приложения](#деплой-приложения)
- [Настройка Nginx](#настройка-nginx)
- [SSL сертификат](#ssl-сертификат)
- [PM2 для автозапуска](#pm2-для-автозапуска)
- [Мониторинг](#мониторинг)
- [Обновление проекта](#обновление-проекта)

---

## 🖥 Требования к серверу

### Минимальные требования:
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: 2 GB (рекомендуется 4 GB)
- **CPU**: 2 cores (рекомендуется 4 cores)
- **Disk**: 20 GB SSD
- **Network**: Статический IP адрес

### Необходимое ПО:
- Node.js 18.x или выше
- MySQL 8.0+
- Nginx
- PM2 (process manager)
- Git

---

## 🛠 Подготовка сервера

### 1. Обновление системы

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS
sudo yum update -y
```

### 2. Установка Node.js

```bash
# Установка Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка версии
node --version  # должно быть v20.x.x
npm --version   # должно быть 10.x.x
```

### 3. Установка MySQL

```bash
# Установка MySQL Server
sudo apt install -y mysql-server

# Запуск MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Безопасная настройка
sudo mysql_secure_installation
```

**Ответы на вопросы:**
- Root password: установите надежный пароль
- Remove anonymous users: Yes
- Disallow root login remotely: Yes
- Remove test database: Yes
- Reload privilege tables: Yes

### 4. Установка Nginx

```bash
sudo apt install -y nginx

# Запуск Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Установка PM2

```bash
sudo npm install -g pm2

# Автозапуск PM2 при перезагрузке
pm2 startup
# Скопируйте и выполните команду, которую выведет PM2
```

---

## 📦 Установка зависимостей

### 1. Создание пользователя для приложения

```bash
# Создаём пользователя
sudo adduser afina --disabled-password --gecos ""

# Добавляем в группу sudo (опционально)
sudo usermod -aG sudo afina

# Переключаемся на пользователя
sudo su - afina
```

### 2. Клонирование репозитория

```bash
# Переход в домашнюю директорию
cd ~

# Клонирование проекта
git clone <your-repository-url> afina-dao
cd afina-dao/Afina-Dao/frontend

# Установка зависимостей
npm install --production
```

---

## 🗄 Настройка базы данных

### 1. Создание базы данных и пользователя

```bash
mysql -u root -p
```

В MySQL консоли:

```sql
-- Создание базы данных
CREATE DATABASE afina_dao_wiki CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Создание пользователя
CREATE USER 'afina_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';

-- Выдача прав
GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'afina_user'@'localhost';
FLUSH PRIVILEGES;

-- Выход
EXIT;
```

### 2. Импорт дампа базы данных

```bash
# Перейдите в директорию с дампом
cd ~/afina-dao/Afina-Dao/database/backup

# Импортируйте последний дамп
mysql -u afina_user -p afina_dao_wiki < afina_dao_wiki_full_20251003_182526.sql

# Или используйте скрипт
chmod +x import.sh
./import.sh afina_dao_wiki_full_20251003_182526.sql
```

### 3. Проверка импорта

```bash
mysql -u afina_user -p afina_dao_wiki -e "SHOW TABLES;"
mysql -u afina_user -p afina_dao_wiki -e "SELECT COUNT(*) FROM projects;"
```

---

## 🚀 Деплой приложения

### 1. Создание .env файла

```bash
cd ~/afina-dao/Afina-Dao/frontend
nano .env.local
```

Содержимое `.env.local`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=afina_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=afina_dao_wiki

# Admin Configuration
ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
ADMIN_SESSION_SECRET=YOUR_RANDOM_SECRET_KEY_32_CHARS

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID

# Application Configuration
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

**Генерация секретного ключа:**
```bash
openssl rand -hex 32
```

### 2. Сборка проекта

```bash
cd ~/afina-dao/Afina-Dao/frontend

# Сборка Next.js приложения
npm run build

# Проверка сборки
ls -la .next/
```

### 3. Тестовый запуск

```bash
# Запуск в production режиме
PORT=3000 npm start
```

Откройте в браузере: `http://your-server-ip:3000`

Если всё работает, нажмите `Ctrl+C` и переходите к следующему шагу.

---

## 🔧 Настройка Nginx

### 1. Создание конфигурации Nginx

```bash
sudo nano /etc/nginx/sites-available/afina-dao
```

Содержимое файла:

```nginx
# Upstream для Next.js
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Редирект с www на без www
server {
    listen 80;
    listen [::]:80;
    server_name www.yourdomain.com;
    return 301 http://yourdomain.com$request_uri;
}

# Основной сервер
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # Логи
    access_log /var/log/nginx/afina-dao-access.log;
    error_log /var/log/nginx/afina-dao-error.log;

    # Размер загружаемых файлов
    client_max_body_size 10M;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Проксирование на Next.js
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Кэширование статических файлов
    location /_next/static {
        proxy_pass http://nextjs_upstream;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Кэширование изображений
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
        proxy_pass http://nextjs_upstream;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### 2. Активация конфигурации

```bash
# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/afina-dao /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
```

---

## 🔒 SSL сертификат (Let's Encrypt)

### 1. Установка Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Получение сертификата

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Ответы на вопросы:**
- Email: ваш email
- Terms of Service: Agree
- Share email: No
- Redirect HTTP to HTTPS: Yes (2)

### 3. Автоматическое обновление сертификата

```bash
# Тест обновления
sudo certbot renew --dry-run

# Настройка автообновления (уже настроено автоматически)
sudo systemctl status certbot.timer
```

---

## ⚡ PM2 для автозапуска

### 1. Создание PM2 конфигурации

```bash
cd ~/afina-dao/Afina-Dao/frontend
nano ecosystem.config.js
```

Содержимое файла:

```javascript
module.exports = {
  apps: [{
    name: 'afina-dao',
    script: 'npm',
    args: 'start',
    cwd: '/home/afina/afina-dao/Afina-Dao/frontend',
    instances: 2, // Количество инстансов (по числу CPU cores)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
```

### 2. Создание директории для логов

```bash
mkdir -p ~/afina-dao/Afina-Dao/frontend/logs
```

### 3. Запуск приложения с PM2

```bash
cd ~/afina-dao/Afina-Dao/frontend

# Запуск
pm2 start ecosystem.config.js

# Сохранение конфигурации
pm2 save

# Настройка автозапуска
pm2 startup
```

### 4. Полезные команды PM2

```bash
# Статус приложения
pm2 status

# Логи в реальном времени
pm2 logs afina-dao

# Мониторинг
pm2 monit

# Перезапуск
pm2 restart afina-dao

# Остановка
pm2 stop afina-dao

# Удаление из PM2
pm2 delete afina-dao

# Перезагрузка без даунтайма
pm2 reload afina-dao
```

---

## 📊 Мониторинг

### 1. PM2 Plus (опционально)

```bash
pm2 install pm2-logrotate

# Настройка ротации логов
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 2. Мониторинг базы данных

Создайте скрипт мониторинга:

```bash
nano ~/monitor-db.sh
```

Содержимое:

```bash
#!/bin/bash

mysql -u afina_user -p'YOUR_PASSWORD' afina_dao_wiki << EOF
SELECT 'Projects:' as Metric, COUNT(*) as Count FROM projects;
SELECT 'Categories:' as Metric, COUNT(*) as Count FROM categories;
SELECT 'Active Sessions:' as Metric, COUNT(*) as Count FROM auth_sessions WHERE status = 'pending';
EOF
```

```bash
chmod +x ~/monitor-db.sh
```

### 3. Настройка алертов (опционально)

Установите мониторинг с Telegram уведомлениями:

```bash
# Установка скрипта мониторинга
npm install -g pm2-telegram
pm2 install pm2-telegram
pm2 set pm2-telegram:token YOUR_TELEGRAM_BOT_TOKEN
pm2 set pm2-telegram:chatId YOUR_TELEGRAM_CHAT_ID
```

---

## 🔄 Обновление проекта

### Создание скрипта деплоя

```bash
nano ~/deploy.sh
```

Содержимое:

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

cd ~/afina-dao

# Остановка приложения
echo "⏸  Stopping application..."
pm2 stop afina-dao

# Обновление кода
echo "📥 Pulling latest code..."
git pull origin main

cd Afina-Dao/frontend

# Установка зависимостей
echo "📦 Installing dependencies..."
npm ci --production

# Сборка проекта
echo "🔨 Building project..."
npm run build

# Миграции базы данных (если есть)
# echo "🗄  Running database migrations..."
# npm run migrate

# Перезапуск приложения
echo "🔄 Restarting application..."
pm2 restart afina-dao

# Проверка статуса
echo "✅ Deployment complete!"
pm2 status
```

```bash
chmod +x ~/deploy.sh
```

### Использование:

```bash
# Обновление проекта
~/deploy.sh
```

---

## 🔐 Безопасность

### 1. Настройка файрвола (UFW)

```bash
# Установка UFW
sudo apt install -y ufw

# Базовые правила
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешение SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включение файрвола
sudo ufw enable

# Проверка статуса
sudo ufw status
```

### 2. Защита MySQL

```bash
# Редактирование конфигурации MySQL
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Добавьте/измените:

```ini
[mysqld]
# Слушать только localhost
bind-address = 127.0.0.1

# Отключение локальных файлов
local-infile=0
```

```bash
# Перезапуск MySQL
sudo systemctl restart mysql
```

### 3. Регулярные бэкапы базы данных

Создайте скрипт автоматического бэкапа:

```bash
sudo nano /etc/cron.daily/backup-afina-db
```

Содержимое:

```bash
#!/bin/bash

BACKUP_DIR="/home/afina/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="afina_dao_wiki"
DB_USER="afina_user"
DB_PASS="YOUR_PASSWORD"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME \
  --no-tablespaces \
  --single-transaction \
  --quick \
  --lock-tables=false \
  > $BACKUP_DIR/backup_$DATE.sql

# Сжатие бэкапа
gzip $BACKUP_DIR/backup_$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

```bash
sudo chmod +x /etc/cron.daily/backup-afina-db
```

---

## 📝 Чеклист деплоя

- [ ] Сервер обновлен и настроен
- [ ] Node.js 20.x установлен
- [ ] MySQL установлен и настроен
- [ ] База данных создана и импортирована
- [ ] Nginx установлен и настроен
- [ ] SSL сертификат получен
- [ ] .env.local настроен с правильными данными
- [ ] Проект собран (`npm run build`)
- [ ] PM2 настроен и запущен
- [ ] Файрвол настроен
- [ ] Бэкапы настроены
- [ ] DNS записи настроены на сервер
- [ ] Сайт доступен по домену
- [ ] Telegram бот работает
- [ ] Админ панель защищена
- [ ] Логи проверены на ошибки

---

## 🆘 Troubleshooting

### Проблема: Сайт не открывается

```bash
# Проверка Nginx
sudo systemctl status nginx
sudo nginx -t

# Проверка PM2
pm2 status
pm2 logs afina-dao --lines 100

# Проверка портов
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :80
```

### Проблема: Ошибки базы данных

```bash
# Проверка подключения
mysql -u afina_user -p afina_dao_wiki

# Проверка логов MySQL
sudo tail -f /var/log/mysql/error.log
```

### Проблема: Нехватка памяти

```bash
# Мониторинг памяти
free -h
pm2 monit

# Уменьшение количества PM2 инстансов
pm2 scale afina-dao 1
```

---

## 📞 Поддержка

Для вопросов и проблем:
- Telegram: @acycas / @kirjeyy
- GitHub Issues: [ссылка на репозиторий]

---

**Последнее обновление:** 2025-10-03

