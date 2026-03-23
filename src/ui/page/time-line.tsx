import { Button, Timeline, Tooltip } from "antd";
import { Tag } from "../../worker/read-log/types";
import { useCallback, useEffect, useState } from "react";
import { TimelineItemType } from "antd/es/timeline/Timeline";
import { calcTimelineItemHeight } from "../util";

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const updateSlider = useCallback(
    (startDt?: number | string, endDt?: number | string) => {
      const marks: TimelineItemType[] = [];

      const startMs = startDt
        ? new Date(startDt).getTime()
        : new Date(dateTimeRange[0]).getTime();

      const endMs = endDt
        ? new Date(endDt).getTime()
        : new Date(dateTimeRange[1]).getTime();

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
    },
    [dateTimeRange, markRender, tagList],
  );

  useEffect(() => {
    updateSlider(new Date(startTime).getTime(), new Date(endTime).getTime());
  }, [startTime, endTime, tagList, updateSlider]);

  return (
    <div className="log-result-select-date">
      <div className="log-result-date-tool">
        <Button type="text" onClick={() => updateSlider(startTime, endTime)}>
          重置
        </Button>
      </div>
      <span>{new Date(dateTimeRange[0]).toLocaleString()}</span>
      <div className="log-result-select-date-range">
        <div className="log-result-select-date-range-container">
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
  );
}

export default TimeLineView;
