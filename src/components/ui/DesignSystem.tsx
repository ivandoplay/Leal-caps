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
// 1. BUTTON — Sleek modern SaaS buttons with subtle glow & smooth transitions
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
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]';
  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_24px_-4px_rgba(99,102,241,0.65)]',
    cyan:
      'bg-sky-500 text-white hover:bg-sky-400 shadow-[0_8px_20px_-6px_rgba(14,165,233,0.45)]',
    secondary:
      'bg-[#111821] text-[#f4f7f9] border border-[#222c38] hover:border-indigo-500/45 hover:bg-indigo-500/[0.06]',
    outline:
      'bg-transparent text-[#f4f7f9] border border-[#222c38] hover:border-indigo-400 hover:bg-indigo-500/[0.04]',
    danger:
      'bg-rose-500/12 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20',
    ghost: 'bg-transparent text-[#8f9aaa] hover:text-[#f4f7f9] hover:bg-[#111821]',
  };
  const sizes = {
    xs: 'px-3 py-1.5 text-[11px] rounded-lg',
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
// 2. INPUT & SELECT — Clean dark glass inputs
// ============================================================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[11px] font-semibold tracking-wide text-[#8f9aaa]">
        {label}
      </label>
    )}
    <input
      className={`w-full bg-[#090d13]/90 border ${
        error
          ? 'border-[#ff7080]'
          : 'border-[#222c38] focus:border-[#bdf35d] focus:ring-2 focus:ring-[#bdf35d]/15'
      } rounded-xl px-3.5 py-2.5 text-sm text-[#f4f7f9] placeholder-[#596576] focus:outline-none transition-all ${className}`}
      {...props}
    />
    {hint && !error && <span className="text-[11px] text-[#697587]">{hint}</span>}
    {error && <span className="text-xs text-[#ff7080]">{error}</span>}
  </div>
);

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && (
      <label className="text-[11px] font-semibold tracking-wide text-[#8f9aaa]">
        {label}
      </label>
    )}
    <select
      className={`w-full bg-[#090d13]/90 border border-[#222c38] focus:border-[#bdf35d] focus:ring-2 focus:ring-[#bdf35d]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#f4f7f9] focus:outline-none transition-all ${className}`}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#0d1218] text-[#f4f7f9]">
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================================================================
// 3. CARD & KPI — Smooth linear-gradient(145deg,#0f151d,#0b1016) surfaces
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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5 pb-4 border-b border-white/[0.06]">
        <div>
          {title && (
            <h3 className="text-[15px] font-bold text-[#f4f7f9] tracking-tight">{title}</h3>
          )}
          {subtitle && <p className="text-xs text-[#8f9aaa] mt-1 leading-relaxed">{subtitle}</p>}
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
  const glowColor = {
    lime: 'text-[#bdf35d] bg-[#bdf35d]/10 border-[#bdf35d]/20',
    cyan: 'text-[#65dbff] bg-[#65dbff]/10 border-[#65dbff]/20',
    amber: 'text-[#ffbd67] bg-[#ffbd67]/10 border-[#ffbd67]/20',
    danger: 'text-[#ff7080] bg-[#ff7080]/10 border-[#ff7080]/20',
    emerald: 'text-[#49dfa0] bg-[#49dfa0]/10 border-[#49dfa0]/20',
  }[accent];

  const valueAccent = {
    lime: 'text-[#f4f7f9]',
    cyan: 'text-[#f4f7f9]',
    amber: 'text-[#ffbd67]',
    danger: 'text-[#ff7080]',
    emerald: 'text-[#49dfa0]',
  }[accent];

  return (
    <div className="modern-card-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#8f9aaa] tracking-wide">{label}</span>
        {icon ? (
          <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${glowColor}`}>
            {icon}
          </span>
        ) : (
          <span className={`w-2 h-2 rounded-full ${glowColor.split(' ')[1]}`} />
        )}
      </div>
      <div
        className={`mt-3 text-2xl sm:text-[26px] font-extrabold tracking-tight tabular-nums ${valueAccent}`}
      >
        {value}
      </div>
      {subvalue && <div className="mt-1.5 text-[11px] text-[#8f9aaa]">{subvalue}</div>}
    </div>
  );
};

// ============================================================================
// 4. BADGE & STATUS BADGE — Refined capsule badges matching blueprint HTML (.tag / .badge)
// ============================================================================
export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'lime' | 'cyan' | 'amber' | 'danger' | 'emerald' | 'slate';
  className?: string;
}> = ({ children, tone = 'slate', className = '' }) => {
  const tones = {
    lime: 'bg-[#bdf35d]/[0.08] text-[#bdf35d] border-[#bdf35d]/25',
    cyan: 'bg-[#65dbff]/[0.08] text-[#65dbff] border-[#65dbff]/25',
    amber: 'bg-[#ffbd67]/[0.08] text-[#ffbd67] border-[#ffbd67]/25',
    danger: 'bg-[#ff7080]/[0.08] text-[#ff7080] border-[#ff7080]/25',
    emerald: 'bg-[#49dfa0]/[0.08] text-[#49dfa0] border-[#49dfa0]/25',
    slate: 'bg-white/[0.04] text-[#8f9aaa] border-white/[0.08]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border rounded-full ${tones[tone]} ${className}`}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
      <div
        className={`modern-card rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden my-8 border border-white/10`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-[#111821]/70">
          <h3 className="text-base font-bold text-[#f4f7f9] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#8f9aaa] hover:text-[#f4f7f9] p-1.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors"
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md">
      <div className="modern-card border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-[#111821]/70">
          <h3 className="text-base font-bold text-[#f4f7f9]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#8f9aaa] hover:text-[#f4f7f9] p-1.5 rounded-xl cursor-pointer"
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
    <p className="text-sm text-[#8f9aaa] mb-5 leading-relaxed">{description}</p>
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
// 6. TIMELINE & CHART — Styled after the HTML Blueprint's numbered nodes (.node)
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
  <div className="ml-3 pl-6 border-l border-[#222c38] space-y-4">
    {items.map((item, idx) => (
      <div key={item.id || idx} className="relative">
        <div className="absolute -left-[35px] top-0.5 w-[22px] h-[22px] rounded-full bg-[#bdf35d] text-[#071006] flex items-center justify-center text-[10px] font-black shadow-[0_0_12px_rgba(189,243,93,0.4)]">
          {idx + 1}
        </div>
        <div className="bg-[#0d1218]/90 border border-[#222c38] rounded-xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#f4f7f9]">{item.title}</span>
            <span className="text-[11px] text-[#8f9aaa]">
              {new Date(item.timestamp).toLocaleString('pt-BR')}
            </span>
          </div>
          {item.subtitle && (
            <p className="text-xs text-[#8f9aaa] mt-1 leading-relaxed">{item.subtitle}</p>
          )}
          {(item.actor || item.newValue) && (
            <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex flex-wrap items-center justify-between text-[11px] text-[#8f9aaa]">
              {item.actor && <span>Por: {item.actor}</span>}
              {item.newValue && (
                <span className="font-mono text-[10px]">
                  {item.previousValue ? `${item.previousValue} → ` : ''}
                  <strong className="text-[#bdf35d]">{item.newValue}</strong>
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
    <div className="space-y-3">
      {data.map((d) => {
        const pct = Math.min(100, Math.max(4, Math.round((d.value / max) * 100)));
        return (
          <div key={d.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#f4f7f9]">{d.label}</span>
              <span className="font-semibold text-[#bdf35d] tabular-nums">
                {d.value} {d.sublabel || ''}
              </span>
            </div>
            <div className="w-full h-2 bg-[#080d13] rounded-full overflow-hidden border border-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#bdf35d] to-[#49dfa0] transition-all duration-500"
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
  <div className="flex flex-col items-center justify-center py-14 text-[#8f9aaa] gap-3">
    <Loader2 className="w-7 h-7 animate-spin text-[#bdf35d]" />
    <span className="text-xs font-medium">{message}</span>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="modern-card rounded-2xl p-10 text-center flex flex-col items-center gap-2.5">
    <Inbox className="w-9 h-9 text-[#596576]" />
    <h4 className="text-sm font-bold text-[#f4f7f9]">{title}</h4>
    <p className="text-xs text-[#8f9aaa] max-w-md leading-relaxed">{description}</p>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="bg-[#ff7080]/[0.06] border border-[#ff7080]/25 rounded-2xl p-5 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-[#ff7080] shrink-0" />
      <div>
        <h4 className="text-sm font-bold text-[#ff7080]">Atenção Operacional</h4>
        <p className="text-xs text-[#f4f7f9] mt-0.5">{message}</p>
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
  <div className="modern-card border border-[#ff7080]/30 rounded-2xl p-10 text-center flex flex-col items-center gap-3">
    <Lock className="w-10 h-10 text-[#ff7080]" />
    <h3 className="text-base font-bold text-[#f4f7f9]">Acesso Restrito por Perfil (RBAC)</h3>
    <p className="text-xs text-[#8f9aaa] max-w-md leading-relaxed">
      Seu perfil atual (<strong className="text-[#bdf35d]">{role}</strong>) possui escopo exclusivo.
      Para acessar esta área é necessário o perfil:{' '}
      <strong className="text-[#f4f7f9]">{requiredRole}</strong>.
    </p>
  </div>
);

export const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'Pesquisar por SKU, código, cliente ou ID...' }) => (
  <div className="relative w-full max-w-md">
    <SearchIcon className="w-4 h-4 text-[#8f9aaa] absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#090d13]/90 border border-[#222c38] focus:border-[#bdf35d] focus:ring-2 focus:ring-[#bdf35d]/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f4f7f9] placeholder-[#596576] focus:outline-none transition-all"
    />
  </div>
);

export const FileUploader: React.FC<{
  label: string;
  onUpload: (fileName: string) => void;
}> = ({ label, onUpload }) => (
  <div className="border border-dashed border-[#222c38] hover:border-[#bdf35d]/60 rounded-xl p-4 bg-[#090d13]/70 flex items-center justify-between gap-4 transition-colors">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#bdf35d]/10 border border-[#bdf35d]/20 flex items-center justify-center text-[#bdf35d]">
        <Upload className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xs font-semibold text-[#f4f7f9]">{label}</div>
        <div className="text-[11px] text-[#8f9aaa]">PDF, Laudo Técnico ou Rótulo ANVISA (Máx 10MB)</div>
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
    success: 'bg-[#0d1218]/95 border-[#49dfa0]/40 text-[#49dfa0]',
    error: 'bg-[#0d1218]/95 border-[#ff7080]/40 text-[#ff7080]',
    info: 'bg-[#0d1218]/95 border-[#65dbff]/40 text-[#65dbff]',
  }[toast.type];

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 border rounded-2xl px-4 py-3.5 shadow-2xl flex items-center gap-3 backdrop-blur-xl ${styles}`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : toast.type === 'error' ? (
        <ShieldAlert className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}
      <span className="text-xs font-semibold text-[#f4f7f9]">{toast.message}</span>
      <button onClick={onClose} className="text-[#8f9aaa] hover:text-white cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
