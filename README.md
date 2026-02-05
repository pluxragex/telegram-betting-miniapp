# Cortez Masters — Telegram Mini App

Полноценный Telegram Mini App для соревнований и ставок внутри комьюнити: матчи, коэффициенты, рейтинг, призы, бонус‑коды и админ‑панель. Репозиторий монорепозитория: фронтенд на React (Vite) и бэкенд на NestJS.

## Возможности
- Авторизация через Telegram WebApp (`initData`), проверка подписки на канал.
- Ленты матчей по группам с коэффициентами и ставками.
- История ставок, статусы (win/lose/refunded).
- Рейтинг пользователей с призами.
- Ежедневный бонус и промокоды (bonus codes).
- Админ‑панель: управление призами, настройками рейтинга, бонус‑кодами, матчами и пользователями.
- Реальное время через Socket.IO.
- Интеграция с Telegram Bot API (бот и уведомления).

## Стек
- Frontend: React 18, Vite, TypeScript, React Router, Socket.IO client.
- Backend: NestJS 10, TypeORM, SQLite, Socket.IO, Telegram Bot API, Sharp.

## Архитектура
- `client/` — SPA для Telegram WebApp.
- `server/` — REST API + WebSocket шлюз + Telegram‑бот + база данных.
- База данных по умолчанию: SQLite (`database.sqlite`). Миграции лежат в `server/src/database/migrations`.

## Быстрый старт (локально)

### 1) Бэкенд
```bash
cd server
cp env.example .env
npm install
npm run start:dev
```

### 2) Фронтенд
```bash
cd client
cp env.example .env
npm install
npm run dev
```

По умолчанию фронтенд ходит в `VITE_API_URL=/api`. Для локальной разработки можно указать `http://localhost:3000` (или другой порт, на котором работает сервер).

## Переменные окружения

### Server (.env)
- `TELEGRAM_BOT_TOKEN` — токен бота.
- `TELEGRAM_MINI_APP_URL` — URL мини‑приложения.
- `TELEGRAM_BOT_USERNAME` — юзернейм бота.
- `DATABASE_PATH` — путь к базе (по умолчанию `database.sqlite`).
- `PORT` — порт сервера (в `env.example` указан `3000`; если не задан, используется `4000`).
- `NODE_ENV` — окружение (`development`/`production`).
- `ADMIN_TELEGRAM_IDS` — список Telegram ID админов (через запятую).
- `TELEGRAM_CHANNEL_ID` — канал для проверки подписки.
- `TELEGRAM_CHANNEL_NEWS_ID` — канал для новостей.

### Client (.env)
- `VITE_API_URL` — базовый URL API.

## Скрипты

### Client
- `npm run dev` — запуск Vite dev‑сервера.
- `npm run build` — сборка фронтенда.
- `npm run preview` — предпросмотр сборки.
- `npm run lint` — линтер.

### Server
- `npm run start:dev` — запуск NestJS в режиме watch.
- `npm run build` — сборка.
- `npm run start:prod` — запуск собранного приложения.
- `npm run migration:run` — применение миграций.
- `npm run migration:revert` — откат последней миграции.

## Миграции базы данных
```bash
cd server
npm run migration:run
```

## Продакшн и деплой

### Сборка
```bash
cd server
npm install
npm run build
```

### Запуск
```bash
node dist/main.js
```

### PM2 (опционально)
В репозитории есть `server/ecosystem.config.js`:
```bash
cd server
pm2 start ecosystem.config.js
```

## Структура репозитория
- `client/` — фронтенд (Telegram WebApp).
- `server/` — бэкенд, база, миграции, WebSocket.
- `server/src/modules/` — доменные модули (bets, matches, groups, prizes, bonus‑codes, admin, realtime и т.д.).
- `server/src/auth/` — Telegram‑аутентификация.
