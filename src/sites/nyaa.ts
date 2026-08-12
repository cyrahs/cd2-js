import gmFetch from "@/grpc/gmFetch";
import { parseMagnet } from "./magnet";
import type { MagnetInfo } from "./types";

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
  const info = parseMagnet(m[1].replace(/&amp;/g, "&"));
  if (!info) throw new Error("磁力链接中未找到 infohash");

  return info;
}
