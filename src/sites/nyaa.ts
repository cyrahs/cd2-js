import gmFetch from "@/grpc/gmFetch";

export type MagnetInfo = {
  magnet: string;
  /** 小写 hex infohash（或 base32 原样），用于与 OfflineFile.infoHash 匹配 */
  infoHash: string;
};

/**
 * 抓取 nyaa.si 种子详情页并解析 magnet 链接。
 * 页面结构（2026-08 实测）：信息区有 `<a href="magnet:?xt=urn:btih:...">`，
 * href 内的 & 以 &amp; 形式转义。
 */
export async function fetchMagnet(nyaaViewUrl: string): Promise<MagnetInfo> {
  const res = await gmFetch(nyaaViewUrl, { method: "GET" });
  if (!res.ok) throw new Error(`nyaa.si 请求失败: HTTP ${res.status}`);
  const html = await res.text();

  const m = html.match(/href="(magnet:\?[^"]+)"/);
  if (!m) throw new Error("nyaa.si 页面中未找到磁力链接");
  const magnet = m[1].replace(/&amp;/g, "&");

  const h = magnet.match(/xt=urn:btih:([0-9a-fA-F]{40}|[A-Z2-7]{32})/);
  if (!h) throw new Error("磁力链接中未找到 infohash");

  return { magnet, infoHash: h[1].toLowerCase() };
}
