import { Link } from 'react-router-dom';
import { Camera, PieChart, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthLayout } from './AuthLayout';

const BENEFITS = [
  { icon: PieChart, text: 'Split every pay into Needs, Wants and Savings + debt.' },
  { icon: Camera, text: 'Snap a receipt or type it in under 10 seconds.' },
  { icon: Target, text: 'See exactly how much to put aside each pay for your goals.' },
];

export function WelcomeScreen() {
  return (
    <AuthLayout title="BudgetMe" subtitle="A calm fortnightly budget, in kina.">
      <ul className="grid gap-3">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#20232A] text-[var(--auth-btn)]">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="pt-2">{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-3">
        <Button asChild variant="auth" size="lg">
          <Link to="/register">Create account</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="text-[var(--auth-text)] hover:bg-[#20232A]">
          <Link to="/sign-in">Sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
