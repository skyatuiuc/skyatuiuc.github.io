import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared dialog shell: portal, Esc to close, focus kept inside while open and restored on close,
// page scroll locked. On phones it becomes a bottom sheet (see .modal-* in index.css).
export default function Modal({ title, onClose, children, footer, width = 560, closeOnOverlay = true, initialFocusRef }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusTarget = initialFocusRef?.current || dialogRef.current?.querySelector(FOCUSABLE) || dialogRef.current;
    focusTarget?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (closeOnOverlay && e.target === e.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} style={{ maxWidth: width }}>
        {(title || onClose) && (
          <div className="modal-header">
            {title ? <h2 id={titleId} className="modal-title">{title}</h2> : <span />}
            {onClose && (
              <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
