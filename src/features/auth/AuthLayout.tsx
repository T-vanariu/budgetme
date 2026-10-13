import type { ReactNode } from 'react';
import { Logo } from '@/app/Logo';

/** Dark auth card over the wallpaper (blueprint §3.1 "Auth card"). */
export function AuthLayout({ title, subtitle, children }: { title?: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md rounded-card bg-[var(--auth-bg)] p-6 text-[var(--auth-text)] shadow-2xl md:p-8 [&_.text-muted]:text-[#A3A6AD]">
        <Logo className="mb-6 [&_span]:text-[var(--auth-text)]" />
        {title && <h1 className="font-display text-2xl font-bold">{title}</h1>}
        {subtitle && <p className="mt-1 text-sm text-[#A3A6AD]">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

/** Input styling for the dark auth card. */
export const authInput = '!border-[#2F333A] !bg-[#20232A] !text-[#ECEBE6] placeholder:!text-[#A3A6AD] aria-[invalid=true]:!border-[#F0766A]';
export const authError = '[&_[role=alert]]:!text-[#F0766A]';
