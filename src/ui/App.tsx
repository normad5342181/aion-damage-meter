import { useEffect, useRef, useState } from "react";
import "./App.css";
import { Button, message, Spin, Upload, UploadFile, UploadProps } from "antd";
import { AnalyzedResult } from "../worker/read-log/types";
import { DamageMeter } from "./types";
// import ReadLogWorkerScript from "../worker/read-log/readLog";
const { Dragger } = Upload;

function App() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  // 数据处理进程
  const processRef = useRef<Worker>();

  useEffect(() => {
    processRef.current = new Worker(
      new URL("../worker/read-log/readLog.ts", import.meta.url),
      {
        type: "module",
      },
    );
    processRef.current.onmessage = (res) => {
      if (res.data.type === "log-result") {
        message.success("日志初步解析完成");

        const resData: AnalyzedResult = res.data.data;

        const damageObject: Record<string, DamageMeter> = {};
        for (let index = 0; index < resData.logList.length; index++) {
          const log = resData.logList[index];
          if (log.damageDetail) {
            const damageDetail = log.damageDetail;
            const source = damageDetail.sourceName;
            // 已有的伤害来源
            if (damageObject[source]) {
              damageObject[source].damageSummary.count += damageDetail.damage;
            } else {
              damageObject[source] = {
                damageSummary: {
                  count: damageDetail.damage,
                },
              };
            }
          }
        }

        console.log("总体伤害统计:", damageObject);

        const skillObject: Record<
          string,
          { name: string; times: number; damage: number }[]
        > = {};
        for (let index = 0; index < resData.skillList.length; index++) {
          const skill = resData.skillList[index];
          const playerSkills = skillObject[skill.sourceName];
          if (playerSkills) {
            const fs = playerSkills.find((x) => x.name === skill.skillName);
            if (fs) {
              fs.times += 1;
              fs.damage += skill.damage || 0;
            } else {
              playerSkills.push({
                name: skill.skillName,
                times: 1,
                damage: skill.damage || 0,
              });
            }
          } else {
            skillObject[skill.sourceName] = [
              {
                name: skill.skillName,
                times: 1,
                damage: skill.damage || 0,
              },
            ];
          }
        }

        console.log("分技能统计:", skillObject);

        setPageLoading(false);
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
  }, []);

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
      });
    }
  };

  return (
    <Spin spinning={pageLoading} description="数据处理中...">
      <Dragger {...props}>
        <p
          style={{
            display: "flex",
            height: 300,
            width: 500,
            justifyContent: "center",
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
    </Spin>
  );
}

export default App;
