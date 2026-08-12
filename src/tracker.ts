import { getConfig } from "@/config";
import { listAllOfflineFiles } from "@/grpc/client";
import { type OfflineFile, OfflineFileStatus } from "@/proto/clouddrive_pb";
import { type BannerAction, updateBanner } from "@/ui/banner";

const MAX_PAGES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 在离线任务列表中按 infohash 找任务（最多翻 MAX_PAGES 页） */
async function findTask(infoHash: string): Promise<OfflineFile | null> {
  const want = infoHash.toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await listAllOfflineFiles(page);
    const hit = res.offlineFiles.find((f) => f.infoHash.toLowerCase() === want);
    if (hit) return hit;
    if (page >= res.pageCount) break;
  }
  return null;
}

function retryAction(infoHash: string, bannerId: number, label: string): BannerAction {
  return { label: "重试检查", onClick: () => void checkOnce(infoHash, bannerId, label) };
}

/** 手动单次检查：点一次查一次，除下载成功外都保留「重试检查」按钮 */
async function checkOnce(infoHash: string, bannerId: number, label: string): Promise<void> {
  const retry = retryAction(infoHash, bannerId, label);
  updateBanner(bannerId, `${label} 检查中…`, "progress");

  let task: OfflineFile | null;
  try {
    task = await findTask(infoHash);
  } catch (e) {
    updateBanner(bannerId, `${label} 检查失败: ${e instanceof Error ? e.message : String(e)}`, "error", retry);
    return;
  }

  if (!task) {
    updateBanner(bannerId, `${label} 任务列表中未找到`, "error", retry);
    return;
  }

  switch (task.status) {
    case OfflineFileStatus.OFFLINE_FINISHED:
      updateBanner(bannerId, `${label} 下载成功`, "success");
      return;
    case OfflineFileStatus.OFFLINE_ERROR:
      updateBanner(bannerId, `${label} 下载失败`, "error", retry);
      return;
    default:
      updateBanner(bannerId, `${label} 下载中 ${Math.round(task.percendDone)}%`, "info", retry);
  }
}

/**
 * 轮询跟踪离线任务状态，持续更新 banner：
 * 跟踪下载(n/N) x% → 下载成功 / 下载失败；次数用尽仍未终态则提示后停止。
 * 失败终态常驻并带「重试检查」按钮。
 */
export async function trackTask(infoHash: string, bannerId: number, label: string): Promise<void> {
  const cfg = getConfig();
  const total = cfg.pollMaxChecks;
  let lastPercent = 0;
  let lastError: string | null = null;

  for (let n = 1; n <= total; n++) {
    await sleep(cfg.pollIntervalSecs * 1000);
    let task: OfflineFile | null;
    try {
      task = await findTask(infoHash);
      lastError = null;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      updateBanner(bannerId, `${label} 跟踪出错(${n}/${total}): ${lastError}`, "progress");
      continue;
    }

    if (!task) {
      updateBanner(bannerId, `${label} 跟踪下载(${n}/${total}) 任务列表中暂未找到`, "progress");
      continue;
    }

    lastPercent = Math.round(task.percendDone);
    switch (task.status) {
      case OfflineFileStatus.OFFLINE_FINISHED:
        updateBanner(bannerId, `${label} 下载成功`, "success");
        return;
      case OfflineFileStatus.OFFLINE_ERROR:
        updateBanner(bannerId, `${label} 下载失败`, "error", retryAction(infoHash, bannerId, label));
        return;
      default:
        updateBanner(bannerId, `${label} 跟踪下载(${n}/${total}) ${lastPercent}%`, "progress");
    }
  }

  const retry = retryAction(infoHash, bannerId, label);
  if (lastError !== null) {
    updateBanner(bannerId, `${label} 检查失败: ${lastError}`, "error", retry);
  } else {
    updateBanner(bannerId, `${label} 跟踪结束，任务仍在进行 ${lastPercent}%`, "info", retry);
  }
}
