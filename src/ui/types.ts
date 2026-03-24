export interface DamageMeter {
  damageSummary: DamageSummary;
  skillSummary?: {
    name: string;
    damage: string;
    times: number;
    criticaltimes: number;
  }[];
  targetSummary?: {
    name: string;
    damage: string;
    percent: number;
  };
}

export interface DamageSummary {
  damageCount: number;
  dps?: number;
  criticalRate?: number;
}
