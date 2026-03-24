import { memo, useEffect, useRef } from "react";
import { AnalyzedResult } from "../../worker/read-log/types";
import { Layout, message } from "antd";
const { Content, Sider } = Layout;
import "./index.css";
import TimeLineView from "./time-line";
import { RcFile } from "antd/es/upload";
import DamageMeter from "./damage-meter";

type Props = AnalyzedResult & {
  setPageLoading: (loading: boolean) => void;
  setCurrentPage: (page: string) => void;
  file: RcFile;
  updateLogResult: (data: Partial<AnalyzedResult>) => void;
};

function LogResult({
  startTime,
  endTime,
  tagList,
  logList,
  skillMap,
  damageSourceMap,
  setPageLoading,
  file,
  updateLogResult,
}: Props) {
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
      if (res.data.type === "log-result") {
        message.success("日志解析完成");
        setPageLoading(false);

        const resData: AnalyzedResult = res.data.data;
        updateLogResult({
          logList: resData.logList,
          skillMap: resData.skillMap,
          damageSourceMap: resData.damageSourceMap,
        });

        // const skillObject: Record<
        //   string,
        //   { name: string; times: number; damage: number }[]
        // > = {};
        // resData.skillMap.forEach((skill) => {
        //   const playerSkills = skillObject[skill.sourceName];
        //   if (playerSkills) {
        //     const fs = playerSkills.find((x) => x.name === skill.skillName);
        //     if (fs) {
        //       fs.times += 1;
        //       fs.damage += skill.damage || 0;
        //     } else {
        //       playerSkills.push({
        //         name: skill.skillName,
        //         times: 1,
        //         damage: skill.damage || 0,
        //       });
        //     }
        //   } else {
        //     skillObject[skill.sourceName] = [
        //       {
        //         name: skill.skillName,
        //         times: 1,
        //         damage: skill.damage || 0,
        //       },
        //     ];
        //   }
        // });

        // console.log("分技能统计:", skillObject);
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
  }, [setPageLoading, updateLogResult]);

  const onSubmitDateTimeRange = (startDt: number, endDt: number) => {
    setPageLoading(true);
    if (processRef.current) {
      processRef.current.postMessage({
        id: new Date().getTime(),
        type: "logAnalyze",
        file: file,
        dateTimeRange: [startDt, endDt],
      });
    }
  };

  return (
    <Layout className="log-result-layout">
      <Sider className="log-result-sider" width={400}>
        <TimeLineView
          startTime={startTime}
          endTime={endTime}
          tagList={tagList}
          onSubmit={onSubmitDateTimeRange}
        />
      </Sider>
      <Content>
        <DamageMeter
          logList={logList}
          skillMap={skillMap}
          damageSourceMap={damageSourceMap}
        />
      </Content>
    </Layout>
  );
}

export default memo(LogResult);
