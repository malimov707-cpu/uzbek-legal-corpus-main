import assert from "node:assert/strict";
import test from "node:test";
import { streamChat } from "../.test-dist/web/src/api.js";
import { redactSensitiveText } from "../.test-dist/web/src/privacy.js";

function sseResponse(parts, status = 200) {
  const body = new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

test("redacts PINFL, payment card, passport and Uzbek phone identifiers", () => {
  const text =
    "12345678901234 8600123412341234 AB1234567 +998 90 123 45 67";
  const redacted = redactSensitiveText(text);
  assert.equal((redacted.match(/maxfiy maʼlumot olib tashlandi/g) ?? []).length, 4);
  assert.doesNotMatch(redacted, /\d{9,}|AB1234567/);
});

test("parses chunked streaming text and retains citation metadata", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    return sseResponse([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Javob " } }] })}\n\n`,
      `data: ${JSON.stringify({
        choices: [{ delta: { content: "matni." } }],
        citations: [{ code: "mehnat_kodeksi", code_title: "Mehnat kodeksi", article: "154-modda", lex_uz: "-1234" }],
        retrieval_mode: "semantic",
      })}\n\n`,
      "data: [DONE]\n\n",
    ]);
  };
  try {
    const chunks = [];
    const result = await streamChat(
      [{ role: "user", content: "Savol" }],
      (chunk) => chunks.push(chunk),
      new AbortController().signal,
    );
    assert.deepEqual(chunks, ["Javob ", "matni."]);
    assert.equal(result.retrievalMode, "semantic");
    assert.equal(result.citations[0].lex_uz, "-1234");
    assert.deepEqual(calls[0].messages, [{ role: "user", content: "Savol" }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a readable server error instead of trusting an invalid choice", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "Model ishlamayapti." } }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  try {
    await assert.rejects(
      streamChat([{ role: "user", content: "Savol" }], () => {}, new AbortController().signal),
      /Model ishlamayapti/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("explains when the backend itself is unreachable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("proxy could not connect", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  try {
    await assert.rejects(
      streamChat([{ role: "user", content: "Savol" }], () => {}, new AbortController().signal),
      /Backend yoki til modeli ishlamayapti/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("explains when the configured chat endpoint is missing", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "route not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  try {
    await assert.rejects(
      streamChat([{ role: "user", content: "Savol" }], () => {}, new AbortController().signal),
      /Chat API topilmadi/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a stream that omits its final citation metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    sseResponse([
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Javob" } }] })}\n\n`,
      "data: [DONE]\n\n",
    ]);
  try {
    await assert.rejects(
      streamChat([{ role: "user", content: "Savol" }], () => {}, new AbortController().signal),
      /yakuniy maʼlumot/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("turns upstream SSE failures into a clear retryable error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    sseResponse([
      `data: ${JSON.stringify({
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        error: {
          type: "upstream_unavailable",
          message: "Til modeli hozircha ishlamayapti.",
        },
      })}\n\n`,
      "data: [DONE]\n\n",
    ]);
  try {
    await assert.rejects(
      streamChat([{ role: "user", content: "Savol" }], () => {}, new AbortController().signal),
      /Til modeli hozircha ishlamayapti/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("aborts a pending request when the user cancels", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true },
      );
    });
  const controller = new AbortController();
  const pending = streamChat(
    [{ role: "user", content: "Savol" }],
    () => {},
    controller.signal,
  );
  controller.abort();
  try {
    await assert.rejects(pending, (error) => error.kind === "cancelled");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
