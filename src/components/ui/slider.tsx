import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { rangeColor?: string; thumbLabel?: string }
>(({ className, rangeColor = 'var(--ink)', thumbLabel, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn('relative flex min-h-touch w-full touch-none select-none items-center', className)} {...props}>
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-track">
      <SliderPrimitive.Range className="absolute h-full" style={{ background: rangeColor }} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={thumbLabel}
      className="block size-6 rounded-full border-2 bg-surface shadow transition-colors disabled:pointer-events-none"
      style={{ borderColor: rangeColor }}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';
