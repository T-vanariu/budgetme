import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Theme, WallpaperPreset } from '@/types/domain';
import { useProfile, useUpdateProfile } from '@/data/profile';
import { useAuth } from './auth';

interface Appearance {
  theme: Theme;
  resolvedDark: boolean;
  wallpaper: { preset: WallpaperPreset } | { path: string };
  dim: number;
  blur: number;
  setTheme: (t: Theme) => void;
  setPreset: (p: WallpaperPreset) => void;
  setCustomPath: (path: string) => void;
  setDim: (n: number) => void;
  setBlur: (n: number) => void;
}

const KEY = 'budgetme-theme';
const AppearanceContext = createContext<Appearance | null>(null);

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { dataReady } = useAuth();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [wallpaper, setWallpaper] = useState<Appearance['wallpaper']>({ preset: 'pastel' });
  const [dim, setDimState] = useState(35);
  const [blur, setBlurState] = useState(0);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Profile is the source of truth once loaded.
  useEffect(() => {
    if (!profile) return;
    setThemeState(profile.theme);
    setWallpaper(profile.wallpaper);
    setDimState(profile.wallpaperDim);
    setBlurState(profile.wallpaperBlur);
  }, [profile]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const resolvedDark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedDark);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode: theme still applies for this visit */
    }
  }, [theme, resolvedDark]);

  // Debounced persistence so sliders don't write on every pixel.
  const timer = useRef<number>();
  const persist = useCallback(
    (patch: Parameters<typeof update.mutate>[0], debounce = 0) => {
      if (!dataReady) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => update.mutate(patch), debounce);
    },
    [dataReady, update],
  );

  const value = useMemo<Appearance>(
    () => ({
      theme,
      resolvedDark,
      wallpaper,
      dim,
      blur,
      setTheme: (t) => {
        setThemeState(t);
        persist({ theme: t });
      },
      setPreset: (p) => {
        setWallpaper({ preset: p });
        persist({ wallpaper_preset: p, wallpaper_path: null });
      },
      setCustomPath: (path) => {
        setWallpaper({ path });
        persist({ wallpaper_path: path });
      },
      setDim: (n) => {
        setDimState(n);
        persist({ wallpaper_dim: n }, 400);
      },
      setBlur: (n) => {
        setBlurState(n);
        persist({ wallpaper_blur: n }, 400);
      },
    }),
    [theme, resolvedDark, wallpaper, dim, blur, persist],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): Appearance {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
