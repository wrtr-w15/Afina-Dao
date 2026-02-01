#!/bin/bash

# Afina DAO Wiki - Development Startup Script
# Поднимает Next.js и Telegram-бота одной командой для разработки

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Afina DAO Wiki — среда разработки"
echo "===================================="

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 18+."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Нужен Node.js 18+. Сейчас: $(node -v)"
    exit 1
fi

echo "✅ Node.js: $(node -v) | npm: $(npm -v)"

# Зависимости
echo ""
echo "📦 Зависимости..."
if [ ! -d "frontend/node_modules" ]; then
    echo "Установка зависимостей frontend..."
    (cd frontend && npm install)
fi
echo "✅ Зависимости установлены"

# .env.local для frontend (бот и API)
if [ ! -f "frontend/.env.local" ]; then
    if [ -f "frontend/.env.example" ]; then
        echo ""
        echo "📄 Создаю frontend/.env.local из .env.example..."
        cp frontend/.env.example frontend/.env.local
        echo "⚠️  Отредактируйте frontend/.env.local (БД, TELEGRAM_SUBSCRIPTION_BOT_TOKEN и др.)"
    else
        echo "⚠️  Нет frontend/.env.local и frontend/.env.example. Создайте .env.local вручную."
    fi
else
    echo "✅ frontend/.env.local найден"
fi

# MySQL (опционально)
echo ""
echo "🔍 Проверка MySQL..."
if command -v mysql &> /dev/null; then
    if mysql -u afina_user -pafina_password -e "SELECT 1;" 2>/dev/null; then
        echo "✅ MySQL доступен"
    else
        echo "⚠️  MySQL недоступен. При необходимости:"
        echo "   CREATE DATABASE afina_dao_wiki;"
        echo "   CREATE USER 'afina_user'@'localhost' IDENTIFIED BY 'afina_password';"
        echo "   GRANT ALL PRIVILEGES ON afina_dao_wiki.* TO 'afina_user'@'localhost';"
        echo "   FLUSH PRIVILEGES;"
    fi
else
    echo "⚠️  Клиент mysql не найден. Установите MySQL при необходимости."
fi

# Запуск Next.js + Telegram-бот в одном процессе (concurrently)
echo ""
echo "🎯 Запуск: Next.js + Telegram-бот (одна команда, остановка: Ctrl+C)"
echo "================================================================"
echo "🌐 Приложение:  http://localhost:3000"
echo "🔧 API:         http://localhost:3000/api"
echo "👤 Админка:     http://localhost:3000/admin"
echo "🤖 Бот:         polling → /api/telegram/bot"
echo "================================================================"
echo ""

# Запуск в foreground — один Ctrl+C останавливает и Next.js, и бота
cd frontend && exec npm run dev:all
