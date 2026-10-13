import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InsightRuleResult } from '@/types/domain';

const ICON = { warn: AlertTriangle, good: CheckCircle2, info: Info };
const TONE = { warn: 'warn', good: 'good', info: 'info' } as const;

export function RuleRow({ rule, showCondition = false }: { rule: InsightRuleResult; showCondition?: boolean }) {
  const Icon = ICON[rule.severity];
  const status = rule.fired ? (rule.severity === 'warn' ? 'Heads up' : 'Nice') : 'Quiet';
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon
        className={rule.severity === 'warn' ? 'mt-0.5 size-5 shrink-0 text-over' : rule.severity === 'good' ? 'mt-0.5 size-5 shrink-0 text-save' : 'mt-0.5 size-5 shrink-0 text-muted'}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{rule.name}</p>
          <Badge tone={rule.fired ? TONE[rule.severity] : 'neutral'}>{status}</Badge>
        </div>
        <p className="mt-0.5 text-sm">{rule.message}</p>
        {showCondition && <p className="mt-1 font-mono text-xs text-muted">Fires when: {rule.condition}</p>}
      </div>
    </li>
  );
}
