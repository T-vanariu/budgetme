import type { WallpaperPreset } from '@/types/domain';

export const WALLPAPER_PRESETS: { id: WallpaperPreset; label: string; background: string }[] = [
  { id: 'pastel', label: 'Kina pastel', background: 'url(/wallpapers/budgetme-pastel.svg) center / cover no-repeat, #efe7da' },
  { id: 'lagoon', label: 'Kina lagoon', background: 'url(/wallpapers/budgetme-lagoon.svg) center / cover no-repeat, #0f5c63' },
  { id: 'none', label: 'Plain', background: 'var(--bg)' },
  {
    id: 'harbour',
    label: 'Harbour',
    background: 'linear-gradient(180deg, #9fd3e6 0%, #5aa5c4 45%, #1f6e8c 70%, #134a5e 100%)',
  },
  {
    id: 'bilum',
    label: 'Bilum',
    background:
      'repeating-linear-gradient(45deg, rgba(196,110,26,.55) 0 10px, transparent 10px 20px), repeating-linear-gradient(-45deg, rgba(27,138,90,.45) 0 10px, transparent 10px 20px), #f3e3c7',
  },
  {
    id: 'dusk',
    label: 'Dusk',
    background: 'linear-gradient(160deg, #2b1d47 0%, #6b3a6e 40%, #d8735a 75%, #f4b26b 100%)',
  },
];

export const presetBackground = (id: WallpaperPreset) => WALLPAPER_PRESETS.find((p) => p.id === id)?.background ?? 'var(--bg)';
