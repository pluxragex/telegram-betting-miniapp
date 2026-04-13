# Telegram Betting
> A full Telegram Mini App for community tournaments and betting: matches, odds, rankings, rewards, bonus codes, and an admin panel.  
> The project is under active development.

## What's unique?
The app combines user betting flows and Telegram-native onboarding in a single product: Telegram WebApp authentication, channel subscription checks, live match feeds, ranking rewards, and moderation tools.  
The backend unifies API endpoints, real-time updates, Telegram bot integration, and migration-based data evolution in one modular NestJS service.

## What technologies are used?
> [!WARNING]
> Below are the key technologies and infrastructure dependencies of the project.

### Frontend (`client`)
* **React 18 + TypeScript**
* **Vite**
* **React Router**
* **Socket.IO Client**
* **ESLint**

### Backend (`server`)
* **NestJS 10**
* **TypeORM + SQLite**
* **Socket.IO**
* **Telegram Bot API (`node-telegram-bot-api`)**
* **Sharp**
* **NestJS Throttler**

## Why this architecture?
Separation into `client` and `server` allows Telegram UI logic and backend business logic to evolve independently, which simplifies scaling and release flow.  
The backend is split into focused modules (`auth`, `users`, `bets`, `matches`, `groups`, `history`, `prizes`, `bonus-codes`, `admin`, `realtime`, `bot`) to keep domain boundaries clear and maintenance predictable.

## How can I run it locally?

### 1) Clone repository
```bash
git clone https://github.com/pluxragex/telegram-betting-miniapp.git
cd telegram-betting-miniapp
```

### 2) Install dependencies
```bash
cd client && npm install
cd ../server && npm install
```

### 3) Configure environment
```bash
cd server
cp env.example .env
```

```bash
cd ../client
cp env.example .env
```

Fill in the required values in `.env` files:
- server: Telegram bot settings, app URL, admin Telegram IDs, and channel IDs
- client: `VITE_API_URL` (default `/api`, or `http://localhost:3000` for local API access)

### 4) Prepare database
```bash
cd server
npm run migration:run
```

### 5) Start development mode

```bash
# backend
cd server
npm run start:dev
```

```bash
# frontend
cd client
npm run dev
```

## Available functionality

### Authentication & Telegram integration
* Telegram WebApp auth via `initData`
* Telegram channel subscription validation
* Telegram bot integration for app-related flows
* Basic anti-abuse throttling guards

### Betting & match flow
* Match feeds grouped by tournament/group context
* Betting on matches with odds
* Bet status lifecycle (`win`, `lose`, `refunded`)
* User betting history

### Rewards & progression
* User ranking and leaderboard mechanics
* Prize management
* Daily bonus support
* Bonus code activation and usage tracking

### Admin panel
* Managing users, matches, groups, teams, and prizes
* Ranking settings configuration
* Bonus code management
* Administrative moderation and operational endpoints

### Realtime & backend services
* Live updates over WebSocket (Socket.IO)
* Modular domain services in NestJS
* TypeORM migrations for schema evolution
* Optional PM2 ecosystem config (`server/ecosystem.config.js`)

## Testing & quality

### Frontend
```bash
cd client
npm run lint
npm run build
```

### Backend
```bash
cd server
npm run lint
npm run test
npm run test:cov
```

## Project structure
```text
client/   # React + Vite + TypeScript Telegram WebApp frontend
server/   # NestJS + TypeORM backend API, Telegram bot integration, WebSocket, migrations
```

## Notes
> [!NOTE]
> The app depends on Telegram infrastructure and bot configuration.  
> For local and production environments, make sure bot token, mini app URL, channel identifiers, and runtime environment variables are configured correctly before launch.
