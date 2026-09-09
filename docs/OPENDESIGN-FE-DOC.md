# SIDANG — Frontend Design Implementation Brief (OpenDesign, in-repo)

## Goal

You (OpenDesign) work **directly in this repository** and redesign + implement the remaining frontend pages of SIDANG — a multi-agent AI "stock courtroom" for IDX: user types a ticker → a trial runs live (5 analyst agents gather evidence → bear prosecutor vs bull defender debate 2 rounds → judge delivers a verdict) → an Indonesian-language research memo is archived in a journal with post-mortem price tracking.

**Already done (do not redo):**
- The whole app is implemented and working (React 18 + TS + Vite + react-router 7).
- **Full Tailwind CSS migration is complete** (v3.4.19) — zero custom page CSS; everything is utilities + a small component layer.
- **The Landing page `/` is fully redesigned** (per a previous OpenDesign pass) and implemented in `src/pages/HomePage.tsx`. Treat `HomePage.tsx` as the **style reference implementation** — match its level of polish, typographic confidence, and restraint.

**Your mission:** redesign the remaining 6 pages (Dashboard, Ticker Detail, Courtroom, Memo, Journal, Post-mortem) *in the same design language*, implementing them directly in code. The per-page content briefs live in `docs/design-prompts.md` (blok GLOBAL + one block per page). The product/design rationale is below.

## Core product principle: two layers — watch the trial, keep the report

1. **Layer 1 — WATCH (live, ephemeral):** the trial is a show. 5 analysts investigating in parallel, prosecutor vs defender arguing with evidence, judge deliberating. Transparency is the product's structural differentiator. Design like a broadcast: alternating speakers, round markers, "writing…" moments, verdict climax — not a log or progress bar. The 2–4 minute latency is content, not loading time.
2. **Layer 2 — KEEP (durable):** what remains is the **Memo** — a credible, self-contained research document. It must read like a legal document, not a chat transcript.

Consequences:
- **Courtroom (B) and Memo (C) are equal first-class screens** — B cinematic, C documentary — in one token system. These two are the hackathon-judged pages; prioritize them.
- The same evidence powers both layers: citation chips seen live resolve to the same facts in the memo's Key Facts table.
- The user must never be trapped watching: a persistent, unobtrusive escape ("Baca memorandum" banner when final) exists on Screen B.
- Journal/post-mortem = case archive, not activity feed.

## Tech stack & how to verify

- React 18 + TypeScript + Vite + react-router-dom 7, in `frontend/`.
- **Tailwind CSS v3.4.19** (postcss + autoprefixer wired). No other UI library. Icons are inline SVG in `src/components/icons.tsx` (stroke = currentColor) — extend it, don't add icon packages.
- Fonts already loaded in `index.html`: Fraunces (display), Inter (sans), JetBrains Mono (mono).
- Verify your work: `cd frontend && npm run typecheck && npm run build` — must pass clean.
- Dev server: `npm run dev` (port 5173). Backend API on port 8000 (orchestrator manages it). Old trials exist in the journal — use replayed routes like `/trial/:id` and `/memo/:id` for visual checks.
- **Do not run `git commit`.** The orchestrator commits.

## Where things live

```
frontend/
  tailwind.config.js        ← token→utility mapping (colors, fonts, radii, shadows, keyframes)
  src/
    styles/tokens.css       ← SOURCE OF TRUTH for all design tokens (CSS vars on :root)
    styles/tailwind.css     ← @layer base (global) + @layer components (shared primitives)
    styles/agents.css       ← [data-agent='id'] → --agent: R,G,B (per-analyst accent)
    main.tsx                ← import order: tokens → tailwind → agents
    types/contract.ts       ← SSE event & MemoJSON types (DO NOT EDIT)
    api/                    ← REST/SSE clients + mock data (DO NOT EDIT)
    hooks/useTrialStream.ts ← SSE→reducer wiring (DO NOT EDIT)
    state/trialReducer.ts   ← event→UI-state reducer (DO NOT EDIT)
    utils/md.tsx            ← markdown renderer (uses .md / .md-sm classes)
    components/             ← AppShell (topbar/nav/footer), icons, PriceChart
    pages/                  ← 8 pages, one file each
```

## Styling system (read before writing any className)

1. **`tokens.css` is the contract.** Never hardcode a color/spacing/font — use the mapped Tailwind utilities:
   - colors: `bg-0..4` (surfaces), `line-0..2` (hairlines), `brass-100..700`, `prosecute-*` (red), `defend-*` (green), `accent-blue-300/500/600`, `rich-a/b/c`, `cache-hit/miss`, `text-0..3`
   - fonts: `font-display` (Fraunces), `font-sans` (Inter), `font-mono` (JetBrains Mono)
   - radii `rounded-xs..pill`, shadows `shadow-1/2/3/brass`, `max-w-content`
2. **Shared primitives** live in `@layer components` (tailwind.css): `.btn .btn-primary .btn-ghost .btn-soft .btn-danger .btn-sm .btn-lg`, `.badge .badge-brass .badge-neutral .badge-prosecute .badge-defend .badge-cache-hit .badge-cache-miss`, `.card .card-pad .card-hover`, `.input`, `.skeleton`, `.status-dot(.working/.done/.error/.idle)`, `.anim-in .anim-in-slow .anim-fade .anim-scale`, `.reveal(.is-in)`, `.container`, `.muted .small .tiny .section-title .up .down`, `.md .md-sm`. Use them instead of re-deriving the same 6 utilities.
3. **Per-analyst theming:** an element with `data-agent='fundamental|price|smartmoney|insider|antigorengan'` exposes `--agent: R,G,B`. Consume with arbitrary values, e.g. `border-[color:rgba(var(--agent),0.5)]`, `bg-[rgba(var(--agent),0.12)]`. Note the `color:` type hint for text/border.
4. **Keyframes available:** `animate-spin -slow -dotty`, `dot-pulse`, `pulse-dot`, `skeleton-shimmer`, `fade-in(-up)(-slow)`, `scale-in`, `blink`, `livebar`, `strip-slide`, `acard-pulse`.
5. Arbitrary-value gotchas: `max-[1020px]:` / `min-[1100px]:` for custom breakpoints; `[&>td]:` element variants; `[animation-delay:150ms]`; `group-open:` for `<details>`.

## Non-negotiable rules

1. **Scope: `frontend/**` only.** Never touch `backend/**`, `docs/CONTRACT.md`, `src/api/`, `src/hooks/`, `src/state/trialReducer.ts`, `src/types/contract.ts`. Presentation layer only.
2. **All UI copy in Bahasa Indonesia** — real copy, not English placeholders.
3. **Anti-"AI-look" (from design-prompts.md GLOBAL block — binding):** no "→" in buttons/links, no ALL-CAPS eyebrows above headings, no middle-dot meta strings, no single-phrase accent color inside a headline, no staggered fade-up entrance per card (max one motion moment per page), terse informational copy, cards must vary in hierarchy, no emoji, **no real-time prices anywhere** (prices only from trial archives), disclaimer footer everywhere.
4. Keep the courtroom-document motif (seals/stamps, archive lines, case numbers) — it is what makes SIDANG not look like a SaaS dashboard.
5. Responsive: desktop ≥1280 primary (demo video is shot on a laptop), tablet 768–1279, mobile <768 single column. Respect `prefers-reduced-motion` (already handled globally — don't add animations that ignore it).
6. Dark theme only; flat cards with hairline borders, no soft drop shadows on every card.

## Page briefs

Use `docs/design-prompts.md`: paste-quality GLOBAL block + the page's own block. Order of priority:

1. **`/trial/:trialId` — CourtroomPage.tsx** (hero screen)
2. **`/memo/:trialId` — MemoPage.tsx** (judged artifact)
3. `/dashboard` — DashboardPage.tsx
4. `/ticker/:ticker` — TickerDetailPage.tsx
5. `/journal` — JournalPage.tsx
6. `/journal/:memoId/postmortem` — PostmortemPage.tsx

Data available per page: read the existing page's TSX and `src/types/contract.ts` (`MemoJSON`, event payloads) to see exactly what fields exist — **do not invent data that isn't in the contract** (no price predictions, no targets). Mock fixtures in `src/api/mockData.ts` show realistic content (BBCA trial is the canonical example).

## Definition of done (per page)

- [ ] Redesign implemented full-page in one pass — no mixing of old and new styling within the page
- [ ] `npm run typecheck && npm run build` clean
- [ ] Visually verified at 1440px, ~900px, and ~390px widths (dev server + screenshot)
- [ ] All states designed where applicable: loading/skeleton, running, done, failed, empty
- [ ] Footer disclaimer intact
- [ ] One motion moment max; state-change animations only