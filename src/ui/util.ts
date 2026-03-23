export function calcTimeDifference(startTime: string, endTime: string) {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

/**
 * 根据时间戳差值计算项目高度
 *
 * @param startTime 开始时间戳 (毫秒)
 * @param endTime 结束时间戳 (毫秒)
 * @param baseHeight 基础高度单位值 (默认为 1)
 * @returns 计算后的高度数值
 */
export function calcTimelineItemHeight(
  startTime: number | string,
  endTime: number | string,
  baseHeight: number = 50,
): number {
  // 确保时间差为正数
  const duration = Math.abs(
    new Date(endTime).getTime() - new Date(startTime).getTime(),
  );

  // 定义时间阈值 (毫秒)
  const TEN_SECONDS = 10 * 1000;
  const ONE_MINUTE = 60 * 1000;
  const FIVE_MINUTES = 5 * 60 * 1000;
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const FIVE_HOURS = 5 * 60 * 60 * 1000;

  let multiplier = 1; // 高度倍数

  if (duration < TEN_SECONDS) {
    // 0 ~ 10s:
    multiplier = 0.5;
  } else if (duration < ONE_MINUTE) {
    // 10s ~ 1m: 基础高度
    multiplier = 1;
  } else if (duration < FIVE_MINUTES) {
    // 1m ~ 5m:
    multiplier = 1.5;
  } else if (duration < THIRTY_MINUTES) {
    // 5m ~ 30m:
    multiplier = 2;
  } else if (duration < TWO_HOURS) {
    // 30m ~ 2h:
    multiplier = 2.5;
  } else if (duration < FIVE_HOURS) {
    // 2h ~ 5h
    multiplier = 3;
  } else {
    // 5h 以上
    multiplier = 4;
  }

  return baseHeight * multiplier;
}
