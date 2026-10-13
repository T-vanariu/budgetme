import { Monitor, Moon, Sun } from 'lucide-react';
import { PageHeader } from '@/app/AppShell';
import { useAppearance } from '@/app/appearance';
import { Card, CardHeader } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Theme } from '@/types/domain';
import { WallpaperPicker } from './WallpaperPicker';
import { SecuritySettings } from './SecuritySettings';
import { DataSettings } from './DataSettings';

export default function SettingsPage() {
  const { theme, setTheme, dim, setDim, blur, setBlur, resolvedDark } = useAppearance();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-[10px] md:gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-12">
          <CardHeader title="Appearance" subtitle="Changes apply on every screen and follow you to other devices." />
          <div className="grid gap-6">
            <div className="grid gap-2">
              <p id="theme-label" className="text-sm font-semibold">Theme</p>
              <ToggleGroup type="single" aria-labelledby="theme-label" value={theme} onValueChange={(v) => v && setTheme(v as Theme)}>
                <ToggleGroupItem value="light"><Sun className="size-4" aria-hidden /> Light</ToggleGroupItem>
                <ToggleGroupItem value="dark"><Moon className="size-4" aria-hidden /> Dark</ToggleGroupItem>
                <ToggleGroupItem value="system"><Monitor className="size-4" aria-hidden /> System</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-semibold">Wallpaper</p>
              <WallpaperPicker />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span id="dim-label" className="font-semibold">Dim</span>
                  <span className="num">{resolvedDark ? `${Math.max(55, dim)}% (55% minimum in dark)` : `${dim}%`}</span>
                </div>
                <Slider min={0} max={80} step={1} value={[dim]} onValueChange={([v]) => setDim(v)} aria-labelledby="dim-label" thumbLabel="Dim" />
              </div>
              <div className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span id="blur-label" className="font-semibold">Blur</span>
                  <span className="num">{blur}px</span>
                </div>
                <Slider min={0} max={20} step={1} value={[blur]} onValueChange={([v]) => setBlur(v)} aria-labelledby="blur-label" thumbLabel="Blur" />
              </div>
            </div>
          </div>
        </Card>
        <Card className="xl:col-span-6">
          <CardHeader title="Security" />
          <SecuritySettings />
        </Card>
        <Card className="xl:col-span-6">
          <CardHeader title="Your data" />
          <DataSettings />
        </Card>
      </div>
    </>
  );
}
