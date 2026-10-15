# ENV.md — environment variable reference & templates

**Rules**
- Secrets live in the deployment platform (Doppler locally, **Dokploy's
  encrypted DB on the VPS**). Never commit real values.
- Committed templates: `.env.example` (canonical) and `.env.vps`
  (local-storage dev template) — placeholders only, never real secrets.
- Gitignored: `.env`, `.env.local`, `.env.production`, `.env.local.*`,
  `.env.vercel*`, `.env.bak`, `.env.*.bak`. **Note:** arbitrary variants such
  as `.env.vps.local` are *not* ignored — don't create them.
- `NEXT_PUBLIC_*` is **baked at build time** and shipped to the browser —
  never a secret. Changing one requires a **rebuild**, not just a restart.
- Required-but-missing vars fail loudly; optional-but-missing ones must
  degrade (feature unavailable), not crash. Follow that pattern.

> ⚠️ `.env.example` is currently **incomplete** — it omits `DATABASE_URL`, all
> `R2_*`, `SMTP_*`, `INTERNAL_API_KEY`, `MAIL_DRAIN_SECRET` and more. This file
> is the complete list (debt T-010).

---

## 1. Core (app boots / serves without these → broken)

| Variable | Template | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@host:26257/db?sslmode=disable` | **REQUIRED.** CockroachDB. In this repo's dev env it points at **production** — `npm run dev` writes live rows. |
| `COCKROACH_CA_CERT` | cert PEM or blank | CA contents (contains `BEGIN CERTIFICATE`). Falls back to committed `certs/cockroach-ca.crt`. |
| `COCKROACH_CERT` | cert PEM or blank | Alias for the same intent. |
| `AUTH_SECRET` | `openssl rand -hex 32` | Better Auth session secret. |
| `BETTER_AUTH_SECRET` | same as above | Better Auth's own name; keep equal to `AUTH_SECRET`. |
| `AUTH_URL` | `https://nomarcprojects.com` | Canonical origin, **no trailing slash**. |
| `BETTER_AUTH_URL` | same | Keep equal to `AUTH_URL`. |
| `JWT_SECRET` | random hex | Token signing for the auth stack. |
| `APP_URL` | `https://nomarcprojects.com` | Base for absolute URL building (private-upload fallbacks, etc.). |
| `NEXT_PUBLIC_SITE_URL` | `https://nomarcprojects.com` | Canonical origin for `resolveSiteUrl()`; overrides stale loopback `AUTH_URL`. |
| `NEXT_PUBLIC_APP_URL` | `https://nomarcprojects.com` | Browser-visible origin. |
| `NODE_ENV` | `production` | Set by the runtime. |

> **Known debt (T-003):** the deployed env still has `AUTH_URL`,
> `BETTER_AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` =
> `http://localhost:3000`. Verify before changing.

---

## 2. Storage (uploads) — MinIO or Cloudflare R2

```bash
# Must be EMPTY (not "local") in production
STORAGE_BACKEND=
R2_ACCOUNT_ID=minio                 # sentinel; any non-empty value enables S3 mode
R2_ENDPOINT=https://media.nomarcprojects.com   # MUST be publicly reachable
R2_PUBLIC_DOMAIN=https://media.nomarcprojects.com/nomarcdb
NEXT_PUBLIC_R2_PUBLIC_DOMAIN=https://media.nomarcprojects.com/nomarcdb
R2_BUCKET_NAME=nomarcdb
R2_PRIVATE_BUCKET=nomarcdb-private  # unset ⇒ private/Helm-doc features off
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
UPLOAD_DIR=/app/uploads             # local-storage fallback target
PRIVATE_UPLOAD_DIR=/app/uploads/private
UPLOADS_PUBLIC_URL=                 # base for local-storage public URLs
NEXT_PUBLIC_UPLOADS_URL=/uploads
```

**Critical:** `R2_ENDPOINT` is embedded in presigned PUT URLs that the
**browser** must reach. A host only resolvable inside Docker
(`host.docker.internal`, `localhost`, `minio`) breaks uploads silently.
For Cloudflare R2 leave `R2_ENDPOINT` **unset** — the SDK falls back to
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.

`lib/storage/index.ts` selects local disk when `STORAGE_BACKEND=local`,
`R2_ACCOUNT_ID` is missing, or `R2_ENDPOINT=local`.

---

## 3. Auth providers

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth. Callback must match the Google console. |

> Not used by current code: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`
> (present in `.env.example`, unread — candidate for removal).

---

## 4. Payments

```bash
ALLOW_DEMO_PAYMENTS=false           # MUST be false/blank in production
PAYMENT_PROVIDER=                   # blank = auto-pick fully configured; or paystack|flutterwave|seerbit
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_HASH=           # Flutterwave needs BOTH secret + hash
SEERBIT_PUBLIC_KEY=
SEERBIT_SECRET_KEY=
INTERNAL_API_KEY=                   # shared secret for /api/payments/reconcile
```

Demo mode activates automatically when **no** provider is fully configured.

---

## 5. Email

```bash
RESEND_API_KEY=                     # primary sender; unset ⇒ isEmailConfigured false
RESEND_FROM=Nomarc Projects <info@nomarcprojects.com>
EMAIL_FROM=Nomarc Projects <info@nomarcprojects.com>
SMTP_HOST= SMTP_PORT= SMTP_SECURE= SMTP_USER= SMTP_PASS= SMTP_FROM=   # SMTP path
MAIL_DRAIN_SECRET=                  # shared secret for /api/email/drain
```

---

## 6. Helm / AI

Two interchangeable backends behind one contract (`lib/helm/backend.ts`):

```bash
HELM_BACKEND=                       # auto (default) | vm | local
HELM_API_URL=                       # VM base URL (Cloudflare Tunnel origin)
HELM_INTERNAL_TOKEN=                # shared secret for the VM
HELM_ACCESS_CLIENT_ID=              # Cloudflare Access service token
HELM_ACCESS_CLIENT_SECRET=
# "local" backend provider burst order + keys (failover on error)
HELM_BURST_ORDER=cerebras,groq,sambanova
HELM_CEREBRAS_API_KEY=
HELM_GROQ_API_KEY=
HELM_SAMBANOVA_API_KEY=
# optional per-provider overrides:
# HELM_CEREBRAS_BASE_URL= / HELM_CEREBRAS_MODEL=   (and _GROQ_, _SAMBANOVA_)
```

Unset Helm env ⇒ **feature unavailable, not an error**. Keep it that way.

---

## 7. Misc / operational

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push (`lib/push.ts`). |
| `ALLOWED_ORIGINS` | CORS allowlist (per README; required in prod). |
| `RESET_PASSWORD`, `IMPORT_STAGE_SCHEMA`, `IMPORT_TEMP_PASSWORD` | legacy/import scripts only. |
| `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | read if deployed to Vercel; harmless on self-host. |
| `NODE_MAX_OLD_SPACE_SIZE` | Docker build/runtime memory. |
| `LEGACY_MSSQL_*` | migration scripts only — **never** add to production. |

---

## 8. Production checklist (VPS / Dokploy)

```bash
# Storage
STORAGE_BACKEND=
R2_ACCOUNT_ID=minio
R2_ENDPOINT=https://media.nomarcprojects.com
R2_PUBLIC_DOMAIN=https://media.nomarcprojects.com/nomarcdb
NEXT_PUBLIC_R2_PUBLIC_DOMAIN=https://media.nomarcprojects.com/nomarcdb
R2_BUCKET_NAME=nomarcdb
R2_PRIVATE_BUCKET=nomarcdb-private
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Origins (fix T-003)
AUTH_URL=https://nomarcprojects.com
BETTER_AUTH_URL=https://nomarcprojects.com
NEXT_PUBLIC_SITE_URL=https://nomarcprojects.com
NEXT_PUBLIC_APP_URL=https://nomarcprojects.com

# Money
ALLOW_DEMO_PAYMENTS=false
PAYMENT_PROVIDER=            # only after the provider's keys are real
```

**Changing env on the VPS:** edit it in the **Dokploy dashboard** (stored
encrypted in Postgres), then redeploy. `docker service update --env-add` works
for an immediate test but is **reverted on the next deploy** (T-006).
