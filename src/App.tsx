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
  Package,
  PackageCheck,
  ShoppingBag,
  Sliders,
  Smartphone,
  Sparkles,
  Tag,
  Truck,
  UserCheck,
  Users,
  Webhook,
  X,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { AdminSection, AdminWorkspace } from './components/AdminWorkspace.tsx';
import { SellerTab, SellerWorkspace } from './components/SellerWorkspace.tsx';
import { PublicCustomerArea } from './components/PublicCustomerArea.tsx';
import {
  Badge,
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
  const [adminSection, setAdminSection] = useState<AdminSection>('DASHBOARD');
  const [sellerTab, setSellerTab] = useState<SellerTab>('DASHBOARD');
  const [publicOfferCode, setPublicOfferCode] = useState<string>('7XK29');

  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<boolean>(false);

  useEffect(() => {
    if (lightMode) {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [lightMode]);

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
      setAdminSection('FULFILLMENT');
    } else if (mode === 'ADMIN') {
      setAdminSection('DASHBOARD');
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

  const adminMenuGroups: {
    group: string;
    items: { id: AdminSection; num: string; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      group: 'Estratégia & Motor',
      items: [
        { id: 'DASHBOARD', num: '01', label: 'Visão & Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'PRODUTOS', num: '02', label: 'Catálogo & SKUs', icon: <Package className="w-4 h-4" /> },
        { id: 'DOCUMENTACAO', num: '03', label: 'Dossiê & Rotulagem', icon: <FileText className="w-4 h-4" /> },
        { id: 'OFERTAS', num: '04', label: 'Motor de Ofertas', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'COMBOS', num: '05', label: 'Kits & Combos', icon: <Layers className="w-4 h-4" /> },
        { id: 'CUPONS', num: '06', label: 'Cupons & Regras', icon: <Tag className="w-4 h-4" /> },
        { id: 'CAMPANHAS', num: '07', label: 'Campanhas & UTMs', icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Transação & Operação',
      items: [
        { id: 'PEDIDOS', num: '08', label: 'Pedidos (#LC-XXXXX)', icon: <ShoppingBag className="w-4 h-4" /> },
        { id: 'PAGAMENTOS', num: '09', label: 'Pagamentos & Conciliação', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'FULFILLMENT', num: '10', label: 'Fulfillment WMS', icon: <PackageCheck className="w-4 h-4" /> },
        { id: 'LOGISTICA', num: '11', label: 'Frete & Exceções', icon: <Truck className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Relacionamento & CRM',
      items: [
        { id: 'CRM', num: '12', label: 'Pipeline CRM', icon: <FolderKanban className="w-4 h-4" /> },
        { id: 'LEADS', num: '13', label: 'Leads & Interações', icon: <Users className="w-4 h-4" /> },
        { id: 'CLIENTES', num: '14', label: 'Clientes & LGPD', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'AUTOMACOES', num: '15', label: 'Pós-Venda & Recuperação', icon: <Zap className="w-4 h-4" /> },
        { id: 'VENDEDORES', num: '16', label: 'Vendedores & Atribuição', icon: <Users className="w-4 h-4" /> },
        { id: 'COMISSOES', num: '17', label: 'Comissões Congeladas', icon: <DollarSign className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Controle & Governança',
      items: [
        { id: 'ANALYTICS', num: '18', label: 'Analytics & Funil', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'ECONOMIA', num: '19', label: 'Economia Unitária', icon: <Calculator className="w-4 h-4" /> },
        { id: 'COMPLIANCE', num: '20', label: 'Compliance Gate', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'AUDITORIA', num: '21', label: 'Auditoria & Logs', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'USUARIOS', num: '22', label: 'Usuários & 2FA', icon: <KeyRound className="w-4 h-4" /> },
        { id: 'PERMISSOES', num: '23', label: 'Permissões RBAC', icon: <Lock className="w-4 h-4" /> },
        { id: 'INTEGRACOES', num: '24', label: 'Integrações & Decisões', icon: <Webhook className="w-4 h-4" /> },
        { id: 'CONFIGURACOES', num: '25', label: 'Configurações', icon: <Sliders className="w-4 h-4" /> },
      ],
    },
  ];

  const sellerMenuItems: { id: SellerTab; num: string; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', num: '01', label: 'Visão Comercial', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'LEADS', num: '02', label: 'Meus Leads', icon: <Users className="w-4 h-4" /> },
    { id: 'CLIENTES', num: '03', label: 'Clientes da Carteira', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'OFERTAS', num: '04', label: 'Ofertas Autorizadas', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'CRIAR_LINK', num: '05', label: 'Gerar Link (/o/...)', icon: <Link2 className="w-4 h-4" /> },
    { id: 'PEDIDOS', num: '06', label: 'Pedidos & Atendimento', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'COMISSOES', num: '07', label: 'Minhas Comissões', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'HISTORICO', num: '08', label: 'Histórico de Vendas', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen text-[#f4f7f9] flex">
      {/* FIXED SIDEBAR — Exact match with .side in the Blueprint HTML */}
      {workspaceMode !== 'PUBLIC_CUSTOMER' && (
        <aside
          className={`${
            mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 block' : 'hidden'
          } lg:block w-[270px] modern-sidebar shrink-0 h-screen sticky top-0 overflow-y-auto px-3.5 py-5`}
        >
          <div className="flex items-center justify-between px-2.5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-[38px] h-[38px] rounded-[12px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white grid place-items-center font-black text-[19px] shadow-[0_0_24px_rgba(99,102,241,0.45)]">
                L
              </div>
              <div>
                <b className="block text-sm font-extrabold tracking-tight text-[#f4f7f9]">
                  Leal Caps
                </b>
                <small className="block text-[10px] text-[#8f9aaa]">
                  Sales &amp; Fulfillment Platform
                </small>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden text-[#8f9aaa] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {workspaceMode === 'VENDEDOR' ? (
            <div className="space-y-1">
              <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#596576] px-2.5 pt-2 pb-1.5">
                Máquina Comercial
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-xs transition-all cursor-pointer ${
                      active
                        ? 'bg-[#111821] text-[#f4f7f9] font-semibold shadow-[inset_2.5px_0_0_#bdf35d]'
                        : 'text-[#aeb8c6] hover:bg-[#111821]/60 hover:text-[#f4f7f9]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={active ? 'text-[#bdf35d]' : 'text-[#697587]'}>
                        {item.icon}
                      </span>
                      <span>
                        {item.num} · {item.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {adminMenuGroups.map((grp) => (
                <div key={grp.group} className="space-y-0.5">
                  <div className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#596576] px-2.5 pt-2 pb-1.5">
                    {grp.group}
                  </div>
                  {grp.items.map((item) => {
                    const active = adminSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setAdminSection(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-[11.5px] transition-all cursor-pointer ${
                          active
                            ? 'bg-[#111821] text-[#f4f7f9] font-semibold shadow-[inset_2.5px_0_0_#bdf35d]'
                            : 'text-[#aeb8c6] hover:bg-[#111821]/60 hover:text-[#f4f7f9]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={active ? 'text-[#bdf35d]' : 'text-[#697587]'}>
                            {item.icon}
                          </span>
                          <span>
                            {item.num} · {item.label}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </aside>
      )}

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP GLASSMORPHIC HEADER (.top in the HTML) */}
        <header className="h-[68px] modern-glass-header px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 gap-4">
          <div className="flex items-center gap-3">
            {workspaceMode !== 'PUBLIC_CUSTOMER' && (
              <button
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-[#111821] text-[#8f9aaa] hover:text-white cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {workspaceMode === 'PUBLIC_CUSTOMER' && (
              <div className="flex items-center gap-2.5 mr-2">
                <div className="w-8 h-8 rounded-[10px] bg-[#bdf35d] text-[#081007] grid place-items-center font-black text-base">
                  L
                </div>
              </div>
            )}
            <div className="text-[11px] text-[#8f9aaa] tracking-wide">
              <b className="text-[#f4f7f9] font-bold">LEAL CAPS</b> /{' '}
              <span className="uppercase">
                {workspaceMode === 'PUBLIC_CUSTOMER'
                  ? `CHECKOUT OFICIAL (/o/${publicOfferCode})`
                  : workspaceMode === 'VENDEDOR'
                    ? `COMERCIAL · ${sellerTab}`
                    : `${workspaceMode} · ${adminSection}`}
              </span>
            </div>
          </div>

          {/* Environment & Role Switcher Pills */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <div className="flex items-center bg-[#0d1218] p-1 rounded-full border border-[#222c38] gap-1">
              <button
                onClick={() =>
                  handleSwitchProfile('tok_admin_demo', 'ADMIN', 'admin@lealcaps.com.br')
                }
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                  workspaceMode === 'ADMIN'
                    ? 'bg-[#bdf35d] text-[#081007] shadow-[0_0_16px_rgba(189,243,93,0.35)]'
                    : 'text-[#8f9aaa] hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() =>
                  handleSwitchProfile('tok_seller1_demo', 'VENDEDOR', 'camila@lealcaps.com.br')
                }
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                  workspaceMode === 'VENDEDOR' && token === 'tok_seller1_demo'
                    ? 'bg-[#65dbff] text-[#06131a] shadow-[0_0_16px_rgba(101,219,255,0.35)]'
                    : 'text-[#8f9aaa] hover:text-white'
                }`}
              >
                Vendedor (Camila)
              </button>
              <button
                onClick={() =>
                  handleSwitchProfile('tok_seller2_demo', 'VENDEDOR', 'rafael@lealcaps.com.br')
                }
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                  workspaceMode === 'VENDEDOR' && token === 'tok_seller2_demo'
                    ? 'bg-[#65dbff] text-[#06131a] shadow-[0_0_16px_rgba(101,219,255,0.35)]'
                    : 'text-[#8f9aaa] hover:text-white'
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
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                  workspaceMode === 'FULFILLMENT'
                    ? 'bg-[#ffbd67] text-[#170e02] shadow-[0_0_16px_rgba(255,189,103,0.35)]'
                    : 'text-[#8f9aaa] hover:text-white'
                }`}
              >
                Fulfillment
              </button>
              <button
                onClick={() => setWorkspaceMode('PUBLIC_CUSTOMER')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  workspaceMode === 'PUBLIC_CUSTOMER'
                    ? 'bg-[#49dfa0] text-[#05140d] shadow-[0_0_16px_rgba(73,223,160,0.35)]'
                    : 'text-[#8f9aaa] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Checkout (/o/{publicOfferCode})
              </button>
            </div>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => setLightMode(!lightMode)}
            >
              {lightMode ? 'Modo Escuro' : 'Modo Claro'}
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
          <main className="flex-1 max-w-[1450px] w-full mx-auto p-5 lg:p-8">
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
              !['FULFILLMENT', 'LOGISTICA', 'PEDIDOS'].includes(adminSection) ? (
              <div className="space-y-4">
                <PermissionDeniedState
                  role="FULFILLMENT"
                  requiredRole="ADMIN (Ou acesse os módulos Fulfillment WMS / Frete & Exceções / Pedidos)"
                />
                <div className="flex justify-center">
                  <Button onClick={() => setAdminSection('FULFILLMENT')}>
                    Abrir Fila de Fulfillment WMS
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

          <div className="bg-[#080d13] border border-[#222c38] rounded-xl p-3.5 text-xs text-[#8f9aaa] space-y-1">
            <div className="text-[#bdf35d] font-bold mb-1">Acessos Rápidos Configurados:</div>
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
              className="text-[#65dbff] hover:underline cursor-pointer"
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
