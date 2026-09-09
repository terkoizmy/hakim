# Sectors Documentation Digest
For the multi-agent LLM "investment committee" hackathon product. Sources fetched 2026-09-09: the six docs.sectors.app `.md` pages, `llms.txt` index, `get-started/v2/overview.md`, and sectors.app/pricing (rendered + JSON-LD).

---

## A. MCP integration

**Server:** cloud-hosted MCP server on Cloudflare Workers, Streamable HTTP transport, **65+ tools** covering IDX, SGX, KLSE + Indonesian mining. No local install.

- **URL:** `https://sectors-mcp.supertype.ai/mcp`
- **Auth:** `Authorization: Bearer YOUR_API_KEY` header — same key as the REST API, **requires an Insider plan** (401 if key is wrong, not Insider, or `Bearer ` prefix missing).
- **Claude Code:** `claude mcp add -t http sectors https://sectors-mcp.supertype.ai/mcp -H "Authorization: Bearer YOUR_API_KEY"`
- **Cursor:** `~/.cursor/mcp.json` → `mcpServers.sectors = { url, headers.Authorization }`
- **VS Code:** `.vscode/mcp.json` → `servers.sectors = { type: "http", url, headers.Authorization: "Bearer ${input:sectors-api-key}" }` + `inputs` promptString (prompts once per session by design)
- **Claude web/desktop & ChatGPT:** one-click **OAuth custom connector**, no key in config (recipes `02-sectors-in-claude`, `03-sectors-in-chatgpt`).

**Tool catalog (IDX):**
- Company: `fetch-company-report` (`symbol`, `sections`), `fetch-company-segments`, `fetch-listing-performance`, `fetch-corporate-actions`, `fetch-shareholders-composition`
- Screening/rankings: `fetch-companies-by-subsector` (`q`, `where`, `order_by`, `limit` — structured **or** natural language), `fetch-companies-top-changes`, `fetch-most-traded-stocks`, `fetch-close`
- Financials: `fetch-quarterly-financials`, `fetch-quarterly-financial-dates`, `fetch-companies-quarterly-financial-dates` (universe freshness feed)
- Daily/index: `fetch-index-daily`, `fetch-idx-market-cap`, `fetch-daily-transaction`, `fetch-foreign-flow`, `fetch-free-float`
- Taxonomy: `get-subsectors`, `fetch-industries`, `fetch-subindustries`, `fetch-subsector-report`, `fetch-companies-with-segments`
- News/filings: `fetch-news`, `fetch-filings`, `fetch-suspensions`, `fetch-tags`
- Brokers: `fetch-brokers`, `fetch-top-brokers`, `fetch-broker-summary`, `fetch-broker-summary-top`, `fetch-broker-activity`, `fetch-broker-activity-top`
- Plus ~12 SGX tools, 4 KLSE tools, ~19 mining tools.

Conventions: IDX tickers **without** `.JK` (e.g. `BBCA`); SGX codes as-is (`D05`); subsector slugs kebab-case (`banks`) — enumerate with `get-subsectors`. Data freshness: EOD prices/transactions, quarterlies as filed, dividends on announcement.

**MCP vs REST for an agent product:**
- Pros: zero tool-wrapping/schema code; 65+ curated tools; natural-language screening (`q`) built in; instantly demoable in Claude/Cursor/VS Code/ChatGPT; vendor-maintained (no drift); "official Sectors MCP" is a credibility signal.
- Cons: your product backend must embed an MCP client; less control over caching/dedup/retry (matters for the 5,000-credit budget); responses pre-shaped by the server (can pull more sections than needed → more credits); an extra server hop; no access to anything not exposed as a tool. A thin custom REST wrapper layer gives full control over exactly which `sections`/fields are fetched per agent — cheaper in credits for a committee that runs many calls.

---

## B. Recipe overlap analysis (judge-familiar patterns to differentiate FROM)

### 1. `04-human-agent` — "Building a Human-Agent Collaboration Framework for IDX Stock Analysis" (Alya Dwinanda, Jun 21 2026)

Adapts **FinArena** (Xu et al. 2025, arXiv:2503.02692) to IDX, using **Sectors REST API + SambaNova DeepSeek-V3.1** for every agent. Kaggle/Jupyter notebook, plain `requests`, hand-rolled OpenAI-style function-calling loop (max 10 rounds, temperature 0).

**Architecture (pipeline):**
1. **Human Module** — upfront CLI capture: risk tolerance (`conservative`/`moderate`/`aggressive`) + horizon in years.
2. **Three specialist agents run concurrently** (`asyncio.gather`), each with exactly ONE tool:
   - **Fundamental Agent** → `get_fundamentals` → `GET /v2/company/report/{ticker}/?sections=financials,valuation,dividend` → JSON: `revenue_trend, profitability, valuation, dividend_yield, leverage, red_flags, fundamental_score` (1–10)
   - **Technical Agent** → `get_price_performance` → `.../?sections=overview` → `price_position, momentum, market_cap, volatility_signal, technical_score`
   - **News Agent** → `get_news_and_filings` → `.../?sections=management` **+** `GET /v2/financials/quarterly/{ticker}/?n_quarters=4` → `earnings_trajectory, management_notes, corporate_actions, sentiment, sentiment_score`
3. **Universal Expert Agent** (no tools) synthesizes the three JSON reports with **risk-profile-dependent weights**: conservative = fundamentals 60% / sentiment 25% / technicals 15%; moderate = 40/35/25; aggressive = technicals 40% / fundamentals 35% / sentiment 25%. Output: `overall_score` (1–10), `recommendation` BUY/HOLD/AVOID, `key_reasons`, `risk_warnings`, `position_sizing` CORE (>5%) / SATELLITE (2–5%) / AVOID (<2%), `summary`.
4. Loop over a hardcoded watchlist (BBCA, TLKM, ASII) → pandas DataFrame table (+ optional Excel export). Decision thresholds in the diagram: score ≥7 BUY/CORE, 5–6 HOLD/SATELLITE, <5 AVOID.

**What it does NOT do (differentiation gaps):**
- **No debate/deliberation** — specialists never see each other's output; only the Expert synthesizes. No judge/critic, no revision loop.
- **No real news data** — despite FinArena's "hallucination on news" motivation and "Adaptive RAG" framing, the News Agent pulls `management` + quarterly financials, **never the news/filings endpoints** (`/v2/news/`, `fetch-news`). Adaptive RAG is cited, not implemented.
- **No MCP** — raw REST wrapped as custom tools.
- **Single model for all agents** (DeepSeek-V3.1 via SambaNova) — no heterogeneous committee.
- **Human-in-the-loop only upfront** (risk profile) — no mid-pipeline approval gates, no iterative feedback.
- **No portfolio construction** — position sizing is a static label, no allocation/rebalancing math.
- **No memory, no backtesting/evaluation, no streaming/product UI** (CLI + DataFrame only). IDX only.
- A 4th tool schema (`screen_by_sector`) is declared but never wired to any agent.

### 2. `03-multiagent` — "Building Multi-Agent Workflows for Financial Research" (Mar 5 2026)

**OpenAI Agents SDK** (`openai-agents`) + Sectors REST. Two named patterns:
- **Sequential Chain:** `IDX Screener` agent (gpt-4o-mini, tool `find_companies_screener` → `GET https://api.sectors.app/v2/companies/?where=...&order_by=...&limit=...`, URL-encoded) returns *only* a Python list of tickers → passed to `IDX Researcher` agent (gpt-4o, tool `get_company_overview` → `/v2/company/report/{ticker}/?sections=overview,financials`) which returns raw JSON `{metric_fields, results[]}`.
- **Judge-Critic:** `Evaluator` agent (gpt-4o-mini, **no tools**, structured output `EvaluationFeedback {feedback, score: pass|expect_improvement|fail}`) grades the draft (checks every result has `ticker`+`company_name`, non-null numeric metrics); `for` loop up to `max_attempts = 3` sends evaluator feedback back to the Researcher for revision; falls back to the last draft if it never passes.
- Then pandas/matplotlib/seaborn visualization of the structured output.
- Demonstrates: narrow single-responsibility agents, structured outputs, self-improving revision loop. **Not demonstrated:** parallel analysts, personalization, debate, portfolio logic, news/sentiment.

### 3. `02-tool-use` — "Tool Use and Function Calling for Finance LLMs" (Samuel Chan, Aug 2024, updated Mar 2026)

**Single-agent tool-use RAG** ("API-based RAG"): LangChain `create_tool_calling_agent` + `AgentExecutor`, Groq model (was `llama3-groq-70b-8192-tool-use-preview`, now `openai/gpt-oss-120b`). Three `@tool` retrievers: `get_company_overview` (`/v2/company/report/{stock}/?sections=overview`), `get_top_companies_by_tx_volume` (`/v2/most-traded/?start=&end=&n_stock=`), `get_daily_tx` (`/v2/daily/{stock}/?start=&end=`); reader is challenged to add `get_performance_since_ipo` (listing-performance endpoint). System prompt injects the current date so the model infers "last 7 days"-style ranges. Example queries: top-3 by volume, BBCA June trend, BBCA-vs-BREN market cap + IR contact info, GOTO since IPO, GOTO-vs-BREN 90-day IPO return. This is the baseline **single-agent function-calling** pattern.

**Differentiation space for an "investment committee" product** (none of the recipes have): adversarial bull/bear **debate** between agents; **heterogeneous models/roles**; real **news + filings + broker/foreign-flow** signals (endpoints exist but are barely used); **portfolio-level** decisions with allocation math; mid-pipeline **human approval gates**; **memory/committee minutes** across sessions; **backtested evaluation**; credit-aware orchestration; MCP-native tool access; a real product UI.

---

## C. Screener + company report endpoints

### Companies Screener — `GET /v2/companies/` (Indonesia)

**Query modes (mutually exclusive — `q` overrides all others):**
- `q` — natural language, e.g. `top 10 tech companies by revenue in 2023`; Sectors' LLM translates it
- `where` + `order_by` — SQL-like structured query

**Params:** `where` (operators `=, !=, >, >=, <, <=, like, in`; logic `and`/`or`; strings quoted; lists for `in`), `order_by` (default `symbol`, `-` prefix = desc, supports arithmetic e.g. `-(earnings[2024]/earnings[2023])`), `desc` (bool, default false), `limit` (default 50, **max 200**), `offset` (pagination), `include_query_values` (bool — adds per-row `query_values` + interpreted year/country), `q` (natural language).

**Field access syntax:** bracket notation for yearly `revenue[2023] > 1e11`, forecast `forecast_eps_growth[2025] > 0.15`, and quarterly `revenue_q[Q1-2024] > 1e9`; arithmetic on both sides (`revenue[2024] / total_assets[2024] > 0.5`).

**Queryable fields (selection):**
- Direct: `symbol, company_name, listing_board, industry, sub_industry, sector, sub_sector, market_cap, market_cap_rank, employee_num, listing_date, last_ex_dividend_date, last_close_price, daily_close_change, forward_pe, intrinsic_value, esg_score, yield_ttm, dividend_ttm, payout_ratio, cash_payout_ratio, yoy_quarter_earnings_growth, yoy_quarter_revenue_growth`
- Array (use `in`): `tags` (e.g. `'bullish'`, `'52-w-high'`), `indices` (e.g. `['LQ45','IDX30']`), `affiliates`
- Most-recent JSON: `pe_ttm, pb_mrq, ps_ttm, dar_mrq, der_mrq, roa_ttm, roe_ttm, total_assets_mrq, total_revenue_mrq, earnings_mrq, yearly_mcap_change, dividend_yield_avg, ytd/52_w/90_d/all_time _low/_high _price/_date`
- Yearly `[YYYY]`: `eps, eps_growth, revenue, earnings, ebit, ebitda, free_cash_flow, operating_cash_flow, total_debt, total_assets, total_equity, total_dividend, total_yield, forecast_eps_estimate, forecast_revenue_estimate, forecast_eps_growth, forecast_revenue_growth, pe, pb, ps, pcf, peg, enterprise_to_ebitda, enterprise_to_revenue, pe_peer_avg, pb_peer_avg, ps_peer_avg, debt_to_equity_ratio, interest_coverage_ratio, current_ratio, roa, roe, net_profit_margin, ...` + banking (`total_deposit, gross_loan, npl/non_performing_loan, capital_adequacy_ratio, casa_ratio, loan_to_deposit_ratio, net_interest_margin, ...`) and insurance fields
- Quarterly `[Qi-YYYY]`: `revenue_q, earnings_q, ebitda_q, free_cash_flow_q, ...`
- List-of-objects (any-match): `key_executives_name, key_executives_position, major_shareholders_name, major_shareholders_share_percentage, executives_shareholdings_*, free_float`

**Smart FY handling:** "latest year" queries Jan–Apr default to the previous *audited* year.

**Response:** `{ results: [{symbol: "BBCA.JK", company_name, query_values?}], pagination: {total_count, showing, limit, offset, has_next, has_previous, next_offset, previous_offset}, llm_translation: {natural_query, translated_params: {where, order_by, limit, ...}, message} }` — the `llm_translation` echo is nice for showing judges how NL became structured.

**Errors:** 400 `INVALID_WHERE_CLAUSE` / `TYPE_MISMATCH` / `INVALID_LIMIT` / `NON_TRANSLATABLE_QUERY`; 429 `RATE_LIMIT_EXCEEDED` ("Consider upgrading").

**Cost: 1 credit structured; 3 credits with `?q=`.**

### Company Report — `GET /v2/company/report/{symbol}/`

Path `symbol`: 4 letters, optional `.jk`, case-insensitive (e.g. `BREN`). Query `sections` (comma-separated; **default = all 8 = 8 credits; 1 credit per section**):

- `overview` — identity, sector/subsector/industry, `market_cap`, `market_cap_rank`, `employee_num`, `listing_date`, contact info, `last_close_price`, `all_time_price` (ytd/52w/90d/all-time lows+highs with dates), `esg_score`, `tags`, `indices`, `affiliates`
- `valuation` — close price, `forward_pe`, `intrinsic_value`, `historical_valuation` by year (`pe, pb, ps, pcf, peg, pe_peer_avg, pb_peer_avg, ps_peer_avg, enterprise_to_ebitda, enterprise_to_revenue`)
- `future` — `company_value_forecasts` (EPS/revenue estimates), `company_growth_forecasts`, `analyst_rating_breakdown` (strong_buy/buy/hold/sell/strong_sell, `n_analyst`)
- `peers` — peer set within subsector with `pe_ttm, pb_mrq, market_cap, net_income, total_revenue, point_summaries`, income/expense breakdowns
- `financials` — `eps`, `historical_eps`, full `historical_financials` per year (income statement / balance sheet / cash flow, incl. banking fields), `historical_financial_ratio` grouped by capital/leverage/liquidity/efficiency/profitability, `yoy_quarter_earnings_growth`, `yoy_quarter_revenue_growth`
- `dividend` — `historical_dividends` (per-year breakdown), `upcoming_dividends`, `yield_ttm`, `dividend_ttm`, `payout_ratio`, `cash_payout_ratio`, `dividend_yield_avg`, `last_ex_dividend_date`
- `management` — `key_executives`, `executives_shareholdings`
- `ownership` — `major_shareholders`, `top_transactions` (top buyers/sellers), `institutional_transaction_flow`, `whale_investors`, `conglomerates_group`

Errors: 400 invalid symbol/unknown section (free); 404 symbol not found (billed 1 credit); 429 rate limit.

---

## D. Credit / pricing mechanics

**Plans (sectors.app/pricing, USD):**
- **Forever Free** — $0: Sectors app, most features, limited export. **No API.**
- **Standard** — $49/mo (annual ≈ $490/yr, 2 months free, save 17%): AI search + AI chat, unlimited CSV/JSON export, watchlist, premium data (broker analysis/bandarmology, order books, deeper financials, insider transactions, filings).
- **Insider** — $59/mo (annual ≈ $531/yr, 3 months free, save 25%; "only ~$3/mo more than Standard"): everything in Standard **+ 5,000 Sectors API credits/month** + Sectors Workflow automations + Screener/Query Builder (500+ metrics) + workshops + priority support. **API keys (REST + MCP) require Insider.** (The pricing FAQ loosely says "Standard and Insider" for the API, but the compare table, get-started docs, and MCP guide all gate API access on Insider.)
- Enterprise tier exists (help@sectors.app).

**Credit consumption (from the OpenAPI billing rules, global):**
- **2xx** → billed the endpoint's stated cost (most endpoints = 1; multi-section reports and multi-classification rankings cost more).
- **404** (resource addressed doesn't exist, e.g. unknown symbol) → **billed 1 credit** (you pay for the lookup).
- **400** bad request → **free**, with one exception: the screener with `?q=` bills **1 credit** on a 400 that occurs *after* the query reached the LLM (untranslatable query) — recovers model cost.
- **401/403, 429, 5xx** → free.
- **Empty results are 200 and billed** (list/filter endpoints return empty arrays + `message`; the query ran).
- Notable per-endpoint costs: screener = **1** structured / **3** with `q=`; company report = **1 per section** (default all-8 = 8 credits). → A committee product should always pass explicit `sections` and prefer structured `where` over `q=`.

---

## E. Other notable findings

- **Auth scheme:** REST uses the raw API key in the `Authorization` header (docs code: `headers = {"Authorization": api_key}`, **no** `Bearer` prefix); the **MCP** server requires `Bearer <key>`. Key generated at sectors.app/api after login (Insider).
- **Rate limits:** plan-gated, surfaced as HTTP 429 `RATE_LIMIT_EXCEEDED` "Rate limit exceeded. Consider upgrading." — no numeric limits published on these pages.
- **v1 is dead:** Sectors API v1 discontinued 2026-05-11; all `/v1/*` return **410 Gone**. v2 (`https://api.sectors.app/v2`) is the only supported version. A v2 changelog page exists.
- **Discovery for agents:** `https://docs.sectors.app/llms.txt` (full page index) and `/schema.json` (OpenAPI). Every docs page is fetchable as markdown by appending `.md`.
- **Useful adjacent endpoints** (for committee signals, from llms.txt): news `/v2/news/` (filter by sector/symbol/tags/keyword), filings `/v2/filings/` (insider buys/sells), suspensions, foreign flow `/v2/foreign-flow/`, broker endpoints (top buyers/sellers per symbol, accumulation/distribution), subsector report, revenue segments, listing performance since IPO, top movers.
- **Other judge-familiar Sectors AI recipes** (context for differentiation): `01-agent-skills-guide` (agent skill for Sectors API), `02-sectors-in-claude` / `03-sectors-in-chatgpt` (OAuth connectors), n8n recipes incl. an "AI-Powered Stock Analyst" with the natural-language screener, GNN anomaly-detection series, SectorScan Streamlit app.
- **Sectors ships its own AI features** (AI Search, GPT-like AI Chat on Standard+) — a native "competitor" to agent products; differentiate on multi-agent committee behavior, not on "AI + Sectors data" alone.
- **Coverage claims:** 99.99% of IDX (950+ companies, daily refresh), ~80% SGX; ">35% more coverage than global providers". IDX/SGX/KLSE + mining extension.
- **Data freshness:** EOD for prices/transactions/daily data; quarterly financials as filed; dividends on announcement. Smart FY handling in the screener (Jan–Apr "latest year" = previous audited year).