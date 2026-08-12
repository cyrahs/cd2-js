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

/** 取下载块中的 nyaa.si 链接（磁力默认来源） */
export function nyaaLinkOf(box: DwBoxInfo): string | null {
  return box.links.find((l) => l.site === "nyaa")?.url ?? null;
}

/**
 * 多规格帖子中选最高规格：分辨率为主键，同分辨率 HEVC>AVC、10-bit/Ma10p>8-bit。
 * VCB 规格标题形如 "10-bit 1080p HEVC"、"8-bit 720p AVC"、"Ma10p 2160p HEVC"。
 */
export function pickBestBox(boxes: DwBoxInfo[]): DwBoxInfo | null {
  if (boxes.length === 0) return null;
  const score = (t: string): number => {
    const res = t.match(/(\d{3,4})p/i);
    let s = (res ? Number.parseInt(res[1], 10) : 0) * 10;
    if (/hevc|x265|h\.?265/i.test(t)) s += 5;
    if (/ma10p|10-?bit/i.test(t)) s += 2;
    return s;
  };
  return boxes.reduce((a, b) => (score(b.title) > score(a.title) ? b : a));
}

export type HomeCard = {
  /** 帖子标题 */
  title: string;
  /** 详情页 URL */
  archiveUrl: string;
  /** 卡片元素本体 */
  el: HTMLElement;
};

/**
 * 标签栏注入点：桌面为 .hidden-xs 内的 div.tag-article（span.label.label-zan 一排），
 * 移动端无标签栏，对应位置是 .visible-xs 内带 fa-calendar 日期的 <p>。
 * 主页卡片（section.hidden-xs/visible-xs）与详情页（article 下 div.hidden-xs/visible-xs）结构一致。
 */
export function findTagRows(scope: ParentNode): { desktop: HTMLElement | null; mobile: HTMLElement | null } {
  const desktop = scope.querySelector<HTMLElement>(".hidden-xs .tag-article");
  const mobile =
    Array.from(scope.querySelectorAll<HTMLElement>(".visible-xs p")).find((p) => p.querySelector("i.fa-calendar")) ??
    null;
  return { desktop, mobile };
}

/**
 * 主页/列表页发布帖卡片解析。
 * 卡片结构（2026-08 实测）：div.article.well.clearfix 内含
 * section.hidden-xs（桌面，.title-article h1 a 标题，底部 a.read-more）
 * 与 section.visible-xs（移动）两套结构；仅标题含 "BDRip" 的是发布帖。
 */
export function extractHomeCards(root: ParentNode = document): HomeCard[] {
  const cards = Array.from(root.querySelectorAll<HTMLElement>("div.article.well.clearfix"));
  const out: HomeCard[] = [];
  for (const el of cards) {
    const titleA = el.querySelector<HTMLAnchorElement>('.title-article a[href*="/archives/"]');
    if (!titleA) continue;
    const title = titleA.textContent?.trim() ?? "";
    if (!/BDRip/i.test(title)) continue;
    out.push({ title, archiveUrl: titleA.href, el });
  }
  return out;
}

/** 帖子标题取短名（第一个 / 前的罗马字名），用于 banner 展示 */
export function shortTitle(title: string): string {
  const first = title.split("/")[0].trim();
  return first.length > 0 ? first : title.trim();
}
