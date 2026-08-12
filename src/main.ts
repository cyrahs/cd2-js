import { addToCloud } from "@/flow";
import { createBanner } from "@/ui/banner";
import { registerSettingsMenu } from "@/ui/settings";
import { type DwBoxInfo, extractDwBoxes, extractHomeCards, nyaaLinkOf, pickBestBox, shortTitle } from "@/vcb/extract";

const INJECTED_ATTR = "data-cd2-vcbs";

function makeButton(text: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = text;
  btn.style.cssText =
    "display:inline-block;padding:5px 12px;border:none;border-radius:4px;cursor:pointer;" +
    "background:#1565c0;color:#fff;font-size:13px;font-family:system-ui,sans-serif;line-height:1.4;";
  return btn;
}

/** 点击后置灰防重复提交（banner 会持续反馈，无需恢复） */
function runOnce(btn: HTMLButtonElement, fn: () => Promise<void>) {
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.style.opacity = "0.6";
    void fn().finally(() => {
      btn.disabled = false;
      btn.style.opacity = "1";
    });
  });
}

/** 详情页：每个下载块注入按钮 */
function initArchivePage() {
  const boxes = extractDwBoxes();
  for (const box of boxes) {
    if (box.el.hasAttribute(INJECTED_ATTR)) continue;
    box.el.setAttribute(INJECTED_ATTR, "1");

    const nyaa = nyaaLinkOf(box);
    const label = box.title || shortTitle(document.title);
    const btn = makeButton(`添加到 CD2 离线${box.title ? `（${box.title}）` : ""}`);
    if (!nyaa) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.textContent = "未找到 nyaa.si 链接";
    } else {
      runOnce(btn, () => addToCloud(nyaa, label));
    }
    const p = document.createElement("p");
    p.style.marginTop = "8px";
    p.appendChild(btn);
    box.el.appendChild(p);
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
  const nyaa = best ? nyaaLinkOf(best) : null;
  if (!best || !nyaa) {
    createBanner(`${label} 添加失败: 详情页中未找到 nyaa.si 下载链接`, "error");
    return;
  }
  await addToCloud(nyaa, label);
}

/** 主页/列表页：每张发布帖卡片注入按钮 */
function initListPage() {
  const cards = extractHomeCards();
  for (const card of cards) {
    if (card.el.hasAttribute(INJECTED_ATTR)) continue;
    card.el.setAttribute(INJECTED_ATTR, "1");

    const label = shortTitle(card.title);

    if (card.readMoreEl) {
      const btn = makeButton("CD2 离线");
      btn.className = "pull-right"; // 与「阅读全文」同列浮动
      btn.style.marginRight = "8px";
      runOnce(btn, () => addFromCard(card.archiveUrl, label));
      card.readMoreEl.insertAdjacentElement("afterend", btn);
    }
    if (card.mobileSection) {
      const btn = makeButton("添加到 CD2 离线");
      btn.style.marginTop = "6px";
      runOnce(btn, () => addFromCard(card.archiveUrl, label));
      card.mobileSection.appendChild(btn);
    }
  }
}

function main() {
  registerSettingsMenu();
  if (/^\/archives\/\d+/.test(location.pathname)) {
    initArchivePage();
  } else {
    initListPage();
  }
}

main();
