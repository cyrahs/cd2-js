import type { MagnetInfo } from "./types";

/** 从 magnet 链接解析 infohash（hex40 或 base32）；不合法返回 null */
export function parseMagnet(magnet: string): MagnetInfo | null {
  const h = magnet.match(/xt=urn:btih:([0-9a-fA-F]{40}|[A-Z2-7]{32})/);
  return h ? { magnet, infoHash: h[1].toLowerCase() } : null;
}
