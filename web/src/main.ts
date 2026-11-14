import "./style.css";
import { ChatRequestError, streamChat, type Citation } from "./api";
import { redactSensitiveText } from "./privacy";
import {
  formatDateTime,
  getLanguage,
  getLocale,
  initLanguage,
  setLanguage,
  t,
  type UiLanguage,
} from "./i18n";

type MessageStatus = "complete" | "streaming" | "error";
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: MessageStatus;
  citations?: Citation[];
  retrievalMode?: string;
  errorMessage?: string;
}
interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = "huquqiy-yordam.conversations.v1";
const THEME_KEY = "huquqiy-yordam.theme.v1";
const chatElement = document.querySelector<HTMLElement>("#chat")!;
const conversationList = document.querySelector<HTMLElement>("#conversation-list")!;
const input = document.querySelector<HTMLTextAreaElement>("#message-input")!;
const composer = document.querySelector<HTMLFormElement>("#composer")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-button")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-button")!;
const notice = document.querySelector<HTMLElement>("#notice")!;
const count = document.querySelector<HTMLElement>("#char-count")!;
const sidebar = document.querySelector<HTMLElement>(".sidebar")!;
const sidebarScrim = document.querySelector<HTMLButtonElement>("#sidebar-scrim")!;
const mobileHistoryButton = document.querySelector<HTMLButtonElement>("#mobile-history")!;
const scrollBottomButton = document.querySelector<HTMLButtonElement>("#scroll-bottom")!;
const historyFilter = document.querySelector<HTMLInputElement>("#history-filter")!;
const themeToggle = document.querySelector<HTMLButtonElement>("#theme-toggle")!;
const themeIcon = document.querySelector<SVGElement>("#theme-icon")!;;
const themeLabel = document.querySelector<HTMLElement>("#theme-label")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export-chat")!;

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  themeIcon.innerHTML =
    theme === "dark"
      ? '<path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path d="M7 17l-1.4 1.4M18.4 5.6 17 7" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path d="M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/>'
      : '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>';
  themeLabel.textContent = theme === "dark" ? t("chat.themeLight") : t("chat.themeLabel");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable — theme stays per-visit */
  }
}

function initTheme(): void {
  // The inline bootstrap script in index.html already set the class before paint.
  let stored: string | null = document.documentElement.dataset.theme ?? null;
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light");
}

themeToggle.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
initTheme();

let historyQuery = "";
historyFilter.addEventListener("input", () => {
  historyQuery = historyFilter.value.trim().toLowerCase();
  renderSidebar();
});

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function conversationText(conversation: Conversation): string {
  const lines = [
    `Huquqiy yordam — ${conversation.title}`,
    `${t("export.date")}: ${formatDateTime(conversation.createdAt, { dateStyle: "full" })}`,
    "",
  ];
  for (const message of conversation.messages) {
    const who = message.role === "assistant" ? t("chat.assistant") : t("chat.you");
    lines.push(`— ${who} (${formatDateTime(message.createdAt, { hour: "2-digit", minute: "2-digit" })}) —`);
    lines.push(message.content);
    if (message.citations?.length) {
      lines.push(`${t("export.sources")}`);
      for (const citation of message.citations) {
        lines.push(`  • ${citation.code_title}, ${citation.article}${/^-?\d+$/.test(citation.lex_uz) ? ` — https://lex.uz/docs/${citation.lex_uz}` : ""}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

function exportActiveConversation(): void {
  const conversation = currentConversation();
  if (!conversation || !conversation.messages.length) {
    showNotice(t("notice.noActiveExport"));
    return;
  }
  const safeName = conversation.title.replace(/[^a-zA-Z0-9\s\u002D]/g, "").trim().slice(0, 40) || t("export.filePrefix");
  downloadTextFile(`${safeName}.txt`, conversationText(conversation));
  showNotice(t("notice.exported"));
}

exportButton.addEventListener("click", exportActiveConversation);

let conversations = loadConversations();
let activeConversationId: string | null = null;
let noticeTimer: number | undefined;
let saveTimer: number | undefined;
const requests = new Map<string, AbortController>();

function isCitation(value: unknown): value is Citation {
  if (typeof value !== "object" || value === null) return false;
  const citation = value as Record<string, unknown>;
  return (
    typeof citation.code === "string" &&
    typeof citation.code_title === "string" &&
    typeof citation.article === "string" &&
    typeof citation.lex_uz === "string"
  );
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Invalid history");
    const valid = parsed.filter((item): item is Conversation => {
      if (typeof item !== "object" || item === null) return false;
      const record = item as Record<string, unknown>;
      return (
        typeof record.id === "string" &&
        typeof record.title === "string" &&
        typeof record.createdAt === "number" &&
        typeof record.updatedAt === "number" &&
        Array.isArray(record.messages) &&
        record.messages.every((message: unknown) => {
          if (typeof message !== "object" || message === null) return false;
          const value = message as Record<string, unknown>;
          return (
            typeof value.id === "string" &&
            (value.role === "user" || value.role === "assistant") &&
            typeof value.content === "string" &&
            typeof value.createdAt === "number" &&
            (value.errorMessage === undefined ||
              typeof value.errorMessage === "string") &&
            (value.retrievalMode === undefined ||
              typeof value.retrievalMode === "string") &&
            (value.status === "complete" ||
              value.status === "streaming" ||
              value.status === "error") &&
            (value.citations === undefined ||
              (Array.isArray(value.citations) && value.citations.every(isCitation)))
          );
        })
      );
    });
    return valid.map((conversation) => ({
      ...conversation,
      title: redactSensitiveText(conversation.title),
      messages: conversation.messages.map((message) => ({
        ...message,
        content: redactSensitiveText(message.content),
        status: message.status === "streaming" ? "error" : message.status,
        errorMessage:
          message.status === "streaming"
            ? t("notice.interrupted")
            : message.errorMessage,
      })),
    }));
  } catch {
    window.setTimeout(
      () => showNotice(t("notice.historyBroken")),
      0,
    );
    return [];
  }
}

function persistHistory(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    showNotice(t("notice.storageFull"));
  }
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persistHistory, 180);
}

function showNotice(message: string): void {
  notice.textContent = message;
  notice.hidden = false;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    notice.hidden = true;
  }, 6500);
}

function currentConversation(): Conversation | undefined {
  return conversations.find((conversation) => conversation.id === activeConversationId);
}

function updateConversation(
  id: string,
  update: (conversation: Conversation) => Conversation,
  scrollToBottom = false,
): void {
  conversations = conversations.map((conversation) =>
    conversation.id === id ? update(conversation) : conversation,
  );
  scheduleSave();
  renderSidebar();
  if (activeConversationId === id) renderMessages(scrollToBottom);
}

function icon(name: "copy" | "trash" | "chat" | "rename" | "download"): SVGSVGElement {
  const paths: Record<typeof name, string[]> = {
    copy: ["M8 8h11v13H8z", "M16 8V3H4v13h4"],
    trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 14h10l1-14", "M9 7V4h6v3"],
    chat: ["M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z"],
    rename: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"],
    download: ["M12 15V3m0 12-4-4m4 4 4-4", "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"],
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths[name]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.7");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

function renderSidebar(): void {
  conversationList.replaceChildren();
  const ordered = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const matches = ordered.filter(
    (conversation) =>
      !historyQuery ||
      conversation.title.toLowerCase().includes(historyQuery) ||
      conversation.messages.some((message) => message.content.toLowerCase().includes(historyQuery)),
  );
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = historyQuery
      ? t("notice.searchEmpty")
      : t("notice.historyEmpty");
    conversationList.append(empty);
    return;
  }
  for (const conversation of matches) {
    const row = document.createElement("div");
    row.className = "conversation-row";
    row.classList.toggle("active", conversation.id === activeConversationId);

    const open = document.createElement("button");
    open.className = "conversation-open";
    open.type = "button";
    open.setAttribute("aria-current", conversation.id === activeConversationId ? "page" : "false");
    open.append(icon("chat"));
    const title = document.createElement("span");
    title.textContent = conversation.title;
    open.append(title);
    open.addEventListener("click", () => {
      activeConversationId = conversation.id;
      closeSidebar();
      render();
      if (conversations.length) persistHistory();
    });

    const remove = document.createElement("button");
    remove.className = "conversation-tool danger";
    remove.type = "button";
    remove.setAttribute("aria-label", `“${conversation.title}” ${t("aria.deleteConversation")}`);
    remove.append(icon("trash"));
    remove.addEventListener("click", () => deleteConversation(conversation.id));

    const exportOne = document.createElement("button");
    exportOne.className = "conversation-tool";
    exportOne.type = "button";
    exportOne.setAttribute("aria-label", `“${conversation.title}” ${t("aria.exportConversation")}`);
    exportOne.append(icon("download"));
    exportOne.addEventListener("click", () => {
      downloadTextFile(
        `huquqiy-suhbat-${new Date(conversation.updatedAt).toISOString().slice(0, 10)}.txt`,
        conversationText(conversation),
      );
      showNotice("Suhbat matn fayl sifatida yuklab olindi.");
    });

    const rename = document.createElement("button");
    rename.className = "conversation-tool";
    rename.type = "button";
    rename.setAttribute("aria-label", `“${conversation.title}” ${t("aria.renameConversation")}`);
    rename.append(icon("rename"));
    rename.addEventListener("click", () => {
      const next = window.prompt(t("chat.renamePrompt"), conversation.title);
      if (next === null) return;
      const clean = redactSensitiveText(next).replace(/\s+/g, " ").trim();
      if (!clean || clean === conversation.title) return;
      updateConversation(conversation.id, (current) => ({
        ...current,
        title: clean.length > 58 ? `${clean.slice(0, 55)}…` : clean,
      }));
      persistHistory();
    });

    const tools = document.createElement("div");
    tools.className = "conversation-row-tools";
    tools.append(rename, exportOne, remove);
    row.append(open, tools);
    conversationList.append(row);
  }
}

function appendCitationCard(container: HTMLElement, citation: Citation): void {
  const card = document.createElement("article");
  card.className = "citation-card";
  const marker = document.createElement("span");
  marker.className = "citation-marker";
  marker.textContent = "§";
  const details = document.createElement("div");
  details.className = "citation-details";
  const title = document.createElement("strong");
  title.textContent = citation.code_title;
  const article = document.createElement("span");
  article.textContent = citation.article;
  details.append(title, article);
  card.append(marker, details);

  if (/^-?\d+$/.test(citation.lex_uz)) {
    const link = document.createElement("a");
    link.className = "citation-link";
    link.href = `https://lex.uz/docs/${encodeURIComponent(citation.lex_uz)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Lex.uz";
    link.setAttribute("aria-label", `${citation.code_title}, ${citation.article}, ${t("aria.openLex")}`);
    card.append(link);
  } else {
    const sourceStatus = document.createElement("span");
    sourceStatus.className = "citation-unlinked";
    sourceStatus.textContent = t("chat.source");
    card.append(sourceStatus);
  }
  container.append(card);
}

function renderRichContent(content: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const escape = (value: string): string => {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  };
  const inline = (value: string): string =>
    escape(value)
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>");
  const blocks = content.split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim());
    if (!lines.length) continue;
    const allBullets = lines.every((line) => /^[-•*]\s+/.test(line.trim()));
    const allOrdered = lines.every((line) => /^\d+[.)]\s+/.test(line.trim()));
    const isHeading = lines.length === 1 && /^(#{2,4})\s+/.test(lines[0].trim());
    if (isHeading) {
      const heading = document.createElement("h3");
      heading.textContent = lines[0].trim().replace(/^#{2,4}\s+/, "");
      fragment.append(heading);
    } else if (allBullets) {
      const list = document.createElement("ul");
      for (const line of lines) {
        const item = document.createElement("li");
        item.innerHTML = inline(line.trim().replace(/^[-•*]\s+/, ""));
        list.append(item);
      }
      fragment.append(list);
    } else if (allOrdered) {
      const list = document.createElement("ol");
      for (const line of lines) {
        const item = document.createElement("li");
        item.innerHTML = inline(line.trim().replace(/^\d+[.)]\s+,/, "").replace(/^\d+[.)]\s+/, ""));
        list.append(item);
      }
      fragment.append(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = lines.map(inline).join("<br />");
      fragment.append(paragraph);
    }
  }
  return fragment;
}

function renderMessage(message: ChatMessage): HTMLElement {
  const article = document.createElement("article");
  article.className = `message message-${message.role}`;
  const avatar = document.createElement("div");
  avatar.className = `message-avatar ${message.role === "assistant" ? "assistant-avatar" : "user-avatar"}`;
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = message.role === "assistant" ? t("chat.avatarAssistant") : t("chat.avatarUser");

  const body = document.createElement("div");
  body.className = "message-body";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const author = document.createElement("strong");
  author.textContent = message.role === "assistant" ? t("chat.assistant") : t("chat.you");
  meta.append(author);
  const time = document.createElement("time");
  time.dateTime = new Date(message.createdAt).toISOString();
  time.textContent = formatDateTime(message.createdAt, {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.append(time);

  const content = document.createElement("div");
  content.className = "message-content";
  if (message.role === "assistant" && message.content) {
    content.classList.add("rich");
    content.append(renderRichContent(message.content));
  } else {
    content.textContent = message.content;
  }
  if (message.role === "assistant" && message.status === "streaming" && !message.content) {
    const loading = document.createElement("span");
    loading.className = "typing-indicator";
    loading.setAttribute("aria-label", t("aria.typing"));
    loading.innerHTML = "<i></i><i></i><i></i>";
    content.append(loading);
  }
  body.append(meta, content);

  if (message.role === "assistant" && message.status === "error" && message.errorMessage) {
    const error = document.createElement("p");
    error.className = "message-error";
    error.setAttribute("role", "alert");
    error.textContent = message.errorMessage;
    body.append(error);
  }
  if (message.role === "assistant" && message.citations?.length) {
    const sources = document.createElement("section");
    sources.className = "sources";
    const heading = document.createElement("h3");
    heading.textContent = t("chat.sources");
    sources.append(heading);
    const grid = document.createElement("div");
    grid.className = "citation-list";
    for (const citation of message.citations) appendCitationCard(grid, citation);
    sources.append(grid);
    body.append(sources);
  }
  if (message.role === "assistant" && message.status !== "streaming") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const copy = document.createElement("button");
    copy.type = "button";
    copy.append(icon("copy"), document.createTextNode(t("chat.copy")));
    copy.addEventListener("click", () => {
      if (!navigator.clipboard) {
        showNotice(t("notice.copyFail"));
        return;
      }
      void navigator.clipboard.writeText(message.content).then(
        () => showNotice(t("notice.copied")),
        () => showNotice(t("notice.copyFail")),
      );
    });
    actions.append(copy);
    if (message.status === "error") {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "retry-button";
      retry.textContent = t("chat.retry");
      retry.addEventListener("click", () => void retryMessage(message.id));
      actions.append(retry);
    }
    if (message.retrievalMode) {
      const mode = document.createElement("span");
      mode.className = "retrieval-mode";
      mode.textContent = `${t("chat.retrieval")}: ${message.retrievalMode}`;
      actions.append(mode);
    }
    body.append(actions);
  }

  article.append(avatar, body);
  return article;
}

function renderWelcome(): HTMLElement {
  const welcome = document.createElement("div");
  welcome.className = "welcome";
  const eyebrow = document.createElement("div");
  eyebrow.className = "welcome-eyebrow";
  const line = document.createElement("span");
  line.className = "welcome-line";
  eyebrow.append(line, document.createTextNode(t("welcome.eyebrow")));
  const heading = document.createElement("h1");
  if (getLanguage() === "en") {
    heading.innerHTML = `${t("welcome.headingLine1")} <em>${t("welcome.headingEm")}</em>`;
  } else {
    heading.innerHTML = `${t("welcome.headingLine1")}<br /><em>${t("welcome.headingEm")}</em> ${t("welcome.headingLine2")}`;
  }
  const intro = document.createElement("p");
  intro.className = "welcome-intro";
  intro.textContent = t("welcome.intro");
  const examplesTitle = document.createElement("p");
  examplesTitle.className = "examples-title";
  examplesTitle.textContent = t("welcome.examplesTitle");
  const examples = [
    t("welcome.example1"),
    t("welcome.example2"),
    t("welcome.example3"),
  ];
  const cards = document.createElement("div");
  cards.className = "example-list";
  for (const example of examples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-card";
    button.textContent = example;
    button.addEventListener("click", () => {
      input.value = example;
      updateComposer();
      input.focus();
    });
    cards.append(button);
  }
  const snapshot = document.createElement("p");
  snapshot.className = "welcome-snapshot";
  snapshot.textContent = t("welcome.snapshot");
  welcome.append(eyebrow, heading, intro, examplesTitle, cards, snapshot);
  return welcome;
}

function renderMessages(scrollToBottom = false): void {
  const conversation = currentConversation();
  const messages = conversation?.messages ?? [];
  if (!messages.length) {
    chatElement.replaceChildren(renderWelcome());
  } else {
    const wasNearBottom =
      chatElement.scrollHeight - chatElement.scrollTop - chatElement.clientHeight < 120;
    const fragment = document.createDocumentFragment();
    const list = document.createElement("div");
    list.className = "message-list";
    for (const message of messages) list.append(renderMessage(message));
    fragment.append(list);
    chatElement.replaceChildren(fragment);
    if (scrollToBottom || wasNearBottom) chatElement.scrollTop = chatElement.scrollHeight;
  }
  updateScrollButton();
  const sending = Boolean(requests.get(activeConversationId ?? ""));
  chatElement.setAttribute("aria-busy", String(sending));
  input.disabled = sending;
  sendButton.hidden = sending;
  stopButton.hidden = !sending;
  sendButton.disabled = !input.value.trim();
}

function render(): void {
  renderSidebar();
  renderMessages();
  updateComposer();
  updateExportState();
}

function updateScrollButton(): void {
  const distance = chatElement.scrollHeight - chatElement.scrollTop - chatElement.clientHeight;
  scrollBottomButton.hidden = !chatElement.querySelector(".message-list");
  scrollBottomButton.classList.toggle("is-visible", distance > 240);
}

scrollBottomButton.addEventListener("click", () => {
  chatElement.scrollTo({ top: chatElement.scrollHeight, behavior: "smooth" });
});
chatElement.addEventListener("scroll", updateScrollButton, { passive: true });
window.addEventListener("resize", updateScrollButton);

function updateComposer(): void {
  count.textContent = `${input.value.length} / 12000`;
  const sending = Boolean(requests.get(activeConversationId ?? ""));
  sendButton.disabled = !input.value.trim() || sending;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}

function updateExportState(): void {
  const conversation = currentConversation();
  exportButton.disabled = !conversation?.messages.length;
}

function closeSidebar(): void {
  sidebar.classList.remove("sidebar-open");
  sidebarScrim.hidden = true;
  mobileHistoryButton.setAttribute("aria-expanded", "false");
}

function openSidebar(): void {
  sidebar.classList.add("sidebar-open");
  sidebarScrim.hidden = false;
  mobileHistoryButton.setAttribute("aria-expanded", "true");
  document.querySelector<HTMLButtonElement>("#mobile-close")?.focus();
}

function deleteConversation(id: string): void {
  const conversation = conversations.find((item) => item.id === id);
  if (!conversation || !window.confirm(`“${conversation.title}” ${t("chat.confirmDelete")}`)) return;
  requests.get(id)?.abort();
  requests.delete(id);
  conversations = conversations.filter((item) => item.id !== id);
  if (activeConversationId === id) activeConversationId = null;
  persistHistory();
  render();
}

function createConversation(firstMessage: string): Conversation {
  const now = Date.now();
  const cleanTitle = firstMessage.replace(/\s+/g, " ").trim();
  const conversation: Conversation = {
    id: crypto.randomUUID(),
    title: cleanTitle.length > 58 ? `${cleanTitle.slice(0, 55)}…` : cleanTitle,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  conversations = [conversation, ...conversations];
  activeConversationId = conversation.id;
  return conversation;
}

function errorText(error: unknown): string {
  if (error instanceof ChatRequestError) return error.message;
  if (error instanceof Error && error.name === "AbortError") return t("error.cancelled");
  return t("error.unexpected");
}

async function submitMessage(text: string, retryId?: string): Promise<void> {
  const content = redactSensitiveText(text).trim();
  if (!content) return;
  let conversation = currentConversation();
  if (!conversation) conversation = createConversation(content);
  const conversationId = conversation.id;
  if (requests.has(conversationId)) return;

  let previousMessages = conversation.messages;
  if (retryId) {
    const failedIndex = previousMessages.findIndex((message) => message.id === retryId);
    const userIndex = previousMessages
      .slice(0, failedIndex)
      .map((message) => message.role)
      .lastIndexOf("user");
    if (failedIndex < 0 || userIndex < 0) return;
    previousMessages = previousMessages.slice(0, userIndex + 1);
  }
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    createdAt: Date.now(),
    status: "complete",
  };
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    createdAt: Date.now(),
    status: "streaming",
  };
  const conversationMessages = retryId
    ? [...previousMessages, assistantMessage]
    : [...previousMessages, userMessage, assistantMessage];
  updateConversation(
    conversationId,
    (current) => ({
      ...current,
      updatedAt: Date.now(),
      messages: conversationMessages,
    }),
    true,
  );

  const controller = new AbortController();
  requests.set(conversationId, controller);
  renderMessages();
  if (activeConversationId === conversationId) updateComposer();
  try {
    const turns = conversationMessages
      .filter((message) => message.id !== assistantMessage.id)
      .map(({ role, content: turnContent }) => ({ role, content: turnContent }));
    const result = await streamChat(
      turns,
      (chunk) => {
        updateConversation(conversationId, (current) => ({
          ...current,
          updatedAt: Date.now(),
          messages: current.messages.map((message) =>
            message.id === assistantMessage.id
              ? { ...message, content: message.content + chunk }
              : message,
          ),
        }));
      },
      controller.signal,
    );
    updateConversation(conversationId, (current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === assistantMessage.id
          ? {
              ...message,
              status: "complete",
              citations: result.citations,
              retrievalMode: result.retrievalMode,
            }
          : message,
      ),
    }));
  } catch (error) {
    const message = errorText(error);
    updateConversation(conversationId, (current) => ({
      ...current,
      messages: current.messages.map((item) =>
        item.id === assistantMessage.id
          ? { ...item, status: "error", errorMessage: message }
          : item,
      ),
    }));
    if (!(error instanceof ChatRequestError && error.kind === "cancelled")) {
      showNotice(message);
    }
  } finally {
    requests.delete(conversationId);
    scheduleSave();
    renderSidebar();
    if (activeConversationId === conversationId) {
      renderMessages(true);
      updateComposer();
      input.focus();
    }
  }
}

async function retryMessage(messageId: string): Promise<void> {
  const conversation = currentConversation();
  const failed = conversation?.messages.find((message) => message.id === messageId);
  if (!conversation || !failed) return;
  const failedIndex = conversation.messages.findIndex((message) => message.id === messageId);
  const previousUser = conversation.messages
    .slice(0, failedIndex)
    .filter((message) => message.role === "user")
    .at(-1);
  if (previousUser) await submitMessage(previousUser.content, messageId);
}

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = input.value;
  if (!message.trim()) return;
  input.value = "";
  updateComposer();
  void submitMessage(message);
});
input.addEventListener("input", updateComposer);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    composer.requestSubmit();
  }
});
document.querySelector("#new-chat")?.addEventListener("click", () => {
  activeConversationId = null;
  closeSidebar();
  render();
  input.focus();
});
document.querySelector("#mobile-new-chat")?.addEventListener("click", () => {
  activeConversationId = null;
  render();
  input.focus();
});
mobileHistoryButton.addEventListener("click", openSidebar);
document.querySelector("#mobile-close")?.addEventListener("click", closeSidebar);
sidebarScrim.addEventListener("click", closeSidebar);
stopButton.addEventListener("click", () => {
  const id = activeConversationId;
  if (id) requests.get(id)?.abort();
});
document.querySelector("#clear-history")?.addEventListener("click", () => {
  if (!conversations.length) {
    showNotice(t("notice.noDeleteable"));
    return;
  }
  if (!window.confirm(t("chat.confirmClearAll"))) return;
  for (const controller of requests.values()) controller.abort();
  requests.clear();
  conversations = [];
  activeConversationId = null;
  persistHistory();
  render();
  showNotice(t("notice.cleared"));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSidebar();
    closeLangMenu();
  }
});

function applyTranslations(): void {
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    // For strings that embed a link we only replace the trailing plain part.
    if (element.querySelector("a")) {
      const link = element.querySelector("a");
      const template = t(element.dataset.i18n!);
      const parts = template.split("lex.uz");
      if (parts.length === 2) {
        element.firstChild?.replaceWith(document.createTextNode(parts[0]!));
        element.append(document.createTextNode(parts[1]!.replace(/^dan?\s*/u, "")));
      }
    } else {
      element.textContent = t(element.dataset.i18n!);
    }
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-aria]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAria!));
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder!));
  }
  document.title = t("app.title");
  document.querySelector<HTMLMetaElement>("meta[name=description]")?.setAttribute("content", t("app.description"));
  const langLabel = document.querySelector<HTMLElement>("#lang-label");
  if (langLabel) langLabel.textContent = getLanguage().toUpperCase();
  for (const option of document.querySelectorAll<HTMLButtonElement>("#lang-menu button")) {
    option.setAttribute("aria-selected", String(option.dataset.lang === getLanguage()));
  }
  applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
}

const langButton = document.querySelector<HTMLButtonElement>("#lang-button")!;
const langMenu = document.querySelector<HTMLElement>("#lang-menu")!;
const LANG_LABELS: Record<UiLanguage, string> = { uz: "UZ", cyr: "UZ", ru: "RU", en: "EN" };

function closeLangMenu(): void {
  langMenu.hidden = true;
  langButton.setAttribute("aria-expanded", "false");
}

langButton.addEventListener("click", () => {
  const open = langMenu.hidden;
  langMenu.hidden = !open;
  langButton.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (event) => {
  if (!langPickerContains(event.target as Node)) closeLangMenu();
});
function langPickerContains(target: Node): boolean {
  return langButton.contains(target) || langMenu.contains(target);
}
for (const option of langMenu.querySelectorAll<HTMLButtonElement>("button[data-lang]")) {
  option.addEventListener("click", () => {
    setLanguage(option.dataset.lang as UiLanguage, () => {
      applyTranslations();
      render();
    });
    closeLangMenu();
  });
}

initLanguage();
applyTranslations();
render();
