export type MagnetInfo = {
  magnet: string;
  /** 小写 hex infohash（或 base32 原样），用于与 OfflineFile.infoHash 匹配 */
  infoHash: string;
};

/** 发布站链接（site 为 extract.ts 中 SITE_PATTERNS 的站点名） */
export type SiteLink = {
  site: string;
  url: string;
};
