# SecureShare

End-to-end encrypted messaging and file sharing for organizations. Messages, subjects, attachments and attachment **file names** are encrypted in the browser; the server stores ciphertext and never holds a key that can read it.

## How the encryption works

Each message gets a fresh AES-256-GCM key. That key is wrapped separately with the RSA-OAEP public key of every recipient, so each person has their own independent way to open the same message and there is no shared secret to leak. Attachments are encrypted with the same message key before upload and given a random file name, so the storage provider never learns what a document is called.

Every user's RSA private key is generated in their browser. A copy is stored on the server encrypted with a key derived from their **Master Password** via PBKDF2, so they can sign in from a new device — but the server never sees the password or the unwrapped key. Losing the Master Password means losing access, which is what makes the guarantee real; an **Emergency Recovery Key**, shown once at onboarding, is the only other way in.

Organizations can optionally hold their own keypair, letting Owners and Admins recover messages sent to the organization when an individual is unavailable. Every such vault decryption is written to the audit log.

## Requirements

- Node.js 20+
- PostgreSQL
- An SMTP account (login codes, invitations, notifications)
- An [UploadThing](https://uploadthing.com) token (encrypted attachment storage)

## Setup

```bash
npm install
cp .env.example .env    # then fill it in — every variable is documented there
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### If the database already has tables but no migration history

A database created with `prisma db push` has no `_prisma_migrations` table, so `migrate deploy` will try to create tables that already exist and fail. Baseline the migrations that are already reflected in the schema, then deploy the rest:

```bash
npx prisma migrate resolve --applied 20260317134211_init
npx prisma migrate resolve --applied 20260317143857_extend_for_securemail_v2
npx prisma migrate deploy
```

### A note on `sslmode`

Set it explicitly in `DATABASE_URL`. The `pg` driver currently treats `sslmode=require` as `verify-full`, but a future major version will redefine it to mean encryption *without* certificate verification — so a URL saying `require` silently gets weaker on upgrade. Use `sslmode=verify-full` for a managed database, or `sslmode=disable` for a local one.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint — expected to be completely clean |

## Scheduled cleanup

`GET /api/cron/cleanup` permanently deletes attachment blobs whose message has expired or which every recipient has deleted. Expiry is only real once the bytes are gone, so this needs to run — daily is reasonable.

It is protected by `CRON_SECRET` and returns 503 until that is set. Call it with:

```
Authorization: Bearer $CRON_SECRET
```

On Vercel this is wired up in `vercel.json` (daily at 03:00 UTC). Vercel sends the
`Authorization: Bearer` header itself from the `CRON_SECRET` environment variable, so
the token is never written into the config. Elsewhere, any scheduler that can set a
header will do.

Cron jobs only run on production deployments, not previews.

## Security notes for contributors

A few things in this codebase are load-bearing and easy to undo by accident:

- **Never use `include: { user: true }` or `sender: true` on a query whose result reaches a client component.** Prisma returns every scalar column, which includes `encryptedPrivateKey`, its salt and IV, and the recovery blobs. Those get serialised into the page payload. Use an explicit `select` — `MESSAGE_SELECT` in `lib/message-filters.ts` is the reference, and `tests/message-filters.test.ts` asserts it stays clean.
- **PBKDF2 iterations are versioned.** `kdfIterations` is stored per user and per organization; `null` means the legacy 100,000. Changing `PBKDF2_ITERATIONS` only affects newly written keys — never backfill the column, or existing vaults stop opening.
- **The Content-Security-Policy is per-route** (`middleware.ts`). Routes rendered per request get a strict nonce policy; prerendered pages cannot carry a nonce and get a weaker one. Adding a page under a nonced prefix is fine; making a nonced route prerendered would break it.
- Attachment file names are ciphertext in the database. Read them through `tryDecryptString`, which falls back to the stored value for rows written before this was true.

## Documentation

`docs/SecureShare-User-Guide.md` — the complete user and administrator guide.
