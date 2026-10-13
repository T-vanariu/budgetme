import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ctl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-ink text-onink hover:opacity-90',
        outline: 'border border-border bg-surface text-text hover:bg-surface2',
        ghost: 'text-text hover:bg-surface2',
        secondary: 'bg-surface2 text-text hover:bg-border',
        destructive: 'bg-over text-white hover:opacity-90',
        auth: 'bg-[var(--auth-btn)] text-[var(--auth-btn-text)] hover:opacity-90',
        link: 'text-text underline underline-offset-4 hover:opacity-80',
      },
      size: {
        default: 'min-h-touch px-4 py-2',
        sm: 'min-h-9 px-3 text-xs',
        lg: 'min-h-12 px-6 text-base',
        icon: 'size-touch min-h-touch min-w-touch',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} type={asChild ? undefined : type ?? 'button'} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
