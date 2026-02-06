# Безопасность (OWASP Top 10 и защита от брутфорса)

## Защита от брутфорса

- **Логин (POST /api/auth)**  
  - Лимит: **5 попыток на IP за 15 минут** (константы в `lib/security-config.ts`).  
  - При превышении лимита возвращается 429 и вызов `logSuspiciousActivity`.  
  - Окно блокировки: 15 минут.

- **Опрос статуса входа (GET /api/auth?requestId=...)**  
  - Лимит: **30 запросов на IP в минуту**, чтобы нельзя было перебирать `requestId` или устраивать DoS.

- **Пароль**  
  - Сравнение в constant-time (защита от timing-атак).  
  - В логах пароль и токены не пишутся, только факт неудачной попытки и обезличенный идентификатор (например, часть IP).

## OWASP Top 10 — что учтено

| Риск | Меры |
|------|------|
| **A01 Broken Access Control** | Middleware проверяет cookie `admin-session` для `/admin/*`, `/api/admin/*`, `/api/users/*`. В каждом обработчике вызывается `checkAdminAuth`. |
| **A02 Cryptographic Failures** | Сессия шифруется (`crypto-utils`). Cookie: `httpOnly`, `secure` в production, `sameSite=strict`. Пароли не логируются. |
| **A03 Injection** | SQL через параметризованные запросы (`?`). Ввод валидируется (UUID, id пользователя, `requestId`). Для вывода HTML используется DOMPurify где нужно. |
| **A05 Security Misconfiguration** | Заголовки: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy, X-Permitted-Cross-Domain-Policies, COEP, COOP. `poweredByHeader: false`. |
| **A07 Identification and Authentication Failures** | Лимит попыток входа, constant-time сравнение пароля, единое сообщение «Invalid password», сессия с ограниченным сроком жизни (24 ч), проверка IP в production. |
| **A08 Software and Data Integrity** | В теле POST /api/auth обрабатывается только поле `password`, длина пароля ограничена (`AUTH_PASSWORD_MAX_LENGTH`), защита от лишних полей в JSON. |
| **A09 Security Logging** | `logSuspiciousActivity` при неудачном входе и при срабатывании rate limit. В логах не должно быть паролей/токенов; для произвольных значений используется `sanitizeForLog` в `lib/validation.ts`. |
| **A10 SSRF** | Внешние запросы по пользовательскому вводу (например, IP в заголовках) проверяются: `isPrivateOrInternalIP`, таймаут запроса; URL валидируются через `isValidURL` / `validateImageURL` где применимо. |

## Дополнительно

- **CSRF**: В production для POST /api/auth проверяется заголовок `Origin` (должен совпадать с origin запроса).
- **Размер тела**: Для логина — не более 1 КБ; для остальных API при необходимости используется `validateRequestBodySize` (по умолчанию до 10 МБ, лимит задаётся в конфиге).
- **Валидация входных данных**: UUID и id проверяются в маршрутах; строки санитизируются через `sanitizeString`; для логов — `sanitizeForLog`.

## Конфигурация

- `lib/security-config.ts` — лимиты попыток входа, окна, максимальные размеры.
- `lib/security-middleware.ts` — rate limit, проверка админа, проверка типа и размера тела, логирование подозрительной активности.
- `middleware.ts` — проверка cookie для админских и пользовательских API до вызова обработчика.
