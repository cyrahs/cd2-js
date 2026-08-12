// 基于 GM_xmlhttpRequest 的 fetch shim，用于绕过页面 CSP/CORS 限制。
// 改编自 sqzw-x/clouddrive2-offline (MIT License)。
// 仅覆盖 @connectrpc/connect-web 用到的子集（method/headers/body/arraybuffer 响应）。
import { GM_xmlhttpRequest } from "vite-plugin-monkey/dist/client";

export async function gmFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const GMX: typeof GM_xmlhttpRequest | undefined =
    typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : undefined;

  if (!GMX) {
    return fetch(input as RequestInfo, init);
  }

  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const method =
    init.method ?? (typeof input === "object" && "method" in (input as Request) ? (input as Request).method : "GET");

  const headersRecord: Record<string, string> = {};
  const pushHeader = (k: string, v: string) => {
    headersRecord[k] = v;
  };
  if (init.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => {
        pushHeader(k, v);
      });
    } else if (Array.isArray(init.headers)) {
      for (const [k, v] of init.headers) pushHeader(k, v);
    } else {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) pushHeader(k, v);
    }
  } else if (typeof input === "object" && input instanceof Request) {
    input.headers.forEach((v, k) => {
      pushHeader(k, v);
    });
  }

  let data: string | ArrayBuffer | undefined;
  const body =
    init.body ?? (typeof input === "object" && input instanceof Request ? (input as Request).body : undefined);
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    data = merged.buffer;
  } else if (body instanceof ArrayBuffer) {
    data = body;
  } else if (body instanceof Uint8Array) {
    const ab = new ArrayBuffer(body.byteLength);
    new Uint8Array(ab).set(body);
    data = ab;
  } else if (body instanceof Blob) {
    data = await body.arrayBuffer();
  } else if (typeof body === "string") {
    data = body;
  } else if (body == null) {
    data = undefined;
  } else {
    data = String(body as unknown as object);
  }

  return await new Promise((resolve, reject) => {
    try {
      const mUpper = (method || "GET").toUpperCase() as Exclude<Tampermonkey.Request<unknown>["method"], undefined>;
      GMX({
        url,
        method: mUpper,
        headers: headersRecord,
        // grpc-web 响应帧是二进制，必须用 arraybuffer
        responseType: "arraybuffer",
        data,
        onload: (ev) => {
          const status = ev.status ?? 0;
          const statusText = ev.statusText ?? "";
          const headers = new Headers();
          if (ev.responseHeaders) {
            const lines = ev.responseHeaders.split(/\r?\n/);
            for (const line of lines) {
              const idx = line.indexOf(":");
              if (idx > 0) {
                const k = line.slice(0, idx).trim();
                const v = line.slice(idx + 1).trim();
                if (k) headers.append(k, v);
              }
            }
          }
          const ab = (ev.response as ArrayBuffer) ?? new ArrayBuffer(0);
          resolve(new Response(ab, { status, statusText, headers }));
        },
        onerror: () => reject(new TypeError("Network request failed (GM)")),
        ontimeout: () => reject(new TypeError("Network request timeout (GM)")),
      });
    } catch (e) {
      reject(e);
    }
  });
}

export default gmFetch;
