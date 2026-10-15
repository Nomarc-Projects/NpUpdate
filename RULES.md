# RULES.md — quality guardrails & coding standards

The bar every change must clear. `.cursorrules` states the hard constraints;
this file states what "good" looks like here.

---

## 1. Before you touch anything

1. Read the nearest existing implementation of the same kind of thing and copy
   its shape. There is almost always one.
2. Search before writing — `grep` for the concept, don't reinvent it.
3. Check whether the repo already has a library for that need before adding one.

---

## 2. Project structure rules

| Rule | Where |
| --- | --- |
| All data access goes through server actions | `lib/services/*` |
| Components **never** import `db` / Drizzle | — |
| Shared UI used twice or more | `components/ui/` |
| Non-UI logic | `lib/*` (never in components) |
| Server-only code (storage, Helm, mail) | add `import "server-only"` at the top |
| Ambient types / shims | `types/` |
| Reference data | `lib/constants/` |
| Route handlers only when server actions can't | `app/api/*` |

---

## 3. Server components & data flow

- Server Components by default. Add `"use client"` **only** when the file needs
  state, effects, browser APIs or event handlers.
- First paint must not depend on client-side fetching. TanStack Query is for
  **incremental updates inside client components only**.
- Every data-reading page needs a co-located `XxxSkeleton` export;
  `loading.tsx` imports it. Loading states must mirror the real layout.
- Prefer `await`-ing a service in the page over wiring a query hook.

---

## 4. `"use server"` module rules

- Export **async functions only**. No `const`, no type-only re-exports, no
  non-async helpers. Violating this silently drops *every* export in the file
  while still type-checking.
- Validate input (zod) before touching the DB.
- Mutations end with `revalidatePath` / `revalidateTag` for the route they
  affect.
- Return JSON-serialisable data only.
- Handle failure as data where the surrounding code does (`try/catch` → empty
  result), so an unmigrated table doesn't take the page down.

---

## 5. Server ↔ client boundary

- **Never pass a component reference as a prop** across the boundary. Pass a
  serialisable `name` and resolve it to a component on the client.
- Props must be serialisable: no functions, no class instances, no Maps/Sets,
  no Drizzle objects.
- Beware static vs dynamic rendering: reading `cookies()`/`headers()` makes a
  page dynamic. Getting it wrong surfaces as a build error or a stale page —
  never as a type error.

---

## 6. Styling rules (Tailwind v4)

- No `tailwind.config.js` — theme lives in `app/globals.css` via `@theme`.
- Use semantic tokens: `bg-background`, `text-foreground`, `text-primary`,
  `border-border`, `bg-muted`, `text-muted-foreground`, `bg-card`, `text-destructive`.
- Brand literals only when a token doesn't cover it:
  `#ffd716` (yellow), `#1e1e1e` (ink), `#898989` (grey), `#111` / `#1e1e1e`
  (dark surfaces).
- **Every surface ships `dark:` variants.** Use the tokens and dark mode comes
  for free; hard-coded colours do not.
- New CSS belongs in `app/globals.css` only for reusable primitives or
  third-party overrides (see how `react-big-calendar` / `frappe-gantt` are
  scoped under `.pm-calendar` / `.pm-gantt`). Feature-specific one-offs stay in
  the component.
- Keep animations behind `@media (prefers-reduced-motion: reduce)`.

---

## 7. Forms & validation

- `react-hook-form` + `zod` + `@hookform/resolvers`.
- Server actions re-validate; the client check is UX, not security.
- Inputs ≥16px on mobile (iOS zoom guard, already enforced globally).
- Surface validation errors inline; never swallow them.

---

## 8. Security guardrails

- **Never** commit secrets. Only `.env.example` / `.env.vps` are tracked, and
  both are templates — put no real value in either. Read `git check-ignore -v
  <file>` before assuming an env file is ignored (see `ENV.md` §0).
- Never read a secret into a `NEXT_PUBLIC_*` variable.
- Payment webhooks: verify the signature first; return `401` on mismatch, and
  confirm your webhook URL returns 401 not 404 before pointing a provider at it.
- Private bucket objects: no public URL, ever. Ownership check before minting a
  presigned GET.
- Sanitise rendered HTML (`sanitize-html`) and never `dangerouslySetInnerHTML`
  with raw user input.
- Rate limit unauthenticated endpoints that call an external provider
  (`/api/guide` is the reference implementation).

---

## 9. Performance guardrails

- Images: `<img>` for local brand SVG assets (avoid Next `Image` processing
  overhead on them), `next/image` for user media when a real host is configured.
- Marquees/animations: CSS on the compositor (`will-change: transform`,
  `translateZ(0)`) rather than `requestAnimationFrame` on the main thread.
- Keep server work small: one focused service call per data need, not N+1 in a
  component.
- Respect `prefers-reduced-motion`; heavy effects must degrade.

---

## 10. Accessibility guardrails

- Interactive elements keep `:focus-visible` rings (global rule tints them
  brand-yellow — don't remove outlines to "clean up" focus styles).
- `cursor: pointer` on buttons/links/selects is set globally; don't re-add per
  component.
- Keyboard reachability for menus/modals; semantic headings; alt text on
  meaningful images, empty `alt` on decorative ones.
- Reduced motion must be honoured (global + per-animation).

---

## 11. Database & migrations

- Change `lib/db/schema.ts` **and** add `drizzle/NNNN_description.sql` in the
  same change, numbered in order.
- `drizzle-kit generate` to write SQL. **Never `drizzle-kit push`.**
- Apply one file at a time via `scripts/apply-migration.cjs`, in order.
- Foreign keys to Better Auth tables (`user`/`session`/`account`) are written
  in migration SQL — the schema file only references `userId TEXT`.
- Index columns you filter or join on. State the intent in a SQL comment when
  it's not obvious.

---

## 12. The verification bar

```bash
npm run type-check   # tsc --noEmit — necessary, NOT sufficient
npm run build        # the real gate
```

Both must pass. `npm run lint` is currently broken (no ESLint config, debt
T-001) — do not treat its failure as your change's fault, and do not add config
silently without saying so.

Known failure classes that pass `tsc` but fail `build`:
1. `"use server"` exporting a non-function.
2. Component reference across the server/client boundary.
3. Static-vs-dynamic rendering mistake.

---

## 13. Commit & change hygiene

- Stage only intended files; never stage `.env`, scratch files, or generated
  output.
- Commit messages are short and imperative (`feat: …`, `fix: …`, `docs: …`).
- A change to behaviour should update `logupdate.md`; a change to a lasting
  decision or debt item should update `Memory.md`.
- Documentation that describes structure must be updated in the same change
  (`ARCHITECTURE.md`, `API.md`, `ENV.md` as applicable).
