import { bosses, NORMAL_ATTACK, PLAYER_SELF } from "./constant";
import { Log, MessageData, Tag } from "./types";

// 用于提取有用信息的正则
const usefulRegex = /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) : (.*)$/;
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
// 技能暴击伤害的正则
const skillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
// 普攻暴击伤害的正则，只能记录自己的，其他人的普攻是否暴击没有记录
const criticalAttackRegex =
  /致命一击！给(?<targetName>.+?)造成了(?<damage>.+?)的致命一击伤害/;

// 已经攻击过的命名怪
const usedBosses: string[] = [];

const logList: Log[] = [];
const tagList: Tag[] = [];

async function readLine(file: File) {
  // 先读取原始文件内容，一行一行解析
  const lines: string[] = [];
  const reader = file.stream().getReader();
  const decoder = new TextDecoder("GB2312");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 解码二进制流为文本
      buffer += decoder.decode(value, { stream: true });

      // 按行分割
      const linesArray = buffer.split(/\r?\n/);
      buffer = linesArray.pop() || ""; // 保留最后一行（可能不完整）

      lines.push(...linesArray);
    }

    // 处理最后一行
    if (buffer) {
      lines.push(buffer);
    }
    return lines;
  } catch (err) {
    console.error("读取失败:", err);
    return [];
  }
}

function filterLog(lines: string[]) {
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // 提取时间戳和后续内容, 不匹配的直接丢弃
    const match = line.match(usefulRegex);
    if (match) {
      const logTime = match[1];
      const logContent = match[2];

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
      } else if (logContent.match(skillRegex)) {
        /*
         * 伤害日志 使用技能后的暴击伤害
         * 自身暴击eg: 致命一击！使用身体重击 III技能，对大精灵师阿特马赫造成了2,181的伤害。
         * 其他人暴击eg: 致命一击！嗷嗷小脑虎使用弱化之猛击 V技能，对大精灵师阿特马赫造成了1,408的伤害。
         */
        const match = logContent.match(skillRegex);
        if (match?.groups) {
          logList.push({
            dateTime: logTime,
            content: logContent,
            damageDetail: {
              sourceName: match.groups.userName || PLAYER_SELF,
              skillName: match.groups.skillName,
              targetName: match.groups.targetName,
              // 将伤害数字里面的所有逗号替换掉
              damage: Number(match.groups.damage.replace(/,/g, "")),
              isCritical: logContent.includes("致命一击！"),
              isCastSpd: false,
              isDot: false,
            },
          });
        }
      } else if (logContent.match(criticalAttackRegex)) {
        /*
         * 伤害日志 普攻后的暴击伤害
         * 自身暴击eg: 致命一击！给森林守护者诺亚的冤魂造成了1,105的致命一击伤害。
         */
        const match = logContent.match(criticalAttackRegex);
        if (match?.groups) {
          logList.push({
            dateTime: logTime,
            content: logContent,
            damageDetail: {
              sourceName: PLAYER_SELF,
              skillName: NORMAL_ATTACK,
              targetName: match.groups.targetName,
              damage: Number(match.groups.damage),
              isCritical: true,
              isCastSpd: false,
              isDot: false,
            },
          });
        }
      } else {
        continue;
      }
    }
  }
}

async function readLog(file: File) {
  // 先读取原始文件内容，一行一行解析
  const lines = await readLine(file);

  // 过滤日志，只保留有用信息
  filterLog(lines);

  console.log("logList", logList);
  // console.log("tagList", tagList);
}

self.onmessage = (e: MessageEvent<MessageData>) => {
  const data = e.data;
  if (data.type === "logAnalyze") {
    readLog(data.file);
  }
};
