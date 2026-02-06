/**
 * Централизованная конфигурация безопасности (OWASP Top 10, защита от брутфорса)
 */

/** Лимит попыток входа на один IP за окно (защита от брутфорса) */
export const RATE_LIMIT_AUTH_ATTEMPTS = 5;

/** Окно для лимита попыток входа (мс). 15 минут. */
export const RATE_LIMIT_AUTH_WINDOW_MS = 15 * 60 * 1000;

/** Лимит запросов GET /api/auth (polling requestId) на IP в минуту */
export const RATE_LIMIT_AUTH_POLL_ATTEMPTS = 30;

export const RATE_LIMIT_AUTH_POLL_WINDOW_MS = 60 * 1000;

/** Максимальный размер тела запроса для логина (байт) — только пароль */
export const AUTH_BODY_MAX_BYTES = 1024;


/** Максимальная длина пароля (защита от DoS длинным вводом) */
export const AUTH_PASSWORD_MAX_LENGTH = 512;

/** Общий лимит размера JSON body для API (байт) */
export const API_BODY_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
