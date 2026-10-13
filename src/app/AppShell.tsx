import { NavLink, Outlet } from 'react-router-dom';
import { LogOut, Moon, Plus, Sun } from 'lucide-react';
import { NAV_ITEMS } from '@/config/nav';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { periodLabel } from '@/lib/periods';
import { useCurrentPlan } from '@/data/plan';
import { Button } from '@/components/ui/button';
import { LogSheet } from '@/features/log-sheet/LogSheet';
import { useAppearance } from './appearance';
import { useAuth } from './auth';
import { LogSheetProvider, useLogSheet } from './log-context';
import { Logo } from './Logo';

export function AppShell() {
  return (
    <LogSheetProvider>
      <div className="min-h-screen md:flex">
        <SideNav />
        <Rail />
        <main id="main" className="min-w-0 flex-1 px-4 pb-36 pt-4 md:px-6 md:pb-28 xl:px-8 xl:pt-6">
          <div className="mx-auto max-w-[1180px]">
            <Outlet />
          </div>
        </main>
        <TabBar />
        <LogFab />
        <LogSheet />
      </div>
    </LogSheetProvider>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  const { resolvedDark, setTheme } = useAppearance();
  return (
    <header className="mb-4 flex items-center justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 hidden text-sm text-muted md:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions && <div className="hidden items-center gap-2 md:flex">{actions}</div>}
        <Button
          variant="outline"
          size="icon"
          aria-label={resolvedDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(resolvedDark ? 'light' : 'dark')}
        >
          {resolvedDark ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}

function ThisPayCard() {
  const plan = useCurrentPlan();
  if (!plan) return null;
  const { pay } = plan;
  const left = plan.totals.left;
  return (
    <div className="rounded-ctl border border-border bg-surface2 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">This pay</p>
      <p className="mt-1 font-semibold">{periodLabel(pay.current)}</p>
      <p className="text-muted">
        Day {pay.current.dayOf} of {pay.current.days}
      </p>
      <p className={cn('num mt-2 font-display text-xl font-semibold', left < 0 && 'text-over')}>{formatMoney(left, { decimals: 0 })}</p>
      <p className="text-xs text-muted">{left < 0 ? 'over budget' : 'left to spend'}</p>
    </div>
  );
}

function SideNav() {
  const { signOut } = useAuth();
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-4 border-r border-border bg-surface p-4 xl:flex">
      <Logo className="px-2 py-1" />
      <nav aria-label="Main" className="grid gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-touch items-center gap-3 rounded-ctl px-3 text-sm font-semibold transition-colors',
                isActive ? 'bg-ink text-onink' : 'text-text hover:bg-surface2',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto grid gap-3">
        <ThisPayCard />
        <Button variant="ghost" className="justify-start" onClick={() => void signOut()}>
          <LogOut aria-hidden /> Sign out
        </Button>
      </div>
    </aside>
  );
}

function Rail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-2 border-r border-border bg-surface py-4 md:flex xl:hidden">
      <Logo compact className="mb-2" />
      <nav aria-label="Main" className="grid gap-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              cn('grid size-12 place-items-center rounded-ctl transition-colors', isActive ? 'bg-ink text-onink' : 'text-text hover:bg-surface2')
            }
          >
            <Icon className="size-5" aria-hidden />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function TabBar() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-safe md:hidden">
      <ul className="grid h-[66px] grid-cols-6">
        {NAV_ITEMS.map(({ to, short, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-text' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-11 place-items-center rounded-full', isActive && 'bg-ink text-onink')}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  {short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LogFab() {
  const { openLog } = useLogSheet();
  return (
    <Button
      onClick={() => openLog()}
      size="lg"
      className="fixed bottom-[82px] right-4 z-40 rounded-full shadow-lg md:bottom-6 md:right-6"
      aria-label="Log an expense"
    >
      <Plus aria-hidden />
      Log
    </Button>
  );
}
