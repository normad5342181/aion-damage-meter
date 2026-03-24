import { Race, Role } from "./constant";

export interface MessageData {
  id: string;
  type: string;
  file: File;
  dateTimeRange?: [number, number];
}

export interface Log {
  dateTime: string;
  type?: string;
  content: string;
  damageDetail?: {
    sourceName: string;
    skillName: string;
    targetName: string;
    damage: number;
    // 是否暴击
    isCritical: boolean;
    // 状态改变
    isCastSpd: boolean;
    // 是否是持续伤害
    isDot: boolean;
  };
}

export interface Tag {
  dateTime: string;
  label: string;
  type?: string;
}

export interface DotSkill {
  dateTime: string;
  sourceName: string;
  skillName: string;
  targetName: string;
}

export interface Skill {
  dateTime: string;
  sourceName: string;
  skillName: string;
  targetName: string;
  isCritical: boolean;
  isDot: boolean;
  damage?: number;
}

export interface DamageSource {
  name: string;
  usedSkill: string[];
  role?: Role;
  race?: Race;
}

export interface AnalyzedResult {
  startTime: string;
  endTime: string;
  logList: Log[];
  tagList: Tag[];
  skillMap: Map<string, Skill>;
  damageSourceMap: Map<string, DamageSource>;
}
