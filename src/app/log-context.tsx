import { createContext, useContext, useState, type ReactNode } from 'react';

export type LogStart = 'choose' | 'manual' | 'scan';
interface LogCtx {
  open: boolean;
  start: LogStart;
  openLog: (start?: LogStart) => void;
  close: () => void;
}

const Ctx = createContext<LogCtx | null>(null);

export function LogSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<LogStart>('choose');
  return (
    <Ctx.Provider
      value={{
        open,
        start,
        openLog: (s = 'choose') => {
          setStart(s);
          setOpen(true);
        },
        close: () => setOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLogSheet(): LogCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLogSheet must be used inside LogSheetProvider');
  return ctx;
}
