import unittest

from chat_rate_limit import SlidingWindowLimiter


class SlidingWindowLimiterTests(unittest.TestCase):
    def test_allows_only_limit_within_window(self):
        limiter = SlidingWindowLimiter(2, 60)
        self.assertTrue(limiter.allow("client", now=1))
        self.assertTrue(limiter.allow("client", now=2))
        self.assertFalse(limiter.allow("client", now=3))

    def test_expires_old_requests_and_separates_clients(self):
        limiter = SlidingWindowLimiter(1, 10)
        self.assertTrue(limiter.allow("one", now=1))
        self.assertTrue(limiter.allow("two", now=1))
        self.assertFalse(limiter.allow("one", now=5))
        self.assertTrue(limiter.allow("one", now=11))

    def test_rejects_invalid_configuration(self):
        with self.assertRaises(ValueError):
            SlidingWindowLimiter(0, 60)
        with self.assertRaises(ValueError):
            SlidingWindowLimiter(2, 0)


if __name__ == "__main__":
    unittest.main()
