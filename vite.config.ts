import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

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
        name: "CloudDrive2 · VCB-Studio 一键离线",
        namespace: "https://github.com/cd2-vcbs-offline",
        description: "在 VCB-Studio 项目页一键把种子添加到 CloudDrive2 离线下载并检查任务状态",
        match: ["https://vcb-s.com/*"],
        // CD2 服务地址由用户配置（可能是 localhost 或局域网 IP），故放开 connect
        connect: ["*"],
      },
    }),
  ],
});
