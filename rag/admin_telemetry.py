"""In-memory, privacy-preserving request metrics for the admin overview."""
from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import monotonic


@dataclass(frozen=True)
class RequestSpan:
    request_id: int
    started_at: float


class RequestTelemetry:
    def __init__(self, max_events: int = 20_000):
        self._events: deque[dict] = deque(maxlen=max_events)
        self._active: set[int] = set()
        self._started = 0
        self._next_request_id = 0
        self._lock = Lock()

    def begin(self) -> RequestSpan:
        with self._lock:
            self._next_request_id += 1
            request_id = self._next_request_id
            self._active.add(request_id)
            self._started += 1
        return RequestSpan(request_id=request_id, started_at=monotonic())

    def finish(
        self,
        span: RequestSpan,
        *,
        status: int,
        retrieval_mode: str | None = None,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        citation_count: int = 0,
    ) -> None:
        event = {
            "at": datetime.now(timezone.utc),
            "status": int(status),
            "retrieval_mode": retrieval_mode or "unavailable",
            "duration_ms": max(0, round((monotonic() - span.started_at) * 1000)),
            "prompt_tokens": max(0, int(prompt_tokens or 0)),
            "completion_tokens": max(0, int(completion_tokens or 0)),
            "citation_count": max(0, int(citation_count or 0)),
        }
        with self._lock:
            if span.request_id not in self._active:
                return
            self._active.remove(span.request_id)
            self._events.append(event)

    def snapshot(self, *, now: datetime | None = None) -> dict:
        current = now or datetime.now(timezone.utc)
        start = current - timedelta(hours=24)
        with self._lock:
            events = [event.copy() for event in self._events if event["at"] >= start]
            active = len(self._active)
            started = self._started

        requests_by_hour = Counter()
        modes = Counter()
        for event in events:
            point = event["at"].replace(
                minute=0, second=0, microsecond=0
            )
            requests_by_hour[point.isoformat()] += 1
            modes[event["retrieval_mode"]] += 1

        buckets = []
        hour = current.replace(minute=0, second=0, microsecond=0)
        for offset in range(23, -1, -1):
            point = hour - timedelta(hours=offset)
            buckets.append({
                "at": point.isoformat(),
                "requests": requests_by_hour.get(point.isoformat(), 0),
            })

        completed = [event for event in events if event["status"] < 400]
        total_latency = sum(event["duration_ms"] for event in completed)
        return {
            "window_hours": 24,
            "requests": len(events),
            "requests_since_start": started,
            "in_flight": active,
            "failed": sum(event["status"] >= 400 for event in events),
            "avg_latency_ms": (
                round(total_latency / len(completed)) if completed else None
            ),
            "prompt_tokens": sum(event["prompt_tokens"] for event in events),
            "completion_tokens": sum(
                event["completion_tokens"] for event in events
            ),
            "citation_count": sum(event["citation_count"] for event in events),
            "retrieval_modes": dict(modes),
            "timeline": buckets,
            "retention": "rolling_24h_in_process_memory",
        }
