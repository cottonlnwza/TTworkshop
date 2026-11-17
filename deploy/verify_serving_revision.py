#!/usr/bin/env python3
"""Read-only, fail-closed check: HTTPS traffic serves the reviewed image digest.

This verifies Cloud Run API snapshots, not an authenticated application journey,
DB persistence, or the integrity of the operator's external cloud credentials.
"""
import argparse
import json
import re
import sys
from urllib.parse import urlsplit

_SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
_IMAGE_RE = re.compile(r"[^\s@]+@sha256:[0-9a-f]{64}\Z")


class ProvenanceError(ValueError):
    pass


def _require(condition, message):
    if not condition:
        raise ProvenanceError(message)


def verify(service, revision, *, main_sha, image_ref, service_url):
    """Return release revision/digest only when all service-routing checks pass."""
    _require(isinstance(main_sha, str) and _SHA_RE.fullmatch(main_sha),
             "reviewed main SHA must contain exactly 40 lowercase hex digits")
    _require(isinstance(image_ref, str) and _IMAGE_RE.fullmatch(image_ref),
             "expected image must use an immutable sha256 digest")
    _require(isinstance(service_url, str) and service_url.startswith("https://")
             and bool(urlsplit(service_url).hostname), "expected HTTPS service URL is invalid")
    _require(isinstance(service, dict) and isinstance(revision, dict),
             "Cloud Run service and revision must be JSON objects")
    status = service.get("status")
    _require(isinstance(status, dict), "Cloud Run service status missing")
    _require(status.get("url") == service_url, "service HTTPS origin differs from reviewed URL")
    ready = status.get("latestReadyRevisionName")
    _require(isinstance(ready, str) and bool(ready), "no latest ready revision")
    _require(status.get("latestCreatedRevisionName", ready) == ready,
             "a newer revision is not ready")
    _require(revision.get("metadata", {}).get("name") == ready,
             "inspected revision differs from latest ready revision")
    containers = revision.get("spec", {}).get("containers")
    _require(isinstance(containers, list) and len(containers) == 1,
             "expected exactly one production application container")
    _require(isinstance(containers[0], dict) and containers[0].get("image") == image_ref,
             "serving revision image is not the approved immutable digest")
    resolved = revision.get("status", {}).get("imageDigest")
    if resolved is not None:
        _require(isinstance(resolved, str) and resolved.endswith(image_ref.split("@", 1)[1]),
                 "Cloud Run resolved image digest differs from approved image")
    for obj in (service, revision):
        for condition in obj.get("status", {}).get("conditions", []):
            if condition.get("type") == "Ready":
                _require(condition.get("status") in (True, "True"),
                         "Cloud Run service or revision is not ready")
    traffic = status.get("traffic")
    _require(isinstance(traffic, list) and bool(traffic), "no reported serving traffic")
    active = []
    for route in traffic:
        _require(isinstance(route, dict), "invalid Cloud Run traffic record")
        percent = route.get("percent")
        _require(type(percent) is int and 0 <= percent <= 100,
                 "invalid reported traffic percentage")
        if percent:
            active.append(route)
    _require(len(active) == 1 and active[0].get("percent") == 100
             and active[0].get("revisionName") == ready,
             "production traffic is split or serves an unexpected revision")
    return ready, image_ref.split("@", 1)[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("service_json")
    parser.add_argument("revision_json")
    parser.add_argument("--main-sha", required=True)
    parser.add_argument("--image-ref", required=True)
    parser.add_argument("--service-url", required=True)
    args = parser.parse_args()
    try:
        with open(args.service_json, encoding="utf-8") as f:
            service = json.load(f)
        with open(args.revision_json, encoding="utf-8") as f:
            revision = json.load(f)
        name, digest = verify(service, revision, main_sha=args.main_sha,
                              image_ref=args.image_ref, service_url=args.service_url)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        # Do not print CLI args, Cloud Run JSON, URLs, or API exception details.
        print(f"RELEASE_PROVENANCE_FAIL: {type(exc).__name__}", file=sys.stderr)
        return 1
    print(f"RELEASE_PROVENANCE_PASS: main={args.main_sha} ready_revision={name} image_digest={digest} traffic=100%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
