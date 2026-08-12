/**
 * VCB-Studio 项目页（https://vcb-s.com/archives/<id>）下载区解析。
 *
 * 页面结构（2026-08 实测）：
 *   article.article > .centent-article > div.dw-box.dw-box-download
 *     首行文本为版本名（如 "10-bit 1080p HEVC"），随后每个 <p><a> 是一个发布站链接：
 *     - https://bangumi.moe/torrent/<mongoId>
 *     - https://share.acgnx.se/show-<40位infohash>.html   ← URL 直接携带 infohash
 *     - https://www.acgnx.se/show-<40位infohash>.html     ← 同上
 *     - https://acg.rip/t/<id>
 *     - https://share.dmhy.org/topics/view/<slug>.html
 *     - https://nyaa.si/view/<id>
 *
 * 一个帖子可能有多个 dw-box（不同规格/分批 Reseed）。
 * 优先从 acgnx URL 直接提取 infohash 拼 magnet，无需请求任何外站。
 */

export type DwBoxInfo = {
  /** 版本标题，如 "10-bit 1080p HEVC" */
  title: string;
  /** 从 acgnx 链接提取的 infohash（小写），可能为 null */
  infoHash: string | null;
  /** 各发布站链接（备用解析源） */
  links: { site: string; url: string }[];
  /** dw-box 元素本体，用于注入按钮 */
  el: HTMLElement;
};

const ACGNX_HASH_RE = /acgnx\.se\/show-([0-9a-fA-F]{40})\.html/;

const SITE_PATTERNS: [string, RegExp][] = [
  ["bangumi.moe", /bangumi\.moe\/torrent\//],
  ["acgnx", /acgnx\.se\/show-/],
  ["acg.rip", /acg\.rip\/t\//],
  ["dmhy", /share\.dmhy\.org\/topics\/view\//],
  ["nyaa", /nyaa\.si\/view\//],
];

function siteOf(url: string): string | null {
  for (const [name, re] of SITE_PATTERNS) {
    if (re.test(url)) return name;
  }
  return null;
}

/** 解析当前页面的所有下载区块 */
export function extractDwBoxes(root: ParentNode = document): DwBoxInfo[] {
  const boxes = Array.from(root.querySelectorAll<HTMLElement>(".dw-box.dw-box-download"));
  return boxes.map((el) => {
    // 版本标题是 icon 后的首个文本节点
    const title =
      Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim() ?? "")
        .find((t) => t.length > 0) ?? "";

    const links: DwBoxInfo["links"] = [];
    let infoHash: string | null = null;
    for (const a of Array.from(el.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
      const site = siteOf(a.href);
      if (!site) continue;
      links.push({ site, url: a.href });
      const m = a.href.match(ACGNX_HASH_RE);
      if (m && !infoHash) infoHash = m[1].toLowerCase();
    }

    return { title, infoHash, links, el };
  });
}

/** 由 infohash 拼 magnet 链接 */
export function magnetOf(infoHash: string, displayName?: string): string {
  let magnet = `magnet:?xt=urn:btih:${infoHash}`;
  if (displayName) magnet += `&dn=${encodeURIComponent(displayName)}`;
  return magnet;
}
