# Yanis Wealth

Personal wealth dashboard built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- Multi-currency wealth tracking (EUR, MAD, AED, USD)
- Live exchange rate conversion
- Daily wealth snapshots with historical charts
- Asset allocation visualization
- Dynamic tabs/categories management
- Dark/Light mode
- PWA support (iPhone home screen)

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Auth**: Supabase Auth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/yanis-wealth.git
   cd yanis-wealth
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your Supabase credentials in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Run the database migrations in your Supabase SQL editor (see `supabase/migrations/`).

6. Create a user in Supabase Auth dashboard.

7. Start the dev server:
   ```bash
   npm run dev
   ```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
