"""Isolated stdlib tests: verify live smoke guard without network/cloud traffic."""
import unittest
from unittest.mock import patch

from deploy.smoke_test import check


ORIGIN = "https://ttworkshop.example.test"


class FakeResponse:
    def __init__(self, url, body=b"", status=200):
        self.url = url
        self.body = body
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def read(self, _limit):
        return self.body

    def geturl(self):
        return self.url


class SmokeTest(unittest.TestCase):
    def test_passes_read_only_live_health_and_root(self):
        requests = []

        def reply(request, timeout):
            requests.append((request.full_url, request.get_method(), timeout))
            if request.full_url.endswith("/health"):
                return FakeResponse(request.full_url, b'{"status":"ok"}')
            return FakeResponse(request.full_url, b"<!doctype html><html></html>")

        with patch("deploy.smoke_test.urlopen", side_effect=reply), patch("builtins.print"):
            check(ORIGIN)
        self.assertEqual(requests, [
            (ORIGIN + "/health", "GET", 15), (ORIGIN + "/", "GET", 15)
        ])

    def test_rejects_insecure_or_malformed_origins_before_network(self):
        bad = (
            "http://ttworkshop.example.test", "https://user:pass@ttworkshop.example.test",
            "https://ttworkshop.example.test/other", "https://ttworkshop.example.test/?q=x",
            "https://ttworkshop.example.test/#frag", "https://ttworkshop.example.test:wrong",
        )
        with patch("deploy.smoke_test.urlopen") as network:
            for origin in bad:
                with self.subTest(origin=origin), self.assertRaises(ValueError):
                    check(origin)
            network.assert_not_called()

    def test_rejects_database_unavailable(self):
        with patch("deploy.smoke_test.urlopen", return_value=FakeResponse(ORIGIN + "/health", b'{"status":"unavailable"}')):
            with self.assertRaisesRegex(RuntimeError, "readiness"):
                check(ORIGIN)

    def test_rejects_spa_html_at_database_health_url(self):
        # Regression for SERVE_WEB SPA middleware intercepting /health.
        with patch("deploy.smoke_test.urlopen", return_value=FakeResponse(
            ORIGIN + "/health", b"<!doctype html><html>Not DB readiness</html>"
        )):
            with self.assertRaises(ValueError):
                check(ORIGIN)

    def test_rejects_http_503_database_health(self):
        # Healthy HTML at / must not mask a failed DB probe at /health.
        with patch("deploy.smoke_test.urlopen", return_value=FakeResponse(
            ORIGIN + "/health", b'{"status":"unavailable"}', status=503
        )):
            with self.assertRaisesRegex(RuntimeError, "HTTP 503"):
                check(ORIGIN)

    def test_rejects_200_non_html(self):
        def reply(request, _timeout=None, **_kwargs):
            if request.full_url.endswith("/health"):
                return FakeResponse(request.full_url, b'{"status":"ok"}')
            return FakeResponse(request.full_url, b"not a browser page")

        with patch("deploy.smoke_test.urlopen", side_effect=reply), patch("builtins.print"):
            with self.assertRaisesRegex(RuntimeError, "not HTML"):
                check(ORIGIN)

    def test_rejects_downgrade_or_cross_origin_redirect(self):
        for redirected in ("http://ttworkshop.example.test/health", "https://elsewhere.example.test/health"):
            with self.subTest(redirected=redirected):
                with patch("deploy.smoke_test.urlopen", return_value=FakeResponse(redirected, b'{"status":"ok"}')):
                    with self.assertRaisesRegex(RuntimeError, "redirected"):
                        check(ORIGIN)


if __name__ == "__main__":
    unittest.main()
