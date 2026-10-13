import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/app/auth';
import { AppearanceProvider } from '@/app/appearance';
import { App } from '@/app/App';
import { Toaster } from '@/components/ui/sonner';
import { supabaseConfigured } from '@/lib/supabase';
import { SetupNeeded } from '@/app/SetupNeeded';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppearanceProvider>
              <App />
              <Toaster />
            </AppearanceProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    ) : (
      <SetupNeeded />
    )}
  </StrictMode>,
);
