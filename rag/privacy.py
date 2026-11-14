"""Best-effort redaction of common Uzbek personal and financial identifiers."""
from __future__ import annotations

import re

_IDENTIFIERS = (
    re.compile(r"(?<!\d)(?:\d[ -]?){13}\d(?!\d)"),
    re.compile(r"(?<!\d)(?:\d[ -]?){15}\d(?!\d)"),
    re.compile(r"(?<![A-Z0-9])[A-Z]{2}\s?\d{7}(?!\d)", re.IGNORECASE),
    re.compile(r"(?<!\d)(?:\+?998[ -]?)?(?:\d[ -]?){8}\d(?!\d)"),
)

REDACTION = "[maxfiy maʼlumot olib tashlandi]"


def redact_sensitive_text(text: str) -> str:
    for pattern in _IDENTIFIERS:
        text = pattern.sub(REDACTION, text)
    return text


def redact_messages(messages: list[dict]) -> list[dict]:
    return [
        {
            **message,
            "content": redact_sensitive_text(message["content"]),
        }
        for message in messages
    ]
