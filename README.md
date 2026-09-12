# Indie Hackers City — Admin console

A second Next.js app that shares the city app's Supabase project. It reads every account, reviews
the milestone claims founders submit, and owns the two tables that decide what XP is worth.

It is a **separate app, not a separate database**. There is one Supabase project, one set of
migrations, and they live in the city repo at `../Indie-hackers-city/supabase/migrations`. Nothing
in this repo creates or alters schema.

## Why it exists

The city app lets a founder log their own milestones — launched a product, reached 100 users, earned
$100 — and each one moves XP, which moves their building's level. Nothing verifies those claims.
This console is the verification step: a claim arrives as `pending`, an admin approves it, and only
then does the XP ledger move.

## Running it

```bash
cp .env.local.example .env.local   # then fill ADMIN_EMAILS and SUPABASE_SECRET_KEY
npm install
npm run dev                        # http://localhost:3001
```

Port 3001 is deliberate: the city app owns 3000 and both are usually running.

The local Supabase stack belongs to the city repo. Start it there first:

```bash
cd ../Indie-hackers-city && npm run db:start
npx supabase status                # SECRET_KEY -> SUPABASE_SECRET_KEY here
```

`supabase/config.toml` in the city repo lists `http://localhost:3001/**` among its allowed OAuth
redirects. If Google sign-in bounces, that stack needs a restart to pick the entry up.

## Who gets in

Two independent things have to be true, and they are checked in different places:

| Question | Answered by | Where |
| --- | --- | --- |
| Is this a real signed-in Google account? | Supabase Auth | `auth.getUser()`, re-verified per request |
| Is that account allowed here? | `ADMIN_EMAILS` | `src/lib/auth/admin.ts` |

`ADMIN_EMAILS` is a comma-separated allow-list. An empty or unset value denies everyone, which is
the safe direction to fail. The address compared against it is the one **Google** vouches for, taken
from the user's Google identity with `email_verified` set — not `user.email`. Supabase Auth also
accepts email/password sign-ups, so trusting `user.email` alone would let anyone who knows an
admin's address register it and inherit the console.

`readAdminGate()` is called by `src/app/(console)/layout.tsx`, which covers every page under it.
`requireAdmin()` is called again inside every server action, because a layout check does not protect
an action invoked by a crafted request.

## How it reaches the data

Two Supabase clients, for two different jobs:

- **`src/lib/supabase/server.ts`** — the admin's own session. Answers *who is asking*. Nothing more.
- **`src/lib/supabase/admin.ts`** — the secret key (formerly `service_role`). Bypasses RLS, and
  satisfies the `service_role` check inside `award_plot_xp`, which is what lets the console move XP
  at all.

The secret key is server-side only. `admin.ts` imports `server-only`, so pulling it into a client
component is a build error rather than a leak.

Most of what the console shows is unreadable any other way: `building_level_milestones` and
`plot_xp_events` have every grant revoked from the browser roles, and `auth.users` — where email
addresses and sign-in times live — is not exposed through PostgREST at any key.

## Layout

```
src/
  app/
    (console)/          Everything behind the admin gate
      page.tsx          Overview: counts, XP in circulation, founders per level
      approvals/        The review queue
      users/            Every account; [userId] opens projects, claims and the XP ledger
      achievements/     The reward catalog
      milestones/       The level ladder
    login/  denied/  auth/callback/
  lib/
    auth/admin.ts       The allow-list gate
    console/            Server-side reads, one module per area
    supabase/           Clients, plus database.types.ts copied from the city repo
```

## Types

`src/lib/supabase/database.types.ts` is a copy of the city repo's generated file. After a migration
lands there, refresh it here:

```bash
npm run db:types
```

It points at the same local database, so the two files stay identical by construction.

## Things worth knowing before changing anything

- **XP is append-only.** `plot_xp_events` is a ledger. A mistake is corrected by posting a negative
  event under a new key, never by editing a row or by touching `plot_claims.xp_total` directly.
- **Rewards cascade downward.** Approving "100+ users" also grants the 10 and 50 rungs if they are
  not already held, so the XP a founder receives is the sum of what was still outstanding.
- **Revenue is founder-scoped.** `revenue_10` and `revenue_100` are claimed once per person across
  their whole portfolio and carry no `project_id`; everything else is once per project.
- **Editing a reward is not retroactive.** Past ledger events keep the amount they were written
  with. A new `xp_reward` applies to claims approved after the edit.
- **Editing a milestone threshold is retroactive.** Levels are derived from
  `building_level_milestones`, so moving a threshold re-levels every founder already past it.
