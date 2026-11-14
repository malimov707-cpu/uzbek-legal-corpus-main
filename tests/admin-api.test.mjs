import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminApiError,
  getAdminSession,
  getDocuments,
  getOverview,
  getSecurity,
  signIn,
  signOut,
} from "../.test-dist/web/src/admin/api.js";

const credentials = { username: "operator", password: "a-private-admin-password" };

test("admin login requires both username and password without a network request", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(JSON.stringify({ authenticated: true, username: "operator" }));
  };
  try {
    await assert.rejects(signIn("", credentials.password), /Foydalanuvchi nomi/);
    await assert.rejects(signIn(credentials.username, ""), /Foydalanuvchi nomi/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin login sends credentials only in same-origin JSON and accepts a cookie session", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({
      authenticated: true,
      username: "operator",
      expires_in: 28800,
    }));
  };
  try {
    const session = await signIn(` ${credentials.username} `, credentials.password);
    assert.equal(session.authenticated, true);
    assert.equal(session.username, "operator");
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(requests[0].init.body), credentials);
    assert.equal(requests[0].init.headers.get("X-Admin-Request"), "1");
    assert.equal(requests[0].init.headers.get("Content-Type"), "application/json");
    assert.equal(requests[0].init.headers.has("Authorization"), false);
    assert.equal(requests[0].init.credentials, "same-origin");
    assert.equal(requests[0].url.includes(credentials.password), false);
    assert.equal(requests[0].init.cache, "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin data requests use same-origin cookies and the CSRF request header", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({
      page: 1,
      page_size: 25,
      total: 0,
      pages: 0,
      results: [],
    }));
  };
  try {
    await getDocuments("", 1, 25);
    assert.equal(requests[0].init.headers.get("X-Admin-Request"), "1");
    assert.equal(requests[0].init.credentials, "same-origin");
    assert.equal(requests[0].init.headers.has("Authorization"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin API rejects malformed overview payloads instead of trusting their shape", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ requests: "many" }));
  try {
    await assert.rejects(
      getOverview(),
      (error) => error instanceof AdminApiError
        && error.status === 502
        && error.code === "invalid_response",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("expired admin cookie session is reported as unauthorized", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.get("X-Admin-Request"), "1");
    return new Response(JSON.stringify({
      detail: { code: "admin_auth_required", message: "Admin session expired." },
    }), { status: 401 });
  };
  try {
    await assert.rejects(
      getAdminSession(),
      (error) => error instanceof AdminApiError
        && error.status === 401
        && error.code === "admin_auth_required",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("security status validates username/password admin configuration", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    admin_credentials_configured: true,
    legacy_api_keys_configured: false,
    chat_rate_limit: { requests: 10, window_seconds: 60, scope: "per_process" },
    failed_admin_logins: { status: "in_memory_rate_limit_only", persistent_audit_log: false },
    user_sessions: { status: "not_configured" },
    permissions: { status: "single_admin_account" },
    audit_log: { status: "not_configured" },
  }));
  try {
    assert.equal((await getSecurity()).admin_credentials_configured, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin logout requests server-side cookie deletion", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), init };
    return new Response(JSON.stringify({ authenticated: false }));
  };
  try {
    await signOut();
    assert.equal(request.url.endsWith("/logout"), true);
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.headers.get("X-Admin-Request"), "1");
    assert.equal(request.init.credentials, "same-origin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin API turns network failures into a readable recovery error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  try {
    await assert.rejects(getOverview(), /Admin APIʼga ulanib boʻlmadi/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
