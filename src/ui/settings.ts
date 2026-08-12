import { GM_registerMenuCommand } from "vite-plugin-monkey/dist/client";
import { type AppConfig, getConfig, setConfig } from "@/config";
import { getSystemInfo } from "@/grpc/client";

/** 注册 Tampermonkey 菜单入口 */
export function registerSettingsMenu(): void {
  GM_registerMenuCommand("CloudDrive2 设置", openSettings);
}

const OVERLAY_ID = "cd2-vcbs-settings-overlay";

type Field = {
  key: keyof AppConfig;
  label: string;
  type: "text" | "password" | "number";
  placeholder?: string;
};

const FIELDS: Field[] = [
  { key: "grpcBaseUrl", label: "CD2 地址", type: "text", placeholder: "http://localhost:19798" },
  { key: "apiToken", label: "API Token", type: "password", placeholder: "CD2 管理界面生成的 API Token" },
  { key: "offlineDestPath", label: "离线目标目录", type: "text", placeholder: "/115/离线" },
  { key: "checkFolderAfterSecs", label: "N 秒后检查目录 (0=不检查)", type: "number" },
  { key: "pollIntervalSecs", label: "跟踪轮询间隔 (秒)", type: "number" },
  { key: "pollMaxChecks", label: "跟踪轮询次数上限", type: "number" },
];

export function openSettings(): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const cfg = getConfig();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;";

  const panel = document.createElement("div");
  panel.style.cssText =
    "background:#fff;color:#333;border-radius:8px;padding:20px 24px;width:420px;max-width:92vw;" +
    "font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,.4);";

  const title = document.createElement("div");
  title.textContent = "CloudDrive2 设置";
  title.style.cssText = "font-size:16px;font-weight:600;margin-bottom:14px;";
  panel.appendChild(title);

  const inputs = new Map<keyof AppConfig, HTMLInputElement>();
  for (const f of FIELDS) {
    const row = document.createElement("label");
    row.style.cssText = "display:block;margin-bottom:10px;";
    const span = document.createElement("span");
    span.textContent = f.label;
    span.style.cssText = "display:block;margin-bottom:3px;color:#666;font-size:13px;";
    const input = document.createElement("input");
    input.type = f.type;
    input.value = String(cfg[f.key] ?? "");
    input.placeholder = f.placeholder ?? "";
    input.style.cssText =
      "width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:14px;background:#fff;color:#333;";
    row.append(span, input);
    panel.appendChild(row);
    inputs.set(f.key, input);
  }

  const status = document.createElement("div");
  status.style.cssText = "min-height:20px;margin:6px 0 12px;font-size:13px;color:#666;";
  panel.appendChild(status);

  const collect = (): AppConfig => {
    const read = (k: keyof AppConfig) => inputs.get(k)?.value.trim() ?? "";
    return {
      grpcBaseUrl: read("grpcBaseUrl").replace(/\/+$/, ""),
      apiToken: read("apiToken"),
      offlineDestPath: read("offlineDestPath"),
      checkFolderAfterSecs: Math.max(0, Number(read("checkFolderAfterSecs")) || 0),
      pollIntervalSecs: Math.max(3, Number(read("pollIntervalSecs")) || 10),
      pollMaxChecks: Math.max(1, Number(read("pollMaxChecks")) || 5),
    };
  };

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

  const mkBtn = (text: string, primary: boolean) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText =
      "padding:6px 14px;border-radius:4px;font-size:14px;cursor:pointer;border:1px solid " +
      (primary ? "#1565c0;background:#1565c0;color:#fff;" : "#ccc;background:#f5f5f5;color:#333;");
    return b;
  };

  const testBtn = mkBtn("测试连接", false);
  testBtn.addEventListener("click", async () => {
    setConfig(collect());
    status.textContent = "连接中…";
    status.style.color = "#666";
    try {
      const info = await getSystemInfo();
      status.textContent = `连接成功：${info.IsLogin ? `已登录 ${info.UserName}` : "CD2 未登录账号"}${info.SystemReady ? "" : "（系统未就绪）"}`;
      status.style.color = "#2e7d32";
    } catch (e) {
      status.textContent = `连接失败: ${e instanceof Error ? e.message : String(e)}`;
      status.style.color = "#c62828";
    }
  });

  const saveBtn = mkBtn("保存", true);
  saveBtn.addEventListener("click", () => {
    setConfig(collect());
    overlay.remove();
  });

  const closeBtn = mkBtn("关闭", false);
  closeBtn.addEventListener("click", () => overlay.remove());

  btnRow.append(testBtn, closeBtn, saveBtn);
  panel.appendChild(btnRow);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}
