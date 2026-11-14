"""Read-only helpers over the repository's verified corpus and manifest."""
from __future__ import annotations

import csv
import re
from pathlib import Path


def load_documents(manifest_path: str | Path) -> list[dict]:
    path = Path(manifest_path)
    if not path.is_file():
        raise FileNotFoundError(f"Corpus manifest is missing: {path.name}")
    with path.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    documents = []
    for row in rows:
        filename = row.get("filename", "")
        try:
            articles_count = int(row.get("articles_count", "0"))
            last_article = int(row.get("last_article", "0"))
        except (TypeError, ValueError):
            continue
        if not filename or articles_count < 0:
            continue
        documents.append({
            "code": Path(filename).stem,
            "filename": filename,
            "title": row.get("code_title", "") or row.get("title", ""),
            "lex_uz_doc": row.get("lex_uz_doc", ""),
            "adopted": row.get("adopted", ""),
            "articles_count": articles_count,
            "last_article": last_article,
            "sha256": row.get("sha256", ""),
            "snapshot_date": row.get("snapshot_date", ""),
        })
    return documents


def search_articles(
    articles: list[dict],
    *,
    query: str = "",
    code: str = "",
    page: int = 1,
    page_size: int = 25,
) -> dict:
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    terms = [term for term in re.findall(r"\w+", query.casefold()) if term]
    normalized_code = code.casefold()
    matches = []
    for article in articles:
        if normalized_code and article.get("code", "").casefold() != normalized_code:
            continue
        if article.get("article_id") in ("_front", "_end"):
            continue
        haystack = " ".join(
            str(article.get(field, ""))
            for field in ("article_display", "title", "text")
        ).casefold()
        if terms and not all(term in haystack for term in terms):
            continue
        text = str(article.get("text", ""))
        matches.append({
            "code": str(article.get("code", "")),
            "code_title": str(article.get("code_title", "")),
            "article_id": str(article.get("article_id", "")),
            "article": str(article.get("article_display", "")),
            "title": str(article.get("title", "")),
            "text_preview": text[:260],
            "lex_uz_doc": str(article.get("lex_uz_doc", "")),
            "snapshot_date": str(article.get("snapshot_date", "")),
            "seq": int(article.get("seq", 0)),
        })
    total = len(matches)
    offset = (page - 1) * page_size
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": (total + page_size - 1) // page_size,
        "results": matches[offset:offset + page_size],
    }


def article_detail(
    articles: list[dict], *, code: str, article_id: str
) -> dict | None:
    for article in articles:
        if (
            article.get("code") == code
            and article.get("article_id") == article_id
            and article_id not in ("_front", "_end")
        ):
            return {
                "code": str(article.get("code", "")),
                "code_title": str(article.get("code_title", "")),
                "article_id": str(article.get("article_id", "")),
                "article": str(article.get("article_display", "")),
                "title": str(article.get("title", "")),
                "text": str(article.get("text", "")),
                "lex_uz_doc": str(article.get("lex_uz_doc", "")),
                "snapshot_date": str(article.get("snapshot_date", "")),
            }
    return None
