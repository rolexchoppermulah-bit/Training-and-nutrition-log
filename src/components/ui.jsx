import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';

export const fmt = (n, digits = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—';

export function Card({ title, action, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Button({ variant = 'secondary', size, block, className = '', children, ...rest }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = '', ...rest }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

/** Text input that brings up the number keypad on phones. */
export function NumInput({ value, onChange, className = '', selectOnFocus = true, ...rest }) {
  return (
    <input
      className={`input ${className}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
      onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
      {...rest}
    />
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function ProgressBar({ label, value, target, unit = '', color = 'var(--accent)', compact }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const left = target - value;
  const over = target > 0 && value > target;
  return (
    <div className={`progress-block ${compact ? 'compact' : ''}`}>
      <div className="progress-labels">
        <span className="progress-name">{label}</span>
        <span className="progress-value">
          <strong>{fmt(value)}</strong>
          {target > 0 && (
            <span className="muted">
              {' '}
              / {fmt(target)}
              {unit}
            </span>
          )}
          {!target && unit}
        </span>
      </div>
      {target > 0 && (
        <>
          <div className="progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={target}>
            <span style={{ width: `${pct}%`, background: color }} />
          </div>
          {!compact && (
            <div className="progress-foot muted">
              {over ? `${fmt(-left)}${unit} over` : left === 0 ? 'Target hit' : `${fmt(left)}${unit} to go`}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`segmented ${className}`} role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o} type="button" className={`chip ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, format = (v) => v, label = 'amount' }) {
  return (
    <div className="stepper">
      <IconButton label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={value - step < min}>
        <Minus size={18} />
      </IconButton>
      <span className="stepper-value">{format(value)}</span>
      <IconButton label={`Increase ${label}`} onClick={() => onChange(+(value + step).toFixed(2))}>
        <Plus size={18} />
      </IconButton>
    </div>
  );
}

export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty">
      {icon}
      <div className="empty-title">{title}</div>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

/** Bottom sheet modal (slides up from the bottom on phones). */
export function Sheet({ open, onClose, title, children, footer }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panel} tabIndex={-1}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={22} />
          </IconButton>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toasts ----------

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((message, opts = {}) => {
    clearTimeout(timer.current);
    setToast({ message, ...opts, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), opts.duration || (opts.action ? 5000 : 2200));
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.tone || ''}`} role="status" key={toast.key}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
