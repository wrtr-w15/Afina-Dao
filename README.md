# Afina DAO Wiki

Professional platform for managing and automating crypto wallets with a multilingual wiki system and admin panel.

## 📖 About the Project

Afina DAO Wiki is a comprehensive web platform that provides:

- **Information Portal** with service descriptions and cooperation terms
- **Knowledge Base** about available projects and tools
- **Admin Panel** for managing projects and categories
- **Pricing Calculator** for tariff calculations
- **Multilingual Support** (Russian, English, Ukrainian)
- **Dark/Light Theme** for comfortable viewing

## 🛠 Technology Stack

### Frontend
- **Next.js 15.5** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - typed JavaScript
- **Tailwind CSS 3.3** - utility-first CSS framework
- **next-intl 4.3** - internationalization (i18n)

### UI and Components
- **Lucide React** - icon set
- **Framer Motion** - animations
- **React Hook Form** - form management
- **clsx / tailwind-merge** - class management

### Data Management
- **TanStack Query (React Query)** - server state management
- **Axios** - HTTP client
- **MySQL2** - database driver
- **js-cookie** - cookie management

### Markdown and Content
- **React Markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown
- **isomorphic-dompurify** - HTML sanitization (XSS protection)

### Security
- **DOMPurify** - XSS attack protection
- **Parameterized SQL Queries** - SQL injection protection
- **Rate Limiting** - DDoS protection
- **Input Validation** - input data validation
- **HTTPOnly Cookies** - secure session storage
- **2FA via Telegram** - two-factor authentication

### Database
- **MySQL 8.0** - relational DBMS
- **Docker Compose** - containerization

### Development Tools
- **ESLint** - code linter
- **PostCSS** - CSS processing
- **Autoprefixer** - automatic CSS prefixes

## 🏗 Architecture

```
Afina-Dao/
├── frontend/                    # Next.js application
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── api/               # API Routes
│   │   │   ├── projects/      # Project management
│   │   │   ├── categories/    # Category management
│   │   │   ├── auth/          # Authentication (2FA via Telegram)
│   │   │   ├── admin/         # Admin API
│   │   │   └── pricing-settings/ # Pricing settings
│   │   ├── admin/             # Admin panel
│   │   │   ├── projects/      # Project management
│   │   │   ├── categories/    # Category management
│   │   │   └── settings/      # Pricing settings
│   │   ├── project/           # Project pages
│   │   ├── about/             # Terms and conditions
│   │   ├── pricing/           # Pricing calculator
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── admin/            # Admin panel components
│   │   ├── sidebar/          # Navigation sidebar
│   │   └── ui/               # UI components (Button, Card, Input, etc.)
│   ├── contexts/             # React Contexts (Theme, Auth)
│   ├── lib/                  # Utilities and libraries
│   │   ├── projects.ts       # Projects API
│   │   ├── categories.ts     # Categories API
│   │   ├── validation.ts     # Validation and sanitization
│   │   ├── security-middleware.ts # Security middleware
│   │   └── database.ts       # Database configuration
│   ├── messages/             # i18n translations (ru, en, ua)
│   ├── styles/               # Themes and color schemes
│   ├── types/                # TypeScript types
│   └── config/               # Configuration (menu, languages)
├── database/                 # SQL schemas and migrations
│   └── schema.sql           # Database schema
└── docker-compose.yml       # Docker configuration
```

## 🗄 Database

### Main Tables

#### Projects
- `projects` - main project information
- `project_translations` - project translations (name, description)
- `project_blocks` - description blocks with Markdown
- `project_block_translations` - block translations
- `project_block_links` - links in blocks (Telegram, website)

#### Categories
- `categories` - project categories with hierarchy

#### Pricing
- `pricing_settings` - pricing configuration
- `discount_multipliers` - discounts based on project quantity

#### Authentication
- `auth_sessions` - sessions with 2FA via Telegram

### Multilingual Support

Translations are stored in separate tables (`*_translations`) with a `locale` field (ru, en, ua).
Base values from the main table are used when translations are missing.

## 🎨 UI/UX Features

### Themes
- Light theme - for daytime work
- Dark theme - for nighttime work
- Automatic preference saving

### Responsiveness
- Desktop (1024px+) - full functionality
- Tablet (768px-1023px) - compact navigation
- Mobile (<768px) - mobile menu

### Navigation
- Dynamic sidebar with projects
- Automatic current page tracking
- Search by projects and categories
- Automatic table of contents on project pages

## 🔐 Security

### Implemented Security Measures

1. **XSS Protection**
   - HTML sanitization via DOMPurify
   - Whitelist of allowed HTML tags
   - User input escaping

2. **SQL Injection Protection**
   - Parameterized SQL queries
   - UUID validation
   - Typed parameters

3. **Rate Limiting**
   - 60 requests/min for GET
   - 30 requests/min for POST/PUT
   - 10 requests/min for DELETE

4. **Input Validation**
   - UUID, URL, email validation
   - Field length limitations
   - Protocol whitelist (only http/https)

5. **Authentication & Authorization**
   - 2FA via Telegram Bot
   - HTTPOnly cookies
   - Secure cookies in production
   - SameSite: strict

6. **Session Security**
   - AES-256-CBC encryption
   - Automatic session expiration
   - IP tracking and geolocation

## 🌍 Internationalization (i18n)

### Supported Languages
- 🇷🇺 Russian (ru) - primary
- 🇬🇧 English (en)
- 🇺🇦 Ukrainian (ua)

### Translatable Elements
- Application interface
- Project content (name, description, blocks)
- Terms and conditions
- Error messages

## 📦 Installation and Launch

### Requirements
- Node.js 18+ 
- npm or yarn
- Docker and Docker Compose (for DB)
- MySQL 8.0+

### Quick Start

1. **Clone repository:**
```bash
git clone <repository-url>
cd Afina-Dao
```

2. **Start database:**
```bash
docker-compose up -d
```

3. **Environment setup:**
Create `frontend/.env.local`:
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=afina_user
DB_PASSWORD=afina_password
DB_NAME=afina_dao_wiki

# Admin Auth
ADMIN_PASSWORD=your_secure_password
ADMIN_SESSION_SECRET=your_secret_key_32_characters
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

4. **Install dependencies:**
```bash
cd frontend
npm install
```

5. **Start application:**
```bash
npm run dev
```

### Access
- **Application**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **phpMyAdmin**: http://localhost:8080
- **API Docs**: http://localhost:3000/api/*

## 🔧 Configuration

### Environment Variables

#### Database
- `DB_HOST` - MySQL host (default: localhost)
- `DB_PORT` - MySQL port (default: 3306)
- `DB_USER` - database user
- `DB_PASSWORD` - database password
- `DB_NAME` - database name

#### Authentication
- `ADMIN_PASSWORD` - admin password
- `ADMIN_SESSION_SECRET` - session secret key (32+ characters)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token for 2FA
- `TELEGRAM_CHAT_ID` - chat ID for notifications

#### Optional
- `NODE_ENV` - environment (development/production)
- `NEXT_PUBLIC_API_URL` - API base URL

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Production Recommendations
1. Use HTTPS (Let's Encrypt)
2. Configure firewall (close unnecessary ports)
3. Set up regular database backups
4. Use strong passwords (32+ characters)
5. Configure log monitoring
6. Regularly update dependencies (`npm audit`)

## 📝 API Endpoints

### Public
- `GET /api/projects` - list of projects
- `GET /api/projects/[id]` - project details
- `GET /api/categories` - list of categories
- `POST /api/pricing-settings/calculate` - pricing calculation

### Protected
- `POST /api/auth/login` - login via Telegram 2FA
- `GET /api/auth/status` - authorization status
- `POST /api/auth/logout` - logout

### Admin Panel (requires authorization)
- `POST /api/projects` - create project
- `PUT /api/projects/[id]` - update project
- `DELETE /api/projects/[id]` - delete project
- `POST /api/projects/[id]/blocks/translations` - block translations
- `POST /api/categories` - create category
- `PUT /api/categories/[id]` - update category
- `GET /api/admin/pricing` - pricing settings
- `PUT /api/admin/pricing` - update pricing

## 📄 License

Proprietary - © 2025 Afina DAO. All rights reserved.

## 📞 Contacts

For cooperation inquiries, please contact our Telegram representatives:
- @acycas
- @kirjeyy

---

**Developed with ❤️ for Afina DAO**
