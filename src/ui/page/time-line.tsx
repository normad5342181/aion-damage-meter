import { Button, DatePicker, Timeline, Tooltip } from "antd";
import { Tag } from "../../worker/read-log/types";
import { useEffect, useRef, useState } from "react";
import { TimelineItemType } from "antd/es/timeline/Timeline";
import { calcTimelineItemHeight } from "../util";
import dayjs from "dayjs";

interface IProps {
  startTime: string;
  endTime: string;
  tagList: Tag[];
}

function TimeLineView({ startTime, endTime, tagList }: IProps) {
  const [dateTimeRange, setDateTimeRange] = useState<[number, number]>([
    new Date(startTime).getTime(),
    new Date(endTime).getTime(),
  ]);
  const [marks, setMarks] = useState<TimelineItemType[]>([]);
  const startTimeRef = useRef<number>(0);
  const endTimeRef = useRef<number>(0);

  const updateSlider = (startDt?: number | string, endDt?: number | string) => {
    const markRender = (title: number | string, content: string) => {
      const titleView = (
        <Tooltip title="设为开始">
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              updateSlider(new Date(title).getTime());
            }}
          >
            {new Date(title).toLocaleString()}
          </span>
        </Tooltip>
      );

      const contentView = (
        <Tooltip title="设为结束">
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              updateSlider(undefined, new Date(title).getTime());
            }}
          >
            {content}
          </span>
        </Tooltip>
      );

      return {
        title: titleView,
        content: contentView,
      };
    };

    const marks: TimelineItemType[] = [];

    const startMs = startDt
      ? new Date(startDt).getTime()
      : new Date(startTimeRef.current).getTime();

    const endMs = endDt
      ? new Date(endDt).getTime()
      : new Date(endTimeRef.current).getTime();

    marks.push(markRender(startMs, "开始"));

    let prevTime = startMs;

    tagList.forEach((tag) => {
      const height = calcTimelineItemHeight(prevTime, tag.dateTime);
      const tagTime = new Date(tag.dateTime).getTime();
      if (tagTime >= startMs && tagTime <= endMs) {
        marks.push({
          ...markRender(tag.dateTime, tag.label),
          style: { height, alignContent: "end" },
        });
      }
      prevTime = tagTime;
    });

    marks.push(markRender(endMs, "结束"));

    setMarks(marks);
    setDateTimeRange([startMs, endMs]);
    startTimeRef.current = startMs;
    endTimeRef.current = endMs;
  };

  useEffect(() => {
    updateSlider(new Date(startTime).getTime(), new Date(endTime).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, tagList]);

  return (
    <div className="log-result-select-date">
      <div className="log-result-date-tool">
        <Button type="text" onClick={() => updateSlider(startTime, endTime)}>
          重置
        </Button>
      </div>
      <span>
        <DatePicker
          showTime
          allowClear={false}
          placement="bottomLeft"
          prefix="开始时间"
          value={dayjs(dateTimeRange[0])}
          onOk={(value) => {
            updateSlider(dayjs(value).valueOf());
          }}
        />
      </span>
      <div className="log-result-select-date-range">
        <div className="log-result-select-date-range-container">
          <Timeline mode={"start"} items={marks} />
        </div>
      </div>
      <span>
        <DatePicker
          showTime
          allowClear={false}
          placement="topLeft"
          prefix="结束时间"
          value={dayjs(dateTimeRange[1])}
          onOk={(value) => {
            updateSlider(undefined, dayjs(value).valueOf());
          }}
        />
      </span>
    </div>
  );
}

export default TimeLineView;
