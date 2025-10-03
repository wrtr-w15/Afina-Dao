# 🔌 Как изменить порт Next.js приложения

## 📋 Способы изменения порта

### 1️⃣ **Через .env.local (Рекомендуется)**

Откройте `frontend/.env.local` и измените/добавьте:

\`\`\`env
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
\`\`\`

**Затем перезапустите сервер:**
\`\`\`bash
npm start
\`\`\`

---

### 2️⃣ **Через переменную окружения**

\`\`\`bash
# Development
PORT=3001 npm run dev

# Production
PORT=3001 npm start
\`\`\`

---

### 3️⃣ **Через package.json**

Отредактируйте `frontend/package.json`:

\`\`\`json
{
  "scripts": {
    "dev": "next dev -p 3001",
    "start": "next start -p 3001"
  }
}
\`\`\`

---

### 4️⃣ **Через PM2 (для продакшена)**

Отредактируйте `ecosystem.config.js`:

\`\`\`javascript
module.exports = {
  apps: [{
    name: 'afina-dao',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3001  // ← Измените здесь
    }
  }]
};
\`\`\`

Перезапустите:
\`\`\`bash
pm2 restart afina-dao
\`\`\`

---

## ⚠️ Важно! После изменения порта:

### 1. Обновите NEXT_PUBLIC_API_URL

В `.env.local`:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:НОВЫЙ_ПОРТ
\`\`\`

### 2. Обновите Nginx (если используется)

В `/etc/nginx/sites-available/afina-dao`:

\`\`\`nginx
upstream nextjs_upstream {
    server 127.0.0.1:НОВЫЙ_ПОРТ;  # ← Измените здесь
}
\`\`\`

Перезапустите Nginx:
\`\`\`bash
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

### 3. Обновите файрвол (если настроен)

\`\`\`bash
# Разрешить новый порт
sudo ufw allow НОВЫЙ_ПОРТ/tcp

# Удалить старый (если не используется)
sudo ufw delete allow 3000/tcp
\`\`\`

### 4. Пересоберите проект

\`\`\`bash
cd frontend
npm run build
npm start
\`\`\`

---

## 🔍 Проверка нового порта

\`\`\`bash
# Проверка, что порт слушается
lsof -i:НОВЫЙ_ПОРТ

# Проверка через curl
curl http://localhost:НОВЫЙ_ПОРТ

# Проверка API
curl http://localhost:НОВЫЙ_ПОРТ/api/projects
\`\`\`

---

## 📊 Популярные порты для веб-приложений

| Порт | Описание |
|------|----------|
| 3000 | Next.js по умолчанию |
| 3001 | Альтернативный для Next.js |
| 8080 | Альтернативный HTTP |
| 8000 | Часто используется для API |
| 4000 | GraphQL серверы |
| 5000 | Flask, другие фреймворки |

---

## ⚡ Быстрая смена порта (одна команда)

\`\`\`bash
# Остановить текущий сервер
lsof -ti:3000 | xargs kill -9

# Запустить на новом порту
cd frontend
PORT=3001 npm start

# Проверить
curl http://localhost:3001
\`\`\`

---

## 🐛 Проблемы и решения

### Ошибка: "Port already in use"

\`\`\`bash
# Найти процесс на порту
lsof -i:3000

# Убить процесс
kill -9 PID

# Или автоматически
lsof -ti:3000 | xargs kill -9
\`\`\`

### Ошибка: "Cannot find module"

\`\`\`bash
# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install
npm run build
\`\`\`

### Сайт не открывается на новом порту

1. Проверьте `.env.local`:
   \`\`\`bash
   cat .env.local | grep PORT
   \`\`\`

2. Проверьте, запущен ли сервер:
   \`\`\`bash
   lsof -i:НОВЫЙ_ПОРТ
   \`\`\`

3. Проверьте логи:
   \`\`\`bash
   pm2 logs afina-dao
   \`\`\`

---

## 📝 Пример полной настройки на порт 8080

### 1. Обновите .env.local:
\`\`\`env
PORT=8080
NEXT_PUBLIC_API_URL=http://localhost:8080
\`\`\`

### 2. Обновите ecosystem.config.js:
\`\`\`javascript
env: {
  PORT: 8080
}
\`\`\`

### 3. Обновите Nginx:
\`\`\`nginx
upstream nextjs_upstream {
    server 127.0.0.1:8080;
}
\`\`\`

### 4. Перезапустите:
\`\`\`bash
npm run build
pm2 restart afina-dao
sudo systemctl restart nginx
\`\`\`

### 5. Проверьте:
\`\`\`bash
curl http://localhost:8080
\`\`\`

---

**Готово!** Приложение работает на новом порту 🎉
