import { Toaster as Sonner, toast as sonnerToast } from 'sonner';

/** Success toasts are ink, errors are red (blueprint §2.3). */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={88}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'flex w-[calc(100vw-32px)] max-w-sm items-center gap-3 rounded-ctl bg-ink px-4 py-3 text-sm text-onink shadow-lg',
          error: '!bg-over !text-white',
          actionButton: 'ml-auto min-h-9 rounded-ctl px-3 font-semibold underline underline-offset-2',
          title: 'font-semibold',
        },
      }}
    />
  );
}

export const toast = {
  success: (msg: string, opts?: { undo?: () => void; duration?: number }) =>
    sonnerToast.success(msg, {
      duration: opts?.duration,
      action: opts?.undo ? { label: 'Undo', onClick: opts.undo } : undefined,
    }),
  error: (msg: string) => sonnerToast.error(msg),
};
