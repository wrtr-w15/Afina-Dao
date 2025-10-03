# Безопасность проекта Afina DAO Wiki

## Защита от SQL-инъекций

### ✅ Реализованные меры защиты

#### 1. Параметризованные запросы
**Все SQL-запросы используют параметризацию через `?` placeholders:**

```typescript
// ✅ ПРАВИЛЬНО - использует параметризацию
await connection.execute(
  'SELECT * FROM projects WHERE id = ?',
  [projectId]
);

// ❌ НЕПРАВИЛЬНО - уязвимо к SQL-инъекциям
await connection.execute(
  `SELECT * FROM projects WHERE id = '${projectId}'`
);
```

**Покрытие:**
- ✅ `/api/projects/*` - все запросы параметризованы
- ✅ `/api/categories/*` - все запросы параметризованы
- ✅ `/api/auth/*` - все запросы параметризованы
- ✅ `/api/pricing-settings/*` - все запросы параметризованы
- ✅ `/api/telegram/webhook` - все запросы параметризованы

#### 2. Валидация входных данных

**Файл:** `lib/validation.ts`

**Функции валидации:**
- `isValidUUID()` - проверка UUID
- `validateProjectName()` - валидация названий (макс. 255 символов)
- `validateProjectStatus()` - валидация статуса (только: active, draft, inactive)
- `validateLocale()` - валидация языка (только: ru, en, ua)
- `validateDescription()` - валидация описаний (макс. 10000 символов)
- `validateImageURL()` - валидация URL изображений
- `validateProjectLink()` - валидация ссылок проекта
- `validateProjectTranslation()` - валидация переводов
- `validateContentBlock()` - валидация блоков контента
- `validateCategory()` - валидация категорий
- `escapeHTML()` - экранирование HTML для предотвращения XSS
- `sanitizeString()` - удаление опасных символов (нулевые байты)

#### 3. Rate Limiting

**Файл:** `lib/security-middleware.ts`

**Лимиты по операциям:**
- `GET` запросы: **60 запросов/минуту**
- `POST/PUT` запросы: **20-30 запросов/минуту**
- `DELETE` запросы: **10 запросов/минуту**
- Auth операции: настраивается индивидуально

**Пример использования:**
```typescript
const rateLimitResult = applyRateLimit(request, 60, 60000); // 60 req/min
if (rateLimitResult) return rateLimitResult;
```

#### 4. Логирование подозрительной активности

**Функция:** `logSuspiciousActivity()`

**Отслеживается:**
- Невалидные UUID
- Невалидные статусы проектов
- Попытки SQL-инъекций
- Превышение rate limits
- Невалидные Content-Type headers
- Слишком большие тела запросов

**Логи включают:**
- IP адрес
- User-Agent
- URL запроса
- Причину подозрения
- Данные запроса (если применимо)

#### 5. Валидация Content-Type

Все `POST` и `PUT` запросы проверяются на правильный Content-Type:
```typescript
Content-Type: application/json
```

#### 6. Ограничение размера запросов

Максимальный размер тела запроса: **10 MB**

## Безопасность аутентификации

### Admin Auth с 2FA через Telegram

**Реализовано:**
1. ✅ Двухфакторная аутентификация через Telegram Bot
2. ✅ IP tracking и geolocation
3. ✅ Шифрование сессий (AES-256-CBC)
4. ✅ HTTPOnly cookies
5. ✅ Secure cookies в production
6. ✅ SameSite: strict
7. ✅ Автоматическое истечение сессий (5 минут для подтверждения, 24 часа для активной сессии)

**Процесс логина:**
1. Пользователь вводит пароль
2. Создается запись в `auth_sessions`
3. Отправляется уведомление в Telegram с кнопками Approve/Deny
4. При одобрении создается зашифрованная сессия
5. Cookie устанавливается с защитными флагами

## Защита от XSS

### Меры защиты:

1. **Экранирование HTML:**
   ```typescript
   import { escapeHTML } from '@/lib/validation';
   const safe = escapeHTML(userInput);
   ```

2. **Content Security Policy (CSP):**
   Рекомендуется добавить в `next.config.js`:
   ```javascript
   headers: [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
     }
   ]
   ```

3. **Markdown безопасность:**
   При рендеринге Markdown проверяется на наличие скриптов

## Защита от CSRF

**Реализовано:**
- SameSite: strict cookies
- Проверка Origin/Referer headers (рекомендуется добавить)

**Рекомендуется добавить:**
- CSRF tokens для форм

## Рекомендации по развертыванию

### Production Environment

1. **Environment Variables:**
   ```bash
   NODE_ENV=production
   ADMIN_SESSION_SECRET=<сгенерировать сильный ключ 32+ символа>
   ADMIN_PASSWORD=<сложный пароль>
   TELEGRAM_BOT_TOKEN=<токен бота>
   TELEGRAM_CHAT_ID=<ID чата для уведомлений>
   DB_PASSWORD=<сложный пароль БД>
   ```

2. **Database:**
   - Используйте сильные пароли для MySQL
   - Ограничьте доступ к БД по IP
   - Регулярные бэкапы
   - Шифрование соединения с БД (SSL/TLS)

3. **HTTPS:**
   - Обязательно используйте HTTPS в production
   - Используйте Let's Encrypt для бесплатных SSL сертификатов

4. **Firewall:**
   - Закройте все порты кроме 80 (HTTP), 443 (HTTPS), 22 (SSH)
   - Используйте fail2ban для защиты от brute-force

5. **Updates:**
   - Регулярно обновляйте зависимости: `npm audit fix`
   - Проверяйте CVE для используемых пакетов

## Мониторинг и алерты

### Что мониторить:

1. **Подозрительная активность:**
   - Логи с пометкой "🚨 SUSPICIOUS ACTIVITY DETECTED"
   - Множественные неудачные попытки логина
   - Превышение rate limits

2. **Ошибки БД:**
   - Ошибки подключения
   - Timeout'ы
   - Неожиданные SQL ошибки

3. **Performance:**
   - Время ответа API
   - Количество запросов в секунду
   - Использование памяти

### Рекомендуемые инструменты:

- **Логирование:** Winston, Pino
- **Мониторинг:** Sentry, DataDog, New Relic
- **Алерты:** Telegram Bot, PagerDuty

## Тестирование безопасности

### Ручное тестирование:

1. **SQL Injection:**
   ```bash
   # Попытка инъекции в project ID
   curl -X GET "http://localhost:3000/api/projects/' OR '1'='1"
   # Ожидается: 400 Bad Request - Invalid project ID format
   ```

2. **XSS:**
   ```bash
   # Попытка XSS в названии проекта
   curl -X POST http://localhost:3000/api/projects \
     -H "Content-Type: application/json" \
     -d '{"name":"<script>alert(1)</script>","status":"active"}'
   # Ожидается: данные будут экранированы
   ```

3. **Rate Limiting:**
   ```bash
   # Отправить 100+ запросов за 1 минуту
   for i in {1..150}; do
     curl http://localhost:3000/api/projects &
   done
   # Ожидается: 429 Too Many Requests после превышения лимита
   ```

### Автоматическое тестирование:

**Рекомендуемые инструменты:**
- OWASP ZAP
- Burp Suite
- sqlmap (для SQL injection тестов)

## Чеклист безопасности

### Перед деплоем:

- [ ] Все SQL запросы используют параметризацию
- [ ] Установлены rate limits на все API endpoints
- [ ] Настроены environment variables
- [ ] HTTPS включен
- [ ] Secure cookies включены
- [ ] Добавлены CSP headers
- [ ] Настроен firewall
- [ ] Включен мониторинг логов
- [ ] Созданы регулярные бэкапы БД
- [ ] Проведено тестирование на уязвимости
- [ ] Обновлены все зависимости (`npm audit`)

## Контакты

При обнаружении уязвимостей, пожалуйста, сообщите напрямую администратору через защищенный канал.

---

**Последнее обновление:** 2025-10-03
**Версия:** 1.0.0

