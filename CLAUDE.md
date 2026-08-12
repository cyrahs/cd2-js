# cd2-vcbs-offline

Tampermonkey 脚本：在 VCB-Studio 项目页一键把种子添加到 CloudDrive2 (CD2) 离线下载任务并检查状态。

## 技术栈与命令

- TypeScript + Vite + vite-plugin-monkey（构建产物为 `dist/*.user.js`）
- gRPC-web：`@connectrpc/connect-web` + `@bufbuild/protobuf`
- 包管理：pnpm
- `pnpm dev` 开发（vite-plugin-monkey 会给出安装链接）；`pnpm build` 打包；`pnpm typecheck` 类型检查
- `pnpm gen` 从 `src/proto/clouddrive.proto` 重新生成 `clouddrive_pb.ts`（需要网络，用 buf 远程插件）

## CloudDrive2 API 要点

- CD2 唯一 API 是 **gRPC**（服务 `clouddrive.CloudDriveFileSrv`），Web 端口（默认 **19798**）同时支持 **grpc-web**，浏览器可直连。官方文档：https://www.clouddrive2.com/api/CloudDrive2_gRPC_API_Guide.html（JS 渲染页，抓取需真浏览器）
- proto 定义：`src/proto/clouddrive.proto`（取自 sqzw-x/clouddrive2-offline，与 DDSRem-Dev/clouddrive2-client 一致）
- 认证：请求头 `Authorization: Bearer <token>`。token 可为 CD2 界面生成的 API Token，或 `GetToken(userName, password)` 返回的 JWT。`GetSystemInfo` 无需认证，可做连通性测试
- 离线下载相关 RPC：
  - `AddOfflineFiles(AddOfflineFileRequest{urls, toFolder, checkFolderAfterSecs}) → FileOperationResult{success, errorMessage}`
    - `urls`：磁力/ed2k 等，多条用换行分隔；`toFolder` 是云盘内路径（目录需 `canOfflineDownload`）
    - `checkFolderAfterSecs`：CD2 在 N 秒后自动检查目标目录 —— 对应"添加并检查"需求
  - `ListAllOfflineFiles(OfflineFileListAllRequest{cloudName, cloudAccountId, page, path}) → OfflineFileListAllResult`（含 `OfflineFile{name, size, status, infoHash, percendDone, peers}`，status 枚举 INIT/DOWNLOADING/FINISHED/ERROR/UNKNOWN）
    - `cloudName`/`cloudAccountId` 通过 `FindFileByPath(目标路径)` 返回的 `CloudAPI{name, userName}` 获得
  - 另有 `RemoveOfflineFiles`、`GetOfflineQuotaInfo`、`RestartOfflineTask`、`ClearOfflineFiles`
- 浏览器脚本调用方式：`createGrpcWebTransport({ baseUrl, fetch: gmFetch })`，其中 `gmFetch`（`src/grpc/gmFetch.ts`）用 `GM_xmlhttpRequest` 实现 fetch 接口，绕过 vcb-s.com 的 CSP 和跨域限制。需要 `@grant GM_xmlhttpRequest` + `@connect *`（由 vite.config.ts 的 monkey 配置生成）

## VCB-Studio 页面结构（2026-08 实测）

- 项目页 URL：`https://vcb-s.com/archives/<id>`；站点有 Cloudflare 盾，服务端抓取会 403，但用户浏览器内的 userscript 不受影响
- 下载链接在 `div.dw-box.dw-box-download` 内（可能多个：不同规格/分批 Reseed），首个文本节点是版本名（如 "10-bit 1080p HEVC"），随后每个 `<p><a>` 是发布站链接：bangumi.moe / share.acgnx.se / www.acgnx.se / acg.rip / share.dmhy.org / nyaa.si
- **关键**：acgnx 链接形如 `https://share.acgnx.se/show-<40位sha1>.html`，URL 中直接携带 infohash → 可本地拼出 `magnet:?xt=urn:btih:<hash>`，无需请求任何外站
- 兜底方案（帖子无 acgnx 链接时）：GM_xmlhttpRequest 抓 nyaa.si 详情页解析 magnet，或 acg.rip 的 `/t/<id>.torrent`
- 页面帖子内容无直接 magnet 链接，解析逻辑在 `src/vcb/extract.ts`

## 参考项目（克隆在 scratchpad，勿依赖其长期存在）

- [sqzw-x/clouddrive2-offline](https://github.com/sqzw-x/clouddrive2-offline)（MIT）：同类 userscript（通用磁力嗅探→CD2），本项目的 gmFetch、proto、grpc 调用方式源于它；它用 React+antd，本项目刻意保持 vanilla TS
- [DDSRem-Dev/clouddrive2-client](https://github.com/DDSRem-Dev/clouddrive2-client)：CD2 Python 客户端，可交叉验证 API 用法
- 官方还有浏览器扩展「CloudDrive助手」可参考交互设计

## 设计决定

- 脚本配置（GM storage，`src/config.ts`）：CD2 地址、API token、离线目标目录、checkFolderAfterSecs
- 不用 React/UI 框架，第一个功能只需按钮 + 状态提示
- `src/proto/clouddrive_pb.ts` 是生成代码（~320KB），已提交以免每次装 buf；proto 升级时用 `pnpm gen` 重新生成

## 待办 / 下一步

1. main.ts：在每个 dw-box 注入「添加到 CD2 离线」按钮（无 infohash 时走兜底解析）
2. 提交后轮询 `ListAllOfflineFiles` 按 infoHash 匹配任务，展示状态（进度/完成/失败）
3. 配置面板（GM_registerMenuCommand 打开）：地址/token/目标路径，附 GetSystemInfo 连通性测试
4. 可选：多规格帖子的批量添加、Reseed 帖处理
