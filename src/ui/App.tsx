import { useCallback, useState } from "react";
import "./App.css";
import { Spin } from "antd";

import UploadLog from "./page/upload-log";
import { AnalyzedResult } from "../worker/read-log/types";
import LogResult from "./page/log-result";

function App() {
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<string>("UploadLog");
  const [logResult, setLogResult] = useState<AnalyzedResult>({
    startTime: "",
    endTime: "",
    logList: [],
    tagList: [],
    skillMap: new Map(),
    damageSourceMap: new Map(),
  });

  const updateLogResult = useCallback(
    ({
      startTime,
      endTime,
      logList,
      tagList,
      skillMap,
      damageSourceMap,
    }: Partial<AnalyzedResult>) => {
      setLogResult({
        startTime: startTime || logResult.startTime,
        endTime: endTime || logResult.endTime,
        logList: logList || logResult.logList,
        tagList: tagList || logResult.tagList,
        skillMap: skillMap || logResult.skillMap,
        damageSourceMap: damageSourceMap || logResult.damageSourceMap,
      });
    },
    [logResult, setLogResult]
  );

  return (
    <Spin spinning={pageLoading} description="数据处理中...">
      {currentPage === "UploadLog" && (
        <UploadLog
          setPageLoading={setPageLoading}
          setCurrentPage={setCurrentPage}
          updateLogResult={updateLogResult}
        />
      )}

      {currentPage === "LogResult" && <LogResult {...logResult} />}
    </Spin>
  );
}

export default App;
