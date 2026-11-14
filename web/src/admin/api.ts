export interface AdminCorpusSummary {
  snapshot_date: string;
  documents: number;
  articles: number;
  manifest_articles: number;
  documents_with_source_ids: number;
}

export interface AdminModelStatus {
  status: "online" | "offline" | "degraded";
  model_id: string;
  served_models: string[];
  latency_ms: number | null;
  message: string;
}

export interface RequestBucket {
  at: string;
  requests: number;
}

export interface RequestMetrics {
  window_hours: number;
  requests: number;
  requests_since_start: number;
  in_flight: number;
  failed: number;
  avg_latency_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  citation_count: number;
  retrieval_modes: Record<string, number>;
  timeline: RequestBucket[];
  retention: string;
}

export interface AdminOverview {
  generated_at: string;
  uptime_seconds: number;
  corpus: AdminCorpusSummary;
  model: AdminModelStatus;
  requests: RequestMetrics;
  infrastructure: {
    process_cpu_seconds: number;
    process_peak_rss_mb: number;
    gpu: Record<string, unknown> & { status: string };
    postgresql: { status: string };
    redis: { status: string };
    queue_workers: { status: string };
  };
  integrations: Record<string, { status: string; reason?: string }>;
  rate_limit: {
    requests: number;
    window_seconds: number;
    scope: string;
  };
}

export interface LegalDocument {
  code: string;
  filename: string;
  title: string;
  lex_uz_doc: string;
  adopted: string;
  articles_count: number;
  last_article: number;
  sha256: string;
  snapshot_date: string;
}

export interface Article {
  code: string;
  code_title: string;
  article_id: string;
  article: string;
  title: string;
  text_preview: string;
  lex_uz_doc: string;
  snapshot_date: string;
  seq: number;
}

export interface ArticleDetail {
  code: string;
  code_title: string;
  article_id: string;
  article: string;
  title: string;
  text: string;
  lex_uz_doc: string;
  snapshot_date: string;
}

export interface Page<T> {
  page: number;
  page_size: number;
  total: number;
  pages: number;
  results: T[];
}

export interface AdminAiConfig {
  model: string;
  temperature: number;
  chat_temperature: number;
  max_tokens: number;
  top_k: number;
  legal_distance: number;
  history_turns: number;
  query_device: string;
  corpus_source: string;
  prompt_rules: {
    uzbek_latin: string;
    russian: string;
  };
}

export interface AdminEvaluation {
  dataset: string;
  cases: number;
  result_status: string;
  saved_result_available: boolean;
}

export interface AdminSecurity {
  admin_credentials_configured: boolean;
  legacy_api_keys_configured: boolean;
  chat_rate_limit: {
    requests: number;
    window_seconds: number;
    scope: string;
  };
  failed_admin_logins: {
    status: string;
    persistent_audit_log: boolean;
  };
  user_sessions: { status: string };
  permissions: { status: string };
  audit_log: { status: string };
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const apiBase = "/api/admin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStatus(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function isLegalDocument(value: unknown): value is LegalDocument {
  return isRecord(value)
    && isString(value.code)
    && isString(value.filename)
    && isString(value.title)
    && isString(value.lex_uz_doc)
    && isString(value.adopted)
    && isNumber(value.articles_count)
    && isNumber(value.last_article)
    && isString(value.sha256)
    && isString(value.snapshot_date);
}

function isArticle(value: unknown): value is Article {
  return isRecord(value)
    && isString(value.code)
    && isString(value.code_title)
    && isString(value.article_id)
    && isString(value.article)
    && isString(value.title)
    && isString(value.text_preview)
    && isString(value.lex_uz_doc)
    && isString(value.snapshot_date)
    && isNumber(value.seq);
}

function isArticleDetail(value: unknown): value is ArticleDetail {
  return isRecord(value)
    && isString(value.code)
    && isString(value.code_title)
    && isString(value.article_id)
    && isString(value.article)
    && isString(value.title)
    && isString(value.text)
    && isString(value.lex_uz_doc)
    && isString(value.snapshot_date);
}

function isPage<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is Page<T> {
  return isRecord(value)
    && isNumber(value.page)
    && isNumber(value.page_size)
    && isNumber(value.total)
    && isNumber(value.pages)
    && Array.isArray(value.results)
    && value.results.every(isItem);
}

function isAdminOverview(value: unknown): value is AdminOverview {
  if (!isRecord(value) || !isRecord(value.corpus) || !isRecord(value.model)
    || !isRecord(value.requests) || !isRecord(value.infrastructure)
    || !isRecord(value.integrations) || !isRecord(value.rate_limit)) return false;
  const corpus = value.corpus;
  const model = value.model;
  const requests = value.requests;
  const infrastructure = value.infrastructure;
  const rateLimit = value.rate_limit;
  return isString(value.generated_at)
    && isNumber(value.uptime_seconds)
    && isString(corpus.snapshot_date)
    && isNumber(corpus.documents)
    && isNumber(corpus.articles)
    && isNumber(corpus.manifest_articles)
    && isNumber(corpus.documents_with_source_ids)
    && isStatus(model.status)
    && isString(model.model_id)
    && Array.isArray(model.served_models)
    && model.served_models.every(isString)
    && (model.latency_ms === null || isNumber(model.latency_ms))
    && isString(model.message)
    && isNumber(requests.window_hours)
    && isNumber(requests.requests)
    && isNumber(requests.requests_since_start)
    && isNumber(requests.in_flight)
    && isNumber(requests.failed)
    && (requests.avg_latency_ms === null || isNumber(requests.avg_latency_ms))
    && isNumber(requests.prompt_tokens)
    && isNumber(requests.completion_tokens)
    && isNumber(requests.citation_count)
    && isRecord(requests.retrieval_modes)
    && Object.values(requests.retrieval_modes).every(isNumber)
    && isString(requests.retention)
    && Array.isArray(requests.timeline)
    && requests.timeline.every((bucket) => isRecord(bucket)
      && isString(bucket.at) && isNumber(bucket.requests))
    && isNumber(infrastructure.process_cpu_seconds)
    && isNumber(infrastructure.process_peak_rss_mb)
    && isRecord(infrastructure.gpu)
    && isStatus(infrastructure.gpu.status)
    && isRecord(infrastructure.postgresql)
    && isStatus(infrastructure.postgresql.status)
    && isRecord(infrastructure.redis)
    && isStatus(infrastructure.redis.status)
    && isRecord(infrastructure.queue_workers)
    && isStatus(infrastructure.queue_workers.status)
    && Object.values(value.integrations).every((item) => isRecord(item) && isStatus(item.status))
    && isNumber(rateLimit.requests)
    && isNumber(rateLimit.window_seconds)
    && isString(rateLimit.scope);
}

function isAiConfig(value: unknown): value is AdminAiConfig {
  return isRecord(value)
    && isString(value.model)
    && isNumber(value.temperature)
    && isNumber(value.chat_temperature)
    && isNumber(value.max_tokens)
    && isNumber(value.top_k)
    && isNumber(value.legal_distance)
    && isNumber(value.history_turns)
    && isString(value.query_device)
    && isString(value.corpus_source)
    && isRecord(value.prompt_rules)
    && isString(value.prompt_rules.uzbek_latin)
    && isString(value.prompt_rules.russian);
}

function isEvaluation(value: unknown): value is AdminEvaluation {
  return isRecord(value)
    && isString(value.dataset)
    && isNumber(value.cases)
    && isString(value.result_status)
    && typeof value.saved_result_available === "boolean";
}

function isAdminSecurity(value: unknown): value is AdminSecurity {
  return isRecord(value)
    && typeof value.admin_credentials_configured === "boolean"
    && typeof value.legacy_api_keys_configured === "boolean"
    && isRecord(value.chat_rate_limit)
    && isNumber(value.chat_rate_limit.requests)
    && isNumber(value.chat_rate_limit.window_seconds)
    && isString(value.chat_rate_limit.scope)
    && isRecord(value.failed_admin_logins)
    && isString(value.failed_admin_logins.status)
    && typeof value.failed_admin_logins.persistent_audit_log === "boolean"
    && isRecord(value.user_sessions)
    && isString(value.user_sessions.status)
    && isRecord(value.permissions)
    && isString(value.permissions.status)
    && isRecord(value.audit_log)
    && isString(value.audit_log.status);
}

function expectShape<T>(
  value: unknown,
  guard: (candidate: unknown) => candidate is T,
  label: string,
): T {
  if (!guard(value)) {
    throw new AdminApiError(
      `Admin API “${label}” javobining shakli notoʻgʻri. Backend versiyasini tekshiring.`,
      502,
      "invalid_response",
    );
  }
  return value;
}

function errorDetails(body: unknown): { message: string; code: string } {
  if (!isRecord(body)) {
    return {
      message: "Admin API tushunarli xato qaytarmadi.",
      code: "invalid_error",
    };
  }
  const detail = isRecord(body.detail) ? body.detail : body;
  return {
    message:
      typeof detail.message === "string"
        ? detail.message
        : "Admin soʻrovi bajarilmadi.",
    code: typeof detail.code === "string" ? detail.code : "request_failed",
  };
}

async function requestJSON<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    signal?: AbortSignal;
    query?: URLSearchParams;
    body?: unknown;
  } = {},
): Promise<T> {
  const url = options.query?.size
    ? `${apiBase}${path}?${options.query.toString()}`
    : `${apiBase}${path}`;
  const headers = new Headers({
    Accept: "application/json",
    "X-Admin-Request": "1",
  });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const controller = new AbortController();
  const propagateAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", propagateAbort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  let payload: unknown;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: "no-store",
    });
    try {
      payload = await response.json();
    } catch {
      throw new AdminApiError(
        response.ok
          ? "Admin API notoʻgʻri JSON qaytardi."
          : "Admin API javobini oʻqib boʻlmadi.",
        response.status,
        "invalid_response",
      );
    }
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    if (controller.signal.aborted) {
      if (options.signal?.aborted) throw error;
      throw new AdminApiError(
        "Admin server 15 soniyada javob bermadi. Ulanishni tekshirib, qayta urinib koʻring.",
        408,
        "request_timeout",
      );
    }
    if (error instanceof TypeError) {
      throw new AdminApiError(
        "Admin APIʼga ulanib boʻlmadi. Backend holati va server URLʼini tekshiring.",
        0,
        "network_error",
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    options.signal?.removeEventListener("abort", propagateAbort);
  }
  if (!response.ok) {
    const error = errorDetails(payload);
    throw new AdminApiError(error.message, response.status, error.code);
  }
  if (!isRecord(payload)) {
    throw new AdminApiError(
      "Admin API javobining shakli notoʻgʻri.",
      response.status,
      "invalid_response",
    );
  }
  return payload as T;
}

export interface AdminSession {
  authenticated: true;
  username: string;
}

function isAdminSession(value: unknown): value is AdminSession {
  return isRecord(value)
    && value.authenticated === true
    && isString(value.username)
    && value.username.length > 0;
}

export async function getAdminSession(signal?: AbortSignal): Promise<AdminSession> {
  return expectShape(
    await requestJSON<unknown>("/session", { signal }),
    isAdminSession,
    "session",
  );
}

export async function signIn(username: string, password: string): Promise<AdminSession> {
  const candidate = username.trim();
  if (!candidate || candidate.length > 256 || !password || password.length > 4096) {
    throw new AdminApiError(
      "Foydalanuvchi nomi yoki parol kiritilmagan yoxud uzunligi ruxsat etilgan chegaradan oshgan.",
      400,
      "invalid_credentials_shape",
    );
  }
  return expectShape(
    await requestJSON<unknown>("/session", {
      method: "POST",
      body: { username: candidate, password },
    }),
    isAdminSession,
    "session",
  );
}

export async function signOut(): Promise<void> {
  await requestJSON("/logout", { method: "POST" });
}

export async function getOverview(signal?: AbortSignal): Promise<AdminOverview> {
  return expectShape(await requestJSON<unknown>("/overview", { signal }), isAdminOverview, "overview");
}

export async function getDocuments(
  query: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<Page<LegalDocument>> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    page_size: String(pageSize),
  });
  return expectShape(
    await requestJSON<unknown>("/corpus/documents", { query: params, signal }),
    (value): value is Page<LegalDocument> => isPage(value, isLegalDocument),
    "documents",
  );
}

export async function getArticles(
  query: string,
  code: string,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<Page<Article>> {
  const params = new URLSearchParams({
    query,
    code,
    page: String(page),
    page_size: String(pageSize),
  });
  return expectShape(
    await requestJSON<unknown>("/corpus/articles", { query: params, signal }),
    (value): value is Page<Article> => isPage(value, isArticle),
    "articles",
  );
}

export async function getArticleDetail(
  code: string,
  articleId: string,
  signal?: AbortSignal,
): Promise<ArticleDetail> {
  return expectShape(
    await requestJSON<unknown>("/corpus/article", {
      query: new URLSearchParams({ code, article_id: articleId }),
      signal,
    }),
    isArticleDetail,
    "article",
  );
}

export async function getAiConfig(signal?: AbortSignal): Promise<AdminAiConfig> {
  return expectShape(await requestJSON<unknown>("/ai/config", { signal }), isAiConfig, "AI config");
}

export async function getEvaluations(
  signal?: AbortSignal,
): Promise<AdminEvaluation> {
  return expectShape(await requestJSON<unknown>("/evaluations", { signal }), isEvaluation, "evaluations");
}

export async function getSecurity(
  signal?: AbortSignal,
): Promise<AdminSecurity> {
  return expectShape(await requestJSON<unknown>("/security", { signal }), isAdminSecurity, "security");
}
