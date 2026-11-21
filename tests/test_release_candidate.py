"""Read-only candidate verifier tests; no GCP access or deployment."""
import unittest
from deploy.verify_candidate_revision import CandidateError, verify_candidate

SHA = "a" * 40
IMAGE = "asia-southeast1-docker.pkg.dev/cpe334-ttworkshop/ttworkshop/app@sha256:" + "b" * 64
URL = "https://ttworkshop-test.a.run.app"
CANDIDATE = "ttworkshop-00024-candidate"
OLD = "ttworkshop-00023-old"


def snapshots():
    service = {"status": {"url": URL, "latestCreatedRevisionName": CANDIDATE,
                          "latestReadyRevisionName": CANDIDATE,
                          "conditions": [{"type": "Ready", "status": "True"}],
                          "traffic": [{"revisionName": OLD, "percent": 100},
                                      {"revisionName": OLD, "tag": "previous",
                                       "url": "https://previous.example.run.app"}]}}
    revision = {"metadata": {"name": CANDIDATE},
                "spec": {"containers": [{"image": IMAGE}]},
                "status": {"imageDigest": IMAGE,
                           "conditions": [{"type": "Ready", "status": "True"}]}}
    return service, revision


class CandidateVerificationTest(unittest.TestCase):
    def check(self, svc, rev, **kwargs):
        return verify_candidate(svc, rev, **({"main_sha": SHA, "image_ref": IMAGE,
                                              "service_url": URL} | kwargs))

    def test_zero_traffic_ready_candidate_accepted(self):
        svc, rev = snapshots()
        self.assertEqual(self.check(svc, rev), (CANDIDATE, "sha256:" + "b" * 64))

    def test_new_candidate_still_not_ready_rejected(self):
        svc, rev = snapshots()
        svc["status"]["latestReadyRevisionName"] = OLD
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_candidate_is_serving_traffic_rejected(self):
        svc, rev = snapshots()
        svc["status"]["traffic"][0]["revisionName"] = CANDIDATE
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_split_baseline_traffic_rejected(self):
        svc, rev = snapshots()
        svc["status"]["traffic"][0]["percent"] = 95
        svc["status"]["traffic"].append({"revisionName": "other", "percent": 5})
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_bad_image_rejected(self):
        svc, rev = snapshots()
        rev["spec"]["containers"][0]["image"] = IMAGE[:-1] + "c"
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_bad_resolved_image_rejected(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = IMAGE[:-1] + "c"
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_missing_resolved_digest_rejected(self):
        svc, rev = snapshots()
        rev["status"].pop("imageDigest")
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_null_resolved_digest_rejected(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = None
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_malformed_prefix_resolved_digest_rejected(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = "nonsense-prefix:" + IMAGE.rsplit("@", 1)[-1]
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_other_repository_same_digest_rejected(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = "other.registry/example/app@" + IMAGE.rsplit("@", 1)[-1]
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_digest_only_rejected_without_authoritative_image_identity(self):
        svc, rev = snapshots()
        rev["status"]["imageDigest"] = IMAGE.rsplit("@", 1)[-1]
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_revision_mismatch_rejected(self):
        svc, rev = snapshots()
        rev["metadata"]["name"] = OLD
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_missing_ready_rejected(self):
        svc, rev = snapshots()
        rev["status"]["conditions"] = [{"type": "Ready", "status": "False"}]
        with self.assertRaises(CandidateError): self.check(svc, rev)

    def test_wrong_main_sha_rejected(self):
        svc, rev = snapshots()
        with self.assertRaises(CandidateError): self.check(svc, rev, main_sha="abc")

    def test_wrong_origin_rejected(self):
        svc, rev = snapshots()
        with self.assertRaises(CandidateError): self.check(svc, rev, service_url="https://wrong.run.app")

    def test_malformed_tag_only_route_rejected(self):
        svc, rev = snapshots()
        svc["status"]["traffic"].append({"revisionName": "tagless"})
        with self.assertRaises(CandidateError): self.check(svc, rev)


if __name__ == "__main__":
    unittest.main()
