import { NORMAL_ATTACK, PLAYER_SELF, REFLECT_ATTACK } from "./constant";
import { DamageSource, DotSkill, Log, Skill } from "./types";

// 技能伤害的正则
const skillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
// 普攻暴击伤害的正则，只能记录自己的，其他人的普攻是否暴击没有记录
const criticalAttackRegex =
  /致命一击！(?:(?<userName>.+?))?给(?<targetName>.+?)造成了(?<damage>.+?)的致命一击伤害/;

// 普攻伤害的正则，无法记录是否暴击
const normalAttackRegex =
  /(?:(?<userName>.+?))?给(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
const normalAttack2Regex = /(?<userName>.+?)造成(?<damage>.+?)的伤害/;

// 反弹伤害的正则，无法记录是否暴击
const reflectAttackRegex =
  /(?:(?<userName>.+?))?反弹了攻击，给(?<targetName>.+?)造成了(?<damage>.+?)的伤害/;
const reflectAttack2Regex =
  /(?:(?<targetName>.+?))?对(?<userName>.+?)的攻击被反弹，受到了(?<damage>.+?)的伤害/;

// 施加持续伤害的正则，可能出现致命一击的前缀
const dotSkillRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，对(?<targetName>.+?)造成了(持续性伤害|持续伤害效果)/;
//丶那个护法使用风之刃 IV技能，天人战士的冤魂陷入周期性生命减少状态状态
const dotSkill2Regex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，(?<targetName>.+?)陷入周期性生命减少状态/;

// 持续技能伤害的正则
// 要记录dot的伤害来源，首先要记录下释放技能的角色
const dotDamageRegex =
  /(?:(?<targetName>.+?))?由于(?<skillName>.+?)的效果，受到了(?<damage>.+?)的(?:(?<state>.+?))?伤害/;

// 额外需要处理的技能：如魔法逆流类，是dot且有其他效果
const dotSkillMoreRegex =
  /(?:致命一击！)?(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，(?<targetName>.+?)受到了(?<damage>.+?)的伤害/;
// 额外需要处理的伤害技能：如延迟爆炸类，伤害后置
const delaySkillRegex =
  /(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，(?<targetName>.+?)获得了(?<state>.+?)效果/;
// 受到的dot技能，貌似不会记录队友的
const takeDotRegex =
  /(?:(?<targetName>.+?))?受到(?<userName>.+?)使用的(?<skillName>.+?)的影响，受到了(?<damage>.+?)的伤害/;

// 保护效果
const protectRegex =
  /因(?<targetName>.+?)的保护效果，代替(?<protectedName>.+?)吸收了(?<userName>.+?)造成的(?<damage>.+?)伤害/;

// 非伤害类技能通用匹配
const otherSkillRegex = /(?:(?<userName>.+?))?使用(?<skillName>.+?)技能，/;

// 某个dot技能最后一次释放的记录
// const lastDotSkills: DotSkill[] = [];
const lastDotSkillMap: Map<string, DotSkill> = new Map();

function buildSkillKey({
  dateTime,
  sourceName,
  skillName,
}: {
  dateTime: string;
  sourceName: string;
  skillName: string;
}) {
  sourceName = sourceName || PLAYER_SELF;
  return `${sourceName}-${skillName}-${dateTime}`;
}

function buildDotSkillKey({
  targetName,
  skillName,
}: {
  targetName: string;
  skillName: string;
}) {
  return `${targetName}-${skillName}`;
}

// 记录dot类技能，供后续伤害提供伤害来源
function recordDotSkill(
  dateTime: string,
  targetName: string,
  skillName: string,
  sourceName?: string,
) {
  const key = buildDotSkillKey({ targetName, skillName });
  // 从记录的信息中查找施加记录
  lastDotSkillMap.set(key, {
    dateTime,
    sourceName: sourceName || PLAYER_SELF,
    skillName,
    targetName,
  });
}

// 记录玩家
function recordDamageSource(
  { name, skillName }: { name: string; skillName: string },
  damageSourceMap: Map<string, DamageSource>,
) {
  const source = damageSourceMap.get(name);
  if (source) {
    const recorded = source.usedSkills.find((item) => item === skillName);
    if (!recorded) {
      source.usedSkills.push(skillName);
    }
  } else {
    damageSourceMap.set(name, { name, usedSkills: [skillName] });
  }
}

// 记录所有技能使用情况
function recordAllSkill(
  {
    dateTime,
    skillName,
    targetName,
    sourceName,
    isCritical,
    isDot,
    damage,
  }: {
    dateTime: string;
    skillName: string;
    targetName?: string;
    sourceName?: string;
    isCritical?: boolean;
    isDot?: boolean;
    damage?: number;
  },
  damageSourceMap: Map<string, DamageSource>,
  skillMap: Map<string, Skill>,
) {
  recordDamageSource(
    { name: sourceName || PLAYER_SELF, skillName },
    damageSourceMap,
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
      skillMap,
    );
  } else {
    skillMap.set(skillKey, {
      dateTime,
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      isDot: isDot ?? false,
      targetObjects: [
        {
          targetName: targetName || "",
          isCritical: isCritical ?? false,
          damage: damage ?? 0,
        },
      ],
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
  skillMap: Map<string, Skill>,
) {
  const skillKey = buildSkillKey({
    sourceName: sourceName || PLAYER_SELF,
    skillName,
    dateTime: dateTime || "",
  });

  const foundskill = skillMap.get(skillKey);

  if (foundskill) {
    const targetObj = foundskill.targetObjects?.find(
      (t) => t.targetName === targetName,
    );

    // 已有伤害目标
    if (targetObj) {
      // 更新伤害
      if (damage) {
        targetObj.damage = (targetObj.damage || 0) + damage;
      }
    } else {
      // 更新伤害目标
      if (targetName) {
        foundskill.targetObjects = [
          ...foundskill.targetObjects,
          { targetName, damage: damage || 0, isCritical: false },
        ];
      }
    }
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
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: logContent.includes("致命一击！"),
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );

      // 有些dot在本人日志和队友日志中表现不一，这里做一个所有技能的记录算了，狗屎盛趣
      recordDotSkill(
        logTime,
        match.groups.targetName,
        match.groups.skillName,
        match.groups.userName || PLAYER_SELF,
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
          sourceName: match.groups.userName || PLAYER_SELF,
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
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: true,
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else if (
    logContent.match(reflectAttackRegex) ||
    logContent.match(reflectAttack2Regex)
  ) {
    /*
     * 伤害日志 反弹伤害
     * eg: 反弹了攻击，给火焰支配者塔哈巴塔造成了50的伤害。
     * 对天人法师的冤魂的攻击被反弹，受到了769的伤害。
     *
     * 普通伤害的正则也会匹配反弹伤害，必须放在前面
     * 这里就不改正则了
     */
    const match =
      logContent.match(reflectAttackRegex) ||
      logContent.match(reflectAttack2Regex);
    if (match?.groups) {
      logList.push({
        dateTime: logTime,
        content: logContent,
        damageDetail: {
          sourceName: match.groups.userName || PLAYER_SELF,
          skillName: REFLECT_ATTACK,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: false,
          isCastSpd: false,
          isDot: false,
        },
      });

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: REFLECT_ATTACK,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: false,
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else if (
    logContent.match(normalAttackRegex) ||
    logContent.match(normalAttack2Regex)
  ) {
    /*
     * 伤害日志 普攻伤害
     * eg: 嗷嗷小脑虎给火焰支配者塔哈巴塔造成了881的伤害。
     * 天人祭司的冤魂造成891的伤害。
     */
    const match =
      logContent.match(normalAttackRegex) ||
      logContent.match(normalAttack2Regex);
    if (match?.groups) {
      logList.push({
        dateTime: logTime,
        content: logContent,
        damageDetail: {
          sourceName: match.groups.userName || PLAYER_SELF,
          skillName: NORMAL_ATTACK,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: false,
          isCastSpd: false,
          isDot: false,
        },
      });

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: NORMAL_ATTACK,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: false,
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else if (
    logContent.match(dotSkillRegex) ||
    logContent.match(dotSkill2Regex)
  ) {
    /*
     * 施加持续伤害的正则
     * eg: 林酱油使用愤怒之漩涡 I技能，对火焰支配者塔哈巴塔造成了持续伤害效果。
     * eg: 丶那个护法使用风之刃 IV技能，天人战士的冤魂陷入周期性生命减少状态。
     */
    const match =
      logContent.match(dotSkillRegex) || logContent.match(dotSkill2Regex);
    if (match?.groups) {
      recordDotSkill(
        logTime,
        match.groups.targetName,
        match.groups.skillName,
        match.groups.userName || PLAYER_SELF,
      );

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: 0,
          isCritical: false,
          isDot: true,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else if (logContent.match(dotDamageRegex)) {
    /*
     * 伤害日志 持续性伤害
     * eg: 火焰支配者塔哈巴塔由于愤怒之漩涡 I的效果，受到了1,095的伤害。
     * eg: 天人战士的冤魂由于风之刃 IV的效果，受到了414的周期性生命减少状态伤害。
     */
    const match = logContent.match(dotDamageRegex);
    if (match?.groups) {
      const foundSkill = lastDotSkillMap.get(
        buildDotSkillKey({
          targetName: match.groups.targetName,
          skillName: match.groups.skillName,
        }),
      );

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
            sourceName: foundSkill.sourceName || PLAYER_SELF,
            targetName: match.groups.targetName,
            damage: Number(match.groups.damage.replace(/,/g, "")),
          },
          skillMap,
        );
      }
    }
  } else if (logContent.match(dotSkillMoreRegex)) {
    /*
     * 伤害日志 持续性伤害且有其他效果
     * eg: 林酱油使用魔法逆流 II技能，火焰支配者塔哈巴塔受到了1,636的伤害，并消除了部分强化魔法。
     * eg: 使用魔法逆流 II技能，对魔力之玛拉巴塔造成了0的伤害，并消除了部分强化魔法。
     */
    const match = logContent.match(dotSkillMoreRegex);
    if (match?.groups) {
      recordDotSkill(
        logTime,
        match.groups.targetName,
        match.groups.skillName,
        match.groups.userName || PLAYER_SELF,
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
          isCritical: logContent.includes("致命一击！"),
          isDot: false,
        },
        damageSourceMap,
        skillMap,
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
        match.groups.userName || PLAYER_SELF,
      );

      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName || PLAYER_SELF,
          targetName: match.groups.targetName,
          damage: 0,
          isCritical: false,
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else if (logContent.match(takeDotRegex)) {
    /*
     * 受到的持续性伤害
     * eg: 受到采集者德哈特拉使用的冲击的影响，受到了3,366的伤害。
     */
    const match = logContent.match(takeDotRegex);
    if (match?.groups) {
      recordAllSkill(
        {
          dateTime: logTime,
          skillName: match.groups.skillName,
          sourceName: match.groups.userName,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: logContent.includes("致命一击！"),
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );

      logList.push({
        dateTime: logTime,
        content: logContent,
        damageDetail: {
          sourceName: match.groups.userName,
          skillName: match.groups.skillName,
          targetName: match.groups.targetName || PLAYER_SELF,
          damage: Number(match.groups.damage.replace(/,/g, "")),
          isCritical: logContent.includes("致命一击！"),
          isCastSpd: false,
          isDot: false,
        },
      });
    }
  } else if (logContent.match(protectRegex)) {
    /*
     * 保护效果
     * eg: 因Divus丨麦冬的保护效果，代替地之精灵吸收了龙族中级战斗队长造成的1,079伤害。
     */
    // 先不做处理吧，伤害被吸收了
    // const match = logContent.match(protectRegex);
    // if (match?.groups) {
    //   recordAllSkill(
    //     {
    //       dateTime: logTime,
    //       skillName: PROTECTION,
    //       sourceName: match.groups.userName,
    //       targetName: match.groups.targetName,
    //       damage: Number(match.groups.damage.replace(/,/g, "")),
    //       isCritical: false,
    //       isDot: false,
    //     },
    //     damageSourceMap,
    //     skillMap
    //   );
    // }
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
          isCritical: false,
          isDot: false,
        },
        damageSourceMap,
        skillMap,
      );
    }
  } else {
    if (logContent.includes("伤害")) {
      console.log("未知伤害类型：", logContent);
    }
    matched = false;
  }

  return matched;
}
