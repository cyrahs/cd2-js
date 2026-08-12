import { GM_getValue, GM_setValue } from "vite-plugin-monkey/dist/client";

export type AppConfig = {
  /** CloudDrive2 服务地址，如 http://localhost:19798 */
  grpcBaseUrl: string;
  /** CD2 API Token（管理界面生成）或 JWT */
  apiToken: string;
  /** 离线下载目标目录（云盘内路径），如 /115/离线 */
  offlineDestPath: string;
  /** AddOfflineFiles 的 checkFolderAfterSecs：N 秒后自动检查目标目录，0 表示不检查 */
  checkFolderAfterSecs: number;
};

const KEY = "cd2_vcbs_config_v1";

const DEFAULTS: AppConfig = {
  grpcBaseUrl: "http://localhost:19798",
  apiToken: "",
  offlineDestPath: "",
  checkFolderAfterSecs: 15,
};

export function getConfig(): AppConfig {
  const v = GM_getValue<AppConfig | null>(KEY, null);
  if (v && typeof v === "object") return { ...DEFAULTS, ...v };
  return { ...DEFAULTS };
}

export function setConfig(cfg: AppConfig) {
  GM_setValue(KEY, cfg);
}
