export const PRICE_HISTORY_PERIODS = [
  'weekly',
  'monthly',
  'quarterly',
  'annually',
] as const;

export type PriceHistoryPeriod = (typeof PRICE_HISTORY_PERIODS)[number];
