# Writeup — Axeom Pack 108

## How I connected the data

The core challenge was entity resolution: the same client appears under different names, emails, and channels across 8 files. Email is the most reliable key, so I built a canonical email map that merges known aliases (e.g., `yasmin.bennett.mail@gmail.com` → `yasmin@mindandmoney.fm`, `brooke@lakesideptdallas.com` → `bbecker@lakesideptdallas.com`, `renee@parkdental.con` → `renee@parkdental.com`). Phone numbers from `leads.csv` link WhatsApp/voice messages to client emails. Instagram handles are manually mapped for the two clients who use DMs (`@fischerlawfirmtx`, `@haleautodetailingtx`). Production board videos are linked to clients via `shoot_booking` → booking → email, with fuzzy name matching as fallback.

One critical relationship: Tallgrass Digital (tanya@tallgrassmktg.com) is a marketing agency that books and pays for Glow Pediatrics and Meridian Chiropractic. Their bookings and invoices go through Tallgrass' email, but the services are delivered to the end clients. I handle this by treating Glow and Meridian as real clients and Tallgrass as a "payer who is not a client."

Date formats vary across files: `leads.csv` and `invoices.csv` use ISO (YYYY-MM-DD), `bookings.csv` uses MM/DD/YYYY, and `payments.csv` uses DD/MM/YYYY. I detect and parse each format explicitly — getting this wrong would scramble the entire financial analysis.

## What the dashboard shows and why

The dashboard is designed around the **10-second test**: the owner opens it on their phone Monday morning and immediately sees what to do first.

**Actions tab** (default view) surfaces prioritized findings:
- **At-risk clients** (red) — Lakeside PT is the top priority: $30K/year retainer, two contract-cancellation messages, name compliance issue ignored. Shah Insurance has already paused.
- **Overdue invoices** (red) — 6 invoices, $7,400 total, oldest 41 days late.
- **Lost edit requests** (amber) — 15 confirmed instances where clients followed up because their request was missed. Root cause: no centralized intake across 5+ communication channels.
- **Billing errors** (blue) — 6 invoices marked unpaid that were actually paid (Yasmin's $1,200 lump sum, P5079 for INV-1090, P5087 for INV-1098).
- **Never billed** (amber) — 2 completed bookings with no matching invoice: B097 (Highland, $900) and B113 (Oak Lane, $1,500).

Every action card says **"Suggest:"** and explains what to do — the dashboard never acts on its own.

**Clients tab** provides a 360° view per client: bookings, invoices, payments, videos in progress, and recent messages. Click to expand any client. Search filters instantly.

**Money tab** has overdue invoices, billing tool errors, and never-billed items in sortable tables.

**Videos tab** shows the production board status and editor workload breakdown.

**Leads tab** breaks down lead sources by win rate (Referral wins at 71%) and lists all 19 unreplied leads.

**Upload tab** accepts new CSV/TXT files. The dashboard detects file type by name, re-parses everything client-side, and refreshes. Data persists in localStorage.

## Jev integration (Part 3)

I used TypeSafe's Jev (System One) for **lead triage** — three jobs across two primitives:

**Job 1 — Spam detection (Noul).** Each lead is passed as state, and a Noul question asks: "Is this lead spam, a test entry, or junk?" The criteria define what counts as spam (gibberish names, bulk-mail domains, empty business fields) vs. real (plausible name, professional email, named business). Ground truth: 4 known spam leads out of 101. Expected accuracy: high — the signals are unambiguous (test@test.com, seo@rank1seo.biz, "asdf"/a@a.co, promo@fastfollowers.io).

**Job 2 — Lead quality scoring (Score).** A 3-level rubric rates each non-spam lead: low (no business, generic email), medium (has business info but poor fit or went cold), high (named service business, professional email, engaged). This maps directly to the actual Won/Lost/New outcomes. Expected accuracy: moderate — Jev sees the lead form data but not the follow-up conversation, so some "Lost" leads that looked good on paper will score high.

**Job 3 — Message urgency triage (Score + Noul).** Each inbound message gets three questions: urgency score (routine / normal / urgent), churn signal detection (Noul), and lost-request detection (Noul). This replaces manual scanning of 183 messages. Privacy/legal messages ("blur the face", "didn't sign the release"), contract signals ("whether we continue"), and follow-ups ("still not fixed") should all score urgent. Expected accuracy: high for urgency and churn; medium for lost-request detection since the pattern is subtler.

**Why these jobs?** Lead triage has the clearest ground truth — we know which leads were spam, which won, and which messages were urgent. That makes accuracy measurement meaningful. The script (`jev_integration.py`) is runnable with a TypeSafe API key and compares Jev's output against the manual analysis to compute precision, recall, and F1 for spam detection, plus accuracy for quality scoring.

## Tech decisions

Single self-contained HTML file (~140KB). All data embedded as `<script type="text/csv">` tags — no server, no build step, no external dependencies except Google Fonts. CSV parser handles quoted fields with commas (critical for `"$1,500"` amounts). Entity resolution and analysis run entirely in the browser. Mobile-first responsive CSS with light/dark theme support. File upload uses the same parsers as the initial load, so new data gets the same analysis treatment.
