# Yanis Wealth

Premium personal wealth dashboard — track assets across currencies, set financial goals, and visualize wealth growth.

## Features

- Multi-currency wealth tracking (EUR, MAD, AED, USD) with live conversion
- Daily automated snapshots at 20:00 Paris time (pg_cron)
- Interactive wealth curve and allocation charts (Recharts)
- Financial objectives with progress tracking and motivational phrases
- Dynamic tabs — add/rename/delete categories from Settings
- Dark/Light mode with premium gradient design system
- PWA — installable on iPhone home screen
- Auto-save on blur + manual save

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui + Sora font |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Charts | Recharts |
| Deployment | Vercel |

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Mannyysimba/yanis-wealth.git
cd yanis-wealth
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for API routes) |
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |

### 3. Database Setup

Copy the SQL from `supabase/migrations/001_initial.sql` into Supabase SQL Editor and run it.

### 4. Create Auth User

Go to Supabase Dashboard → Authentication → Users → Add User with Yanis's email and password.

### 5. Run Dev Server

```bash
npm run dev
```

## Deploy to Vercel

```bash
# Push to GitHub (already done)
git push origin main

# Then import at vercel.com/new
# Add all 4 env vars in Vercel dashboard
# Deploy!
```

## APIs & Services Required

| Service | URL | Cost | Used for |
|---------|-----|------|----------|
| Supabase | supabase.com | Free | Database, Auth, Edge Functions |
| ExchangeRate API | exchangerate-api.com | Free | Live currency conversion |
| Vercel | vercel.com | Free | Hosting & deployment |
| Google Fonts | fonts.google.com | Free | Sora font |

No paid API keys required.

## PWA Checklist

- [x] `manifest.json` with app name, icons, theme
- [x] Service worker for offline caching
- [x] Apple meta tags for iOS
- [x] Standalone display mode
- [x] 192x192 and 512x512 PNG icons
