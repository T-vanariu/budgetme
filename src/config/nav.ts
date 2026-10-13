import { Lightbulb, LayoutDashboard, ReceiptText, Settings, Target, Wallet, type LucideIcon } from 'lucide-react';

/** One array drives the sidebar, the tablet rail and the mobile tab bar. */
export const NAV_ITEMS: { to: string; label: string; short: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/app', label: 'Overview', short: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/transactions', label: 'Transactions', short: 'Spend', icon: ReceiptText },
  { to: '/app/plan', label: 'Budgets & Goals', short: 'Plan', icon: Target },
  { to: '/app/income', label: 'Income', short: 'Income', icon: Wallet },
  { to: '/app/insights', label: 'Insights', short: 'Insights', icon: Lightbulb },
  { to: '/app/settings', label: 'Settings', short: 'Settings', icon: Settings },
];
