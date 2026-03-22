export interface DamageMeter {
  damageSummary: {
    count: number;
    dps?: number;
    criticalRate?: number;
  };
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
