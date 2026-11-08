# Daily Log — Pack 108

## Day 1 (November 8, 2026)

### Hours worked: ~6

### What I did
1. Read the challenge brief (Pack108-Brief.pdf, Pack108-HowToSubmit.pdf) and all 8 data files cover to cover.
2. Built a mental model of the business: Axeom is a one-person content studio (Zaid) with 4 editors, serving ~30 Dallas-area small businesses with podcast recording, content days, reels, and retainer shoots.
3. Identified the core data problem: entity resolution across inconsistent names, emails, and channels. Mapped email aliases, phone numbers, and Instagram handles to canonical client identities.
4. Analyzed every financial record: cross-referenced invoices, payments, and bookings to find overdue invoices ($7,400), billing tool errors (6 invoices), never-billed bookings ($2,400), and a potential refund situation ($1,500).
5. Parsed all 183 messages to identify 15 confirmed lost edit requests, 19 unreplied leads, and 6 at-risk clients.
6. Built the dashboard as a single self-contained HTML file: CSS + JS + embedded data. Implemented CSV parser (handling quoted fields), message parser (5 message types), entity resolution engine, analysis engine, and full responsive UI.
7. Tested in browser — debugged entity resolution issues (Lakeside PT's second email, Instagram DM matching, Tallgrass agency billing).
8. Published dashboard live. Wrote answers.json with all findings. Wrote writeup, assumptions, and this log.

### Decisions made
- Single HTML file rather than a React/Vue app — no build step, no server, instant deploy. The data is small enough (~100KB) to embed directly.
- Email as primary key for entity resolution — most reliable identifier across all data sources.
- "Suggest, never act" pattern — every action card tells the owner what to do but never does it automatically.
- Referral is the best channel — 71% win rate, highest-value clients, zero stale leads.
- Lakeside PT is the #1 at-risk client — explicit contract cancellation signals + $30K/year revenue at stake.

9. Integrated Jev (TypeSafe System One) for Part 3: wrote `jev_integration.py` using Noul and Score primitives for spam detection, lead quality scoring, and message urgency triage. Built accuracy measurement against manual analysis ground truth.
10. Updated all documentation: writeup, assumptions, ai_log, daily_log, answers.json.

### Decisions made (continued)
- Used Jev for lead triage rather than entity resolution — lead triage has clearer ground truth (Won/Lost/New status, known spam entries) so accuracy measurement is more meaningful.
- Chose Score for lead quality (3-level rubric maps naturally to Won/Lost/New) and Noul for spam (binary classification is a perfect Noul use case).
- Combined Score + Noul for message urgency — urgency is a spectrum (Score) but churn signals and lost requests are binary yes/no (Noul).

### What I'd do with more time
- Run Jev with a real API key and report actual accuracy numbers.
- Build a profitability calculator using team.csv and costs.csv rates.
- Add timeline visualizations for client engagement patterns.
- Implement client health scores based on payment timeliness, revision counts, and message sentiment.
