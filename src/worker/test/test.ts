// src/workers/log.worker.ts
import { bosses } from "./constant";

// 监听主线程消息
self.onmessage = (e: MessageEvent<string>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any = e.data;
  if (content.type === "logAnalyze") {
    self.postMessage({
      type: "PARSE_RESULT",
      count: bosses,
      data: bosses,
    });
  }
};

export {}; // 确保被视为模块
