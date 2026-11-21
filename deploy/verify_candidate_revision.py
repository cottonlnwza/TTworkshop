#!/usr/bin/env python3
"""Verify a no-traffic candidate before any production traffic switch.

This checks read-only Cloud Run API snapshots. It does NOT mutate Cloud Run,
prove DB migrations or replace an operator/Reviewer authorization gate.
"""
import argparse
import json
import re
import sys
from urllib.parse import urlsplit


class CandidateError(ValueError):
    pass


def require(ok, message):
    if not ok:
        raise CandidateError(message)


def active_routes(service):
    traffic = service.get("status", {}).get("traffic")
    require(isinstance(traffic, list) and len(traffic) > 0, "missing service traffic")
    active = []
    for route in traffic:
        require(isinstance(route, dict), "invalid route")
        # Cloud Run tag-only URLs have no `percent` key, and are not traffic.
        if "percent" not in route:
            require(bool(route.get("tag")), "route missing percent or tag")
            continue
        pct = route["percent"]
        require(type(pct) is int and 0 <= pct <= 100, "invalid traffic percent")
        if pct:
            active.append(route)
    return active


def verify_candidate(service, revision, *, main_sha, image_ref, service_url):
    require(isinstance(main_sha, str) and re.fullmatch(r"[0-9a-f]{40}", main_sha), "main SHA invalid")
    require(isinstance(image_ref, str) and re.fullmatch(r"[^\s@]+@sha256:[0-9a-f]{64}", image_ref), "digest invalid")
    require(isinstance(service_url, str) and service_url.startswith("https://")
            and bool(urlsplit(service_url).hostname), "service origin invalid")
    require(isinstance(service, dict) and isinstance(revision, dict), "snapshot not an object")
    status = service.get("status")
    require(isinstance(status, dict) and status.get("url") == service_url, "service origin mismatch")
    candidate = status.get("latestCreatedRevisionName")
    require(isinstance(candidate, str) and re.fullmatch(r"[a-z0-9-]+", candidate), "candidate name missing")
    require(status.get("latestReadyRevisionName") == candidate, "candidate not Ready")
    require(revision.get("metadata", {}).get("name") == candidate, "revision name mismatch")
    containers = revision.get("spec", {}).get("containers")
    require(isinstance(containers, list) and len(containers) == 1, "candidate container count invalid")
    require(containers[0].get("image") == image_ref, "candidate image mismatch")
    # Cloud Run's resolved image is an authoritative full image@sha256 reference.
    # Missing or malformed evidence must block traffic promotion (fail closed).
    resolved = revision.get("status", {}).get("imageDigest")
    require(isinstance(resolved, str) and resolved == image_ref,
            "candidate resolved digest missing or mismatched")
    for item in (service, revision):
        ready_conditions = [c.get("status") for c in item.get("status", {}).get("conditions", [])
                            if c.get("type") == "Ready"]
        require(ready_conditions and all(c in (True, "True") for c in ready_conditions),
                "service or candidate not Ready")
    active = active_routes(service)
    require(len(active) == 1 and active[0].get("percent") == 100,
            "existing traffic not on exactly one ready baseline")
    require(active[0].get("revisionName") != candidate,
            "candidate is receiving production traffic before approval")
    return candidate, image_ref.split("@", 1)[1]


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
        name, digest = verify_candidate(service, revision, main_sha=args.main_sha,
                                        image_ref=args.image_ref, service_url=args.service_url)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        print(f"CANDIDATE_FAIL: {type(exc).__name__}", file=sys.stderr)
        return 1
    print(f"CANDIDATE_PASS: main={args.main_sha} ready={name} digest={digest} traffic=0%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
