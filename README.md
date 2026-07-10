# ManageFlow

ManageFlow is a web-based project and team management system for game development teams. It connects senior managers, team leads, project managers, employees, and interns in one organized platform.

## Phase 1: Foundation

- Next.js App Router with TypeScript and Tailwind CSS
- Real Supabase authentication (no mock data)
- Database schema and seed files
- Intern registration with 32+ hour weekly schedule validation
- Protected dashboard with profile and schedule display
- Settings page with real profile updates
- Dashboard layout with sidebar and topbar

## Setup

1. Copy `.env.local.example` to `.env.local` and add your Supabase credentials.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/seed.sql` in the Supabase SQL Editor.
4. Install dependencies: `npm install` or `pnpm install`
5. Start the dev server: `npm run dev` or `pnpm dev`

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth, PostgreSQL, SSR)
