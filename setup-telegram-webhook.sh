#!/bin/bash

# Скрипт для настройки Telegram webhook на сервере
# Использование: ./setup-telegram-webhook.sh [YOUR_SERVER_URL]
# Пример: ./setup-telegram-webhook.sh https://yourdomain.com

set -e

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Настройка Telegram Webhook"
echo "=============================="

# Определяем URL сервера
if [ -z "$1" ]; then
    # Пытаемся получить из .env.local
    if [ -f "frontend/.env.local" ]; then
        SERVER_URL=$(grep "^NEXT_PUBLIC_API_URL=" frontend/.env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    fi
    
    if [ -z "$SERVER_URL" ]; then
        echo -e "${RED}❌ Ошибка: Укажите URL сервера${NC}"
        echo "Использование: $0 https://yourdomain.com"
        echo "Или установите NEXT_PUBLIC_API_URL в frontend/.env.local"
        exit 1
    fi
else
    SERVER_URL="$1"
fi

# Убираем слеш в конце, если есть
SERVER_URL="${SERVER_URL%/}"

# Получаем токен бота
if [ -f "frontend/.env.local" ]; then
    BOT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" frontend/.env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  TELEGRAM_BOT_TOKEN не найден в .env.local${NC}"
    read -p "Введите TELEGRAM_BOT_TOKEN: " BOT_TOKEN
fi

if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}❌ Ошибка: TELEGRAM_BOT_TOKEN обязателен${NC}"
    exit 1
fi

WEBHOOK_URL="${SERVER_URL}/api/telegram/webhook"

echo ""
echo "📋 Параметры:"
echo "   Server URL: ${SERVER_URL}"
echo "   Webhook URL: ${WEBHOOK_URL}"
echo "   Bot Token: ${BOT_TOKEN:0:20}..."
echo ""

# Проверяем доступность сервера
echo "🔍 Проверка доступности сервера..."
if curl -s -f "${SERVER_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Сервер доступен${NC}"
else
    echo -e "${YELLOW}⚠️  Сервер недоступен, но продолжаем...${NC}"
fi

# Удаляем старый webhook
echo ""
echo "🗑️  Удаление старого webhook..."
DELETE_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook")
DELETE_OK=$(echo "$DELETE_RESPONSE" | grep -o '"ok":true' || echo "")

if [ -n "$DELETE_OK" ]; then
    echo -e "${GREEN}✅ Старый webhook удален${NC}"
else
    echo -e "${YELLOW}⚠️  Не удалось удалить старый webhook (возможно, его не было)${NC}"
fi

# Устанавливаем новый webhook
echo ""
echo "🔧 Установка нового webhook..."
SET_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"${WEBHOOK_URL}\",
        \"allowed_updates\": [\"callback_query\"]
    }")

SET_OK=$(echo "$SET_RESPONSE" | grep -o '"ok":true' || echo "")
SET_ERROR=$(echo "$SET_RESPONSE" | grep -o '"description":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -n "$SET_OK" ]; then
    echo -e "${GREEN}✅ Webhook успешно установлен!${NC}"
else
    echo -e "${RED}❌ Ошибка установки webhook${NC}"
    echo "Ответ: $SET_RESPONSE"
    if [ -n "$SET_ERROR" ]; then
        echo "Ошибка: $SET_ERROR"
    fi
    exit 1
fi

# Проверяем информацию о webhook
echo ""
echo "📡 Проверка информации о webhook..."
INFO_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
INFO_OK=$(echo "$INFO_RESPONSE" | grep -o '"ok":true' || echo "")

if [ -n "$INFO_OK" ]; then
    WEBHOOK_URL_SET=$(echo "$INFO_RESPONSE" | grep -o '"url":"[^"]*"' | cut -d'"' -f4 || echo "")
    PENDING_COUNT=$(echo "$INFO_RESPONSE" | grep -o '"pending_update_count":[0-9]*' | cut -d':' -f2 || echo "0")
    LAST_ERROR=$(echo "$INFO_RESPONSE" | grep -o '"last_error_message":"[^"]*"' | cut -d'"' -f4 || echo "none")
    
    echo ""
    echo -e "${GREEN}✅ Webhook настроен успешно!${NC}"
    echo "   URL: ${WEBHOOK_URL_SET}"
    echo "   Pending updates: ${PENDING_COUNT}"
    echo "   Last error: ${LAST_ERROR}"
    
    if [ "$PENDING_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Есть ${PENDING_COUNT} необработанных обновлений${NC}"
    fi
    
    if [ "$LAST_ERROR" != "none" ] && [ -n "$LAST_ERROR" ]; then
        echo -e "${YELLOW}⚠️  Последняя ошибка: ${LAST_ERROR}${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Не удалось получить информацию о webhook${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Готово! Webhook настроен и готов к работе.${NC}"
echo ""
echo "💡 Для проверки работы:"
echo "   1. Попробуйте войти в админку"
echo "   2. Нажмите 'Approve' в Telegram"
echo "   3. Проверьте логи сервера"
