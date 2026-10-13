/** Single source for insight rule thresholds (blueprint §4.3). */
export const INSIGHTS = {
  /** Needs / Wants pace: used % may run this many points ahead of elapsed %. */
  paceMarginPts: 15,
  /** Category spike: this pay > factor × average of previous pays. */
  spikeFactor: 1.3,
  spikeHistoryPays: 3,
  /** Big one-off: single Wants expense > factor × median Wants expense. */
  oneOffFactor: 2,
  oneOffMinCount: 3,
  /** Savings win: savings moved ≥ this share of the savings plan. */
  savingsWinPct: 70,
  /** Logging gap: days since the last expense. */
  loggingGapDays: 2,
} as const;
