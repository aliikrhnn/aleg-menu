# Aleg — Restaurant Platform

A multi-tenant QR ordering and restaurant management platform, built on Next.js and
Supabase. Guests order from a QR menu, waitstaff and the kitchen work the queue, the till
closes the day, and a super-admin console runs the platform across all tenants.

This is the production implementation. `aleg-menu-io` is the later monorepo restructuring
of the same product.

## Features

**Guest** — QR menu per table, cart and ordering, order status, reviews

**Restaurant** — order queue, waiter and kitchen manifests, cashier flow with an
end-of-day close, menu and category management, QR code generation and export (PDF via
`jsPDF`, batched as a ZIP), push notifications

**Super admin** — support ticket system with threaded replies, platform announcements,
admin team management, audit log timeline, system health, platform settings, and a ⌘K
command menu

**AI-assisted content** — description and slogan generation, menu item variations and
monogram generation, backed by the Anthropic API

## Architecture

```
app/
├── (guest)/          QR menu and ordering
├── (panel)/          Restaurant operations
├── (admin)/          Platform super-admin
└── api/              Route handlers — AI, cashier, manifests, status
lib/
├── actions/          Server actions, grouped by domain
├── printer/          ESC/POS builders shared with the on-prem agent
└── supabase/         Server and browser clients
supabase/migrations/  37 tracked migrations
```

**Multi-tenancy is enforced in the database, not the application.** Every tenant-scoped
table has row-level security; the super-admin tables are readable only by members of
`super_admins`. An application bug cannot leak one restaurant's orders to another,
because the query never returns them in the first place.

**Migrations are disciplined.** 37 sequential migrations, with the rules for writing them
recorded in `MIGRATION-DISIPLINI.md` and backup and restore documented in
`BACKUP-RESTORE-REHBERI.md`. Read models are exposed as SQL views rather than assembled
in application code.

**Offline resilience.** `dexie` keeps an IndexedDB cache so the panel survives a dropped
connection mid-service.

**Printing is out of process.** A browser cannot open a TCP socket to a thermal printer,
so print jobs are queued in the database and collected by
[aleg-agent](https://github.com/aliikrhnn/aleg-agent) running on the café's own PC.

## Stack

Next.js (App Router) · TypeScript · Supabase (Postgres, Auth, Realtime, RLS) · Tailwind
CSS · Anthropic SDK · Sentry · Dexie · jsPDF · web-push

## Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3000
```

```bash
npm run build
npm run type-check
npm run lint
```

Setup, migration and backup procedures are documented in `KURULUM.md`,
`MIGRATION-DISIPLINI.md` and `BACKUP-RESTORE-REHBERI.md`. A Turkish version of this
README is in `README.tr.md`.

## Licence

Not open source. Published for review; all rights reserved.
