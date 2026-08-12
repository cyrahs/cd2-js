import { initBangumiPage } from "@/bangumi/page";
import { addToCloud } from "@/flow";
import { hasMagnetSource, SOURCE_NAMES } from "@/sites/resolve";
import { createBanner } from "@/ui/banner";
import { registerSettingsMenu } from "@/ui/settings";
import { runOnce } from "@/ui/util";
import {
  type DwBoxInfo,
  extractDwBoxes,
  extractHomeCards,
  findTagRows,
  pickBestBox,
  shortTitle,
} from "@/vcb/extract";

const INJECTED_ATTR = "data-cd2-vcbs";

/** 与站点标签栏一致的按钮：span.label.label-zan + FA4 图标 */
function makeTagButton(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "label label-zan";
  span.style.cursor = "pointer";
  const icon = document.createElement("i");
  icon.className = "fa fa-cloud-download";
  span.append(icon, ` ${text}`);
  return span;
}

/** 详情页：标签栏为每个下载块注入一个标签按钮 */
function initArchivePage() {
  const boxes = extractDwBoxes();
  if (boxes.length === 0) return;
  const rows = findTagRows(document);
  for (const row of [rows.desktop, rows.mobile]) {
    if (!row || row.hasAttribute(INJECTED_ATTR)) continue;
    row.setAttribute(INJECTED_ATTR, "1");
    for (const box of boxes) {
      const label = box.title || shortTitle(document.title);
      const btn = makeTagButton(`CD2 离线${box.title ? ` ${box.title}` : ""}`);
      if (!hasMagnetSource(box.links)) {
        btn.style.opacity = "0.5";
        btn.style.cursor = "default";
        btn.title = `未找到支持的下载链接（${SOURCE_NAMES}）`;
      } else {
        runOnce(btn, () => addToCloud(box.links, label));
      }
      row.append(" ", btn);
    }
  }
}

/** 主页卡片：后台拉取详情页，选最高规格提交 */
async function addFromCard(archiveUrl: string, label: string): Promise<void> {
  let boxes: DwBoxInfo[];
  try {
    const res = await fetch(archiveUrl, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    boxes = extractDwBoxes(doc);
  } catch (e) {
    createBanner(`${label} 添加失败: 拉取详情页出错 (${e instanceof Error ? e.message : String(e)})`, "error");
    return;
  }

  const best = pickBestBox(boxes);
  if (!best || !hasMagnetSource(best.links)) {
    createBanner(`${label} 添加失败: 详情页中未找到支持的下载链接（${SOURCE_NAMES}）`, "error");
    return;
  }
  await addToCloud(best.links, label);
}

/** 主页/列表页：每张发布帖卡片的标签栏注入标签按钮 */
function initListPage() {
  const cards = extractHomeCards();
  for (const card of cards) {
    if (card.el.hasAttribute(INJECTED_ATTR)) continue;
    card.el.setAttribute(INJECTED_ATTR, "1");

    const label = shortTitle(card.title);
    const rows = findTagRows(card.el);
    for (const row of [rows.desktop, rows.mobile]) {
      if (!row) continue;
      const btn = makeTagButton("CD2 离线");
      runOnce(btn, () => addFromCard(card.archiveUrl, label));
      row.append(" ", btn);
    }
  }
}

function main() {
  registerSettingsMenu();
  if (location.hostname === "bangumi.moe") {
    initBangumiPage();
    return;
  }
  if (/^\/archives\/\d+/.test(location.pathname)) {
    initArchivePage();
  } else {
    initListPage();
  }
}

main();
