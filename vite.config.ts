import { execSync } from "node:child_process";
import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// 版本号自动生成：0.1.<git 提交数>，随每次提交递增，无需手动维护
function buildVersion(): string {
  try {
    const count = execSync("git rev-list --count HEAD").toString().trim();
    return `0.1.${count}`;
  } catch {
    return "0.1.0";
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    minify: false,
  },
  plugins: [
    monkey({
      entry: "src/main.ts",
      userscript: {
        name: "CloudDrive2助手",
        version: buildVersion(),
        namespace: "https://github.com/cyrahs/cd2-js",
        description: "CloudDrive2 网页助手：目前支持 VCB-Studio 项目一键添加离线下载并跟踪任务状态",
        author: "cyrahs",
        homepageURL: "https://github.com/cyrahs/cd2-js",
        supportURL: "https://github.com/cyrahs/cd2-js/issues",
        match: ["https://vcb-s.com/*"],
        // CD2 服务地址由用户配置（可能是 localhost 或局域网 IP），故放开 connect
        connect: ["*"],
      },
    }),
  ],
});
