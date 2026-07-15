# Design System

## Purpose & Scope

This is the visual language for Get Me a Job: tokens, type, spacing, motion, and component
patterns for anyone (human or agent) building UI in this repo. It exists so every new screen
reuses the same primitives instead of inventing new ones. Scope is visual/interaction design only
— domain vocabulary and architecture decisions belong in `CONTEXT.md` / `docs/adr/` (see
`docs/agents/domain.md`), not here.

**Direction:** inspired by Cursor's IDE aesthetic — calm, monochrome-first, a single restrained
accent, dense-but-quiet, depth from borders rather than heavy shadows. This is a reinterpretation
of that aesthetic's values (Cursor doesn't publish its internal tokens), built on this app's actual
stack: Tailwind CSS 4, HeroUI v3, next-themes.

**Why this direction fits, not just resembles:** the person using this dashboard is a developer
grading their own job search the same way they'd read a linter or test-runner's output — signal
over noise, precision over cheerleading. An IDE-like, monochrome, single-accent surface is the
right register for that task, not a borrowed skin.

**Signature idea:** the match score reads like a diagnostic, not a mood. No traffic-light
red/amber/green, no confetti. One accent, used only when a score earns it (≥ 85). See
[Match Score Chip](#match-score-chip-signature).

---

## Design Philosophy

1. **One accent, used with intention.** `--accent` is the only saturated color in the system.
   Gray builds structure; color communicates state. If a second accent shows up, that's a bug in
   the design, not a feature.
2. **Borders over shadows.** This is a dense tool, not a marketing page. Depth comes from a
   border/surface progression (see [Elevation](#elevation)); shadows are a whisper, not a prop.
   Dark mode drops shadows almost entirely and leans on borders — HeroUI's own dark tokens already
   do this (see [Known Implementation Gaps](#known-implementation-gaps)).
3. **Whisper-quiet layering.** Elevation steps (background → surface → overlay) should be
   invisible in isolation and obvious once stacked. If you can name the exact hex jump at a
   glance, the step is too loud.
4. **Text hierarchy, not text/gray-text.** Four levels — primary, secondary, tertiary, disabled —
   used consistently. Two levels is a flat hierarchy pretending to be a system.
5. **Motion is rare, so it means something.** Nothing pulses or spins by default. The one
   exception (Match Score Chip, ≥ 85) is a hard requirement (FR-3.4), not a style flourish — and
   it stays the *only* animated chip in the system for that reason.

---

## Foundations

### Color

All color tokens are inherited from HeroUI v3's default theme (`@heroui/styles`, oklch color
space) via `[data-theme]`. Do not hardcode hex/rgb in components — reference these CSS variables
(directly or through the Tailwind utilities registered in `@theme inline`).

| Token | Role | Light | Dark |
|---|---|---|---|
| `--background` | Page canvas | `oklch(0.9702 0 0)` | `oklch(12% 0.005 285.823)` |
| `--foreground` | Primary text | `var(--eclipse)` (`oklch(0.2103 0.0059 285.89)`) | `var(--snow)` (`oklch(0.9911 0 0)`) |
| `--surface` | Cards, accordions, non-overlay containers | `var(--white)` | `oklch(0.2103 0.0059 285.89)` |
| `--surface-secondary` | Nested/hover surface, one step up | `oklch(0.9524 0.0013 286.37)` | `oklch(0.257 0.0037 286.14)` |
| `--surface-tertiary` | Second nested step | `oklch(0.9373 0.0013 286.37)` | `oklch(0.2721 0.0024 247.91)` |
| `--overlay` | Modals, popovers, tooltips, menus | `var(--white)` | `oklch(0.2103 0.0059 285.89)` |
| `--muted` | Secondary/tertiary text, placeholders | `oklch(0.5517 0.0138 285.94)` | `oklch(70.5% 0.015 286.067)` |
| `--default` | Neutral chip/button surface | `oklch(94% 0.001 286.375)` | `oklch(27.4% 0.006 286.033)` |
| `--accent` | The one brand color — primary actions, focus, ≥85 score | `oklch(0.6204 0.195 253.83)` | same |
| `--success` / `--warning` / `--danger` | Semantic status only | see `get_theme.mjs` | `warning`/`danger` shift slightly darker; `success` unchanged |
| `--border` / `--separator` | Component boundary / internal divider | `oklch(90% 0.004 286.32)` / `oklch(92% 0.004 286.32)` | `oklch(28% 0.006 286.033)` / `oklch(25% 0.006 286.033)` |
| `--focus` | Focus ring | `= var(--accent)` | same |

`--border-secondary`, `--border-tertiary`, `--separator-secondary`, `--separator-tertiary`,
`--accent-soft`, `--*-hover` are **calculated** (`color-mix` against `--surface`/`--surface-foreground`)
— they auto-adjust per theme. Never hand-author a dark-mode override for these; they already
derive correctly. Full list: run `node .claude/skills/heroui-react/scripts/get_theme.mjs`.

**Text hierarchy** (Design Philosophy #4):

| Level | Token | Use |
|---|---|---|
| Primary | `--foreground` | Headings, body copy, primary values |
| Secondary | `--muted` | Supporting text, metadata labels |
| Tertiary | `color-mix(in oklab, var(--muted) 65%, transparent)` | De-emphasized data (e.g. low-match scores) |
| Disabled/placeholder | `--muted` at `--disabled-opacity` (`0.5`, already a HeroUI token) | Disabled controls, empty inputs |

**Match score tiers** (not in the PRD — a proposal, adjust freely; reuses existing tokens only,
introduces zero new colors):

| Score | Token pairing | Motion |
|---|---|---|
| ≥ 85 (excellent) | `--accent` / `--accent-soft` / `--accent-soft-foreground` | Pulse + spinning icon (FR-3.4, required) |
| 65–84 (worth reviewing) | `--default` / `--default-foreground` | None |
| < 65 (low match) | `--muted` on `--surface`, no fill | None |

**One deliberate override:** HeroUI's default `--link` equals `var(--foreground)` (links look like
body text). Since every job card links out to `linkedinUrl`, set `--link: var(--accent)` so
outbound links read as actionable. This is the only token override this system recommends beyond
what HeroUI ships.

### Typography

Fonts: **IBM Plex Sans** (UI) and **IBM Plex Mono** (data/code) via `next/font/google` in
`layout.tsx`, exposed as `--font-sans` / `--font-mono`. Chosen over Geist — the default on
effectively every Vercel-adjacent starter, which is exactly the template-y look this system is
trying not to have. IBM Plex was designed as one coherent type system across IBM's whole product
line; that's the same relationship this app's sans and mono should have to each other. Base size
is 14px — dense, IDE-like, not a marketing page.

| Level | Size / Line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| Display | 28px / 1.2 | 600 | -0.02em | App title (rare — one per screen at most) |
| Title | 20px / 1.3 | 600 | -0.01em | Section headers |
| Heading | 16px / 1.4 | 600 | normal | Card titles (job title) |
| Body | 14px / 1.5 | 400 | normal | Descriptions, chat messages |
| Label | 13px / 1.4 | 500 | 0.01em | Chip text, form labels, metadata keys |
| Caption | 12px / 1.4 | 400 | normal | Timestamps, footnotes |
| Data (mono) | 13px / 1.4, `font-variant-numeric: tabular-nums` | 500 | normal | Scores, salary, `jobId` |

Rule: never rely on size alone to signal hierarchy — pair size with weight and, for
headings/labels, tracking.

### Spacing

Base unit is 4px — this matches HeroUI's own `--spacing: 0.25rem` and Tailwind v4's default scale,
so no override is needed. Use Tailwind's spacing utilities directly (`p-1`…`p-16`); apply by
context, not by feel:

| Context | Scale |
|---|---|
| Micro (icon-to-label gap) | 4–8px |
| Component (button/chip internal padding) | 8–12px |
| Card (internal card padding) | 16–24px |
| Section (between cards/groups) | 24–32px |
| Page (major regions) | 48–64px |

Padding stays symmetrical unless content forces asymmetry.

### Radius

HeroUI's defaults, used as-is:

| Token | Value | Use |
|---|---|---|
| `--radius` (sm variant: `calc(var(--radius) * 0.75)`) | 6px | Small chips/badges |
| `--radius` | 8px | Cards, buttons — default |
| `--field-radius` (`calc(var(--radius) * 1.5)`) | 12px | Inputs, form fields |
| `calc(var(--radius) * 2)` | 16px | Modals, drawers (copilot panel) |

Don't mix sharp and soft radii on the same surface.

### Borders & Separators

HeroUI already ships a real progression (`color-mix` of `--surface` against
`--surface-foreground`) — use it instead of inventing opacities:

| Token | Intensity | Use |
|---|---|---|
| `--separator` | Lightest | Divider inside a list/table between same-weight rows |
| `--border` | Standard | Card/component outline |
| `--border-secondary` | Stronger | Emphasis (active tab underline, selected row) |
| `--border-tertiary` | Strongest | Rare — max-emphasis boundary |
| `--focus` (`= --accent`) | N/A | Focus ring only |

Squint test: blur your eyes at the screen. You should still read hierarchy; nothing should jump
out as a hard line.

### Elevation

Borders-first strategy (Design Philosophy #2). Four real levels, lowest to highest:

`--background` (page) → `--surface` (cards) → `--surface-secondary` / `--surface-tertiary`
(nested/hover state within a card) → `--overlay` (modals, popovers, tooltips, the copilot drawer).

Shadows are HeroUI tokens, already tuned per mode — don't hand-write shadow values:

- Light: `--surface-shadow` (subtle, ~2–4px blur) + a `--border`.
- Dark: `--surface-shadow` collapses to `0 0 0 0 transparent inset` — border does all the work.
- Overlays always get `--overlay-shadow` (stronger, for both modes) since they float above content.

### Motion

| Interaction | Duration | Easing |
|---|---|---|
| Hover/press micro-interactions | 120–160ms | ease-out |
| Panel/drawer/modal transitions | 200–240ms | ease-out (deceleration) |
| Match Score Chip pulse + icon spin (≥ 85, FR-3.4) | ~2s loop | linear (spin), ease-in-out (pulse) |

No spring/bounce anywhere. Keep the FR-3.4 loop slow enough to read as ambient status, not as an
alert.

### Iconography

`lucide-react` (already installed), one set, stroke width 1.75–2, `currentColor` only — the icon
inherits whatever text token it sits next to. Sizes: 14px inline with caption/label text, 16px
inline with body text, 20px standalone (nav, buttons). If removing the icon loses no meaning,
remove it.

---

## Components

Compose from HeroUI v3's compound components (`Card.Header`, `Chip`, etc. — no
`HeroUIProvider`, no flat props). Fetch exact anatomy from the `heroui-react` skill before
implementing; this section covers this app's usage decisions, not HeroUI's API.

### Job Card

Maps to `JobOffer` (PRD §4). Anatomy, top to bottom:

- **Header:** `title` (Heading level) + `format` (Remote/Hybrid/On-site) as a `Chip` (`default`
  variant — it's metadata, not status).
- **Score:** Match Score Chip, top-right (see below).
- **Body:** `description` (Body level, clamped), `requirements` as a `TagGroup` of chips, `salary`
  — if `null`, render `"Not disclosed"` in tertiary text, never hide the row (data states matter).
- **Footer:** relative timestamp (`date-fns`, `es` locale, e.g. "hace 2 horas") in Caption/muted,
  outbound `linkedinUrl` link (`--link` = `--accent`, per the override above), Chat button.
- **Surface:** `--surface` + `--border`, `--radius` (8px), card padding 16–24px.

### Match Score Chip (signature)

The one place motion and saturated color are allowed to coexist — reserve both for this
component, per Design Philosophy #5.

- **≥ 85:** `Chip` on `--accent-soft`/`--accent-soft-foreground`, containing the score in Data/mono
  style + a small spinning icon, plus a pulsing ring/shadow on the chip itself (FR-3.4 — both the
  pulse *and* the icon spin are required, not either/or).
- **65–84:** `Chip` on `--default`/`--default-foreground`, mono score, static.
- **< 65:** plain mono text in `--muted`, no chip fill — de-emphasized, still visible.

```tsx
// Illustrative anatomy — not a full implementation
<Chip className={tier === "excellent" ? "animate-pulse bg-accent-soft text-accent-soft-foreground" : "bg-default text-default-foreground"}>
  {tier === "excellent" && <SpinningIcon className="size-3.5 text-accent animate-spin [animation-duration:2s]" />}
  <span className="font-mono tabular-nums">{score}</span>
</Chip>
```

### Skeleton Loading

HeroUI `Skeleton` (FR-3.3) matching the exact Job Card structure (same padding, same radius, same
slot sizes) so nothing shifts on load — a skeleton that doesn't match its loaded shape is worse
than a spinner.

### Copilot Chat Panel

FR-4.1's "side sheet" maps to HeroUI's `Drawer` — right edge, desktop, `--overlay` +
`--overlay-shadow`, `calc(var(--radius) * 2)` radius on the leading edge. Streamed tokens (`useChat`)
render in Body style; user messages align opposite the assistant for quick scanning. Context is
locked to one job + the CV — no cross-job affordances in this panel (no "switch job" control).

### Toast (sileo)

FR-3.6: grouped/morphing toast for repeated actions (e.g. manual refresh). Position + surface
should follow `--overlay`/`--overlay-shadow` like any other floating element. Sileo's own API
isn't covered here — verify against its actual docs when wiring, don't assume prop names from this
doc.

### General HeroUI Usage

Semantic variants only (`primary`/`secondary`/`tertiary`/`danger`/`ghost`/`outline`) — never a raw
color prop. One `primary` action per screen/context. `onPress`, not `onClick`.

---

## States

Every interactive element: default, hover, active, focus, disabled. Every data view: loading
(Skeleton), empty (explicit copy, not a blank card), error (readable message, not a raw stack
trace). Missing states read as broken, not as "not built yet."

---

## Accessibility

- **Contrast:** WCAG AA minimum (4.5:1 body text). Quick heuristic sanity check (not a substitute
  for a real contrast tool) using the oklch lightness-gap rule: light bg `--background`
  (L 0.97) vs `--foreground` (L 0.21) — gap comfortably clears "fg L < 0.45 when bg L > 0.85."
  Dark bg (L 0.12) vs `--foreground` (L 0.99) clears "fg L > 0.75 when bg L < 0.25" the same way.
  **Spot-check before shipping**, don't assume from this table: `--muted` (L 0.55) on `--surface`
  (white, L 1.0) is closer to the line — that pairing is reserved for secondary/tertiary text
  only, never primary body copy.
- **Focus:** every focusable element gets `--focus` (`= --accent`) as a visible ring —
  `--ring-offset-width` (2px) is already a HeroUI token, reuse it.
- **Motion:** the FR-3.4 pulse/spin has no `prefers-reduced-motion` fallback yet — add one
  (freeze to the static "excellent" chip state) when Epic 3 is implemented.
- **Disabled state:** use `--disabled-opacity` (0.5), not a hand-picked value.

---

## Responsive

Desktop-first — this is a personal dashboard, not a marketing site, and the PRD has no mobile
requirement. Optimize the card grid for ≥768px (Tailwind `md:`); below that, collapse to a single
column rather than redesigning the card.

---

## Voice & Content

UI copy is Spanish (`es` locale for `date-fns`, per FR-3.5 — e.g. "Encontrado hace 2 horas"). Tone
matches Design Philosophy #5: analytical, not motivational. Describe the match, don't cheerlead it
— "gap en experiencia con GraphQL" reads better than "¡Casi perfecto!".

---

## Known Implementation Gaps

Two verified issues found while writing this doc — flagging rather than silently fixing, since
both touch shipped wiring:

**1. HeroUI's own dark tokens never activate.** `providers.tsx` sets
`<ThemeProvider attribute="class" ...>`, but HeroUI's component CSS keys dark mode off
`[data-theme='dark']`, not `.dark` (confirmed in `@heroui/styles` and the `heroui-react` skill).
`next-themes` (`^0.4.6`, confirmed in `node_modules/next-themes/dist/index.d.ts`) accepts an array
here:

```diff
- <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
+ <ThemeProvider attribute={["class", "data-theme"]} defaultTheme="system" enableSystem>
```

Without this, every HeroUI component (Card, Chip, Button, the copilot Drawer, …) stays on the
light token set regardless of resolved theme.

**2. `globals.css` shadows HeroUI's real background/foreground.** The current `:root` block
hardcodes `#ffffff`/`#171717` (create-next-app boilerplate) and only flips via
`prefers-color-scheme`, which ignores both `next-themes` and the `.dark` class the app already
defines a Tailwind variant for. This silently overrides HeroUI's actual oklch tokens for exactly
the two values (`--background`/`--foreground`) this doc documents above. Recommended fix — delete
the boilerplate block and let HeroUI's own tokens drive `@theme inline`, optionally extending it to
expose more semantic colors as Tailwind utilities:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-foreground: var(--surface-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-muted: var(--muted);
  --font-sans: var(--font-ibm-plex-sans);
  --font-mono: var(--font-ibm-plex-mono);
}
```

Neither fix is applied by this change — say the word and I'll make them in a follow-up.

---

## Do / Don't

| Do | Don't |
|---|---|
| Reference HeroUI CSS variables | Hardcode hex/rgb in a component |
| One accent, used for state/action | A second saturated color "just for variety" |
| Border-first depth, shadow as whisper | Dramatic drop shadows |
| Four-level text hierarchy | Two levels ("text" and "gray text") |
| Reserve motion for the ≥85 score chip | Ambient animation elsewhere |
| Semantic HeroUI variants (`primary`, `danger`, …) | Raw color props on components |
