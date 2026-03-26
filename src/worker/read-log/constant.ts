import { darkPuertaBosses } from "./instance/dark-puerta";

export const bosses = [...darkPuertaBosses];

export const PLAYER_SELF = "__我自己__";

export const NORMAL_ATTACK = "普通攻击";

export const REFLECT_ATTACK = "反弹伤害";

export const PROTECTION = "保护效果";

export const UNKNOWN_DOT_SOURCE = "未知的DOT释放者";

export enum Role {
  Warrior = "战士",
  Templar = "守护星",
  Gladiator = "剑星",
  Scout = "侦察者",
  Ranger = "弓星",
  Assassin = "杀星",
  Priest = "牧师",
  Cleric = "治愈星",
  Chanter = "护法星",
  Mage = "法师",
  Sorcerer = "魔道星",
  Spiritmaster = "精灵星",
  Other = "其他",
}

export enum Race {
  Elyos = "天族",
  Asmodians = "魔族",
  Other = "其他",
}
