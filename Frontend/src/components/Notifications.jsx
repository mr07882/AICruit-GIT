import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationsContext = createContext(null);

export function useNotifications() {
  return useContext(NotificationsContext);
}

let idCounter = 0;

export function NotificationsProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const show = useCallback((message, options = {}) => {
    const id = ++idCounter;
    const toast = {
      id,
      message: typeof message === 'string' ? message : String(message),
      duration: options.duration ?? 0,
      actions: options.actions ?? null,
      type: options.type ?? 'info',
    };
    setToasts((t) => [toast, ...t]);
    if (toast.duration > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, toast.duration);
    }
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Override native alert to use our toast
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => show(msg);
    return () => {
      window.alert = originalAlert;
    };
  }, [show]);

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ message: typeof message === 'string' ? message : String(message), options, resolve });
    });
  }, []);

  const handleConfirm = useCallback((result) => {
    if (confirmState && typeof confirmState.resolve === 'function') {
      confirmState.resolve(result);
    }
    setConfirmState(null);
  }, [confirmState]);

  return (
    <NotificationsContext.Provider value={{ show, remove, showConfirm }}>
      {children}
      <div style={containerStyle} aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          options={confirmState.options}
          onResult={handleConfirm}
        />
      )}
    </NotificationsContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const { message, actions } = toast;
  return (
    <div style={toastStyle} role="status">
      <button onClick={onClose} style={closeIconStyle} aria-label="Close">×</button>
      <div style={messageStyle}>{message}</div>
      <div style={actionsStyle}>
        {actions && actions.map((a, i) => (
          <button key={i} onClick={() => { a.onClick && a.onClick(); onClose(); }} style={actionBtnStyle}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}

const containerStyle = {
  position: 'fixed',
  bottom: '16px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column-reverse',
  alignItems: 'flex-end',
  gap: '8px',
  zIndex: 9999,
};

const toastStyle = {
  minWidth: '240px',
  maxWidth: '420px',
  background: '#F6E8FF', // light purple
  border: '2px solid #7C3AED', // purple outline
  color: '#1F1144',
  padding: '12px 14px',
  borderRadius: '12px',
  boxShadow: '0 6px 18px rgba(124,58,237,0.12)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'stretch',
  position: 'relative'
};

const messageStyle = {
  fontSize: '14px',
  lineHeight: '1.25',
  textAlign: 'center'
};

const actionsStyle = {
  display: 'flex',
  gap: '8px',
  alignSelf: 'flex-end'
};

const actionBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#4C1D95',
  cursor: 'pointer',
  padding: '6px 8px',
  borderRadius: '8px'
};

const closeBtnStyle = {
  background: '#EDE9FE',
  border: '1px solid #C4B5FD',
  color: '#4C1D95',
  padding: '6px 10px',
  borderRadius: '10px',
  cursor: 'pointer'
};

const closeIconStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  background: 'transparent',
  border: 'none',
  color: '#4C1D95',
  fontSize: '18px',
  cursor: 'pointer',
  lineHeight: 1
};

export default NotificationsProvider;

function ConfirmModal({ message, options, onResult }) {
  return (
    <div style={confirmBackdropStyle} role="dialog" aria-modal="true">
      <div style={confirmBoxStyle}>
        <div style={confirmMessageStyle}>{message}</div>
        <div style={confirmActionsStyle}>
          <button onClick={() => onResult(false)} style={confirmCancelStyle}>Cancel</button>
          <button onClick={() => onResult(true)} style={confirmOkStyle}>OK</button>
        </div>
      </div>
    </div>
  );
}

const confirmBackdropStyle = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '12px',
  zIndex: 10000,
};

const confirmBoxStyle = {
  width: 'min(720px, 92%)',
  background: '#F6E8FF', // light purple background
  color: '#1F1144', // dark text for contrast
  borderRadius: '12px',
  border: '2px solid #7C3AED',
  padding: '20px',
  boxShadow: '0 10px 30px rgba(124,58,237,0.12)'
};

const confirmMessageStyle = {
  fontSize: '16px',
  lineHeight: '1.5',
  marginBottom: '18px'
};

const confirmActionsStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end'
};

const confirmCancelStyle = {
  background: '#004E6A',
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '999px',
  cursor: 'pointer'
};

const confirmOkStyle = {
  background: '#EDE9FE',
  color: '#4C1D95',
  border: '2px solid #7C3AED',
  padding: '10px 18px',
  borderRadius: '999px',
  cursor: 'pointer'
};
