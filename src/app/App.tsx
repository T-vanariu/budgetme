import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { WallpaperLayer } from './WallpaperLayer';
import { AppShell } from './AppShell';
import { FullPageSpinner, RedirectIfSignedIn, RequireApp, RequireSession } from './guards';
import { WelcomeScreen } from '@/features/auth/WelcomeScreen';
import { SignInForm } from '@/features/auth/SignInForm';
import { RegisterForm } from '@/features/auth/RegisterForm';
import { CheckEmail } from '@/features/auth/CheckEmail';
import { MfaEnroll } from '@/features/auth/MfaEnroll';
import { MfaChallenge } from '@/features/auth/MfaChallenge';

const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'));
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'));
const PlanPage = lazy(() => import('@/features/plan/PlanPage'));
const IncomePage = lazy(() => import('@/features/income/IncomePage'));
const InsightsPage = lazy(() => import('@/features/insights/InsightsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

export function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-ctl focus:bg-ink focus:p-2 focus:text-onink">
        Skip to content
      </a>
      <WallpaperLayer />
      <Routes>
        <Route path="/" element={<RedirectIfSignedIn><WelcomeScreen /></RedirectIfSignedIn>} />
        <Route path="/sign-in" element={<RedirectIfSignedIn><SignInForm /></RedirectIfSignedIn>} />
        <Route path="/register" element={<RedirectIfSignedIn><RegisterForm /></RedirectIfSignedIn>} />
        <Route path="/register/check-email" element={<CheckEmail />} />
        <Route path="/mfa/setup" element={<RequireSession><MfaEnroll /></RequireSession>} />
        <Route path="/mfa" element={<RequireSession><MfaChallenge /></RequireSession>} />
        <Route
          path="/app"
          element={
            <RequireApp>
              <AppShell />
            </RequireApp>
          }
        >
          <Route index element={<Suspense fallback={<FullPageSpinner />}><OverviewPage /></Suspense>} />
          <Route path="transactions" element={<Suspense fallback={<FullPageSpinner />}><TransactionsPage /></Suspense>} />
          <Route path="plan" element={<Suspense fallback={<FullPageSpinner />}><PlanPage /></Suspense>} />
          <Route path="income" element={<Suspense fallback={<FullPageSpinner />}><IncomePage /></Suspense>} />
          <Route path="insights" element={<Suspense fallback={<FullPageSpinner />}><InsightsPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<FullPageSpinner />}><SettingsPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
