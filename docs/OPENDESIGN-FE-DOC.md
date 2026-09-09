# Document

## Goal

OpenDesign should generate the **UI mockups for SIDANG** — a multi-agent AI "stock courtroom" for the Indonesia Stock Exchange: the user types a ticker → a trial runs live and is watchable (5 analyst agents gather evidence → a bear prosecutor vs a bull defender debate for 2 rounds → a judge delivers a verdict) → an Indonesian-language research memo is saved to a journal with post-mortem tracking.

Expected outputs:

1. **4 screen mockups** (listed in the Scenario guide) with reusable components — focus on system & consistency, not screen count.
2. **Complete design tokens** as CSS variables (`tokens.css`) — this is the handoff contract to our React frontend; every color/spacing/typography decision must go through tokens, no hardcoding.
3. Quality priority: **the Courtroom Live Feed screen is the hero** — it is the material for our hackathon demo video.

### Core product principle: two layers — watch the trial, keep the report

The product experience is deliberately two-layered, and the design must express both:

1. **Layer 1 — WATCH (live, ephemeral):** the trial itself is a show. The user *watches* the agents work — 5 analysts investigating in parallel, then the prosecutor and defender arguing back and forth with evidence, then the judge deliberating. This transparency is the product's structural differentiator (no competitor has a visible adversarial debate) and it turns the 2–4 minute processing latency into content instead of a loading screen. Design it like a broadcast: alternating speakers, round markers, "writing…" moments, a verdict climax — not like a log or a progress bar.
2. **Layer 2 — KEEP (durable, shareable):** what remains after the show is the **Memo** — a credible, self-contained research document the user reads calmly, shares, and re-examines weeks later in the Journal (post-mortem vs. actual price). The memo is the accountability artifact: it must read like a legal document, not a chat transcript.

Consequences for the design (apply throughout):

- Screen B (Courtroom Live Feed) and Screen C (Memo) are **equal first-class screens** — B is the cinematic hero, C is the credible artifact; give each its own distinct visual mood (B: live, dramatized; C: calm, documentary) while staying in one token system.
- The same evidence (facts, citations) powers both layers — citation chips seen while watching must resolve to the same facts that appear in the memo's Key Facts table.
- The user must never be trapped watching: a persistent, unobtrusive **"Skip to Memo"** escape hatch belongs on every stage of Screen B.
- The Journal/post-mortem screen closes the loop of Layer 2 — design it to feel like a case archive, not an activity feed.

## How to use this document

- Use any Markdown format: headings, tables, checklists, links, quotes, code blocks, and images.
- The OpenDesign agent can read, edit, and use this file as project context.
- Paste images, or drag image files onto the editor; uploaded images are inserted at the cursor.
- All UI copy in the mockups must be **in Bahasa Indonesia** (real copy examples are provided per screen) — not English placeholders. Note: user-visible strings stay Indonesian even though this document is in English.

## Scenario guide

### Product goal

Give Indonesia's retail investors (20M+ SIDs, mostly millennials/Gen Z) a structured *second opinion* before buying a stock: not "AI says BUY", but a courtroom of evidence that stays honest — complete with an A/B/C information-richness grade and verification questions. The feeling to aim for: **courtroom × modern fintech — serious but cinematic**. Watching the trial should feel like watching a show; reading the memo should feel like reading a credible legal document.

### Target users

Young Indonesian retail investors — tech-savvy, used to apps like Stockbit/Ajaib, sensitive to "pump-and-dump" stock scandals, and needing clarity without institutional jargon.

### Flows (primary flow)

```
Home (ticker input)
  → Start Trial → Courtroom Live Feed (auto: Evidence → Debate → Verdict)
      → Memo (verdict + detail) ← re-accessible any time
  → Trial Journal (list of past memos)
      → Post-mortem (price at memo time vs now)
```

### Screens & modules

**A. Home / Ticker Input**
- Hero: `SIDANG` wordmark + tagline *"Sebelum beli, aduli dulu."* (≈ "Before you buy, put it on trial.")
- Large ticker input (mono, uppercase, max 4 letters) + button **"Mulai Sidang"** (Start Trial).
- "Jurnal Sidang" teaser: 3 most recent memos with verdict-category badges.

**B. Courtroom — Live Feed (HERO — most important screen)**
Design the debate as **a watchable show, not a text log**:
- Header: ticker + company name + mode badge (fixture/live) + phase stepper: **Evidence → Debate → Verdict** (active phase lit up).
- **Evidence phase**: 5 parallel analyst cards (Fundamental, Price, Smart Money, Insider, Anti-Gorengan). Each card: name, model, status (waiting → investigating → done), cache hit/miss badge, evidence chips (headline + number), and a summary when finished. These cards should feel alive — their status changes repeatedly.
- **Debate phase**: a **two-character conversation panel** — prosecutor (red, left) vs defender (green, right). Arguments appear **alternately** with a "writing…" indicator, round markers **Round 1 → rebuttal → Round 2**, a "rebuts [previous argument title]" label, and **citation chips `[f_12]` that show the evidence numbers on hover** (small popover card, numbers in mono).
- **Verdict phase (climax)**: the screen's mood shifts — brass accent strengthens, the document feels "being typed" (text streams in), then the **verdict card** appears with a confidence bar. Smooth auto-transition into the Memo.
- **Controls**: a "Skip to Memo" button (never force a 3-minute watch), gentle auto-scroll, automatic reconnect on connection drop.
- Failure state: a human-friendly Indonesian message + a "Retry Trial" button.

**C. Memo (shareable report page)**
- Memo header: ticker, company name, date, **information-richness badge A/B/C** with an explanatory tooltip ("A = complete data · C = much of this must be verified yourself").
- **Verdict hero**: category *Layak diteliti lebih dalam / Perlu kehati-hatian / Red flag berat* (Worth deeper research / Caution needed / Heavy red flags) + confidence bar + short rationale.
- **Verification questions** highlighted as a numbered list (this is the product's honesty differentiator — do not bury it).
- Key facts: cited table (numbers in mono, source-endpoint column + cache status).
- Prosecutor vs defender theses in two cited columns; smart-money & insider findings (with direction: accumulation/distribution/buy/sell/neutral); red flags with low/med/high severity.
- Footer: standing disclaimer + sources table (endpoint + cache).

**D. Trial Journal + Post-mortem**
- Table/list of past memos: ticker, date, verdict category, A/B/C badge, price at trial time, category filter, summary stat cards.
- Post-mortem: large **price delta since the memo** (up green / down red) + "N days ago" + the original memo below — the feeling of "an accountable committee".

### Interaction states (all must be designed)

- Loading/waiting, running (progress), finished, failed, empty (journal with no entries), reconnecting after a dropped connection.
- Citation-chip hover → evidence popover. Transitions 150–250ms, subtle, never flashy.

### Responsive breakpoints

- Desktop ≥1280px (primary — the demo video is shot on a laptop).
- Tablet 768–1279px: debate stays two-column, analyst cards go 2-up.
- Mobile <768px: single column; debate becomes an alternating full-width timeline; the phase stepper stays visible.

### Design tokens (handoff contract — must ship as `tokens.css` CSS variables)

| Group | Example token names | Notes |
|---|---|---|
| Color | `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-brass`, `--color-text`, `--color-text-muted`, `--color-prosecutor` (red), `--color-defender` (green), `--color-danger-*`, `--color-success-*` | Dark near-black theme with a very subtle texture/gradient; brass/gold accent (no neon, no generic SaaS purple-blue gradients) |
| Type | `--font-display` (serif, e.g. Fraunces — titles & verdict), `--font-ui` (sans, e.g. Inter), `--font-mono` (JetBrains Mono — **every number, price, endpoint, ticker**) | Hierarchy through typography & spacing, not a rainbow of colors |
| Space / radius / shadow | `--space-1..8`, `--radius-sm/md/lg`, `--shadow-*` | Consistent scale; flat cards with hairline borders + very soft shadows |
| Motion | `--duration-fast: 150ms`, `--duration-base: 250ms`, consistent easing | For card status changes, evidence chips appearing, the "writing…" effect |

### Avoid

- Generic SaaS template look (uniform gray cards, purple-blue gradients).
- Emoji as primary icons — use fine line icons.
- Excessive animation; numbers not set in mono.
- English placeholder copy in the UI.

## Next step

Generate mockups for the **4 screens above** (starting with the Courtroom Live Feed), then collect all styling into `tokens.css`. Once the mockups are done, this document remains the reference for revisions — directional changes just get edited here.