# Tomaris legal RAG

Retrieval + anti-hallucination layer in front of `tomaris/Tomaris.ai` + the DPO
LoRA, served by vLLM. Answers questions about the 25 audited Uzbek legal codes
in this repo (7,368 citable articles).

## Answer paths

Every request takes exactly one of five paths, reported back as `retrieval_mode`
(measured on an RTX PRO 6000 Blackwell, 27B + LoRA, ~23 tok/s):

| mode | what it means | model | measured |
|---|---|---|---|
| `override` | a customer-configured answer in `overrides.json` | no | 0.007 s |
| `deterministic` | the article does not exist (repealed / out of range / ambiguous) | no | 0.005 s |
| `chat` | not a legal question — answered as a normal assistant | yes | 4–18 s |
| `article-lookup` | a specific article was named and found; answered from its verbatim text | yes | ~16 s |
| `semantic` | open legal question; hybrid retrieval then grounded generation | yes | 25–34 s |

The first two never reach the model, so they keep working even while vLLM is
restarting, and they cannot be hallucinated by construction.

### Legal or not?

This serves a general assistant, so most messages are not about law. Routing:

1. an article reference, a code name, or legal vocabulary → the corpus;
2. otherwise retrieval runs first and the nearest article's cosine distance
   decides (`LEGAL_DISTANCE`, default 0.45).

Step 2 exists because a keyword list cannot cover a language: *"Ish haqi qancha
muddatda toʻlanishi kerak?"* is a Labour Code question naming neither a code nor
any legal term, and routing it to chat would answer a legal question from the
model's memory — the exact failure this system exists to prevent. Retrieval
catches it; cooking and history questions stay in chat.

## Customer-configured answers

`overrides.json` lets a customer fix the reply to questions they care about —
what a bank needs before putting this in front of its own users:

```json
[{ "any":    ["kredit foizi", "foiz stavkasi"],
   "not":    ["ipoteka"],
   "answer": "Isteʼmol krediti boʻyicha yillik stavka — 24%.",
   "source": "Bank tariflari (2026-08)" }]
```

Matched before retrieval and before generation, so the configured answer is
returned verbatim and cannot be reworded. Matching ignores okina/apostrophe
variants, so `isteʼmol`, `iste'mol` and `istemol` all hit the same rule. The
`not` conditions keep rules from swallowing neighbouring questions: with the
rule above, *"Ipoteka kredit foizi"* falls through to normal RAG. Edit the file
and `supervisorctl restart tomaris-rag` to apply.

## Why it cannot invent articles

Three layers, only one of which involves the model:

1. **Deterministic resolution (no LLM).** Every `N-modda` in the question is
   resolved against an exact map of all 7,368 article IDs *before* generation.
   Exists → the verbatim article is fetched. Doesn't exist → a templated answer
   that distinguishes *repealed* (inside the code's range) from *out of range*
   (past its last article), with zero model involvement. `JK 999-modda` can
   never produce prose.
2. **Grounded generation.** The model only ever sees full retrieved articles and
   is instructed to cite `(Kodeks, N-modda)`.
3. **Citation audit.** Every `N-modda` in the generated answer is checked
   against the articles actually supplied *plus the articles those texts
   cross-reference* (21% of this corpus cites other articles, so ignoring that
   would reject faithful quotation). Unknown citation → one retry with explicit
   feedback → refusal. An invented number cannot reach the user.

Ambiguity is asked about, never guessed: `SK` matches four codes
(soliq/saylov/suv/shaharsozlik), `BK` matches two, and a bare `11-modda` with no
code named returns a clarify question listing the documents that contain it.

Run the guardrails against the real corpus at any time — no GPU, no network:

```bash
python test_guardrails.py
```

## Renting the box

Two hard requirements, both learned the expensive way:

- **CUDA driver ≥ 12.8.** A 12.6-driver box makes current vLLM/PyTorch wheels
  fail with `The NVIDIA driver on your system is too old`, and every attempted
  downgrade cascades into torch/torchaudio/transformers ABI breakage.
- **Disk ≥ 150 GB** (54 GB model + adapter + embeddings + wheels).

## Setup

**Two virtualenvs, deliberately.** vLLM pins torch and transformers hard;
`sentence-transformers` will upgrade them out from under it. The two processes
share nothing but a port number, so keeping their dependencies apart removes the
entire class of failure that ate the last deploy.

```bash
# corpus + code travel together
git clone https://github.com/javohirmat/uzbek-legal-corpus.git /workspace/repo

# venv 1 - inference
python3 -m venv /workspace/venv-vllm
/workspace/venv-vllm/bin/pip install vllm huggingface_hub

# venv 2 - retrieval
python3 -m venv /workspace/venv-rag
/workspace/venv-rag/bin/pip install -r /workspace/repo/rag/requirements.txt

# weights
/workspace/venv-vllm/bin/hf auth login
cd /workspace
HF_HUB_DISABLE_XET=1 /workspace/venv-vllm/bin/hf download tomaris/Tomaris.ai --local-dir /workspace/model
/workspace/venv-vllm/bin/hf download tomaris/Tomaris-dpo-v1 --local-dir /workspace/dpo_adapter
```

## Build the index

Do this **before** starting vLLM, while the GPU is still free (~1 min).

```bash
cd /workspace/repo/rag
/workspace/venv-rag/bin/python build_index.py
```

Reads `../data/articles/*.jsonl` directly — no Hugging Face round trip, so the
index always matches the audited corpus in this commit. Set `CORPUS_SOURCE=hf`
to pull from the Hub instead.

## Run

Both processes run as **supervisor services**, not `tmux` or `nohup` — they then
restart on crash and their logs reach the Vast portal. The two wrapper scripts
and configs are created by `install_services.sh`:

```bash
bash /workspace/repo/rag/install_services.sh
supervisorctl status | grep tomaris
```

`--language-model-only` is required in the vLLM service: the base is a Qwen3-VL
checkpoint and without it vLLM tries to load an image processor and dies with
`Can't load image processor`.

**vLLM binds `127.0.0.1` and deliberately gets no `portal.yaml` entry.** It has
no authentication of its own, so exposing it would let anyone with the URL spend
your GPU. Only the RAG server is public, and only behind the Caddy token edge.

**If Caddy is broken on the box** (it crash-looped on the 2026-08-04 image and
took the registered services down with it), skip the edge entirely: free a
*valid* mapped port and bind uvicorn to it directly —

```bash
supervisorctl stop jupyter; kill $(pgrep -f jupyter-notebook)   # frees 8080
uvicorn server:app --host 0.0.0.0 --port 8080                    # public = $VAST_TCP_PORT_8080
```

Beware: the template's port list includes **72299, which is not a valid TCP
port** (max 65535 — the kernel silently truncates it, so uvicorn reports
"running on 72299" while actually listening on 6763 and the public mapping goes
nowhere). Use only 6006, 8080 or 8384.

**One operator per box.** Two sessions (person, or AI tab via the portal
terminal) mutating services simultaneously kill each other's processes in ways
that look like random crashes. The 2026-08-04 deploy lost ~15 minutes to a
duplicate vLLM launched by a parallel session racing the first for the GPU.

Restart after a code change:

```bash
cd /workspace/repo && git pull && supervisorctl restart tomaris-rag
```

Never `pkill -f uvicorn…`: the pattern matches the very shell running it and
kills your own session mid-command. Use `supervisorctl`, or kill by PID.

## Verify

```bash
curl -s localhost:8000/health

# exists -> verbatim article + summary + sources
curl -s -X POST localhost:8000/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Konstitutsiyaning 149-moddasida nima deyilgan?"}]}'

# does not exist -> refusal, no LLM call at all
curl -s -X POST localhost:8000/v1/chat/completions -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"JK 999-modda nima deydi?"}]}'
```

The second must answer `Jinoyat kodeksida 999-modda yoʻq. Oxirgi modda —
302-modda.` and report `"retrieval_mode": "deterministic"`.

## Web app

The repository root contains a TypeScript/Vite chat UI; the existing RAG
pipeline remains the source of every answer. After installing the Python and
Node dependencies and building the retrieval index, run `npm run dev` from the
repository root. It starts the API on `127.0.0.1:8000` and the browser UI on
`127.0.0.1:5173`. See the root `README.md` for setup, model requirements and
deployment details. Production can serve `web/dist` from the FastAPI app after
`npm run build`.

The browser uses the same-origin `/api/chat/completions` endpoint. It is
rate-limited per IP (`PUBLIC_CHAT_RATE_LIMIT`, default 10 requests per 60
seconds); production deployments with multiple workers should also rate-limit
at the reverse proxy or gateway. `CORS_ORIGINS` is a comma-separated allowlist
and defaults to the two local Vite origins. Set it to the exact frontend
origins if deploying the API and UI on different hosts.

Set `TOMARIS_API_KEYS` server-side to require customer keys on the legacy
`/v1/chat/completions` and `/retrieve` endpoints. Those keys are not used by or
sent to the public browser route.

The browser keeps chat history in that browser's local storage; it is not
stored by the API. Full prompt/answer logging is disabled. `CHAT_LOG_ENABLED`
is an explicit opt-in for metadata-only records (timestamp, retrieval mode,
citation count and duration); it never writes question, answer, citation
content, or API keys. The API redacts common passport, PINFL, card and phone
patterns before generation. Reverse-proxy access logs should also omit request
bodies.

The API also returns `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy` and a restrictive `Permissions-Policy` header. Terminate TLS
at the production ingress and configure the trusted host/origin policy there.
The admin document additionally receives a restrictive same-origin
Content-Security-Policy with no inline scripts.

`POST /v1/chat/completions` remains the API-key-protected OpenAI-compatible
route. Its non-stream response includes top-level `citations` and
`retrieval_mode`; SSE sends those fields in its final chunk. The public browser
route has a separate rate limit and does not expose a server API key to the
browser. Keep `TOMARIS_API_KEYS` and model credentials in server-side
environment variables only.

## Read-only admin console

The separate web admin is served at `/admin` by the same FastAPI deployment.
Configure all three server-only values to enable login:

- `HUQUQ_ADMIN_USERNAME`: the admin account name.
- `HUQUQ_ADMIN_PASSWORD_HASH`: PBKDF2-SHA256 hash of a password of at least
  12 characters. Generate it interactively with
  `python rag/admin_security.py hash-password`; the plaintext password is not
  printed or saved by the command.
- `HUQUQ_ADMIN_SESSION_SECRET`: a separate random secret of at least 32
  characters. Generate one with
  `python -c 'import secrets; print(secrets.token_urlsafe(48))'`.

Store these as server environment secrets; never put them in a `VITE_*`
setting, browser bundle, or source file. Leave one or more unset to keep admin
APIs disabled. Successful login creates an 8-hour signed cookie with
`HttpOnly`, `SameSite=Strict`, and `Secure` on HTTPS; the browser never stores
the password or session signing secret. Admin API calls require a custom
same-origin request header as an additional CSRF defense. Login attempts are
rate-limited. The signed cookie is stateless: logout deletes the browser
cookie but cannot revoke a copied cookie before expiry. Set
`HUQUQ_ADMIN_SESSION_TTL_SECONDS` to change the default 28,800-second lifetime;
all backend workers must share the same session-signing secret.

The admin API is read-only:

- `POST /api/admin/session`
- `GET /api/admin/session`
- `POST /api/admin/logout`
- `GET /api/admin/overview`
- `GET /api/admin/corpus/documents`
- `GET /api/admin/corpus/articles`
- `GET /api/admin/corpus/article`
- `GET /api/admin/ai/config`
- `GET /api/admin/evaluations`
- `GET /api/admin/security`

Overview counters are process-local and retain only request counts, token
counts, citation counts, retrieval modes, latency and error totals for a
rolling 24-hour window. Prompt and answer text, user identities, and API keys
are not included. Counters reset on process restart and are not shared across
workers. The model latency is only a `GET /v1/models` availability probe; it
does not measure generation latency. GPU data is read from `nvidia-smi` when
available. User/session analytics, persistent audit history, inference costs,
ingestion queues, corpus version history and PDF/DOCX processing are not
configured and are reported as unavailable.

The admin login limiter is also process-local. For production, terminate TLS
and configure Uvicorn/proxy headers to reflect HTTPS correctly so the session
cookie receives its `Secure` flag,
restrict admin access at a trusted network edge, configure exact CORS origins
if cross-origin access is needed, and add shared gateway rate limits. The
corpus browser uses the actual `manifest.csv` and loaded RAG articles; it
identifies the corpus as a 2026-07 snapshot and links to lex.uz only when the
backend provides a numeric document ID.

## Latency knob

Query-time embeddings default to CPU so they never contend with vLLM for VRAM
(~200–400 ms, negligible beside 27B generation). If you drop vLLM to
`--gpu-memory-utilization 0.85`, set `QUERY_DEVICE=cuda` for ~15 ms instead.

## Performance notes

Measured on an RTX PRO 6000 Blackwell, 27B + LoRA, single request:

- **23.8 tok/s** with the shipped config (CUDA graphs, PIECEWISE, capture sizes
  1–8). Reproduce with a fixed-length completion, not the `Avg generation
  throughput` line in vLLM's log — that averages over idle time and reported
  12.4 tok/s for the same server.
- `--enforce-eager` costs ~3.4× (7 tok/s). It was in an older config as a
  workaround for a broken box; never re-add it here.
- Capturing vLLM's default 51 LoRA-specialised graph sizes crash-loops on this
  model. Limiting to 1–8 is what makes graphs usable.
- **n-gram speculative decoding was tried and not adopted**: 21.7 tok/s on
  general text (worse than baseline), and inconclusive on quote-heavy legal
  answers (10.4s vs 12.2s on single samples, within noise). Worth revisiting
  with a proper multi-sample benchmark before drawing a conclusion.

Any config change made on a box must be committed here as well. The fast config
above was once applied live and not backported, so `bootstrap.sh` rebuilt the
next box 3.4× slower.
