# cd2-js

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

## bangumi.moe 页面结构（2026-08 实测）

- Angular 1 + Angular Material SPA，DOM 动态渲染，注入靠 MutationObserver（`src/bangumi/page.ts`）
- 列表行（主页/搜索页 `/search/<tagId>` 通用）：`md-item.torrent-row`，标题在 `.torrent-title h3`（span 标题文本 + `small > a[href="/torrent/<24位mongoId>"]` 外链）；行内两处 ng-click（标题开弹窗 / 头像下载种子），注入按钮点击必须 stopPropagation
- 详情弹窗：`md-dialog.torrent-details-dialog`，头部 `a.title-link` 指向 `/torrent/<id>`，底部 `.md-actions` 依次为种子下载 button 与 `a[href^="magnet:"]`（含全部 tracker，可直取提交，零请求）；直接打开 `/torrent/<id>` URL 也会弹此弹窗
- 列表 `ng-repeat ... track by $index`：换搜索条件时 Angular 原地复用行 DOM 重绑数据，注入按钮的链接/标题必须点击时从 DOM 现取（注入的元素不在绑定节点内，可跨重绑存活）；分页是「Load more」追加，索引稳定
- 直接以 `/search/<tagId>` 为入口整页加载时站点自身偶发引导崩溃（intro 代码 `setting 'steps'` 报错，模板不编译）——站点固有 bug，与脚本无关；此时无行可注入，脚本静默无副作用

## 参考项目（克隆在 scratchpad，勿依赖其长期存在）

- [sqzw-x/clouddrive2-offline](https://github.com/sqzw-x/clouddrive2-offline)（MIT）：同类 userscript（通用磁力嗅探→CD2），本项目的 gmFetch、proto、grpc 调用方式源于它；它用 React+antd，本项目刻意保持 vanilla TS
- [DDSRem-Dev/clouddrive2-client](https://github.com/DDSRem-Dev/clouddrive2-client)：CD2 Python 客户端，可交叉验证 API 用法
- 官方还有浏览器扩展「CloudDrive助手」可参考交互设计

## 设计决定

- 脚本配置（GM storage，`src/config.ts`）：CD2 地址、API token、离线目标目录、checkFolderAfterSecs
- 不用 React/UI 框架，第一个功能只需按钮 + 状态提示
- `src/proto/clouddrive_pb.ts` 是生成代码（~320KB），已提交以免每次装 buf；proto 升级时用 `pnpm gen` 重新生成

## 模块结构（第一个功能已实现）

- `src/main.ts`：入口路由（hostname 分流：bangumi.moe → `bangumi/page.ts`；vcb-s.com 按路径分详情/列表页）。vcb 按钮统一做成标签样式（`span.label.label-zan` + FA4 `fa-cloud-download`），注入标签栏（桌面 `.hidden-xs .tag-article`；移动端无标签栏，注入 `.visible-xs` 带 fa-calendar 的日期 `<p>`）。`/archives/*` → 每个 dw-box 一个标签按钮（带规格名）；其他页（主页/列表）→ 每张 BDRip 卡片一个「CD2 离线」标签，点击后后台 fetch 详情页选最高规格
- `src/bangumi/page.ts`：bangumi.moe 注入（结构见上节）。列表行标题后挂紫色 `#9575cd` 小 chip「CD2」；弹窗 `.md-actions` 里仿原生 `md-button` 插「CD2 离线」（优先直取弹窗 magnet → 兜底 torrent id 走 API）；banner 标题截断 40 字
- `src/flow.ts`：编排 发布站链接 → resolveMagnet → AddOfflineFiles → 跟踪；`addMagnetToCloud` 供已有现成磁力时跳过解析；配置缺失时弹设置面板
- `src/sites/`：磁力来源。`resolve.ts` 按优先级依次尝试并在失败时兜底（nyaa 优先，用户确认 → bangumi.moe）；`nyaa.ts` 抓详情页 HTML 解析 magnet；`bangumi.ts` 走 JSON API（`POST /api/torrent/fetch {_id}` 返回 magnet+infoHash，种子页是 SPA 抓不到 HTML）；`magnet.ts` magnet→infohash 解析；`types.ts` 共享 `MagnetInfo`/`SiteLink`
- `src/tracker.ts`：轮询 ListAllOfflineFiles 按 infohash 匹配，banner 显示「跟踪下载(n/N) x%」→ 下载成功/失败；N=轮询次数上限（用户确认语义）
- `src/ui/banner.ts`：右上角 banner 栈，success 8s 自动消失；error 常驻需手动关闭，支持内嵌操作按钮（tracker 的失败终态带「重试检查」，点一次单查一次）
- `src/ui/settings.ts`：GM_registerMenuCommand「CloudDrive2 设置」→ 页内模态框，含 GetSystemInfo 测试连接
- `src/vcb/extract.ts`：dw-box / 主页卡片解析、`findTagRows` 标签栏注入点、`pickBestBox` 规格评分（分辨率 > HEVC > 10-bit）

## 验证手段

- 本地 smoke test：scratchpad/smoke/ 有复刻真实 DOM 的 fixture（主页卡片 + 详情页 dw-box + 真实 nyaa.html 快照 + GM stubs），`python3 -m http.server` 起服即可在浏览器中全流程测试（CD2 调用以连接错误告终，属预期错误路径）。真实 vcb-s.com / bangumi.moe 页面无法直接注入本地脚本（Chrome PNA 拦截 HTTPS→127.0.0.1，`<script src>` 也被拦）
- bangumi.moe 可在真实页面验证：用临时 vite 配置把 `@/grpc/client`、`@/proto/clouddrive_pb` alias 到测试桩打一个小体积 IIFE（~27KB），配合 GM stubs 直接在 console eval（2026-08 全流程验证过：列表/弹窗注入、SPA 路由、行复用取数、API 解析、tracker 成功路径）
- 端到端需真实 CD2 实例：`pnpm dev` 装进 Tampermonkey 测试

## 发布流程

直接 push 到 main 即发布，无手动 tag、无手动版本号，release 是过了 CI gate 的唯一出口：

- `@version` 由 vite.config.ts 的 `buildVersion()` 自动生成（`0.1.<git 提交数>`，CI checkout 需 fetch-depth: 0）
- CI（typecheck + build）通过后，workflow 先把产物提交到仓库根目录 `cd2-js.user.js`（**必须**：GreasyFork webhook 同步走 git 按 tag 树读文件，不下载 release 资产；HTTP 拉资产只用于每日检查/手动同步），再对该提交打 tag 发 release；与已提交产物仅 @version 行不同时跳过。GITHUB_TOKEN 的推送/建 release 不会再触发工作流
- GitHub webhook（release 事件，指向 api.greasyfork.org/…/users/903585…/webhook，secret 用户自配）通知 GreasyFork 即时拉取
- GreasyFork 同步源：`https://github.com/cyrahs/cd2-js/releases/latest/download/cd2-js.user.js`（release 事件只匹配 `releases/latest/download/` 前缀或默认分支 raw 地址，见 greasyfork 源码 lib/github.rb）

## 待办 / 下一步

1. 端到端验证（需用户的真实 CD2 实例 + Tampermonkey）
2. 可选：nyaa 不可达时的兜底（acgnx URL 自带 infohash，extract.ts 已解析但未接入流程）
3. 可选：多规格帖子的批量添加、离线任务面板
