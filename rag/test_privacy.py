import unittest

from privacy import REDACTION, redact_messages, redact_sensitive_text


class PrivacyTests(unittest.TestCase):
    def test_redacts_common_identifiers(self):
        text = (
            "JShShIR 12345678901234, karta 8600123412341234, "
            "pasport AB1234567, telefon +998 90 123 45 67."
        )
        redacted = redact_sensitive_text(text)
        self.assertEqual(redacted.count(REDACTION), 4)
        for value in ("12345678901234", "8600123412341234", "AB1234567", "+998 90 123"):
            self.assertNotIn(value, redacted)

    def test_message_redaction_preserves_turn_shape(self):
        messages = [
            {"role": "user", "content": "ID 12345678901234"},
            {"role": "assistant", "content": "Tushundim"},
        ]
        result = redact_messages(messages)
        self.assertEqual(result[0]["role"], "user")
        self.assertIn(REDACTION, result[0]["content"])
        self.assertEqual(result[1]["content"], "Tushundim")
        self.assertEqual(messages[0]["content"], "ID 12345678901234")


if __name__ == "__main__":
    unittest.main()
