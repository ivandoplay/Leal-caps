import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Lock,
  Search as SearchIcon,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';

// ============================================================================
// 1. BUTTON — Sleek modern SaaS buttons (Indigo/Violet primary, crisp secondary)
// ============================================================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'cyan';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40';
  const variants = {
    primary:
      'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.45)] hover:shadow-[0_12px_24px_-4px_rgba(79,70,229,0.55)]',
    cyan:
      'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white shadow-[0_8px_20px_-6px_rgba(14,165,233,0.4)]',
    secondary:
      'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-indigo-500/40 hover:bg-[var(--bg-surface)]',
    outline:
      'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-indigo-500',
    danger:
      'bg-rose-500/10 text-rose-500 border border-rose-500/25 hover:bg-rose-500/20',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]',
  };
  const sizes = {
    xs: 'px-3 py-1.5 text-xs rounded-lg',
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-sm tracking-tight',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ============================================================================
// 2. INPUT & SELECT — Clean SaaS form controls
// ============================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
    )}
    <input
      className={`w-full bg-[var(--bg-surface)] border ${
        error
          ? 'border-rose-500'
          : 'border-[var(--border-subtle)] focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15'
      } rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all ${className}`}
      {...props}
    />
    {hint && !error && <span className="text-[11px] text-[var(--text-muted)]">{hint}</span>}
    {error && <span className="text-xs text-rose-500 font-medium">{error}</span>}
  </div>
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-xs font-semibold text-[var(--text-secondary)]">
        {label}
      </label>
    )}
    <select
      className={`w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none transition-all ${className}`}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================================================
// 3. CARD & KPI — Single-elevation clean SaaS surfaces
// ============================================================================
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', title, subtitle, action }) => (
  <div className={`modern-card rounded-2xl p-5 sm:p-6 ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          {title && (
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

export const KPI: React.FC<{
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: 'lime' | 'cyan' | 'amber' | 'danger' | 'emerald';
  icon?: React.ReactNode;
}> = ({ label, value, subvalue, accent = 'lime', icon }) => {
  const iconAccent = {
    lime: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    cyan: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    danger: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  }[accent];

  const valueAccent = {
    lime: 'text-[var(--text-primary)]',
    cyan: 'text-[var(--text-primary)]',
    amber: 'text-amber-500',
    danger: 'text-rose-500',
    emerald: 'text-emerald-500',
  }[accent];

  return (
    <div className="modern-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{label}</span>
        {icon && (
          <span className={`w-8 h-8 rounded-xl border flex items-center justify-center ${iconAccent}`}>
            {icon}
          </span>
        )}
      </div>
      <div
        className={`mt-3 text-2xl sm:text-[26px] font-extrabold tracking-tight tabular-nums ${valueAccent}`}
      >
        {value}
      </div>
      {subvalue && <div className="mt-1.5 text-xs text-[var(--text-muted)]">{subvalue}</div>}
    </div>
  );
};

// ============================================================================
// 4. BADGE & STATUS BADGE — Clean semantic status indicators
// ============================================================================
export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'lime' | 'cyan' | 'amber' | 'danger' | 'emerald' | 'slate';
  className?: string;
}> = ({ children, tone = 'slate', className = '' }) => {
  const tones = {
    lime: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    cyan: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    slate: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold border rounded-md whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = String(status || '').toUpperCase();
  let tone: 'lime' | 'cyan' | 'amber' | 'danger' | 'emerald' | 'slate' = 'slate';

  if (['APPROVED', 'ACTIVE', 'DELIVERED', 'PAID', 'VALID', 'ENTREGUE'].includes(normalized)) {
    tone = 'emerald';
  } else if (
    ['PENDING', 'WAITING', 'UNDER_REVIEW', 'QUOTED', 'AGUARDANDO PAGAMENTO'].includes(normalized)
  ) {
    tone = 'amber';
  } else if (
    ['PICKING', 'PACKING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'LABEL_GENERATED'].includes(
      normalized
    )
  ) {
    tone = 'cyan';
  } else if (
    ['DECLINED', 'REFUNDED', 'CHARGEBACK', 'EXCEPTION', 'REJECTED', 'EXPIRED', 'INACTIVE'].includes(
      normalized
    )
  ) {
    tone = 'danger';
  }

  return <Badge tone={tone}>{status}</Badge>;
};

// ============================================================================
// 5. MODAL & DRAWER & CONFIRM DIALOG
// ============================================================================
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}> = ({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`modern-card rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden my-8`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
      <div className="modern-card border-l border-[var(--border-subtle)] w-full max-w-xl h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
          <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, description, confirmLabel = 'Confirmar Ação', onConfirm, onCancel }) => (
  <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-md">
    <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">{description}</p>
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onCancel}>
        Cancelar
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);

// ============================================================================
// 6. TIMELINE & CHART — Modern SaaS activity feed & progress bars
// ============================================================================
export const Timeline: React.FC<{
  items: {
    id?: string;
    title: string;
    subtitle?: string;
    timestamp: string;
    actor?: string;
    previousValue?: string;
    newValue?: string;
  }[];
}> = ({ items }) => (
  <div className="ml-3 pl-6 border-l border-[var(--border-subtle)] space-y-4">
    {items.map((item, idx) => (
      <div key={item.id || idx} className="relative">
        <div className="absolute -left-[35px] top-0.5 w-[22px] h-[22px] rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
          {idx + 1}
        </div>
        <div className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">{item.title}</span>
            <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
              {new Date(item.timestamp).toLocaleString('pt-BR')}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{item.subtitle}</p>
          )}
          {(item.actor || item.newValue) && (
            <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)]">
              {item.actor && <span>Responsável: {item.actor}</span>}
              {item.newValue && (
                <span className="font-mono text-[11px]">
                  {item.previousValue ? `${item.previousValue} → ` : ''}
                  <strong className="text-indigo-600 dark:text-indigo-400">{item.newValue}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const BarChartSimple: React.FC<{
  data: { label: string; value: number; sublabel?: string; color?: string }[];
}> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3.5">
      {data.map((d) => {
        const pct = Math.min(100, Math.max(4, Math.round((d.value / max) * 100)));
        return (
          <div key={d.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-primary)]">{d.label}</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {d.value} {d.sublabel || ''}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 7. UX STATES
// ============================================================================
export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Sincronizando operação...',
}) => (
  <div className="flex flex-col items-center justify-center py-14 text-[var(--text-secondary)] gap-3">
    <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
    <span className="text-xs font-medium">{message}</span>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="modern-card rounded-2xl p-10 text-center flex flex-col items-center gap-2.5">
    <Inbox className="w-9 h-9 text-[var(--text-muted)]" />
    <h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>
    <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">{description}</p>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
      <div>
        <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400">Atenção Operacional</h4>
        <p className="text-xs text-[var(--text-primary)] mt-0.5">{message}</p>
      </div>
    </div>
    {onRetry && (
      <Button variant="danger" size="sm" onClick={onRetry}>
        Recarregar
      </Button>
    )}
  </div>
);

export const PermissionDeniedState: React.FC<{ role: string; requiredRole: string }> = ({
  role,
  requiredRole,
}) => (
  <div className="modern-card border border-rose-500/30 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
    <Lock className="w-10 h-10 text-rose-500" />
    <h3 className="text-base font-bold text-[var(--text-primary)]">Acesso Restrito por Perfil (RBAC)</h3>
    <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
      Seu perfil atual (<strong className="text-indigo-600 dark:text-indigo-400">{role}</strong>) possui escopo exclusivo.
      Para acessar esta área é necessário o perfil:{' '}
      <strong className="text-[var(--text-primary)]">{requiredRole}</strong>.
    </p>
  </div>
);

export const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Pesquisar por SKU, código, cliente ou ID...' }) => (
  <div className="relative w-full max-w-md">
    <SearchIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all"
    />
  </div>
);

export const FileUploader: React.FC<{
  label: string;
  onUpload: (fileName: string) => void;
}> = ({ label, onUpload }) => (
  <div className="border border-dashed border-[var(--border-strong)] hover:border-indigo-500 rounded-xl p-4 bg-[var(--bg-subtle)]/50 flex items-center justify-between gap-4 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
        <Upload className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-semibold text-[var(--text-primary)]">{label}</div>
        <div className="text-[11px] text-[var(--text-secondary)]">PDF, Laudo Técnico ou Rótulo ANVISA (Máx 10MB)</div>
      </div>
    </div>
    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={() => onUpload(`dossie-regulatorio-${Date.now().toString().slice(-4)}.pdf`)}
    >
      Anexar Arquivo
    </Button>
  </div>
);

export const ToastBanner: React.FC<{
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}> = ({ toast, onClose }) => {
  if (!toast) return null;
  const styles = {
    success: 'bg-[var(--bg-surface)] border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
    error: 'bg-[var(--bg-surface)] border-rose-500/40 text-rose-600 dark:text-rose-400',
    info: 'bg-[var(--bg-surface)] border-indigo-500/40 text-indigo-600 dark:text-indigo-400',
  }[toast.type];

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 border rounded-2xl px-4 py-3.5 shadow-xl flex items-center gap-3 backdrop-blur-xl ${styles}`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : toast.type === 'error' ? (
        <ShieldAlert className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span className="text-xs font-semibold text-[var(--text-primary)]">{toast.message}</span>
      <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
