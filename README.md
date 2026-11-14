# Uzbek Legal Corpus (Oʻzbek huquqiy korpusi)

25 cleaned, audited, machine-readable texts of the Republic of Uzbekistan's Constitution, 20 codes, and 4 major laws — in Uzbek (Latin script), sourced from the official National Database of Legislation ([lex.uz](https://lex.uz)). Snapshot: **July 2026**. 7,368 articles.

Built for NLP / LLM / RAG work on Uzbek legal text. Released by [Tomaris AI](https://tomaris.ai).

## Contents

| Path | What it is |
|---|---|
| `web/` | Responsive, streaming Uzbek legal-information chat interface |
| `rag/server.py` | Existing FastAPI retrieval and grounded-answer API |
| `data/raw/*.txt` | Cleaned plain text, one file per code/law |
| `data/articles/*.jsonl` | One JSON record per article (canonical structured form) |
| `manifest.csv` | Per-file: official title, lex.uz doc id, adoption date, article count, last article, SHA-256, snapshot date |
| `scripts/clean.py` | The normalization pipeline (lex.uz text → `data/raw`) |
| `scripts/parse_articles.py` | `data/raw` → `data/articles` + `manifest.csv` |

## Run the legal chat app

The web app is backed by the repository's existing RAG pipeline; it does not
return demo or fabricated answers when the model is unavailable. The corpus is
the **2026-07 snapshot**. Users are reminded to verify current law at
[lex.uz](https://lex.uz).

When present, the repository-root `.env` is loaded by the Python backend for
local development. Variables already set in the process environment take
precedence. Keep `.env` private and never commit credentials.

### Requirements

- Node.js 20.19+ (or 22.12+) and npm for the TypeScript/Vite frontend.
- Python 3.10+ and the RAG dependencies in `rag/requirements.txt`.
- A built local retrieval index and an OpenAI-compatible vLLM model endpoint.
  Model weights/GPU are not included in this repository. Follow
  [`rag/README.md`](./rag/README.md) for vLLM and index setup.

### Install and run

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -r rag/requirements.txt

# Build the local corpus index once (CPU works; first run downloads embeddings).
cd rag
BUILD_DEVICE=cpu ../.venv/bin/python build_index.py
cd ..

# Start the API and web UI together.
VLLM_BASE=http://127.0.0.1:8001/v1 npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Start a compatible vLLM
server at `VLLM_BASE` before asking questions. To run services separately, use
`.venv/bin/uvicorn server:app --app-dir rag --host 127.0.0.1 --port 8000` and
`npm run dev:web`. If port 8000 is already in use, set `RAG_PORT=8010` for
`npm run dev`; the frontend proxy follows that port. The browser never receives
an API key.

For OpenRouter, set `OPENROUTER_MODEL` and `OPENROUTER_API_KEY` in the
repository-root `.env` or server environment. If `VLLM_BASE` and `VLLM_MODEL`
are not explicitly set, the backend selects OpenRouter's OpenAI-compatible API
and uses `OPENROUTER_MODEL`. Keep the API key server-side.

### Read-only admin control center

The separate [`/admin`](http://127.0.0.1:5173/admin) console uses the existing
FastAPI backend and real corpus/model/process telemetry. Configure a username,
a PBKDF2-SHA256 password hash, and a separate random session-signing secret in
the server environment. Generate them with:

```bash
python rag/admin_security.py hash-password
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

The first command prompts for a password (minimum 12 characters) and prints
`HUQUQ_ADMIN_PASSWORD_HASH=...`; store that hash, the username, and the random
secret as server-side environment secrets. Never put them in a `VITE_*`
variable or commit them. After login, the browser uses an 8-hour, HttpOnly,
SameSite=Strict cookie; the password is not persisted in browser storage.
The session is stateless: signing out deletes the browser cookie, but does not
revoke a copied cookie server-side before it expires. Set
`HUQUQ_ADMIN_SESSION_TTL_SECONDS` to adjust the lifetime (default 28800
seconds). Use the same session-signing secret on every backend worker.

The console is read-only. It exposes corpus documents/articles, manifest hashes,
runtime model configuration, prompt text, the available evaluation dataset,
security configuration and host/model health. Request/token/citation counters
are process-local, retain only the rolling window, and never store prompts or
answers. User accounts, persistent audit history, inference billing, ingestion
jobs and PDF/DOCX analysis are not available in this repository; the UI marks
them as unconfigured rather than inventing metrics. Model health latency is a
`/v1/models` probe, not inference latency. Use HTTPS, exact trusted
`CORS_ORIGINS`, and a shared rate limiter at the production gateway; the admin
failed-login limiter is also process-local.

The dev launcher serves the console at `http://127.0.0.1:5173/admin`. Production
serves it from the same FastAPI deployment after `npm run build`.

### Configuration and privacy

Copy `.env.example` as a reference and export the needed values in the server
environment; Python does not load `.env` files automatically. `VLLM_BASE`,
`VLLM_MODEL`, `MODEL_TIMEOUT_SECONDS`, `BUILD_DEVICE`, and `QUERY_DEVICE`
configure the model and retrieval path. `CORS_ORIGINS` must contain only
trusted origins when the UI and API are deployed separately. The public browser
chat endpoint is limited per client IP; multi-worker deployments also need a
shared gateway/reverse-proxy limit. Set `TOMARIS_API_KEYS` on the server to
protect the legacy `/v1/chat/completions` and `/retrieve` endpoints. The
browser-only route does not use or expose those keys. `VITE_CHAT_ENDPOINT` may change the
non-secret browser API path at build time; never put API keys in `VITE_*`.

Chat history is stored only in the current browser's local storage. Use
**Barcha tarixni tozalash** in the sidebar to delete it, or clear this site's
storage in browser settings. Full prompts and answers are not logged. The
optional `CHAT_LOG_ENABLED=true` stores metadata only, never question/answer
text. Common passport, PINFL, card-number and phone patterns are redacted before
generation. Do not send confidential case documents or unnecessary identifiers.

### Build, tests and deployment

```bash
npm run typecheck
npm test
npm run build
(cd rag && python3 -m unittest test_admin_console test_privacy test_chat_rate_limit)
```

For production, build the frontend with `npm run build`, set the server-side
model endpoint and exact CORS allowlist, and run the existing FastAPI service
behind HTTPS and a reverse proxy with request-size and shared rate limits.
FastAPI serves the generated `web/dist` assets on `/`. Keep model weights and
all API credentials outside the browser bundle and repository. No model or GPU
is bundled; chat will clearly report when vLLM is unreachable.

## JSONL schema

```json
{"seq": 496, "code": "soliq_kodeksi",
 "code_title": "Oʻzbekiston Respublikasining Soliq kodeksi",
 "article_id": "480.1", "article_display": "480¹-modda", "article_raw": "4801-modda",
 "kind": "insert", "title": "Umumiy qoidalar",
 "section": "XXI BOʻLIM. ...", "chapter": "71¹-bob. ...",
 "text": "...", "lex_uz_doc": "-4674902", "snapshot_date": "2026-07"}
```

Special records: `article_id: "_front"` (preamble/front matter, e.g. the Constitution's Muqaddima) and `"_end"` (trailing matter, e.g. the Criminal Code's legal-terms glossary, SAKKIZINCHI BOʻLIM).

## Conventions you must know

**1. Encoding standard (do not "fix" it).** The okina in *oʻ/gʻ* is **U+02BB (ʻ)** and the tutuq belgisi in *maʼlumot* is **U+02BC (ʼ)** — uniformly, corpus-wide. Never U+2018/U+2019 or ASCII `'`. Mixed encodings silently split an embedding space; this corpus has exactly one.

**2. Superscript articles are digit-flattened in the source.** lex.uz renders inserted article 480¹ as `4801`. Raw text keeps that form; the JSONL resolves it **by document position** into `article_id: "480.1"`. The raw number is ambiguous ("261" is 26¹ in one place and article 261 in another) — always use `article_id`, or reparse positionally. Chapter strings are kept raw (`711-bob` = 71¹-bob).

**3. Gaps are repealed articles, not missing data.** Current lex.uz editions drop repealed article headings entirely. Every gap below was verified against lex.uz / consolidated editions during the audit (clean seams, zero dangling internal cross-references):

- Konstitutsiya (155), Mehnat (581), Suv (165), Saylov (103), Shaharsozlik (85), Raqobat (49), Investitsiyalar (69), Qimmatli qogʻozlar (64): **dense, no gaps**
- Soliq (→483): 324, 383, 392, 459
- Fuqarolik I (→385): 63, 65–66, 70–72, 176–177, 179 · Fuqarolik II (386→1199): 1052–1055, 1057, 1064, 1071–1072, 1080–1081
- Fuqarolik protsessual (→462): 260, 373–382, 392, 408–409, 412, 420–436 (2021 appeal reform; replaced by 372¹⁻⁴, 419¹⁻²⁹)
- Jinoyat (→302): 53, 174, 187, 224, 272 (+ repealed bases 48, 84 whose inserts survive)
- Jinoyat-protsessual (→623): 5–10 (repealed 2010, OʻRQ-262), 216, 229, 231–233, 246, 339–343, 399–400, 404, 419, 505–509 (reform inserts 504¹⁻³, 509⁵⁻¹⁴ etc.)
- Jinoyat-ijroiya (→197): 33–43, 51, 70, 83, 134–135, 148, 162 (+ base 44)
- Maʼmuriy javobgarlik (→348): 6, 73, 122, 141, 156, 162, 222, 246, 253, 320 (+ bases 184, 266)
- Maʼmuriy sud ishlari (→288): 190–193, 246 · Iqtisodiy protsessual (→347): 304
- Budjet (→192): 37–43, 53–59, 74–80 · Bojxona (→412): 133, 236–238, 278–280, 283, 285
- Oila (→238): 163, 168, 176–193 (guardianship chapters superseded by the 2014 vasiylik law)
- Yer (→91 + 91¹): 19, 34, 47, 50, 54, 57 · Havo (→135): 96–97 · Tadbirkorlik (→52): none (has 18¹, 30¹)

**4. What was removed vs. kept.** Removed: lex.uz amendment annotations (parenthesized gazette references), navigation/UI cruft, BOMs, control characters. Kept: all statute text, including inline legal parentheticals, repeal-list articles inside laws (which legitimately cite gazettes), the Criminal Code glossary, and transitional articles.

**5. Heading tolerance for your own parsers.** Match `\d+\s*-\s*modda`, not the strict form — the source occasionally emits `599- modda`.

## Provenance & currency

Texts reflect the in-force consolidated editions on lex.uz as of the snapshot date, including the new Mehnat kodeksi (2022), Suv kodeksi (2025, in force 31.10.2025), Raqobat qonuni (2023), and the 2023 Constitution. The Havo kodeksi is the 1993 code, which remains in force (an ICAO-aligned new edition is in drafting as of the snapshot). **This is an unofficial copy for research and machine learning. Laws change; lex.uz is the sole authoritative source.** Blank `lex_uz_doc` cells in the manifest simply mean the id wasn't captured during the audit — search the title on lex.uz.

## Legal status & license

Under Uzbek law, official documents — laws, decisions, resolutions and the like, and their official translations — **are not objects of copyright** (Law "On Copyright and Related Rights", OʻRQ-42 of 20.07.2006, art. 8). The statute texts are therefore public domain.

- **Data** (`data/`, `manifest.csv`): released under **CC0 1.0** (`LICENSE`) — no rights asserted over the compilation/cleaning either.
- **Code** (`scripts/`): **MIT** (`LICENSE-CODE`).

Attribution to lex.uz and a link back to this repository are appreciated but not required.

## Cite

```
Uzbek Legal Corpus (2026-07 snapshot). Tomaris AI.
Source texts: Qonunchilik maʼlumotlari milliy bazasi (lex.uz).
```

## Load

```python
from datasets import load_dataset
ds = load_dataset("javohirmat/uzbek-legal-corpus", data_files="data/articles/*.jsonl", split="train")
```

## Stats

| Code | Articles | Words |
|---|---:|---:|
| bojxona_kodeksi | 419 | 59,190 |
| budjet_kodeksi | 172 | 24,903 |
| fuqarolik_kodeksi_1qism | 386 | 34,255 |
| fuqarolik_kodeksi_2qism | 811 | 76,905 |
| fuqarolik_protsessual_kodeksi | 508 | 53,736 |
| havo_kodeksi | 136 | 11,367 |
| investitsiyalar_faoliyati_qonuni | 69 | 8,643 |
| iqtisodiy_protsessual_kodeksi | 385 | 49,133 |
| jinoyat-ijroiya_kodeksi | 196 | 18,384 |
| jinoyat_kodeksi | 392 | 53,498 |
| jinoyat_protsessual_kodeksi | 762 | 101,971 |
| konstitutsiya | 155 | 10,563 |
| mamuriy_javobgarlik_kodeksi | 660 | 76,664 |
| mamuriy_sud_ishlarni_yuritish_kodeksi | 306 | 34,286 |
| markaziy_bank_qonuni | 76 | 8,956 |
| mehnat_kodeksi | 581 | 80,270 |
| oila_kodeksi | 220 | 17,486 |
| qimmatli_qogozlar_bozori_qonuni | 65 | 10,262 |
| raqobat_qonuni | 49 | 11,248 |
| saylov_kodeksi | 110 | 14,857 |
| shaharsozlik_kodeksi | 85 | 14,059 |
| soliq_kodeksi | 496 | 149,577 |
| suv_kodeksi | 165 | 26,338 |
| tadbirkorlik_faoliyati_qonuni | 54 | 6,455 |
| yer_kodeksi | 110 | 18,300 |
| **Total** | **7368** | **971,306** |

Word counts cover article titles + bodies (front/end matter excluded). Expect roughly 2.5–3.5 tokens per Uzbek word depending on tokenizer.

## Updates

Snapshot releases only (this is `2026-07`); no continuous sync with lex.uz. Laws change — lex.uz is the sole authoritative source.

## Citation

```bibtex
@misc{uzbek_legal_corpus_2026,
  title  = {Uzbek Legal Corpus (2026-07 snapshot)},
  author = {{Tomaris AI}},
  year   = {2026},
  note   = {Source texts: Qonunchilik ma'lumotlari milliy bazasi (lex.uz)},
  url    = {https://huggingface.co/datasets/javohirmat/uzbek-legal-corpus}
}
```
