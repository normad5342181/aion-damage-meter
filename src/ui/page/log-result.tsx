import { memo } from "react";
import { AnalyzedResult } from "../../worker/read-log/types";
import { Layout } from "antd";
const { Content, Sider } = Layout;
import "./index.css";
import TimeLineView from "./time-line";

function LogResult({ startTime, endTime, tagList }: AnalyzedResult) {
  return (
    <Layout className="log-result-layout">
      <Sider className="log-result-sider" width={400}>
        <TimeLineView
          startTime={startTime}
          endTime={endTime}
          tagList={tagList}
        />
      </Sider>
      <Content>Content</Content>
    </Layout>
  );
}

export default memo(LogResult);
