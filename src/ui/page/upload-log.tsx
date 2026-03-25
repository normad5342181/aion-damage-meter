import { memo, useEffect, useRef } from "react";
import { Button, message, Upload, UploadFile, UploadProps } from "antd";
import { AnalyzedResult } from "../../worker/read-log/types";
const { Dragger } = Upload;

interface UploadLogProps {
  setPageLoading: (loading: boolean) => void;
  setCurrentPage: (page: string) => void;
  updateLogResult: (data: Partial<AnalyzedResult>) => void;
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;
}

function UploadLog({
  setPageLoading,
  setCurrentPage,
  updateLogResult,
  fileList,
  setFileList,
}: UploadLogProps) {
  // 数据处理进程
  const processRef = useRef<Worker>();

  useEffect(() => {
    processRef.current = new Worker(
      new URL("../../worker/read-log/readLog.ts", import.meta.url),
      {
        type: "module",
      }
    );
    processRef.current.onmessage = (res) => {
      if (res.data.type === "tag-result") {
        message.success("日志初步解析完成");
        setPageLoading(false);
        setCurrentPage("LogResult");

        const resData: AnalyzedResult = res.data.data;
        updateLogResult(resData);
      }
    };

    processRef.current.onerror = (res) => {
      setPageLoading(false);
      message.error("日志解析进程出错:" + res);
    };

    return () => {
      if (processRef.current) {
        processRef.current.terminate();
        processRef.current = undefined;
      }
    };
  }, [setPageLoading, setCurrentPage, updateLogResult]);

  const props: UploadProps = {
    name: "file",
    accept: ".log",
    multiple: false,
    maxCount: 1,
    fileList,
    beforeUpload() {
      return false;
    },
    onChange(info) {
      const newFileList = [...info.fileList];

      if (newFileList.length > 1) {
        message.warning("最多只能上传一个文件");
        return;
      }

      if ((newFileList[0]?.originFileObj?.size ?? 0) > 100 * 1024 * 1024) {
        message.warning("文件大小不能超过100MB");
        return;
      }

      newFileList[0].status = "done";

      setFileList(newFileList);
    },
    onRemove() {
      setFileList([]);
    },
  };

  const handleAnalyze = () => {
    setPageLoading(true);
    if (processRef.current) {
      processRef.current.postMessage({
        id: new Date().getTime(),
        type: "logAnalyze",
        file: fileList[0].originFileObj,
        dateTimeRange: null,
      });
    }
  };

  return (
    <div style={{ height: "calc(100% - 120px)", width: "100%" }}>
      <Dragger {...props}>
        <p
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
          className="ant-upload-text"
        >
          点击或拖拽日志文件到此区域
        </p>
      </Dragger>

      <div style={{ marginTop: 30 }}>
        <Button
          type="primary"
          disabled={fileList.length === 0}
          onClick={handleAnalyze}
        >
          开始解析
        </Button>
      </div>
    </div>
  );
}

export default memo(UploadLog);
