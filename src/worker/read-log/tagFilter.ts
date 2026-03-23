import { bosses } from "./constant";
import { Tag } from "./types";

// 进入了新地图的正则
const mapChangeRegex = /^进入了(.+?)地区频道。/;
// 开始攻击命名怪的正则
const firstAttackRegex = new RegExp(
  `对(${bosses.map((boss) => boss.name).join("|")})造成了${"(.+?)"}的伤害`
);
// 命名怪倒地的正则
const bossDeadRegex = new RegExp(
  `从(${bosses.map((boss) => boss.name).join("|")})获得了${"(.+?)"}的经验值`
);
// 整点时间正则
const hourlyRegex = /^\d{4}\.\d{2}\.\d{2} \d{2}:00:00$/;

// 已经攻击过的命名怪
const usedBosses: string[] = [];
// 已经加入的整点Tag
const usedHourlyTag: string[] = [];

// 日志的tag过滤
export function tagFilter(logTime: string, logContent: string, tagList: Tag[]) {
  let matched = true;
  if (logContent.match(mapChangeRegex)) {
    /*
     * Tag1 进图日志
     * eg: 进入了埃雷修兰塔地区频道
     */
    const mapChangeMatch = logContent.match(mapChangeRegex)!;
    const tag: Tag = {
      dateTime: logTime,
      label: "进图：" + mapChangeMatch[1],
    };
    tagList.push(tag);
    matched = true;
  } else if (
    firstAttackRegex.test(logContent) &&
    !usedBosses.includes(logContent.match(firstAttackRegex)![1])
  ) {
    /*
     * Tag2 开始攻击命名怪
     * eg: 对大精灵师阿特马赫造成了2,297的伤害
     */

    const firstAttackMatch = logContent.match(firstAttackRegex)!;
    const tag: Tag = {
      dateTime: logTime,
      label: "开始攻击" + firstAttackMatch[1],
    };
    tagList.push(tag);
    usedBosses.push(firstAttackMatch[1]);
    matched = true;
  } else if (logContent.match(bossDeadRegex)) {
    /*
     * Tag3 命名怪倒地
     * eg: 从大精灵师阿特马赫获得了138,575的经验值
     */
    const thisMatch = logContent.match(bossDeadRegex)!;
    const tag: Tag = {
      dateTime: logTime,
      label: thisMatch[1] + "倒地",
    };
    tagList.push(tag);
    matched = true;
  } else if (logContent.trim() === "获得了[item:188052084]。") {
    /*
     * Tag4 获得塔哈巴塔证物，防止意外死亡，没有获取到经验的情况
     * eg: 获得了[item:188052084]
     */
    const tag: Tag = {
      dateTime: logTime,
      label: "拾取塔哈巴塔证物",
    };
    tagList.push(tag);
    matched = true;
  } else {
    if (logTime.match(hourlyRegex) && usedHourlyTag.indexOf(logTime) === -1) {
      /*
       * Tag 整点判定
       * eg: 2026.03.22 00:00:00
       * 当内容判定成功，不做整点判定
       * 如果内容判断不成功，则做时间整点判定
       * 整点判定不视为内容匹配，后续继续做其他内容匹配
       */
      const tag: Tag = {
        dateTime: logTime,
        label: "整点:" + logTime,
      };
      tagList.push(tag);
      usedHourlyTag.push(logTime);
    }
    matched = false;
  }

  return matched;
}
