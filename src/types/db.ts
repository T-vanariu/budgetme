// Row shapes returned by Supabase. Hand-written to match supabase/migrations.
// Once the local stack runs, you can replace this with:
//   supabase gen types typescript --local > src/types/db.ts
// and pass `Database` to createClient. The mappers in src/data/*.ts are the only consumers.

export interface ProfileRow {
  id: string;
  display_name: string;
  currency: 'PGK';
  pay_cycle: 'weekly' | 'fortnightly' | 'monthly';
  pay_anchor_date: string;
  split_need: number;
  split_want: number;
  split_savings: number;
  side_mode: 'same' | 'savings' | 'custom';
  side_need: number | null;
  side_want: number | null;
  side_savings: number | null;
  theme: 'light' | 'dark' | 'system';
  wallpaper_preset: 'pastel' | 'lagoon' | 'none' | 'harbour' | 'bilum' | 'dusk';
  wallpaper_path: string | null;
  wallpaper_dim: number;
  wallpaper_blur: number;
  onboarded: boolean;
}

export interface CategoryRow { id: string; name: string; bucket: 'need' | 'want' | 'savings'; icon: string; is_default: boolean; is_hidden: boolean; }

export interface IncomeSourceRow { id: string; name: string; kind: 'salary' | 'side_hustle' | 'other'; expected_amount: number | null; is_active: boolean; }

export interface IncomeListRow { id: string; amount: number; received_on: string; note: string | null; source_id: string; source_name: string; kind: 'salary' | 'side_hustle' | 'other'; }

export interface ExpenseListRow {
  id: string;
  amount: number;
  spent_on: string;
  merchant: string | null;
  note: string | null;
  category_id: string;
  category_name: string;
  category_icon: string;
  bucket: 'need' | 'want' | 'savings';
  receipt_id: string | null;
  entry_method: 'manual' | 'receipt';
}

export interface ExpenseStatsRow {
  total: number;
  count: number;
  by_period: { period_index: number; total: number; count: number }[];
  top_category: { name: string; total: number } | null;
}

export interface PeriodSummaryRow {
  period_index: number;
  period_start: string;
  period_end: string;
  income: number;
  salary: number;
  side: number;
  spent_need: number;
  spent_want: number;
  spent_savings: number;
  spent: number;
  left_over: number;
  expense_count: number;
  income_count: number;
}

export interface CategoryByPeriodRow { period_index: number; category_id: string; category_name: string; bucket: 'need' | 'want' | 'savings'; total: number; expense_count: number; }

export interface GoalStatusRow {
  id: string;
  title: string;
  kind: 'save_up' | 'pay_off';
  target_amount: number;
  starting_balance: number;
  per_pay: number;
  target_date: string | null;
  priority: number;
  status: 'active' | 'achieved' | 'paused';
  document_id: string | null;
  saved: number;
  contribution_count: number;
}

export interface ReceiptRow { id: string; bucket_id: 'receipts' | 'documents'; storage_path: string; kind: 'receipt' | 'quotation' | 'invoice'; status: string; mime: string; }
