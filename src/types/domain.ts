/** Whole toea. K 1 = 100 toea. Never a float. */
export type Toea = number & { readonly __brand: 'toea' };

/** Brand a whole number as toea. Throws on floats so bugs surface early. */
export function toea(n: number): Toea {
  if (!Number.isInteger(n)) throw new Error(`toea must be an integer, got ${n}`);
  return n as Toea;
}

export type Bucket = 'need' | 'want' | 'savings';
export const BUCKETS: readonly Bucket[] = ['need', 'want', 'savings'] as const;
export type PayCycle = 'weekly' | 'fortnightly' | 'monthly';
export type Theme = 'light' | 'dark' | 'system';

/** Percentages that must sum to exactly 100. Index order: need, want, savings. */
export type Split = readonly [need: number, want: number, savings: number];

export type SideAllocation =
  | { mode: 'same' }
  | { mode: 'savings' }
  | { mode: 'custom'; split: Split };

export type WallpaperPreset = 'pastel' | 'lagoon' | 'none' | 'harbour' | 'bilum' | 'dusk';

export interface Profile {
  id: string;                 // = auth.users.id
  displayName: string;
  currency: 'PGK';
  payCycle: PayCycle;
  payAnchorDate: string;      // ISO date of a real payday
  split: Split;
  side: SideAllocation;
  theme: Theme;
  wallpaper: { preset: WallpaperPreset } | { path: string };
  wallpaperDim: number;       // 0–80
  wallpaperBlur: number;      // 0–20
  onboarded: boolean;
}

export interface Category { id: string; name: string; bucket: Bucket; icon: string; isDefault: boolean; }

export type IncomeKind = 'salary' | 'side_hustle' | 'other';
export interface IncomeSource { id: string; name: string; kind: IncomeKind; expectedAmount: Toea | null; isActive: boolean; }
export interface IncomeEntry { id: string; sourceId: string; amount: Toea; receivedOn: string; note?: string; }

export interface Expense {
  id: string;
  amount: Toea;
  spentOn: string;            // ISO date
  merchant: string | null;
  categoryId: string;
  bucket: Bucket;             // copied from category at insert
  note?: string;
  receiptId: string | null;
  entryMethod: 'manual' | 'receipt';
  deletedAt: string | null;   // soft delete for undo
}

export type DocKind = 'receipt' | 'quotation' | 'invoice';
export type ReceiptStatus = 'uploaded' | 'parsing' | 'parsed' | 'confirmed' | 'failed';
export interface Receipt { id: string; storagePath: string; kind: DocKind; status: ReceiptStatus; parsed: ParsedDocument | null; error: string | null; }

/** What parse-document returns after validation. Amounts already converted to toea. */
export interface ParsedDocument {
  docType: DocKind;
  merchant: string | null;
  date: string | null;
  currency: 'PGK';
  total: Toea;
  lineItems: { description: string; qty: number; amount: Toea }[];
  validUntil: string | null;  // quotations
  suggestedCategory: string;  // one of the user's category names
  confidence: number;         // 0–1; below CONFIDENCE_FLOOR → open manual entry
}

export interface Goal {
  id: string;
  title: string;
  kind: 'save_up' | 'pay_off';
  targetAmount: Toea;
  startingBalance: Toea;      // already paid / saved before tracking
  perPay: Toea;               // planned contribution
  targetDate: string | null;
  priority: number;
  documentId: string | null;  // quotation or invoice
  status: 'active' | 'achieved' | 'paused';
}
export interface GoalContribution { id: string; goalId: string; amount: Toea; contributedOn: string; expenseId: string | null; }

export interface PayPeriod { index: number; start: string; end: string; dayOf: number; days: number; }

/** History filters shared by Transactions and Income. */
export type HistoryRange = 'this_pay' | 'last_pay' | 'last_3' | 'all' | { period: number };

/** One row of the Overall history table, read from v_period_summary. */
export interface PeriodSummary {
  period: PayPeriod;
  income: Toea; salary: Toea; side: Toea;
  spentNeed: Toea; spentWant: Toea; spentSavings: Toea;
  spent: Toea;                 // need + want + savings
  leftOver: Toea;              // income - spent (can be negative)
  expenseCount: number;
}

export interface BucketPlan { bucket: Bucket; plannedFromSalary: Toea; plannedFromSide: Toea; planned: Toea; spent: Toea; left: Toea; usedPct: number; }

export type InsightSeverity = 'info' | 'warn' | 'good';
export type InsightRuleId = 'needs_pace' | 'wants_pace' | 'category_spike' | 'big_one_off' | 'goal_slipping' | 'savings_win' | 'logging_gap';
export interface InsightRuleResult { id: InsightRuleId; name: string; condition: string; fired: boolean; severity: InsightSeverity; message: string; }

export const BUCKET_LABEL: Record<Bucket, string> = { need: 'Needs', want: 'Wants', savings: 'Savings + debt' };
