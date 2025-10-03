# Аудит безопасности Afina DAO Wiki

**Дата:** 2025-10-03  
**Статус:** 🚨 КРИТИЧЕСКИЕ УЯЗВИМОСТИ ОБНАРУЖЕНЫ

---

## 🚨 Критические уязвимости (High Priority)

### 1. XSS через dangerouslySetInnerHTML в renderMarkdown

**Файлы:**
- `/app/project/[id]/page.tsx` (строки 278-288, 357-359)
- `/app/project/project/[id]/page.tsx` (строки 190-192)

**Описание:**
Функция `renderMarkdown` не санитизирует пользовательский контент перед рендерингом через `dangerouslySetInnerHTML`. Это позволяет выполнить XSS-атаку.

**Уязвимый код:**
```typescript
const renderMarkdown = (content: string) => {
  return content
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // ... другие замены БЕЗ санитизации
};

// Использование:
<div dangerouslySetInnerHTML={{ 
  __html: `<p class="mb-4">${renderMarkdown(translatedBlock.content)}</p>` 
}} />
```

**Пример эксплуатации:**
```markdown
# Заголовок <script>alert('XSS')</script>
**Жирный текст <img src=x onerror="alert('XSS')">**
[Ссылка](javascript:alert('XSS'))
```

**Severity:** 🔴 CRITICAL  
**CVSS Score:** 9.6 (Critical)

**Рекомендации:**
1. ✅ Использовать библиотеку для санитизации HTML (DOMPurify, sanitize-html)
2. ✅ Использовать безопасную библиотеку Markdown (react-markdown, marked с DOMPurify)
3. ✅ Добавить Content Security Policy (CSP) headers

---

## ⚠️ Средние уязвимости (Medium Priority)

### 2. Отсутствие санитизации в validateDescription

**Файл:** `/lib/validation.ts` (строка 106)

**Описание:**
Функция `validateDescription` только удаляет нулевые байты, но не защищает от XSS.

**Код:**
```typescript
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\0/g, ''); // Только нулевые байты!
}
```

**Severity:** 🟡 MEDIUM  
**CVSS Score:** 6.1 (Medium)

**Рекомендации:**
1. Добавить удаление опасных HTML-тегов
2. Экранировать специальные символы
3. Использовать whitelist разрешенных символов

---

### 3. Недостаточная валидация URL

**Файл:** `/lib/validation.ts` (строки 21-27, 128-143)

**Описание:**
Функции `isValidURL` и `validateImageURL` не проверяют протокол URL на наличие `javascript:`, `data:`, `vbscript:` и других опасных схем.

**Уязвимый код:**
```typescript
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;  // ❌ Не проверяет протокол!
  } catch {
    return false;
  }
}
```

**Возможные эксплуатации:**
```typescript
javascript:alert('XSS')
data:text/html,<script>alert('XSS')</script>
vbscript:alert('XSS')
```

**Severity:** 🟡 MEDIUM  
**CVSS Score:** 5.4 (Medium)

**Рекомендации:**
1. Whitelist разрешенных протоколов (http, https)
2. Blacklist опасных протоколов (javascript, data, vbscript)
3. Дополнительная проверка для внешних ссылок

---

## ℹ️ Низкие уязвимости (Low Priority)

### 4. Rate Limiting хранится в памяти

**Файл:** `/lib/validation.ts` (строки 317-354)

**Описание:**
Rate limiting использует `Map` в памяти процесса. При горизонтальном масштабировании (несколько инстансов) это не будет работать корректно.

**Код:**
```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
```

**Severity:** 🔵 LOW  
**CVSS Score:** 3.1 (Low)

**Рекомендации:**
1. Использовать Redis для распределенного rate limiting
2. Или использовать middleware с внешним хранилищем
3. Добавить sticky sessions (если используется load balancer)

---

### 5. Отсутствие CSRF protection

**Общее:**

**Описание:**
API endpoints не имеют CSRF токенов. Хотя используется SameSite cookies, это не полная защита.

**Severity:** 🔵 LOW  
**CVSS Score:** 4.3 (Low)

**Рекомендации:**
1. Добавить CSRF tokens для изменяющих операций (POST, PUT, DELETE)
2. Проверять Origin/Referer headers
3. Использовать double-submit cookie pattern

---

## ✅ Хорошие практики безопасности (найдены)

1. ✅ **Параметризованные SQL-запросы** - все запросы используют placeholders
2. ✅ **Rate limiting** - базовая защита от DDoS
3. ✅ **UUID валидация** - защита от path traversal
4. ✅ **Content-Type валидация** - проверка headers
5. ✅ **HTTPOnly cookies** - защита от XSS для cookies
6. ✅ **Secure cookies в production** - защита от MITM
7. ✅ **SameSite: strict** - базовая защита от CSRF
8. ✅ **Шифрование сессий** - AES-256-CBC
9. ✅ **Input size limits** - защита от DoS (10MB)
10. ✅ **Logging подозрительной активности** - мониторинг

---

## 🔧 План исправления (Priority Order)

### Immediate (Do Now - Critical)

1. **Исправить XSS в renderMarkdown:**
   ```bash
   npm install dompurify
   npm install --save-dev @types/dompurify
   ```
   
2. **Обновить renderMarkdown:**
   ```typescript
   import DOMPurify from 'dompurify';
   
   const renderMarkdown = (content: string) => {
     const html = content
       .replace(/^# (.*$)/gim, '<h1>$1</h1>')
       // ... other replacements
     
     return DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'li', 'p', 'br'],
       ALLOWED_ATTR: ['class']
     });
   };
   ```

### Short-term (This Week - High)

3. **Улучшить санитизацию в validation.ts:**
   ```typescript
   export function sanitizeString(input: string): string {
     if (typeof input !== 'string') return '';
     
     return input
       .replace(/\0/g, '')  // Нулевые байты
       .replace(/[<>]/g, '') // HTML теги
       .trim();
   }
   ```

4. **Улучшить валидацию URL:**
   ```typescript
   export function isValidURL(url: string): boolean {
     try {
       const parsed = new URL(url);
       const allowedProtocols = ['http:', 'https:'];
       return allowedProtocols.includes(parsed.protocol);
     } catch {
       return false;
     }
   }
   ```

5. **Добавить Content Security Policy (CSP):**
   ```typescript
   // next.config.js
   headers: [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
     }
   ]
   ```

### Medium-term (This Month - Medium)

6. **Добавить CSRF protection**
7. **Migrate rate limiting to Redis**
8. **Add security headers (HSTS, X-Frame-Options, etc.)**
9. **Implement request logging and monitoring**
10. **Add automated security scanning (Snyk, Dependabot)**

---

## 📊 Статистика безопасности

| Категория | Найдено | Исправлено | Осталось |
|-----------|---------|------------|----------|
| 🔴 Critical | 1 | 0 | 1 |
| 🟡 Medium | 2 | 0 | 2 |
| 🔵 Low | 2 | 0 | 2 |
| ✅ Good Practices | 10 | - | - |
| **Total** | **15** | **0** | **5** |

**Security Score:** 🔴 **60/100** (Needs Improvement)

---

## 🎯 Приоритеты

1. 🚨 **НЕМЕДЛЕННО:** Исправить XSS в renderMarkdown (CRITICAL)
2. ⚠️ **ЭТА НЕДЕЛЯ:** Улучшить санитизацию и валидацию URL (MEDIUM)
3. ℹ️ **ЭТОТ МЕСЯЦ:** Добавить CSRF, мигрировать rate limiting (LOW)

---

## 📚 Рекомендуемые библиотеки

### Для санитизации HTML:
```bash
npm install dompurify
npm install isomorphic-dompurify  # Для SSR
npm install sanitize-html
```

### Для Markdown (безопасные альтернативы):
```bash
npm install react-markdown
npm install remark-gfm  # GitHub Flavored Markdown
npm install rehype-sanitize  # Санитизация для rehype
```

### Для CSRF protection:
```bash
npm install csurf
npm install csrf  # Для Next.js API Routes
```

### Для rate limiting с Redis:
```bash
npm install ioredis
npm install rate-limit-redis
```

---

## 🔍 Дополнительные проверки (рекомендуется)

1. **OWASP ZAP Scan** - автоматическое сканирование
2. **npm audit** - проверка зависимостей
3. **Snyk** - мониторинг уязвимостей в реальном времени
4. **SonarQube** - статический анализ кода
5. **Penetration Testing** - ручное тестирование

---

## 📞 Контакты

При обнаружении новых уязвимостей:
- Сообщите администратору через защищенный канал
- Не публикуйте детали уязвимостей публично
- Следуйте Responsible Disclosure Policy

---

**Последнее обновление:** 2025-10-03  
**Следующий аудит:** 2025-11-03

