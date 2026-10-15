# design_style.md — visual language & component conventions

The reference for making a new UI look like it belongs. Source of truth for
tokens: `app/globals.css`. Source of truth for primitives: `components/ui/`.

---

## 1. Brand

| Token | Value | Use |
| --- | --- | --- |
| `--brand-yellow` | `#ffd716` | The accent. Primary CTAs, focus rings, highlight marks. |
| `--brand-black` | `#1e1e1e` | Ink — text on yellow, dark surfaces. |
| `--brand-grey` | `#898989` | Secondary/meta text (`muted-foreground`). |
| `--brand-white` | `#ffffff` | Inverse text. |

Yellow is the *only* accent. Hover state for yellow buttons is `#e6c114`.
Never introduce a second brand hue without recording it in `Memory.md`.

---

## 2. Design tokens (Tailwind v4, `@theme inline`)

Tailwind v4 with **no `tailwind.config.js`** — everything lives in
`app/globals.css`.

```css
--background/#ffffff     --foreground/#1e1e1e     --card/#ffffff
--secondary/#f5f5f5       --muted/#f5f5f5           --muted-foreground/#898989
--primary/#ffd716         --accent/#ffd716          --primary-foreground/#1e1e1e
--border/#e5e5e5          --input/#e5e5e5           --ring/#ffd716
--destructive/#ef4444     --radius/0.5rem           --dark-surface/#1e1e1e
```

Dark (`.dark`) overrides: background `#1e1e1e`, card/secondary `#2a2a2a`,
border/input `#333333`, foreground `#ffffff`, muted-foreground stays `#898989`,
**primary/accent stay `#ffd716`**, destructive unchanged.

Derived radii: `--radius-sm/md/lg/xl` = radius −2 / radius / +2 / +6.

**Always use the semantic classes:**

```
bg-background   text-foreground   bg-card   text-muted-foreground
border-border   bg-muted          text-primary   text-destructive
```

Hard-coding `text-gray-500` / `border-gray-200` / `bg-red-500` breaks dark mode.
Hard-coded brand hex (`#ffd716`, `#1e1e1e`) is acceptable where a token doesn't
express the intent (e.g. on-yellow text).

---

## 3. Typography

- **Headings** (`h1`–`h6`, global rule): `Outfit`, then `Inter`.
- **Body / everything else**: `Montserrat`, then `Inter`.
- Weights: headings 700 (`font-bold`), nav/labels 600 (`font-semibold`),
  button labels 700 (see `buttonVariants`).
- Long-form prose (news articles) uses `.news-prose` — reuse it rather than
  restyling article HTML; it already handles light/dark.

Never swap fonts locally; add to the `@theme`/`@layer base` font stacks if a
real need appears.

---

## 4. Primitives (`components/ui/`)

`cn()` from `lib/utils.ts` (clsx + tailwind-merge) for all conditional
classes. CVA for variants. Radix for accessible behaviour.

Key primitives and their intent:

| File | Intent |
| --- | --- |
| `button.tsx` | Variants `primary \| light \| outline-light \| outline-dark`, sizes `sm \| md`; `rounded-[6px]`, `font-bold`. Uses an `arrow-label` whose icon slides L→R on hover. |
| `arrow-label.tsx` | The signature micro-interaction (icon slide). Use it for CTAs instead of inventing an arrow. |
| `skeleton.tsx` + `.skeleton` | Shimmer loading state. Every data page has a co-located skeleton. |
| `modal.tsx`, `select-menu.tsx`, `searchable-select.tsx`, `multi-select.tsx` | Form surfaces. |
| `file-upload.tsx`, `phone-input.tsx`, `date-picker.tsx`, `address-autocomplete.tsx` | Specialised inputs. |
| `reveal.tsx`, `scroll-reveal.tsx`, `staggered-menu.tsx` | Motion wrappers. |
| `page-preloader.tsx`, `preloader-overlay.tsx`, `route-progress.tsx` | Navigation transitions. |
| `news-ticker.tsx`, `marquee-speed.tsx`, `number-ticker.tsx`, `circular-text.tsx` | Marquee/ticker family. |
| `theme-toggle.tsx` | Dark mode switch. |

Rules:
- If something could be a `components/ui/` primitive and is used twice → make
  it one.
- Compose with Radix (`asChild`) rather than re-implementing focus/keyboard
  behaviour.
- Never strip `:focus-visible` outlines; the global `outline-ring/50` on
  `*:focus-visible` is deliberate.

---

## 5. Dark mode

- Variant is `@custom-variant dark (&:is(.dark *))` — i.e. **class-based**,
  toggled on `<html>` by `theme-toggle.tsx`.
- Every new surface, text colour, border and shadow ships a `dark:` counterpart.
  Using tokens means this is often free; literals mean you write them.
- Third-party widget overrides live in `globals.css` and must ship both
  light and dark rules (see `.pm-calendar`, `.pm-gantt`, `.news-prose`,
  `.skeleton`).

---

## 6. Motion

Stack: CSS transitions/keyframes first, Framer Motion for React-driven
choreography, GSAP for scroll timelines, OGL for WebGL effects.

Conventions:
- Named keyframes use the `nm-` prefix (`nm-pop`, `nm-shimmer`,
  `nm-pulse-ring`).
- Put motion on the compositor — `transform`/`opacity`, `will-change:
  transform`, `translateZ(0)` — never animate layout properties on the main
  thread with `requestAnimationFrame`.
- **Everything must respect `prefers-reduced-motion: reduce`.** The global
  rule neuters durations, but per-animation kills are still written where an
  effect is heavy (`.nm-attention { animation: none; }`).
- Marquees: CSS transform + `will-change`; do not drive them from JS.
- Custom cursor (`body.smooth-cursor`) is pointer-fine only and must not hide
  the caret in inputs/textareas/contenteditable.

---

## 7. Mobile / platform

- **iOS 16px rule:** `input, textarea, select { font-size: 16px !important }`
  under 768px. Never fight it.
- Smooth scroll only under `@media (hover: hover) and (pointer: fine)` — touch
  keeps native scrolling (it fights momentum otherwise).
- `body { overscroll-behavior-y: none }` prevents scroll-chaining jitter.
- Bottom-offset aware layout via `--nm-bottom-bar` (bottom nav safe area).
- Scrollable chip/tab rows use `.no-scrollbar`.

---

## 8. Loading, empty & error states

- **Loading** → skeleton mirroring the real layout (`loading.tsx` imports the
  page's `XxxSkeleton`). Never a bare spinner where the layout is known.
- **Empty** → illustration/heading/CTA, not `[]`, not an infinite spinner.
- **Error** → readable message + retry; never a raw stack or a `500` page for
  an expected failure (e.g. storage unconfigured ⇒ disabled state).

---

## 9. Do / Don't

| Do | Don't |
| --- | --- |
| `text-muted-foreground` for meta text | `text-gray-500` |
| `border-border` | `border-gray-200` |
| Token or brand hex for accent | A new hue |
| `dark:` on every new surface | Light-only components |
| Reuse `arrow-label` / `reveal` / `skeleton` | Re-implementing them |
| `@media (prefers-reduced-motion)` guard | Unconditional heavy animation |
| 16px inputs on mobile | Small input text |
| `cn()` for class merging | String concatenation |
