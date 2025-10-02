# Настройка двухфакторной аутентификации для админки

## Описание системы

Система обеспечивает двухфакторную аутентификацию для доступа к админ-панели:
1. Ввод пароля из .env
2. Получение уведомления в Telegram с данными пользователя (IP, геолокация, User Agent)
3. Подтверждение доступа через Telegram бота

## Настройка

### 1. Создание Telegram бота

1. Найдите @BotFather в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный токен

### 2. Получение Chat ID

1. Добавьте бота в чат или отправьте ему сообщение
2. Отправьте команду `/start`
3. Найдите свой Chat ID одним из способов:
   - Используйте @userinfobot
   - Или отправьте сообщение боту и перейдите по ссылке: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`

### 3. Настройка .env.local

Обновите файл `.env.local`:

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/afina_dao

# Admin Authentication
ADMIN_PASSWORD=your-secure-password-here
ADMIN_SESSION_SECRET=your-very-long-secret-key-here

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-chat-id

# API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Настройка webhook для Telegram бота

Запустите скрипт настройки:

```bash
cd /Users/kirjey/Documents/VisualStudio\ Projects/Afina\ Dao/Afina-Dao
node telegram-bot.js
```

Или вручную установите webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:3000/api/telegram/webhook"}'
```

## Использование

### Вход в админку

1. Перейдите на `/admin/login`
2. Введите пароль из .env
3. Проверьте Telegram - придет сообщение с данными:
   - IP адрес
   - Геолокация
   - User Agent
   - Время запроса
4. Нажмите "✅ Approve" для разрешения доступа
5. Вы будете автоматически перенаправлены в админку

### Безопасность

- Сессии истекают через 24 часа
- Запросы на подтверждение истекают через 5 минут
- Все данные сессии шифруются
- IP и геолокация отслеживаются для безопасности

## API Endpoints

- `POST /api/auth/login` - Начало процесса аутентификации
- `GET /api/auth/confirm?requestId=<id>` - Проверка статуса подтверждения
- `POST /api/auth/confirm` - Подтверждение доступа
- `POST /api/auth/logout` - Выход из системы
- `POST /api/telegram/webhook` - Webhook для Telegram бота

## Структура файлов

```
frontend/
├── app/
│   ├── admin/
│   │   └── login/
│   │       └── page.tsx          # Страница логина
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts    # API логина
│       │   ├── confirm/route.ts  # API подтверждения
│       │   └── logout/route.ts   # API выхода
│       └── telegram/
│           └── webhook/route.ts  # Webhook Telegram
├── components/admin/
│   ├── AdminLayout.tsx           # Layout с кнопкой выхода
│   └── AdminSidebar.tsx          # Sidebar с кнопкой выхода
├── middleware.ts                 # Защита админских роутов
└── .env.local                   # Конфигурация
```

## Тестирование

1. Убедитесь, что сервер запущен на порту 3000
2. Перейдите на `/admin/login`
3. Введите пароль из .env
4. Проверьте Telegram на наличие уведомления
5. Подтвердите доступ через кнопки в Telegram

## Устранение неполадок

### Бот не отвечает
- Проверьте правильность токена бота
- Убедитесь, что webhook установлен правильно
- Проверьте, что сервер доступен из интернета

### Не приходят уведомления
- Проверьте правильность Chat ID
- Убедитесь, что бот добавлен в чат
- Проверьте логи сервера на ошибки

### Сессия не сохраняется
- Проверьте правильность SESSION_SECRET
- Убедитесь, что cookies включены в браузере
- Проверьте настройки безопасности браузера
