"""Password verification and signed, short-lived admin sessions."""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import secrets
from collections import defaultdict, deque
from getpass import getpass
from threading import Lock
from time import monotonic, time

_PASSWORD_SCHEME = "pbkdf2_sha256"
_MIN_PASSWORD_ROUNDS = 600_000
_MIN_SESSION_SECRET_LENGTH = 32


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_password(password: str, rounds: int = _MIN_PASSWORD_ROUNDS) -> str:
    if len(password) < 12:
        raise ValueError("Admin password must contain at least 12 characters.")
    if rounds < _MIN_PASSWORD_ROUNDS:
        raise ValueError("Password hashing rounds are below the safe minimum.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, rounds, dklen=32
    )
    return "$".join((
        _PASSWORD_SCHEME,
        str(rounds),
        _b64encode(salt),
        _b64encode(digest),
    ))


class AdminCredentials:
    def __init__(self, username: str = "", password_hash: str = ""):
        self._username = username.strip()
        self._password_hash = self._parse_hash(password_hash)

    @staticmethod
    def _parse_hash(value: str) -> tuple[int, bytes, bytes] | None:
        try:
            scheme, rounds_text, salt_text, digest_text = value.strip().split("$")
            rounds = int(rounds_text)
            salt = _b64decode(salt_text)
            digest = _b64decode(digest_text)
        except (AttributeError, ValueError):
            return None
        if (
            scheme != _PASSWORD_SCHEME
            or rounds < _MIN_PASSWORD_ROUNDS
            or rounds > 10_000_000
            or len(salt) < 16
            or len(digest) != 32
        ):
            return None
        return rounds, salt, digest

    @property
    def configured(self) -> bool:
        return (
            bool(self._username)
            and "\n" not in self._username
            and self._password_hash is not None
        )

    def accepts(self, username: str | None, password: str | None) -> bool:
        if not self.configured:
            return False
        if not isinstance(username, str) or not isinstance(password, str):
            return False
        rounds, salt, expected = self._password_hash
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, rounds, dklen=len(expected)
        )
        return (
            hmac.compare_digest(self._username.encode(), username.strip().encode())
            and hmac.compare_digest(expected, candidate)
        )

    @property
    def username(self) -> str:
        return self._username


class AdminSession:
    def __init__(self, secret: str = "", ttl_seconds: int = 28_800):
        self._secret = secret.encode("utf-8") if isinstance(secret, str) else b""
        self.ttl_seconds = ttl_seconds

    @property
    def configured(self) -> bool:
        return len(self._secret) >= _MIN_SESSION_SECRET_LENGTH and self.ttl_seconds > 0

    def issue(self, username: str, now: int | None = None) -> str:
        if not self.configured:
            raise ValueError("Admin session signing is not configured.")
        payload = json.dumps(
            {
                "username": username,
                "expires_at": (int(time()) if now is None else now) + self.ttl_seconds,
                "nonce": secrets.token_urlsafe(16),
            },
            separators=(",", ":"),
        ).encode("utf-8")
        encoded = _b64encode(payload)
        signature = hmac.new(self._secret, encoded.encode("ascii"), hashlib.sha256).digest()
        return f"{encoded}.{_b64encode(signature)}"

    def verify(self, token: str | None, now: int | None = None) -> str | None:
        if not self.configured or not isinstance(token, str):
            return None
        try:
            encoded, supplied_signature = token.split(".", 1)
            signature = _b64decode(supplied_signature)
            expected = hmac.new(
                self._secret, encoded.encode("ascii"), hashlib.sha256
            ).digest()
            if not hmac.compare_digest(expected, signature):
                return None
            payload = json.loads(_b64decode(encoded))
            expires_at = payload["expires_at"]
            username = payload["username"]
            current = int(time()) if now is None else now
            if (
                not isinstance(expires_at, int)
                or expires_at <= current
                or not isinstance(username, str)
                or not username
                or not isinstance(payload.get("nonce"), str)
            ):
                return None
            return username
        except (ValueError, TypeError, KeyError, UnicodeDecodeError, json.JSONDecodeError):
            return None


class FailedLoginGuard:
    def __init__(self, limit: int, window_seconds: int):
        if limit < 1 or window_seconds < 1:
            raise ValueError("login-guard settings must be positive")
        self.limit = limit
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def blocked(self, client: str, now: float | None = None) -> bool:
        current = monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            failures = self._failures[client]
            while failures and failures[0] <= cutoff:
                failures.popleft()
            return len(failures) >= self.limit

    def fail(self, client: str, now: float | None = None) -> None:
        current = monotonic() if now is None else now
        cutoff = current - self.window_seconds
        with self._lock:
            failures = self._failures[client]
            while failures and failures[0] <= cutoff:
                failures.popleft()
            failures.append(current)

    def succeed(self, client: str) -> None:
        with self._lock:
            self._failures.pop(client, None)


def _hash_password_cli() -> None:
    parser = argparse.ArgumentParser(description="Generate an admin password hash.")
    parser.add_argument("command", choices=["hash-password"])
    parser.parse_args()
    password = getpass("New admin password (minimum 12 characters): ")
    confirmation = getpass("Confirm admin password: ")
    if not secrets.compare_digest(password, confirmation):
        raise SystemExit("Passwords do not match.")
    try:
        print(f"HUQUQ_ADMIN_PASSWORD_HASH={hash_password(password)}")
    except ValueError as error:
        raise SystemExit(str(error)) from error


if __name__ == "__main__":
    _hash_password_cli()
