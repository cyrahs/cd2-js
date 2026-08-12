# CloudDrive2 · VCB-Studio 一键离线

Tampermonkey 脚本：在 [VCB-Studio](https://vcb-s.com/) 页面一键把项目种子添加到 [CloudDrive2](https://www.clouddrive2.com/) 离线下载任务，并在右上角实时跟踪任务状态。

## 功能

- **详情页**：每个下载块（规格）注入「添加到 CD2 离线」按钮
- **主页 / 列表页**：每张发布帖卡片注入按钮，自动选择最高规格（分辨率 > HEVC > 10-bit）
- 磁力链接默认从帖子里的 nyaa.si 链接解析
- 右上角 banner 状态流转：解析磁力 → 提交任务 → 添加成功 → 跟踪下载(n/N) → 下载成功 / 下载失败
- 设置面板（Tampermonkey 菜单 →「CloudDrive2 设置」）：CD2 地址、API Token、离线目标目录、轮询参数，支持一键测试连接

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 从 [GitHub Releases](https://github.com/cyrahs/cd2-js/releases/latest/download/cd2-js.user.js) 安装脚本（或从 GreasyFork 安装）

## 配置

1. 打开 vcb-s.com，点击 Tampermonkey 菜单中的「CloudDrive2 设置」
2. 填写 CD2 地址（默认 `http://localhost:19798`）、API Token（CD2 管理界面生成）、离线目标目录（云盘内路径，如 `/115/离线`，目录所在云盘需支持离线下载）
3. 点「测试连接」确认后保存

## 开发

```bash
pnpm install
pnpm dev        # 开发模式，Tampermonkey 安装调试脚本
pnpm build      # 打包到 dist/cd2-js.user.js
pnpm typecheck  # 类型检查
pnpm gen        # 从 src/proto/clouddrive.proto 重新生成 pb 代码
```

技术要点：CD2 的 gRPC 服务在 Web 端口同时支持 grpc-web，脚本通过 `@connectrpc/connect-web` 直连，并用 `GM_xmlhttpRequest` 实现的 fetch shim 绕过页面 CSP/CORS 限制。

## 致谢

- gmFetch 与 proto 定义改编自 [sqzw-x/clouddrive2-offline](https://github.com/sqzw-x/clouddrive2-offline)（MIT）
- [CloudDrive2 gRPC API 开发者指南](https://www.clouddrive2.com/api/CloudDrive2_gRPC_API_Guide.html)

## License

MIT
