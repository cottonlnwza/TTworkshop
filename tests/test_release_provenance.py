"""Isolated Cloud Run API snapshots; NO GCP network calls or credentials."""
import unittest
from deploy.verify_serving_revision import ProvenanceError, verify

SHA = "c" * 40
IMAGE = "asia-southeast1-docker.pkg.dev/cpe334-ttworkshop/ttworkshop/app@sha256:" + "d" * 64
URL = "https://ttworkshop-test.a.run.app"
REV = "ttworkshop-00017-test"


def snapshots():
    service = {"status": {
        "url": URL, "latestReadyRevisionName": REV,
        "latestCreatedRevisionName": REV,
        "traffic": [{"revisionName": REV, "percent": 100}],
        "conditions": [{"type": "Ready", "status": "True"}]}}
    revision = {"metadata": {"name": REV}, "spec": {"containers": [{"image": IMAGE}]},
                "status": {"imageDigest": IMAGE, "conditions": [{"type": "Ready", "status": "True"}]}}
    return service, revision


class ReleaseProvenanceTest(unittest.TestCase):
    def check(self, service, revision, **overrides):
        return verify(service, revision, **({"main_sha": SHA, "image_ref": IMAGE,
                                             "service_url": URL} | overrides))

    def test_matching_digest_and_full_ready_revision_traffic(self):
        svc, rev = snapshots()
        self.assertEqual(self.check(svc, rev), (REV, "sha256:" + "d" * 64))

    def test_zero_percent_tag_is_ignored(self):
        svc, rev = snapshots()
        svc["status"]["traffic"].append({"revisionName": "old-tag", "percent": 0})
        self.check(svc, rev)

    def test_tag_only_url_without_percent_is_ignored(self):
        svc, rev = snapshots()
        svc["status"]["traffic"].insert(0, {"revisionName": "old", "tag": "preflight",
                                            "url": "https://old-tag.example.run.app"})
        self.check(svc, rev)

    def test_missing_percent_without_tag_is_rejected(self):
        svc, rev = snapshots()
        svc["status"]["traffic"].append({"revisionName": "old"})
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_old_revision_receives_all_traffic(self):
        svc, rev = snapshots()
        svc["status"]["traffic"] = [{"revisionName": "old", "percent": 100}]
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_traffic_split_is_rejected(self):
        svc, rev = snapshots()
        svc["status"]["traffic"] = [{"revisionName": REV, "percent": 70},
                                       {"revisionName": "old", "percent": 30}]
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_revision_wrong_image_digest_is_rejected(self):
        svc, rev = snapshots()
        rev["spec"]["containers"][0]["image"] = IMAGE[:-1] + "e"
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_resolved_image_digest_mismatch_is_rejected(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = IMAGE[:-1] + "e"
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_newer_revision_is_not_ready(self):
        svc, rev = snapshots()
        svc["status"]["latestCreatedRevisionName"] = "newer-pending"
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_non_matching_service_origin(self):
        svc, rev = snapshots()
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev, service_url="https://other.a.run.app")

    def test_short_reviewed_sha_is_rejected(self):
        svc, rev = snapshots()
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev, main_sha="c2d9b09")

    def test_not_ready_revision(self):
        svc, rev = snapshots()
        rev["status"]["conditions"] = [{"type": "Ready", "status": "False"}]
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)

    def test_missing_traffic_is_rejected(self):
        svc, rev = snapshots()
        del svc["status"]["traffic"]
        with self.assertRaises(ProvenanceError):
            self.check(svc, rev)


if __name__ == "__main__":
    unittest.main()
