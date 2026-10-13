import { useRef, useState } from 'react';
import { Check, ImageUp, Loader2 } from 'lucide-react';
import { useAppearance } from '@/app/appearance';
import { useAuth } from '@/app/auth';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { WALLPAPER_PRESETS } from '@/config/wallpapers';
import { WALLPAPER_MAX_PX } from '@/config/limits';
import { reencodeImage, validateUpload } from '@/lib/files';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/** Custom upload (priority) + 6 presets. Uploads are resized to ≤2560px WebP and stored privately. */
export function WallpaperPicker() {
  const { wallpaper, setPreset, setCustomPath } = useAppearance();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentPreset = 'preset' in wallpaper ? wallpaper.preset : null;
  const oldPath = 'path' in wallpaper ? wallpaper.path : null;

  const onFile = async (file: File | undefined) => {
    if (!file || !user) return;
    const problem = validateUpload(file, { allowPdf: false });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const webp = await reencodeImage(file, WALLPAPER_MAX_PX, 'image/webp', 0.86);
      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage.from('wallpapers').upload(path, webp, { contentType: 'image/webp' });
      if (upErr) throw upErr;
      setCustomPath(path);
      if (oldPath) void supabase.storage.from('wallpapers').remove([oldPath]);
      toast.success('Wallpaper updated');
    } catch {
      setError("Couldn't upload that photo. Try a different one.");
    } finally {
      setBusy(false);
    }
  };

  const choosePreset = (id: (typeof WALLPAPER_PRESETS)[number]['id']) => {
    setPreset(id);
    if (oldPath) void supabase.storage.from('wallpapers').remove([oldPath]);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
          {busy ? 'Uploading…' : 'Upload a photo'}
        </Button>
        {oldPath && <span className="text-sm text-muted">Using your photo</span>}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-over">
          {error}
        </p>
      )}
      <div role="radiogroup" aria-label="Wallpaper presets" className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {WALLPAPER_PRESETS.map((p) => {
          const on = currentPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choosePreset(p.id)}
              className={cn('grid gap-1 rounded-ctl border-2 p-1 text-left text-xs font-semibold', on ? 'border-ink' : 'border-transparent hover:border-border')}
            >
              <span className="relative block h-16 overflow-hidden rounded-[8px] border border-border" style={{ background: p.background }}>
                {on && (
                  <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink text-onink">
                    <Check className="size-3" aria-hidden />
                  </span>
                )}
              </span>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
