import { extractDwBoxes } from "@/vcb/extract";

// 入口骨架：验证页面解析可用。按钮注入与 CD2 提交逻辑在下一步实现。
function main() {
  const boxes = extractDwBoxes();
  if (boxes.length === 0) return;
  console.log(
    "[cd2-vcbs] 解析到下载区块:",
    boxes.map((b) => ({ title: b.title, infoHash: b.infoHash, links: b.links.length })),
  );
}

main();
