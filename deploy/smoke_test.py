#!/usr/bin/env python3
"""Read-only smoke checks. No cookies, authentication, credentials or writes."""
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def check(origin):
    parsed = urlparse(origin)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username is not None or parsed.password is not None or parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise ValueError("Expected a bare HTTPS service origin, with no userinfo, path or query")
    try:
        parsed.port  # Reject invalid port syntax before any request.
    except ValueError as exc:
        raise ValueError("Invalid HTTPS service port") from exc
    for path, expected in (("/health", "json"), ("/", "html")):
        url = origin.rstrip("/") + path
        with urlopen(Request(url, headers={"User-Agent": "ttworkshop-lab5-readonly-smoke/1"}), timeout=15) as response:
            final = urlparse(response.geturl())
            if final.scheme != "https" or final.netloc != parsed.netloc or final.path != path:
                raise RuntimeError("Smoke request was redirected away from the expected HTTPS endpoint")
            if response.status != 200:
                raise RuntimeError(f"{path}: HTTP {response.status}")
            body = response.read(65536)
            if expected == "json":
                payload = json.loads(body)
                if payload.get("status") != "ok":
                    raise RuntimeError("Database readiness reported unhealthy")
            elif b"<html" not in body.lower() and b"<!doctype html" not in body.lower():
                raise RuntimeError("Root was not HTML")
            print(f"PASS {path}: HTTP 200 ({expected}; response body not logged)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 deploy/smoke_test.py https://YOUR-CLOUD-RUN-ORIGIN")
    try:
        check(sys.argv[1])
    except (ValueError, RuntimeError, HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        sys.exit(f"SMOKE_FAIL: {type(exc).__name__} (do not paste sensitive URLs or logs)")
