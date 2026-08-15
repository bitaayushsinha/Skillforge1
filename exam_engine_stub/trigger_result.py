#!/usr/bin/env python3
import argparse
import requests
import sys

def main():
    parser = argparse.ArgumentParser(description="Trigger realistic mock exam result webhook from Stub Exam Engine to SRP")
    parser.add_argument("--stub-url", default="http://localhost:8001", help="Stub Exam Engine Base URL (default: http://localhost:8001)")
    parser.add_argument("--booking", required=True, help="Booking reference (e.g., BKG-123456)")
    parser.add_argument("--score", type=float, default=88.5, help="Exam score (default: 88.5)")
    parser.add_argument("--status", choices=["PASS", "FAIL"], default="PASS", help="Pass/Fail status (default: PASS)")
    parser.add_argument("--level", default="District", help="Tier level (default: District)")
    parser.add_argument("--webhook-url", default="http://localhost:8000/api/webhooks/exam-engine", help="SRP Webhook base URL")

    args = parser.parse_args()

    payload = {
        "booking_reference": args.booking,
        "score": args.score,
        "pass_fail": args.status,
        "level": args.level,
        "webhook_url": args.webhook_url
    }

    url = f"{args.stub_url.rstrip('/')}/api/v1/exam-engine/stub/trigger-result"
    print(f"Triggering Exam Engine Result webhook for booking '{args.booking}' (score={args.score}, status={args.status})...")
    
    try:
        res = requests.post(url, json=payload, timeout=10)
        print("Status Code:", res.status_code)
        print("Response:", res.json())
    except Exception as e:
        print("Error sending trigger:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
