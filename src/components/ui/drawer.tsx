import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';

export const Drawer = DrawerPrimitive.Root;

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPrimitive.Portal>
    <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-card border border-border bg-[var(--bg)] text-text',
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" aria-hidden />
      <div className="overflow-y-auto px-4 pb-6 pt-3 pb-safe">{children}</div>
    </DrawerPrimitive.Content>
  </DrawerPrimitive.Portal>
));
DrawerContent.displayName = 'DrawerContent';

export function DrawerTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>) {
  return <DrawerPrimitive.Title className={cn('font-display text-xl font-semibold', className)} {...props} />;
}
export function DrawerDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>) {
  return <DrawerPrimitive.Description className={cn('text-sm text-muted', className)} {...props} />;
}
