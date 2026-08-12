import { getConfig } from "@/config";
import { addOfflineFiles } from "@/grpc/client";
import { resolveMagnet } from "@/sites/resolve";
import type { MagnetInfo, SiteLink } from "@/sites/types";
import { trackTask } from "@/tracker";
import { createBanner, updateBanner } from "@/ui/banner";
import { openSettings } from "@/ui/settings";

/**
 * 完整编排：发布站链接（按来源优先级解析）→ magnet → CD2 离线任务 → 状态跟踪。
 * @param label banner 中展示的短名称（如动漫名或规格名）
 */
export async function addToCloud(links: SiteLink[], label: string): Promise<void> {
  await addWith(label, () => resolveMagnet(links));
}

/** 页面 DOM 中已有现成磁力（如 bangumi.moe 弹窗）时跳过解析请求直接提交 */
export async function addMagnetToCloud(info: MagnetInfo, label: string): Promise<void> {
  await addWith(label, () => Promise.resolve(info));
}

async function addWith(label: string, resolve: () => Promise<MagnetInfo>): Promise<void> {
  const cfg = getConfig();
  if (!cfg.grpcBaseUrl || !cfg.apiToken || !cfg.offlineDestPath) {
    createBanner("请先完成 CloudDrive2 配置（地址 / API Token / 离线目标目录）", "error");
    openSettings();
    return;
  }

  const id = createBanner(`${label} 解析磁力中…`, "progress");
  try {
    const { magnet, infoHash } = await resolve();
    updateBanner(id, `${label} 提交离线任务中…`, "progress");
    const res = await addOfflineFiles(magnet);
    if (!res.success) {
      updateBanner(id, `${label} 添加失败: ${res.errorMessage || "未知错误"}`, "error");
      return;
    }
    updateBanner(id, `${label} 添加成功，开始跟踪…`, "progress");
    await trackTask(infoHash, id, label);
  } catch (e) {
    updateBanner(id, `${label} 添加失败: ${e instanceof Error ? e.message : String(e)}`, "error");
  }
}
