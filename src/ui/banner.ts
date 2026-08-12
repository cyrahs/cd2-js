/** 右上角 banner 栈。全部内联样式，避免站点 CSS 干扰。 */

export type BannerKind = "info" | "progress" | "success" | "error";

/** banner 内嵌的操作按钮（如失败后的「重试检查」） */
export type BannerAction = { label: string; onClick: () => void };

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
  closeEl: HTMLSpanElement;
  actionEl: HTMLButtonElement | null;
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

function dismiss(entry: BannerEntry) {
  entry.el.remove();
  if (entry.timer !== null) window.clearTimeout(entry.timer);
  for (const [id, e] of banners) {
    if (e === entry) banners.delete(id);
  }
}

function applyKind(entry: BannerEntry, kind: BannerKind) {
  entry.el.style.background = COLORS[kind];
  if (entry.timer !== null) {
    window.clearTimeout(entry.timer);
    entry.timer = null;
  }
  // 失败常驻，需手动关闭；仅成功自动消失
  if (kind === "success") {
    entry.timer = window.setTimeout(() => dismiss(entry), AUTO_DISMISS_MS);
  }
}

function applyAction(entry: BannerEntry, action?: BannerAction) {
  entry.actionEl?.remove();
  entry.actionEl = null;
  if (!action) return;
  const btn = document.createElement("button");
  btn.textContent = action.label;
  btn.style.cssText =
    "cursor:pointer;flex-shrink:0;padding:2px 10px;border:1px solid rgba(255,255,255,.6);border-radius:4px;" +
    "background:rgba(255,255,255,.15);color:#fff;font-size:12px;line-height:1.4;font-family:inherit;";
  btn.addEventListener("click", action.onClick);
  entry.el.insertBefore(btn, entry.closeEl);
  entry.actionEl = btn;
}

function makeEntry(text: string, kind: BannerKind, action?: BannerAction): BannerEntry {
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
  closeEl.addEventListener("click", () => dismiss(entry));

  el.append(textEl, closeEl);
  getContainer().appendChild(el);

  const entry: BannerEntry = { el, textEl, closeEl, actionEl: null, timer: null };
  applyKind(entry, kind);
  applyAction(entry, action);
  return entry;
}

export function createBanner(text: string, kind: BannerKind, action?: BannerAction): number {
  const id = nextId++;
  banners.set(id, makeEntry(text, kind, action));
  return id;
}

export function updateBanner(id: number, text: string, kind: BannerKind, action?: BannerAction): void {
  const entry = banners.get(id);
  if (!entry || !entry.el.isConnected) {
    // 已被手动关闭则以同一 id 重新创建，保证终态（下载成功/失败）不丢失且后续更新仍指向它
    if (entry?.timer != null) window.clearTimeout(entry.timer);
    banners.set(id, makeEntry(text, kind, action));
    return;
  }
  entry.textEl.textContent = text;
  applyKind(entry, kind);
  applyAction(entry, action);
}
