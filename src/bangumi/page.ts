/**
 * bangumi.moe 页面注入（Angular SPA，DOM 动态渲染，MutationObserver 驱动）。
 *
 * 结构（2026-08 实测）：
 * - 列表行（主页/搜索页通用）：md-item.torrent-row，标题在 .torrent-title h3
 *   （span 为标题文本，small > a[href="/torrent/<24位id>"] 为外链）；
 *   行内两处 ng-click（点标题开弹窗 / 点头像下载种子），chip 点击必须阻止冒泡
 * - 详情弹窗：md-dialog.torrent-details-dialog，头部 a.title-link 指向 /torrent/<id>，
 *   底部 .md-actions 依次为种子下载 button 与 magnet <a>，CD2 按钮插在 magnet 前
 * - 列表 ng-repeat 为 track by $index：换搜索条件时 Angular 原地复用行 DOM 重绑数据，
 *   故链接与标题一律在点击时从 DOM 现取，注入时只挂元素（chip 不在绑定节点内，可存活）
 */
import { addMagnetToCloud, addToCloud } from "@/flow";
import { parseMagnet } from "@/sites/magnet";
import type { SiteLink } from "@/sites/types";
import { createBanner } from "@/ui/banner";
import { runOnce } from "@/ui/util";

const INJECTED_ATTR = "data-cd2-bangumi";

/** 紫色与站点列表 stats 的云下载图标一致 */
const CHIP_STYLE =
  "margin-left:8px;font-size:12px;font-weight:normal;cursor:pointer;color:#fff;" +
  "background:#9575cd;border-radius:3px;padding:1px 6px;white-space:nowrap;vertical-align:middle;";

function shortLabel(title: string | null | undefined): string {
  const t = (title ?? "").trim() || "种子";
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

function torrentLinks(url: string): SiteLink[] {
  return [{ site: "bangumi.moe", url }];
}

function makeButton(text: string): HTMLAnchorElement {
  const a = document.createElement("a");
  const icon = document.createElement("i");
  icon.className = "fa fa-cloud-download";
  a.append(icon, ` ${text}`);
  return a;
}

/** 主页/搜索页列表行：标题后注入 CD2 chip */
function injectRows(): void {
  for (const row of Array.from(document.querySelectorAll<HTMLElement>("md-item.torrent-row"))) {
    if (row.hasAttribute(INJECTED_ATTR)) continue;
    const h3 = row.querySelector<HTMLElement>(".torrent-title h3");
    if (!h3) continue;
    row.setAttribute(INJECTED_ATTR, "1");

    const chip = makeButton("CD2");
    chip.style.cssText = CHIP_STYLE;
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    runOnce(chip, () => {
      const a = row.querySelector<HTMLAnchorElement>('a[href*="/torrent/"]');
      const title = row.querySelector(".torrent-title span")?.textContent;
      if (!a) {
        createBanner("未找到种子链接", "error");
        return Promise.resolve();
      }
      return addToCloud(torrentLinks(a.href), shortLabel(title));
    });
    h3.appendChild(chip);
  }
}

/** 详情弹窗：底部操作栏注入 CD2 按钮（magnet 之前），优先直取弹窗内现成磁力 */
function injectDialog(): void {
  const dlg = document.querySelector<HTMLElement>("md-dialog.torrent-details-dialog");
  if (!dlg || dlg.hasAttribute(INJECTED_ATTR)) return;
  const actions = dlg.querySelector<HTMLElement>(".md-actions");
  if (!actions) return;
  dlg.setAttribute(INJECTED_ATTR, "1");

  const btn = makeButton("CD2 离线");
  btn.className = "md-primary md-button md-default-theme";
  btn.style.cursor = "pointer";
  runOnce(btn, () => {
    const label = shortLabel(dlg.querySelector("a.title-link")?.textContent);
    const magnetA = actions.querySelector<HTMLAnchorElement>('a[href^="magnet:"]');
    const info = magnetA ? parseMagnet(magnetA.href) : null;
    if (info) return addMagnetToCloud(info, label);
    const idA = dlg.querySelector<HTMLAnchorElement>('a.title-link[href*="/torrent/"]');
    if (idA) return addToCloud(torrentLinks(idA.href), label);
    createBanner(`${label} 添加失败: 弹窗中未找到磁力或种子链接`, "error");
    return Promise.resolve();
  });
  actions.insertBefore(btn, actions.querySelector('a[href^="magnet:"]'));
}

export function initBangumiPage(): void {
  const process = () => {
    injectRows();
    injectDialog();
  };
  process();

  // 注入本身也触发 mutation，靠 INJECTED_ATTR 幂等；150ms 去抖合并批量渲染
  let timer = 0;
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = 0;
      process();
    }, 150);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
