"""OpenAI-compatible API and same-origin web app for the legal RAG pipeline.

Same contract the old rag_server exposed (POST /v1/chat/completions), so nothing
on the frontend changes except VAST_API_URL. `citations` is an extra top-level
field -- clients that ignore it are unaffected.
"""
import asyncio
import json
import os
import resource
import shutil
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from starlette.concurrency import iterate_in_threadpool

import config as C
from admin_data import article_detail, load_documents, search_articles
from admin_security import AdminCredentials, AdminSession, FailedLoginGuard
from admin_telemetry import RequestTelemetry
from api_keys import KeyAuth, KeyAuthError
from chat_rate_limit import SlidingWindowLimiter
from privacy import redact_messages
from request_shape import (history_and_context, last_question,
                           normalize_messages)
from pipeline import (UpstreamUnavailable, get_rag, history_len,
                      last_usage, stream_answer)

app = FastAPI(title="Tomaris legal RAG")
_cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware, allow_origins=_cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Admin-Request"],
)
if "*" in _cors_origins:
    raise ValueError("CORS_ORIGINS must list trusted origins; wildcard CORS is disabled")

# Per-customer keys protect the legacy /v1 and /retrieve APIs. The browser
# endpoint is public by design and has its own per-IP request limit.
_keyauth = KeyAuth.from_env()
_admin_credentials = AdminCredentials(
    C.ADMIN_USERNAME, C.ADMIN_PASSWORD_HASH
)
_admin_session = AdminSession(
    C.ADMIN_SESSION_SECRET, C.ADMIN_SESSION_TTL_SECONDS
)
_admin_login_guard = FailedLoginGuard(
    C.ADMIN_LOGIN_RATE_LIMIT, C.ADMIN_LOGIN_RATE_WINDOW_SECONDS
)
_request_telemetry = RequestTelemetry()
_app_started = time.monotonic()
_public_chat_limiter = SlidingWindowLimiter(
    C.PUBLIC_CHAT_RATE_LIMIT, C.PUBLIC_CHAT_RATE_WINDOW_SECONDS
)
_web_dist = Path(__file__).resolve().parent.parent / "web" / "dist"
_web_assets = _web_dist / "assets"
if _web_assets.is_dir():
    from fastapi.staticfiles import StaticFiles
    app.mount("/assets", StaticFiles(directory=_web_assets), name="assets")


def _log_chat_metadata(mode, citations, started_at):
    if not C.CHAT_LOG_ENABLED:
        return
    try:
        with open(C.CHAT_LOG, "a", encoding="utf-8") as log:
            log.write(json.dumps({
                "t": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "mode": mode,
                "citation_count": len(citations),
                "seconds": round(time.time() - started_at, 1),
            }) + "\n")
    except OSError as error:
        print(f"[chat-metadata-log-failed] {type(error).__name__}")


@app.middleware("http")
async def tolerate_doubled_base(request: Request, call_next):
    """Accept a base URL that already includes the endpoint path.

    Clients configured with VAST_API_URL=".../v1/chat/completions" append their
    own "/v1/..." and arrive as "/v1/chat/completions/v1/models". Rather than
    404 and look like an outage, strip the duplicated prefix.
    """
    path = request.url.path
    marker = "/v1/chat/completions/v1/"
    if marker in path:
        request.scope["path"] = path[path.index(marker) + len("/v1/chat/completions"):]
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=()"
    )
    if request.url.path == "/admin" or request.url.path.startswith(
        ("/admin/", "/api/admin/")
    ):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; base-uri 'self'; object-src 'none'; "
            "frame-ancestors 'none'; form-action 'self'; script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
            "connect-src 'self'"
        )
    if request.url.path.startswith(("/api/", "/v1/chat/completions", "/retrieve")):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.on_event("startup")
def warm():
    idx = get_rag().index
    print(f"[ready] {len(idx.articles)} articles, {len(idx.slugs)} codes")


@app.get("/health")
def health():
    idx = get_rag().index
    return {"ok": True, "articles": len(idx.articles), "codes": len(idx.slugs)}


@app.get("/")
def frontend():
    index = _web_dist / "index.html"
    if not index.is_file():
        return JSONResponse(status_code=503, content={
            "error": "Frontend is not built. Run npm run build from the repository root."
        })
    return FileResponse(index)


@app.get("/admin")
@app.get("/admin/{admin_path:path}")
def admin_frontend(admin_path: str = ""):
    index = _web_dist / "admin" / "index.html"
    if not index.is_file():
        return JSONResponse(status_code=503, content={
            "error": "Frontend is not built. Run npm run build from the repository root."
        })
    return FileResponse(index)


@app.get("/favicon.svg")
def favicon():
    icon_path = _web_dist / "favicon.svg"
    if not icon_path.is_file():
        return JSONResponse(status_code=404, content={"error": "Not found"})
    return FileResponse(icon_path, media_type="image/svg+xml")


def _client_id(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _require_admin_request_header(request: Request) -> None:
    if request.headers.get("x-admin-request") != "1":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "admin_request_header_required",
                "message": "Admin request validation failed.",
            },
        )


def _require_admin(request: Request) -> str:
    if not _admin_credentials.configured or not _admin_session.configured:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "admin_not_configured",
                "message": "Admin login is not configured on this server.",
            },
        )
    _require_admin_request_header(request)
    username = _admin_session.verify(
        request.cookies.get("huquq_admin_session")
    )
    if not username:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "admin_auth_required",
                "message": "Admin session is missing or expired. Sign in again.",
            },
        )
    return username


def _corpus_documents() -> list[dict]:
    path = Path(__file__).resolve().parent.parent / "manifest.csv"
    return load_documents(path)


def _probe_model() -> dict:
    endpoint = f"{C.VLLM_BASE.rstrip('/')}/models"
    started = time.monotonic()
    request = URLRequest(
        endpoint,
        headers={"Authorization": f"Bearer {C.VLLM_KEY}"},
    )
    try:
        with urlopen(request, timeout=2.5) as response:
            data = json.loads(response.read(2_000_000))
        rows = data.get("data") if isinstance(data, dict) else None
        model_ids = [
            row["id"] for row in rows
            if isinstance(row, dict) and isinstance(row.get("id"), str)
        ] if isinstance(rows, list) else []
        if not model_ids:
            return {
                "status": "degraded",
                "model_id": C.VLLM_MODEL,
                "served_models": [],
                "latency_ms": round((time.monotonic() - started) * 1000),
                "message": "Model endpoint responded with an unexpected models payload.",
            }
        if C.VLLM_MODEL not in model_ids:
            return {
                "status": "degraded",
                "model_id": C.VLLM_MODEL,
                "served_models": model_ids,
                "latency_ms": round((time.monotonic() - started) * 1000),
                "message": "Configured model is not listed by the inference endpoint.",
            }
        return {
            "status": "online",
            "model_id": C.VLLM_MODEL,
            "served_models": model_ids,
            "latency_ms": round((time.monotonic() - started) * 1000),
            "message": "",
        }
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        return {
            "status": "offline",
            "model_id": C.VLLM_MODEL,
            "served_models": [],
            "latency_ms": None,
            "message": "Model endpoint did not respond to GET /v1/models.",
        }


def _process_telemetry() -> dict:
    usage = resource.getrusage(resource.RUSAGE_SELF)
    peak_rss = usage.ru_maxrss / (1024 * 1024 if sys.platform == "darwin" else 1024)
    gpu = {"status": "unavailable", "reason": "nvidia-smi is not installed"}
    executable = shutil.which("nvidia-smi")
    if executable:
        try:
            result = subprocess.run(
                [
                    executable,
                    "--query-gpu=utilization.gpu,memory.used,memory.total",
                    "--format=csv,noheader,nounits",
                ],
                check=True,
                capture_output=True,
                text=True,
                timeout=1.5,
            )
            first = result.stdout.splitlines()[0].split(",")
            gpu = {
                "status": "online",
                "utilization_percent": int(first[0].strip()),
                "memory_used_mb": int(first[1].strip()),
                "memory_total_mb": int(first[2].strip()),
            }
        except (OSError, subprocess.SubprocessError, IndexError, ValueError):
            gpu = {
                "status": "unavailable",
                "reason": "GPU telemetry could not be read from nvidia-smi",
            }
    return {
        "process_cpu_seconds": round(usage.ru_utime + usage.ru_stime, 2),
        "process_peak_rss_mb": round(peak_rss, 1),
        "gpu": gpu,
        "postgresql": {"status": "not_configured"},
        "redis": {"status": "not_configured"},
        "queue_workers": {"status": "not_configured"},
    }


@app.post("/api/admin/session")
async def admin_session(request: Request):
    if not _admin_credentials.configured or not _admin_session.configured:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "admin_not_configured",
                "message": "Admin login is not configured on this server.",
            },
        )
    _require_admin_request_header(request)
    client = _client_id(request)
    if _admin_login_guard.blocked(client):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "admin_login_rate_limited",
                "message": "Too many invalid admin sign-in attempts. Try again later.",
            },
        )
    try:
        body = await request.json()
    except (ValueError, json.JSONDecodeError):
        body = None
    username = body.get("username") if isinstance(body, dict) else None
    password = body.get("password") if isinstance(body, dict) else None
    if (
        not isinstance(username, str)
        or not isinstance(password, str)
        or len(username) > 256
        or len(password) > 4096
        or len(password.encode("utf-8")) > 16_384
    ):
        _admin_login_guard.fail(client)
        raise HTTPException(
            status_code=401,
            detail={
                "code": "admin_auth_required",
                "message": "Username yoki parol notoʻgʻri.",
            },
        )
    if not _admin_credentials.accepts(username, password):
        _admin_login_guard.fail(client)
        raise HTTPException(
            status_code=401,
            detail={
                "code": "admin_auth_required",
                "message": "Username yoki parol notoʻgʻri.",
            },
        )
    _admin_login_guard.succeed(client)
    response = JSONResponse({
        "authenticated": True,
        "username": _admin_credentials.username,
        "expires_in": _admin_session.ttl_seconds,
    })
    response.set_cookie(
        "huquq_admin_session",
        _admin_session.issue(_admin_credentials.username),
        max_age=_admin_session.ttl_seconds,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="strict",
        path="/api/admin",
    )
    return response


@app.get("/api/admin/session")
def admin_session_status(request: Request):
    username = _require_admin(request)
    return {"authenticated": True, "username": username}


@app.post("/api/admin/logout")
def admin_logout(request: Request):
    _require_admin_request_header(request)
    response = JSONResponse({"authenticated": False})
    response.delete_cookie(
        "huquq_admin_session",
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="strict",
        path="/api/admin",
    )
    return response


@app.get("/api/admin/overview")
def admin_overview(request: Request):
    _require_admin(request)
    rag = get_rag()
    documents = _corpus_documents()
    articles = [
        row for row in rag.index.articles
        if row.get("article_id") not in ("_front", "_end")
    ]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.monotonic() - _app_started),
        "corpus": {
            "snapshot_date": max(
                (row["snapshot_date"] for row in documents), default="unknown"
            ),
            "documents": len(documents),
            "articles": len(articles),
            "manifest_articles": sum(
                row["articles_count"] for row in documents
            ),
            "documents_with_source_ids": sum(
                bool(row["lex_uz_doc"]) for row in documents
            ),
        },
        "model": _probe_model(),
        "requests": _request_telemetry.snapshot(),
        "infrastructure": _process_telemetry(),
        "integrations": {
            "users": {"status": "not_configured", "reason": "No user database or sign-in provider is configured."},
            "citation_audit_metrics": {"status": "not_configured", "reason": "The RAG pipeline audits citations but does not persist aggregate audit events."},
            "inference_cost": {"status": "not_configured", "reason": "No provider pricing or billing feed is configured."},
            "ingestion_jobs": {"status": "not_configured", "reason": "The repository has corpus build scripts but no job queue or ingestion API."},
            "document_intelligence": {"status": "not_configured", "reason": "No PDF/DOCX library or analysis worker is configured."},
            "audit_log": {"status": "not_configured", "reason": "No persistent security audit-log store is configured."},
            "corpus_history": {"status": "not_configured", "reason": "Only the current 2026-07 corpus snapshot is available."},
        },
        "rate_limit": {
            "requests": C.PUBLIC_CHAT_RATE_LIMIT,
            "window_seconds": C.PUBLIC_CHAT_RATE_WINDOW_SECONDS,
            "scope": "per_process",
        },
    }


@app.get("/api/admin/corpus/documents")
def admin_documents(
    request: Request,
    page: int = 1,
    page_size: int = 25,
    query: str = "",
):
    _require_admin(request)
    documents = _corpus_documents()
    needle = query.casefold().strip()
    if needle:
        documents = [
            row for row in documents
            if needle in row["title"].casefold()
            or needle in row["code"].casefold()
        ]
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    start = (page - 1) * page_size
    return {
        "page": page,
        "page_size": page_size,
        "total": len(documents),
        "pages": (len(documents) + page_size - 1) // page_size,
        "results": documents[start:start + page_size],
    }


@app.get("/api/admin/corpus/articles")
def admin_articles(
    request: Request,
    query: str = "",
    code: str = "",
    page: int = 1,
    page_size: int = 25,
):
    _require_admin(request)
    articles = get_rag().index.articles
    return search_articles(
        articles, query=query, code=code, page=page, page_size=page_size
    )


@app.get("/api/admin/corpus/article")
def admin_article_detail(request: Request, code: str, article_id: str):
    _require_admin(request)
    article = article_detail(
        get_rag().index.articles, code=code, article_id=article_id
    )
    if article is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "article_not_found",
                "message": "Article was not found in the current corpus snapshot.",
            },
        )
    return article


@app.get("/api/admin/ai/config")
def admin_ai_config(request: Request):
    _require_admin(request)
    from pipeline import SYSTEM, SYSTEM_RU
    return {
        "model": C.VLLM_MODEL,
        "temperature": C.TEMPERATURE,
        "chat_temperature": C.CHAT_TEMPERATURE,
        "max_tokens": C.MAX_TOKENS,
        "top_k": C.TOP_K,
        "legal_distance": C.LEGAL_DISTANCE,
        "history_turns": C.HISTORY_TURNS,
        "query_device": C.QUERY_DEVICE,
        "corpus_source": C.CORPUS_SOURCE,
        "prompt_rules": {
            "uzbek_latin": SYSTEM,
            "russian": SYSTEM_RU,
        },
    }


@app.get("/api/admin/evaluations")
def admin_evaluations(request: Request):
    _require_admin(request)
    path = Path(__file__).resolve().parent / "eval" / "gold_situations.jsonl"
    cases = 0
    if path.is_file():
        with path.open(encoding="utf-8") as stream:
            cases = sum(1 for line in stream if line.strip())
    return {
        "dataset": "gold_situations.jsonl",
        "cases": cases,
        "result_status": "not_run",
        "saved_result_available": False,
    }


@app.get("/api/admin/security")
def admin_security(request: Request):
    _require_admin(request)
    return {
        "admin_credentials_configured": (
            _admin_credentials.configured and _admin_session.configured
        ),
        "legacy_api_keys_configured": bool(
            os.getenv("TOMARIS_API_KEYS", "").strip()
        ),
        "chat_rate_limit": {
            "requests": C.PUBLIC_CHAT_RATE_LIMIT,
            "window_seconds": C.PUBLIC_CHAT_RATE_WINDOW_SECONDS,
            "scope": "per_process",
        },
        "failed_admin_logins": {
            "status": "in_memory_rate_limit_only",
            "persistent_audit_log": False,
        },
        "user_sessions": {"status": "not_configured"},
        "permissions": {"status": "single_admin_account"},
        "audit_log": {"status": "not_configured"},
    }


@app.get("/v1/models")
def models():
    """OpenAI-compatible model list.

    Clients probe this to decide whether a backend is reachable -- without it
    the frontend reports "not connected" and falls back to demo responses even
    though chat completions work.
    """
    return {
        "object": "list",
        "data": [{
            "id": C.VLLM_MODEL,
            "object": "model",
            "created": int(time.time()),
            "owned_by": "tomaris",
        }],
    }


@app.get("/v1/usage")
def usage(req: Request):
    """Today's request/token counters for the caller's own key.

    Identified without the daily-cap check so an over-limit customer can
    still see when their limit resets.
    """
    try:
        key_id = _keyauth.authorize(req, check_cap=False)
    except KeyAuthError as e:
        return JSONResponse(status_code=e.status, content=e.body())
    if not key_id:
        return {"error": "no API keys configured -- open mode"}
    return _keyauth.usage_for(key_id)


@app.post("/retrieve")
async def retrieve(req: Request):
    """Top-k hybrid retrieval without generation.

    What eval_recall.py --url probes, so the recall harness can finally
    measure the live box instead of dying on 404. No model call, but it does
    run embeddings, so it sits behind the same API keys and counters.
    """
    try:
        body = await req.json()
        query = body.get("query") or body.get("question") or ""
        k = int(body.get("k") or C.TOP_K)
    except Exception:
        return JSONResponse(status_code=400,
                            content={"error": "invalid JSON body"})
    if not isinstance(query, str) or not query.strip():
        return JSONResponse(status_code=400, content={"error": "empty query"})
    try:
        _keyauth.admit(req)
    except KeyAuthError as e:
        return JSONResponse(status_code=e.status, content=e.body())
    rag = await run_in_threadpool(get_rag)
    expanded = await run_in_threadpool(rag.expander.expand, query)
    keys, _ = await run_in_threadpool(rag.retriever.search, expanded)
    return {"results": [{"code": slug, "article_id": aid} for slug, aid in keys[:k]]}


@app.post("/api/chat/completions")
async def web_chat(req: Request):
    return await _chat(req, public=True)


@app.post("/v1/chat/completions")
async def chat(req: Request):
    return await _chat(req)


async def _chat(req: Request, public: bool = False):
    try:
        content_length = req.headers.get("content-length")
        if content_length and int(content_length) > 100_000:
            return JSONResponse(status_code=413, content={
                "error": {"type": "request_too_large",
                          "message": "Xabar hajmi juda katta. Qisqaroq matn yuboring."}})
        raw_body = await req.body()
        if len(raw_body) > 100_000:
            return JSONResponse(status_code=413, content={
                "error": {"type": "request_too_large",
                          "message": "Xabar hajmi juda katta. Qisqaroq matn yuboring."}})
        body = json.loads(raw_body)
        if not isinstance(body, dict):
            raise TypeError("request body must be an object")
        # Coerced before anything is counted against the caller's daily cap,
        # and inside this guard so a malformed body is a 400, never a 500.
        # See request_shape.py for the "content": null crash this replaces.
        messages = redact_messages(normalize_messages(body.get("messages")))
        question = last_question(messages)
        if not question.strip() or messages[-1].get("role") != "user":
            # Rejected BEFORE admit(): an empty body is a client bug, and it
            # used to cost the caller one of their metered daily requests.
            return JSONResponse(status_code=400, content={
                "error": {"type": "invalid_request_error",
                          "message": "messages must end with a non-empty user message."}})
    except Exception:
        return JSONResponse(status_code=400, content={
            "error": {"type": "invalid_request_error",
                      "message": "Body must be JSON with a messages array."}})
    if len(messages) > 80 or sum(len(m["content"]) for m in messages) > 60_000:
        return JSONResponse(status_code=413, content={
            "error": {"type": "request_too_large",
                      "message": "Suhbat juda uzun. Yangi suhbat boshlang yoki qisqaroq yozing."}})
    if public:
        address = req.client.host if req.client else "unknown"
        if not _public_chat_limiter.allow(address):
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(C.PUBLIC_CHAT_RATE_WINDOW_SECONDS)},
                content={"error": {
                    "type": "rate_limit_exceeded",
                    "message": "Soʻrovlar soni chekloviga yetdingiz. Birozdan soʻng qayta urinib koʻring.",
                }},
            )
        key_id = None
    else:
        try:
            key_id = _keyauth.admit(req)
        except KeyAuthError as e:
            return JSONResponse(status_code=e.status, content=e.body())
    # earlier turns also let a follow-up like "va 12-moddasi-chi?" inherit its code
    history, context = history_and_context(messages, C.HISTORY_TURNS)
    # bool("false") is True. OpenAI clients that stringify the flag -- and the
    # curl examples in the README -- would silently get SSE while asking for JSON.
    _stream = body.get("stream")
    want_stream = (_stream.strip().lower() not in ("", "false", "0", "no")
                   if isinstance(_stream, str) else bool(_stream))

    t0 = time.time()
    metric_started = _request_telemetry.begin()

    def run():
        result = get_rag()(question=question, context=context, history=history)
        _log_chat_metadata(result.mode, result.citations, t0)
        return result

    if want_stream:
        # Generation happens INSIDE the generator, and the first chunk goes out
        # before it starts. Building the answer first made time-to-first-byte
        # equal to full generation (~30s on the semantic path), so clients hit
        # their own timeout and showed "couldn't reach the model" while the
        # server was happily producing a correct answer.
        #
        # The sync stream_answer (CPU embeddings + sync OpenAI iteration) runs
        # in the threadpool via iterate_in_threadpool and lands on a queue; the
        # async generator then only touches the event loop between items and
        # can emit a keep-alive comment every HEARTBEAT_SECONDS while the
        # first token is still being computed (retrieval + rewrite can take
        # 10s+). Without that, one stream froze /health for every other client.
        async def sse():
            cid = f"chatcmpl-{uuid.uuid4().hex[:12]}"
            base = {"id": cid, "object": "chat.completion.chunk",
                    "created": int(time.time()), "model": C.VLLM_MODEL}

            def frame(delta, finish=None, extra=None):
                d = {**base, "choices": [{"index": 0, "delta": delta,
                                          "finish_reason": finish}]}
                if extra:
                    d.update(extra)
                return f"data: {json.dumps(d, ensure_ascii=False)}\n\n"

            yield frame({"role": "assistant"})      # flushes immediately

            queue: asyncio.Queue = asyncio.Queue()

            async def produce():
                try:
                    rag = await run_in_threadpool(get_rag)
                    async for kind, payload in iterate_in_threadpool(
                            stream_answer(rag, question, context=context,
                                          history=history)):
                        await queue.put((kind, payload))
                except Exception as e:               # surfaced by the consumer
                    await queue.put(("__error__", e))
                finally:
                    await queue.put(("__end__", None))

            producer = asyncio.create_task(produce())
            done, reasoning_parts, usage = None, [], {}
            metric_recorded = False
            stream_completed = False
            try:
                while True:
                    try:
                        kind, payload = await asyncio.wait_for(
                            queue.get(), timeout=C.HEARTBEAT_SECONDS)
                    except asyncio.TimeoutError:
                        yield ": keep-alive\n\n"     # SSE comment, clients skip it
                        continue
                    if kind == "__end__":
                        break
                    if kind == "__error__":
                        raise payload
                    if kind == "done":
                        done = payload
                    elif kind == "reasoning":
                        reasoning_parts.append(payload)
                        yield frame({"reasoning_content": payload})
                    elif kind == "usage":
                        usage = payload
                    else:
                        yield frame({"content": payload})
                stream_completed = True
            except UpstreamUnavailable as e:
                _request_telemetry.finish(metric_started, status=503)
                metric_recorded = True
                print(f"[upstream-unavailable] {type(e).__name__}")
                yield frame({}, "stop", {"error": {
                    "type": "upstream_unavailable",
                    "message": "Til modeli hozircha ishlamayapti. Birozdan soʻng qayta urinib koʻring.",
                }})
                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                _request_telemetry.finish(metric_started, status=500)
                metric_recorded = True
                print(f"[stream-failed] {type(e).__name__}")
                yield frame({}, "stop", {"error": {
                    "type": "server_error",
                    "message": "Javob tayyorlashda xatolik yuz berdi. Qayta urinib koʻring.",
                }})
                yield "data: [DONE]\n\n"
                return
            finally:
                producer.cancel()
                if not metric_recorded and not stream_completed:
                    _request_telemetry.finish(metric_started, status=499)

            has_done = done is not None
            done = done or {"mode": "unknown", "answer": "", "citations": []}
            _log_chat_metadata(done["mode"], done["citations"], t0)
            _request_telemetry.finish(
                metric_started,
                status=200 if has_done else 500,
                retrieval_mode=done["mode"],
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                citation_count=len(done["citations"]),
            )
            metric_recorded = True
            if key_id and usage:
                # real upstream token counts (vLLM trailing usage chunk)
                _keyauth.add_usage(key_id, usage.get("prompt_tokens", 0),
                                   usage.get("completion_tokens", 0))

            yield frame({}, "stop", {"citations": done["citations"],
                                     "retrieval_mode": done["mode"],
                                     "usage": usage or None})
            yield "data: [DONE]\n\n"

        return StreamingResponse(sse(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache",
                                          "X-Accel-Buffering": "no",
                                          "Connection": "keep-alive"})

    try:
        # run() blocks for the whole generation (up to a minute). Straight on
        # the event loop that freezes every other request -- /health, streams,
        # even the instant deterministic answers -- until it finishes.
        _before = await run_in_threadpool(history_len)
        result = await run_in_threadpool(run)
        nonstream_usage = await run_in_threadpool(last_usage, _before)
        _request_telemetry.finish(
            metric_started,
            status=200,
            retrieval_mode=result.mode,
            prompt_tokens=nonstream_usage.get("prompt_tokens", 0),
            completion_tokens=nonstream_usage.get("completion_tokens", 0),
            citation_count=len(result.citations),
        )
        if key_id and nonstream_usage:
            _keyauth.add_usage(key_id, nonstream_usage["prompt_tokens"],
                               nonstream_usage["completion_tokens"])
    except UpstreamUnavailable as e:
        _request_telemetry.finish(metric_started, status=503)
        print(f"[upstream-unavailable] {type(e).__name__}")
        return JSONResponse(
            status_code=503,
            content={
                "error": {"type": "upstream_unavailable",
                          "message": "Til modeli hozircha ishlamayapti. "
                                     "Birozdan soʻng qayta urinib koʻring."},
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Til modeli hozircha ishga tushmoqda. "
                                   "Bir necha daqiqadan soʻng qayta urinib koʻring.",
                    },
                    "finish_reason": "stop",
                }],
            },
        )
    except Exception as e:
        _request_telemetry.finish(metric_started, status=500)
        # Anything unexpected must still answer with a parseable body -- a raw
        # 500 with a traceback is what the demo curl showed on bad input.
        print(f"[request-failed] {type(e).__name__}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {"type": "server_error",
                          "message": "Javob tayyorlashda xatolik yuz berdi. "
                                     "Qayta urinib koʻring."},
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant",
                                "content": "Javob tayyorlashda xatolik yuz berdi. "
                                           "Qayta urinib koʻring."},
                    "finish_reason": "stop",
                }],
            },
        )

    return JSONResponse(
        {
            "id": f"chatcmpl-{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": C.VLLM_MODEL,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": result.answer,
                        # the frontend's collapsible "Reasoning" panel reads this;
                        # empty on the override/deterministic paths, which never
                        # invoke the model
                        "reasoning_content": result.reasoning,
                    },
                    "finish_reason": "stop",
                }
            ],
            # Real counts when the model was called; the override and
            # deterministic paths legitimately consume none.
            "usage": nonstream_usage or {
                "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            "citations": result.citations,
            "retrieval_mode": result.mode,
        }
    )
