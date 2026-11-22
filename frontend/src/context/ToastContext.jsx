import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  IconAlertCircle,
  IconCheckCircle,
  IconInfo,
  IconX,
} from '../components/Icons.jsx';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: IconCheckCircle,
  error: IconAlertCircle,
  info: IconInfo,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = ++counter.current;
      setToasts((current) => [
        ...current.slice(-3),
        { id, message, type },
      ]);

      const timer = setTimeout(() => dismiss(id), 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map((toast) => {
          const ToastIcon = TOAST_ICONS[toast.type] ?? IconInfo;

          return (
            <div
              key={toast.id}
              className={`toast toast--${toast.type}`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <span className="toast-icon">
                <ToastIcon />
              </span>
              <p className="toast-message">{toast.message}</p>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }

  return context;
}
