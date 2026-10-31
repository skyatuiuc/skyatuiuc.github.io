import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// One toast stack for the whole app. Success/info toasts fade after a few seconds; errors stay until
// dismissed so a failed save is never missed. A toast may carry one action (e.g. Undo).
//   const toast = useToast();
//   toast.success('Saved');  toast.error(`Save failed: ${err.message}`);
//   toast.info('Marked present', { action: { label: 'Undo', onClick: undo } });

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const DEFAULT_DURATION = { success: 4000, info: 5000, error: null };
const MAX_VISIBLE = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts(list => list.filter(t => t.id !== id)), []);

  const push = useCallback((kind, text, { action, duration } = {}) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts(list => [...list.slice(-(MAX_VISIBLE - 1)), { id, kind, text, action }]);
    const ms = duration === undefined ? DEFAULT_DURATION[kind] : duration;
    if (ms) setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (text, opts) => push('success', text, opts),
    error: (text, opts) => push('error', text, opts),
    info: (text, opts) => push('info', text, opts),
    dismiss
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(({ id, kind, text, action }) => {
          const Icon = ICONS[kind];
          return (
            <div key={id} className={`notice notice-${kind} toast`} data-toast={kind}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              <span className="toast-text">{text}</span>
              {action && (
                <button type="button" className="btn-link" onClick={() => { action.onClick(); dismiss(id); }}>
                  {action.label}
                </button>
              )}
              <button type="button" className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss notification">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
