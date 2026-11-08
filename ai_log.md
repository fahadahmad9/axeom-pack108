# AI Log — Pack 108

## Tool used
Claude Code (Claude Opus 4.6) — Anthropic's CLI agent for software engineering tasks.

## How AI was used

### Data analysis
- Claude read all 8 data files and identified patterns: email aliases, date format inconsistencies (DD/MM/YYYY vs MM/DD/YYYY), name variants across files, and the Tallgrass agency relationship.
- Entity resolution logic (which emails are the same person, which bookings match which invoices) was designed collaboratively — I described the business context, Claude proposed the matching approach, and we iterated on edge cases.

### Code generation
- Claude wrote the CSV parser, message parser, entity resolution engine, analysis functions, and dashboard UI.
- The build pipeline (PowerShell script to embed data files into a single HTML) was Claude's approach to avoid manual transcription of ~100KB of CSV data.

### Debugging
- Claude tested the dashboard in-browser and identified issues: Lakeside PT's contract messages weren't linked (different email alias), Instagram DMs weren't being matched to clients, Tallgrass-managed bookings were showing as "never billed."
- Each bug was debugged by running JavaScript in the browser console to inspect the data state, then fixing the root cause in the source code.

### Writing
- Claude drafted the answers.json, writeup.md, assumptions.md, daily_log.md, and this file.
- I reviewed and directed the analysis — the conclusions (who's at risk, what the billing errors are, what the root causes of lost requests are) came from structured analysis of the data, not guesswork.

### Jev integration (Part 3)
- Claude read the Jev (TypeSafe System One) documentation and designed three jobs using the Noul and Score primitives:
  1. **Spam lead detection (Noul)**: Binary classification of each lead as spam/junk or real. Ground truth: 4 known spam leads (test@test.com, seo@rank1seo.biz, a@a.co, promo@fastfollowers.io).
  2. **Lead quality scoring (Score)**: 3-level rubric rating each lead's fit for a Dallas video production studio. Ground truth: actual Won/Lost/New outcomes from the data.
  3. **Message urgency triage (Score + Noul)**: Scores message urgency and detects churn signals and missed-request follow-ups. Ground truth: manually identified urgent patterns (privacy/legal, contract cancellation, repeated requests).
- The script (`jev_integration.py`) is fully runnable with a TypeSafe API key and includes accuracy measurement against manual analysis results.

## What AI did well
- Pattern recognition across messy, inconsistent data.
- Building a working dashboard from scratch in one session.
- Catching edge cases (typo email .con → .com, DD/MM vs MM/DD date formats, lump-sum payment covering multiple invoices).

## What needed human judgment
- Whether Tallgrass counts as a "client" or a "payer" — requires understanding the business relationship.
- Ranking at-risk clients — the data shows warning signals, but deciding which is most urgent requires business context (retainer value, relationship history).
- The "Monday morning top 3" — prioritization is a judgment call, not a computation.

## Accuracy self-assessment
- **Client count (30)**: High confidence. Email-based grouping with manual alias verification.
- **Overdue invoices ($7,400)**: High confidence. Direct computation from invoice due dates and payment records.
- **Billing errors (6)**: High confidence. Cross-referenced payment references with invoice numbers.
- **Lost requests (15)**: Medium-high confidence. Detected by follow-up pattern matching. Some original request dates are approximate.
- **Never billed ($2,400)**: Medium confidence. B097 (Highland) is clear. B113 (Oak Lane) could have an invoice I didn't match.
- **Best channel (Referral)**: High confidence. Win rate math is straightforward.
- **Most likely to leave (Lakeside PT)**: High confidence. Explicit "whether we continue" and "talk about the contract" messages.
