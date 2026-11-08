#!/usr/bin/env python3
"""
Jev Integration — Pack 108
Uses TypeSafe's Jev (System One) for lead triage and message urgency detection.

Setup:
    pip install typesafe-sdk
    export TYPESAFE_API_KEY="your-key-here"

Usage:
    python jev_integration.py                # run with API
    python jev_integration.py --dry-run      # print requests without calling API
"""
import csv, sys, os, json, re
from pathlib import Path

DATA = Path(__file__).parent / "data"
DRY_RUN = "--dry-run" in sys.argv

# ---------------------------------------------------------------------------
# Ground truth from manual analysis
# ---------------------------------------------------------------------------
SPAM_LEADS = {"L046", "L066", "L078", "L084"}  # test, seo spam, asdf, fast followers
UNREPLIED_LEADS = {
    "L003", "L009", "L010", "L014", "L017", "L027", "L031", "L038",
    "L044", "L061", "L067", "L076", "L077", "L079", "L082", "L086",
    "L087", "L091", "L094",
}
HIGH_URGENCY_MESSAGES = [
    "Please blur the face of the client",              # privacy/legal
    "she didn't sign the release",                      # privacy/legal
    "whether we continue",                              # churn signal
    "talk about the contract",                          # churn signal
    "we're pausing everything",                         # churn signal
    "Still not fixed",                                  # lost request
    "Did anyone see my message",                        # lost request
    "This is the second time",                          # lost request
]

# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------
def load_csv(name):
    with open(DATA / name, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def load_messages():
    msgs = []
    pat = re.compile(
        r"\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s+"
        r"(EMAIL|WHATSAPP|VOICE NOTE|INSTAGRAM DM|WEBSITE FORM)\s+"
        r"(from|to)\s+(.+?):\s+(.*)",
        re.DOTALL,
    )
    with open(DATA / "messages.txt", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = pat.match(line)
            if m:
                msgs.append({
                    "date": m.group(1),
                    "channel": m.group(2),
                    "direction": m.group(3),
                    "sender": m.group(4),
                    "body": m.group(5),
                })
    return msgs


# ---------------------------------------------------------------------------
# JOB 1 — Lead spam detection (Noul)
# ---------------------------------------------------------------------------
def build_spam_requests(leads):
    """Build one Jev request per lead to classify spam."""
    requests = []
    for lead in leads:
        state = (
            f"Lead {lead['lead_id']} from {lead['source']}:\n"
            f"Name: {lead['name']}\n"
            f"Business: {lead.get('business', '')}\n"
            f"Email: {lead['email']}\n"
            f"Phone: {lead.get('phone', '')}\n"
            f"Status: {lead['status']}"
        )
        req = {
            "state": state,
            "model": "jev-latest",
            "questions": {
                "is_spam": {
                    "type": "noul",
                    "instructions": "This lead is spam, a test entry, or junk (not a real prospective customer).",
                    "criteria": {
                        "true": "Name is gibberish (like 'asdf'), email is from a bulk-mail or SEO domain, the business field is empty and the name looks fake, or the submission is clearly automated/promotional.",
                        "false": "The lead has a plausible name, a real-looking business, and a professional or personal email address.",
                    },
                },
            },
        }
        requests.append((lead["lead_id"], req))
    return requests


# ---------------------------------------------------------------------------
# JOB 2 — Lead quality scoring (Score)
# ---------------------------------------------------------------------------
def build_quality_requests(leads):
    """Build one Jev request per non-spam lead to score quality."""
    requests = []
    for lead in leads:
        if lead["email"] in ("test@test.com", "a@a.co", "seo@rank1seo.biz", "promo@fastfollowers.io"):
            continue
        state = (
            f"Lead {lead['lead_id']} submitted via {lead['source']} on {lead['created']}:\n"
            f"Name: {lead['name']}\n"
            f"Business: {lead.get('business', '')}\n"
            f"Email: {lead['email']}\n"
            f"Phone: {lead.get('phone', '')}\n"
            f"Status: {lead['status']}\n"
            f"First reply: {lead.get('first_reply', 'none')}"
        )
        req = {
            "state": state,
            "model": "jev-latest",
            "questions": {
                "quality": {
                    "type": "score",
                    "instructions": "How qualified is this lead for a video production studio serving small businesses in Dallas?",
                    "criteria": [
                        "Low quality: no business name, generic email, no phone, or clearly not in the target market.",
                        "Medium quality: has a business name and contact info but the business type is a poor fit or the lead went cold.",
                        "High quality: named business in a service industry (dental, law, med spa, fitness, real estate), professional email, phone provided, and responded to outreach.",
                    ],
                },
                "reply_urgency": {
                    "type": "score",
                    "instructions": "How urgently should this lead be contacted?",
                    "criteria": [
                        "Low urgency: already replied to, or clearly not interested.",
                        "Medium urgency: new lead with some delay, but still within a reasonable window.",
                        "High urgency: new lead with no reply and it's been more than 7 days — at risk of going cold.",
                    ],
                },
            },
        }
        requests.append((lead["lead_id"], req))
    return requests


# ---------------------------------------------------------------------------
# JOB 3 — Message urgency triage (Score + Noul)
# ---------------------------------------------------------------------------
def build_message_requests(messages):
    """Build Jev requests for inbound client messages to triage urgency."""
    requests = []
    inbound = [m for m in messages if m["direction"] == "from"]
    for i, msg in enumerate(inbound):
        state = (
            f"Message received {msg['date']} via {msg['channel']} from {msg['sender']}:\n"
            f"{msg['body']}"
        )
        req = {
            "state": state,
            "model": "jev-latest",
            "questions": {
                "urgency": {
                    "type": "score",
                    "instructions": "How urgently does this message need a response from the video production team?",
                    "criteria": [
                        "Routine: general feedback, thanks, or casual message. No action needed.",
                        "Normal: standard edit request or question. Should be handled within 1-2 business days.",
                        "Urgent: privacy/legal issue (blur faces, unsigned releases), contract/cancellation signals, or a repeated request that was previously missed.",
                    ],
                },
                "is_churn_signal": {
                    "type": "noul",
                    "instructions": "The message signals the client may cancel, pause, or leave.",
                    "criteria": {
                        "true": "Mentions cancelling, pausing, stopping, not continuing, reviewing the contract, or dissatisfaction with the service.",
                        "false": "Normal edit request, positive feedback, scheduling, or routine communication.",
                    },
                },
                "is_lost_request": {
                    "type": "noul",
                    "instructions": "The message indicates a previous request was missed or ignored.",
                    "criteria": {
                        "true": "Client says they already asked, this is a follow-up, they're asking again, or the edit was 'still not done'.",
                        "false": "This appears to be a first-time request or general communication.",
                    },
                },
            },
        }
        requests.append((f"MSG-{i:03d}", req))
    return requests


# ---------------------------------------------------------------------------
# API caller (or dry-run printer)
# ---------------------------------------------------------------------------
def call_jev(requests, job_name):
    results = {}
    if DRY_RUN:
        print(f"\n{'='*60}")
        print(f"DRY RUN — {job_name}: {len(requests)} requests")
        print(f"{'='*60}")
        for rid, req in requests[:3]:
            print(f"\n--- {rid} ---")
            print(json.dumps(req, indent=2)[:600])
            print("  ...")
        if len(requests) > 3:
            print(f"\n  ... and {len(requests)-3} more requests")
        return results

    try:
        from typesafe_sdk import TypeSafeClient
    except ImportError:
        print("ERROR: typesafe-sdk not installed. Run: pip install typesafe-sdk")
        print("       Or use --dry-run to see the requests without calling the API.")
        sys.exit(1)

    print(f"\nCalling Jev API — {job_name}: {len(requests)} requests")
    with TypeSafeClient(model="jev-latest") as client:
        for rid, req in requests:
            try:
                resp = client.system_one(
                    state=req["state"],
                    questions=_build_sdk_questions(req["questions"]),
                )
                results[rid] = resp.answers
                print(f"  {rid}: OK")
            except Exception as e:
                print(f"  {rid}: ERROR — {e}")
                results[rid] = None
    return results


def _build_sdk_questions(q_dict):
    from typesafe_sdk import Choice, Score, Noul, NoulCriteria
    out = {}
    for qid, q in q_dict.items():
        if q["type"] == "noul":
            kwargs = {"instructions": q["instructions"]}
            if "criteria" in q:
                kwargs["criteria"] = NoulCriteria(
                    true=q["criteria"]["true"],
                    false=q["criteria"]["false"],
                )
            out[qid] = Noul(**kwargs)
        elif q["type"] == "score":
            out[qid] = Score(
                instructions=q["instructions"],
                criteria=q["criteria"],
            )
        elif q["type"] == "choice":
            out[qid] = Choice(
                instructions=q["instructions"],
                criteria=q["criteria"],
            )
    return out


# ---------------------------------------------------------------------------
# Accuracy measurement
# ---------------------------------------------------------------------------
def measure_spam_accuracy(results, leads):
    """Compare Jev spam predictions against ground truth."""
    if not results:
        print("\n[Spam accuracy] No API results — showing ground truth only.")
        print(f"  Ground truth spam leads: {sorted(SPAM_LEADS)}")
        print(f"  Total leads: {len(leads)}, Spam: {len(SPAM_LEADS)}, Real: {len(leads)-len(SPAM_LEADS)}")
        return

    tp = fp = fn = tn = 0
    threshold = 0.7
    for lead in leads:
        lid = lead["lead_id"]
        if lid not in results or results[lid] is None:
            continue
        predicted_spam = results[lid]["is_spam"].noul >= threshold
        actual_spam = lid in SPAM_LEADS
        if predicted_spam and actual_spam:
            tp += 1
        elif predicted_spam and not actual_spam:
            fp += 1
        elif not predicted_spam and actual_spam:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    print(f"\n[Spam detection accuracy]")
    print(f"  Threshold: {threshold}")
    print(f"  TP={tp} FP={fp} FN={fn} TN={tn}")
    print(f"  Precision: {precision:.2%}  Recall: {recall:.2%}  F1: {f1:.2%}")


def measure_quality_accuracy(results, leads):
    """Compare Jev quality scores against actual Won/Lost/New outcomes."""
    if not results:
        won = sum(1 for l in leads if l["status"] == "Won")
        lost = sum(1 for l in leads if l["status"] == "Lost")
        new = sum(1 for l in leads if l["status"] == "New")
        print(f"\n[Lead quality] No API results — showing ground truth only.")
        print(f"  Won: {won}, Lost: {lost}, New: {new}")
        return

    correct = 0
    total = 0
    for lead in leads:
        lid = lead["lead_id"]
        if lid not in results or results[lid] is None:
            continue
        score = results[lid]["quality"].score
        actual = lead["status"]
        predicted = "Won" if score >= 1.5 else ("Lost" if score <= 0.5 else "New")
        if predicted == actual:
            correct += 1
        total += 1

    print(f"\n[Lead quality accuracy]")
    print(f"  Accuracy: {correct}/{total} = {correct/total:.1%}" if total else "  No data")


def measure_urgency_accuracy(results, messages):
    """Check how well Jev detects urgent messages."""
    if not results:
        print(f"\n[Message urgency] No API results — showing expected high-urgency patterns.")
        for p in HIGH_URGENCY_MESSAGES:
            print(f"  - '{p}'")
        return

    flagged_urgent = []
    for mid, answers in results.items():
        if answers is None:
            continue
        score = answers["urgency"].score
        churn = answers["is_churn_signal"].noul
        lost = answers["is_lost_request"].noul
        if score >= 1.5 or churn >= 0.7 or lost >= 0.7:
            flagged_urgent.append((mid, score, churn, lost))

    print(f"\n[Message urgency] Jev flagged {len(flagged_urgent)} urgent messages.")
    for mid, s, c, l in sorted(flagged_urgent, key=lambda x: -x[1]):
        print(f"  {mid}: urgency={s:.2f} churn={c:.2f} lost_req={l:.2f}")


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def write_report(leads, messages, spam_results, quality_results, msg_results):
    report = {
        "jev_model": "jev-latest",
        "jobs": [
            {
                "name": "Spam lead detection",
                "primitive": "Noul",
                "description": "Binary classification: is each lead spam/junk or real?",
                "inputs": len(leads),
                "ground_truth": {
                    "spam_count": len(SPAM_LEADS),
                    "spam_ids": sorted(SPAM_LEADS),
                },
                "has_api_results": bool(spam_results),
            },
            {
                "name": "Lead quality scoring",
                "primitive": "Score",
                "description": "Rate each lead's quality on a 0-2 scale (low/medium/high) based on business fit, contact info, and engagement.",
                "inputs": len([l for l in leads if l["email"] not in ("test@test.com", "a@a.co", "seo@rank1seo.biz", "promo@fastfollowers.io")]),
                "ground_truth": {
                    "won": sum(1 for l in leads if l["status"] == "Won"),
                    "lost": sum(1 for l in leads if l["status"] == "Lost"),
                    "new": sum(1 for l in leads if l["status"] == "New"),
                },
                "has_api_results": bool(quality_results),
            },
            {
                "name": "Message urgency triage",
                "primitives": ["Score", "Noul"],
                "description": "Score each inbound message's urgency (0-2) and detect churn signals and missed-request follow-ups.",
                "inputs": len([m for m in messages if m["direction"] == "from"]),
                "ground_truth": {
                    "known_urgency_patterns": len(HIGH_URGENCY_MESSAGES),
                },
                "has_api_results": bool(msg_results),
            },
        ],
    }
    out_path = Path(__file__).parent / "jev_report.json"
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nReport written to {out_path}")
    return report


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Jev Integration — Axeom Pack 108")
    print(f"Mode: {'DRY RUN (no API calls)' if DRY_RUN else 'LIVE (calling Jev API)'}")

    leads = load_csv("leads.csv")
    messages = load_messages()
    print(f"Loaded {len(leads)} leads, {len(messages)} messages")

    # Job 1: Spam detection
    spam_reqs = build_spam_requests(leads)
    spam_results = call_jev(spam_reqs, "Spam Detection (Noul)")
    measure_spam_accuracy(spam_results, leads)

    # Job 2: Lead quality
    quality_reqs = build_quality_requests(leads)
    quality_results = call_jev(quality_reqs, "Lead Quality (Score)")
    measure_quality_accuracy(quality_results, leads)

    # Job 3: Message urgency
    msg_reqs = build_message_requests(messages)
    msg_results = call_jev(msg_reqs, "Message Urgency (Score + Noul)")
    measure_urgency_accuracy(msg_results, messages)

    # Write report
    write_report(leads, messages, spam_results, quality_results, msg_results)

    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Jobs run: 3 (Spam Detection, Lead Quality, Message Urgency)")
    print(f"Jev primitives used: Noul, Score")
    print(f"Total API requests: {len(spam_reqs) + len(quality_reqs) + len(msg_reqs)}")
    if DRY_RUN:
        print("\nTo run with the API: export TYPESAFE_API_KEY=your-key && python jev_integration.py")


if __name__ == "__main__":
    main()
