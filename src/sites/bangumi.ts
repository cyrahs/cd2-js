import gmFetch from "@/grpc/gmFetch";
import type { MagnetInfo } from "./types";

/**
 * 通过 bangumi.moe JSON API 获取磁力链接。
 * 种子页（/torrent/<24位mongoId>）是 SPA，HTML 中无磁力；
 * POST /api/torrent/fetch {_id} 直接返回 { magnet, infoHash }（2026-08 实测）。
 */
export async function fetchMagnet(torrentUrl: string): Promise<MagnetInfo> {
  const m = torrentUrl.match(/bangumi\.moe\/torrent\/([0-9a-fA-F]{24})/);
  if (!m) throw new Error(`URL 中未找到种子 id: ${torrentUrl}`);

  const res = await gmFetch("https://bangumi.moe/api/torrent/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _id: m[1] }),
  });
  if (!res.ok) throw new Error(`bangumi.moe 请求失败: HTTP ${res.status}`);

  const t = (await res.json()) as { magnet?: string; infoHash?: string } | null;
  const infoHash = t?.infoHash?.toLowerCase();
  if (!infoHash) throw new Error("bangumi.moe API 未返回 infohash");
  return { magnet: t?.magnet || `magnet:?xt=urn:btih:${infoHash}`, infoHash };
}
