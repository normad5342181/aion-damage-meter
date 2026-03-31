import { NORMAL_ATTACK, PLAYER_SELF } from "./constant";
import { DamageSource, DotSkill, Skill } from "./types";

// 普攻技能的某段伤害记录
const normalAttackMap: Map<string, number> = new Map();

// 构建技能唯一键，格式：施放者-技能名称-时间戳
export function buildSkillKey({
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

// 构建dot技能唯一键，格式：目标-技能名称
export function buildDotSkillKey({ targetName, skillName }: { targetName: string; skillName: string }) {
  return `${targetName}-${skillName}`;
}

// 构建dot普攻键，格式：施放者-目标
export function buildNormalKey({ sourceName, targetName }: { sourceName: string; targetName: string }) {
  return `${sourceName}-${targetName}`;
}

// 记录dot类技能，供后续伤害提供伤害来源
export function recordDotSkill(
  dateTime: string,
  targetName: string,
  skillName: string,
  sourceName: string | undefined,
  lastDotSkillMap: Map<string, DotSkill>,
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
export function recordDamageSource(
  { name, skillName, dateTime, damage }: { name: string; skillName: string; dateTime: string; damage?: number },
  damageSourceMap: Map<string, DamageSource>,
) {
  const source = damageSourceMap.get(name);
  if (source) {
    const recorded = source.usedSkills.find((item) => item === skillName);
    // 记录使用的技能
    if (!recorded) {
      source.usedSkills.push(skillName);
    }

    // 记录伤害时间
    if (dateTime && damage && damage > 0) {
      if (source.prevDamageTime) {
        const interval = new Date(dateTime).getTime() - new Date(source.prevDamageTime).getTime();
        // 如果两次伤害时间间隔小于5秒，认为是同一次战斗，累计伤害时间
        if (interval <= 1000 * 5) {
          source.allDamageTime = (source.allDamageTime || 0) + interval;
        }
      }

      source.prevDamageTime = dateTime;
    }
  } else {
    damageSourceMap.set(name, { name, usedSkills: [skillName], prevDamageTime: dateTime, allDamageTime: 0 });
  }
}

// 记录所有技能使用情况
export function recordAllSkill(
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
  recordDamageSource({ name: sourceName || PLAYER_SELF, skillName, dateTime, damage }, damageSourceMap);

  // 普攻单独处理段数
  if (skillName === NORMAL_ATTACK) {
    const key = buildNormalKey({ sourceName: sourceName || PLAYER_SELF, targetName: targetName || PLAYER_SELF });
    const count = normalAttackMap.get(key);
    let effective = false; // 普攻是否为有效段
    if (count === undefined) {
      // 没有对目标的普攻记录
      normalAttackMap.set(key, damage || 0);
      effective = true;
    } else {
      // 存在对目标的普攻记录

      //伤害超过30%则认为是新的一段普攻，重置计数
      if (damage && damage > count * 0.3) {
        normalAttackMap.set(key, damage);
        effective = true;
      } else {
        // 否则认为是同一段普攻，更新伤害
        // 找到上一段普攻记录的技能键
        // 先找这一秒的记录
        let found = false;
        for (let index = 100; index >= 0; index--) {
          const normalKey = `${sourceName || PLAYER_SELF}-${targetName || PLAYER_SELF}-${dateTime}-${index}`;
          if (skillMap.has(normalKey)) {
            const skill = skillMap.get(normalKey);
            if (skill) {
              skill.targetObjects[0].damage = (skill.targetObjects[0].damage || 0) + (damage || 0);
            }
            found = true;
            break;
          }
        }
        if (!found) {
          // 再找上一秒的记录，防止跨秒的情况
          const prevSecond = new Date(new Date(dateTime).getTime() - 1000).toLocaleString().replace(/\//g, ".");
          for (let index = 100; index >= 0; index--) {
            const normalKey = `${sourceName || PLAYER_SELF}-${targetName || PLAYER_SELF}-${prevSecond}-${index}`;
            if (skillMap.has(normalKey)) {
              const skill = skillMap.get(normalKey);
              if (skill) {
                skill.targetObjects[0].damage = (skill.targetObjects[0].damage || 0) + (damage || 0);
              }
              found = true;
              break;
            }
          }
        }
      }
    }

    if (effective) {
      for (let index = 0; index < 100; index++) {
        const normalKey = `${sourceName || PLAYER_SELF}-${targetName || PLAYER_SELF}-${dateTime}-${index}`;
        if (skillMap.has(normalKey)) {
          continue;
        } else {
          skillMap.set(normalKey, {
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
          break;
        }
      }
    }
  } else {
    // 构建技能唯一键
    const skillKey = buildSkillKey({
      sourceName: sourceName || PLAYER_SELF,
      skillName,
      dateTime,
    });

    const skill = skillMap.get(skillKey);

    if (skill) {
      updateSkill({ dateTime, skillName, sourceName, targetName, damage }, skillMap);
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
}

//更新记录的技能伤害
export function updateSkill(
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
    const targetObj = foundskill.targetObjects?.find((t) => t.targetName === targetName);

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
