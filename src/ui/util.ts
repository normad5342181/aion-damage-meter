import { Role } from "../worker/read-log/constant";

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

// 正则匹配尾部罗马数字
const ROMAN_REGEX = / (I|II|III|IV|V|VI|VII|VIII|IX|X)$/;
// 去除尾部罗马数字
export const removeTrailingRoman = (str: string): string => {
  return str.trim().replace(ROMAN_REGEX, "").trim();
};

export function getRoleFilters() {
  // 遍历枚举对象
  const roles = Object.values(Role);

  return roles.map((role) => ({
    text: role,
    value: role,
  }));
}

export function getDefaultRoleFilters() {
  const roles = getRoleFilters();
  return roles.filter((f) => f.value !== Role.Other).map((f) => f.value);
}

export function getMaxKeys(map: Map<string, number>): string[] {
  if (map.size === 0) return [];

  let maxValue = -Infinity;
  let maxKeys: string[] = [];

  for (const [key, value] of map.entries()) {
    if (value > maxValue) {
      maxValue = value;
      maxKeys = [key];
    } else if (value === maxValue) {
      maxKeys.push(key);
    }
  }

  return maxKeys;
}

export function calcArrayIntersection<T extends string>(
  arr1: T[],
  arr2: T[],
): {
  intersection: T[]; // 交集
  onlyInArr1: T[]; // 仅在 arr1
  onlyInArr2: T[]; // 仅在 arr2
  union: T[]; // 并集
} {
  // 边界处理
  if (!arr1.length)
    return {
      intersection: [],
      onlyInArr1: [],
      onlyInArr2: [...arr2],
      union: [...arr2],
    };
  if (!arr2.length)
    return {
      intersection: [],
      onlyInArr1: [...arr1],
      onlyInArr2: [],
      union: [...arr1],
    };

  // 优化：用较小的数组创建 Set，节省内存
  const [smaller, larger] =
    arr1.length <= arr2.length ? [arr1, arr2] : [arr2, arr1];
  const isArr1Smaller = arr1.length <= arr2.length;

  const smallSet = new Set(smaller);
  const largeSet = new Set(larger);

  const intersection: T[] = [];
  const onlyInArr1: T[] = [];
  const onlyInArr2: T[] = [];

  // 计算交集
  for (const item of smallSet) {
    if (largeSet.has(item)) {
      intersection.push(item);
    }
  }

  // 计算非交集
  if (isArr1Smaller) {
    for (const item of arr1) {
      if (!largeSet.has(item)) onlyInArr1.push(item);
    }
    for (const item of arr2) {
      if (!smallSet.has(item)) onlyInArr2.push(item);
    }
  } else {
    for (const item of arr1) {
      if (!smallSet.has(item)) onlyInArr1.push(item);
    }
    for (const item of arr2) {
      if (!largeSet.has(item)) onlyInArr2.push(item);
    }
  }

  return {
    intersection,
    onlyInArr1,
    onlyInArr2,
    union: [...intersection, ...onlyInArr1, ...onlyInArr2],
  };
}

export function matchSpecialRole(sourceName: string): Role {
  if (
    sourceName.endsWith("精灵") ||
    sourceName.endsWith("气息") ||
    sourceName === "攻城兵器"
  ) {
    return Role.Minion;
  } else if (sourceName.endsWith("属性)伤害效果")) {
    return Role.Godstone;
  } else if (
    sourceName.endsWith("效果") ||
    sourceName.endsWith("效果果") ||
    sourceName === "冰柱"
  ) {
    return Role.Skill;
  } else {
    return Role.Other;
  }
}
