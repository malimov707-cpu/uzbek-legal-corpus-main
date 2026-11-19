import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const STOP_WORDS = new Set([
  "bilan", "uchun", "qanday", "qanaqa", "nima", "qaysi", "qayerda",
  "qachon", "mumkin", "kerak", "boʻladi", "boladi", "boʻlsa", "bolsa",
  "haqida", "toʻgʻrisida", "togrisida", "men", "mening", "siz", "bu",
  "shu", "ham", "esa", "yoki", "va", "bilan", "modda", "kodeks",
  "qonun", "hisoblanadi", "hisoblash", "uchunmi", "the", "and", "what",
  "how", "does", "are", "is", "for", "with", "about", "как", "что",
  "для", "если", "или", "когда", "можно", "ли",
]);

const SUFFIXES = [
  "laringiz", "larining", "laring", "larimiz", "laridan", "larining",
  "larimiz", "lardan", "lariga", "larini", "lari", "larni", "lar",
  "imiz", "ingiz", "ining", "idan", "iga", "ini", "ning", "dan",
  "dagi", "dagi", "ga", "ka", "qa", "da", "ni", "im", "ing", "si",
];

function fold(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("uz-UZ")
    .replace(/[‘’ʻʼ`´']/g, "");
}

function stem(token) {
  for (const suffix of SUFFIXES) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

function tokenize(value) {
  return fold(value)
    .match(/[\p{L}\p{N}]+/gu)
    ?.map(stem)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token)) ?? [];
}

function loadCorpus(root) {
  const directory = join(root, "data", "articles");
  const paths = readdirSync(directory).filter((name) => name.endsWith(".jsonl"));
  const rows = [];
  for (const name of paths) {
    const content = readFileSync(join(directory, name), "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (!line) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      if (!/^\d+(?:\.\d+)?$/.test(row.article_id ?? "")) continue;
      const title = [row.code_title, row.article_display, row.title, row.chapter, row.section]
        .filter(Boolean).join(" ");
      const tokens = tokenize(`${title} ${row.text}`);
      const frequencies = new Map();
      for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
      rows.push({ ...row, searchTitle: tokenize(row.title), frequencies, length: tokens.length });
    }
  }
  const documentFrequency = new Map();
  let totalLength = 0;
  for (const row of rows) {
    totalLength += row.length;
    for (const token of row.frequencies.keys()) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  return {
    rows,
    documentFrequency,
    averageLength: totalLength / Math.max(1, rows.length),
  };
}

function redact(value) {
  return value
    .replace(/(?<!\d)(?:\d[ -]?){13}\d(?!\d)/g, "[maxfiy ma'lumot]")
    .replace(/(?<!\d)(?:\d[ -]?){15}\d(?!\d)/g, "[maxfiy ma'lumot]")
    .replace(/(?<![A-Z0-9])[A-Z]{2}\s?\d{7}(?!\d)/gi, "[maxfiy ma'lumot]")
    .replace(/(?<!\d)(?:\+?998[ -]?)?(?:\d[ -]?){8}\d(?!\d)/g, "[maxfiy ma'lumot]");
}

function searchArticles(index, question, allowedCodes = null) {
  const { rows, documentFrequency, averageLength } = index;
  const terms = [...new Set(tokenize(question))];
  // The corpus commonly says “har yilgi” where users say “yillik”.
  if (terms.includes("yillik")) terms.push("har", "yilgi");
  if (!terms.length) return [];
  const ref = question.match(/\b(\d{1,4})(?:[.,](\d+))?\s*[-]?\s*modda(?:si|sining|sida|sidan|ga)?\b/i);
  const refId = ref ? `${ref[1]}${ref[2] ? `.${ref[2]}` : ""}` : "";
  const query = fold(question);
  const ranked = [];

  for (const row of rows) {
    if (allowedCodes && !allowedCodes.includes(row.code)) continue;
    let score = 0;
    for (const term of terms) {
      const frequency = row.frequencies.get(term) ?? 0;
      if (!frequency) continue;
      const frequencyInCorpus = documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (rows.length - frequencyInCorpus + 0.5) / (frequencyInCorpus + 0.5));
      const denominator = frequency + 1.2 * (0.25 + 0.75 * row.length / Math.max(1, averageLength));
      score += idf * (frequency * 2.2) / denominator;
      if (row.searchTitle.includes(term)) score += idf * 3.2;
    }
    const titleMatches = terms.filter((term) => row.searchTitle.includes(term)).length;
    if (terms.includes("davomiyligi") && titleMatches >= 3) score += 4;
    const asksAnnualLeaveDuration = terms.includes("davomiyligi") &&
      terms.includes("mehnat") && (terms.includes("yillik") || terms.includes("yilgi"));
    const namesSpecialWorkType = /kasanach|masofadan|vaxta|orindosh|uy ish/i.test(query);
    if (
      asksAnnualLeaveDuration && !namesSpecialWorkType &&
      row.searchTitle.includes("davomiyligi") &&
      (row.searchTitle.includes("yilgi") || row.searchTitle.includes("yillik")) &&
      (row.searchTitle.includes("asosiy") || row.searchTitle.includes("kam"))
    ) score += 40;
    if (refId && row.article_id === refId) score += 100;
    else if (ref && row.article_id === ref[1]) score += 20;

    const codePhrase = fold(row.code_title).replace(/[^\p{L}\p{N} ]/gu, " ").trim();
    if (codePhrase.length > 8 && query.includes(codePhrase)) score += 8;
    if (score > 0) ranked.push({ row, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score ?? 0;
  if (best < 0.18) return [];
  const selected = [];
  const seenCodes = new Map();
  for (const hit of ranked) {
    if (selected.length >= 3) break;
    const codeCount = seenCodes.get(hit.row.code) ?? 0;
    if (codeCount >= 2) continue;
    if (selected.length && hit.score < best * 0.42) break;
    selected.push(hit.row);
    seenCodes.set(hit.row.code, codeCount + 1);
  }
  return selected;
}

function makeReply(index, rawQuestion) {
  const question = redact(rawQuestion.trim()).slice(0, 2_000);
  let referenceCodes = null;
  const reference = question.match(/\b(\d{1,4})(?:[.,](\d+))?\s*[-]?\s*modda(?:si|sining|sida|sidan|ga)?\b/i);
  if (reference) {
    const id = `${reference[1]}${reference[2] ? `.${reference[2]}` : ""}`;
    const exactCodes = new Set(index.rows
      .filter((row) => row.article_id === id)
      .map((row) => row.code));
    if (exactCodes.size === 1) referenceCodes = [...exactCodes];
    if (exactCodes.size > 1) {
      const queryTokens = new Set(tokenize(question));
      const namedCodes = [...exactCodes].filter((code) =>
        code.split(/[_-]+/).some((part) => part.length > 2 && queryTokens.has(stem(part))),
      );
      if (namedCodes.length !== 1) {
        return {
          answer: `${id}-modda bir nechta hujjatda bor. Qaysi kodeks yoki qonunni nazarda tutyapsiz? AI model ulanmaganligi sababli hujjatni taxmin qilmayman.`,
          citations: [],
        };
      }
      referenceCodes = namedCodes;
    }
  }
  const hits = searchArticles(index, question, referenceCodes);
  const citations = hits.map((row) => ({
    code: row.code,
    code_title: row.code_title,
    article: row.article_display,
    lex_uz: row.lex_uz_doc ?? "",
  }));
  const answer = hits.length
    ? [
        "Korpusdan topilgan qonun matni (AI model ulanmagan). Quyidagi avtomatik qidiruv natijasi yuridik maslahat emas.",
        ...hits.map((row) => {
          const excerpt = String(row.text ?? "").replace(/\s+/g, " ").trim().slice(0, 850);
          return `${row.code_title}, ${row.article_display}${row.title ? ` — ${row.title}` : ""}\n${excerpt}${row.text?.length > 850 ? "…" : ""}`;
        }),
        "Qonunning amaldagi tahririni lex.uz’dan tekshiring.",
      ].join("\n\n")
    : "Korpusdan mos modda topilmadi. Savolga hujjat nomi, modda raqami yoki vaziyatga oid aniq atamalarni qo‘shib qayta yozing. AI model ulanmagani sababli umumiy huquqiy xulosa bermayman.";
  return { answer, citations };
}

function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}

function readBody(request, response, callback) {
  let body = "";
  let tooLarge = false;
  request.on("data", (chunk) => {
    if (tooLarge) return;
    body += chunk;
    if (body.length > 100_000) {
      tooLarge = true;
      body = "";
      sendJson(response, 413, { error: "Savol hajmi juda katta." });
    }
  });
  request.on("end", () => {
    if (tooLarge || response.writableEnded) return;
    try { callback(JSON.parse(body)); }
    catch { sendJson(response, 400, { error: "So‘rov JSON formatida noto‘g‘ri." }); }
  });
}

export function createCorpusFallbackMiddleware(root) {
  let index;
  const rates = new Map();
  return (request, response, next) => {
    const pathname = request.url?.split("?", 1)[0];
    if (request.method !== "POST" || !["/api/chat", "/api/chat/completions"].includes(pathname)) {
      return next();
    }

    const client = request.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const recent = (rates.get(client) ?? []).filter((at) => now - at < 60_000);
    if (recent.length >= 10) return sendJson(response, 429, { error: "So‘rovlar chekloviga yetdingiz." });
    recent.push(now);
    rates.set(client, recent);

    readBody(request, response, (body) => {
      let question = "";
      if (pathname === "/api/chat") {
        question = typeof body?.message === "string" ? body.message : "";
      } else {
        const messages = Array.isArray(body?.messages) ? body.messages : [];
        const last = [...messages].reverse().find((message) => message?.role === "user");
        question = typeof last?.content === "string" ? last.content : "";
      }
      if (!question.trim()) return sendJson(response, 400, { error: "Savol matnini kiriting." });
      try { index ??= loadCorpus(root); }
      catch { return sendJson(response, 503, { error: "Huquqiy korpus fayllarini o‘qib bo‘lmadi." }); }
      const result = makeReply(index, question);
      if (pathname === "/api/chat") {
        return sendJson(response, 200, {
          ...result,
          audio_base64: null,
          audio_mime_type: null,
          tts_provider: null,
          retrieval_mode: "local-corpus-search",
        });
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("X-Accel-Buffering", "no");
      const id = `chatcmpl-local-${Date.now()}`;
      const emit = (payload) => response.write(`data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [], ...payload })}\n\n`);
      emit({ choices: [{ index: 0, delta: { role: "assistant", content: result.answer }, finish_reason: null }] });
      emit({ retrieval_mode: "local-corpus-search", citations: result.citations });
      response.end("data: [DONE]\n\n");
    });
  };
}
