# Agenda da Família — PRD

## Vision
Cross-device family scheduling app with per-member daily schedule codes (e.g., INF, CASA, MANHA, OFFICE), realtime sync via Supabase, monthly/daily views, PDF export, and an Android home-screen widget.

## MVP Features
- Email/password auth (Supabase Auth)
- Multi-family isolation via Row Level Security (RLS) — each user only sees their family
- Create family with **one tap** → auto-seeds 3 members (User1/User2/User3) + 6 schedule types (INF, CASA, MANHA, TARDE, OFFICE, HOME) and their default assignments
- CRUD for Members (name, color)
- CRUD for Schedule Types (code, name, description, color)
- Assign Schedule Types per Member (many-to-many)
- Daily view (Today screen) with tap-to-set per member
- Month view with color dots + dedicated PDF export
- Send invites (records in DB + native Share)
- Realtime sync across devices via Supabase channels

## Stack
- Expo SDK 54 + Expo Router 6 (file-based)
- Supabase JS v2 (Auth + Postgres + Realtime)
- expo-print + expo-sharing for PDF export
- date-fns for date math (locale: pt)

## Files of interest
- `/app/SUPABASE_SCHEMA.sql` — full schema + RLS + seed function
- `/app/ANDROID_WIDGET_README.md` — widget config plugin instructions
- `/app/frontend/src/lib/supabase.ts` — client with stub fallback when not configured
- `/app/frontend/app/(app)/index.tsx` — Today screen
- `/app/frontend/app/(app)/month.tsx` — Month view + PDF export
- `/app/frontend/app/(app)/members.tsx` — Members & Types management
- `/app/frontend/app/(app)/settings.tsx` — Invites, family switcher, sign out

## Pending / Next iterations
1. **Provide real Supabase credentials** in `frontend/.env` and run the SQL.
2. Android widget Kotlin code generation (config plugin) — only effective in production APK build.
3. Google OAuth via Supabase Auth (when user requests).
4. Email-based invite acceptance flow (deep link → auto-add to family).
