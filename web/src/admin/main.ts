import "./tokens.css";
import {
  AdminApiError,
  getAdminSession,
  getAiConfig,
  getArticleDetail,
  getArticles,
  getDocuments,
  getEvaluations,
  getOverview,
  getSecurity,
  signIn,
  signOut,
  type AdminAiConfig,
  type AdminEvaluation,
  type AdminOverview,
  type AdminSecurity,
  type Article,
  type ArticleDetail,
  type LegalDocument,
  type Page,
} from "./api";
import {
  adminLanguage,
  initAdminLanguage,
  setAdminLanguage,
  tt,
  ttTemplate,
} from "./i18n";

type IconName =
  | "activity" | "alert" | "arrow-down" | "arrow-left" | "arrow-right"
  | "arrow-up" | "book" | "bookmark" | "bot" | "check" | "chevron-down"
  | "chevron-left" | "chevron-right" | "chevron-up" | "circle" | "clock"
  | "close" | "collapse" | "copy" | "cpu" | "database" | "document"
  | "download" | "external" | "file-search" | "filter" | "grid" | "hard-drive"
  | "help" | "history" | "key" | "layers" | "link" | "lock" | "logout"
  | "menu" | "moon" | "more" | "network" | "refresh" | "search" | "send"
  | "server" | "shield" | "sparkles" | "sun" | "table" | "target" | "users"
  | "workflow";
type PageId =
  | "overview" | "models" | "usage" | "prompts" | "evaluations"
  | "documents" | "articles" | "provenance" | "pipeline"
  | "document-intelligence" | "security" | "infrastructure";
type SortDirection = "asc" | "desc";

const root = document.querySelector<HTMLElement>("#admin-app");
if (!root) throw new Error("Admin application root is missing.");

const iconPaths: Record<IconName, string[]> = {
  activity: ["M3 12h4l3-8 4 16 3-8h4"],
  alert: ["M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13a2 2 0 0 0-3.4-.1Z", "M12 9v4", "M12 17h.01"],
  "arrow-down": ["M12 5v14", "m19 12-7 7-7-7"],
  "arrow-left": ["M19 12H5", "m12 19-7-7 7-7"],
  "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
  "arrow-up": ["M12 19V5", "m5 12 7-7 7 7"],
  book: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z", "M4 17.5A2.5 2.5 0 0 1 6.5 15H20", "M8 7h8"],
  bookmark: ["M6 4h12v17l-6-4-6 4V4Z"],
  bot: ["M12 8V4", "M9 4h6", "M5 10h14v9H5z", "M8 14h.01", "M16 14h.01", "M9 19v2", "M15 19v2"],
  check: ["m5 12 4 4L19 6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  "chevron-left": ["m15 18-6-6 6-6"],
  "chevron-right": ["m9 18 6-6-6-6"],
  "chevron-up": ["m18 15-6-6-6 6"],
  circle: ["M12 12h.01"],
  clock: ["M12 8v4l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  close: ["m18 6-12 12", "m6 6 12 12"],
  collapse: ["M14 5h5v14h-5", "M10 9l-3 3 3 3", "M7 12h10"],
  copy: ["M8 8h11v13H8z", "M16 8V3H4v13h4"],
  cpu: ["M5 5h14v14H5z", "M9 9h6v6H9z", "M9 1v4", "M15 1v4", "M9 19v4", "M15 19v4", "M1 9h4", "M1 15h4", "M19 9h4", "M19 15h4"],
  database: ["M4 5c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Z", "M4 5v14c0 1.1 3.6 2 8 2s8-.9 8-2V5", "M4 12c0 1.1 3.6 2 8 2s8-.9 8-2"],
  document: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8", "M8 17h8"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  external: ["M14 3h7v7", "M10 14 21 3", "M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"],
  "file-search": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h5", "M14 2v6h6", "M14 2l6 6", "M8 13h6", "M8 17h3", "M19 19l3 3", "M20 16.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"],
  filter: ["M4 5h16", "M7 12h10", "M10 19h4"],
  grid: ["M3 3h8v8H3z", "M13 3h8v5h-8z", "M13 10h8v11h-8z", "M3 13h8v8H3z"],
  "hard-drive": ["M4 6h16l2 12H2L4 6Z", "M6 14h.01", "M10 14h.01", "M5 18v2", "M19 18v2"],
  help: ["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  history: ["M3 12a9 9 0 1 0 2.6-6.4L3 8", "M3 3v5h5", "M12 7v5l3 2"],
  key: ["m21 2-2 2", "M7.5 11.5a5 5 0 1 1 7 7l-4 4-7-7 4-4Z", "m15 13 3-3"],
  layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 16 9 5 9-5"],
  link: ["M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7", "M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4", "M12 15v2"],
  logout: ["M10 17l5-5-5-5", "M15 12H3", "M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  moon: ["M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  network: ["M12 2v5", "M5 17v5", "M19 17v5", "M12 7 5 12v5", "M12 7l7 5v5", "M5 12h14", "M8 17h8"],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M5.6 9a7 7 0 0 1 11.6-2L20 12", "M4 12l2.8 5a7 7 0 0 0 11.6-2"],
  search: ["m20 20-4.3-4.3", "M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"],
  send: ["m22 2-7 20-4-9-9-4Z", "M22 2 11 13"],
  server: ["M4 4h16v6H4z", "M4 14h16v6H4z", "M8 7h.01", "M8 17h.01", "M12 7h5", "M12 17h5"],
  shield: ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m9 12 2 2 4-4"],
  sparkles: ["m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z", "m19 14 .9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14Z"],
  sun: ["M12 3v2", "M12 19v2", "M3 12h2", "M19 12h2", "m5.6 5.6 1.4 1.4", "m17 17 1.4 1.4", "m18.4 5.6-1.4 1.4", "M7 17l-1.4 1.4", "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"],
  table: ["M3 4h18v16H3z", "M3 10h18", "M9 4v16", "M15 10v10"],
  target: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M20 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  workflow: ["M4 4h6v6H4z", "M14 14h6v6h-6z", "M17 8v3a3 3 0 0 1-3 3h-2", "M7 10v4a3 3 0 0 0 3 3h4"],
};

function icon(name: IconName, className = "icon"): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  for (const data of iconPaths[name]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", data);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.65");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const navigation: Array<{
  section?: string;
  sectionKey?: string;
  id: PageId;
  label: string;
  labelKey?: string;
  icon: IconName;
  description: string;
  descriptionKey?: string;
}> = [
  { section: "WORKSPACE", sectionKey: "nav.sectionWorkspace", id: "overview", label: "Overview", labelKey: "nav.overview", icon: "grid", description: "Haqiqiy ish vaqti ko‘rsatkichlari", descriptionKey: "nav.overviewDesc" },
  { section: "AI INTELLIGENCE", sectionKey: "nav.sectionAi", id: "models", label: "Model registry", labelKey: "nav.models", icon: "bot", description: "Model health va runtime konfiguratsiyasi", descriptionKey: "nav.modelsDesc" },
  { id: "usage", label: "Inference usage", labelKey: "nav.usage", icon: "activity", description: "So‘rovlar, token va retrieval mode ko‘rsatkichlari", descriptionKey: "nav.usageDesc" },
  { id: "prompts", label: "Prompt management", labelKey: "nav.prompts", icon: "sparkles", description: "Faol prompt qoidalari, faqat o‘qish", descriptionKey: "nav.promptsDesc" },
  { id: "evaluations", label: "Evaluation suite", labelKey: "nav.evaluations", icon: "target", description: "Mavjud test to‘plami va saqlangan natijalar", descriptionKey: "nav.evaluationsDesc" },
  { section: "LEGAL KNOWLEDGE", sectionKey: "nav.sectionLegal", id: "documents", label: "Document explorer", labelKey: "nav.documents", icon: "book", description: "25 huquqiy hujjat va lex.uz provenance", descriptionKey: "nav.documentsDesc" },
  { id: "articles", label: "Article browser", labelKey: "nav.articles", icon: "file-search", description: "Korpus moddalarini qidirish va ko‘rish", descriptionKey: "nav.articlesDesc" },
  { id: "provenance", label: "Versions & provenance", labelKey: "nav.provenance", icon: "history", description: "SHA-256 va 2026-07 snapshot ma’lumotlari", descriptionKey: "nav.provenanceDesc" },
  { section: "DATA PIPELINE", sectionKey: "nav.sectionData", id: "pipeline", label: "Sources & sync", labelKey: "nav.pipeline", icon: "workflow", description: "Haqiqiy manbalar va yo‘q ingestion holati", descriptionKey: "nav.pipelineDesc" },
  { section: "DOCUMENT INTELLIGENCE", sectionKey: "nav.sectionIntel", id: "document-intelligence", label: "Document intelligence", labelKey: "nav.intel", icon: "layers", description: "Fayl tahlili integratsiyasi holati", descriptionKey: "nav.intelDesc" },
  { section: "SECURITY", sectionKey: "nav.sectionSecurity", id: "security", label: "Security center", labelKey: "nav.security", icon: "shield", description: "Admin hisobi, API keys va rate-limit holati", descriptionKey: "nav.securityDesc" },
  { section: "INFRASTRUCTURE", sectionKey: "nav.sectionInfra", id: "infrastructure", label: "Infrastructure", labelKey: "nav.infrastructure", icon: "server", description: "Model, Python process, GPU va xizmat holati", descriptionKey: "nav.infraDesc" },
];

const navLabel = (item: (typeof navigation)[number]): string =>
  item.labelKey ? tt(item.labelKey) : item.label;
const navDescription = (item: (typeof navigation)[number]): string =>
  item.descriptionKey ? tt(item.descriptionKey) : item.description;
const navSection = (item: (typeof navigation)[number]): string =>
  item.sectionKey ? tt(item.sectionKey) : (item.section ?? "");

const defaultDescriptions: Record<string, string> = {
  users: "Foydalanuvchi akkauntlari, sessiyalari yoki identity provider sozlanmagan.",
  citation_audit_metrics: "Citation auditi ishlaydi, ammo uning agregat natijalari saqlanmaydi.",
  inference_cost: "Billing provayderi yoki pricing metrikasi ulanmagan.",
  ingestion_jobs: "Navbat, job holati yoki ingestion endpointi mavjud emas.",
  document_intelligence: "PDF/DOCX kutubxonasi yoki tahlil worker’i mavjud emas.",
  audit_log: "Audit hodisalari uchun doimiy server ombori sozlanmagan.",
  corpus_history: "Faqat joriy 2026-07 snapshot mavjud; versiya tarixi ulanmagan.",
};
const integrationNames: Record<string, string> = {
  users: "Users & identity",
  citation_audit_metrics: "Citation verification history",
  inference_cost: "Inference cost & billing",
  ingestion_jobs: "Ingestion job queue",
  document_intelligence: "PDF / DOCX processing",
  audit_log: "Persistent audit log",
  corpus_history: "Historical corpus versions",
};
const pageState = {
  activePage: "overview" as PageId,
  langMenuOpen: false,
  overview: null as AdminOverview | null,
  config: null as AdminAiConfig | null,
  evaluation: null as AdminEvaluation | null,
  security: null as AdminSecurity | null,
  documents: null as Page<LegalDocument> | null,
  articles: null as Page<Article> | null,
  documentQuery: "",
  documentPage: 1,
  articleQuery: "",
  articleCode: "",
  articlePage: 1,
  pendingArticleQuery: "",
  promptLanguage: "uzbek_latin" as "uzbek_latin" | "russian",
  sortKey: "title",
  sortDirection: "asc" as SortDirection,
  rangeHours: 24,
  pageAbort: null as AbortController | null,
  refreshTimer: 0,
  debounceTimer: 0,
  signedIn: false,
  globalKeysBound: false,
  adminUsername: "",
  collapsed: localStorage.getItem("huquq-admin.sidebar") === "collapsed",
  theme: localStorage.getItem("huquq-admin.theme") === "light" ? "light" : "dark",
  selectedCommand: 0,
  commandQuery: "",
  notificationOpen: false,
  drawer: null as HTMLElement | null,
  profileOpen: false,
  lastUpdated: null as string | null,
  toastRegion: null as HTMLElement | null,
};

document.documentElement.dataset.theme = pageState.theme;

const pageTitle = (id: PageId) => {
  const item = navigation.find((entry) => entry.id === id);
  return item ? navLabel(item) : tt("nav.overview");
};
const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("uz-UZ").format(value);
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)} soniya`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} daqiqa`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes ? `${hours} soat ${minutes} daqiqa` : `${hours} soat`;
};
const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("uz-UZ", { year: "numeric", month: "short", day: "2-digit" }).format(date);
};
const snapshotLabel = (value: string) => {
  const [year, month] = value.split("-");
  const monthNames = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  return month && Number(month) > 0
    ? `${monthNames[Number(month) - 1]} ${year}`
    : value;
};

function adminShell(): void {
  root!.innerHTML = `
    <div class="admin-shell${pageState.collapsed ? " is-collapsed" : ""}" id="admin-shell">
      <aside class="admin-sidebar" id="admin-sidebar" aria-label="Boshqaruv navigatsiyasi">
        <div class="admin-brand">
          <div class="brand-seal" aria-hidden="true" data-icon="shield"></div>
          <div class="brand-copy"><strong>HUQUQ AI</strong><span>Intelligence control</span></div>
          <span class="brand-edition">OPS</span>
        </div>
        <div class="workspace-button" id="workspace-button" aria-label="${tt("shell.workspace")}">
          <span class="workspace-avatar">H</span>
          <span class="workspace-copy"><strong>${tt("shell.workspaceName")}</strong><span>${tt("shell.workspace")}</span></span>
          <span data-icon="chevron-down"></span>
        </div>
        <nav class="admin-nav" id="admin-nav" aria-label="${tt("shell.workspace")}"></nav>
        <div class="sidebar-foot">
          <div class="data-status">
            <span class="status-light is-degraded" id="sidebar-status-light"></span>
            <div class="data-status-copy"><strong id="sidebar-status-title">${tt("shell.statusChecking")}</strong><span id="sidebar-status-copy">${tt("shell.statusReal")}</span></div>
          </div>
          <div class="sidebar-foot-tools">
            <button class="lang-button" id="admin-lang-button" type="button" aria-haspopup="listbox" aria-expanded="false" title="${tt("lang.label")}"><span data-icon="link"></span><span id="admin-lang-label">${adminLanguage().toUpperCase()}</span></button>
            <button class="sidebar-collapse" id="collapse-sidebar" type="button" aria-label="${tt("shell.collapseSidebar")}" aria-expanded="${!pageState.collapsed}">
              <span data-icon="collapse"></span><span id="collapse-label">${tt("shell.collapseSidebar")}</span>
            </button>
          </div>
          <div class="lang-menu" id="admin-lang-menu" role="listbox" hidden>
            <button type="button" role="option" data-lang="uz">Oʻzbek (lotin)</button>
            <button type="button" role="option" data-lang="cyr">Ўзбек (кирилл)</button>
            <button type="button" role="option" data-lang="ru">Русский</button>
            <button type="button" role="option" data-lang="en">English</button>
          </div>
        </div>
      </aside>
      <button class="mobile-backdrop" id="mobile-backdrop" type="button" aria-label="Navigatsiyani yopish" hidden></button>
      <main class="admin-main" id="admin-main">
        <header class="admin-topbar">
          <button class="icon-button mobile-menu-button" id="mobile-menu" type="button" aria-label="Navigatsiya menyusini ochish" aria-expanded="false"><span data-icon="menu"></span></button>
          <button class="icon-button collapse-desktop" id="collapse-topbar" type="button" aria-label="Navigatsiya panelini yigʻish" title="Navigatsiyani yigʻish"><span data-icon="collapse"></span></button>
          <div class="breadcrumb"><span>HUQUQ AI</span><span data-icon="chevron-right"></span><strong id="breadcrumb-current">Overview</strong></div>
          <button class="global-search" id="open-command" type="button" aria-label="${tt("shell.searchAria")}">
            <span data-icon="search"></span><span>${tt("shell.searchPlaceholder")}</span><kbd class="keycap">⌘ K</kbd>
          </button>
          <button class="system-pill" id="system-pill" type="button" aria-label="${tt("shell.statusDetails")}">
            <span class="status-light is-degraded" id="top-status-light"></span><span class="system-pill-label" id="top-status-label">${tt("shell.statusChecking")}</span>
          </button>
          <button class="icon-button" id="notifications-button" type="button" aria-label="${tt("shell.openNotifications")}" aria-haspopup="dialog"><span data-icon="alert"></span></button>
          <button class="icon-button theme-toggle" id="theme-toggle" type="button" aria-label="${tt("shell.themeToLight")}"><span data-icon="sun"></span></button>
          <button class="profile-button" id="profile-button" type="button" aria-expanded="false" aria-haspopup="menu">
            <span class="profile-avatar">AD</span><span class="profile-copy"><strong id="profile-username">Admin</strong><span>${tt("shell.session")}</span></span><span data-icon="chevron-down"></span>
          </button>
          <div class="profile-menu" id="profile-menu" role="menu" hidden></div>
        </header>
        <section class="admin-content" id="page-content" tabindex="-1" aria-live="polite"></section>
      </main>
      <dialog class="command-dialog" id="command-dialog" aria-label="Global qidiruv va buyruqlar">
        <div class="command-search"><span data-icon="search"></span><input id="command-input" type="search" autocomplete="off" placeholder="${tt("shell.searchSection")}" aria-label="${tt("shell.searchSection")}" /><kbd class="keycap">ESC</kbd></div>
        <div class="command-list" id="command-list" role="listbox" aria-label="Qidiruv natijalari"></div>
        <div class="command-help"><span><kbd class="keycap">↑</kbd><kbd class="keycap">↓</kbd> ${tt("shell.commandSelect")}</span><span><kbd class="keycap">↵</kbd> ${tt("shell.commandOpen")}</span><span>⌘ K</span></div>
      </dialog>
      <div class="drawer-backdrop" id="drawer-backdrop" hidden></div>
      <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>
        <div class="drawer-head"><h2 id="drawer-title">${tt("shell.drawerTitle")}</h2><button class="icon-button" id="drawer-close" type="button" aria-label="${tt("shell.closeDrawer")}"><span data-icon="close"></span></button></div>
        <div class="drawer-body" id="drawer-body"></div>
        <div class="drawer-footer" id="drawer-footer"></div>
      </aside>
      <div class="toast-region" id="toast-region" role="status" aria-live="polite"></div>
    </div>`;
  pageState.toastRegion = root!.querySelector("#toast-region");
  renderIcons(root!);
  initAdminLanguage();
  root!.querySelector("#admin-lang-button")?.addEventListener("click", () => {
    const menu = root!.querySelector<HTMLElement>("#admin-lang-menu");
    if (!menu) return;
    menu.hidden = !menu.hidden;
    root!.querySelector<HTMLButtonElement>("#admin-lang-button")?.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    const button = root!.querySelector("#admin-lang-button");
    const menu = root!.querySelector("#admin-lang-menu");
    if (button && menu && !button.contains(target) && !menu.contains(target)) {
      (menu as HTMLElement).hidden = true;
      (button as HTMLElement).setAttribute("aria-expanded", "false");
    }
  });
  for (const option of root!.querySelectorAll<HTMLButtonElement>("#admin-lang-menu button[data-lang]")) {
    option.addEventListener("click", () => {
      setAdminLanguage(option.dataset.lang as "uz" | "cyr" | "ru" | "en");
      const label = root!.querySelector("#admin-lang-label");
      if (label) label.textContent = adminLanguage().toUpperCase();
      adminShell();
      void refreshOverview(true);
    });
  }
  renderNavigation();
  bindShellEvents();
  updateThemeButton();
  setupCommandPalette();
  setupDrawerKeyboard();
}

function renderIcons(scope: ParentNode): void {
  for (const placeholder of scope.querySelectorAll<HTMLElement>("[data-icon]")) {
    const name = placeholder.dataset.icon as IconName | undefined;
    if (name && Object.hasOwn(iconPaths, name)) {
      placeholder.replaceChildren(icon(name));
    }
  }
}

function renderNavigation(): void {
  const nav = root!.querySelector<HTMLElement>("#admin-nav")!;
  nav.replaceChildren();
  for (const item of navigation) {
    if (item.section) {
      nav.append(node("div", "nav-section", navSection(item)));
    }
    const link = node("a", "nav-link");
    link.href = `#/admin/${item.id}`;
    link.dataset.page = item.id;
    link.setAttribute("aria-label", navLabel(item));
    link.title = navDescription(item);
    link.setAttribute("aria-current", pageState.activePage === item.id ? "page" : "false");
    link.append(icon(item.icon));
    link.append(node("span", "", navLabel(item)));
    nav.append(link);
  }
  updateActiveNavigation();
}

function updateActiveNavigation(): void {
  for (const link of root!.querySelectorAll<HTMLAnchorElement>(".nav-link")) {
    const active = link.dataset.page === pageState.activePage;
    link.classList.toggle("is-active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  }
  root!.querySelector("#breadcrumb-current")!.textContent = pageTitle(pageState.activePage);
}

function updateThemeButton(): void {
  const button = root!.querySelector<HTMLButtonElement>("#theme-toggle");
  if (!button) return;
  const next = pageState.theme === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", next === "light" ? tt("shell.themeToLight") : tt("shell.themeToDark"));
  button.title = next === "light" ? tt("shell.themeLight") : tt("shell.themeDark");
  button.replaceChildren(icon(next === "light" ? "sun" : "moon"));
}

function showToast(message: string, type: "info" | "error" | "success" = "info"): void {
  const region = pageState.toastRegion;
  if (!region) return;
  const toast = node("div", `toast${type === "error" ? " is-error" : type === "success" ? " is-success" : ""}`);
  toast.append(icon(type === "error" ? "alert" : type === "success" ? "check" : "help"));
  const text = node("span", "", message);
  toast.append(text);
  const close = node("button", "toast-close");
  close.type = "button";
  close.setAttribute("aria-label", tt("toast.close"));
  close.append(icon("close"));
  close.addEventListener("click", () => toast.remove());
  toast.append(close);
  region.append(toast);
  window.setTimeout(() => toast.remove(), 6000);
}

function bindShellEvents(): void {
  root!.querySelector("#collapse-sidebar")?.addEventListener("click", toggleCollapsed);
  root!.querySelector("#collapse-topbar")?.addEventListener("click", toggleCollapsed);
  root!.querySelector("#mobile-menu")?.addEventListener("click", openMobileNav);
  root!.querySelector("#mobile-backdrop")?.addEventListener("click", closeMobileNav);
  root!.querySelector("#theme-toggle")?.addEventListener("click", toggleTheme);
  root!.querySelector("#open-command")?.addEventListener("click", openCommandPalette);
  root!.querySelector("#notifications-button")?.addEventListener("click", () => void showNotifications());
  root!.querySelector("#system-pill")?.addEventListener("click", () => navigate("infrastructure"));
  root!.querySelector("#profile-button")?.addEventListener("click", toggleProfileMenu);
  root!.querySelector("#drawer-close")?.addEventListener("click", closeDrawer);
  root!.querySelector("#drawer-backdrop")?.addEventListener("click", closeDrawer);
  root!.querySelector("#admin-nav")?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>(".nav-link");
    if (!link) return;
    event.preventDefault();
    const selected = link.dataset.page as PageId | undefined;
    if (selected) navigate(selected);
    closeMobileNav();
  });
}

function toggleCollapsed(): void {
  pageState.collapsed = !pageState.collapsed;
  localStorage.setItem("huquq-admin.sidebar", pageState.collapsed ? "collapsed" : "expanded");
  root!.querySelector("#admin-shell")?.classList.toggle("is-collapsed", pageState.collapsed);
  const button = root!.querySelector<HTMLButtonElement>("#collapse-sidebar");
  button?.setAttribute("aria-expanded", String(!pageState.collapsed));
  button?.setAttribute("aria-label", pageState.collapsed ? tt("shell.expandSidebar") : tt("shell.collapseSidebar"));
  const label = root!.querySelector("#collapse-label");
  if (label) label.textContent = pageState.collapsed ? tt("shell.expandSidebar") : tt("shell.collapseSidebar");
  const top = root!.querySelector<HTMLButtonElement>("#collapse-topbar");
  top?.setAttribute("aria-label", pageState.collapsed ? tt("shell.expandNav") : tt("shell.collapseNav"));
}

function toggleTheme(): void {
  pageState.theme = pageState.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = pageState.theme;
  localStorage.setItem("huquq-admin.theme", pageState.theme);
  updateThemeButton();
}

function openMobileNav(): void {
  root!.querySelector("#admin-shell")?.classList.add("mobile-nav-open");
  root!.querySelector<HTMLButtonElement>("#mobile-menu")?.setAttribute("aria-expanded", "true");
  root!.querySelector<HTMLButtonElement>("#mobile-menu")?.setAttribute("aria-label", tt("shell.closeNav"));
  root!.querySelector<HTMLButtonElement>("#mobile-backdrop")!.hidden = false;
}

function closeMobileNav(): void {
  root!.querySelector("#admin-shell")?.classList.remove("mobile-nav-open");
  root!.querySelector<HTMLButtonElement>("#mobile-menu")?.setAttribute("aria-expanded", "false");
  root!.querySelector<HTMLButtonElement>("#mobile-backdrop")!.hidden = true;
}

function toggleProfileMenu(): void {
  pageState.profileOpen = !pageState.profileOpen;
  const menu = root!.querySelector<HTMLElement>("#profile-menu")!;
  menu.replaceChildren();
  menu.hidden = !pageState.profileOpen;
  root!.querySelector<HTMLButtonElement>("#profile-button")?.setAttribute("aria-expanded", String(pageState.profileOpen));
  if (!pageState.profileOpen) return;
  const status = node("div", "profile-menu-note", `${tt("shell.session")}: ${pageState.adminUsername}`);
  const logout = node("button", "profile-menu-action");
  logout.type = "button";
  logout.append(icon("logout"), node("span", "", "Admin sessiyasidan chiqish"));
  logout.addEventListener("click", () => {
    logout.disabled = true;
    void signOut().then(
      () => {
        pageState.signedIn = false;
        pageState.adminUsername = "";
        window.clearInterval(pageState.refreshTimer);
        pageState.overview = null;
        pageState.profileOpen = false;
        renderLogin();
      },
      (error: unknown) => {
        logout.disabled = false;
        showToast(`Sessiyadan chiqib boʻlmadi: ${errorMessage(error)}`, "error");
      },
    );
  });
  menu.append(status, logout);
}

function navigate(id: PageId): void {
  if (!navigation.some((item) => item.id === id)) id = "overview";
  history.pushState(null, "", `#/admin/${id}`);
  pageState.activePage = id;
  pageState.notificationOpen = false;
  pageState.profileOpen = false;
  closeDrawer();
  updateActiveNavigation();
  closeMobileNav();
  loadCurrentPage();
}

function readPageFromLocation(): PageId {
  const id = location.hash.split("/").at(-1) as PageId | undefined;
  return id && navigation.some((item) => item.id === id) ? id : "overview";
}

function bindGlobalKeys(): void {
  window.addEventListener("hashchange", () => {
    pageState.activePage = readPageFromLocation();
    updateActiveNavigation();
    loadCurrentPage();
  });
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openCommandPalette();
      return;
    }
    if (event.key === "Escape") {
      if (pageState.drawer) closeDrawer();
      if (pageState.notificationOpen) closeDrawer();
      if (pageState.profileOpen) {
        pageState.profileOpen = false;
        const menu = root!.querySelector<HTMLElement>("#profile-menu")!;
        menu.hidden = true;
        root!.querySelector<HTMLButtonElement>("#profile-button")?.setAttribute("aria-expanded", "false");
      }
      closeMobileNav();
    }
  });
  document.addEventListener("click", (event) => {
    if (!pageState.profileOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest("#profile-menu") && !target.closest("#profile-button")) {
      pageState.profileOpen = false;
      root!.querySelector<HTMLElement>("#profile-menu")!.hidden = true;
      root!.querySelector<HTMLButtonElement>("#profile-button")?.setAttribute("aria-expanded", "false");
    }
  });
}

function renderLogin(error = ""): void {
  window.clearInterval(pageState.refreshTimer);
  pageState.pageAbort?.abort();
  root!.innerHTML = `
    <main class="login-screen" id="admin-main" tabindex="-1">
      <form class="login-card" id="admin-login" novalidate>
        <div class="login-brand"><span class="brand-seal" data-icon="shield"></span><div class="brand-copy"><strong>HUQUQ AI</strong><span>Intelligence control center</span></div></div>
        <h1>${tt("login.title")}</h1>
        <p>${tt("login.intro")}</p>
        <label for="admin-username">${tt("login.username")}</label>
        <input class="input" id="admin-username" name="username" type="text" autocomplete="username" maxlength="256" required placeholder="${tt("login.usernamePlaceholder")}" />
        <label for="admin-password">${tt("login.password")}</label>
        <input class="input" id="admin-password" name="password" type="password" autocomplete="current-password" maxlength="4096" required placeholder="${tt("login.passwordPlaceholder")}" />
        <button class="button button-primary" id="login-submit" type="submit"><span data-icon="key"></span><span>${tt("login.submit")}</span></button>
        <p class="login-error" id="login-error" role="alert"></p>
        <div class="login-security"><span data-icon="lock"></span><span>${tt("login.securityNote")}</span></div>
        <div class="login-lang">
          <button class="lang-button" id="login-lang-button" type="button" aria-haspopup="listbox" aria-expanded="false">🌐 <span id="login-lang-label">${adminLanguage().toUpperCase()}</span></button>
          <div class="lang-menu" id="login-lang-menu" role="listbox" hidden>
            <button type="button" role="option" data-lang="uz">Oʻzbek (lotin)</button>
            <button type="button" role="option" data-lang="cyr">Ўзбек (кирилл)</button>
            <button type="button" role="option" data-lang="ru">Русский</button>
            <button type="button" role="option" data-lang="en">English</button>
          </div>
        </div>
      </form>
    </main>`;
  renderIcons(root!);
  root!.querySelector<HTMLElement>("#login-error")!.textContent = error;
  const langButton = root!.querySelector<HTMLButtonElement>("#login-lang-button")!;
  const langMenu = root!.querySelector<HTMLElement>("#login-lang-menu")!;
  langButton.addEventListener("click", () => {
    langMenu.hidden = !langMenu.hidden;
    langButton.setAttribute("aria-expanded", String(!langMenu.hidden));
  });
  for (const option of langMenu.querySelectorAll<HTMLButtonElement>("button[data-lang]")) {
    option.addEventListener("click", () => {
      setAdminLanguage(option.dataset.lang as "uz" | "cyr" | "ru" | "en");
      renderLogin();
    });
  }
  document.addEventListener("click", (event) => {
    if (!langButton.contains(event.target as Node) && !langMenu.contains(event.target as Node)) {
      langMenu.hidden = true;
      langButton.setAttribute("aria-expanded", "false");
    }
  });
  const form = root!.querySelector<HTMLFormElement>("#admin-login")!;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const usernameField = root!.querySelector<HTMLInputElement>("#admin-username")!;
    const passwordField = root!.querySelector<HTMLInputElement>("#admin-password")!;
    const button = root!.querySelector<HTMLButtonElement>("#login-submit")!;
    const errorElement = root!.querySelector<HTMLElement>("#login-error")!;
    button.disabled = true;
    errorElement.textContent = "";
    void signIn(usernameField.value, passwordField.value).then(
      (session) => {
        passwordField.value = "";
        enterAdmin(session.username);
      },
      (reason: unknown) => {
        button.disabled = false;
        errorElement.textContent = errorMessage(reason);
        passwordField.value = "";
        passwordField.focus();
      },
    );
  });
}

function enterAdmin(username: string): void {
  pageState.signedIn = true;
  pageState.adminUsername = username;
  pageState.activePage = readPageFromLocation();
  adminShell();
  root!.querySelector<HTMLElement>("#profile-username")!.textContent = username;
  if (!pageState.globalKeysBound) {
    bindGlobalKeys();
    pageState.globalKeysBound = true;
  }
  if (!location.hash) history.replaceState(null, "", "#/admin/overview");
  updateActiveNavigation();
  loadCurrentPage();
  window.clearInterval(pageState.refreshTimer);
  pageState.refreshTimer = window.setInterval(() => {
    if (pageState.activePage === "overview") void refreshOverview(false);
  }, 30_000);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : tt("error.unexpected");
}

function pageHeading(
  title: string,
  description: string,
  eyebrow = "HUQUQ AI / OPERATIONS",
): HTMLElement {
  const heading = node("header", "page-heading");
  const left = node("div");
  const label = node("div", "eyebrow");
  label.append(node("span", "eyebrow-mark"), node("span", "", eyebrow));
  left.append(label, node("h1", "", title), node("p", "", description));
  heading.append(left);
  return heading;
}

function pageActions(onRefresh = loadCurrentPage): HTMLElement {
  const actions = node("div", "page-actions");
  const refresh = node("button", "button");
  refresh.type = "button";
  refresh.append(icon("refresh"), node("span", "", "Yangilash"));
  refresh.addEventListener("click", () => void onRefresh());
  actions.append(refresh);
  return actions;
}

function addActions(heading: HTMLElement, actions: HTMLElement): void {
  heading.append(actions);
}

function loadingPage(): HTMLElement {
  const fragment = document.createDocumentFragment();
  const heading = node("div", "skeleton loading-line medium");
  heading.style.height = "26px";
  heading.style.margin = "0 0 20px";
  fragment.append(heading);
  const grid = node("div", "loading-grid");
  for (let index = 0; index < 4; index += 1) {
    const card = node("div", "loading-card");
    card.append(node("div", "skeleton loading-line short"), node("div", "skeleton loading-value"), node("div", "skeleton loading-line medium"));
    grid.append(card);
  }
  fragment.append(grid);
  const wrapper = node("div");
  wrapper.append(fragment);
  return wrapper;
}

function inlineError(message: string, retry: () => void): HTMLElement {
  const error = node("div", "inline-error");
  error.setAttribute("role", "alert");
  error.append(node("span", "", message));
  const button = node("button", "button button-sm");
  button.type = "button";
  button.textContent = "Qayta urinish";
  button.addEventListener("click", retry);
  error.append(button);
  return error;
}

function sectionHeading(title: string, description = ""): HTMLElement {
  const section = node("div", "section-heading");
  const text = node("div");
  text.append(node("h2", "", title));
  if (description) text.append(node("p", "", description));
  section.append(text);
  return section;
}

function panel(
  title: string,
  subtitle: string,
  body: HTMLElement,
  action?: HTMLElement,
): HTMLElement {
  const card = node("section", "panel");
  const header = node("div", "panel-heading");
  const titleBlock = node("div", "panel-title");
  titleBlock.append(node("strong", "", title));
  if (subtitle) titleBlock.append(node("span", "", subtitle));
  header.append(titleBlock);
  if (action) header.append(action);
  const content = node("div", "panel-body");
  content.append(body);
  card.append(header, content);
  return card;
}

function snapshotBanner(snapshot: string): HTMLElement {
  const banner = node("div", "snapshot-banner");
  banner.append(icon("alert"));
  const content = node("span");
  content.append(
    document.createTextNode("Korpus snapshoti: "),
    node("strong", "", snapshotLabel(snapshot)),
    document.createTextNode(". Bu ko‘rsatkich hujjatlarning lex.uz dagi bugungi holatini anglatmaydi."),
  );
  banner.append(content);
  return banner;
}

function metricCard(
  label: string,
  value: string,
  footnote: string,
  glyph: IconName,
  footnoteTone: "normal" | "warning" | "success" | "danger" = "normal",
): HTMLElement {
  const card = node("article", "metric-card");
  const top = node("div", "metric-top");
  top.append(node("span", "metric-label", label));
  const badge = node("span", "metric-icon");
  badge.append(icon(glyph));
  top.append(badge);
  const valueElement = node("div", `metric-value${value.length > 10 ? " is-text" : ""}`, value);
  const foot = node("div", `metric-foot${footnoteTone === "normal" ? "" : ` is-${footnoteTone}`}`);
  foot.append(icon(footnoteTone === "warning" || footnoteTone === "danger" ? "alert" : footnoteTone === "success" ? "check" : "clock"), node("span", "", footnote));
  card.append(top, valueElement, foot);
  return card;
}

function unavailableCard(label: string, reason: string, glyph: IconName): HTMLElement {
  const card = metricCard(label, "Ulanmagan", reason, glyph, "warning");
  card.setAttribute("aria-label", `${label}: maʼlumot manbasi ulanmagan. ${reason}`);
  return card;
}

function statusBadge(
  status: string,
  labels: Record<string, string> = {},
): HTMLElement {
  const normalized = status === "online" || status === "healthy"
    ? "success"
    : status === "offline"
      ? "danger"
      : status === "degraded"
        ? "warning"
        : "warning";
  const badge = node("span", `badge badge-${normalized}`);
  if (normalized !== "warning" || status !== "not_configured") {
    const dot = node("span", `status-light${normalized === "danger" ? " is-offline" : normalized === "warning" ? " is-degraded" : ""}`);
    badge.append(dot);
  }
  badge.append(node("span", "", labels[status] ?? statusLabel(status)));
  return badge;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    online: "Online",
    healthy: "Sogʻlom",
    offline: "Offline",
    degraded: "Degraded",
    not_configured: "Ulanmagan",
    unavailable: "Mavjud emas",
    not_run: "Ishga tushirilmagan",
    in_memory_rate_limit_only: "Vaqtincha",
    single_server_token: "Single token",
  };
  return labels[status] ?? status;
}

function integrationGrid(
  integrations: AdminOverview["integrations"],
  only?: string[],
): HTMLElement {
  const grid = node("div", "integration-cards");
  const entries = only
    ? only.map((key) => [key, integrations[key]] as const).filter((entry) => Boolean(entry[1]))
    : Object.entries(integrations);
  for (const [key, item] of entries) {
    const card = node("article", "integration-card");
    const top = node("div", "integration-card-top");
    top.append(node("h3", "", integrationNames[key] ?? key), statusBadge(item.status));
    const reason = item.reason ?? defaultDescriptions[key] ?? "Qoʻshimcha maʼlumot manbasi sozlanmagan.";
    card.append(top, node("p", "", reason));
    grid.append(card);
  }
  return grid;
}

function formatTokens(metrics: AdminOverview["requests"]): string {
  return formatNumber(metrics.prompt_tokens + metrics.completion_tokens);
}

function createTimeline(
  data: AdminOverview["requests"]["timeline"],
  rangeHours: number,
): HTMLElement {
  const wrap = node("div", "chart-wrap");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "chart-svg");
  svg.setAttribute("viewBox", "0 0 720 205");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${rangeHours} soat ichidagi haqiqiy chat soʻrovlari vaqt chizigʻi`);
  const now = new Date();
  const cutoff = now.getTime() - rangeHours * 60 * 60 * 1000;
  const shown = data.filter((entry) => new Date(entry.at).getTime() >= cutoff);
  const values = shown.map((entry) => entry.requests);
  const max = Math.max(1, ...values);
  const left = 36;
  const right = 704;
  const top = 14;
  const bottom = 164;
  const appendLine = (y: number) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(left));
    line.setAttribute("x2", String(right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("class", "chart-grid");
    svg.append(line);
  };
  const appendLabel = (x: number, y: number, text: string, anchor = "start") => {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.setAttribute("text-anchor", anchor);
    label.setAttribute("class", "chart-label");
    label.textContent = text;
    svg.append(label);
  };
  appendLine(top);
  appendLine((top + bottom) / 2);
  appendLine(bottom);
  appendLabel(left - 8, top + 3, formatNumber(max), "end");
  appendLabel(left - 8, (top + bottom) / 2 + 3, formatNumber(Math.round(max / 2)), "end");
  appendLabel(left - 8, bottom + 3, "0", "end");
  if (!shown.length || shown.every((entry) => entry.requests === 0)) {
    appendLabel((left + right) / 2, 94, "Hozircha qayd etilgan soʻrov yoʻq", "middle");
    const empty = node("span", "sr-only", "Tanlangan davrda soʻrov qayd etilmagan.");
    wrap.append(svg, empty, timelineTable(shown));
    return wrap;
  }
  const points = shown.map((entry, index) => {
    const x = shown.length === 1 ? (left + right) / 2 : left + (index / (shown.length - 1)) * (right - left);
    const y = bottom - (entry.requests / max) * (bottom - top);
    return { x, y, item: entry };
  });
  const pathData = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.id = "timeline-fill";
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");
  const stopTop = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopTop.setAttribute("offset", "0");
  stopTop.setAttribute("stop-color", "var(--color-primary)");
  stopTop.setAttribute("stop-opacity", ".20");
  const stopBottom = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopBottom.setAttribute("offset", "1");
  stopBottom.setAttribute("stop-color", "var(--color-primary)");
  stopBottom.setAttribute("stop-opacity", "0");
  gradient.append(stopTop, stopBottom);
  defs.append(gradient);
  svg.append(defs);
  const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
  area.setAttribute("d", `${pathData} L ${right} ${bottom} L ${left} ${bottom} Z`);
  area.setAttribute("class", "chart-area");
  svg.append(area);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", pathData);
  line.setAttribute("class", "chart-line");
  svg.append(line);
  for (const point of points) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", "3");
    circle.setAttribute("class", "chart-point");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${new Intl.DateTimeFormat("uz-UZ", { dateStyle: "short", timeStyle: "short" }).format(new Date(point.item.at))}: ${point.item.requests} soʻrov`;
    circle.append(title);
    svg.append(circle);
  }
  const start = shown[0] ? new Date(shown[0].at) : now;
  const end = shown.at(-1) ? new Date(shown.at(-1)!.at) : now;
  const timeLabel = (date: Date) => new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(date);
  appendLabel(left, 190, timeLabel(start));
  appendLabel(right, 190, timeLabel(end), "end");
  wrap.append(svg, timelineTable(shown));
  return wrap;
}

function timelineTable(
  rows: AdminOverview["requests"]["timeline"],
): HTMLElement {
  const details = node("details", "chart-data");
  details.append(node("summary", "", "Grafik maʼlumotlarini jadvalda koʻrish"));
  const table = node("table", "data-table chart-data-table");
  const head = node("thead");
  const header = node("tr");
  header.append(node("th", "", "Vaqt"), node("th", "", "Soʻrovlar"));
  head.append(header);
  const body = node("tbody");
  for (const row of rows) {
    const tableRow = node("tr");
    const date = new Date(row.at);
    tableRow.append(
      cellText(Number.isNaN(date.valueOf()) ? row.at : new Intl.DateTimeFormat("uz-UZ", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)),
      cellText(formatNumber(row.requests), "numeric-cell"),
    );
    body.append(tableRow);
  }
  table.append(head, body);
  const tableWrap = node("div", "table-wrap");
  tableWrap.append(table);
  details.append(tableWrap);
  return details;
}

function renderOverview(data: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Operations overview",
    "Korpus, inference endpointi va server xotirasida yigʻilgan agregat telemetriya.",
  );
  const actions = pageActions(() => refreshOverview(true));
  const range = document.createElement("select");
  range.className = "select";
  range.setAttribute("aria-label", "Soʻrov grafigi vaqt oraligʻi");
  for (const value of [1, 6, 24]) {
    const option = node("option", "", `${value} soat`);
    option.value = String(value);
    option.selected = pageState.rangeHours === value;
    range.append(option);
  }
  range.addEventListener("change", () => {
    pageState.rangeHours = Number(range.value);
    loadCurrentPage();
  });
  actions.prepend(range);
  addActions(heading, actions);
  content.append(heading, snapshotBanner(data.corpus.snapshot_date));

  const metrics = node("div", "metrics-grid");
  metrics.append(
    unavailableCard("Foydalanuvchilar", "Identity bazasi ulanmagan", "users"),
    metricCard("AI soʻrovlari · 24 soat", formatNumber(data.requests.requests), `${formatNumber(data.requests.requests_since_start)} process ishga tushgandan beri`, "activity"),
    metricCard("Huquqiy hujjatlar", formatNumber(data.corpus.documents), `${formatNumber(data.corpus.articles)} ta snapshot maqolasi`, "book"),
    metricCard("Manba havolalari · 24 soat", formatNumber(data.requests.citation_count), "Javoblar bilan yuborilgan citationlar; audit rate emas", "bookmark", "success"),
    metricCard("Jarayondagi soʻrovlar", formatNumber(data.requests.in_flight), "Hozir backendda bajarilmoqda", "network"),
    metricCard("Model health tekshiruvi", data.model.latency_ms === null ? "—" : `${formatNumber(data.model.latency_ms)} ms`, "GET /v1/models; inference kechikishi emas", "clock", data.model.status === "online" ? "success" : "warning"),
    metricCard("Token isteʼmoli · 24 soat", formatTokens(data.requests), "Modeldan qaytgan haqiqiy usage metamaʼlumoti", "sparkles"),
    unavailableCard("Inference xarajati", "Pricing/billing integratsiyasi yoʻq", "database"),
  );
  content.append(metrics);

  const overviewGrid = node("div", "overview-grid");
  const rangeAction = node("div", "chart-legend");
  rangeAction.append(node("span", "legend-dot"), node("span", "", "Qayd etilgan chat soʻrovlari"));
  overviewGrid.append(
    panel(
      "Request timeline",
      `${pageState.rangeHours} soat · process xotirasidagi haqiqiy soʻrovlar`,
      createTimeline(data.requests.timeline, pageState.rangeHours),
      rangeAction,
    ),
    panel("Model endpoint", "OpenAI-mos server health probe", modelSummary(data.model)),
  );
  content.append(overviewGrid);

  const detailGrid = node("div", "overview-grid");
  detailGrid.append(
    panel("Retrieval analytics", "Requestlar muvaffaqiyatli tugagach, 24 soatgacha process xotirasida saqlanadi", retrievalModes(data.requests.retrieval_modes)),
    panel("Runtime data sources", "Mavjud API yoki hostdan olinmagan qiymatlar yashirilmaydi", integrationStatusList(data)),
  );
  content.append(detailGrid);

  content.append(sectionHeading("Ulanmagan integratsiyalar", "Quyidagi imkoniyatlar repositoryda yoki production API’da mavjud emas; ko‘rsatkichlar ataylab yaratilmagan."));
  content.append(integrationGrid(data.integrations, [
    "users", "citation_audit_metrics", "inference_cost", "ingestion_jobs",
    "document_intelligence", "audit_log", "corpus_history",
  ]));
  content.append(pageFooter(data.generated_at, "Usage telemetriyasi savol/javob matnisiz; faqat server processida rolling 24 soat."));
  return content;
}

function modelSummary(model: AdminOverview["model"]): HTMLElement {
  const box = node("div");
  const top = node("div", "integration-row");
  const copy = node("div", "integration-copy");
  copy.append(node("strong", "", model.model_id), node("span", "", model.served_models.length ? `Endpointda: ${model.served_models.join(", ")}` : model.message));
  top.append(copy, statusBadge(model.status));
  box.append(top);
  const details = node("div", "detail-grid");
  details.append(
    detailItem("Configured model", model.model_id),
    detailItem("Endpoint probe", model.latency_ms === null ? "Oʻlchanmadi" : `${model.latency_ms} ms`),
    detailItem("Probe route", "GET /v1/models"),
  );
  box.append(details);
  const note = node("p", "metric-explain", "Bu faqat model serverining models endpointiga ping. Javob generatsiyasi yoki foydalanuvchi inference latency oʻrnini bosmaydi.");
  box.append(note);
  return box;
}

function retrievalModes(modes: Record<string, number>): HTMLElement {
  const box = node("div", "mode-list");
  const entries = Object.entries(modes).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return emptyState("Hali request yoʻq", "Birinchi chat requestidan soʻng haqiqiy retrieval mode koʻrinadi.", "activity");
  const max = Math.max(...entries.map(([, value]) => value), 1);
  const labels: Record<string, string> = {
    semantic: "Huquqiy qidiruv",
    "article-lookup": "Modda izlash",
    deterministic: "Aniq tekshiruv",
    chat: "Umumiy savol",
    identity: "Identifikatsiya",
    override: "Operator qoidası",
    unavailable: "Nomaʼlum holat",
  };
  for (const [mode, value] of entries) {
    const row = node("div", "mode-row");
    row.append(node("span", "mode-label", labels[mode] ?? mode));
    const track = node("div", "mode-track");
    const fill = node("div", "mode-fill");
    fill.style.width = `${Math.max(3, (value / max) * 100)}%`;
    track.append(fill);
    row.append(track, node("span", "mode-value", formatNumber(value)));
    box.append(row);
  }
  return box;
}

function integrationStatusList(data: AdminOverview): HTMLElement {
  const list = node("div", "status-list");
  const rows: Array<[string, string, string]> = [
    ["RAG API", "online", "Joriy backend requesti admin sahifasini taqdim etdi."],
    ["vLLM model endpoint", data.model.status, data.model.status === "online" ? `Model roʻyxat probe’i ${data.model.latency_ms} ms.` : "Model endpoint javob bermadi."],
    ["Korpus indeksi", "online", `${formatNumber(data.corpus.articles)} maqola indexda yuklangan.`],
    ["GPU telemetry", data.infrastructure.gpu.status, typeof data.infrastructure.gpu.reason === "string" ? data.infrastructure.gpu.reason : "nvidia-smi orqali o‘qildi."],
  ];
  for (const [name, status, description] of rows) {
    const row = node("div", "integration-row");
    const copy = node("div", "integration-copy");
    copy.append(node("strong", "", name), node("span", "", description));
    row.append(copy, statusBadge(status));
    list.append(row);
  }
  return list;
}

function detailItem(label: string, value: string): HTMLElement {
  const item = node("div", "detail-item");
  item.append(node("span", "", label), node("strong", "", value));
  return item;
}

function pageFooter(updatedAt: string | null, note: string): HTMLElement {
  const footer = node("footer", "page-footer");
  footer.append(node("span", "", note));
  footer.append(node("span", "", updatedAt ? `Yangilangan: ${formatDate(updatedAt)} ${new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(updatedAt))}` : "Yangilanish vaqti mavjud emas"));
  return footer;
}

function emptyState(title: string, description: string, glyph: IconName): HTMLElement {
  const state = node("div", "empty-state");
  const inner = node("div");
  const iconWrap = node("span", "empty-state-icon");
  iconWrap.append(icon(glyph));
  inner.append(iconWrap, node("strong", "", title), node("p", "", description));
  state.append(inner);
  return state;
}

async function refreshOverview(withToast: boolean): Promise<void> {
  try {
    pageState.overview = await getOverview();
    pageState.lastUpdated = pageState.overview.generated_at;
    updateServiceStatus(pageState.overview);
    if (pageState.activePage === "overview") {
      root!.querySelector("#page-content")?.replaceChildren(renderOverview(pageState.overview));
    }
    if (withToast) showToast("Haqiqiy backend maʼlumotlari yangilandi.", "success");
  } catch (error) {
    if (withToast) showToast(errorMessage(error), "error");
    else if (pageState.activePage === "overview") {
      showToast(`Avtomatik yangilash bajarilmadi: ${errorMessage(error)}`, "error");
    }
  }
}

function updateServiceStatus(data: AdminOverview): void {
  const statusText = data.model.status === "online"
    ? "Model online"
    : data.model.status === "degraded"
      ? "Model degraded"
      : "Model offline";
  const overall = data.model.status === "online"
    ? "Model online"
    : data.model.status === "degraded"
      ? "Model holati cheklangan"
      : "Model offline";
  for (const selector of ["#top-status-label", "#sidebar-status-title"]) {
    const text = root!.querySelector<HTMLElement>(selector);
    if (text) text.textContent = selector === "#top-status-label" ? overall : statusText;
  }
  const sidebarCopy = root!.querySelector<HTMLElement>("#sidebar-status-copy");
  if (sidebarCopy) sidebarCopy.textContent = `API rate-limit: ${data.rate_limit.requests}/${formatDuration(data.rate_limit.window_seconds)}`;
  for (const selector of ["#top-status-light", "#sidebar-status-light"]) {
    const status = root!.querySelector<HTMLElement>(selector);
    status?.classList.toggle("is-online", data.model.status === "online");
    status?.classList.toggle("is-degraded", data.model.status === "degraded");
    status?.classList.toggle("is-offline", data.model.status === "offline");
  }
}

function loadCurrentPage(): void {
  const content = root!.querySelector<HTMLElement>("#page-content");
  if (!content || !pageState.signedIn) return;
  pageState.pageAbort?.abort();
  const controller = new AbortController();
  pageState.pageAbort = controller;
  content.replaceChildren(loadingPage());
  content.focus({ preventScroll: true });

  const retry = () => loadCurrentPage();
  void (async () => {
    try {
      switch (pageState.activePage) {
        case "overview": {
          const data = await getOverview(controller.signal);
          if (controller.signal.aborted) return;
          pageState.overview = data;
          pageState.lastUpdated = data.generated_at;
          updateServiceStatus(data);
          content.replaceChildren(renderOverview(data));
          break;
        }
        case "models": {
          const [overview, config] = await Promise.all([
            getOverview(controller.signal),
            getAiConfig(controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.overview = overview;
          pageState.config = config;
          updateServiceStatus(overview);
          content.replaceChildren(renderModels(overview, config));
          break;
        }
        case "usage": {
          const data = await getOverview(controller.signal);
          if (controller.signal.aborted) return;
          pageState.overview = data;
          updateServiceStatus(data);
          content.replaceChildren(renderUsage(data));
          break;
        }
        case "prompts": {
          const config = await getAiConfig(controller.signal);
          if (controller.signal.aborted) return;
          pageState.config = config;
          content.replaceChildren(renderPrompts(config));
          break;
        }
        case "evaluations": {
          const result = await getEvaluations(controller.signal);
          if (controller.signal.aborted) return;
          pageState.evaluation = result;
          content.replaceChildren(renderEvaluations(result));
          break;
        }
        case "documents": {
          const [page, overview] = await Promise.all([
            getDocuments(pageState.documentQuery, pageState.documentPage, 25, controller.signal),
            getOverview(controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.documents = page;
          pageState.overview = overview;
          content.replaceChildren(renderDocuments(page, overview));
          break;
        }
        case "articles": {
          const query = pageState.pendingArticleQuery || pageState.articleQuery;
          if (pageState.pendingArticleQuery) {
            pageState.articleQuery = pageState.pendingArticleQuery;
            pageState.pendingArticleQuery = "";
            pageState.articlePage = 1;
          }
          const [page, documents] = await Promise.all([
            getArticles(pageState.articleQuery, pageState.articleCode, pageState.articlePage, 25, controller.signal),
            getDocuments("", 1, 100, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.articles = page;
          pageState.documents = documents;
          content.replaceChildren(renderArticles(page, documents.results, query));
          break;
        }
        case "provenance": {
          const [documents, overview] = await Promise.all([
            getDocuments("", 1, 100, controller.signal),
            getOverview(controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.documents = documents;
          pageState.overview = overview;
          content.replaceChildren(renderProvenance(documents, overview));
          break;
        }
        case "pipeline": {
          const [documents, overview] = await Promise.all([
            getDocuments("", 1, 100, controller.signal),
            getOverview(controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.documents = documents;
          pageState.overview = overview;
          content.replaceChildren(renderPipeline(documents, overview));
          break;
        }
        case "document-intelligence": {
          const [overview, documents] = await Promise.all([
            getOverview(controller.signal),
            getDocuments("", 1, 100, controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.overview = overview;
          pageState.documents = documents;
          content.replaceChildren(renderDocumentIntelligence(overview, documents));
          break;
        }
        case "security": {
          const [security, overview] = await Promise.all([
            getSecurity(controller.signal),
            getOverview(controller.signal),
          ]);
          if (controller.signal.aborted) return;
          pageState.security = security;
          pageState.overview = overview;
          content.replaceChildren(renderSecurity(security, overview));
          break;
        }
        case "infrastructure": {
          const overview = await getOverview(controller.signal);
          if (controller.signal.aborted) return;
          pageState.overview = overview;
          updateServiceStatus(overview);
          content.replaceChildren(renderInfrastructure(overview));
          break;
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AdminApiError && error.status === 401) {
        pageState.signedIn = false;
        pageState.adminUsername = "";
        renderLogin(tt("login.sessionExpired"));
        return;
      }
      const heading = pageHeading(pageTitle(pageState.activePage), "Maʼlumotni yuklashda xatolik yuz berdi.");
      content.replaceChildren(heading, inlineError(errorMessage(error), retry));
    }
  })();
}

function renderModels(data: AdminOverview, config: AdminAiConfig): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Model registry",
    "Amaldagi vLLM model endpointi va serverdan o‘qilgan inference sozlamalari. Ushbu sahifa read-only.",
    "AI INTELLIGENCE / MODELS",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const configCards = node("div", "metrics-grid metrics-grid-4");
  configCards.append(
    metricCard("Model identifier", config.model, "Runtime sozlamasidan", "bot"),
    metricCard("Context javob limiti", formatNumber(config.max_tokens), "max_tokens", "sparkles"),
    metricCard("Retrieval top_k", formatNumber(config.top_k), "RAG qidiruv sozlamasi", "target"),
    metricCard("History turns", formatNumber(config.history_turns), "Ko‘p-turnli kontekst oynasi", "history"),
  );
  content.append(configCards);
  const registry = node("div", "two-column-grid");
  const modelBody = node("div");
  const modelInfo = node("div", "model-feature");
  modelInfo.append(
    node("span", "model-mark", "AI"),
    node("div", "model-name", config.model),
    statusBadge(data.model.status),
  );
  const modelDetails = node("div", "detail-grid model-details");
  modelDetails.append(
    detailItem("Configured endpoint", "OpenAI-compatible /v1"),
    detailItem("Models probe", data.model.latency_ms === null ? "Javob yoʻq" : `${data.model.latency_ms} ms`),
    detailItem("Served model IDs", data.model.served_models.join(", ") || "Oʻqilmadi"),
    detailItem("Model temperature", `${config.chat_temperature} / ${config.temperature}`),
    detailItem("Article retrieval distance", String(config.legal_distance)),
    detailItem("Query device", config.query_device),
  );
  modelBody.append(modelInfo, modelDetails);
  modelBody.append(noteBlock("Health probe inference emas", "Latency faqat model serveridagi GET /v1/models endpointidan o‘lchanadi. Chat generatsiya latency va GPU utilization alohida mavjud API orqali o‘lchanmaydi.", "info"));
  registry.append(
    panel("Active model", "Backenddan jonli health probe", modelBody, statusBadge(data.model.status)),
    panel("Inference configuration", "rag/config.py muhit sozlamalari · o‘qish uchun", configurationTable(config)),
  );
  content.append(registry);
  content.append(sectionHeading("Model diagnostics", "Mavjud model ko‘rsatkichlari va chegaralari."));
  const diagnosticGrid = node("div", "integration-cards");
  diagnosticGrid.append(
    diagnosticItem("Model health", data.model.status === "online" ? "Endpoint javob berdi" : "Endpoint javob bermadi", statusBadge(data.model.status), "Probe /v1/models; vaqti-vaqti bilan tekshiruv."),
    diagnosticItem("Inference latency", "Mavjud emas", statusBadge("not_configured"), "Request telemetriyada model javobi latency qiymati saqlanmaydi."),
    diagnosticItem("Token usage", formatTokens(data.requests), statusBadge("online"), "Model usage metamaʼlumotidan, process xotirasidagi rolling 24 soat."),
    diagnosticItem("Provider cost", "Mavjud emas", statusBadge("not_configured"), "Pricing/billing provayderi ulanmagan."),
  );
  content.append(diagnosticGrid);
  return content;
}

function configurationTable(config: AdminAiConfig): HTMLElement {
  const rows: Array<[string, string]> = [
    ["Model", config.model],
    ["Temperature", String(config.temperature)],
    ["Chat temperature", String(config.chat_temperature)],
    ["Max output tokens", String(config.max_tokens)],
    ["Retrieval top_k", String(config.top_k)],
    ["Legal distance", String(config.legal_distance)],
    ["History turns", String(config.history_turns)],
    ["Query device", config.query_device],
    ["Corpus source", config.corpus_source],
  ];
  const table = node("dl", "config-list");
  for (const [label, value] of rows) {
    table.append(node("dt", "", label), node("dd", "mono", value));
  }
  return table;
}

function noteBlock(title: string, description: string, kind: "info" | "warning" = "info"): HTMLElement {
  const note = node("div", `note-block${kind === "warning" ? " is-warning" : ""}`);
  note.append(icon(kind === "warning" ? "alert" : "help"));
  const copy = node("div");
  copy.append(node("strong", "", title), node("p", "", description));
  note.append(copy);
  return note;
}

function diagnosticItem(title: string, value: string, status: HTMLElement, description: string): HTMLElement {
  const card = node("article", "integration-card");
  const top = node("div", "integration-card-top");
  top.append(node("h3", "", title), status);
  card.append(top, node("strong", "diagnostic-value", value), node("p", "", description));
  return card;
}

function renderUsage(data: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Inference usage",
    "Model javoblari bilan birga qaytgan haqiqiy tokenlar va backend request counters. Process-local telemetriya.",
    "AI INTELLIGENCE / USAGE",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const metrics = node("div", "metrics-grid");
  metrics.append(
    metricCard("Soʻrov · 24 soat", formatNumber(data.requests.requests), `${formatNumber(data.requests.requests_since_start)} process startidan beri`, "activity"),
    metricCard("Prompt tokens", formatNumber(data.requests.prompt_tokens), "Javob metadata’dan yigʻilgan", "document"),
    metricCard("Completion tokens", formatNumber(data.requests.completion_tokens), "Javob metadata’dan yigʻilgan", "sparkles"),
    metricCard("Avg. request latency", data.requests.avg_latency_ms === null ? "—" : `${formatNumber(data.requests.avg_latency_ms)} ms`, `${formatNumber(data.requests.failed)} ta failed request`, "clock", data.requests.failed ? "warning" : "success"),
  );
  content.append(metrics);
  const chartPanel = panel(
    "Request timeline",
    `Oxirgi ${data.requests.window_hours} soat · server process xotirasida`,
    createTimeline(data.requests.timeline, pageState.rangeHours),
  );
  const range = document.createElement("select");
  range.className = "select";
  range.setAttribute("aria-label", "Request vaqt oraligʻi");
  for (const hours of [1, 6, 24]) {
    const option = node("option", "", `${hours} soat`);
    option.value = String(hours);
    option.selected = pageState.rangeHours === hours;
    range.append(option);
  }
  range.addEventListener("change", () => {
    pageState.rangeHours = Number(range.value);
    loadCurrentPage();
  });
  chartPanel.querySelector(".panel-heading")?.append(range);
  content.append(chartPanel);
  const grid = node("div", "overview-grid");
  grid.append(
    panel("Retrieval modes", "Haqiqiy chat completion matni saqlanmaydi", retrievalModes(data.requests.retrieval_modes)),
    panel("Usage and retention", "Process-local counters", usageDetails(data)),
  );
  content.append(grid);
  content.append(noteBlock("Nimani hisoblaydi", "Prompt/completion tokenlar, citation soni, retrieval mode va javob vaqti user prompt, response body, API key yoki identifikatorsiz yigʻiladi. Rolling 24 soatlik ko‘rsatkichlar process restart bo‘lganda tozalanadi va workerlar orasida bo‘lishilmaydi.", "warning"));
  return content;
}

function usageDetails(data: AdminOverview): HTMLElement {
  const details = node("div", "detail-grid");
  details.append(
    detailItem("Window requests", formatNumber(data.requests.requests)),
    detailItem("All requests since start", formatNumber(data.requests.requests_since_start)),
    detailItem("In-flight", formatNumber(data.requests.in_flight)),
    detailItem("Failed in window", formatNumber(data.requests.failed)),
    detailItem("Source references", formatNumber(data.requests.citation_count)),
    detailItem("Retention", data.requests.retention),
    detailItem("Process uptime", formatDuration(data.uptime_seconds)),
    detailItem("Scope", "Single server process"),
  );
  return details;
}

function renderPrompts(config: AdminAiConfig): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Prompt management",
    "Server ishlatayotgan system prompt matnlarini koʻring va nusxalang. Bu deploymentda prompt tahrirlash xavfsizlik sababli read-only.",
    "AI INTELLIGENCE / PROMPTS",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const controls = node("div", "form-toolbar");
  const label = node("label", "field-label", "Prompt tili");
  const select = document.createElement("select");
  select.className = "select";
  select.setAttribute("aria-label", "Koʻriladigan prompt tili");
  const languages: Array<[typeof pageState.promptLanguage, string]> = [
    ["uzbek_latin", "Oʻzbekcha"],
    ["russian", "Русский"],
  ];
  for (const [key, text] of languages) {
    const option = node("option", "", text);
    option.value = key;
    option.selected = pageState.promptLanguage === key;
    select.append(option);
  }
  label.append(select);
  const copy = node("button", "button button-sm");
  copy.type = "button";
  copy.append(icon("copy"), node("span", "", "Nusxalash"));
  controls.append(label, copy);
  const value = config.prompt_rules[pageState.promptLanguage];
  const editor = document.createElement("textarea");
  editor.className = "prompt-editor";
  editor.readOnly = true;
  editor.value = value;
  editor.setAttribute("aria-label", "Amaldagi system prompt matni");
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      showToast("Prompt matni clipboardʼga nusxalandi.", "success");
    } catch {
      editor.select();
      const copied = document.execCommand("copy");
      showToast(copied ? "Prompt matni nusxalandi." : "Clipboard ruxsati yoʻq. Matnni qoʻlda belgilang.", copied ? "success" : "error");
    }
  });
  select.addEventListener("change", () => {
    pageState.promptLanguage = select.value as typeof pageState.promptLanguage;
    editor.value = config.prompt_rules[pageState.promptLanguage];
  });
  content.append(panel("Active system prompt", "Backend runtime prompt qoidalari · faqat o‘qish", promptEditor(editor), controls));
  content.append(noteBlock("Promptni tahrirlash mavjud emas", "Repo API prompt o‘zgarishini yoki versiya tarixini qo‘llamaydi. Prompt matni runtime’dan o‘qiladi; bu sahifa hech qanday sozlamani o‘zgartirmaydi."));
  return content;
}

function promptEditor(editor: HTMLTextAreaElement): HTMLElement {
  const wrap = node("div", "prompt-editor-wrap");
  wrap.append(editor);
  return wrap;
}

function renderEvaluations(result: AdminEvaluation): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Evaluation suite",
    "Mavjud legal answer golden dataset holati. Test natijasini yaratish yoki modelni o‘zgartirish bu API’da yo‘q.",
    "AI INTELLIGENCE / EVALUATIONS",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const grid = node("div", "metrics-grid metrics-grid-4");
  grid.append(
    metricCard("Evaluation cases", formatNumber(result.cases), result.dataset, "target"),
    metricCard("Dataset status", result.cases ? "Mavjud" : "Boʻsh", "rag/eval golden situations", "document", result.cases ? "success" : "warning"),
    metricCard("Latest run", statusLabel(result.result_status), "Saqlangan evaluation natijasi yoʻq", "activity", "warning"),
    metricCard("Saved result", result.saved_result_available ? "Mavjud" : "Yoʻq", "Evaluation output ombori ulanmagan", "database", "warning"),
  );
  content.append(grid);
  const body = node("div");
  body.append(
    detailItem("Dataset", result.dataset),
    detailItem("Cases", formatNumber(result.cases)),
    detailItem("Run status", statusLabel(result.result_status)),
    detailItem("Result artifact", result.saved_result_available ? "Available" : "Not configured"),
  );
  content.append(panel("Evaluation source", "Backenddan qaytgan holat", body));
  content.append(noteBlock("Natijani talqin qilish", "Faqat dataset faylining mavjudligi va case soni ko‘rsatiladi. Bu model aniqligi, citation verifikatsiyasi yoki ishlab turgan test natijasini anglatmaydi.", "warning"));
  return content;
}

function renderDocuments(page: Page<LegalDocument>, overview: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Document explorer",
    "Korpus manifestidagi qonun va kodekslar. Sarlavha yoki hujjat kodi bilan qidiring; lex.uz holatini alohida tekshiring.",
    "LEGAL KNOWLEDGE / DOCUMENTS",
  );
  const actions = pageActions();
  actions.append(exportButton(page.results, [
    ["code", "Kod"], ["title", "Hujjat"], ["adopted", "Qabul qilingan"],
    ["articles_count", "Maqolalar"], ["snapshot_date", "Snapshot"], ["sha256", "SHA-256"],
  ], "documents-current-page.csv", "Joriy sahifani CSV eksport qilish"));
  addActions(heading, actions);
  content.append(heading, snapshotBanner(overview.corpus.snapshot_date));
  const toolbar = node("div", "table-toolbar");
  const search = document.createElement("input");
  search.className = "input search-input";
  search.type = "search";
  search.value = pageState.documentQuery;
  search.placeholder = "Hujjat nomi yoki kodi...";
  search.setAttribute("aria-label", "Hujjatlarni nomi yoki kodi bilan qidirish");
  search.addEventListener("input", () => {
    pageState.documentQuery = search.value;
    pageState.documentPage = 1;
    window.clearTimeout(pageState.debounceTimer);
    pageState.debounceTimer = window.setTimeout(loadCurrentPage, 220);
  });
  const summary = node("span", "table-count", `${formatNumber(page.total)} hujjat`);
  toolbar.append(search, summary);
  content.append(toolbar);
  const tableBody = node("tbody");
  if (!page.results.length) {
    const row = node("tr");
    const cell = node("td", "table-empty", "Bu qidiruvga mos hujjat topilmadi.");
    cell.colSpan = 6;
    row.append(cell);
    tableBody.append(row);
  }
  for (const documentRow of sortRows(page.results, pageState.sortKey, pageState.sortDirection)) {
    const row = node("tr", "clickable-row");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `${documentRow.title} tafsilotlarini ochish`);
    row.append(
      cellText(documentRow.code, "mono"),
      cellWithTitle(documentRow.title, documentRow.filename),
      cellText(documentRow.adopted || "—"),
      cellText(formatNumber(documentRow.articles_count), "numeric-cell"),
      cellText(snapshotLabel(documentRow.snapshot_date), "nowrap"),
      cellBadge(documentRow.lex_uz_doc ? "Rasmiy manba mavjud" : "lex.uz havolasi yoʻq", documentRow.lex_uz_doc ? "success" : "warning"),
    );
    row.addEventListener("click", () => showDocumentDetails(documentRow));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDocumentDetails(documentRow);
      }
    });
    tableBody.append(row);
  }
  const table = buildTable([
    ["code", "Kod"], ["title", "Qonun / kodeks"], ["adopted", "Qabul qilingan"],
    ["articles_count", "Maqolalar"], ["snapshot_date", "Snapshot"], ["lex_uz_doc", "Manba"],
  ], tableBody);
  content.append(panel("Corpus documents", `${formatNumber(page.total)} yozuv · joriy sahifa ${page.page}/${Math.max(1, page.pages)}`, table));
  content.append(pagination(page, (next) => {
    pageState.documentPage = next;
    loadCurrentPage();
  }));
  content.append(pageFooter(overview.generated_at, "SHA-256 va hujjat metamaʼlumotlari manifest.csv dan; korpus snapshoti 2026-07."));
  return content;
}

function cellText(text: string, className = ""): HTMLTableCellElement {
  return node("td", className, text);
}

function cellWithTitle(title: string, secondary: string): HTMLTableCellElement {
  const cell = node("td");
  const stack = node("div", "cell-stack");
  stack.append(node("strong", "", title), node("span", "mono", secondary));
  cell.append(stack);
  return cell;
}

function cellBadge(text: string, tone: "success" | "warning" | "danger"): HTMLTableCellElement {
  const cell = node("td");
  cell.append(statusBadge(tone === "success" ? "online" : tone === "danger" ? "offline" : "not_configured", {
    online: text,
    offline: text,
    not_configured: text,
  }));
  return cell;
}

function buildTable(
  headers: Array<[string, string]>,
  body: HTMLTableSectionElement,
): HTMLElement {
  const wrap = node("div", "table-wrap");
  const table = node("table", "data-table");
  const thead = node("thead");
  const row = node("tr");
  for (const [key, label] of headers) {
    const cell = node("th");
    cell.scope = "col";
    const button = node("button", "sort-button");
    button.type = "button";
    const active = pageState.sortKey === key;
    cell.setAttribute("aria-sort", active ? pageState.sortDirection === "asc" ? "ascending" : "descending" : "none");
    button.append(node("span", "", label));
    if (active) button.append(icon(pageState.sortDirection === "asc" ? "arrow-up" : "arrow-down"));
    button.addEventListener("click", () => {
      if (pageState.sortKey === key) pageState.sortDirection = pageState.sortDirection === "asc" ? "desc" : "asc";
      else {
        pageState.sortKey = key;
        pageState.sortDirection = "asc";
      }
      loadCurrentPage();
    });
    cell.append(button);
    row.append(cell);
  }
  thead.append(row);
  table.append(thead, body);
  wrap.append(table);
  return wrap;
}

function sortRows<T extends object>(
  rows: T[],
  key: string,
  direction: SortDirection,
): T[] {
  return [...rows].sort((a, b) => {
    const left = Reflect.get(a, key) as unknown;
    const right = Reflect.get(b, key) as unknown;
    const result = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left ?? "").localeCompare(String(right ?? ""), "uz", { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  });
}

function pagination<T>(page: Page<T>, setPage: (value: number) => void): HTMLElement {
  const nav = node("nav", "pagination");
  nav.setAttribute("aria-label", "Natijalar sahifalari");
  const status = node("span", "pagination-count", `${formatNumber(page.total)} natijadan ${page.page} / ${Math.max(page.pages, 1)} sahifa`);
  const controls = node("div", "pagination-controls");
  const previous = node("button", "button button-sm");
  previous.type = "button";
  previous.disabled = page.page <= 1;
  previous.setAttribute("aria-label", "Oldingi sahifa");
  previous.append(icon("chevron-left"), node("span", "", "Oldingi"));
  previous.addEventListener("click", () => setPage(page.page - 1));
  const next = node("button", "button button-sm");
  next.type = "button";
  next.disabled = page.page >= page.pages;
  next.setAttribute("aria-label", "Keyingi sahifa");
  next.append(node("span", "", "Keyingi"), icon("chevron-right"));
  next.addEventListener("click", () => setPage(page.page + 1));
  controls.append(previous, next);
  nav.append(status, controls);
  return nav;
}

function exportButton<T extends object>(
  rows: T[],
  columns: Array<[keyof T, string]>,
  filename: string,
  label: string,
): HTMLButtonElement {
  const button = node("button", "button button-sm");
  button.type = "button";
  button.append(icon("download"), node("span", "", label));
  button.addEventListener("click", () => {
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const content = [
      columns.map(([, title]) => quote(title)).join(","),
      ...rows.map((row) => columns.map(([key]) => quote(Reflect.get(row, key))).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" }));
    const anchor = node("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} joriy sahifa yozuvi CSV fayliga eksport qilindi.`, "success");
  });
  return button;
}

function showDrawer(title: string, body: HTMLElement, footer?: HTMLElement): void {
  const drawer = root!.querySelector<HTMLElement>("#drawer")!;
  root!.querySelector("#drawer-title")!.textContent = title;
  root!.querySelector("#drawer-body")!.replaceChildren(body);
  root!.querySelector("#drawer-footer")!.replaceChildren();
  if (footer) root!.querySelector("#drawer-footer")!.append(footer);
  drawer.hidden = false;
  root!.querySelector<HTMLElement>("#drawer-backdrop")!.hidden = false;
  pageState.drawer = drawer;
  root!.querySelector<HTMLButtonElement>("#drawer-close")?.focus();
}

function closeDrawer(): void {
  const drawer = root?.querySelector<HTMLElement>("#drawer");
  if (!drawer || drawer.hidden) {
    pageState.drawer = null;
    pageState.notificationOpen = false;
    return;
  }
  drawer.hidden = true;
  root!.querySelector<HTMLElement>("#drawer-backdrop")!.hidden = true;
  root!.querySelector("#drawer-body")!.replaceChildren();
  root!.querySelector("#drawer-footer")!.replaceChildren();
  pageState.drawer = null;
  pageState.notificationOpen = false;
  root!.querySelector<HTMLButtonElement>("#notifications-button")?.focus();
}

function safeLexUrl(documentId: string): string | null {
  return /^-?\d+$/.test(documentId) ? `https://lex.uz/docs/${encodeURIComponent(documentId)}` : null;
}

function externalLink(url: string, label: string): HTMLAnchorElement {
  const link = node("a", "button button-sm button-link", label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.append(icon("external"));
  return link;
}

function showDocumentDetails(row: LegalDocument): void {
  const body = node("div", "drawer-content");
  const title = node("div", "drawer-document-title");
  title.append(node("span", "eyebrow", row.code), node("h3", "", row.title));
  body.append(title, snapshotBanner(row.snapshot_date));
  const details = node("div", "drawer-details");
  details.append(
    detailItem("Qabul qilingan", row.adopted || "Manifestda yoʻq"),
    detailItem("Maqolalar", formatNumber(row.articles_count)),
    detailItem("Oxirgi modda raqami", formatNumber(row.last_article)),
    detailItem("Snapshot", snapshotLabel(row.snapshot_date)),
    detailItem("Manba ID", row.lex_uz_doc || "Manifestda yoʻq"),
  );
  body.append(details);
  const hash = node("div", "hash-block");
  hash.append(node("span", "", "SHA-256 · snapshot fayli"), node("code", "", row.sha256 || "Manifestda yoʻq"));
  body.append(hash);
  body.append(noteBlock("Amaldagi tahrirni tekshiring", "Korpus 2026-07 snapshotidan tuzilgan. Hujjatning amaldagi holatini lex.uz’da alohida tasdiqlang.", "warning"));
  const footer = node("div", "drawer-actions");
  const articles = node("button", "button button-primary");
  articles.type = "button";
  articles.append(icon("file-search"), node("span", "", "Moddalarni ko‘rish"));
  articles.addEventListener("click", () => {
    pageState.articleCode = row.code;
    pageState.articleQuery = "";
    pageState.articlePage = 1;
    closeDrawer();
    navigate("articles");
  });
  footer.append(articles);
  const url = safeLexUrl(row.lex_uz_doc);
  if (url) footer.append(externalLink(url, "lex.uzʼda ochish"));
  showDrawer("Hujjat tafsilotlari", body, footer);
}

async function showArticleDetails(article: Article): Promise<void> {
  const body = node("div", "drawer-content");
  body.append(loadingPage());
  showDrawer("Modda tafsilotlari", body);
  try {
    const detail = await getArticleDetail(article.code, article.article_id);
    if (!pageState.drawer) return;
    renderArticleDetail(detail);
  } catch (error) {
    if (!pageState.drawer) return;
    root!.querySelector("#drawer-body")!.replaceChildren(
      inlineError(errorMessage(error), () => void showArticleDetails(article)),
    );
  }
}

function renderArticleDetail(detail: ArticleDetail): void {
  const body = node("div", "drawer-content");
  const heading = node("div", "drawer-document-title");
  heading.append(
    node("span", "eyebrow", `${detail.code} · ${detail.article}`),
    node("h3", "", detail.title || "Sarlavha ko‘rsatilmagan"),
  );
  body.append(heading);
  body.append(snapshotBanner(detail.snapshot_date));
  const text = node("article", "article-full-text");
  text.textContent = detail.text || "Snapshotda modda matni bo‘sh.";
  body.append(text);
  body.append(noteBlock("Manba va snapshot", "Yuqoridagi matn joriy korpus snapshotidan olingan. Amaldagi tahrir va o‘zgarishlarni rasmiy lex.uz manbasidan tekshiring.", "warning"));
  root!.querySelector("#drawer-body")!.replaceChildren(body);
  const footer = node("div", "drawer-actions");
  const url = safeLexUrl(detail.lex_uz_doc);
  if (url) footer.append(externalLink(url, "lex.uzʼda ochish"));
  else footer.append(node("span", "muted-copy", "Rasmiy hujjat IDʼsi manifestda ko‘rsatilmagan."));
  root!.querySelector("#drawer-footer")!.replaceChildren(footer);
}

function renderArticles(
  page: Page<Article>,
  documents: LegalDocument[],
  previousQuery: string,
): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Article browser",
    "2026-07 RAG snapshotidagi moddalarni sarlavha yoki matn bo‘yicha qidiring. Maqola tafsilotlari RAG indexdan o‘qiladi.",
    "LEGAL KNOWLEDGE / ARTICLES",
  );
  const actions = pageActions();
  actions.append(exportButton(page.results, [
    ["code", "Kod"], ["article", "Modda"], ["title", "Sarlavha"],
    ["snapshot_date", "Snapshot"], ["lex_uz_doc", "Manba ID"],
  ], "articles-current-page.csv", "Joriy sahifani CSV eksport qilish"));
  addActions(heading, actions);
  content.append(heading, snapshotBanner(page.results[0]?.snapshot_date ?? pageState.overview?.corpus.snapshot_date ?? "2026-07"));

  const toolbar = node("div", "table-toolbar article-toolbar");
  const search = document.createElement("input");
  search.className = "input search-input";
  search.type = "search";
  search.value = pageState.articleQuery;
  search.placeholder = "Modda, sarlavha yoki matn...";
  search.setAttribute("aria-label", "Qonun moddalarini qidirish");
  search.addEventListener("input", () => {
    pageState.articleQuery = search.value;
    pageState.articlePage = 1;
    window.clearTimeout(pageState.debounceTimer);
    pageState.debounceTimer = window.setTimeout(loadCurrentPage, 300);
  });
  const select = document.createElement("select");
  select.className = "select document-filter";
  select.setAttribute("aria-label", "Qonun yoki kodeks bo‘yicha filter");
  const allCodes = node("option", "", "Barcha qonunlar");
  allCodes.value = "";
  select.append(allCodes);
  for (const documentRow of documents) {
    const option = node("option", "", `${documentRow.code} · ${documentRow.title}`);
    option.value = documentRow.code;
    option.selected = pageState.articleCode === documentRow.code;
    select.append(option);
  }
  select.addEventListener("change", () => {
    pageState.articleCode = select.value;
    pageState.articlePage = 1;
    loadCurrentPage();
  });
  const count = node("span", "table-count", `${formatNumber(page.total)} modda`);
  toolbar.append(search, select, count);
  if (previousQuery && previousQuery !== pageState.articleQuery) {
    const hint = node("div", "search-hint", `Global qidiruv: “${previousQuery}”`);
    content.append(hint);
  }
  content.append(toolbar);
  const body = node("tbody");
  if (!page.results.length) {
    const row = node("tr");
    const cell = node("td", "table-empty", pageState.articleQuery ? "Mos modda topilmadi. Soʻzni qisqartiring yoki boshqa hujjatni tanlang." : "Bu hujjatda ko‘rsatiladigan modda yo‘q.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  }
  for (const article of page.results) {
    const row = node("tr", "clickable-row");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `${article.code_title}, ${article.article}, ${article.title} tafsilotlarini ochish`);
    row.append(
      cellText(article.code, "mono"),
      cellWithTitle(article.article, article.article_id),
      cellWithTitle(article.title || "Sarlavhasiz modda", article.text_preview),
      cellText(snapshotLabel(article.snapshot_date), "nowrap"),
      cellBadge(article.lex_uz_doc ? "Rasmiy manba mavjud" : "lex.uz ID yoʻq", article.lex_uz_doc ? "success" : "warning"),
    );
    row.addEventListener("click", () => void showArticleDetails(article));
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void showArticleDetails(article);
      }
    });
    body.append(row);
  }
  const table = buildTable([
    ["code", "Hujjat kodi"], ["article", "Modda"], ["title", "Sarlavha / qisqa matn"],
    ["snapshot_date", "Snapshot"], ["lex_uz_doc", "Manba"],
  ], body);
  content.append(panel("Corpus articles", `${formatNumber(page.total)} modda · joriy sahifa ${page.page}/${Math.max(1, page.pages)}`, table));
  content.append(pagination(page, (next) => {
    pageState.articlePage = next;
    loadCurrentPage();
  }));
  content.append(pageFooter(page.results[0]?.snapshot_date ?? null, "Har bir natija RAG indexning haqiqiy article_id va text maydoniga tayanadi."));
  return content;
}

function renderProvenance(page: Page<LegalDocument>, overview: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Versions & provenance",
    "Hujжат manifestiin source metadata, файлын SHA-256 болон corpus snapshot огноо.",
    "LEGAL KNOWLEDGE / PROVENANCE",
  );
  addActions(heading, pageActions());
  content.append(heading, snapshotBanner(overview.corpus.snapshot_date));
  const summary = node("div", "metrics-grid metrics-grid-4");
  summary.append(
    metricCard("Corpus snapshot", snapshotLabel(overview.corpus.snapshot_date), "Manifest-д заасан нийт snapshot", "history"),
    metricCard("Source IDs", formatNumber(overview.corpus.documents_with_source_ids), `/${formatNumber(overview.corpus.documents)} хууль lex.uz ID-тай`, "link"),
    metricCard("Manifest articles", formatNumber(overview.corpus.manifest_articles), "Manifest-ын article тоолол", "book"),
    metricCard("Indexed articles", formatNumber(overview.corpus.articles), "RAG index-ээс уншсан", "database"),
  );
  content.append(summary);
  const sourceBody = node("div", "source-list");
  for (const row of page.results) {
    const item = node("article", "source-row");
    const top = node("div", "source-row-top");
    const name = node("div", "integration-copy");
    name.append(node("strong", "", row.title), node("span", "mono", row.filename));
    top.append(name, node("span", "badge badge-neutral", snapshotLabel(row.snapshot_date)));
    const code = node("code", "hash-value", row.sha256 || "SHA-256 mavjud emas");
    const metadata = node("div", "source-metadata");
    metadata.append(
      detailItem("Qabul qilingan", row.adopted || "—"),
      detailItem("Maqola soni", formatNumber(row.articles_count)),
      detailItem("lex.uz document ID", row.lex_uz_doc || "—"),
    );
    item.append(top, code, metadata);
    const url = safeLexUrl(row.lex_uz_doc);
    if (url) item.append(externalLink(url, "Rasmiy manbani ochish"));
    sourceBody.append(item);
  }
  if (!page.results.length) sourceBody.append(emptyState("Manifest maʼlumoti topilmadi", "manifest.csv faylini backendda tekshiring.", "database"));
  content.append(panel("Source manifest", `${page.total} hujjat · SHA-256 manifest.csv faylidan`, sourceBody));
  content.append(noteBlock("Version history ulanmagan", "Repositoryda faqat amaldagi 2026-07 snapshot mavjud. Oldingi va keyingi versiyalar, o‘zgartirishlar tarixi yoki bekor qilingan hujjatlar uchun alohida manba API’si yo‘q.", "warning"));
  return content;
}

function renderPipeline(page: Page<LegalDocument>, overview: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Sources & sync",
    "Korpus pipeline holati va hozirgi hujjat manbalari. Faqat repoda mavjud manifest va snapshot ko‘rsatiladi.",
    "DATA PIPELINE / SOURCES",
  );
  addActions(heading, pageActions());
  content.append(heading, snapshotBanner(overview.corpus.snapshot_date));
  const stages = node("div", "pipeline-stages");
  const stageRows: Array<[string, string, string, IconName]> = [
    ["Source manifest", `${formatNumber(page.total)} hujjat`, "manifest.csv · repository diskida", "document"],
    ["Legal corpus", `${formatNumber(overview.corpus.articles)} maqola`, `${snapshotLabel(overview.corpus.snapshot_date)} snapshot · RAG index`, "book"],
    ["Retrieval runtime", overview.model.status === "online" ? "Model endpoint javob beradi" : "Model endpoint ulanmagan", "GET /v1/models health probe", "bot"],
  ];
  stageRows.forEach(([title, status, description, glyph], index) => {
    const stage = node("article", "pipeline-stage");
    const number = node("span", "pipeline-number", `0${index + 1}`);
    stage.append(number, icon(glyph), node("strong", "", title), node("span", "pipeline-stage-status", status), node("p", "", description));
    stages.append(stage);
  });
  content.append(panel("Current data path", "Only existing components · no synthetic job state", stages));
  content.append(sectionHeading("Ingestion & synchronization", "Queue/worker API, source sync controls, and retryable jobs are not configured."));
  content.append(integrationGrid(overview.integrations, ["ingestion_jobs", "corpus_history"]));
  const body = node("div", "detail-grid");
  body.append(
    detailItem("Current corpus", `${formatNumber(overview.corpus.documents)} documents`),
    detailItem("Indexed articles", formatNumber(overview.corpus.articles)),
    detailItem("Corpus snapshot", snapshotLabel(overview.corpus.snapshot_date)),
    detailItem("Source article reconciliation", `${formatNumber(overview.corpus.manifest_articles)} manifest / ${formatNumber(overview.corpus.articles)} index`),
  );
  content.append(panel("Pipeline source summary", "Manifest ↔ loaded RAG index", body));
  content.append(noteBlock("Safe read-only surface", "Bu admin panel faqat o‘qiydi. Retry, synchronize yoki re-ingest tugmalari ko‘rsatilmaydi, chunki backendda bu operatsiyalarni bajaradigan endpoint mavjud emas.", "warning"));
  return content;
}

function renderDocumentIntelligence(overview: AdminOverview, documents: Page<LegalDocument>): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Document intelligence",
    "Fayl upload, OCR, PDF/DOCX parsing va risk analysis mavjudligi haqida deployment holati.",
    "DOCUMENT INTELLIGENCE",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const integration = overview.integrations.document_intelligence;
  const statusPanel = node("div", "integration-hero");
  const statusMark = node("span", "integration-hero-mark");
  statusMark.append(icon("layers"));
  const statusCopy = node("div");
  statusCopy.append(
    node("span", "eyebrow", "SERVICE STATUS"),
    node("h2", "", "Document processing ulanmagan"),
    node("p", "", integration.reason ?? defaultDescriptions.document_intelligence),
  );
  statusPanel.append(statusMark, statusCopy, statusBadge(integration.status));
  content.append(panel("Processing service", "Backend integrations inventory", statusPanel));
  const cards = node("div", "integration-cards");
  cards.append(
    diagnosticItem("Document library", "Mavjud emas", statusBadge("not_configured"), "Foydalanuvchi hujjatlari uchun upload/storage endpointi topilmadi."),
    diagnosticItem("PDF / DOCX parsing", "Mavjud emas", statusBadge("not_configured"), "OCR yoki matn extraction worker’i sozlanmagan."),
    diagnosticItem("AI risk analysis", "Mavjud emas", statusBadge("not_configured"), "Hujjat tahlilini ishga tushiradigan endpoint yoki saqlangan job yo‘q."),
    diagnosticItem("Legal corpus documents", formatNumber(documents.total), statusBadge("online"), "Faqat ommaviy huquqiy korpus manbasi; foydalanuvchi fayli emas."),
  );
  content.append(sectionHeading("Capacity and privacy", "Fayl upload API mavjud emasligi sababli shaxsiy hujjatlar bu yerga yuklanmaydi."));
  content.append(cards);
  content.append(noteBlock("Private files are not processed", "PDF yoki DOCX yuklash, risk score yaratish va hujjatlarni solishtirish funksiyalari mavjud emas. Shaxsiy hujjatlarni chatga yoki admin panelga yubormang.", "warning"));
  return content;
}

function renderSecurity(security: AdminSecurity, overview: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Security center",
    "Admin hisobi, API key va rate-limit konfiguratsiyasi. Hozirgi API audit log yoki foydalanuvchi sessiya roʻyxatini taqdim etmaydi.",
    "SECURITY / ACCESS CONTROL",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const summary = node("div", "metrics-grid metrics-grid-4");
  summary.append(
    metricCard("Admin hisobi", security.admin_credentials_configured ? "Sozlangan" : "Oʻchirilgan", "Username + PBKDF2 parol xeshi", "key", security.admin_credentials_configured ? "success" : "danger"),
    metricCard("Legacy API keys", security.legacy_api_keys_configured ? "Configured" : "Open mode", security.legacy_api_keys_configured ? "TOMARIS_API_KEYS configured" : "API key check off/open mode", "lock", security.legacy_api_keys_configured ? "success" : "warning"),
    metricCard("Chat rate limit", `${security.chat_rate_limit.requests} / ${formatDuration(security.chat_rate_limit.window_seconds)}`, security.chat_rate_limit.scope, "activity"),
    metricCard("Login guard", statusLabel(security.failed_admin_logins.status), "Failed login limiter process-local", "shield", "warning"),
  );
  content.append(summary);

  const panelBody = node("div", "security-groups");
  panelBody.append(
    securityRow("Admin authentication", security.admin_credentials_configured ? "Sozlangan" : "Oʻchirilgan", security.admin_credentials_configured ? "success" : "danger", "Yagona server-side username/parol; sessiya HttpOnly, SameSite cookie bilan."),
    securityRow("Failed admin login attempts", statusLabel(security.failed_admin_logins.status), "warning", `Persistent audit trail: ${security.failed_admin_logins.persistent_audit_log ? "enabled" : "not configured"}.`),
    securityRow("User sessions", statusLabel(security.user_sessions.status), "warning", "Consumer authentication/session API ulanmagan."),
    securityRow("Permissions", statusLabel(security.permissions.status), "warning", "Role-based access control yo‘q; yagona admin token ishlatiladi."),
    securityRow("Audit log", statusLabel(security.audit_log.status), "warning", "Doimiy security event log mavjud emas."),
  );
  content.append(panel("Access control posture", "Admin security endpointidan", panelBody));

  const hardening = node("div", "integration-cards");
  hardening.append(
    diagnosticItem("CORS origins", "Environment allowlist", statusBadge("online"), "CORS_ORIGINS aniq trusted originlar roʻyxati boʻlishi, wildcard bo‘lmasligi kerak."),
    diagnosticItem("Admin session", "HttpOnly cookie", statusBadge("online"), "Parol saqlanmaydi; sessiya Secure (HTTPS), HttpOnly va SameSite=Strict cookie’da 8 soat amal qiladi."),
    diagnosticItem("Login limiter", "Process-local", statusBadge("degraded"), "Multi-worker yoki multi-instance productionda shared limiter talab qilinadi."),
    diagnosticItem("Transport security", "Reverse proxy talab etiladi", statusBadge("degraded"), "Production’da HTTPS va server loglarini maxfiy tutish talab qilinadi."),
  );
  content.append(sectionHeading("Hardening checklist", "Production chegaralari deployment egasi tomonidan tekshirilishi kerak."));
  content.append(hardening);
  content.append(noteBlock("Sozlamalar maxfiy saqlanadi", "Token qiymati yoki API key bu interfeysga qaytarilmaydi. Admin API’ni internetga chiqarishda HTTPS, trusted CORS origin, kuchli server secret va shared rate-limit infratuzilmasidan foydalaning.", "warning"));
  content.append(pageFooter(overview.generated_at, "Admin telemetry user prompt, response body yoki bearer tokenni saqlamaydi."));
  return content;
}

function securityRow(title: string, value: string, tone: "success" | "warning" | "danger", description: string): HTMLElement {
  const row = node("div", "security-row");
  const copy = node("div", "integration-copy");
  copy.append(node("strong", "", title), node("span", "", description));
  const badge = node("span", `badge badge-${tone}`);
  badge.append(node("span", "", value));
  row.append(copy, badge);
  return row;
}

function displayUnknown(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "—";
  return "Mavjud";
}

function renderInfrastructure(data: AdminOverview): HTMLElement {
  const content = node("div");
  const heading = pageHeading(
    "Infrastructure",
    "Python process, NVIDIA GPU telemetry va backend model endpoint holati. Hozir mavjud bo‘lmagan integratsiyalar “Ulanmagan” deb ko‘rsatiladi.",
    "INFRASTRUCTURE / RUNTIME",
  );
  addActions(heading, pageActions());
  content.append(heading);
  const gpu = data.infrastructure.gpu;
  const modelMetrics = node("div", "metrics-grid");
  modelMetrics.append(
    metricCard("Process uptime", formatDuration(data.uptime_seconds), "Uvicorn process ishga tushganidan", "clock"),
    metricCard("Process CPU", `${formatNumber(data.infrastructure.process_cpu_seconds)} sec`, "Process foydalangan CPU seconds", "cpu"),
    metricCard("Peak RSS memory", `${formatNumber(data.infrastructure.process_peak_rss_mb)} MB`, "Peak resident memory", "hard-drive"),
    metricCard("Model endpoint", data.model.status === "online" ? "Online" : "Offline", data.model.latency_ms === null ? data.model.message : `/v1/models health probe · ${data.model.latency_ms} ms`, "bot", data.model.status === "online" ? "success" : "warning"),
  );
  content.append(modelMetrics);
  const grid = node("div", "two-column-grid");
  const gpuBody = node("div");
  const gpuStatus = node("div", "integration-row");
  const gpuCopy = node("div", "integration-copy");
  gpuCopy.append(node("strong", "", "NVIDIA GPU"), node("span", "", displayUnknown(gpu.reason ?? "nvidia-smi telemetry")));
  gpuStatus.append(gpuCopy, statusBadge(displayUnknown(gpu.status)));
  gpuBody.append(gpuStatus);
  const gpuDetails = node("div", "detail-grid");
  gpuDetails.append(
    detailItem("GPU utilization", typeof gpu.utilization_percent === "number" ? `${gpu.utilization_percent}%` : "Unavailable"),
    detailItem("Memory used", typeof gpu.memory_used_mb === "number" ? `${gpu.memory_used_mb} MB` : "Unavailable"),
    detailItem("Memory total", typeof gpu.memory_total_mb === "number" ? `${gpu.memory_total_mb} MB` : "Unavailable"),
  );
  gpuBody.append(gpuDetails);
  const dependencies = node("div", "status-list");
  const dependencyRows: Array<[string, { status: string }]> = [
    ["PostgreSQL", data.infrastructure.postgresql],
    ["Redis", data.infrastructure.redis],
    ["Queue workers", data.infrastructure.queue_workers],
  ];
  for (const [label, value] of dependencyRows) {
    const row = node("div", "integration-row");
    row.append(node("strong", "", label), statusBadge(value.status));
    dependencies.append(row);
  }
  grid.append(
    panel("Host process & GPU", "Process telemetry + nvidia-smi", gpuBody),
    panel("Infrastructure dependencies", "Current deployment configuration", dependencies),
  );
  content.append(grid);
  content.append(sectionHeading("Service integration map", "Endpoint health is checked live; unavailable integrations are not replaced with sample values."));
  content.append(integrationGrid(data.integrations));
  content.append(noteBlock("Health probe distinction", "GET /v1/models latency is an endpoint availability probe only. It is not per-request model inference latency. Process and GPU fields are host-local and not aggregated across workers.", "info"));
  content.append(pageFooter(data.generated_at, "CPU/RSS/GPU values describe the worker serving this admin request."));
  return content;
}

async function showNotifications(): Promise<void> {
  pageState.notificationOpen = true;
  const body = node("div", "drawer-content");
  body.append(node("div", "skeleton skeleton-line"));
  showDrawer("Service status & alerts", body);
  try {
    const data = await getOverview();
    if (!pageState.notificationOpen) return;
    pageState.overview = data;
    body.replaceChildren();
    const issues: Array<{ title: string; detail: string; status: string }> = [];
    if (data.model.status !== "online") {
      issues.push({
        title: "Model endpoint",
        detail: data.model.message || "Model health probe muvaffaqiyatsiz tugadi.",
        status: data.model.status,
      });
    }
    if (data.requests.failed > 0) {
      issues.push({
        title: "Muvaffaqiyatsiz AI soʻrovlari",
        detail: `Rolling 24 soatda ${formatNumber(data.requests.failed)} ta soʻrov xato bilan tugagan.`,
        status: "degraded",
      });
    }
    const configuredIssues = Object.entries(data.integrations).filter(
      ([, value]) => value.status !== "not_configured"
        && value.status !== "online"
        && value.status !== "healthy",
    );
    for (const [key, value] of configuredIssues) {
      issues.push({
        title: integrationNames[key] ?? key,
        detail: value.reason ?? defaultDescriptions[key] ?? "Integratsiya sogʻlom emas.",
        status: value.status,
      });
    }
    if (!issues.length) {
      body.append(emptyState("Faol ogohlantirish yoʻq", "Sozlangan model va integratsiyalar sogʻlom; hali tizim ogohlantirishi qayd etilmagan.", "check"));
    } else {
      const list = node("div", "notification-list");
      for (const issue of issues) {
        const item = node("article", "notification-item");
        item.append(
          statusBadge(issue.status),
          node("strong", "", issue.title),
          node("p", "", issue.detail),
        );
        list.append(item);
      }
      body.append(list);
    }
    const unconfiguredCount = Object.values(data.integrations).filter(
      (item) => item.status === "not_configured",
    ).length;
    body.append(node(
      "p",
      "muted-copy",
      `Yangilangan: ${formatDate(data.generated_at)}. ${unconfiguredCount} ta integratsiya sozlanmagan. Bu jonli status tekshiruvi; persistent alert/audit feed emas.`,
    ));
  } catch (error) {
    if (!pageState.notificationOpen) return;
    body.replaceChildren(emptyState(
      "Statusni olib boʻlmadi",
      error instanceof Error ? error.message : "Backend bilan aloqa vaqtincha mavjud emas.",
      "alert",
    ));
    const retry = node("button", "button button-secondary", tt("common.retry"));
    retry.type = "button";
    retry.addEventListener("click", () => void showNotifications());
    body.append(retry);
  }
}

interface CommandResult {
  label: string;
  detail: string;
  icon: IconName;
  activate: () => void;
}

function commandResults(query: string): CommandResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  const results: CommandResult[] = navigation
    .filter((item) => !normalized || `${navLabel(item)} ${navDescription(item)} ${navSection(item)}`.toLocaleLowerCase().includes(normalized))
    .map((item) => ({
      label: navLabel(item),
      detail: navDescription(item),
      icon: item.icon,
      activate: () => navigate(item.id),
    }));
  if (normalized) {
    results.unshift({
      label: `${tt("shell.searchCorpus")}: “${query.trim()}”`,
      detail: tt("shell.searchCorpusHint"),
      icon: "file-search",
      activate: () => {
        pageState.pendingArticleQuery = query.trim();
        pageState.articleQuery = "";
        pageState.articleCode = "";
        pageState.articlePage = 1;
        navigate("articles");
      },
    });
    results.splice(1, 0, {
      label: `${tt("shell.searchDocuments")}: “${query.trim()}”`,
      detail: tt("shell.searchDocumentsHint"),
      icon: "document",
      activate: () => {
        pageState.documentQuery = query.trim();
        pageState.documentPage = 1;
        navigate("documents");
      },
    });
  }
  return results;
}

function renderCommandList(): void {
  const dialog = root!.querySelector<HTMLDialogElement>("#command-dialog")!;
  const list = root!.querySelector<HTMLElement>("#command-list")!;
  const input = root!.querySelector<HTMLInputElement>("#command-input")!;
  const results = commandResults(input.value);
  list.replaceChildren();
  pageState.selectedCommand = Math.min(pageState.selectedCommand, Math.max(0, results.length - 1));
  if (!results.length) {
    list.append(emptyState(tt("shell.noResults"), tt("shell.noResultsHint"), "search"));
    return;
  }
  results.forEach((result, index) => {
    const button = node("button", `command-result${index === pageState.selectedCommand ? " is-selected" : ""}`);
    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === pageState.selectedCommand));
    button.append(icon(result.icon));
    const copy = node("span", "command-copy");
    copy.append(node("strong", "", result.label), node("small", "", result.detail));
    button.append(copy, icon("arrow-right"));
    button.addEventListener("mouseenter", () => {
      pageState.selectedCommand = index;
      renderCommandList();
      input.focus();
    });
    button.addEventListener("click", () => {
      dialog.close();
      result.activate();
    });
    list.append(button);
  });
}

function openCommandPalette(): void {
  const dialog = root!.querySelector<HTMLDialogElement>("#command-dialog");
  if (!dialog || dialog.open) return;
  const input = root!.querySelector<HTMLInputElement>("#command-input")!;
  pageState.selectedCommand = 0;
  pageState.commandQuery = "";
  input.value = "";
  dialog.showModal();
  renderCommandList();
  input.focus();
}

function setupCommandPalette(): void {
  const input = root!.querySelector<HTMLInputElement>("#command-input")!;
  const dialog = root!.querySelector<HTMLDialogElement>("#command-dialog")!;
  input.addEventListener("input", () => {
    pageState.commandQuery = input.value;
    pageState.selectedCommand = 0;
    renderCommandList();
  });
  input.addEventListener("keydown", (event) => {
    const count = commandResults(input.value).length;
    if (event.key === "ArrowDown" && count) {
      event.preventDefault();
      pageState.selectedCommand = (pageState.selectedCommand + 1) % count;
      renderCommandList();
    } else if (event.key === "ArrowUp" && count) {
      event.preventDefault();
      pageState.selectedCommand = (pageState.selectedCommand - 1 + count) % count;
      renderCommandList();
    } else if (event.key === "Enter" && count) {
      event.preventDefault();
      const selected = commandResults(input.value)[pageState.selectedCommand];
      dialog.close();
      selected?.activate();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function setupDrawerKeyboard(): void {
  root!.querySelector<HTMLElement>("#drawer")?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const drawer = root!.querySelector<HTMLElement>("#drawer")!;
    const focusable = [...drawer.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

async function start(): Promise<void> {
  if (!location.hash) history.replaceState(null, "", "#/admin/overview");
  try {
    const session = await getAdminSession();
    enterAdmin(session.username);
  } catch (error) {
    renderLogin(error instanceof AdminApiError && error.status === 401
      ? ""
      : errorMessage(error));
  }
}

initAdminLanguage();
start();
