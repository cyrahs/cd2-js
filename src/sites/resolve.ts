import { fetchMagnet as fetchBangumi } from "./bangumi";
import { fetchMagnet as fetchNyaa } from "./nyaa";
import type { MagnetInfo, SiteLink } from "./types";

/** 磁力来源优先级：nyaa（默认来源）优先，失败或缺失时依次兜底 */
const SOURCES: { site: string; fetch: (url: string) => Promise<MagnetInfo> }[] = [
  { site: "nyaa", fetch: fetchNyaa },
  { site: "bangumi.moe", fetch: fetchBangumi },
];

/** 支持来源的展示名，用于按钮禁用提示与错误信息 */
export const SOURCE_NAMES = "nyaa.si / bangumi.moe";

/** 链接列表中是否存在可解析磁力的来源 */
export function hasMagnetSource(links: SiteLink[]): boolean {
  return SOURCES.some((s) => links.some((l) => l.site === s.site));
}

/** 按优先级逐个尝试来源，全部失败时汇总各来源错误抛出 */
export async function resolveMagnet(links: SiteLink[]): Promise<MagnetInfo> {
  const errors: string[] = [];
  for (const src of SOURCES) {
    const link = links.find((l) => l.site === src.site);
    if (!link) continue;
    try {
      return await src.fetch(link.url);
    } catch (e) {
      errors.push(`${src.site}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(errors.length > 0 ? errors.join("；") : `未找到支持的下载链接（${SOURCE_NAMES}）`);
}
