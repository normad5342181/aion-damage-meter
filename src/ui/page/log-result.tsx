import { memo, useEffect, useState } from "react";
import { AnalyzedResult } from "../../worker/read-log/types";
import { InputNumber, Layout, Timeline } from "antd";
const { Content, Sider } = Layout;
import "./index.css";
import { TimelineItemType } from "antd/es/timeline/Timeline";

function LogResult({ startTime, endTime, tagList }: AnalyzedResult) {
  const [dateTimeRange, setDateTimeRange] = useState<[number, number]>([
    new Date(startTime).getTime(),
    new Date(endTime).getTime(),
  ]);
  const [marks, setMarks] = useState<TimelineItemType[]>([]);
  const [magnification, setMagnification] = useState<number>(1);

  useEffect(() => {
    const marks: TimelineItemType[] = [];

    marks.push({
      label: "开始",
      title: startTime,
    });

    tagList.forEach((tag) => {
      marks.push({
        label: tag.label,
        title: tag.dateTime,
      });
    });

    marks.push({
      label: "结束",
      title: endTime,
    });

    setMarks(marks);
    setDateTimeRange([
      new Date(startTime).getTime(),
      new Date(endTime).getTime(),
    ]);
  }, [startTime, endTime, tagList]);

  // const updateSlider = (startDt: number, endDt: number) => {
  //   const marks: TimelineItemType[] = [];

  //   marks.push({
  //     label: "开始",
  //     title: startTime,
  //   });

  //   tagList.forEach((tag) => {
  //     const tagTime = new Date(tag.dateTime).getTime();
  //     if (tagTime >= startDt && tagTime <= endDt) {
  //       marks.push({
  //         label: tag.label,
  //         title: tag.dateTime,
  //       });
  //     }
  //   });

  //   marks.push({
  //     label: "结束",
  //     title: endTime,
  //   });

  //   setMarks(marks);
  //   setDateTimeRange([startDt, endDt]);
  // };

  return (
    <Layout className="log-result-layout">
      <Sider className="log-result-sider">
        <div className="log-result-select-date">
          <div className="log-result-date-tool">
            <InputNumber
              style={{ width: "100%" }}
              mode="spinner"
              value={magnification}
              min={1}
              max={20}
              step={1}
              onChange={(value) => {
                // 四舍五入
                setMagnification(Math.round(value || 1));
              }}
            />
          </div>
          <span>{new Date(dateTimeRange[0]).toLocaleString()}</span>
          <div className="log-result-select-date-range">
            <div
              className="log-result-select-date-range-container"
              style={{ height: `${100 * magnification}%` }}
            >
              {/* <Slider
                range
                vertical
                reverse
                value={sliderRange}
                marks={marks}
                onChange={(value) => {
                  setSliderRange([value[0], value[1]]);
                }}
                onChangeComplete={(value) => {
                  updateSlider(value[0], value[1]);
                }}
              /> */}
              <Timeline mode={"start"} items={marks} />
            </div>
          </div>
          <span>{new Date(dateTimeRange[1]).toLocaleString()}</span>
        </div>
      </Sider>
      <Content>Content</Content>
    </Layout>
  );
}

export default memo(LogResult);
