import { presetBackground } from '@/config/wallpapers';
import { useSignedUrl } from '@/data/uploads';
import { useAppearance } from './appearance';

/**
 * Full-bleed wallpaper behind everything, extended 24px past each edge so blur never shows
 * a hard border. Dim uses --bg in light mode and black in dark mode (never below 55% in dark).
 */
export function WallpaperLayer() {
  const { wallpaper, dim, blur, resolvedDark } = useAppearance();
  const customPath = 'path' in wallpaper ? wallpaper.path : null;
  const { data: signedUrl } = useSignedUrl('wallpapers', customPath);

  const background = customPath
    ? signedUrl
      ? `url("${signedUrl}") center / cover no-repeat, var(--bg)`
      : 'var(--bg)'
    : presetBackground('preset' in wallpaper ? wallpaper.preset : 'pastel');
  const dimPct = resolvedDark ? Math.max(55, dim) : dim;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -inset-6" style={{ background, filter: blur ? `blur(${blur}px)` : undefined }} />
      <div className="absolute inset-0" style={{ background: resolvedDark ? '#000' : 'var(--bg)', opacity: dimPct / 100 }} />
    </div>
  );
}
