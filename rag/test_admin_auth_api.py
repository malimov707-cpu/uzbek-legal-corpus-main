"""In-process tests for the real admin auth routes without loading the model."""
from __future__ import annotations

import os
import sys
import types
import unittest
from types import SimpleNamespace

from admin_security import FailedLoginGuard, hash_password

os.environ["HUQUQ_ADMIN_USERNAME"] = "test-operator"
os.environ["HUQUQ_ADMIN_PASSWORD_HASH"] = hash_password(
    "test-only-private-password", rounds=600_000
)
os.environ["HUQUQ_ADMIN_SESSION_SECRET"] = "test-only-session-secret-with-more-than-32-chars"

pipeline = types.ModuleType("pipeline")
pipeline.UpstreamUnavailable = type("UpstreamUnavailable", (Exception,), {})
pipeline.get_rag = lambda: SimpleNamespace(
    index=SimpleNamespace(articles=[], slugs=[])
)
pipeline.history_len = lambda: 0
pipeline.last_usage = lambda since=None: {}
pipeline.stream_answer = lambda *args, **kwargs: iter(())
sys.modules["pipeline"] = pipeline

from fastapi.testclient import TestClient

import server


class AdminAuthRouteTests(unittest.TestCase):
    def setUp(self):
        server._admin_login_guard = FailedLoginGuard(5, 60)
        self.client = TestClient(server.app, base_url="https://testserver")
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def login(self):
        return self.client.post(
            "/api/admin/session",
            headers={"X-Admin-Request": "1"},
            json={
                "username": "test-operator",
                "password": "test-only-private-password",
            },
        )

    def test_requires_custom_header_and_valid_login(self):
        self.assertEqual(self.client.get("/api/admin/session").status_code, 403)
        unauthenticated = self.client.get(
            "/api/admin/session",
            headers={"X-Admin-Request": "1"},
        )
        self.assertEqual(unauthenticated.status_code, 401)
        self.assertEqual(self.login().status_code, 200)

    def test_login_issues_secure_httponly_samesite_cookie(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        cookie = response.headers["set-cookie"].lower()
        self.assertIn("httponly", cookie)
        self.assertIn("secure", cookie)
        self.assertIn("samesite=strict", cookie)
        self.assertIn("path=/api/admin", cookie)
        self.assertEqual(self.client.get(
            "/api/admin/session",
            headers={"X-Admin-Request": "1"},
        ).json(), {"authenticated": True, "username": "test-operator"})

    def test_wrong_credentials_are_generic_and_rate_limited(self):
        for _ in range(5):
            response = self.client.post(
                "/api/admin/session",
                headers={"X-Admin-Request": "1"},
                json={"username": "test-operator", "password": "incorrect"},
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["detail"]["message"], "Username yoki parol notoʻgʻri.")
        limited = self.login()
        self.assertEqual(limited.status_code, 429)

    def test_logout_deletes_cookie_and_revokes_browser_session(self):
        self.assertEqual(self.login().status_code, 200)
        logout = self.client.post(
            "/api/admin/logout",
            headers={"X-Admin-Request": "1"},
        )
        self.assertEqual(logout.status_code, 200)
        self.assertIn("max-age=0", logout.headers["set-cookie"].lower())
        self.assertEqual(self.client.get(
            "/api/admin/session",
            headers={"X-Admin-Request": "1"},
        ).status_code, 401)


if __name__ == "__main__":
    unittest.main()
