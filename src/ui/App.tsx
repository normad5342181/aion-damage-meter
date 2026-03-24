import { useCallback, useState } from "react";
import "./App.css";
import { Spin, UploadFile } from "antd";

import UploadLog from "./page/upload-log";
import { AnalyzedResult } from "../worker/read-log/types";
import LogResult from "./page/log-result";

function App() {
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<string>("UploadLog");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
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
        tagList: tagList || logResult.tagList,
        logList: logList || logResult.logList,
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
          fileList={fileList}
          setFileList={setFileList}
        />
      )}

      {currentPage === "LogResult" && (
        <LogResult
          {...logResult}
          setPageLoading={setPageLoading}
          setCurrentPage={setCurrentPage}
          file={fileList[0].originFileObj!}
          updateLogResult={updateLogResult}
        />
      )}
    </Spin>
  );
}

export default App;
