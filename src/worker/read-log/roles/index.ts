import { assassin } from "./assassin";
import { gladiator } from "./gladiator";
import { ranger } from "./ranger";
import { sorcerer } from "./sorcerer";
import { templar } from "./templar";
import { spiritmaster } from "./spiritmaster";
import { cleric } from "./cleric";
import { chanter } from "./chanter";
import { universal } from "./universal";

export const allSkillLib = {
  Assassin: assassin,
  Gladiator: gladiator,
  Ranger: ranger,
  Sorcerer: sorcerer,
  Templar: templar,
  Spiritmaster: spiritmaster,
  Cleric: cleric,
  Chanter: chanter,
  universal,
};

export {
  assassin,
  gladiator,
  ranger,
  sorcerer,
  templar,
  spiritmaster,
  cleric,
  chanter,
  universal,
};

export function findRepeat() {
  const roles = Object.keys(allSkillLib);
  const onlys: string[] = [];
  for (let index = 0; index < roles.length; index++) {
    const currentRole = roles[index];
    const roleSkills = (allSkillLib as Record<string, string[]>)[currentRole];
    roleSkills.forEach((rs) => {
      if (onlys.includes(rs)) {
        console.log("重复技能", rs);
      } else {
        onlys.push(rs);
      }
    });
  }
}
