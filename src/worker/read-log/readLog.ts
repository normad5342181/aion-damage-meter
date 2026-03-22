import { bosses, NORMAL_ATTACK, PLAYER_SELF } from "./constant";
import {
  AnalyzedResult,
  DotSkill,
  Log,
  MessageData,
  Skill,
  Tag,
} from "./types";

// 用于提取有用信息的正则
const usefulRegex = /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}) : (.*)$/;
// 进入了新地图的正则
const mapChangeRegex = /^进入了(.+?)地区频道。/;
// 开始攻击命名怪的正则
const firstAttackRegex = new RegExp(
  `对(${bosses.map((boss) => boss.name).join("|")})造成了${"(.+?)"}的伤害`,
);
// 命名怪倒地的正则
const bossDeadRegex = new RegExp(
  `从(${bosses.map((boss) => boss.name).join("|")})获得了${"(.+?)"}的经验值`,
);
// 技能伤害的正则
const skillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
// 普攻暴击伤害的正则，只能记录自己的，其他人的普攻是否暴击没有记录
const criticalAttackRegex =
  /致命一击！给(?<targetName>.+?)造成了(?<damage>.+?)的致命一击伤害/;
// 普攻伤害的正则，其他人无法记录是否暴击
const normalAttackRegex =
  /(?:(?<userName>.+?))?给(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
// 施加持续伤害的正则
const dotSkillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了持续伤害效果/;
// 持续技能伤害的正则
// 要记录dot的伤害来源，首先要记录下释放技能的角色
const dotDamageRegex =
  /(?:(?<targetName>.+?))?由于(?<skillName>.+?)的效果，受到了(?<damage>.+?)的伤害/;
// 额外需要处理的技能：如魔法逆流类，是dot且有其他效果
const dotSkillMoreRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，(?<targetName>.+?)受到了(?<damage>.+?)的伤害/;
// 额外需要处理的伤害技能：如延迟爆炸类，伤害后置
const delaySkillRegex =
  /(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，(?<targetName>.+?)获得了(?<state>.+?)效果/;
// 非伤害类技能通用匹配
const otherSkillRegex = /(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，/;

// 已经攻击过的命名怪
const usedBosses: string[] = [];
// 某个dot技能最后一次释放的记录
const lastDotSkills: DotSkill[] = [];

const logList: Log[] = [];
const tagList: Tag[] = [];
const skillList: Skill[] = [];

// 记录dot类技能，供后续伤害提供伤害来源
function recordDotSkill(
  dateTime: string,
  targetName: string,
  skillName: string,
  sourceName?: string,
) {
  // 从记录的信息中查找施加记录
  const skillIndex = lastDotSkills.findIndex(
    (item) => item.skillName === skillName && item.targetName === targetName,
  );

  if (skillIndex >= 0) {
    lastDotSkills[skillIndex] = {
      dateTime,
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      targetName,
    };
  } else {
    lastDotSkills.push({
      dateTime,
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      targetName,
    });
  }
}

// 记录所有技能使用情况
function recordAllSkill({
  dateTime,
  skillName,
  targetName,
  sourceName,
  damage,
}: {
  dateTime: string;
  skillName: string;
  targetName?: string;
  sourceName?: string;
  damage?: number;
}) {
  const skillIndex = skillList.findIndex(
    (skill) =>
      skill.dateTime === dateTime &&
      skill.skillName === skillName &&
      skill.sourceName === sourceName,
  );

  if (skillIndex >= 0) {
    updateSkill({ dateTime, skillName, sourceName, targetName, damage });
  } else {
    skillList.push({
      dateTime,
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      targetName: targetName || "",
      damage: damage ?? 0,
    });
  }
}

//更新记录的技能伤害
function updateSkill({
  dateTime,
  skillName,
  sourceName,
  targetName,
  damage,
}: {
  dateTime?: string;
  skillName: string;
  sourceName?: string;
  targetName?: string;
  damage?: number;
}) {
  const foundskill = skillList.find(
    (skill) =>
      skill.dateTime === dateTime &&
      skill.skillName === skillName &&
      skill.sourceName === sourceName,
  );

  // 更新伤害
  if (foundskill && damage) {
    foundskill.damage = (foundskill.damage || 0) + damage;
  }

  // 更新伤害目标
  if (foundskill && targetName) {
    foundskill.targetName = foundskill.targetName + targetName + ", ";
  }
}

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
         * 伤害日志 使用技能后的伤害
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

          recordAllSkill({
            dateTime: logTime,
            skillName: match.groups.skillName,
            sourceName: match.groups.userName,
            targetName: match.groups.targetName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
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
              damage: Number(match.groups.damage.replace(/,/g, "")),
              isCritical: true,
              isCastSpd: false,
              isDot: false,
            },
          });

          recordAllSkill({
            dateTime: logTime,
            skillName: NORMAL_ATTACK,
            sourceName: PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
          });
        }
      } else if (logContent.match(normalAttackRegex)) {
        /*
         * 伤害日志 普攻伤害
         * eg: 嗷嗷小脑虎给火焰支配者塔哈巴塔造成了881的伤害。
         */
        const match = logContent.match(normalAttackRegex);
        if (match?.groups) {
          logList.push({
            dateTime: logTime,
            content: logContent,
            damageDetail: {
              sourceName: match.groups.userName || PLAYER_SELF,
              skillName: NORMAL_ATTACK,
              targetName: match.groups.targetName,
              damage: Number(match.groups.damage.replace(/,/g, "")),
              isCritical: false,
              isCastSpd: false,
              isDot: false,
            },
          });

          recordAllSkill({
            dateTime: logTime,
            skillName: NORMAL_ATTACK,
            sourceName: match.groups.userName || PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
          });
        }
      } else if (logContent.match(dotSkillRegex)) {
        /*
         * 施加持续伤害的正则
         * eg: 林酱油使用愤怒之漩涡 I技能，对火焰支配者塔哈巴塔造成了持续伤害效果。
         */
        const match = logContent.match(dotSkillRegex);
        if (match?.groups) {
          recordDotSkill(
            logTime,
            match.groups.targetName,
            match.groups.skillName,
            match.groups.userName,
          );

          recordAllSkill({
            dateTime: logTime,
            skillName: match.groups.skillName,
            sourceName: match.groups.userName || PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: 0,
          });
        }
      } else if (logContent.match(dotDamageRegex)) {
        /*
         * 伤害日志 持续性伤害
         * eg: 火焰支配者塔哈巴塔由于愤怒之漩涡 I的效果，受到了1,095的伤害。
         */
        const match = logContent.match(dotDamageRegex);
        if (match?.groups) {
          const foundSkill = lastDotSkills.find(
            (item) =>
              item.skillName === match.groups?.skillName &&
              item.targetName === match.groups?.targetName,
          );

          if (!foundSkill) {
            // console.log("特殊伤害来源：", logContent);
          }

          logList.push({
            dateTime: logTime,
            content: logContent,
            damageDetail: {
              sourceName: foundSkill
                ? foundSkill.sourceName
                : match.groups?.skillName, // 存在截取日志中没有找到dot伤害来源，或者伤害神石之类的来源
              skillName: match.groups.skillName,
              targetName: match.groups.targetName,
              damage: Number(match.groups.damage.replace(/,/g, "")),
              isCritical: false,
              isCastSpd: false,
              isDot: true,
            },
          });

          if (foundSkill) {
            updateSkill({
              dateTime: foundSkill.dateTime,
              skillName: foundSkill.skillName,
              sourceName: foundSkill.sourceName,
              damage: Number(match.groups.damage.replace(/,/g, "")),
            });
          }
        }
      } else if (logContent.match(dotSkillMoreRegex)) {
        /*
         * 伤害日志 持续性伤害且有其他效果
         * eg: 林酱油使用魔法逆流 II技能，火焰支配者塔哈巴塔受到了1,636的伤害，并消除了部分强化魔法。
         */
        const match = logContent.match(dotSkillMoreRegex);
        if (match?.groups) {
          recordDotSkill(
            logTime,
            match.groups.targetName,
            match.groups.skillName,
            match.groups.userName,
          );

          // 计算伤害
          logList.push({
            dateTime: logTime,
            content: logContent,
            damageDetail: {
              sourceName: match.groups.userName || PLAYER_SELF,
              skillName: match.groups.skillName,
              targetName: match.groups.targetName,
              damage: Number(match.groups.damage.replace(/,/g, "")),
              isCritical: logContent.includes("致命一击！"),
              isCastSpd: false,
              isDot: false,
            },
          });

          recordAllSkill({
            dateTime: logTime,
            skillName: match.groups.skillName,
            sourceName: match.groups.userName || PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
          });
        }
      } else if (logContent.match(delaySkillRegex)) {
        /*
         * 施加技能： 延迟爆炸类，伤害后置
         * eg: 波波特使用熔岩海啸 I技能，火焰支配者塔哈巴塔获得了延迟爆炸效果。
         */
        const match = logContent.match(delaySkillRegex);
        if (match?.groups) {
          // 记录dot
          recordDotSkill(
            logTime,
            match.groups.targetName,
            match.groups.skillName,
            match.groups.userName,
          );

          recordAllSkill({
            dateTime: logTime,
            skillName: match.groups.skillName,
            sourceName: match.groups.userName || PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: 0,
          });
        }
      } else if (logContent.match(otherSkillRegex)) {
        /*
         * 非伤害类技能通用
         * eg: 丶悠米同学使用守护之咒语 I技能，进入回避,武器防御,盾牌防御强化状态。
         */
        const match = logContent.match(otherSkillRegex);
        if (match?.groups) {
          recordAllSkill({
            dateTime: logTime,
            skillName: match.groups.skillName,
            sourceName: match.groups.userName || PLAYER_SELF,
            targetName: "",
            damage: 0,
          });
        }
      } else {
        // if (logContent.includes("伤害")) {
        //   console.log("未知伤害类型：", logContent);
        // }
        // if (logContent.includes("火焰中心")) {
        //   console.log("未知伤害：火焰中心：", logContent);
        // }
        continue;
      }
    }
  }
  return {
    logList,
    tagList,
    skillList,
  };
}

async function readLog(file: File) {
  // 先读取原始文件内容，一行一行解析
  const lines = await readLine(file);

  // 过滤日志，只保留有用信息
  const resData = filterLog(lines);

  return resData;
}

self.onmessage = (e: MessageEvent<MessageData>) => {
  const data = e.data;
  if (data.type === "logAnalyze") {
    readLog(data.file).then((resData: AnalyzedResult) => {
      self.postMessage({
        type: "log-result",
        data: resData,
      });
    });
  }
};
