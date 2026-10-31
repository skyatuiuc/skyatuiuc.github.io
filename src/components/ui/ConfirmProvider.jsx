import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';

// In-app replacement for window.confirm. Returns a promise of true/false.
//   const confirm = useConfirm();
//   if (!(await confirm({ title: 'Delete retreat?', message: '…', details: names, confirmLabel: 'Delete', danger: true }))) return;

const ConfirmContext = createContext(null);

const MAX_DETAILS = 8;

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const confirmButtonRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const settle = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  const details = request?.details || [];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal
          title={request.title || 'Are you sure?'}
          onClose={() => settle(false)}
          width={480}
          initialFocusRef={confirmButtonRef}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => settle(false)} data-confirm="cancel">
                {request.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => settle(true)}
                data-confirm="ok"
              >
                {request.confirmLabel || 'Confirm'}
              </button>
            </>
          )}
        >
          {request.message && <p style={{ color: 'var(--text-body)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{request.message}</p>}
          {details.length > 0 && (
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {details.slice(0, MAX_DETAILS).map((d) => <li key={d}>{d}</li>)}
              {details.length > MAX_DETAILS && <li className="muted">and {details.length - MAX_DETAILS} more</li>}
            </ul>
          )}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
