export interface MessageData {
  id: string;
  type: string;
  file: File;
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
}
