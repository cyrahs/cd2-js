import { create } from "@bufbuild/protobuf";
import { EmptySchema } from "@bufbuild/protobuf/wkt";
import { type Client, createClient, type Interceptor } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { getConfig } from "@/config";
import {
  AddOfflineFileRequestSchema,
  type CloudDriveFile,
  CloudDriveFileSrv,
  type CloudDriveSystemInfo,
  type FileOperationResult,
  FindFileByPathRequestSchema,
  OfflineFileListAllRequestSchema,
  type OfflineFileListAllResult,
} from "@/proto/clouddrive_pb";

function getClient(): Client<typeof CloudDriveFileSrv> {
  const cfg = getConfig();
  const authInterceptor: Interceptor = (next) => async (req) => {
    const token = cfg.apiToken;
    if (token) {
      req.header.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
    }
    return await next(req);
  };

  const transport = createGrpcWebTransport({
    baseUrl: cfg.grpcBaseUrl,
    interceptors: [authInterceptor],
    fetch: (input, init) => gmFetchLazy(input, init),
  });

  return createClient(CloudDriveFileSrv, transport);
}

// 延迟 import 避免循环依赖问题
async function gmFetchLazy(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { gmFetch } = await import("./gmFetch");
  return gmFetch(input, init);
}

/** 连通性测试：读取 CD2 系统信息（无需认证） */
export async function getSystemInfo(): Promise<CloudDriveSystemInfo> {
  return await getClient().getSystemInfo(create(EmptySchema, {}));
}

/**
 * 提交离线下载任务
 * @param urls 磁力/ed2k 链接，多个用换行分隔
 * @param toFolder 目标目录（云盘内路径）；缺省用配置里的 offlineDestPath
 */
export async function addOfflineFiles(urls: string, toFolder?: string): Promise<FileOperationResult> {
  const cfg = getConfig();
  const req = create(AddOfflineFileRequestSchema, {
    urls,
    toFolder: toFolder || cfg.offlineDestPath,
    checkFolderAfterSecs: BigInt(cfg.checkFolderAfterSecs),
  });
  return await getClient().addOfflineFiles(req);
}

/** 按路径查文件/目录（用于解析目标目录所属云盘） */
export async function findFileByPath(parentPath: string): Promise<CloudDriveFile> {
  return await getClient().findFileByPath(create(FindFileByPathRequestSchema, { parentPath, path: "." }));
}

/** 列出云盘的全部离线任务（分页），用于检查任务状态 */
export async function listAllOfflineFiles(page = 1, pathOverride?: string): Promise<OfflineFileListAllResult> {
  const cfg = getConfig();
  const folderPath = pathOverride ?? cfg.offlineDestPath;
  const file = await findFileByPath(folderPath);
  const api = file.CloudAPI;
  if (!api) {
    throw new Error(`无法获取 ${folderPath} 所属云盘信息，请检查“离线下载路径”配置`);
  }
  const req = create(OfflineFileListAllRequestSchema, {
    cloudName: api.name,
    cloudAccountId: api.userName,
    page,
    path: folderPath,
  });
  return await getClient().listAllOfflineFiles(req);
}
