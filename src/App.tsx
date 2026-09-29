import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  BarChart3,
  Calculator,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  FileText,
  FolderKanban,
  KeyRound,
  Layers,
  LayoutDashboard,
  Link2,
  Lock,
  Menu,
  Moon,
  Package,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Truck,
  UserCheck,
  Users,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { AdminSection, AdminWorkspace } from './components/AdminWorkspace.tsx';
import { SellerTab, SellerWorkspace } from './components/SellerWorkspace.tsx';
import { PublicCustomerArea } from './components/PublicCustomerArea.tsx';
import {
  Button,
  Input,
  LoadingState,
  Modal,
  PermissionDeniedState,
  ToastBanner,
} from './components/ui/DesignSystem.tsx';
import {
  AuditLog,
  AutomationRule,
  Campaign,
  Commission,
  ComplianceReview,
  Coupon,
  Customer,
  Lead,
  Offer,
  OfferLink,
  Order,
  Payment,
  PrivacyRequest,
  Product,
  Shipment,
  UnitEconomicsConfig,
  User,
} from './types/domain.ts';
import { signInWithGoogle } from './firebase.ts';

type WorkspaceMode = 'ADMIN' | 'VENDEDOR' | 'FULFILLMENT' | 'PUBLIC_CUSTOMER';

interface BootstrapData {
  user: User;
  products: Product[];
  offers: Offer[];
  offerLinks: OfferLink[];
  campaigns: Campaign[];
  coupons: Coupon[];
  customers: Customer[];
  leads: Lead[];
  orders: Order[];
  payments: Payment[];
  shipments: Shipment[];
  commissions: Commission[];
  automationRules: AutomationRule[];
  complianceReviews: ComplianceReview[];
  unitEconomicsConfig: UnitEconomicsConfig;
  auditLogs: AuditLog[];
  users: Omit<User, 'passwordHash'>[];
  privacyRequests: PrivacyRequest[];
}

export default function App() {
  const [token, setToken] = useState<string>('tok_admin_demo');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('ADMIN');
  const [adminSection, setAdminSection] = useState<AdminSection>('VISAO_GERAL');
  const [sellerTab, setSellerTab] = useState<SellerTab>('DASHBOARD');
  const [publicOfferCode, setPublicOfferCode] = useState<string>('7XK29');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Login / Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('admin@lealcaps.com.br');
  const [loginPassword, setLoginPassword] = useState('LealAdmin#2026');
  const [twoFactorCode, setTwoFactorCode] = useState('482910');
  const [recoveryMode, setRecoveryMode] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ message, type });
    },
    []
  );

  const fetchBootstrap = useCallback(
    async (activeToken = token) => {
      try {
        const res = await fetch('/api/bootstrap', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        notify('Erro ao sincronizar estado com o backend.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [token, notify]
  );

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/o/')) {
      const codeFromUrl = path.replace('/o/', '').split('/')[0].toUpperCase();
      if (codeFromUrl) {
        setPublicOfferCode(codeFromUrl);
        setWorkspaceMode('PUBLIC_CUSTOMER');
      }
    }
    fetchBootstrap(token);
  }, [token, fetchBootstrap]);

  const handleSwitchProfile = async (
    newToken: string,
    mode: WorkspaceMode,
    defaultEmail: string
  ) => {
    setToken(newToken);
    setWorkspaceMode(mode);
    setLoginEmail(defaultEmail);
    if (mode === 'FULFILLMENT') {
      setAdminSection('ENTREGAS');
    } else if (mode === 'ADMIN') {
      setAdminSection('VISAO_GERAL');
    }
    await fetchBootstrap(newToken);
    notify(`Ambiente ativo: ${mode}`, 'info');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryMode) {
      await fetch('/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      notify('Instruções de redefinição enviadas e registradas no AuditLog.', 'success');
      setRecoveryMode(false);
      setAuthModalOpen(false);
      return;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginEmail,
        password: loginPassword,
        twoFactorCode,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      notify(result.error || 'Falha na autenticação.', 'error');
    } else {
      setToken(result.token);
      setWorkspaceMode(result.user.role as WorkspaceMode);
      setAuthModalOpen(false);
      notify(`Autenticado como ${result.user.name} (${result.user.role})`, 'success');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      notify('Autenticado com Google via Firebase Auth!', 'success');
      setAuthModalOpen(false);
    } catch {
      notify('Use as credenciais operacionais abaixo ou abra em nova janela para popup OAuth.', 'info');
    }
  };

  // Navegação Administrativa Enxuta (7 Áreas Essenciais)
  const adminMenuItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'VISAO_GERAL', label: 'Visão Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'PRODUTOS', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
    { id: 'VENDAS', label: 'Vendas', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'CLIENTES', label: 'Clientes', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'ENTREGAS', label: 'Entregas', icon: <Truck className="w-4 h-4" /> },
    { id: 'VENDEDORES', label: 'Vendedores', icon: <Users className="w-4 h-4" /> },
    { id: 'CONFIGURACOES', label: 'Configurações', icon: <Sliders className="w-4 h-4" /> },
  ];

  const sellerMenuItems: { id: SellerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', label: 'Visão Geral', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'OFERTAS', label: 'Ofertas & Links', icon: <Link2 className="w-4 h-4" /> },
    { id: 'PEDIDOS', label: 'Pedidos', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'CLIENTES', label: 'Clientes', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'LEADS', label: 'Atendimentos', icon: <Users className="w-4 h-4" /> },
    { id: 'COMISSOES', label: 'Comissões', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex">
      {/* SLEEK MODERN SIDEBAR */}
      {workspaceMode !== 'PUBLIC_CUSTOMER' && (
        <aside
          className={`${
            mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 block' : 'hidden'
          } lg:block w-[264px] modern-sidebar shrink-0 h-screen sticky top-0 overflow-y-auto px-3.5 py-5`}
        >
          <div className="flex items-center justify-between px-2.5 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white grid place-items-center font-extrabold text-base shadow-[0_6px_16px_rgba(79,70,229,0.35)]">
                L
              </div>
              <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                Leal Caps
              </span>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {workspaceMode === 'VENDEDOR' ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] px-3 pt-2 pb-1.5">
                Operação Comercial
              </div>
              {sellerMenuItems.map((item) => {
                const active = sellerTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSellerTab(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] px-3 pt-2 pb-1.5">
                Menu Principal
              </div>
              {adminMenuItems.map((item) => {
                const active = adminSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAdminSection(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={
                          active
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-[var(--text-muted)]'
                        }
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      )}

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR CONTRACT: 3 ZONES (Brand | Segmented Workspace Nav | Theme + Session Actions) */}
        <header className="h-16 modern-glass-header px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 gap-4">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            {workspaceMode !== 'PUBLIC_CUSTOMER' && (
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <span className="text-base font-extrabold tracking-tight text-[var(--text-primary)] whitespace-nowrap">
              Leal Caps
            </span>
          </div>

          {/* Zone 2: Segmented Workspace & Role Controls */}
          <nav className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1 overflow-x-auto">
            <button
              onClick={() =>
                handleSwitchProfile('tok_admin_demo', 'ADMIN', 'admin@lealcaps.com.br')
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                workspaceMode === 'ADMIN'
                  ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() =>
                handleSwitchProfile('tok_seller1_demo', 'VENDEDOR', 'camila@lealcaps.com.br')
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                workspaceMode === 'VENDEDOR' && token === 'tok_seller1_demo'
                  ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Vendedor (Camila)
            </button>
            <button
              onClick={() =>
                handleSwitchProfile('tok_seller2_demo', 'VENDEDOR', 'rafael@lealcaps.com.br')
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                workspaceMode === 'VENDEDOR' && token === 'tok_seller2_demo'
                  ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Vendedor (Rafael)
            </button>
            <button
              onClick={() =>
                handleSwitchProfile(
                  'tok_fulfillment_demo',
                  'FULFILLMENT',
                  'logistica@lealcaps.com.br'
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                workspaceMode === 'FULFILLMENT'
                  ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Fulfillment
            </button>
            <button
              onClick={() => setWorkspaceMode('PUBLIC_CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                workspaceMode === 'PUBLIC_CUSTOMER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Checkout (/o/{publicOfferCode})
            </button>
          </nav>

          {/* Zone 3: Theme Switcher & Session Action */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="xs"
              icon={darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => setDarkMode(!darkMode)}
              title="Alternar Tema Claro / Escuro"
            >
              {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              icon={<KeyRound className="w-3.5 h-3.5" />}
              onClick={() => setAuthModalOpen(true)}
            >
              Sessão
            </Button>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        {workspaceMode === 'PUBLIC_CUSTOMER' ? (
          <PublicCustomerArea
            initialOfferCode={publicOfferCode}
            availableLinks={[
              ...(data?.offerLinks || []).map((l) => ({ code: l.code, name: l.code })),
              ...(data?.offers || [])
                .filter((o) => o.status === 'ACTIVE' && o.complianceStatus === 'APPROVED')
                .map((o) => ({ code: o.code, name: o.name })),
            ].filter((v, i, arr) => arr.findIndex((x) => x.code === v.code) === i)}
            onNotify={notify}
            onOrderCreatedOrUpdated={() => fetchBootstrap(token)}
          />
        ) : (
          <main className="flex-1 max-w-[1440px] w-full mx-auto p-5 lg:p-8">
            {loading || !data ? (
              <LoadingState message="Carregando infraestrutura Leal Caps..." />
            ) : workspaceMode === 'VENDEDOR' ? (
              <SellerWorkspace
                activeTab={sellerTab}
                setActiveTab={setSellerTab}
                user={data.user}
                token={token}
                offers={data.offers}
                offerLinks={data.offerLinks}
                campaigns={data.campaigns}
                coupons={data.coupons}
                leads={data.leads}
                customers={data.customers}
                orders={data.orders}
                commissions={data.commissions}
                onRefresh={() => fetchBootstrap(token)}
                onOpenPublicLink={(code) => {
                  setPublicOfferCode(code);
                  setWorkspaceMode('PUBLIC_CUSTOMER');
                }}
                onNotify={notify}
              />
            ) : workspaceMode === 'FULFILLMENT' &&
              !['ENTREGAS', 'VENDAS', 'FULFILLMENT', 'LOGISTICA', 'PEDIDOS'].includes(adminSection) ? (
              <div className="space-y-4">
                <PermissionDeniedState
                  role="FULFILLMENT"
                  requiredRole="ADMIN (Acesso restrito a Entregas e Pedidos)"
                />
                <div className="flex justify-center">
                  <Button onClick={() => setAdminSection('ENTREGAS')}>
                    Ir para Central de Entregas
                  </Button>
                </div>
              </div>
            ) : (
              <AdminWorkspace
                section={adminSection}
                setSection={setAdminSection}
                user={data.user}
                token={token}
                products={data.products}
                offers={data.offers}
                offerLinks={data.offerLinks}
                campaigns={data.campaigns}
                coupons={data.coupons}
                customers={data.customers}
                leads={data.leads}
                orders={data.orders}
                payments={data.payments}
                shipments={data.shipments}
                commissions={data.commissions}
                automationRules={data.automationRules}
                complianceReviews={data.complianceReviews}
                unitEconomicsConfig={data.unitEconomicsConfig}
                auditLogs={data.auditLogs}
                users={data.users}
                privacyRequests={data.privacyRequests}
                onRefresh={() => fetchBootstrap(token)}
                onOpenPublicLink={(code) => {
                  setPublicOfferCode(code);
                  setWorkspaceMode('PUBLIC_CUSTOMER');
                }}
                onNotify={notify}
              />
            )}
          </main>
        )}
      </div>

      {/* MODAL: AUTENTICAÇÃO COMPLETA */}
      <Modal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title={
          recoveryMode
            ? 'Recuperação & Redefinição de Senha'
            : 'Autenticação Operacional Segura (RBAC + 2FA)'
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <Input
            label="E-mail Corporativo"
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
          />
          {!recoveryMode && (
            <>
              <Input
                label="Senha"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              <Input
                label="Código 2FA"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                hint="Autenticação em 2 fatores ativa para Administração"
              />
            </>
          )}

          <div className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-3.5 text-xs text-[var(--text-secondary)] space-y-1">
            <div className="text-indigo-600 dark:text-indigo-400 font-bold mb-1">
              Credenciais Operacionais Configuradas:
            </div>
            <div>• Admin: admin@lealcaps.com.br / LealAdmin#2026</div>
            <div>• Vendedor 1: camila@lealcaps.com.br / Vendedor#2026</div>
            <div>• Vendedor 2: rafael@lealcaps.com.br / Vendedor#2026</div>
            <div>• Fulfillment: logistica@lealcaps.com.br / Logistica#2026</div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button type="submit" className="w-full">
              {recoveryMode ? 'Enviar Link de Recuperação' : 'Entrar na Plataforma'}
            </Button>
            {!recoveryMode && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleGoogleLogin}
              >
                Continuar com Google (Firebase Auth)
              </Button>
            )}
          </div>

          <div className="flex justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => setRecoveryMode(!recoveryMode)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {recoveryMode ? '← Voltar para o Login' : 'Esqueceu a senha? Recuperar acesso'}
            </button>
          </div>
        </form>
      </Modal>

      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
