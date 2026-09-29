import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Layers,
  Link2,
  Lock,
  Package,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  Badge,
  BarChartSimple,
  Button,
  Card,
  EmptyState,
  FileUploader,
  Input,
  KPI,
  Modal,
  SearchBar,
  Select,
  StatusBadge,
  Timeline,
} from './ui/DesignSystem.tsx';
import {
  AuditLog,
  AutomationRule,
  Campaign,
  Commission,
  ComplianceReview,
  ComplianceState,
  Coupon,
  Customer,
  ExceptionType,
  Lead,
  Offer,
  OfferLink,
  OperationalStatus,
  Order,
  Payment,
  PrivacyRequest,
  PRODUCT_CATEGORIES,
  Product,
  ProductCategory,
  Shipment,
  UnitEconomicsConfig,
  User,
} from '../types/domain.ts';

export type AdminSection =
  | 'VISAO_GERAL'
  | 'PRODUTOS'
  | 'VENDAS'
  | 'CLIENTES'
  | 'ENTREGAS'
  | 'VENDEDORES'
  | 'CONFIGURACOES'
  // Legacy aliases mapped seamlessly to the 7 core areas
  | 'DASHBOARD'
  | 'DOCUMENTACAO'
  | 'OFERTAS'
  | 'COMBOS'
  | 'CUPONS'
  | 'CAMPANHAS'
  | 'LEADS'
  | 'PEDIDOS'
  | 'PAGAMENTOS'
  | 'LOGISTICA'
  | 'FULFILLMENT'
  | 'COMISSOES'
  | 'CRM'
  | 'AUTOMACOES'
  | 'ANALYTICS'
  | 'ECONOMIA'
  | 'COMPLIANCE'
  | 'USUARIOS'
  | 'PERMISSOES'
  | 'AUDITORIA'
  | 'INTEGRACOES';

export const AdminWorkspace: React.FC<{
  section: AdminSection;
  setSection: (s: AdminSection) => void;
  user: User;
  token: string;
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
  onRefresh: () => void;
  onOpenPublicLink: (code: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({
  section,
  setSection,
  token,
  products,
  offers,
  offerLinks,
  campaigns,
  coupons,
  customers,
  leads,
  orders,
  payments,
  commissions,
  automationRules,
  complianceReviews,
  unitEconomicsConfig,
  auditLogs,
  users,
  onRefresh,
  onOpenPublicLink,
  onNotify,
}) => {
  // Normalize any legacy section into the 7 primary navigation areas
  const activeArea = (() => {
    if (['VISAO_GERAL', 'DASHBOARD', 'ANALYTICS', 'ECONOMIA'].includes(section)) return 'VISAO_GERAL';
    if (['PRODUTOS', 'DOCUMENTACAO', 'COMBOS', 'COMPLIANCE'].includes(section)) return 'PRODUTOS';
    if (['VENDAS', 'OFERTAS', 'CUPONS', 'CAMPANHAS', 'PEDIDOS', 'PAGAMENTOS'].includes(section))
      return 'VENDAS';
    if (['CLIENTES', 'CRM', 'LEADS'].includes(section)) return 'CLIENTES';
    if (['ENTREGAS', 'FULFILLMENT', 'LOGISTICA'].includes(section)) return 'ENTREGAS';
    if (['VENDEDORES', 'COMISSOES'].includes(section)) return 'VENDEDORES';
    return 'CONFIGURACOES';
  })();

  // Contextual sub-tabs inside each of the 7 clean areas
  const [showOverviewAnalytics, setShowOverviewAnalytics] = useState(false);
  const [productTab, setProductTab] = useState<'CATALOGO' | 'COMBOS' | 'COMPLIANCE'>('CATALOGO');
  const [salesTab, setSalesTab] = useState<'PEDIDOS' | 'OFERTAS' | 'CUPONS_CAMPANHAS'>('OFERTAS');
  const [customerTab, setCustomerTab] = useState<'COMPRADORES' | 'LEADS'>('COMPRADORES');
  const [deliveryFilter, setDeliveryFilter] = useState<
    'ALL' | 'AGUARDANDO' | 'ENVIADOS' | 'PROBLEMAS' | 'ENTREGUES'
  >('ALL');
  const [settingsTab, setSettingsTab] = useState<
    'REGRAS' | 'USUARIOS' | 'INTEGRACOES' | 'AUTOMACOES' | 'AUDITORIA'
  >('REGRAS');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers[0]?.id || null
  );

  // Product Create/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    sku: 'LC-META-100C',
    internalName: 'Composto Metabólico Inositol + Cromo 100 Caps',
    commercialName: 'Leal MetaControl 100 Cápsulas',
    category: 'Emagrecimento' as ProductCategory,
    description: 'Suplemento alimentar em cápsulas com Picolinato de Cromo e Inositol.',
    composition: 'Inositol (500mg), Picolinato de Cromo (250mcg), Bisglicinato de Magnésio (150mg).',
    presentation: 'Frasco âmbar 100 cápsulas',
    unitQuantity: 100,
    batchNumber: 'LT-2026-10M',
    expiryDate: '2028-10-30',
    unitCost: 15.0,
    stockQuantity: 500,
    regulatoryInfo: 'Suplemento alimentar notificado conforme exigência ANVISA.',
    warnings: 'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA.',
    usageInstructions: 'Ingerir 2 cápsulas ao dia.',
  });

  // Offer Engine Modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    code: 'K2META',
    name: 'Kit 2x Leal LipoTherm Pro — Condição Especial',
    offerType: 'KIT_2',
    productId: products[0]?.id || 'prd_01',
    quantity: 2,
    regularPrice: 398.0,
    promotionalPrice: 269.9,
    maxCouponDiscountPercent: 10,
    usageLimit: 250,
    freeShipping: true,
    shippingSubsidy: 18.9,
    sellerId: '',
    campaignId: campaigns[0]?.id || 'cmp_01',
    complianceStatus: 'APPROVED' as ComplianceState,
  });

  // Coupon Modal
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: 'PROMO15',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    maxUsesGlobal: 200,
    maxUsesPerCustomer: 1,
  });

  // Economics Config & Simulator State
  const [econConfig, setEconConfig] = useState<UnitEconomicsConfig>(unitEconomicsConfig);
  const [simRevenue, setSimRevenue] = useState(279.9);
  const [simDiscount, setSimDiscount] = useState(27.99);
  const [simProdCost, setSimProdCost] = useState(30.0);
  const [simShipSubsidy, setSimShipSubsidy] = useState(18.9);

  // ============================================================================
  // CORE METRICS FOR LEAN DASHBOARD
  // ============================================================================
  const approvedOrders = orders.filter((o) => o.financialStatus === 'approved');
  const pendingPaymentOrders = orders.filter((o) => o.financialStatus === 'pending');
  const grossSales = approvedOrders.reduce((acc, o) => acc + o.total, 0);
  const receivablePending = pendingPaymentOrders.reduce((acc, o) => acc + o.total, 0);
  const avgTicket = approvedOrders.length > 0 ? grossSales / approvedOrders.length : 0;

  // Actionable Alerts & Bottlenecks
  const awaitingPreparationOrders = orders.filter(
    (o) =>
      o.financialStatus === 'approved' &&
      ['waiting', 'picking', 'packing', 'ready_to_ship'].includes(o.operationalStatus)
  );
  const exceptionOrders = orders.filter((o) => o.operationalStatus === 'exception');
  const pendingComplianceOffers = offers.filter((o) => o.complianceStatus !== 'APPROVED');

  // ============================================================================
  // PRESERVED API HANDLERS (100% Backend Rules Intact)
  // ============================================================================
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(prodForm),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Erro ao salvar produto.', 'error');
    } else {
      onNotify(
        editingProduct
          ? `Produto ${data.product.sku} atualizado!`
          : `Produto ${data.product.sku} cadastrado com sucesso!`,
        'success'
      );
      setProductModalOpen(false);
      setEditingProduct(null);
      onRefresh();
    }
  };

  const handleDuplicateProduct = async (id: string) => {
    const res = await fetch(`/api/products/${id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      onNotify(`Produto duplicado: ${data.product.sku}`, 'success');
      onRefresh();
    } else {
      onNotify(data.error || 'Erro ao duplicar.', 'error');
    }
  };

  const handleToggleProductStatus = async (prod: Product) => {
    const nextStatus = prod.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const res = await fetch(`/api/products/${prod.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      onNotify(`Status do produto ${prod.sku} alterado para ${nextStatus}.`, 'info');
      onRefresh();
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenProd = products.find((p) => p.id === offerForm.productId) || products[0];
    const res = await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...offerForm,
        items: [
          {
            id: `ofi_${Date.now()}`,
            offerId: '',
            productId: chosenProd.id,
            productName: chosenProd.commercialName,
            sku: chosenProd.sku,
            quantity: Number(offerForm.quantity),
            unitCost: chosenProd.unitCost,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Oferta bloqueada pelo motor comercial.', 'error');
    } else {
      onNotify(`Oferta /o/${data.offer.code} criada com sucesso!`, 'success');
      setOfferModalOpen(false);
      onRefresh();
    }
  };

  const handlePublishOffer = async (offerId: string) => {
    const res = await fetch(`/api/offers/${offerId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Publicação bloqueada pelo Compliance Gate.', 'error');
    } else {
      onNotify(`Oferta ${data.offer.code} ativada e publicada!`, 'success');
      onRefresh();
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(couponForm),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Erro ao criar cupom.', 'error');
    } else {
      onNotify(`Cupom ${data.coupon.code} criado!`, 'success');
      setCouponModalOpen(false);
      onRefresh();
    }
  };

  const handleUpdateOrderOperationalStatus = async (
    orderId: string,
    operationalStatus: OperationalStatus,
    exceptionReason?: ExceptionType
  ) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        operationalStatus,
        exceptionReason: exceptionReason || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Não foi possível alterar status operacional.', 'error');
    } else {
      setSelectedOrder(data.order);
      onNotify(
        `Pedido ${data.order.orderNumber} atualizado para ${operationalStatus.toUpperCase()}!`,
        'success'
      );
      onRefresh();
    }
  };

  const handleRefundPayment = async (paymentId: string) => {
    const res = await fetch(`/api/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: 'Reembolso administrativo autorizado' }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Erro ao reembolsar.', 'error');
    } else {
      onNotify(`Pagamento reembolsado com sucesso!`, 'info');
      onRefresh();
    }
  };

  const handleUpdateCompliance = async (
    review: ComplianceReview,
    newStatus?: ComplianceState,
    toggleKey?: keyof ComplianceReview['checklist']
  ) => {
    const nextChecklist = toggleKey
      ? { ...review.checklist, [toggleKey]: !review.checklist[toggleKey] }
      : review.checklist;

    const res = await fetch(`/api/compliance/${review.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        checklist: nextChecklist,
        status: newStatus || review.status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Bloqueado pelo Compliance Gate.', 'error');
    } else {
      onNotify(`Compliance atualizado (${data.review.status}).`, 'success');
      onRefresh();
    }
  };

  const handleSaveEconomicsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/economics/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(econConfig),
    });
    if (res.ok) {
      onNotify('Regras comerciais e limites de margem salvos!', 'success');
      onRefresh();
    }
  };

  const handleAnonymizeCustomer = async (customerId: string) => {
    const res = await fetch(`/api/privacy/anonymize/${customerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ purpose: 'Solicitação de anonimização LGPD' }),
    });
    if (res.ok) {
      onNotify('Dados do cliente anonimizados conforme LGPD.', 'info');
      onRefresh();
    }
  };

  // Unit Economics Simulator Math
  const netAfterDiscount = Math.max(0, simRevenue - simDiscount);
  const simTaxes = (netAfterDiscount * econConfig.taxRatePercent) / 100;
  const simGateway = (netAfterDiscount * econConfig.gatewayFeePercent) / 100 + 0.99;
  const simCommission = (netAfterDiscount * econConfig.defaultCommissionPercent) / 100;
  const simContribution =
    simRevenue -
    simDiscount -
    simTaxes -
    simGateway -
    simCommission -
    simProdCost -
    econConfig.packagingAndOpCostPerOrder -
    simShipSubsidy -
    econConfig.defaultCacTarget;
  const simMarginPct = netAfterDiscount > 0 ? (simContribution / netAfterDiscount) * 100 : -100;

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. VISÃO GERAL — Enxuta, comercial e focada no que importa */}
      {/* ==================================================================== */}
      {activeArea === 'VISAO_GERAL' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Visão Geral da Operação
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Acompanhe vendas, valores a receber, pendências operacionais e pedidos recentes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowOverviewAnalytics(!showOverviewAnalytics)}
              >
                {showOverviewAnalytics ? 'Ocultar Relatório de Margem' : 'Relatório de Margem & Funil'}
              </Button>
              <Button
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setSection('VENDAS');
                  setSalesTab('OFERTAS');
                  setOfferModalOpen(true);
                }}
              >
                Nova Oferta
              </Button>
            </div>
          </div>

          {/* 4 KPIs Essenciais: Quanto vendemos? Quantos pedidos? Quanto a receber? O que precisa de atenção? */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Quanto Vendemos (Aprovado)"
              value={`R$ ${grossSales.toFixed(2)}`}
              subvalue={`Ticket médio: R$ ${avgTicket.toFixed(2)}`}
              accent="emerald"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KPI
              label="Total de Pedidos"
              value={orders.length}
              subvalue={`${approvedOrders.length} pagos · ${
                orders.filter((o) => o.operationalStatus === 'delivered').length
              } entregues`}
              accent="lime"
              icon={<Package className="w-4 h-4" />}
            />
            <KPI
              label="Valores a Receber / Compensar"
              value={`R$ ${receivablePending.toFixed(2)}`}
              subvalue={`${pendingPaymentOrders.length} pagamentos aguardando confirmação`}
              accent="cyan"
              icon={<CreditCard className="w-4 h-4" />}
            />
            <KPI
              label="Precisa de Atenção Agora"
              value={awaitingPreparationOrders.length + exceptionOrders.length}
              subvalue={`${awaitingPreparationOrders.length} para enviar · ${exceptionOrders.length} com problema`}
              accent={exceptionOrders.length > 0 ? 'danger' : 'amber'}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* Bloco de Alertas & Pendências + Pedidos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* O que precisa da nossa atenção */}
            <div className="lg:col-span-5">
              <Card
                title="Alertas & Pendências Operacionais"
                subtitle="Ações rápidas para destravar pedidos e vendas do dia"
              >
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                        <PackageCheck className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {awaitingPreparationOrders.length} pedido(s) pagos aguardando envio
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Prontos para separação e emissão de etiqueta
                        </div>
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        setSection('ENTREGAS');
                        setDeliveryFilter('AGUARDANDO');
                      }}
                    >
                      Enviar
                    </Button>
                  </div>

                  {exceptionOrders.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-rose-500/[0.06] border border-rose-500/20 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                            {exceptionOrders.length} entrega(s) com exceção na transportadora
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            Ex: {exceptionOrders[0].orderNumber} ({exceptionOrders[0].exceptionReason})
                          </div>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => {
                          setSection('ENTREGAS');
                          setDeliveryFilter('PROBLEMAS');
                        }}
                      >
                        Resolver
                      </Button>
                    </div>
                  )}

                  {pendingComplianceOffers.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <ClipboardCheck className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            {pendingComplianceOffers.length} oferta(s) aguardando liberação
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            Conferir checklist do produto antes de ativar link
                          </div>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setSection('PRODUTOS');
                          setProductTab('COMPLIANCE');
                        }}
                      >
                        Revisar
                      </Button>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {offers.filter((o) => o.status === 'ACTIVE').length} ofertas ativas vendendo hoje
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Links públicos prontos para os vendedores
                        </div>
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => {
                        setSection('VENDAS');
                        setSalesTab('OFERTAS');
                      }}
                    >
                      Ver Ofertas
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quais foram os pedidos recentes? */}
            <div className="lg:col-span-7">
              <Card
                title="Pedidos Recentes"
                subtitle="Clique em qualquer pedido para abrir os detalhes ou avançar o envio"
                action={
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setSection('VENDAS');
                      setSalesTab('PEDIDOS');
                    }}
                  >
                    Ver Todos os Pedidos
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <th className="py-2.5 px-2 font-semibold">Pedido</th>
                        <th className="py-2.5 px-2 font-semibold">Cliente</th>
                        <th className="py-2.5 px-2 font-semibold">Oferta</th>
                        <th className="py-2.5 px-2 font-semibold">Pagamento</th>
                        <th className="py-2.5 px-2 font-semibold">Entrega</th>
                        <th className="py-2.5 px-2 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {orders.slice(0, 6).map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setSelectedOrder(ord);
                            setSection('VENDAS');
                            setSalesTab('PEDIDOS');
                          }}
                          className="hover:bg-[var(--bg-subtle)]/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-2 font-medium text-[var(--text-primary)]">
                            {ord.customerSnapshot.name}
                          </td>
                          <td className="py-3 px-2 text-[var(--text-secondary)]">
                            {ord.offerName.slice(0, 26)}...
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={ord.financialStatus} />
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={ord.operationalStatus} />
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            R$ {ord.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>

          {/* Relatório Opcional de Economia Unitária & Funil (incorporado ao Dashboard quando solicitado) */}
          {showOverviewAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              <Card
                title="Funil Comercial de Conversão"
                subtitle="Visitas nos links (/o/...) → Checkout → Pedidos Pagos → Entregues"
              >
                <BarChartSimple
                  data={[
                    { label: 'Visitas nos Links de Oferta', value: 575 },
                    { label: 'Checkouts Iniciados', value: 138 },
                    { label: 'Pedidos Gerados', value: 89 },
                    { label: 'Pagamentos Confirmados', value: 76 },
                    { label: 'Pedidos Entregues', value: 64 },
                    { label: 'Recompras Realizadas', value: 22 },
                  ]}
                />
              </Card>

              <Card
                title="Simulador Rápido de Margem por Venda"
                subtitle="Receita líquida após impostos, gateway, comissão, custo do pote e frete"
              >
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Input
                    label="Preço da Oferta (R$)"
                    type="number"
                    value={simRevenue}
                    onChange={(e) => setSimRevenue(Number(e.target.value))}
                  />
                  <Input
                    label="Desconto Cupom (R$)"
                    type="number"
                    value={simDiscount}
                    onChange={(e) => setSimDiscount(Number(e.target.value))}
                  />
                  <Input
                    label="Custo dos Potes (R$)"
                    type="number"
                    value={simProdCost}
                    onChange={(e) => setSimProdCost(Number(e.target.value))}
                  />
                  <Input
                    label="Frete Subsidiado (R$)"
                    type="number"
                    value={simShipSubsidy}
                    onChange={(e) => setSimShipSubsidy(Number(e.target.value))}
                  />
                </div>
                <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-xl p-4 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>Receita Líquida (após cupom):</span>
                    <strong>R$ {netAfterDiscount.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Impostos + Gateway + Comissão ({econConfig.defaultCommissionPercent}%):</span>
                    <span>- R$ {(simTaxes + simGateway + simCommission).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Produto + Embalagem + Frete + CAC:</span>
                    <span>
                      - R${' '}
                      {(
                        simProdCost +
                        econConfig.packagingAndOpCostPerOrder +
                        simShipSubsidy +
                        econConfig.defaultCacTarget
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between text-sm font-bold">
                    <span>Lucro / Margem de Contribuição:</span>
                    <span
                      className={
                        simMarginPct >= econConfig.minContributionMarginPercent
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500'
                      }
                    >
                      R$ {simContribution.toFixed(2)} ({simMarginPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PRODUTOS — Produtos + Combos + Documentação/Compliance no mesmo lugar */}
      {/* ==================================================================== */}
      {activeArea === 'PRODUTOS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Produtos, Combos & Conformidade
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Gerencie os itens físicos em estoque, kits/combos e documentação regulatória de cada produto.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  onClick={() => setProductTab('CATALOGO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'CATALOGO'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Produtos ({products.length})
                </button>
                <button
                  onClick={() => setProductTab('COMBOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'COMBOS'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Kits & Combos
                </button>
                <button
                  onClick={() => setProductTab('COMPLIANCE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'COMPLIANCE'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Aprovação & Rótulos ({complianceReviews.length})
                </button>
              </div>

              <Button
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
              >
                Novo Produto
              </Button>
            </div>
          </div>

          {productTab === 'CATALOGO' && (
            <div className="space-y-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar produto por nome, SKU ou categoria..."
              />

              <div className="grid grid-cols-1 gap-4">
                {products
                  .filter(
                    (p) =>
                      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.commercialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((prod) => (
                    <Card key={prod.id}>
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex gap-4">
                          <img
                            src={
                              prod.images[0]?.url ||
                              '/src/assets/images/product_lipotherm_pro_1790723418728.jpg'
                            }
                            alt={prod.commercialName}
                            referrerPolicy="no-referrer"
                            className="w-24 h-24 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0"
                          />
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="lime">SKU: {prod.sku}</Badge>
                              <Badge tone="cyan">{prod.category}</Badge>
                              <StatusBadge status={prod.status} />
                            </div>
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                              {prod.commercialName}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">{prod.description}</p>
                            <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono text-[var(--text-secondary)]">
                              <span>Apresentação: {prod.presentation}</span>
                              <span>Lote: {prod.batchNumber}</span>
                              <span>Validade: {prod.expiryDate}</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                Custo: R$ {prod.unitCost.toFixed(2)}
                              </span>
                              <span>Estoque: {prod.stockQuantity} un</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex lg:flex-col justify-between items-end gap-2 shrink-0">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => {
                                setEditingProduct(prod);
                                setProdForm({
                                  sku: prod.sku,
                                  internalName: prod.internalName,
                                  commercialName: prod.commercialName,
                                  category: prod.category,
                                  description: prod.description,
                                  composition: prod.composition,
                                  presentation: prod.presentation,
                                  unitQuantity: prod.unitQuantity,
                                  batchNumber: prod.batchNumber,
                                  expiryDate: prod.expiryDate,
                                  unitCost: prod.unitCost,
                                  stockQuantity: prod.stockQuantity,
                                  regulatoryInfo: prod.regulatoryInfo,
                                  warnings: prod.warnings,
                                  usageInstructions: prod.usageInstructions,
                                });
                                setProductModalOpen(true);
                              }}
                            >
                              Editar Produto / Docs
                            </Button>
                            <Button
                              size="xs"
                              variant="secondary"
                              icon={<Copy className="w-3.5 h-3.5" />}
                              onClick={() => handleDuplicateProduct(prod.id)}
                            >
                              Duplicar
                            </Button>
                            <Button
                              size="xs"
                              variant={prod.status === 'ACTIVE' ? 'danger' : 'primary'}
                              onClick={() => handleToggleProductStatus(prod)}
                            >
                              {prod.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Documentação e Claims contextualizados diretamente no Produto */}
                      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[var(--bg-subtle)]/50 p-3.5 rounded-xl border border-[var(--border-subtle)]">
                          <div className="font-bold text-[var(--text-primary)] mb-1.5">
                            Alegações Autorizadas no Rótulo & Modo de Uso
                          </div>
                          {prod.approvedClaims.map((c) => (
                            <div key={c.id} className="text-[var(--text-secondary)] mb-1">
                              • {c.claimText}
                            </div>
                          ))}
                          <div className="text-[11px] text-[var(--text-muted)] mt-2">
                            <strong>Uso recomendado:</strong> {prod.usageInstructions}
                          </div>
                        </div>

                        <div className="bg-[var(--bg-subtle)]/50 p-3.5 rounded-xl border border-[var(--border-subtle)]">
                          <div className="font-bold text-[var(--text-primary)] mb-1.5">
                            Documentação & Laudos Anexados ({prod.documents.length})
                          </div>
                          {prod.documents.length === 0 ? (
                            <p className="text-amber-600 dark:text-amber-400">
                              Nenhum documento anexado ainda. Clique em "Editar Produto / Docs" para anexar.
                            </p>
                          ) : (
                            prod.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                              >
                                <span className="text-[var(--text-secondary)]">{doc.title}</span>
                                <Badge tone="emerald">{doc.version}</Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {productTab === 'COMBOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offers
                .filter((o) => o.offerType !== '1_UNIT')
                .map((off) => (
                  <Card
                    key={off.id}
                    title={off.name}
                    subtitle={`Código: /o/${off.code} · Tipo: ${off.offerType}`}
                    action={<StatusBadge status={off.status} />}
                  >
                    <div className="space-y-3 text-xs">
                      <div className="bg-[var(--bg-subtle)]/60 p-3 rounded-xl border border-[var(--border-subtle)] flex justify-between items-center">
                        <div>
                          <span className="text-[var(--text-muted)] block">Composição do Kit/Combo:</span>
                          <strong className="text-[var(--text-primary)]">
                            {off.items.map((i) => `${i.quantity}x ${i.productName}`).join(' + ')}
                          </strong>
                        </div>
                        <div className="text-right font-mono">
                          <span className="line-through text-[var(--text-muted)] block">
                            R$ {off.regularPrice.toFixed(2)}
                          </span>
                          <strong className="text-base text-indigo-600 dark:text-indigo-400">
                            R$ {off.promotionalPrice.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => onOpenPublicLink(off.code)}
                        >
                          Ver no Checkout (/o/{off.code})
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {productTab === 'COMPLIANCE' && (
            <Card
              title="Checklist de Conformidade & Rotulagem dos Produtos"
              subtitle="Validação rápida de documentação, rótulo e comunicação antes de liberar ofertas ao público"
            >
              <div className="space-y-4">
                {complianceReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge tone="cyan">{rev.targetType}</Badge>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">
                            {rev.targetName}
                          </h4>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">{rev.notes}</p>
                      </div>
                      <StatusBadge status={rev.status} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] text-xs">
                      {(
                        [
                          ['documentacaoExistente', '1. Documentação'],
                          ['statusRegulatorio', '2. Status ANVISA'],
                          ['claimsAprovados', '3. Claims IN 28'],
                          ['rotulagem', '4. Rotulagem'],
                          ['comunicacaoComercial', '5. Copy Comercial'],
                          ['advertenciasObrigatorias', '6. Advertências'],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 cursor-pointer text-[var(--text-primary)]"
                        >
                          <input
                            type="checkbox"
                            checked={rev.checklist[key]}
                            onChange={() => handleUpdateCompliance(rev, undefined, key)}
                            className="accent-indigo-600"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleUpdateCompliance(rev, 'APPROVED')}
                      >
                        Aprovar Conformidade
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => handleUpdateCompliance(rev, 'REJECTED')}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. VENDAS — Ofertas, Pedidos, Cupons e Campanhas unificados */}
      {/* ==================================================================== */}
      {activeArea === 'VENDAS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Vendas, Ofertas & Pedidos
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Gerencie ofertas ativas, acompanhe todos os pedidos e configure cupons promocionais.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  onClick={() => setSalesTab('OFERTAS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    salesTab === 'OFERTAS'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Ofertas Ativas ({offers.length})
                </button>
                <button
                  onClick={() => setSalesTab('PEDIDOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    salesTab === 'PEDIDOS'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Pedidos ({orders.length})
                </button>
                <button
                  onClick={() => setSalesTab('CUPONS_CAMPANHAS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    salesTab === 'CUPONS_CAMPANHAS'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Cupons & Campanhas
                </button>
              </div>

              {salesTab === 'OFERTAS' && (
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setOfferModalOpen(true)}
                >
                  Nova Oferta
                </Button>
              )}
              {salesTab === 'CUPONS_CAMPANHAS' && (
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setCouponModalOpen(true)}
                >
                  Novo Cupom
                </Button>
              )}
            </div>
          </div>

          {/* SUB-ABA: OFERTAS */}
          {salesTab === 'OFERTAS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {offers.map((off) => {
                const linkedCamp = campaigns.find((c) => c.id === off.campaignId);
                return (
                  <Card
                    key={off.id}
                    title={off.name}
                    subtitle={`Link: /o/${off.code} · Campanha: ${linkedCamp?.name || 'Tráfego Direto'}`}
                    action={<StatusBadge status={off.status} />}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="lime">/o/{off.code}</Badge>
                        <Badge tone="cyan">{off.offerType}</Badge>
                        {off.freeShipping && <Badge tone="emerald">Frete Grátis</Badge>}
                        {off.defaultCouponCode && (
                          <Badge tone="slate">Cupom: {off.defaultCouponCode}</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 bg-[var(--bg-subtle)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)] font-mono text-xs">
                        <div>
                          <span className="text-[var(--text-muted)] block">De</span>
                          <span className="line-through text-[var(--text-secondary)]">
                            R$ {off.regularPrice.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Por</span>
                          <strong className="text-base text-indigo-600 dark:text-indigo-400">
                            R$ {off.promotionalPrice.toFixed(2)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Vendas / Limite</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {off.usageCount} / {off.usageLimit}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                        <span className="text-xs font-mono text-[var(--text-secondary)] truncate max-w-[220px]">
                          {`${window.location.origin}/o/${off.code}`}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {off.status !== 'ACTIVE' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handlePublishOffer(off.id)}
                            >
                              Ativar Oferta
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="secondary"
                            icon={<Copy className="w-3.5 h-3.5" />}
                            onClick={() => {
                              const url = `${window.location.origin}/o/${off.code}`;
                              navigator.clipboard?.writeText(url);
                              onNotify(`Link copiado: ${url}`, 'success');
                            }}
                          >
                            Copiar Link
                          </Button>
                          <Button
                            size="xs"
                            variant="primary"
                            icon={<ExternalLink className="w-3.5 h-3.5" />}
                            onClick={() => onOpenPublicLink(off.code)}
                          >
                            Abrir Checkout
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* SUB-ABA: PEDIDOS (com pagamento contextualizado) */}
          {salesTab === 'PEDIDOS' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-3">
                {orders.map((ord) => {
                  const orderPayment = payments.find((p) => p.orderId === ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className={`modern-card rounded-2xl p-4 cursor-pointer transition-all ${
                        selectedOrder?.id === ord.id
                          ? 'ring-2 ring-indigo-500'
                          : 'hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {ord.orderNumber}
                          </span>
                          <StatusBadge status={ord.consolidatedStatus} />
                        </div>
                        <span className="font-mono text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                          R$ {ord.total.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 text-xs text-[var(--text-secondary)]">
                        <div>
                          <strong>Cliente:</strong> {ord.customerSnapshot.name}
                        </div>
                        <div>
                          <strong>Vendedor:</strong> {ord.sellerName}
                        </div>
                        <div>
                          <strong>Pagamento:</strong> {ord.paymentMethod} ({ord.financialStatus})
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-[var(--text-muted)]">
                          Oferta: {ord.offerName}
                        </span>
                        <div className="flex gap-2">
                          {orderPayment && orderPayment.status === 'APPROVED' && (
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRefundPayment(orderPayment.id);
                              }}
                            >
                              Estornar Pagamento
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSection('ENTREGAS');
                            }}
                          >
                            Gerenciar Entrega →
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                {selectedOrder ? (
                  <Card
                    title={`Detalhes do Pedido ${selectedOrder.orderNumber}`}
                    subtitle={`${selectedOrder.customerSnapshot.name} · ${selectedOrder.customerSnapshot.city}/${selectedOrder.customerSnapshot.state}`}
                  >
                    <div className="mb-4 bg-[var(--bg-subtle)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)] text-xs space-y-1.5">
                      <div>
                        <strong>Itens:</strong>{' '}
                        {selectedOrder.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                      <div>
                        <strong>Endereço de Entrega:</strong> {selectedOrder.customerSnapshot.street},{' '}
                        {selectedOrder.customerSnapshot.number} — CEP {selectedOrder.customerSnapshot.cep}
                      </div>
                      <div>
                        <strong>Rastreio:</strong>{' '}
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {selectedOrder.trackingCode || 'Aguardando despacho'}
                        </span>
                      </div>
                    </div>
                    <Timeline
                      items={selectedOrder.timeline.map((t) => ({
                        id: t.id,
                        title: t.event,
                        subtitle: t.note,
                        timestamp: t.timestamp,
                        actor: t.actor,
                        previousValue: t.previousValue,
                        newValue: t.newValue,
                      }))}
                    />
                  </Card>
                ) : (
                  <EmptyState
                    title="Selecione um pedido"
                    description="Clique em um pedido ao lado para ver o histórico completo."
                  />
                )}
              </div>
            </div>
          )}

          {/* SUB-ABA: CUPONS & CAMPANHAS VINCULADAS */}
          {salesTab === 'CUPONS_CAMPANHAS' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card
                title="Cupons de Desconto"
                subtitle="Cupons ativos para uso no checkout e pelos vendedores"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <th className="py-2.5 px-2">Cupom</th>
                        <th className="py-2.5 px-2">Desconto</th>
                        <th className="py-2.5 px-2">Usos</th>
                        <th className="py-2.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                      {coupons.map((cpn) => (
                        <tr key={cpn.id}>
                          <td className="py-2.5 px-2 font-bold text-indigo-600 dark:text-indigo-400">
                            {cpn.code}
                          </td>
                          <td className="py-2.5 px-2">
                            {cpn.discountType === 'PERCENTAGE'
                              ? `${cpn.discountValue}% OFF`
                              : `R$ ${cpn.discountValue.toFixed(2)} OFF`}
                          </td>
                          <td className="py-2.5 px-2">
                            {cpn.currentUses}/{cpn.maxUsesGlobal}
                          </td>
                          <td className="py-2.5 px-2">
                            <StatusBadge status={cpn.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card
                title="Campanhas Vinculadas às Ofertas"
                subtitle="Origem de tráfego das ofertas ativas"
              >
                <div className="space-y-3">
                  {campaigns.map((cmp) => (
                    <div
                      key={cmp.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{cmp.name}</div>
                        <div className="text-[var(--text-secondary)] mt-0.5">
                          {cmp.channel} · UTM: <code className="font-mono">{cmp.utmCampaign}</code>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[var(--text-primary)] font-bold">
                          CAC: R$ {cmp.estimatedCac.toFixed(2)}
                        </div>
                        <StatusBadge status={cmp.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. CLIENTES — Lista simples de compradores + histórico de pedidos */}
      {/* ==================================================================== */}
      {activeArea === 'CLIENTES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Clientes & Histórico de Compras
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Consulte rapidamente quem comprou, dados de contato e todos os pedidos de cada cliente.
              </p>
            </div>

            <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                onClick={() => setCustomerTab('COMPRADORES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  customerTab === 'COMPRADORES'
                    ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Clientes ({customers.length})
              </button>
              <button
                onClick={() => setCustomerTab('LEADS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  customerTab === 'LEADS'
                    ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Em Atendimento ({leads.length})
              </button>
            </div>
          </div>

          {customerTab === 'COMPRADORES' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <Card title="Clientes Cadastrados">
                  <div className="space-y-3">
                    {customers.map((c) => {
                      const custOrders = orders.filter((o) => o.customerId === c.id);
                      const totalSpent = custOrders.reduce((acc, o) => acc + o.total, 0);
                      const isSelected = selectedCustomerId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCustomerId(c.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-wrap items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500'
                              : 'bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] hover:border-indigo-500/40'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-bold text-[var(--text-primary)]">
                              {c.name}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {c.phone} · {c.email} · {c.city}/{c.state}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                              R$ {totalSpent.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {custOrders.length} pedido(s)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              <div className="lg:col-span-5">
                {(() => {
                  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);
                  if (!activeCustomer) {
                    return (
                      <EmptyState
                        title="Selecione um cliente"
                        description="Clique em um cliente para ver seus dados e histórico de pedidos."
                      />
                    );
                  }
                  const custOrders = orders.filter((o) => o.customerId === activeCustomer.id);
                  return (
                    <Card
                      title={activeCustomer.name}
                      subtitle={`CPF: ${activeCustomer.cpf} · ${activeCustomer.city}/${activeCustomer.state}`}
                      action={
                        !activeCustomer.anonymized && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleAnonymizeCustomer(activeCustomer.id)}
                          >
                            Anonimizar LGPD
                          </Button>
                        )
                      }
                    >
                      <div className="space-y-4 text-xs">
                        <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] space-y-1">
                          <div>
                            <strong>WhatsApp:</strong> {activeCustomer.phone}
                          </div>
                          <div>
                            <strong>E-mail:</strong> {activeCustomer.email}
                          </div>
                          <div>
                            <strong>Endereço:</strong> {activeCustomer.street}, {activeCustomer.number}{' '}
                            ({activeCustomer.neighborhood}) — CEP {activeCustomer.cep}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-[var(--text-primary)] mb-2">
                            Histórico de Pedidos ({custOrders.length})
                          </h4>
                          <div className="space-y-2">
                            {custOrders.map((o) => (
                              <div
                                key={o.id}
                                className="p-3 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {o.orderNumber}
                                  </div>
                                  <div className="text-[var(--text-secondary)]">{o.offerName}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-mono font-bold text-[var(--text-primary)]">
                                    R$ {o.total.toFixed(2)}
                                  </div>
                                  <StatusBadge status={o.consolidatedStatus} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })()}
              </div>
            </div>
          ) : (
            <Card
              title="Contatos em Atendimento pelos Vendedores"
              subtitle="Clientes potenciais que receberam links de oferta"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {leads.map((ld) => (
                  <div
                    key={ld.id}
                    className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm text-[var(--text-primary)]">{ld.name}</strong>
                      <StatusBadge status={ld.stage} />
                    </div>
                    <div className="font-mono text-[var(--text-secondary)]">{ld.contact}</div>
                    <div className="text-[var(--text-muted)]">Origem: {ld.origin}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ENTREGAS — Unifica Fulfillment e Logística em uma tela única */}
      {/* ==================================================================== */}
      {activeArea === 'ENTREGAS' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Central de Entregas & Expedição
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Acompanhe pedidos aguardando preparação, despachos, códigos de rastreio e exceções de entrega.
              </p>
            </div>

            <div className="flex flex-wrap items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1">
              {(
                [
                  ['ALL', `Todos (${orders.length})`],
                  ['AGUARDANDO', `Aguardando Envio (${awaitingPreparationOrders.length})`],
                  [
                    'ENVIADOS',
                    `Enviados (${orders.filter((o) => o.operationalStatus === 'shipped').length})`,
                  ],
                  ['PROBLEMAS', `Problemas (${exceptionOrders.length})`],
                  [
                    'ENTREGUES',
                    `Entregues (${orders.filter((o) => o.operationalStatus === 'delivered').length})`,
                  ],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDeliveryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    deliveryFilter === key
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {orders
              .filter((ord) => {
                if (deliveryFilter === 'AGUARDANDO')
                  return ['waiting', 'picking', 'packing', 'ready_to_ship'].includes(
                    ord.operationalStatus
                  );
                if (deliveryFilter === 'ENVIADOS')
                  return ['shipped', 'in_transit'].includes(ord.operationalStatus);
                if (deliveryFilter === 'PROBLEMAS') return ord.operationalStatus === 'exception';
                if (deliveryFilter === 'ENTREGUES') return ord.operationalStatus === 'delivered';
                return true;
              })
              .map((ord) => (
                <div
                  key={ord.id}
                  className="modern-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {ord.orderNumber}
                      </span>
                      <StatusBadge status={ord.consolidatedStatus} />
                      {ord.exceptionReason && (
                        <Badge tone="danger">Problema: {ord.exceptionReason}</Badge>
                      )}
                    </div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {ord.customerSnapshot.name} —{' '}
                      <span className="font-normal text-[var(--text-secondary)]">
                        {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Destino: {ord.customerSnapshot.street}, {ord.customerSnapshot.number} ·{' '}
                      {ord.customerSnapshot.city}/{ord.customerSnapshot.state} (CEP{' '}
                      {ord.customerSnapshot.cep}) · Rastreio:{' '}
                      <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                        {ord.trackingCode || 'Etiqueta pendente'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'picking')}
                    >
                      1. Separar
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'packing')}
                    >
                      2. Embalar
                    </Button>
                    <Button
                      size="xs"
                      variant="cyan"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'ready_to_ship')}
                    >
                      3. Gerar Etiqueta
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'shipped')}
                    >
                      4. Marcar Enviado
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'delivered')}
                    >
                      5. Confirmar Entrega
                    </Button>
                    {ord.trackingCode && (
                      <a
                        href={`/api/shipments/label/${ord.trackingCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
                      >
                        Etiqueta ({ord.trackingCode})
                      </a>
                    )}
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() =>
                        handleUpdateOrderOperationalStatus(ord.id, 'exception', 'atraso')
                      }
                    >
                      Reportar Problema
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. VENDEDORES — Vendedores, Links, Comissões e Desempenho */}
      {/* ==================================================================== */}
      {activeArea === 'VENDEDORES' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
              Vendedores, Links & Comissões
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Acompanhe o desempenho de cada vendedor, seus links rastreáveis ativos e comissões geradas.
            </p>
          </div>

          {/* Desempenho por Vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users
              .filter((u) => u.role === 'VENDEDOR')
              .map((seller) => {
                const sellerOrders = orders.filter(
                  (o) => o.sellerId === seller.id && o.financialStatus === 'approved'
                );
                const sellerRevenue = sellerOrders.reduce((acc, o) => acc + o.total, 0);
                const sellerComms = commissions
                  .filter((c) => c.sellerId === seller.id && c.status !== 'CANCELLED')
                  .reduce((acc, c) => acc + c.amount, 0);
                const sellerLinks = offerLinks.filter((l) => l.sellerId === seller.id);

                return (
                  <Card
                    key={seller.id}
                    title={seller.name}
                    subtitle={`Código: ${seller.sellerCode} · Comissão: ${seller.commissionRate}%`}
                    action={<StatusBadge status={seller.status} />}
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 bg-[var(--bg-subtle)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)] text-xs font-mono">
                        <div>
                          <span className="text-[var(--text-muted)] block font-sans">Vendas Pagas</span>
                          <strong className="text-sm text-[var(--text-primary)]">
                            R$ {sellerRevenue.toFixed(2)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block font-sans">Pedidos</span>
                          <strong className="text-sm text-indigo-600 dark:text-indigo-400">
                            {sellerOrders.length}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block font-sans">Comissões</span>
                          <strong className="text-sm text-emerald-600 dark:text-emerald-400">
                            R$ {sellerComms.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[var(--text-secondary)]">
                          Links Ativos do Vendedor ({sellerLinks.length}):
                        </div>
                        {sellerLinks.map((lnk) => (
                          <div
                            key={lnk.id}
                            className="p-2.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex items-center justify-between text-xs"
                          >
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              /o/{lnk.code}
                            </span>
                            <span className="text-[var(--text-secondary)]">
                              {lnk.clicks} cliques · {lnk.conversions} vendas
                            </span>
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => onOpenPublicLink(lnk.code)}
                            >
                              Abrir
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* Comissões por Pedido */}
          <Card
            title="Extrato de Comissões por Pedido"
            subtitle="Valores calculados e congelados automaticamente em cada venda aprovada"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-3">Vendedor</th>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Valor Base</th>
                    <th className="py-2.5 px-3">% Aplicado</th>
                    <th className="py-2.5 px-3">Comissão</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-sans font-semibold text-[var(--text-primary)]">
                        {c.sellerName}
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                        {c.orderNumber}
                      </td>
                      <td className="py-3 px-3">R$ {c.calculationBase.toFixed(2)}</td>
                      <td className="py-3 px-3">{c.percentage}%</td>
                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {c.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. CONFIGURAÇÕES — Regras, Usuários, Integrações, Automações e Auditoria */}
      {/* ==================================================================== */}
      {activeArea === 'CONFIGURACOES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)]">
                Configurações do Sistema
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Gerencie regras comerciais, acessos da equipe, integrações, mensagens automáticas e auditoria.
              </p>
            </div>

            <div className="flex flex-wrap items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)] gap-1">
              {(
                [
                  ['REGRAS', 'Regras & Margem'],
                  ['USUARIOS', 'Usuários & Permissões'],
                  ['INTEGRACOES', 'Integrações'],
                  ['AUTOMACOES', 'Automações Pós-Venda'],
                  ['AUDITORIA', 'Auditoria'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSettingsTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    settingsTab === key
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {settingsTab === 'REGRAS' && (
            <Card
              title="Regras Comerciais & Travas de Margem"
              subtitle="Limites utilizados pelo backend para validar novas ofertas e cupons"
            >
              <form onSubmit={handleSaveEconomicsConfig} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Margem de Contribuição Mínima (%)"
                    type="number"
                    value={econConfig.minContributionMarginPercent}
                    onChange={(e) =>
                      setEconConfig({
                        ...econConfig,
                        minContributionMarginPercent: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Teto Máximo de Desconto (%)"
                    type="number"
                    value={econConfig.maxDiscountCeilingPercent}
                    onChange={(e) =>
                      setEconConfig({
                        ...econConfig,
                        maxDiscountCeilingPercent: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Comissão Padrão de Vendedores (%)"
                    type="number"
                    value={econConfig.defaultCommissionPercent}
                    onChange={(e) =>
                      setEconConfig({
                        ...econConfig,
                        defaultCommissionPercent: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Ciclo Padrão de Recompra (Dias)"
                    type="number"
                    value={econConfig.repurchaseCycleDays}
                    onChange={(e) =>
                      setEconConfig({
                        ...econConfig,
                        repurchaseCycleDays: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <Button type="submit">Salvar Configurações Comerciais</Button>
              </form>
            </Card>
          )}

          {settingsTab === 'USUARIOS' && (
            <Card
              title="Usuários & Perfis de Acesso"
              subtitle="Controle de acesso separado para Admin, Vendedores e Expedição (Fulfillment)"
            >
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{u.name}</span>
                        <Badge tone="lime">{u.role}</Badge>
                        {u.twoFactorEnabled && <Badge tone="cyan">2FA Ativo</Badge>}
                      </div>
                      <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">
                        {u.email}
                      </div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {settingsTab === 'INTEGRACOES' && (
            <Card
              title="Integrações de Pagamento, Frete e Notificações"
              subtitle="Serviços conectados à arquitetura da plataforma"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-[var(--text-primary)]">Gateway de Pagamento</strong>
                    <Badge tone="emerald">Ativo</Badge>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Geração de PIX Copia e Cola, Cartão e Boleto com confirmação via Webhook e proteção contra duplicidade.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-[var(--text-primary)]">Cotação & Frete</strong>
                    <Badge tone="emerald">Ativo</Badge>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Cálculo por CEP, emissão de etiquetas de envio, rastreio e tabela nacional de contingência.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm text-[var(--text-primary)]">WhatsApp & E-mail</strong>
                    <Badge tone="emerald">Ativo</Badge>
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Disparo de confirmações de pedido, código de rastreio e lembretes de recompra.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {settingsTab === 'AUTOMACOES' && (
            <Card
              title="Mensagens Automáticas de Pós-Venda & Recuperação"
              subtitle="Gatilhos de WhatsApp e E-mail disparados conforme o status do pedido"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {automationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge tone="lime">{rule.triggerEvent}</Badge>
                      <Badge tone="cyan">{rule.channel}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{rule.name}</h4>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                      {rule.messageTemplate}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {settingsTab === 'AUDITORIA' && (
            <Card
              title="Histórico de Auditoria do Sistema"
              subtitle="Registro cronológico de ações importantes na plataforma"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      <th className="py-2.5 px-2">Data/Hora</th>
                      <th className="py-2.5 px-2">Usuário</th>
                      <th className="py-2.5 px-2">Ação</th>
                      <th className="py-2.5 px-2">Alteração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-2 text-[var(--text-muted)]">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-2 text-[var(--text-primary)]">
                          {log.userName} ({log.userRole})
                        </td>
                        <td className="py-2.5 px-2 font-bold text-indigo-600 dark:text-indigo-400">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-2 text-[var(--text-secondary)]">
                          {log.previousValue} → <strong>{log.newValue}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS REAPROVEITADOS: PRODUTO, OFERTA E CUPOM */}
      {/* ==================================================================== */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? `Editar Produto ${editingProduct.sku}` : 'Novo Produto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              value={prodForm.sku}
              onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
              required
            />
            <Select
              label="Categoria Interna"
              value={prodForm.category}
              onChange={(e) =>
                setProdForm({ ...prodForm, category: e.target.value as ProductCategory })
              }
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <Input
            label="Nome Interno"
            value={prodForm.internalName}
            onChange={(e) => setProdForm({ ...prodForm, internalName: e.target.value })}
            required
          />
          <Input
            label="Nome Comercial"
            value={prodForm.commercialName}
            onChange={(e) => setProdForm({ ...prodForm, commercialName: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Lote"
              value={prodForm.batchNumber}
              onChange={(e) => setProdForm({ ...prodForm, batchNumber: e.target.value })}
              required
            />
            <Input
              label="Validade"
              type="date"
              value={prodForm.expiryDate}
              onChange={(e) => setProdForm({ ...prodForm, expiryDate: e.target.value })}
              required
            />
            <Input
              label="Custo Unitário (R$)"
              type="number"
              step="0.1"
              value={prodForm.unitCost}
              onChange={(e) => setProdForm({ ...prodForm, unitCost: Number(e.target.value) })}
              required
            />
          </div>
          <Input
            label="Composição"
            value={prodForm.composition}
            onChange={(e) => setProdForm({ ...prodForm, composition: e.target.value })}
          />
          <Input
            label="Informação Regulatória (ANVISA)"
            value={prodForm.regulatoryInfo}
            onChange={(e) => setProdForm({ ...prodForm, regulatoryInfo: e.target.value })}
          />
          <FileUploader
            label="Anexar Documento / Laudo do Produto"
            onUpload={(fn) => onNotify(`Arquivo ${fn} anexado ao produto!`, 'info')}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Produto</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title="Nova Oferta Comercial"
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código do Link (/o/XXXX)"
              value={offerForm.code}
              onChange={(e) => setOfferForm({ ...offerForm, code: e.target.value.toUpperCase() })}
              required
            />
            <Select
              label="Tipo de Oferta"
              value={offerForm.offerType}
              onChange={(e) => setOfferForm({ ...offerForm, offerType: e.target.value })}
              options={[
                { value: '1_UNIT', label: '1 Unidade' },
                { value: 'KIT_2', label: 'Kit 2 Unidades' },
                { value: 'KIT_3_PLUS', label: 'Kit 3+ Unidades' },
                { value: 'COMBO', label: 'Combo Multi-Produto' },
              ]}
            />
          </div>
          <Input
            label="Nome da Oferta"
            value={offerForm.name}
            onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Produto"
              value={offerForm.productId}
              onChange={(e) => setOfferForm({ ...offerForm, productId: e.target.value })}
              options={products.map((p) => ({ value: p.id, label: `${p.sku} - ${p.commercialName}` }))}
            />
            <Input
              label="Quantidade de Frascos"
              type="number"
              value={offerForm.quantity}
              onChange={(e) => setOfferForm({ ...offerForm, quantity: Number(e.target.value) })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço Regular (R$)"
              type="number"
              step="0.1"
              value={offerForm.regularPrice}
              onChange={(e) =>
                setOfferForm({ ...offerForm, regularPrice: Number(e.target.value) })
              }
              required
            />
            <Input
              label="Preço Promocional (R$)"
              type="number"
              step="0.1"
              value={offerForm.promotionalPrice}
              onChange={(e) =>
                setOfferForm({ ...offerForm, promotionalPrice: Number(e.target.value) })
              }
              required
            />
          </div>
          <Select
            label="Campanha de Origem (Opcional)"
            value={offerForm.campaignId}
            onChange={(e) => setOfferForm({ ...offerForm, campaignId: e.target.value })}
            options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOfferModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar Oferta</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Novo Cupom de Desconto"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <Input
            label="Código do Cupom"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo de Desconto"
              value={couponForm.discountType}
              onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
              options={[
                { value: 'PERCENTAGE', label: 'Percentual (%)' },
                { value: 'FIXED', label: 'Valor Fixo (R$)' },
              ]}
            />
            <Input
              label="Valor do Desconto"
              type="number"
              value={couponForm.discountValue}
              onChange={(e) =>
                setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })
              }
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCouponModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar Cupom</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
