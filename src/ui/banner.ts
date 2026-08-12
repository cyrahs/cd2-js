/** 右上角 banner 栈。全部内联样式，避免站点 CSS 干扰。 */

export type BannerKind = "info" | "progress" | "success" | "error";

const COLORS: Record<BannerKind, string> = {
  info: "#616161",
  progress: "#1565c0",
  success: "#2e7d32",
  error: "#c62828",
};

const AUTO_DISMISS_MS = 8000;

type BannerEntry = {
  el: HTMLDivElement;
  textEl: HTMLSpanElement;
  timer: number | null;
};

let container: HTMLDivElement | null = null;
const banners = new Map<number, BannerEntry>();
let nextId = 1;

function getContainer(): HTMLDivElement {
  if (container?.isConnected) return container;
  container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;";
  document.body.appendChild(container);
  return container;
}

function dismiss(id: number) {
  const entry = banners.get(id);
  if (!entry) return;
  entry.el.remove();
  if (entry.timer !== null) window.clearTimeout(entry.timer);
  banners.delete(id);
}

function applyKind(entry: BannerEntry, id: number, kind: BannerKind) {
  entry.el.style.background = COLORS[kind];
  if (entry.timer !== null) {
    window.clearTimeout(entry.timer);
    entry.timer = null;
  }
  if (kind === "success" || kind === "error") {
    entry.timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }
}

export function createBanner(text: string, kind: BannerKind): number {
  const id = nextId++;

  const el = document.createElement("div");
  el.style.cssText =
    "pointer-events:auto;display:flex;align-items:center;gap:10px;max-width:420px;padding:10px 14px;" +
    "border-radius:6px;color:#fff;font-size:14px;line-height:1.4;font-family:system-ui,sans-serif;" +
    "box-shadow:0 2px 10px rgba(0,0,0,.3);word-break:break-all;";

  const textEl = document.createElement("span");
  textEl.textContent = text;

  const closeEl = document.createElement("span");
  closeEl.textContent = "×";
  closeEl.style.cssText = "cursor:pointer;font-size:18px;flex-shrink:0;opacity:.8;";
  closeEl.addEventListener("click", () => dismiss(id));

  el.append(textEl, closeEl);
  getContainer().appendChild(el);

  const entry: BannerEntry = { el, textEl, timer: null };
  banners.set(id, entry);
  applyKind(entry, id, kind);
  return id;
}

export function updateBanner(id: number, text: string, kind: BannerKind): void {
  const entry = banners.get(id);
  if (!entry || !entry.el.isConnected) {
    // 已被手动关闭则重新创建，保证终态（下载成功/失败）不会丢失
    banners.delete(id);
    createBanner(text, kind);
    return;
  }
  entry.textEl.textContent = text;
  applyKind(entry, id, kind);
}
