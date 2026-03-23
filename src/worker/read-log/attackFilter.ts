import { NORMAL_ATTACK, PLAYER_SELF, REFLECT_ATTACK } from "./constant";
import { DamageSource, DotSkill, Log, Skill } from "./types";

// 技能伤害的正则
const skillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
// 普攻暴击伤害的正则，只能记录自己的，其他人的普攻是否暴击没有记录
const criticalAttackRegex =
  /致命一击！给(?<targetName>.+?)造成了(?<damage>.+?)的致命一击伤害/;
// 普攻伤害和反弹伤害的正则，无法记录是否暴击
const normalOrReflectAttackRegex =
  /(?:(?<userName>.+?))?(?:反弹了攻击，)给(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
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

// 某个dot技能最后一次释放的记录
const lastDotSkills: DotSkill[] = [];

function buildSkillKey({
  dateTime,
  sourceName,
  skillName,
}: {
  dateTime: string;
  sourceName: string;
  skillName: string;
}) {
  return `${sourceName}-${skillName}-${dateTime}`;
}

// 记录dot类技能，供后续伤害提供伤害来源
function recordDotSkill(
  dateTime: string,
  targetName: string,
  skillName: string,
  sourceName?: string
) {
  // 从记录的信息中查找施加记录
  const skillIndex = lastDotSkills.findIndex(
    (item) => item.skillName === skillName && item.targetName === targetName
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

// 记录玩家
function recordDamageSource(
  { name, skillName }: { name: string; skillName: string },
  damageSourceMap: Map<string, DamageSource>
) {
  const source = damageSourceMap.get(name);
  if (source) {
    const recorded = source.usedSkill.find((item) => item === skillName);
    if (!recorded) {
      source.usedSkill.push(skillName);
    }
  } else {
    damageSourceMap.set(name, { name, usedSkill: [skillName] });
  }
}

// 记录所有技能使用情况
function recordAllSkill(
  {
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
  },
  damageSourceMap: Map<string, DamageSource>,
  skillMap: Map<string, Skill>
) {
  recordDamageSource(
    { name: sourceName || PLAYER_SELF, skillName },
    damageSourceMap
  );

  const skillKey = buildSkillKey({
    sourceName: sourceName || PLAYER_SELF,
    skillName,
    dateTime,
  });

  const skill = skillMap.get(skillKey);

  if (skill) {
    updateSkill(
      { dateTime, skillName, sourceName, targetName, damage },
      skillMap
    );
  } else {
    skillMap.set(skillKey, {
      dateTime,
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      targetName: targetName || "",
      damage: damage ?? 0,
    });
  }
}

//更新记录的技能伤害
function updateSkill(
  {
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
  },
  skillMap: Map<string, Skill>
) {
  const skillKey = buildSkillKey({
    sourceName: sourceName || PLAYER_SELF,
    skillName,
    dateTime: dateTime || "",
  });

  const foundskill = skillMap.get(skillKey);
  // 更新伤害
  if (foundskill && damage) {
    foundskill.damage = (foundskill.damage || 0) + damage;
  }
  // 更新伤害目标
  if (foundskill && targetName) {
    foundskill.targetName = foundskill.targetName + targetName + ", ";
  }
}

interface IProps {
  logTime: string;
  logContent: string;
  logList: Log[];
  damageSourceMap: Map<string, DamageSource>;
  skillMap: Map<string, Skill>;
}
export function attackFilter({
  logTime,
  logContent,
  logList,
  damageSourceMap,
  skillMap,
}: IProps) {
  let matched = true;

  if (logContent.match(skillRegex)) {
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

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
        },
        damageSourceMap,
        skillMap
      );
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

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: NORMAL_ATTACK,
          sourceName: PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
        },
        damageSourceMap,
        skillMap
      );
    }
  } else if (logContent.match(normalOrReflectAttackRegex)) {
    /*
     * 伤害日志 普攻伤害
     * eg: 嗷嗷小脑虎给火焰支配者塔哈巴塔造成了881的伤害。
     * eg: 反弹了攻击，给火焰支配者塔哈巴塔造成了50的伤害。
     */
    const match = logContent.match(normalOrReflectAttackRegex);
    if (match?.groups) {
      const isReflect = logContent.includes("反弹了攻击");

      logList.push({
        dateTime: logTime,
        content: logContent,
        damageDetail: {
          sourceName: match.groups.userName || PLAYER_SELF,
          skillName: isReflect ? REFLECT_ATTACK : NORMAL_ATTACK,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: false,
          isCastSpd: false,
          isDot: false,
        },
      });

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: isReflect ? REFLECT_ATTACK : NORMAL_ATTACK,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
        },
        damageSourceMap,
        skillMap
      );
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
        match.groups.userName
      );

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: 0,
        },
        damageSourceMap,
        skillMap
      );
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
          item.targetName === match.groups?.targetName
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
        updateSkill(
          {
            dateTime: foundSkill.dateTime,
            skillName: foundSkill.skillName,
            sourceName: foundSkill.sourceName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
          },
          skillMap
        );
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
        match.groups.userName
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

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
        },
        damageSourceMap,
        skillMap
      );
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
        match.groups.userName
      );

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: 0,
        },
        damageSourceMap,
        skillMap
      );
    }
  } else if (logContent.match(otherSkillRegex)) {
    /*
     * 非伤害类技能通用
     * eg: 丶悠米同学使用守护之咒语 I技能，进入回避,武器防御,盾牌防御强化状态。
     */
    const match = logContent.match(otherSkillRegex);
    if (match?.groups) {
      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: "",
          damage: 0,
        },
        damageSourceMap,
        skillMap
      );
    }
  } else {
    // if (logContent.includes("伤害")) {
    //   console.log("未知伤害类型：", logContent);
    // }
    // if (logContent.includes("火焰中心")) {
    //   console.log("未知伤害：火焰中心：", logContent);
    // }
    matched = false;
  }

  return matched;
}
