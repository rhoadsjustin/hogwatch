export type Trend = 'up' | 'down' | 'flat';

export type Metric = {
  label: string;
  value: number;
  unit?: string;
  delta?: number;
  goodDirection?: 'up' | 'down';
};

export type HogIndex = {
  total: number;
  offense: number;
  defense: number;
  coaching: number;
  development: number;
};

/** HOG Index component weights. These must sum to one. */
export const HOG_INDEX_WEIGHTS = {
  offense: 0.3,
  defense: 0.3,
  coaching: 0.25,
  development: 0.15,
} as const;

export type Game = {
  id: string;
  week: number;
  opponent: string;
  opponentShort: string;
  location: 'home' | 'away';
  result?: 'W' | 'L';
  arkansasScore?: number;
  opponentScore?: number;
  date: string;
  hogIndex?: number;
  metrics: Record<string, number>;
};

export type Coach = {
  id: string;
  name: string;
  role: string;
  grade: string;
  scorecard: { label: string; score: number; grade: string }[];
  note: string;
};

export type Player = {
  id: string;
  name: string;
  number: number;
  position: string;
  classYear: string;
  height: string;
  weight: number;
  hometown: string;
  stats: Record<string, string | number>;
};

export const calculateHogIndex = (x: Omit<HogIndex, 'total'>): HogIndex => ({
  ...x,
  total: Math.round(
    x.offense * HOG_INDEX_WEIGHTS.offense +
      x.defense * HOG_INDEX_WEIGHTS.defense +
      x.coaching * HOG_INDEX_WEIGHTS.coaching +
      x.development * HOG_INDEX_WEIGHTS.development,
  ),
});
