import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, Zap } from 'lucide-react';
import clsx from 'clsx';

export type ToastTone = 'success' | 'warn' | 'info' | 'live';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void;
}

const ToastCtx = createContext<ToastApi>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

const TONE_STYLE: Record<ToastTone, { bar: string; icon: any; iconColor: string }> = {
  success: { bar: 'bg-forest', icon: CheckCircle2, iconColor: 'text-forest' },
  warn: { bar: 'bg-amber', icon: AlertTriangle, iconColor: 'text-amber' },
  info: { bar: 'bg-emerald-500', icon: Info, iconColor: 'text-emerald-600' },
  live: { bar: 'bg-fresh', icon: Zap, iconColor: 'text-fresh' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, any>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    // Cap the stack so a burst of events can never cover the screen.
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const style = TONE_STYLE[t.tone];
            const Icon = style.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-xl border border-emerald-100 bg-white/95 p-3 shadow-lg backdrop-blur"
              >
                <span className={clsx('absolute inset-y-0 left-0 w-1', style.bar)} />
                <Icon size={17} className={clsx('mt-0.5 shrink-0', style.iconColor)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-emerald-950">{t.title}</div>
                  {t.body && <div className="mt-0.5 line-clamp-2 text-xs text-emerald-700/80">{t.body}</div>}
                </div>
                <button onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5 text-emerald-400 hover:bg-emerald-50 hover:text-emerald-700">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
