# TESTING.md — verification gates & test strategy

## 0. Current state (read this first)

| Fact | Detail |
| --- | --- |
| Test framework | **None installed.** No Jest/Vitest/Playwright, no `*.test.*`, no `test` script. |
| Lint | **Broken.** `npm run lint` runs `eslint` with **no ESLint config** → "Oops! Something went wrong!". Debt T-001. |
| Type check | `npm run type-check` → `tsc --noEmit`. Works. |
| Build | `npm run build`. The only end-to-end gate. |
| CI | `.github/workflows/ci.yml` runs type-check + build. |

**The effective gate today is: `npm run type-check` && `npm run build`.**
Both must pass. Passing `tsc` alone is *not* sufficient — see §2.

> Nothing here says "add a test framework". That is an intentional decision
> worth making deliberately (it costs install time, config, and CI minutes),
> not a gap to fill reflexively. If you add one, record it in `Memory.md` and
> write it into this file's §5.

---

## 1. The mandatory gate

```bash
npm run type-check
npm run build
```

Run both, in this order, before claiming anything is done. A change that builds
but doesn't type-check (or vice versa) is not done.

```bash
npm run lint        # currently fails for reasons unrelated to your change
npm run dev         # manual smoke test on :3000
```

---

## 2. Why `tsc` passing is necessary but not sufficient

Three failure classes compile clean and break at runtime or build time:

| # | Failure | Symptom | Guard |
| --- | --- | --- | --- |
| 1 | A `"use server"` module exporting a `const`, type, or non-async function | **Every** export in the file silently vanishes; imports become `undefined` at runtime | `.cursorrules` #2, `RULES.md` §4 |
| 2 | A component reference crossing the server→client boundary (as a prop) | `tsc` fine, build/prerender throws or serialisation fails | `.cursorrules` #6, `RULES.md` §5 |
| 3 | Static vs dynamic rendering mistake (reading `cookies()`/`headers()` where the route prerendered) | Build error or a stale cached page | `RULES.md` §5 |

**Review for these three explicitly** — no type-checker will catch them for
you. If you touched a `"use server"` file, read every export line.

---

## 3. Build output interpretation

`npm run build` prints the route table. Useful signals:

- **`○` / `●` prerendered routes** — a page that should be live may be frozen
  if it got prerendered. If a page reads `cookies()`, expect it to be dynamic;
  a surprise `○` on a page that should be per-user is a real bug.
- A `⨯` in the route table = a route failed to compile/export. Treat any `⨯`
  as a build failure even if the command exits 0.
- Long builds / OOM during build → memory ceiling (see `NODE_MAX_OLD_SPACE_SIZE`).

---

## 4. Manual smoke checklist

Run after any change touching data flow, auth, uploads or payments. The DB in
dev points at **production**, so exercise these carefully.

**Route / render**
- [ ] The changed page loads with a skeleton first, then real content.
- [ ] No console errors; no `undefined`/`[object Object]` in the UI.
- [ ] Dark mode: check the changed surface (`dark:` variants present).
- [ ] Mobile width: no horizontal overflow; inputs ≥16px (no iOS zoom).

**Data**
- [ ] Create → read → update → delete round trip through the service layer.
- [ ] Empty state renders (not a spinner forever, not a crash) when the table
      has no rows — including when an unmigrated table returns `[]`.
- [ ] `revalidatePath` took effect (hard refresh shows fresh data).

**Auth / permissions**
- [ ] Signed-out access to the protected route is redirected.
- [ ] Plan/role gating: try a lower-tier path and confirm the upgrade hint,
      not a 500.

**Uploads** (highest regression risk)
- [ ] Upload succeeds end to end; the returned URL **fetches with 200 from
      outside the host** (the presigned PUT URL must be publicly reachable).
- [ ] Private doc: fetches for the owner, 403/404 for someone else.
- [ ] File > cap (25MB presign / 4MB fallback) is rejected with a readable error.

**Payments** (if touched)
- [ ] Webhook returns **401** for a bad signature — *never 404*. A 404 means
      settlement is silently lost.
- [ ] Good signature idempotently marks the order paid.

**Motion / a11y**
- [ ] `prefers-reduced-motion` respected for new animations.
- [ ] Keyboard can reach and operate the new control; `:focus-visible` intact.

---

## 5. If/when a test framework is added

Decide deliberately, then update this section. A reasonable order of attack:

1. **Vitest** (TS-native, fast, no Jest transform config) for
   `lib/**` pure logic — entitlements, pricing maths, storage config selection,
   zod schemas. These are the highest-value/lowest-cost targets.
2. **Playwright** for the handful of flows that carry money or private data:
   sign-in, exhibitor checkout, upload, webhook-reject (401).
3. Keep tests out of `npm run build`'s path — add a separate `test` script so
   CI stays `type-check + build + test`.

Rules for any test code: same `@/` alias, no network calls (mock `fetch`), no
real DB (the dev DB **is production** — see §6).

---

## 6. Data safety while testing

**`DATABASE_URL` in this repo points at production.** Therefore:

- Never hand-run destructive SQL (`DELETE`, `TRUNCATE`, `DROP`, bulk `UPDATE`).
- Never test payments against live keys; use demo mode
  (`PAYMENT_PROVIDER` unset / `ALLOW_DEMO_PAYMENTS` handling).
- Never upload test blobs to the live buckets without cleaning them up.
- Prefer exercising the read path, or writing to a row you created and can
  identify (`INSERT` … `ON CONFLICT DO NOTHING` style, or a clearly-labeled
  fixture).

---

## 7. Verifying a deployment

On the VPS (scripts in `/tmp/opencode/`, see `Memory.md` for access):

1. Confirm the service env is what you expect:
   `docker service inspect <name> --format '{{range .Spec.TaskTemplate.ContainerEnv}}{{println .}}{{end}}' | grep KEY`
2. Exercise the real endpoint from **outside** the host (curl the public URL,
   not `localhost`) — this is what catches `R2_ENDPOINT` style mistakes.
3. Confirm the Dokploy DB value too, since `docker service update` edits are
   reverted on the next deploy (T-006).
4. Check the running container logs: `docker service logs <name> --tail 200`.
