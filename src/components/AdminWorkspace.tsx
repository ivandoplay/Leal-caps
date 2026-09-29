import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  KeyRound,
  Layers,
  Link2,
  Lock,
  Package,
  PackageCheck,
  Percent,
  Plus,
  RefreshCcw,
  ShieldAlert,
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
  | 'DASHBOARD'
  | 'PRODUTOS'
  | 'DOCUMENTACAO'
  | 'OFERTAS'
  | 'COMBOS'
  | 'CUPONS'
  | 'CAMPANHAS'
  | 'LEADS'
  | 'CLIENTES'
  | 'PEDIDOS'
  | 'PAGAMENTOS'
  | 'LOGISTICA'
  | 'FULFILLMENT'
  | 'VENDEDORES'
  | 'COMISSOES'
  | 'CRM'
  | 'AUTOMACOES'
  | 'ANALYTICS'
  | 'ECONOMIA'
  | 'COMPLIANCE'
  | 'USUARIOS'
  | 'PERMISSOES'
  | 'AUDITORIA'
  | 'INTEGRACOES'
  | 'CONFIGURACOES';

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
  user,
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
  shipments,
  commissions,
  automationRules,
  complianceReviews,
  unitEconomicsConfig,
  auditLogs,
  users,
  privacyRequests,
  onRefresh,
  onOpenPublicLink,
  onNotify,
}) => {
  // Dashboard Filters
  const [filterCampaign, setFilterCampaign] = useState('ALL');
  const [filterSeller, setFilterSeller] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Details Drawer/View
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Product Create/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    sku: 'LC-META-60C',
    internalName: '[DEMO] Composto Metabólico Inositol + Cromo 60 Caps',
    commercialName: 'Leal MetaControl 60 Cápsulas [DEMO]',
    category: 'Emagrecimento' as ProductCategory,
    description: 'Suplemento alimentar em cápsulas com Picolinato de Cromo e Inositol.',
    composition: 'Inositol (500mg), Picolinato de Cromo (250mcg), Bisglicinato de Magnésio (150mg).',
    presentation: 'Frasco âmbar 60 cápsulas',
    unitQuantity: 60,
    batchNumber: 'LT-2026-10M',
    expiryDate: '2028-10-30',
    unitCost: 25.5,
    stockQuantity: 500,
    regulatoryInfo: 'Dispensado de registro conforme RDC ANVISA 240/2018.',
    warnings: 'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA.',
    usageInstructions: 'Ingerir 2 cápsulas ao dia.',
  });

  // Offer Engine Modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    code: 'K2META',
    name: 'Kit 2x Leal LipoTherm Pro — Condição Especial [DEMO]',
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
    complianceStatus: 'DRAFT' as ComplianceState,
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

  // Economics Config State
  const [econConfig, setEconConfig] = useState<UnitEconomicsConfig>(unitEconomicsConfig);
  const [simRevenue, setSimRevenue] = useState(299.9);
  const [simDiscount, setSimDiscount] = useState(30.0);
  const [simProdCost, setSimProdCost] = useState(49.0);
  const [simShipSubsidy, setSimShipSubsidy] = useState(18.9);

  // Filtered Orders for Dashboard
  const filteredOrders = orders.filter((o) => {
    if (filterCampaign !== 'ALL' && o.campaignId !== filterCampaign) return false;
    if (filterSeller !== 'ALL' && o.sellerId !== filterSeller) return false;
    if (filterStatus !== 'ALL' && o.financialStatus !== filterStatus && o.operationalStatus !== filterStatus)
      return false;
    return true;
  });

  const approvedOrders = filteredOrders.filter((o) => o.financialStatus === 'approved');
  const grossSales = approvedOrders.reduce((acc, o) => acc + o.total, 0);
  const avgTicket = approvedOrders.length > 0 ? grossSales / approvedOrders.length : 0;

  // API Handlers
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
          ? `Produto ${data.product.sku} atualizado e auditado!`
          : `Produto ${data.product.sku} criado com sucesso!`,
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
      onNotify(`Oferta /o/${data.offer.code} criada e validada economicamente!`, 'success');
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
      onNotify(`Oferta ${data.offer.code} publicada com sucesso!`, 'success');
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
      onNotify(`Pagamento reembolsado e registrado no AuditLog!`, 'info');
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
      onNotify(`Revisão de compliance atualizada (${data.review.status}).`, 'success');
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
      onNotify('Regras comerciais e limites de economia unitária salvos e auditados!', 'success');
      onRefresh();
    }
  };

  const handleAnonymizeCustomer = async (customerId: string) => {
    const res = await fetch(`/api/privacy/anonymize/${customerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ purpose: 'Direito de eliminação/anonimização Art. 18 LGPD' }),
    });
    if (res.ok) {
      onNotify('Titular anonimizado com sucesso conforme LGPD!', 'info');
      onRefresh();
    }
  };

  // Live Waterfall Unit Economics Calculation
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
      {/* 1. DASHBOARD OPERACIONAL COMPLETO (Seção 5) */}
      {/* ==================================================================== */}
      {section === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Multi-Dimension Filters */}
          <div className="bg-[#11141B] border border-[#232938] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A3E635]">
              <Filter className="w-4 h-4" />
              <span>Filtros Operacionais & Atribuição</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <Select
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Todas as Campanhas' },
                  ...campaigns.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <Select
                value={filterSeller}
                onChange={(e) => setFilterSeller(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Todos os Vendedores' },
                  { value: 'usr_seller_01', label: 'Camila Rocha (Sênior)' },
                  { value: 'usr_seller_02', label: 'Rafael Mendes (Inside)' },
                ]}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'ALL', label: 'Todos os Status' },
                  { value: 'approved', label: 'Financeiro: Aprovado' },
                  { value: 'pending', label: 'Financeiro: Pendente' },
                  { value: 'waiting', label: 'Logística: Fila Separação' },
                  { value: 'shipped', label: 'Logística: Enviado' },
                  { value: 'delivered', label: 'Logística: Entregue' },
                  { value: 'exception', label: 'Logística: Exceção' },
                ]}
              />
            </div>
          </div>

          {/* Primary Commercial & Financial KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KPI
              label="Vendas Aprovadas"
              value={`R$ ${grossSales.toFixed(2)}`}
              subvalue={`${approvedOrders.length} pedidos pagos`}
              accent="lime"
            />
            <KPI
              label="Total Pedidos"
              value={filteredOrders.length}
              subvalue="Conversão funil: 13.2%"
              accent="cyan"
            />
            <KPI
              label="Ticket Médio"
              value={`R$ ${avgTicket.toFixed(2)}`}
              subvalue="Kits 2x e 3x: 74% mix"
              accent="emerald"
            />
            <KPI
              label="CAC Médio / ROAS"
              value="R$ 36,40"
              subvalue="ROAS Global: 4.85x"
              accent="lime"
            />
            <KPI
              label="Margem Contrib."
              value="34.2%"
              subvalue="LTV 90D: R$ 412,50"
              accent="cyan"
            />
            <KPI
              label="Refund / Chargeback"
              value="1.2% / 0.3%"
              subvalue="SLA Expedição: 14.5h"
              accent="amber"
            />
          </div>

          {/* Operational & Logistics Queue KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KPI
              label="Pagamentos Pendentes"
              value={orders.filter((o) => o.financialStatus === 'pending').length}
              subvalue="Aguardando Webhook"
              accent="amber"
            />
            <KPI
              label="Pedidos Pendentes"
              value={
                orders.filter((o) => o.financialStatus === 'approved' && o.operationalStatus === 'waiting')
                  .length
              }
              subvalue="Elegíveis no WMS"
              accent="lime"
            />
            <KPI
              label="Em Preparação"
              value={
                orders.filter((o) => ['picking', 'packing', 'ready_to_ship'].includes(o.operationalStatus))
                  .length
              }
              subvalue="Separação + Embalagem"
              accent="cyan"
            />
            <KPI
              label="Pedidos Enviados"
              value={orders.filter((o) => o.operationalStatus === 'shipped').length}
              subvalue="Em trânsito transportadora"
              accent="cyan"
            />
            <KPI
              label="Pedidos Entregues"
              value={orders.filter((o) => o.operationalStatus === 'delivered').length}
              subvalue="Jornada Recompra ativa"
              accent="emerald"
            />
            <KPI
              label="Exceções Logísticas"
              value={orders.filter((o) => o.operationalStatus === 'exception').length}
              subvalue="Endereço / Atraso"
              accent="danger"
            />
          </div>

          {/* Funnel & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card
              title="Funil Ponta a Ponta da Operação"
              subtitle="Aquisição → Oferta → Checkout → Pagamento → Entrega → Recompra"
            >
              <BarChartSimple
                data={[
                  { label: '1. Visitas em Links (/o/...)', value: 575, color: 'bg-[#06B6D4]' },
                  { label: '2. Ofertas Visualizadas', value: 391, color: 'bg-[#06B6D4]' },
                  { label: '3. Checkouts Iniciados', value: 138, color: 'bg-[#A3E635]' },
                  { label: '4. Pagamentos Criados', value: 89, color: 'bg-[#A3E635]' },
                  { label: '5. Pedidos Aprovados (Webhook)', value: 76, color: 'bg-[#10B981]' },
                  { label: '6. Pedidos Entregues', value: 64, color: 'bg-[#10B981]' },
                  { label: '7. Recompras Realizadas', value: 22, color: 'bg-[#A3E635]' },
                ]}
              />
            </Card>

            <div className="lg:col-span-2">
              <Card
                title="Últimos Pedidos & Status Independentes"
                subtitle="Visão desacoplada entre Status Financeiro (Gateway) e Status Operacional (WMS)"
                action={
                  <Button size="xs" variant="secondary" onClick={() => setSection('PEDIDOS')}>
                    Ver Todos os Pedidos
                  </Button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#232938] text-[#94A3B8] uppercase font-mono">
                        <th className="py-2.5 px-2">Pedido</th>
                        <th className="py-2.5 px-2">Cliente</th>
                        <th className="py-2.5 px-2">Oferta</th>
                        <th className="py-2.5 px-2">Financeiro</th>
                        <th className="py-2.5 px-2">Operacional</th>
                        <th className="py-2.5 px-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2330]">
                      {filteredOrders.map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setSelectedOrder(ord);
                            setSection('PEDIDOS');
                          }}
                          className="hover:bg-[#171B24] cursor-pointer"
                        >
                          <td className="py-3 px-2 font-mono font-bold text-[#A3E635]">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-2 text-[#F3F5F8]">{ord.customerSnapshot.name}</td>
                          <td className="py-3 px-2 text-[#94A3B8]">{ord.offerName.slice(0, 28)}...</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={ord.financialStatus} />
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={ord.operationalStatus} />
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-bold text-[#F3F5F8]">
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. CATÁLOGO DE PRODUTOS & DOCUMENTAÇÃO (Seções 2 e 6) */}
      {/* ==================================================================== */}
      {(section === 'PRODUTOS' || section === 'DOCUMENTACAO') && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Pesquisar por SKU, nome interno, nome comercial ou lote..."
            />
            <div className="flex gap-2">
              <Button
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
              >
                Novo Produto Físico (SKU)
              </Button>
            </div>
          </div>

          <div className="bg-[#11141B] border border-[#F59E0B]/30 rounded-xl p-4 text-xs text-[#94A3B8] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong className="text-[#F59E0B]">Regra Regulatória ANVISA (Pós-Set/2024 &amp; 2026):</strong> Os nomes abaixo são <strong>taxonomia interna do negócio</strong> e nunca devem ser usados automaticamente como alegações publicitárias (perda de peso, desempenho sexual, sintomas de menopausa, ansiedade ou ganho muscular). Padrão base MVP: <strong>100 cápsulas/frasco</strong> • <strong>~R$ 15,00 custo bruto do frasco</strong>.
              </span>
              <Badge tone="amber">10 CATEGORIAS INTERNAS × USO INTERNO</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {[
                { cat: 'Emagrecimento', uso: 'Composição corporal' },
                { cat: 'Pele, cabelos e unhas', uso: 'Beleza' },
                { cat: 'Queima de gordura', uso: 'Composição corporal' },
                { cat: 'Celulite', uso: 'Estética' },
                { cat: 'Massa magra', uso: 'Composição corporal' },
                { cat: 'Articulações', uso: 'Suporte / mobilidade' },
                { cat: 'Ansiedade', uso: 'Categoria de interesse' },
                { cat: 'Endometriose', uso: 'Categoria de interesse' },
                { cat: 'Menopausa', uso: 'Categoria de interesse' },
                { cat: 'Libido', uso: 'Categoria de interesse' },
              ].map((item) => (
                <div key={item.cat} className="bg-[#090B0E] border border-[#232938] rounded-lg p-2">
                  <div className="font-bold text-[#F3F5F8] text-[11px]">{item.cat}</div>
                  <div className="text-[10px] font-mono text-[#06B6D4]">Uso interno: {item.uso}</div>
                </div>
              ))}
            </div>
          </div>

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
                          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80'
                        }
                        alt={prod.commercialName}
                        className="w-24 h-24 rounded-xl object-cover border border-[#232938] shrink-0"
                      />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#A3E635] bg-[#A3E635]/10 px-2 py-0.5 rounded border border-[#A3E635]/30">
                            SKU: {prod.sku}
                          </span>
                          <Badge tone="cyan">Taxonomia: {prod.category}</Badge>
                          <StatusBadge status={prod.status} />
                          <StatusBadge status={prod.complianceStatus} />
                        </div>
                        <h3 className="text-base font-bold font-display text-[#F3F5F8]">
                          {prod.commercialName}
                        </h3>
                        <p className="text-xs text-[#64748B] font-mono">
                          Nome Interno: {prod.internalName}
                        </p>
                        <p className="text-xs text-[#94A3B8]">{prod.description}</p>
                        <div className="flex flex-wrap gap-4 pt-1 text-xs font-mono text-[#94A3B8]">
                          <span>Lote: {prod.batchNumber}</span>
                          <span>Validade: {prod.expiryDate}</span>
                          <span>Apresentação: {prod.presentation}</span>
                          <span className="text-[#A3E635]">CMV Unitário: R$ {prod.unitCost.toFixed(2)}</span>
                          <span>Estoque CD: {prod.stockQuantity} un</span>
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
                          Editar SKU
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

                  {/* Regulatory Claims & Documentation Sub-panel */}
                  <div className="mt-4 pt-4 border-t border-[#232938] grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#090B0E] p-3 rounded-lg border border-[#232938]">
                      <div className="font-bold text-[#06B6D4] mb-1.5 uppercase">
                        Claims Aprovados (ANVISA IN 28/2018) & Rotulagem
                      </div>
                      {prod.approvedClaims.map((c) => (
                        <div key={c.id} className="text-[#F3F5F8] mb-1">
                          • "{c.claimText}" <span className="text-[#64748B]">({c.regulatoryBasis})</span>
                        </div>
                      ))}
                      <div className="text-[11px] text-[#64748B] mt-2">
                        <strong>Modo de uso:</strong> {prod.usageInstructions}
                      </div>
                    </div>

                    <div className="bg-[#090B0E] p-3 rounded-lg border border-[#232938]">
                      <div className="font-bold text-[#A3E635] mb-1.5 uppercase">
                        Dossiê & Documentação Regulatória Anexada ({prod.documents.length})
                      </div>
                      {prod.documents.length === 0 ? (
                        <p className="text-[#EF4444]">Sem documentação técnica vinculada.</p>
                      ) : (
                        prod.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between py-1 border-b border-[#1E2330] last:border-0"
                          >
                            <span className="text-[#F3F5F8]">{doc.title}</span>
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

      {/* ==================================================================== */}
      {/* 3. MOTOR DE OFERTAS (OFFER ENGINE) & COMBOS (Seções 7 e 8) */}
      {/* ==================================================================== */}
      {(section === 'OFERTAS' || section === 'COMBOS') && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-display text-[#F3F5F8]">
                Offer Engine — Condições Comerciais & Links Rastreáveis
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Suporta 1 Unidade, Kit 2, Kit 3+ e Combos Multi-SKU. Toda oferta valida margem mínima e passa pelo Compliance Gate antes de publicar.
              </p>
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setOfferModalOpen(true)}>
              Criar Nova Oferta / Combo
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {offers
              .filter((o) => (section === 'COMBOS' ? o.offerType !== '1_UNIT' : true))
              .map((off) => (
                <Card
                  key={off.id}
                  title={off.name}
                  subtitle={`Link Público: /o/${off.code} • Limite: ${off.usageCount}/${off.usageLimit} usos`}
                  action={<StatusBadge status={off.status} />}
                >
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="lime">/o/{off.code}</Badge>
                      <Badge tone="cyan">{off.offerType}</Badge>
                      <StatusBadge status={off.complianceStatus} />
                      {off.freeShipping && <Badge tone="emerald">FRETE GRÁTIS SUBSIDIADO</Badge>}
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-[#090B0E] p-3.5 rounded-xl border border-[#232938] font-mono text-xs">
                      <div>
                        <span className="text-[#64748B] block">Preço Regular</span>
                        <span className="line-through text-[#94A3B8]">
                          R$ {off.regularPrice.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Preço Oferta</span>
                        <strong className="text-base text-[#A3E635]">
                          R$ {off.promotionalPrice.toFixed(2)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">Desconto</span>
                        <strong className="text-[#10B981]">{off.discountPercent}% OFF</strong>
                      </div>
                    </div>

                    <div className="text-xs text-[#94A3B8] space-y-1">
                      <div>
                        <strong>Itens físicos vinculados:</strong>{' '}
                        {off.items.map((i) => `${i.quantity}x ${i.sku}`).join(' + ')}
                      </div>
                      <div>
                        <strong>Regras de Elegibilidade:</strong> {off.eligibilityRules}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-[#232938]">
                      <div className="text-[11px] font-mono text-[#A3E635] truncate max-w-xs">
                        {`${window.location.origin}/o/${off.code}`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {off.status !== 'ACTIVE' && (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handlePublishOffer(off.id)}
                          >
                            Publicar Oferta (Compliance Gate)
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
                          Abrir Oferta (/o/{off.code})
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. CUPONS & CAMPANHAS (Seções 2 e 9) */}
      {/* ==================================================================== */}
      {section === 'CUPONS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-display">Gestão de Cupons & Regras de Uso</h2>
              <p className="text-xs text-[#94A3B8]">
                Controle de desconto percentual/fixo, limite global, limite por CPF e restrição por vendedor/oferta.
              </p>
            </div>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setCouponModalOpen(true)}>
              Novo Cupom
            </Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#232938] text-[#94A3B8] uppercase">
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Tipo / Valor</th>
                    <th className="py-3 px-3">Usos (Global)</th>
                    <th className="py-3 px-3">Limite/CPF</th>
                    <th className="py-3 px-3">Validade</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2330]">
                  {coupons.map((cpn) => (
                    <tr key={cpn.id}>
                      <td className="py-3 px-3 font-bold text-[#A3E635]">{cpn.code}</td>
                      <td className="py-3 px-3">
                        {cpn.discountType === 'PERCENTAGE'
                          ? `${cpn.discountValue}% OFF`
                          : `R$ ${cpn.discountValue.toFixed(2)} OFF`}
                      </td>
                      <td className="py-3 px-3">
                        {cpn.currentUses} / {cpn.maxUsesGlobal}
                      </td>
                      <td className="py-3 px-3">{cpn.maxUsesPerCustomer} por CPF</td>
                      <td className="py-3 px-3 text-[#94A3B8]">
                        {new Date(cpn.validUntil).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={cpn.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {section === 'CAMPANHAS' && (
        <Card
          title="Campanhas de Aquisição & Atribuição UTM"
          subtitle="Entidade separada de Produto e Oferta conforme princípio fundamental do blueprint"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232938] text-[#94A3B8] uppercase font-mono">
                  <th className="py-3 px-3">Campanha</th>
                  <th className="py-3 px-3">Canal / Mídia</th>
                  <th className="py-3 px-3">Criativo</th>
                  <th className="py-3 px-3">UTMs</th>
                  <th className="py-3 px-3">CAC Est.</th>
                  <th className="py-3 px-3">Investimento</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330]">
                {campaigns.map((cmp) => (
                  <tr key={cmp.id}>
                    <td className="py-3 px-3 font-bold text-[#F3F5F8]">{cmp.name}</td>
                    <td className="py-3 px-3 text-[#94A3B8]">
                      {cmp.channel} • {cmp.media}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#06B6D4]">{cmp.creative}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#94A3B8]">
                      src={cmp.utmSource} / med={cmp.utmMedium} / cmp={cmp.utmCampaign}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#A3E635]">
                      R$ {cmp.estimatedCac.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono">R$ {cmp.adSpend.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={cmp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 5. PEDIDOS & TIMELINE AUDITÁVEL (Seções 13, 14 e 26) */}
      {/* ==================================================================== */}
      {section === 'PEDIDOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card
              title="Centro de Pedidos (#LC-XXXXX)"
              subtitle="Status Financeiro e Status Operacional independentes"
            >
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedOrder?.id === ord.id
                        ? 'bg-[#171B24] border-[#A3E635]'
                        : 'bg-[#090B0E] border-[#232938]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#A3E635]">
                          {ord.orderNumber}
                        </span>
                        <StatusBadge status={ord.consolidatedStatus} />
                      </div>
                      <span className="font-mono text-sm font-bold text-[#F3F5F8]">
                        R$ {ord.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs text-[#94A3B8]">
                      <div>
                        <strong>Cliente:</strong> {ord.customerSnapshot.name}
                      </div>
                      <div>
                        <strong>Vendedor:</strong> {ord.sellerName}
                      </div>
                      <div>
                        <strong>Rastreio:</strong>{' '}
                        <span className="font-mono text-[#06B6D4]">
                          {ord.trackingCode || 'Em fila'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#232938] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#64748B]">Financeiro:</span>
                        <StatusBadge status={ord.financialStatus} />
                        <span className="text-[#64748B] ml-2">Operacional:</span>
                        <StatusBadge status={ord.operationalStatus} />
                      </div>
                      <div className="flex gap-1.5">
                        {(['picking', 'packing', 'shipped', 'delivered'] as const).map((st) => (
                          <button
                            key={st}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateOrderOperationalStatus(ord.id, st);
                            }}
                            className="px-2 py-0.5 rounded bg-[#11141B] hover:bg-[#A3E635] hover:text-[#090B0E] border border-[#232938] text-[10px] font-mono uppercase cursor-pointer"
                          >
                            → {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            {selectedOrder ? (
              <Card
                title={`Auditoria & Timeline ${selectedOrder.orderNumber}`}
                subtitle="Cada transição registra evento, ator, valor anterior e novo valor"
              >
                <div className="mb-4 bg-[#090B0E] p-3 rounded-lg border border-[#232938] text-xs space-y-1">
                  <div>
                    <strong>Oferta:</strong> {selectedOrder.offerName}
                  </div>
                  <div>
                    <strong>Campanha:</strong> {selectedOrder.campaignName}
                  </div>
                  <div>
                    <strong>Endereço Completo (Restrito Admin/WMS):</strong>{' '}
                    {selectedOrder.customerSnapshot.street}, {selectedOrder.customerSnapshot.number} —{' '}
                    {selectedOrder.customerSnapshot.city}/{selectedOrder.customerSnapshot.state} (CEP:{' '}
                    {selectedOrder.customerSnapshot.cep})
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
              <EmptyState title="Selecione um pedido" description="Clique em um pedido para ver detalhes." />
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. PAGAMENTOS & RECONCILIAÇÃO DE WEBHOOKS (Seção 12) */}
      {/* ==================================================================== */}
      {section === 'PAGAMENTOS' && (
        <Card
          title="Gateway de Pagamentos & Reconciliação de Webhooks"
          subtitle="Proteção contra duplicidade (Idempotency Key), validação HMAC e separação financeira"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#232938] text-[#94A3B8] uppercase">
                  <th className="py-3 px-3">Pedido</th>
                  <th className="py-3 px-3">Ref. Externa</th>
                  <th className="py-3 px-3">Chave Idempotência</th>
                  <th className="py-3 px-3">Método</th>
                  <th className="py-3 px-3">Valor / Taxa</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330]">
                {payments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="py-3 px-3 font-bold text-[#A3E635]">{pay.orderNumber}</td>
                    <td className="py-3 px-3 text-[#94A3B8]">{pay.externalReference}</td>
                    <td className="py-3 px-3 text-[#64748B]">{pay.idempotencyKey}</td>
                    <td className="py-3 px-3">{pay.method}</td>
                    <td className="py-3 px-3">
                      R$ {pay.amount.toFixed(2)}{' '}
                      <span className="text-[#64748B]">(-R$ {pay.gatewayFee.toFixed(2)})</span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={pay.status} />
                    </td>
                    <td className="py-3 px-3">
                      {pay.status === 'APPROVED' && (
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleRefundPayment(pay.id)}
                        >
                          Reembolsar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 7. FULFILLMENT & LOGÍSTICA WMS (Seções 11 e 15) */}
      {/* ==================================================================== */}
      {(section === 'FULFILLMENT' || section === 'LOGISTICA') && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: '1. Pagos (Fila)', st: 'waiting' },
              { label: '2. Separação', st: 'picking' },
              { label: '3. Embalagem', st: 'packing' },
              { label: '4. Expedição', st: 'ready_to_ship' },
              { label: '5. Enviado', st: 'shipped' },
              { label: '6. Entregue', st: 'delivered' },
              { label: '7. Exceções', st: 'exception' },
            ].map((col) => {
              const count = orders.filter((o) => o.operationalStatus === col.st).length;
              return (
                <div
                  key={col.st}
                  className="bg-[#11141B] border border-[#232938] rounded-xl p-3 text-center"
                >
                  <div className="text-[11px] font-mono text-[#94A3B8] uppercase">{col.label}</div>
                  <div className="text-2xl font-bold font-display text-[#A3E635] mt-1">{count}</div>
                </div>
              );
            })}
          </div>

          <Card
            title="Operação de Fulfillment & Controle de Exceções Logísticas"
            subtitle="Avance os pedidos elegíveis pela esteira física ou registre exceções (endereço inválido, atraso, devolução)"
          >
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#171B24] border border-[#232938] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#A3E635]">
                        {ord.orderNumber}
                      </span>
                      <StatusBadge status={ord.financialStatus} />
                      <StatusBadge status={ord.operationalStatus} />
                      {ord.exceptionReason && (
                        <Badge tone="danger">EXCEÇÃO: {ord.exceptionReason}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-[#F3F5F8] font-semibold">
                      Itens para Conferência:{' '}
                      {ord.items.map((i) => `${i.quantity}x ${i.productName} (${i.sku})`).join(', ')}
                    </div>
                    <div className="text-xs text-[#94A3B8] font-mono">
                      Destinatário: {ord.customerSnapshot.name} • CEP: {ord.customerSnapshot.cep} •
                      Serviço: {ord.shippingService} • Rastreio:{' '}
                      <strong className="text-[#06B6D4]">{ord.trackingCode || 'Não emitido'}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'picking')}
                    >
                      1. Separação
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'packing')}
                    >
                      2. Embalagem
                    </Button>
                    <Button
                      size="xs"
                      variant="cyan"
                      onClick={() => handleUpdateOrderOperationalStatus(ord.id, 'ready_to_ship')}
                    >
                      3. Emitir Etiqueta
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
                      5. Entregue
                    </Button>
                    {ord.trackingCode && (
                      <a
                        href={`/api/shipments/label/${ord.trackingCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#A3E635]/15 text-[#A3E635] border border-[#A3E635]/40 hover:bg-[#A3E635]/25"
                      >
                        Imprimir Etiqueta ({ord.trackingCode})
                      </a>
                    )}
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() =>
                        handleUpdateOrderOperationalStatus(ord.id, 'exception', 'atraso')
                      }
                    >
                      Reportar Exceção
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. CRM, LEADS, CLIENTES & PRIVACIDADE LGPD (Seções 16 e 32) */}
      {/* ==================================================================== */}
      {(section === 'CRM' || section === 'LEADS' || section === 'CLIENTES') && (
        <div className="space-y-6">
          <Card
            title="Pipeline CRM: LEAD → INTERESSADO → OFERTA → CHECKOUT → CLIENTE → RECOMPRA"
            subtitle="Armazena histórico de interações, ofertas apresentadas e ofertas efetivamente compradas"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leads.map((ld) => (
                <div
                  key={ld.id}
                  className="bg-[#171B24] border border-[#232938] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#F3F5F8]">{ld.name}</span>
                    <StatusBadge status={ld.stage} />
                  </div>
                  <div className="text-xs font-mono text-[#94A3B8]">{ld.contact}</div>
                  <div className="text-xs">
                    <span className="text-[#64748B] block">Ofertas Apresentadas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ld.offersPresented.map((o) => (
                        <Badge key={o} tone="cyan">
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs">
                    <span className="text-[#64748B] block">Ofertas Compradas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ld.offersPurchased.length === 0 ? (
                        <span className="text-[#64748B]">Nenhuma compra ainda</span>
                      ) : (
                        ld.offersPurchased.map((o) => (
                          <Badge key={o} tone="emerald">
                            {o}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Base de Clientes da Operação & Direitos do Titular (LGPD)"
            subtitle="Permite acesso, correção e anonimização de dados pessoais com registro de auditoria"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#232938] text-[#94A3B8] uppercase font-mono">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">E-mail / Telefone</th>
                    <th className="py-3 px-3">CPF</th>
                    <th className="py-3 px-3">Localidade</th>
                    <th className="py-3 px-3">Status LGPD</th>
                    <th className="py-3 px-3">Ação Privacidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2330]">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-bold text-[#F3F5F8]">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-[#94A3B8]">
                        {c.email} / {c.phone}
                      </td>
                      <td className="py-3 px-3 font-mono">{c.cpf}</td>
                      <td className="py-3 px-3">
                        {c.city}/{c.state}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone={c.anonymized ? 'amber' : 'emerald'}>
                          {c.anonymized ? 'ANONIMIZADO' : 'ATIVO / OPT-IN'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {!c.anonymized && (
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => handleAnonymizeCustomer(c.id)}
                          >
                            Anonimizar (LGPD)
                          </Button>
                        )}
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
      {/* 9. VENDEDORES & COMISSÕES CONGELADAS (Seções 17 e 18) */}
      {/* ==================================================================== */}
      {(section === 'VENDEDORES' || section === 'COMISSOES') && (
        <Card
          title="Comissões Congeladas por Pedido & Governança de Vendedores"
          subtitle="A comissão é gravada de forma imutável na criação do pedido para evitar alterações retroativas"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#232938] text-[#94A3B8] uppercase">
                  <th className="py-3 px-3">Vendedor</th>
                  <th className="py-3 px-3">Pedido</th>
                  <th className="py-3 px-3">Base Cálculo</th>
                  <th className="py-3 px-3">% Congelado</th>
                  <th className="py-3 px-3">Valor Comissão</th>
                  <th className="py-3 px-3">Regra Snapshot</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330]">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-3 font-sans font-bold text-[#F3F5F8]">{c.sellerName}</td>
                    <td className="py-3 px-3 font-bold text-[#A3E635]">{c.orderNumber}</td>
                    <td className="py-3 px-3">R$ {c.calculationBase.toFixed(2)}</td>
                    <td className="py-3 px-3">{c.percentage}%</td>
                    <td className="py-3 px-3 font-bold text-[#10B981]">R$ {c.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 text-[11px] text-[#94A3B8]">{c.ruleUsed}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 10. AUTOMAÇÕES, RECUPERAÇÃO E PÓS-VENDA (Seções 19 e 20) */}
      {/* ==================================================================== */}
      {section === 'AUTOMACOES' && (
        <Card
          title="Réguas de Recuperação & Jornada Pós-Venda (D0 → Envio → Entrega → Recompra)"
          subtitle="Desacopladas via NotificationProvider (WhatsApp / E-mail) com controle de janela permitida e opt-out"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automationRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-[#171B24] border border-[#232938] rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Badge tone="lime">GATILHO: {rule.triggerEvent}</Badge>
                  <Badge tone="cyan">{rule.channel}</Badge>
                </div>
                <h4 className="text-sm font-bold text-[#F3F5F8]">{rule.name}</h4>
                <p className="text-xs text-[#94A3B8] bg-[#090B0E] p-2.5 rounded border border-[#232938] font-mono">
                  {rule.messageTemplate}
                </p>
                <div className="flex flex-wrap justify-between text-[11px] font-mono text-[#64748B]">
                  <span>Atraso: {rule.delayMinutes} min</span>
                  <span>Janela: {rule.allowedWindow}</span>
                  <span>Opt-out respeitado: {rule.respectOptOut ? 'SIM' : 'TRANSACIONAL'}</span>
                  <span className="text-[#A3E635]">Disparos: {rule.executionsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 11. ECONOMIA UNITÁRIA & ANALYTICS (Seções 21 e 22) */}
      {/* ==================================================================== */}
      {(section === 'ECONOMIA' || section === 'ANALYTICS') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Simulador Waterfall de Economia Unitária (Contribuição da Venda)"
            subtitle="RECEITA BRUTA − descontos − impostos − gateway − comissão − produto − embalagem − frete subsidiado − CAC"
          >
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input
                label="Receita Bruta (R$)"
                type="number"
                value={simRevenue}
                onChange={(e) => setSimRevenue(Number(e.target.value))}
              />
              <Input
                label="Descontos (R$)"
                type="number"
                value={simDiscount}
                onChange={(e) => setSimDiscount(Number(e.target.value))}
              />
              <Input
                label="Custo Produto CMV (R$)"
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

            <div className="bg-[#090B0E] border border-[#232938] rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-[#F3F5F8]">
                <span>(+) RECEITA BRUTA</span>
                <span>R$ {simRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#EF4444]">
                <span>(−) Descontos Comerciais & Cupom</span>
                <span>- R$ {simDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Impostos / Encargos ({econConfig.taxRatePercent}%)</span>
                <span>- R$ {simTaxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Taxa Gateway ({econConfig.gatewayFeePercent}% + R$ 0,99)</span>
                <span>- R$ {simGateway.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Comissão Vendedor ({econConfig.defaultCommissionPercent}%)</span>
                <span>- R$ {simCommission.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Custo Físico do Produto (CMV)</span>
                <span>- R$ {simProdCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Embalagem & Operação WMS</span>
                <span>- R$ {econConfig.packagingAndOpCostPerOrder.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) Frete Subsidiado</span>
                <span>- R$ {simShipSubsidy.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>(−) CAC Alvo Atribuído</span>
                <span>- R$ {econConfig.defaultCacTarget.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-[#232938] flex justify-between items-center text-sm font-bold">
                <span>(=) CONTRIBUIÇÃO DA VENDA</span>
                <span
                  className={
                    simMarginPct >= econConfig.minContributionMarginPercent
                      ? 'text-[#A3E635]'
                      : 'text-[#EF4444]'
                  }
                >
                  R$ {simContribution.toFixed(2)} ({simMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </Card>

          <Card
            title="Travas do Motor Comercial (Governança de Preço)"
            subtitle="O backend bloqueia qualquer oferta ou cupom que viole estes limites"
          >
            <form onSubmit={handleSaveEconomicsConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  label="Comissão Padrão (%)"
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
                  label="CAC Suportável Alvo (R$)"
                  type="number"
                  value={econConfig.defaultCacTarget}
                  onChange={(e) =>
                    setEconConfig({
                      ...econConfig,
                      defaultCacTarget: Number(e.target.value),
                    })
                  }
                />
                <Input
                  label="Janela de Recompra Padrão (Dias)"
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
              <Button type="submit">Salvar Regras Comerciais</Button>
            </form>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 12. COMPLIANCE GATE (Seção 24) */}
      {/* ==================================================================== */}
      {section === 'COMPLIANCE' && (
        <Card
          title="Compliance Gate — Aprovação Regulatória & Comercial"
          subtitle="Nenhuma oferta é publicada sem 100% do checklist aprovado (Estados: DRAFT, UNDER_REVIEW, APPROVED, REJECTED, ARCHIVED)"
        >
          <div className="space-y-4">
            {complianceReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-[#171B24] border border-[#232938] rounded-xl p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone="cyan">{rev.targetType}</Badge>
                      <h4 className="text-sm font-bold text-[#F3F5F8]">{rev.targetName}</h4>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">{rev.notes}</p>
                  </div>
                  <StatusBadge status={rev.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[#090B0E] p-3 rounded-lg border border-[#232938] text-xs">
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
                      className="flex items-center gap-2 cursor-pointer text-[#F3F5F8]"
                    >
                      <input
                        type="checkbox"
                        checked={rev.checklist[key]}
                        onChange={() => handleUpdateCompliance(rev, undefined, key)}
                        className="accent-[#A3E635]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-[#64748B]">
                    Aprovador responsável: {rev.approvedBy || 'Pendente'}
                  </span>
                  <div className="flex gap-2">
                    {(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const).map((st) => (
                      <Button
                        key={st}
                        size="xs"
                        variant={st === 'APPROVED' ? 'primary' : st === 'REJECTED' ? 'danger' : 'secondary'}
                        onClick={() => handleUpdateCompliance(rev, st)}
                      >
                        Definir {st}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* 13. AUDITORIA IMUTÁVEL, RBAC, INTEGRAÇÕES & CONFIGURAÇÕES */}
      {/* ==================================================================== */}
      {section === 'AUDITORIA' && (
        <Card
          title="AuditLog Imutável de Governança (Seção 23)"
          subtitle="Registra usuário, papel, ação, entidade, valor anterior, valor novo, timestamp e IP"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#232938] text-[#94A3B8] uppercase">
                  <th className="py-3 px-2">Timestamp</th>
                  <th className="py-3 px-2">Usuário / Papel</th>
                  <th className="py-3 px-2">Ação</th>
                  <th className="py-3 px-2">Entidade</th>
                  <th className="py-3 px-2">Valor Anterior → Novo</th>
                  <th className="py-3 px-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330]">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-2 text-[#64748B]">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-[#F3F5F8]">{log.userName}</span>{' '}
                      <Badge tone="slate">{log.userRole}</Badge>
                    </td>
                    <td className="py-2.5 px-2 font-bold text-[#A3E635]">{log.action}</td>
                    <td className="py-2.5 px-2 text-[#06B6D4]">
                      {log.entity} ({log.entityId})
                    </td>
                    <td className="py-2.5 px-2 text-[#94A3B8]">
                      {log.previousValue} → <strong className="text-white">{log.newValue}</strong>
                    </td>
                    <td className="py-2.5 px-2 text-[#64748B]">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(section === 'USUARIOS' ||
        section === 'PERMISSOES' ||
        section === 'INTEGRACOES' ||
        section === 'CONFIGURACOES') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            title="Usuários & Controle de Acesso RBAC (2FA)"
            subtitle="Papéis operacionais: ADMIN, VENDEDOR e FULFILLMENT"
          >
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#171B24] border border-[#232938] rounded-lg p-3.5 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F3F5F8]">{u.name}</span>
                      <Badge tone="lime">{u.role}</Badge>
                      {u.twoFactorEnabled && <Badge tone="cyan">2FA ATIVO</Badge>}
                    </div>
                    <div className="text-xs font-mono text-[#94A3B8] mt-1">{u.email}</div>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="Camada Desacoplada de Integrações (Providers & Adapters)"
            subtitle="Adapters DEMO claramente identificados prontos para plug-and-play de credenciais em variáveis de ambiente"
          >
            <div className="space-y-3 text-xs font-mono">
              <div className="bg-[#090B0E] border border-[#232938] rounded-lg p-3.5">
                <div className="flex justify-between items-center">
                  <strong className="text-[#A3E635]">PaymentProvider Interface</strong>
                  <Badge tone="amber">DEMO_PAGARME_V5_ADAPTER</Badge>
                </div>
                <p className="text-[#94A3B8] mt-1 font-sans">
                  Métodos implementados: createPayment, getPayment, refund, validateWebhook (HMAC-SHA256 + Idempotência).
                </p>
              </div>

              <div className="bg-[#090B0E] border border-[#232938] rounded-lg p-3.5">
                <div className="flex justify-between items-center">
                  <strong className="text-[#06B6D4]">ShippingProvider Interface</strong>
                  <Badge tone="amber">DEMO_MELHOR_ENVIO_LOGGI_ADAPTER</Badge>
                </div>
                <p className="text-[#94A3B8] mt-1 font-sans">
                  Métodos implementados: quote, createShipment, getTracking, cancelShipment + Fallback Automático de Contingência.
                </p>
              </div>

              <div className="bg-[#090B0E] border border-[#232938] rounded-lg p-3.5">
                <div className="flex justify-between items-center">
                  <strong className="text-[#10B981]">NotificationProvider Interface</strong>
                  <Badge tone="amber">DEMO_ZAPI_RESEND_ADAPTER</Badge>
                </div>
                <p className="text-[#94A3B8] mt-1 font-sans">
                  Métodos implementados: sendWhatsApp, sendEmail (respeitando janela horária e opt-out LGPD).
                </p>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Card
              title="20 · Matriz de Decisões dos Sócios (Parametrizável — Zero Hardcode)"
              subtitle="Conforme definido no MVP Mestre Revisado v2, o código não engessa essas regras; todas são governadas nos módulos abaixo"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#232938] text-[#94A3B8] uppercase font-mono">
                      <th className="py-2.5 px-3">Item Estratégico</th>
                      <th className="py-2.5 px-3">Status no Blueprint</th>
                      <th className="py-2.5 px-3">Fechamento Necessário</th>
                      <th className="py-2.5 px-3">Módulo de Parametrização na Plataforma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2330]">
                    {[
                      { item: 'Produtos (100 caps / ~R$ 15 base)', status: 'Base definida', tone: 'emerald' as const, desc: 'Fichas técnicas e status regulatório ANVISA pós-09/2024 por SKU', target: 'PRODUTOS' as AdminSection },
                      { item: 'Combos', status: 'Parametrizável', tone: 'amber' as const, desc: 'Matriz de compatibilidade multi-SKU + comunicação', target: 'COMBOS' as AdminSection },
                      { item: 'Preços (1 un, Kit 2, Kit 3+, Combo)', status: 'Parametrizável', tone: 'amber' as const, desc: 'Escada de valor e ancoragem no Offer Engine', target: 'OFERTAS' as AdminSection },
                      { item: 'Comissão Congelada', status: 'Parametrizável', tone: 'amber' as const, desc: 'Percentual/valor + regra congelada no pedido', target: 'COMISSOES' as AdminSection },
                      { item: 'Gateway de Pagamento', status: 'Adapter Pronto', tone: 'cyan' as const, desc: 'PaymentProvider + taxas + métodos PIX/Cartão/Boleto', target: 'PAGAMENTOS' as AdminSection },
                      { item: 'Frete & Logística', status: 'Adapter Pronto', tone: 'cyan' as const, desc: 'ShippingProvider + CEP origem + frete subsidiado + fallback', target: 'LOGISTICA' as AdminSection },
                      { item: 'Reembolso & Chargeback', status: 'Parametrizável', tone: 'amber' as const, desc: 'Política operacional e estorno de comissão', target: 'PAGAMENTOS' as AdminSection },
                      { item: 'WhatsApp / E-mail', status: 'Adapter Pronto', tone: 'cyan' as const, desc: 'NotificationProvider + janela de disparo + opt-out LGPD', target: 'AUTOMACOES' as AdminSection },
                      { item: 'Permissões RBAC', status: 'Ativo', tone: 'emerald' as const, desc: 'Separação estrita Admin / Vendedor / Fulfillment', target: 'PERMISSOES' as AdminSection },
                      { item: 'Recompra', status: 'Parametrizável', tone: 'amber' as const, desc: 'Janelas em dias (ex: 60D) e mensagens permitidas', target: 'AUTOMACOES' as AdminSection },
                      { item: 'Margem Mínima & Teto Desconto', status: 'Ativo no Motor', tone: 'lime' as const, desc: 'Trava automática de margem mínima + teto de desconto + CAC', target: 'ECONOMIA' as AdminSection },
                    ].map((row) => (
                      <tr key={row.item}>
                        <td className="py-2.5 px-3 font-bold text-[#F3F5F8]">{row.item}</td>
                        <td className="py-2.5 px-3"><Badge tone={row.tone}>{row.status}</Badge></td>
                        <td className="py-2.5 px-3 text-[#94A3B8]">{row.desc}</td>
                        <td className="py-2.5 px-3">
                          <Button size="xs" variant="secondary" onClick={() => setSection(row.target)}>
                            Abrir {row.target}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: CRIAR/EDITAR PRODUTO, OFERTA E CUPOM */}
      {/* ==================================================================== */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? `Editar Produto ${editingProduct.sku}` : 'Cadastrar Novo Produto Físico'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Único"
              value={prodForm.sku}
              onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
              required
            />
            <Select
              label="Categoria (Taxonomia Interna)"
              value={prodForm.category}
              onChange={(e) =>
                setProdForm({ ...prodForm, category: e.target.value as ProductCategory })
              }
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
          <Input
            label="Nome Interno Técnico"
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
              label="CMV Unitário (R$)"
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
            label="Anexar Laudo Técnico / Dossiê RDC"
            onUpload={(fn) => onNotify(`Arquivo ${fn} vinculado ao dossiê!`, 'info')}
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
        title="Offer Engine — Criar Nova Condição Comercial"
      >
        <form onSubmit={handleCreateOffer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código Curto do Link (/o/XXXX)"
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
            label="Título Comercial da Oferta"
            value={offerForm.name}
            onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Produto Físico Principal"
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
              label="Preço Regular Ancoragem (R$)"
              type="number"
              step="0.1"
              value={offerForm.regularPrice}
              onChange={(e) =>
                setOfferForm({ ...offerForm, regularPrice: Number(e.target.value) })
              }
              required
            />
            <Input
              label="Preço Promocional da Oferta (R$)"
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
            label="Status Inicial no Compliance Gate"
            value={offerForm.complianceStatus}
            onChange={(e) =>
              setOfferForm({
                ...offerForm,
                complianceStatus: e.target.value as ComplianceState,
              })
            }
            options={[
              { value: 'DRAFT', label: 'DRAFT (Bloqueado para publicação)' },
              { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW (Em análise)' },
              { value: 'APPROVED', label: 'APPROVED (Aprovado pelo Compliance)' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOfferModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Validar Margem & Criar Oferta</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Criar Novo Cupom Comercial"
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
