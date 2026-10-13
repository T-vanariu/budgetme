import { cn } from '@/lib/utils';
import { passwordScore, SCORE_LABEL } from './schemas';

const COLORS = ['#F0766A', '#F0766A', '#F0A45A', '#7B9BF2', '#4DBE8A'];

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  return (
    <div className="grid gap-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1.5 rounded-full')} style={{ background: i <= score ? COLORS[score] : '#2F333A' }} />
        ))}
      </div>
      <p className="text-xs text-[#A3A6AD]">
        Strength: <span className="font-semibold text-[var(--auth-text)]">{password ? SCORE_LABEL[score] : '—'}</span>
      </p>
    </div>
  );
}
