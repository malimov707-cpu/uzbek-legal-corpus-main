import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

from admin_data import load_documents, search_articles
from admin_security import (
    AdminCredentials,
    AdminSession,
    FailedLoginGuard,
    hash_password,
)
from admin_telemetry import RequestTelemetry


class AdminCredentialTests(unittest.TestCase):
    def test_password_hash_is_salted_and_verified(self):
        first = hash_password("a-private-admin-password", rounds=600_000)
        second = hash_password("a-private-admin-password", rounds=600_000)
        self.assertNotEqual(first, second)
        auth = AdminCredentials("operator", first)
        self.assertTrue(auth.configured)
        self.assertTrue(auth.accepts("operator", "a-private-admin-password"))
        self.assertFalse(auth.accepts("Operator", "a-private-admin-password"))
        self.assertFalse(auth.accepts("operator", "wrong-password"))
        self.assertFalse(auth.accepts(None, "a-private-admin-password"))
        self.assertFalse(AdminCredentials("operator", "plain-password").configured)

    def test_password_hash_rejects_weak_passwords_and_rounds(self):
        with self.assertRaises(ValueError):
            hash_password("short")
        with self.assertRaises(ValueError):
            hash_password("strong-enough-password", rounds=10)


class AdminSessionTests(unittest.TestCase):
    def test_signed_sessions_expire_and_reject_tampering(self):
        session = AdminSession("server-session-secret-with-more-than-32-chars", 60)
        token = session.issue("operator", now=100)
        self.assertEqual(session.verify(token, now=159), "operator")
        self.assertIsNone(session.verify(token, now=160))
        self.assertIsNone(session.verify(token + "x", now=101))
        self.assertIsNone(AdminSession("short").verify(token, now=101))

    def test_login_guard_counts_only_failed_attempts_and_expires_them(self):
        guard = FailedLoginGuard(2, 60)
        self.assertFalse(guard.blocked("client", now=1))
        guard.fail("client", now=2)
        guard.fail("client", now=3)
        self.assertTrue(guard.blocked("client", now=4))
        self.assertFalse(guard.blocked("other", now=4))
        self.assertFalse(guard.blocked("client", now=63))
        guard.fail("client", now=64)
        guard.succeed("client")
        self.assertFalse(guard.blocked("client", now=65))


class AdminCorpusTests(unittest.TestCase):
    def test_loads_real_manifest_rows_and_preserves_provenance(self):
        csv_content = (
            "filename,code_title,lex_uz_doc,adopted,articles_count,last_article,"
            "sha256,snapshot_date\n"
            "sample.txt,Sample Law,-1234,2020-01-02,10,11,abc,2026-07\n"
        )
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="") as file:
            file.write(csv_content)
            file.flush()
            rows = load_documents(file.name)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["code"], "sample")
        self.assertEqual(rows[0]["lex_uz_doc"], "-1234")
        self.assertEqual(rows[0]["snapshot_date"], "2026-07")

    def test_article_search_filters_paginates_and_omits_non_articles(self):
        rows = [
            {"seq": 0, "code": "law", "article_id": "_front", "text": "front"},
            {"seq": 1, "code": "law", "article_id": "1",
             "article_display": "1-modda", "title": "Mehnat",
             "text": "Ish beruvchi ish haqi toʻlaydi", "snapshot_date": "2026-07"},
            {"seq": 2, "code": "law", "article_id": "2",
             "article_display": "2-modda", "title": "Taʼtil",
             "text": "Dam olish", "snapshot_date": "2026-07"},
            {"seq": 3, "code": "other", "article_id": "1",
             "article_display": "1-modda", "title": "Ish haqi",
             "text": "Ish haqi", "snapshot_date": "2026-07"},
        ]
        result = search_articles(
            rows, query="ish haqi", code="law", page=1, page_size=1
        )
        self.assertEqual(result["total"], 1)
        self.assertEqual(result["pages"], 1)
        self.assertEqual(result["results"][0]["article_id"], "1")


class RequestTelemetryTests(unittest.TestCase):
    def test_tracks_real_counts_modes_tokens_and_rolling_window(self):
        telemetry = RequestTelemetry()
        start = telemetry.begin()
        telemetry.finish(
            start,
            status=200,
            retrieval_mode="semantic",
            prompt_tokens=12,
            completion_tokens=8,
            citation_count=2,
        )
        snapshot = telemetry.snapshot()
        self.assertEqual(snapshot["requests"], 1)
        self.assertEqual(snapshot["requests_since_start"], 1)
        self.assertEqual(snapshot["failed"], 0)
        self.assertEqual(snapshot["prompt_tokens"], 12)
        self.assertEqual(snapshot["completion_tokens"], 8)
        self.assertEqual(snapshot["citation_count"], 2)
        self.assertEqual(snapshot["retrieval_modes"], {"semantic": 1})
        self.assertEqual(len(snapshot["timeline"]), 24)

    def test_does_not_store_or_return_request_content(self):
        telemetry = RequestTelemetry()
        start = telemetry.begin()
        telemetry.finish(start, status=200, retrieval_mode="chat")
        serialized = json.dumps(telemetry.snapshot())
        self.assertNotIn("question", serialized)
        self.assertNotIn("answer", serialized)
        self.assertNotIn("citations", serialized)

    def test_finishing_a_request_twice_records_only_one_result(self):
        telemetry = RequestTelemetry()
        start = telemetry.begin()
        telemetry.finish(start, status=499)
        telemetry.finish(
            start,
            status=200,
            retrieval_mode="semantic",
            prompt_tokens=15,
            citation_count=2,
        )
        snapshot = telemetry.snapshot()
        self.assertEqual(snapshot["requests"], 1)
        self.assertEqual(snapshot["failed"], 1)
        self.assertEqual(snapshot["prompt_tokens"], 0)
        self.assertEqual(snapshot["citation_count"], 0)
        self.assertEqual(snapshot["in_flight"], 0)

    def test_snapshot_uses_only_events_inside_the_rolling_window(self):
        telemetry = RequestTelemetry(max_events=2)
        start = telemetry.begin()
        telemetry.finish(start, status=500)
        old = datetime.now(timezone.utc) - timedelta(days=2)
        with telemetry._lock:
            telemetry._events[-1]["at"] = old
        self.assertEqual(telemetry.snapshot()["requests"], 0)
        self.assertEqual(telemetry.snapshot()["failed"], 0)


if __name__ == "__main__":
    unittest.main()
