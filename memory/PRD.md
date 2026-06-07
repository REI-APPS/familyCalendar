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

## Recently shipped (Jun 2026)
- i18n (EN/PT/ES) with persisted choice
- Change password & Delete account flows
- Sporadic Tasks (per-day to-dos) with DB-trigger logging
- 3 native Android widgets: Today, Week, AgendaPlus
- Edge Function `send-invite` (Resend) with **localized email** (PT/EN/ES)
- Widget headless refresh with **token refresh fallback** (uses refresh_token when JWT expires)
- Larger fonts in Week + AgendaPlus widgets; softer task background
- Static member order across all views (sorted by `created_at`)
- **Registered Users management** (admin can remove members of the family) — RPC `admin_remove_family_user`
- **Recent Changes Alert** modal — shown once per change set when alterations happen in the next 14 days

## Pending / Next iterations
1. Run `/app/SUPABASE_USERS_AND_ALERTS.sql` in Supabase SQL Editor for users + alerts features.
2. Redeploy edge function: `supabase functions deploy send-invite`.
3. Issue an EAS build to validate widget headless refresh in real device (cannot be tested via Expo Go).
4. (Optional) Add per-member sort_order column + drag-to-reorder UI.
