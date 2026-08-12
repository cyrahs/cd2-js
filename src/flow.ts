import { getConfig } from "@/config";
import { addOfflineFiles } from "@/grpc/client";
import { fetchMagnet } from "@/sites/nyaa";
import { trackTask } from "@/tracker";
import { createBanner, updateBanner } from "@/ui/banner";
import { openSettings } from "@/ui/settings";

/**
 * 完整编排：nyaa 链接 → magnet → CD2 离线任务 → 状态跟踪。
 * @param label banner 中展示的短名称（如动漫名或规格名）
 */
export async function addToCloud(nyaaUrl: string, label: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg.grpcBaseUrl || !cfg.apiToken || !cfg.offlineDestPath) {
    createBanner("请先完成 CloudDrive2 配置（地址 / API Token / 离线目标目录）", "error");
    openSettings();
    return;
  }

  const id = createBanner(`${label} 解析磁力中…`, "progress");
  try {
    const { magnet, infoHash } = await fetchMagnet(nyaaUrl);
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
