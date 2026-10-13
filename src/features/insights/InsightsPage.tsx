import { PageHeader } from '@/app/AppShell';
import { FullPageSpinner } from '@/app/guards';
import { Card, CardHeader } from '@/components/ui/card';
import { useInsights } from '@/data/insights';
import { rankInsights } from '@/lib/rules';
import { RuleRow } from './RuleRow';
import { ConnectClaudeCard } from './ConnectClaudeCard';

export default function InsightsPage() {
  const insights = useInsights();
  if (!insights) return <FullPageSpinner />;
  const ranked = rankInsights(insights);
  const fired = ranked.filter((r) => r.fired).length;
  return (
    <>
      <PageHeader title="Insights" subtitle="Plain rules checked against this pay. No guessing, no model." />
      <div className="grid gap-[10px] md:gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="This pay's checks" subtitle={`${fired} of ${ranked.length} rules have something to say`} />
          <ul className="divide-y divide-border">
            {ranked.map((r) => (
              <RuleRow key={r.id} rule={r} showCondition />
            ))}
          </ul>
        </Card>
        <div className="xl:col-span-5">
          <ConnectClaudeCard />
        </div>
      </div>
    </>
  );
}
