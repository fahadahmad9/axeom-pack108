# Assumptions — Pack 108

## Data interpretation

- **"Today" is October 6, 2026** — all overdue calculations, status assessments, and urgency rankings use this date.
- **payments.csv uses DD/MM/YYYY format** — confirmed because payment P5002 has day value "15" which can't be a month. bookings.csv uses MM/DD/YYYY (US format). invoices.csv and leads.csv use ISO YYYY-MM-DD.
- **Email is the primary identity key** — same email = same client, regardless of name variations. Where a person uses two emails (e.g., Yasmin, Omar, Brooke, Renee), I manually merge them based on context clues.
- **"Unpaid" in invoices.csv means the billing tool says unpaid** — not necessarily the ground truth. I cross-reference with payments.csv to find discrepancies.

## Client counting

- **30 real clients** — entities that receive video production services and have at least one booking.
- **Tallgrass Digital is a payer, not a client** — they book and pay for Glow Pediatrics and Meridian Chiropractic, but don't receive services themselves. Their June 8 message confirms: "I handle all video bookings and payments for Glow Pediatrics and Meridian Chiropractic going forward."
- **Spam/test entries excluded** — L046 (test@test.com), L066 (SEO spam), L078 (asdf), L084 (Fast Followers), plus billing@acct-dept.co and @insta.support.team messages.

## Financial assumptions

- **INV-1131 partial payment** — P5122 paid $450 of the $900 invoice. I assume $450 remains owed.
- **P5081 ($1,200, "july sessions")** — I assume this covers Yasmin's four July podcast invoices (INV-1065, 1070, 1079, 1084) at $300 each, based on her July 11 email requesting batch payment.
- **INV-1134 / B147 / B155** — B147 was cancelled but INV-1134 was paid ($1,500). If B155 is the rescheduled shoot and INV-1144 covers it, Axeom may owe Lena a refund or credit. I flag this for manual review rather than asserting it definitively.
- **INV-1137 ($900, due Oct 6)** — due today, not yet overdue. I exclude it from the overdue total.
- **Fischer Law August retainer (INV-1088, $2,250 vs. usual $2,500)** — possibly a billing error or negotiated discount. I did not include it in billing errors because there's no confirming evidence either way.

## Lost requests

- **Detection method** — I identify lost requests by finding follow-up messages where clients say things like "Did anyone see my message about X?", "This is the second time I ask", "Still not fixed on X", etc. These confirm an earlier request was missed.
- **The follow-up date is what I report** — the original request date would be earlier, but matching original requests to specific follow-ups across channels is imprecise. The follow-up date is when the failure became visible.

## Jev integration

- **Jev model "jev-latest"** — I use the latest available model rather than pinning to a specific version (e.g., jev-1.13.0).
- **Noul threshold 0.7 for spam detection** — values >= 0.7 are classified as spam, < 0.3 as not spam, between 0.3-0.7 would need manual review.
- **Score-to-outcome mapping** — Score >= 1.5 maps to "Won" (high quality), <= 0.5 maps to "Lost" (low quality), between maps to "New" (medium). This is a simplification since the actual outcome depends on follow-up, not just lead quality.
- **Message urgency threshold** — urgency score >= 1.5 OR churn Noul >= 0.7 OR lost-request Noul >= 0.7 triggers an "urgent" flag.
- **379 total API requests** — one per lead for spam (101), one per non-spam lead for quality (97), one per inbound message for urgency (181). In production this could be batched by sending multiple questions per request.

## Dashboard behavior

- **File upload replaces data in localStorage** — uploaded files override the embedded data for that file type. "Reset to Original Data" clears localStorage and reloads.
- **No auto-actions** — every suggestion tells the user what to do but never sends emails, creates invoices, or takes any action automatically.
