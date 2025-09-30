# Afina DAO Wiki

Многоязычная вики с админ-панелью для управления проектами Afina DAO.

## Технологии

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База данных**: MySQL 8.0
- **Контейнеризация**: Docker Compose

## Быстрый старт

### 1. Запуск базы данных

```bash
# Запуск MySQL и phpMyAdmin
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### 2. Настройка переменных окружения

Создайте файл `.env.local` в папке `frontend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=afina_user
DB_PASSWORD=afina_password
DB_NAME=afina_dao_wiki

# API Configuration
NEXT_PUBLIC_API_URL=
```

### 3. Установка зависимостей

```bash
cd frontend
npm install
```

### 4. Запуск приложения

```bash
cd frontend
npm run dev
```

## Доступ к приложению

- **Основное приложение**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin
- **phpMyAdmin**: http://localhost:8080

### Данные для входа в админ-панель:
- **Логин**: admin
- **Пароль**: admin123

## Структура проекта

```
Afina-Dao/
├── frontend/                 # Next.js приложение
│   ├── app/                 # App Router
│   │   ├── api/            # API endpoints
│   │   ├── admin/          # Админ-панель
│   │   └── project/        # Страницы проектов
│   ├── components/         # React компоненты
│   ├── lib/               # Утилиты и API
│   └── types/              # TypeScript типы
├── database/               # SQL схемы
│   └── schema.sql         # Схема базы данных
└── docker-compose.yml     # Docker конфигурация
```

## API Endpoints

### Проекты
- `GET /api/projects` - получить все проекты
- `GET /api/projects/[id]` - получить проект по ID
- `POST /api/projects` - создать новый проект
- `PUT /api/projects/[id]` - обновить проект
- `DELETE /api/projects/[id]` - удалить проект

## База данных

### Таблицы
- `projects` - основная информация о проектах
- `project_blocks` - блоки описания проектов
- `project_block_links` - ссылки в блоках

### Схема
Схема базы данных автоматически создается при первом запуске Docker контейнера из файла `database/schema.sql`.

## Функциональность

### Для пользователей
- Просмотр проектов в сайдбаре
- Детальная информация о проектах
- Поддержка темной/светлой темы
- Многоязычность (EN, RU, UA)

### Для администраторов
- Создание и редактирование проектов
- Управление блоками описания
- Настройка совместимости ОС
- Статистика проектов

## Разработка

### Добавление новых полей
1. Обновите типы в `types/project.ts`
2. Обновите схему базы данных в `database/schema.sql`
3. Обновите API endpoints в `app/api/projects/`
4. Обновите компоненты форм

### Добавление новых API
1. Создайте новый файл в `app/api/`
2. Реализуйте HTTP методы
3. Добавьте типы в `types/`
4. Обновите клиентские функции в `lib/`

## Troubleshooting

### Проблемы с базой данных
```bash
# Перезапуск контейнеров
docker-compose down
docker-compose up -d

# Просмотр логов
docker-compose logs mysql
```

### Проблемы с подключением
- Проверьте, что MySQL контейнер запущен
- Убедитесь, что порт 3306 свободен
- Проверьте переменные окружения

## Лицензия

MIT License