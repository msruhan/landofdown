# MLBB Stats Tracker

Website statistik pertandingan Mobile Legends: Bang Bang. Mencatat hasil pertandingan, merekap performa player, dan menganalisis statistik secara mendalam.

## Tech Stack

- **Frontend:** Vue.js 3 + TypeScript + Vite + Pinia + Vue Router + Chart.js
- **Backend:** Laravel 13 + Sanctum (Token Auth)
- **Database:** SQLite (dev) / MySQL (production)

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.sqlite .env          # Gunakan SQLite untuk development
# atau edit .env untuk MySQL: DB_CONNECTION=mysql, DB_DATABASE=mlbb_stats

php artisan migrate:fresh --seed
php artisan serve --port=8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka **http://localhost:5173** di browser.

### Default Admin Login

- **Email:** admin@mlbb.com
- **Password:** password

## Struktur Project

```
mobile-legend/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/Api/   # 8 Controllers
│   │   ├── Models/                 # 7 Models
│   │   └── Services/              # StatisticsService, RankingService
│   ├── database/
│   │   ├── migrations/            # 9 Migration files
│   │   └── seeders/               # 5 Seeders (30 heroes, 10 players, 20 matches)
│   └── routes/api.php             # 31 API endpoints
│
├── frontend/                   # Vue.js SPA
│   └── src/
│       ├── components/        # 15 Reusable components
│       ├── layouts/           # PublicLayout, AdminLayout
│       ├── pages/
│       │   ├── public/        # 5 Public pages
│       │   └── admin/         # 7 Admin pages
│       ├── services/api.ts    # API service layer
│       ├── stores/            # Pinia stores
│       └── types/             # TypeScript interfaces
```

## Halaman

### Public (Tanpa Login)
| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Dashboard | `/` | Highlight statistik, charts, leaderboards, recent matches |
| Ranking | `/ranking` | Leaderboard lengkap dengan filter dan sorting |
| Statistics | `/statistics` | Analisis detail: player, hero, role, match history |
| Player Detail | `/players/:id` | Profil lengkap player dengan semua statistik |
| Match Detail | `/matches/:id` | Detail pertandingan Team A vs Team B |

### Admin (Login Required)
| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Login | `/admin/login` | Form login admin |
| Dashboard | `/admin/dashboard` | Overview & quick actions |
| Input Match | `/admin/matches/create` | Form input manual 10 player |
| Upload Screenshot | `/admin/matches/upload` | Upload & parse screenshot |
| Manage Players | `/admin/players` | CRUD player |
| Manage Heroes | `/admin/heroes` | CRUD hero |
| Manage Roles | `/admin/roles` | CRUD role |

## API Endpoints

### Public
- `GET /api/statistics/dashboard` - Dashboard stats
- `GET /api/statistics/players/:id` - Player detail stats
- `GET /api/statistics/heroes` - Hero stats
- `GET /api/statistics/roles` - Role stats
- `GET /api/rankings` - Leaderboard (with filters)
- `GET /api/players` - List players
- `GET /api/matches` - List matches

### Admin (Bearer Token Required)
- `POST /api/admin/login` - Login
- `POST /api/admin/logout` - Logout
- `POST /api/admin/matches` - Create match
- `POST /api/admin/players` - Create player
- `POST /api/admin/heroes` - Create hero
- `POST /api/admin/screenshots/upload` - Upload screenshot

## Database Schema

- **players** - username
- **roles** - 5 roles (Gold Lane, Exp Lane, Mid Lane, Roamer, Jungler)
- **heroes** - 30 MLBB heroes dengan primary role
- **game_matches** - tanggal, durasi, teams, winner
- **match_players** - 10 entries per match (hero, role, KDA, rating, medal, result)
- **uploaded_screenshots** - file screenshot dengan status parsing

## Demo Data

Seeder menyediakan:
- 1 Admin user
- 5 Roles
- 30 Heroes
- 10 Players
- 20 Matches (200 match_player entries)

## Production (MySQL)

```bash
# Edit backend/.env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mlbb_stats
DB_USERNAME=root
DB_PASSWORD=your_password

php artisan migrate:fresh --seed
```
