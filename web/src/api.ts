export interface Citation {
  code: string;
  code_title: string;
  article: string;
  lex_uz: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamResult {
  citations: Citation[];
  retrievalMode: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

type StreamChunk = {
  choices?: Array<{
    delta?: { content?: unknown; reasoning_content?: unknown };
  }>;
  citations?: unknown;
  retrieval_mode?: unknown;
  usage?: unknown;
  error?: unknown;
};

const endpoint =
  (import.meta as ImportMeta & { env?: { VITE_CHAT_ENDPOINT?: string } }).env
    ?.VITE_CHAT_ENDPOINT || "/api/chat/completions";
const INACTIVITY_TIMEOUT_MS = 180_000;

export class ChatRequestError extends Error {
  constructor(
    message: string,
    readonly kind: "network" | "timeout" | "cancelled" | "server" | "invalid",
  ) {
    super(message);
    this.name = "ChatRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) {
    throw new ChatRequestError(
      "Server citation metadata is missing or invalid.",
      "invalid",
    );
  }
  return value.map((citation) => {
    if (
      !isRecord(citation) ||
      typeof citation.code !== "string" ||
      typeof citation.code_title !== "string" ||
      typeof citation.article !== "string" ||
      typeof citation.lex_uz !== "string"
    ) {
      throw new ChatRequestError(
        "Server returned an invalid source reference.",
        "invalid",
      );
    }
    return {
      code: citation.code,
      code_title: citation.code_title,
      article: citation.article,
      lex_uz: citation.lex_uz,
    };
  });
}

function serverErrorMessage(body: unknown): string {
  if (isRecord(body) && isRecord(body.error)) {
    const message = body.error.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Server javob bera olmadi. Birozdan soʻng qayta urinib koʻring.";
}

function backendUnavailableMessage(body: unknown): string {
  const message = serverErrorMessage(body);
  return message === "Server javob bera olmadi. Birozdan soʻng qayta urinib koʻring."
    ? "Backend yoki til modeli ishlamayapti. Xizmatni tekshirib, qayta urinib koʻring."
    : message;
}

export async function streamChat(
  messages: ChatTurn[],
  onText: (chunk: string) => void,
  signal: AbortSignal,
): Promise<StreamResult> {
  const controller = new AbortController();
  let timedOut = false;
  let inactivityTimer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, INACTIVITY_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal.addEventListener("abort", forwardAbort, { once: true });

  const refreshTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, INACTIVITY_TIMEOUT_MS);
  };

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new ChatRequestError(
          "Javob kutilganidan uzoq davom etdi. Qayta urinib koʻring.",
          "timeout",
        );
      }
      if (signal.aborted) {
        throw new ChatRequestError("Soʻrov bekor qilindi.", "cancelled");
      }
      throw new ChatRequestError(
        "Serverga ulanib boʻlmadi. Backend ishlayotganini tekshiring.",
        "network",
      );
    }

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (response.status === 404) {
        throw new ChatRequestError(
          "Chat API topilmadi. RAG backend manzili va /api/chat/completions endpointini tekshiring.",
          "server",
        );
      }
      if (response.status >= 500) {
        throw new ChatRequestError(backendUnavailableMessage(body), "server");
      }
      throw new ChatRequestError(serverErrorMessage(body), "server");
    }
    if (!response.body) {
      throw new ChatRequestError(
        "Server oqimli javob qaytarmadi. Qayta urinib koʻring.",
        "invalid",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotDone = false;
    let retrievalMode: string | null = null;
    let citations: Citation[] | null = null;
    let usage: StreamResult["usage"];

    const consumeEvent = (event: string) => {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) return;
      if (data === "[DONE]") {
        gotDone = true;
        return;
      }

      let chunk: StreamChunk;
      try {
        const parsed: unknown = JSON.parse(data);
        if (!isRecord(parsed)) throw new TypeError("expected an object");
        chunk = parsed as StreamChunk;
      } catch {
        throw new ChatRequestError(
          "Server oqimida notoʻgʻri maʼlumot keldi.",
          "invalid",
        );
      }

      if (isRecord(chunk.error)) {
        const message = chunk.error.message;
        throw new ChatRequestError(
          typeof message === "string"
            ? message
            : "Server javob tayyorlay olmadi. Qayta urinib koʻring.",
          "server",
        );
      }
      if (typeof chunk.retrieval_mode === "string") {
        retrievalMode = chunk.retrieval_mode;
        citations = parseCitations(chunk.citations);
      }
      if (isRecord(chunk.usage)) {
        const promptTokens = chunk.usage.prompt_tokens;
        const completionTokens = chunk.usage.completion_tokens;
        if (
          typeof promptTokens === "number" &&
          typeof completionTokens === "number"
        ) {
          usage = {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
          };
        }
      }
      for (const choice of chunk.choices ?? []) {
        const text = choice.delta?.content;
        if (typeof text === "string" && text) onText(text);
      }
    };

    while (true) {
      let part: ReadableStreamReadResult<Uint8Array>;
      try {
        part = await reader.read();
      } catch (error) {
        if (timedOut) {
          throw new ChatRequestError(
            "Javob kutilganidan uzoq davom etdi. Qayta urinib koʻring.",
            "timeout",
          );
        }
        if (signal.aborted) {
          throw new ChatRequestError("Soʻrov bekor qilindi.", "cancelled");
        }
        throw new ChatRequestError(
          "Aloqa uzildi. Qayta urinib koʻring.",
          "network",
        );
      }
      if (part.done) {
        buffer += decoder.decode();
        if (buffer.trim()) consumeEvent(buffer);
        break;
      }
      refreshTimer();
      buffer += decoder.decode(part.value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";
      for (const event of events) consumeEvent(event);
    }

    if (!gotDone) {
      throw new ChatRequestError(
        "Aloqa javob yakunlanmasdan uzildi. Qayta urinib koʻring.",
        "network",
      );
    }
    if (!retrievalMode || citations === null) {
      throw new ChatRequestError(
        "Javob manbalari haqidagi yakuniy maʼlumot kelmadi.",
        "invalid",
      );
    }
    return { citations, retrievalMode, usage };
  } finally {
    clearTimeout(inactivityTimer);
    signal.removeEventListener("abort", forwardAbort);
  }
}
