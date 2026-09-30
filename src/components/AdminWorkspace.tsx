import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
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
  Trash2,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  FileUploader,
  formatCurrencyBRL,
  formatDateBR,
  formatIntegerBR,
  formatOrderDateTimeBR,
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
  ProductClaim,
  ProductDocument,
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

  // Catalog Filters & Product Detail Drawer State
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('ALL');
  const [productStatusFilter, setProductStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  >('ALL');
  const [productComplianceFilter, setProductComplianceFilter] = useState<
    'ALL' | 'APPROVED' | 'PENDING_REVIEW' | 'MISSING_DOCS'
  >('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetailTab, setProductDetailTab] = useState<'GERAL' | 'ROTULO' | 'DOCUMENTOS'>(
    'GERAL'
  );
  const [quickStockValue, setQuickStockValue] = useState<number>(0);
  const [quickCostValue, setQuickCostValue] = useState<number>(0);

  // Document & Claim Creation State inside Product Detail Drawer
  const [newDocForm, setNewDocForm] = useState<{
    title: string;
    docType: ProductDocument['docType'];
    version: string;
  }>({
    title: '',
    docType: 'LAUDO_TECNICO',
    version: 'v1.0',
  });
  const [newClaimForm, setNewClaimForm] = useState({
    claimText: '',
    regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V',
  });

  // Product Create/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const getInitialProductForm = () => ({
    sku: '',
    internalName: '',
    commercialName: '',
    category: 'Emagrecimento' as ProductCategory,
    description: '',
    composition: '',
    presentation: 'Frasco 60 cápsulas',
    unitQuantity: 60,
    batchNumber: `LT-${new Date().getFullYear()}-01A`,
    expiryDate: '2028-12-31',
    unitCost: 15.0,
    stockQuantity: 500,
    status: 'ACTIVE' as Product['status'],
    complianceStatus: 'DRAFT' as ComplianceState,
    regulatoryInfo:
      'Suplemento Alimentar notificado conforme exigência ANVISA vigente e IN 28/2018.',
    warnings:
      'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA DE CONSUMO INDICADA NA EMBALAGEM. MANTENHA FORA DO ALCANCE DE CRIANÇAS.',
    usageInstructions: 'Ingerir 2 (duas) cápsulas ao dia ou conforme orientação profissional.',
    restrictions: 'Uso adulto (>= 19 anos). Não deve ser consumido por gestantes, lactantes e crianças.',
    labelingInfo: 'Rotulagem nutricional padrão ANVISA RDC 429/2020 e IN 75/2020. Não contém glúten.',
    documents: [] as ProductDocument[],
    approvedClaims: [] as ProductClaim[],
  });

  const [prodForm, setProdForm] = useState(getInitialProductForm);

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProdForm(getInitialProductForm());
    setProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
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
      status: prod.status,
      complianceStatus: prod.complianceStatus,
      regulatoryInfo: prod.regulatoryInfo,
      warnings: prod.warnings,
      usageInstructions: prod.usageInstructions,
      restrictions: prod.restrictions,
      labelingInfo: prod.labelingInfo,
      documents: [...(prod.documents || [])],
      approvedClaims: [...(prod.approvedClaims || [])],
    });
    setProductModalOpen(true);
  };

  const openProductDetail = (
    prod: Product,
    initialTab: 'GERAL' | 'ROTULO' | 'DOCUMENTOS' = 'GERAL'
  ) => {
    setSelectedProductId(prod.id);
    setProductDetailTab(initialTab);
    setQuickStockValue(prod.stockQuantity);
    setQuickCostValue(prod.unitCost);
  };

  const activeSelectedProduct = products.find((p) => p.id === selectedProductId) || null;

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
          ? `Produto ${data.product.sku} atualizado com sucesso!`
          : `Produto ${data.product.sku} cadastrado no catálogo!`,
        'success'
      );
      setProductModalOpen(false);
      setEditingProduct(null);
      if (selectedProductId === data.product.id) {
        setQuickStockValue(data.product.stockQuantity);
        setQuickCostValue(data.product.unitCost);
      }
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
      onNotify(
        `Produto ${prod.sku} ${nextStatus === 'ACTIVE' ? 'ativado' : 'desativado'}.`,
        'info'
      );
      onRefresh();
    } else {
      const data = await res.json().catch(() => ({}));
      onNotify(data.error || 'Erro ao atualizar status do produto.', 'error');
    }
  };

  const handleUpdateProductQuickFields = async (
    prodId: string,
    patch: Partial<Product>,
    successMsg: string
  ) => {
    const res = await fetch(`/api/products/${prodId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Não foi possível atualizar o produto.', 'error');
    } else {
      onNotify(successMsg, 'success');
      onRefresh();
    }
  };

  const handleAddProductDocument = async (e: React.FormEvent, prod: Product) => {
    e.preventDefault();
    if (!newDocForm.title.trim()) {
      onNotify('Informe o título do documento ou laudo técnico.', 'error');
      return;
    }
    const res = await fetch(`/api/products/${prod.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: newDocForm.title.trim(),
        docType: newDocForm.docType,
        version: newDocForm.version.trim() || 'v1.0',
        status: 'VALID',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Erro ao anexar documento.', 'error');
    } else {
      onNotify(`Documento "${data.document.title}" anexado ao produto ${prod.sku}!`, 'success');
      setNewDocForm({ title: '', docType: 'LAUDO_TECNICO', version: 'v1.0' });
      onRefresh();
    }
  };

  const handleRemoveProductDocument = async (prodId: string, docId: string) => {
    const res = await fetch(`/api/products/${prodId}/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onNotify('Documento removido do produto.', 'info');
      onRefresh();
    } else {
      onNotify('Não foi possível remover o documento.', 'error');
    }
  };

  const handleAddProductClaim = async (e: React.FormEvent, prod: Product) => {
    e.preventDefault();
    if (!newClaimForm.claimText.trim()) {
      onNotify('Informe o texto da alegação funcional autorizada.', 'error');
      return;
    }
    const res = await fetch(`/api/products/${prod.id}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        claimText: newClaimForm.claimText.trim(),
        regulatoryBasis: newClaimForm.regulatoryBasis.trim() || 'IN ANVISA nº 28/2018 - Anexo V',
        status: 'APPROVED',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Erro ao adicionar alegação.', 'error');
    } else {
      onNotify('Alegação funcional adicionada ao produto!', 'success');
      setNewClaimForm({ claimText: '', regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V' });
      onRefresh();
    }
  };

  const handleRemoveProductClaim = async (prodId: string, claimId: string) => {
    const res = await fetch(`/api/products/${prodId}/claims/${claimId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onNotify('Alegação removida do produto.', 'info');
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

  const totalAttentionCount =
    awaitingPreparationOrders.length + exceptionOrders.length + pendingComplianceOffers.length;
  const deliveredOrdersCount = orders.filter((o) => o.operationalStatus === 'delivered').length;
  const inProgressOrdersCount = orders.filter(
    (o) =>
      o.financialStatus === 'approved' &&
      ['waiting', 'picking', 'packing', 'ready_to_ship', 'shipped'].includes(
        o.operationalStatus
      )
  ).length;

  const attentionSummaryParts: string[] = [];
  if (awaitingPreparationOrders.length > 0) {
    attentionSummaryParts.push(`${awaitingPreparationOrders.length} para enviar`);
  }
  if (exceptionOrders.length > 0) {
    attentionSummaryParts.push(`${exceptionOrders.length} com problema`);
  }
  if (pendingComplianceOffers.length > 0) {
    attentionSummaryParts.push(
      `${pendingComplianceOffers.length} ${
        pendingComplianceOffers.length === 1 ? 'oferta para revisar' : 'ofertas para revisar'
      }`
    );
  }
  const attentionSubvalue =
    attentionSummaryParts.length > 0 ? attentionSummaryParts.join(' · ') : 'Nenhuma pendência agora';

  const getOrderQuickStatus = (
    ord: Order
  ): { label: string; tone: 'emerald' | 'cyan' | 'amber' | 'danger' | 'lime' | 'slate' } => {
    if (ord.financialStatus === 'pending') return { label: 'Pendente', tone: 'amber' };
    if (ord.financialStatus === 'refunded') return { label: 'Reembolsado', tone: 'slate' };
    if (ord.financialStatus === 'declined' || ord.financialStatus === 'chargeback') {
      return { label: 'Cancelado', tone: 'danger' };
    }
    if (ord.operationalStatus === 'delivered') return { label: 'Pago · Entregue', tone: 'emerald' };
    if (ord.operationalStatus === 'shipped') {
      return { label: 'Pago · Enviando', tone: 'cyan' };
    }
    if (ord.operationalStatus === 'exception' || ord.operationalStatus === 'returned') {
      return { label: 'Pago · Problema', tone: 'danger' };
    }
    return { label: 'Pago · Preparando', tone: 'lime' };
  };

  return (
    <div className="space-y-8">
      {/* ==================================================================== */}
      {/* 1. VISÃO GERAL — Enxuta, comercial e focada no que importa */}
      {/* ==================================================================== */}
      {activeArea === 'VISAO_GERAL' && (
        <div className="space-y-8">
          {/* Cabeçalho limpo com apenas 1 ação primária */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-[var(--text-primary)]">
                Visão geral
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Acompanhe o que está acontecendo na sua operação.
              </p>
            </div>
            <Button
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setSection('VENDAS');
                setSalesTab('OFERTAS');
                setOfferModalOpen(true);
              }}
            >
              Nova oferta
            </Button>
          </div>

          {/* 4 KPIs curtos, sóbrios e sem duplicação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Vendas"
              value={formatCurrencyBRL(grossSales)}
              subvalue={`${approvedOrders.length} ${
                approvedOrders.length === 1 ? 'pago' : 'pagos'
              } · Ticket médio ${formatCurrencyBRL(avgTicket)}`}
              accent="emerald"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KPI
              label="Pedidos"
              value={orders.length}
              subvalue={`${deliveredOrdersCount} ${
                deliveredOrdersCount === 1 ? 'entregue' : 'entregues'
              } · ${inProgressOrdersCount} em andamento`}
              accent="lime"
              icon={<Package className="w-4 h-4" />}
            />
            <KPI
              label="A Receber"
              value={formatCurrencyBRL(receivablePending)}
              subvalue={`${pendingPaymentOrders.length} ${
                pendingPaymentOrders.length === 1 ? 'pendente' : 'pendentes'
              }`}
              accent="cyan"
              icon={<CreditCard className="w-4 h-4" />}
            />
            <KPI
              label="Atenção"
              value={totalAttentionCount}
              subvalue={attentionSubvalue}
              accent={totalAttentionCount > 0 ? 'danger' : 'lime'}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>

          {/* 2. Bloco operacional compacto: Precisa da sua atenção */}
          <div className="modern-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight mb-3">
              Precisa da sua atenção
            </h3>
            {totalAttentionCount === 0 ? (
              <div className="py-1 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Nenhuma pendência operacional no momento.</span>
              </div>
            ) : (
              <div className="space-y-2 max-w-2xl">
                {awaitingPreparationOrders.length > 0 && (
                  <div className="py-2.5 px-3.5 rounded-xl bg-[var(--bg-subtle)]/60 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>
                        <strong className="font-semibold">{awaitingPreparationOrders.length}</strong>{' '}
                        {awaitingPreparationOrders.length === 1
                          ? 'pedido aguardando envio'
                          : 'pedidos aguardando envio'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('ENTREGAS');
                        setDeliveryFilter('AGUARDANDO');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Ver pedidos</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {exceptionOrders.length > 0 && (
                  <div className="py-2.5 px-3.5 rounded-xl bg-rose-500/[0.06] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>
                        <strong className="font-semibold text-rose-600 dark:text-rose-400">
                          {exceptionOrders.length}
                        </strong>{' '}
                        {exceptionOrders.length === 1
                          ? 'entrega com problema'
                          : 'entregas com problema'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('ENTREGAS');
                        setDeliveryFilter('PROBLEMAS');
                      }}
                      className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Resolver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {pendingComplianceOffers.length > 0 && (
                  <div className="py-2.5 px-3.5 rounded-xl bg-[var(--bg-subtle)]/60 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)]">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span>
                        <strong className="font-semibold">{pendingComplianceOffers.length}</strong>{' '}
                        {pendingComplianceOffers.length === 1
                          ? 'oferta aguardando aprovação'
                          : 'ofertas aguardando aprovação'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSection('PRODUTOS');
                        setProductTab('COMPLIANCE');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Revisar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Pedidos recentes (4 colunas limpas: Pedido + Data/Hora, Cliente, Status, Valor BRL) */}
          <Card
            title="Pedidos recentes"
            action={
              <button
                type="button"
                onClick={() => {
                  setSection('VENDAS');
                  setSalesTab('PEDIDOS');
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {orders.length === 0 ? (
              <EmptyState
                title="Nenhum pedido ainda"
                description="Quando uma venda acontecer, os pedidos recentes aparecerão aqui."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      <th className="py-3 px-3 font-semibold">Pedido</th>
                      <th className="py-3 px-3 font-semibold">Cliente</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {orders.slice(0, 6).map((ord) => {
                      const quickStatus = getOrderQuickStatus(ord);
                      return (
                        <tr
                          key={ord.id}
                          onClick={() => {
                            setSelectedOrder(ord);
                            setSection('VENDAS');
                            setSalesTab('PEDIDOS');
                          }}
                          className="hover:bg-[var(--bg-subtle)]/60 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-3">
                            <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              {ord.orderNumber}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                              {formatOrderDateTimeBR(ord.createdAt)}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 font-medium text-[var(--text-primary)]">
                            {ord.customerSnapshot.name}
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge tone={quickStatus.tone}>{quickStatus.label}</Badge>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            {formatCurrencyBRL(ord.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. PRODUTOS — Catálogo Operacional Enxuto + Detalhes em Drawer       */}
      {/* ==================================================================== */}
      {activeArea === 'PRODUTOS' && (
        <div className="space-y-6">
          {/* Cabeçalho Principal Enxuto */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)] tracking-tight">
                Produtos
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Gerencie seu catálogo, estoque e informações regulatórias dos produtos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button
                  onClick={() => setProductTab('CATALOGO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'CATALOGO'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Catálogo ({products.length})
                </button>
                <button
                  onClick={() => setProductTab('COMBOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'COMBOS'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Kits & Combos ({offers.filter((o) => o.offerType !== '1_UNIT').length})
                </button>
                <button
                  onClick={() => setProductTab('COMPLIANCE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    productTab === 'COMPLIANCE'
                      ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Conformidade & Rótulos ({complianceReviews.length})
                </button>
              </div>

              <Button
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={openCreateProductModal}
              >
                Novo produto
              </Button>
            </div>
          </div>

          {productTab === 'CATALOGO' &&
            (() => {
              const activeProductsCount = products.filter((p) => p.status === 'ACTIVE').length;
              const totalStockUnits = products.reduce((acc, p) => acc + p.stockQuantity, 0);
              const lowStockCount = products.filter((p) => p.stockQuantity < 150).length;
              const pendingDocsOrComplianceCount = products.filter(
                (p) => p.complianceStatus !== 'APPROVED' || p.documents.length === 0
              ).length;

              const filteredProducts = products.filter((p) => {
                const q = searchQuery.trim().toLowerCase();
                const matchesQuery =
                  !q ||
                  p.sku.toLowerCase().includes(q) ||
                  p.commercialName.toLowerCase().includes(q) ||
                  p.internalName.toLowerCase().includes(q) ||
                  p.category.toLowerCase().includes(q) ||
                  p.batchNumber.toLowerCase().includes(q);

                const matchesCategory =
                  productCategoryFilter === 'ALL' || p.category === productCategoryFilter;

                const matchesStatus =
                  productStatusFilter === 'ALL' || p.status === productStatusFilter;

                const matchesCompliance =
                  productComplianceFilter === 'ALL' ||
                  (productComplianceFilter === 'APPROVED' &&
                    p.complianceStatus === 'APPROVED' &&
                    p.documents.length > 0) ||
                  (productComplianceFilter === 'PENDING_REVIEW' &&
                    p.complianceStatus !== 'APPROVED') ||
                  (productComplianceFilter === 'MISSING_DOCS' && p.documents.length === 0);

                return matchesQuery && matchesCategory && matchesStatus && matchesCompliance;
              });

              return (
                <div className="space-y-5">
                  {/* Resumo Operacional Sóbrio do Catálogo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPI
                      label="Produtos no Catálogo"
                      value={formatIntegerBR(products.length)}
                      subvalue={`${activeProductsCount} ativos · ${
                        products.length - activeProductsCount
                      } inativos`}
                      icon={<Package className="w-4 h-4" />}
                    />
                    <KPI
                      label="Estoque Físico Total"
                      value={`${formatIntegerBR(totalStockUnits)} un`}
                      subvalue={
                        lowStockCount > 0
                          ? `${lowStockCount} com estoque de atenção`
                          : 'Abastecimento regular'
                      }
                      icon={<PackageCheck className="w-4 h-4" />}
                    />
                    <KPI
                      label="Kits & Ofertas Vinculadas"
                      value={formatIntegerBR(offers.filter((o) => o.status === 'ACTIVE').length)}
                      subvalue={`${
                        offers.filter((o) => o.offerType !== '1_UNIT').length
                      } kits multi-frascos configurados`}
                      icon={<Layers className="w-4 h-4" />}
                    />
                    <KPI
                      label="Pendências Regulatórias"
                      value={formatIntegerBR(pendingDocsOrComplianceCount)}
                      subvalue={
                        pendingDocsOrComplianceCount > 0
                          ? 'Produtos sem dossiê ou revisão aprovada'
                          : '100% do catálogo em conformidade'
                      }
                      accent={pendingDocsOrComplianceCount > 0 ? 'danger' : 'lime'}
                      icon={<ShieldCheck className="w-4 h-4" />}
                    />
                  </div>

                  {/* Barra de Busca + Filtros Rápidos */}
                  <div className="modern-card rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div className="flex-1">
                      <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Buscar por nome comercial, SKU, categoria ou lote..."
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={productCategoryFilter}
                        onChange={(e) => setProductCategoryFilter(e.target.value)}
                        aria-label="Filtrar por categoria"
                        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Todas as categorias</option>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <select
                        value={productStatusFilter}
                        onChange={(e) =>
                          setProductStatusFilter(
                            e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
                          )
                        }
                        aria-label="Filtrar por status"
                        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Todos os status</option>
                        <option value="ACTIVE">Somente ativos</option>
                        <option value="INACTIVE">Somente inativos</option>
                      </select>

                      <select
                        value={productComplianceFilter}
                        onChange={(e) =>
                          setProductComplianceFilter(
                            e.target.value as
                              | 'ALL'
                              | 'APPROVED'
                              | 'PENDING_REVIEW'
                              | 'MISSING_DOCS'
                          )
                        }
                        aria-label="Filtrar por conformidade"
                        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">Qualquer conformidade</option>
                        <option value="APPROVED">Conformidade aprovada</option>
                        <option value="PENDING_REVIEW">Revisão pendente</option>
                        <option value="MISSING_DOCS">Sem documentos anexados</option>
                      </select>

                      {(searchQuery ||
                        productCategoryFilter !== 'ALL' ||
                        productStatusFilter !== 'ALL' ||
                        productComplianceFilter !== 'ALL') && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setSearchQuery('');
                            setProductCategoryFilter('ALL');
                            setProductStatusFilter('ALL');
                            setProductComplianceFilter('ALL');
                          }}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabela Operacional de Catálogo (Enxuta e Escaneável) */}
                  <Card className="!p-0 overflow-hidden">
                    {filteredProducts.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="Nenhum produto encontrado"
                          description="Ajuste os filtros de busca ou cadastre um novo produto no catálogo."
                          action={
                            <Button
                              size="sm"
                              icon={<Plus className="w-4 h-4" />}
                              onClick={openCreateProductModal}
                            >
                              Novo produto
                            </Button>
                          }
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                              <th className="py-3.5 px-5">Produto</th>
                              <th className="py-3.5 px-4">Categoria & Apresentação</th>
                              <th className="py-3.5 px-4">Lote & Validade</th>
                              <th className="py-3.5 px-4 text-right">Custo Unit.</th>
                              <th className="py-3.5 px-4 text-right">Estoque</th>
                              <th className="py-3.5 px-4">Conformidade</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-5 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {filteredProducts.map((prod) => {
                              const validDocsCount = (prod.documents || []).filter(
                                (d) => d.status === 'VALID'
                              ).length;
                              const totalDocsCount = (prod.documents || []).length;
                              const isLowStock = prod.stockQuantity < 150;
                              const isOutOfStock = prod.stockQuantity <= 0;

                              return (
                                <tr
                                  key={prod.id}
                                  onClick={() => openProductDetail(prod, 'GERAL')}
                                  className="hover:bg-[var(--bg-subtle)]/70 transition-colors cursor-pointer group"
                                >
                                  {/* 1. Produto (Imagem, Nome Comercial, SKU) */}
                                  <td className="py-4 px-5">
                                    <div className="flex items-center gap-3.5">
                                      <img
                                        src={
                                          prod.images[0]?.url ||
                                          '/src/assets/images/product_lipotherm_pro_1790723418728.jpg'
                                        }
                                        alt={prod.commercialName}
                                        referrerPolicy="no-referrer"
                                        className="w-12 h-12 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0 bg-[var(--bg-subtle)]"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[240px]">
                                          {prod.commercialName}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                            {prod.sku}
                                          </span>
                                          <span className="text-[var(--text-muted)]">·</span>
                                          <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[160px]">
                                            {prod.internalName}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 2. Categoria & Apresentação */}
                                  <td className="py-4 px-4">
                                    <Badge tone="slate">{prod.category}</Badge>
                                    <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                                      {prod.presentation}
                                    </div>
                                  </td>

                                  {/* 3. Lote & Validade */}
                                  <td className="py-4 px-4">
                                    <div className="font-mono font-semibold text-[var(--text-primary)]">
                                      {prod.batchNumber}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums">
                                      Val: {formatDateBR(prod.expiryDate)}
                                    </div>
                                  </td>

                                  {/* 4. Custo Unitário */}
                                  <td className="py-4 px-4 text-right font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                                    {formatCurrencyBRL(prod.unitCost)}
                                  </td>

                                  {/* 5. Estoque */}
                                  <td className="py-4 px-4 text-right">
                                    <div
                                      className={`font-mono font-bold tabular-nums ${
                                        isOutOfStock
                                          ? 'text-rose-600 dark:text-rose-400'
                                          : isLowStock
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-[var(--text-primary)]'
                                      }`}
                                    >
                                      {formatIntegerBR(prod.stockQuantity)} un
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                      {isOutOfStock
                                        ? 'Sem estoque'
                                        : isLowStock
                                        ? 'Estoque baixo'
                                        : 'Em estoque'}
                                    </div>
                                  </td>

                                  {/* 6. Conformidade & Dossiê */}
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-1.5">
                                      <StatusBadge status={prod.complianceStatus} />
                                    </div>
                                    <div
                                      className={`text-[11px] mt-1 ${
                                        totalDocsCount === 0
                                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                                          : 'text-[var(--text-muted)]'
                                      }`}
                                    >
                                      {totalDocsCount === 0
                                        ? 'Sem laudos anexados'
                                        : `${validDocsCount}/${totalDocsCount} doc(s) válidos`}
                                    </div>
                                  </td>

                                  {/* 7. Status do Produto */}
                                  <td className="py-4 px-4">
                                    <StatusBadge status={prod.status} />
                                  </td>

                                  {/* 8. Ações Rápidas */}
                                  <td
                                    className="py-4 px-5 text-right"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="inline-flex items-center justify-end gap-1.5">
                                      <Button
                                        size="xs"
                                        variant="secondary"
                                        icon={<Eye className="w-3.5 h-3.5" />}
                                        onClick={() => openProductDetail(prod, 'GERAL')}
                                      >
                                        Detalhes
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        title="Editar cadastro do produto"
                                        onClick={() => openEditProductModal(prod)}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="ghost"
                                        title="Duplicar produto"
                                        onClick={() => handleDuplicateProduct(prod.id)}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })()}

          {productTab === 'COMBOS' && (
            <div className="space-y-4">
              <div className="modern-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-subtle)]/40">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Kits & Combos Comerciais Baseados no Catálogo
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Cada kit consome automaticamente a quantidade correspondente de frascos do estoque físico do produto vinculado.
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setOfferModalOpen(true)}
                >
                  Novo Kit / Oferta
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {offers
                  .filter((o) => o.offerType !== '1_UNIT')
                  .map((off) => {
                    const offerTypeLabels: Record<string, string> = {
                      '1_UNIT': '1 Unidade',
                      KIT_2: 'Kit 2 Unidades',
                      KIT_3_PLUS: 'Kit 3+ Unidades',
                      COMBO: 'Combo Multi-Produto',
                    };
                    const totalCost = off.items.reduce(
                      (acc, item) => acc + item.unitCost * item.quantity,
                      0
                    );
                    return (
                      <Card
                        key={off.id}
                        title={off.name}
                        subtitle={`Link: /o/${off.code} · ${
                          offerTypeLabels[off.offerType] || off.offerType
                        }`}
                        action={<StatusBadge status={off.status} />}
                      >
                        <div className="space-y-3 text-xs">
                          <div className="bg-[var(--bg-subtle)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)] flex justify-between items-center gap-4">
                            <div>
                              <span className="text-[var(--text-muted)] block text-[11px]">
                                Composição física do kit:
                              </span>
                              <strong className="text-[var(--text-primary)] text-sm">
                                {off.items
                                  .map((i) => `${i.quantity}x ${i.productName}`)
                                  .join(' + ')}
                              </strong>
                              <span className="text-[11px] text-[var(--text-muted)] block mt-1 font-mono">
                                Custo físico total: {formatCurrencyBRL(totalCost)}
                              </span>
                            </div>
                            <div className="text-right font-mono shrink-0">
                              <span className="line-through text-[var(--text-muted)] block text-[11px] tabular-nums">
                                {formatCurrencyBRL(off.regularPrice)}
                              </span>
                              <strong className="text-base text-indigo-600 dark:text-indigo-400 tabular-nums">
                                {formatCurrencyBRL(off.promotionalPrice)}
                              </strong>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              Usos: {formatIntegerBR(off.usageCount)} /{' '}
                              {formatIntegerBR(off.usageLimit)}
                            </span>
                            <Button
                              size="xs"
                              variant="secondary"
                              icon={<ExternalLink className="w-3.5 h-3.5" />}
                              onClick={() => onOpenPublicLink(off.code)}
                            >
                              Abrir Checkout (/o/{off.code})
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}

          {productTab === 'COMPLIANCE' && (
            <Card
              title="Checklist de Conformidade & Rotulagem (ANVISA / IN 28)"
              subtitle="Validação regulatória de documentação, alegações funcionais e rotulagem antes de liberar produtos e ofertas"
            >
              <div className="space-y-4">
                {complianceReviews.map((rev) => {
                  const targetTypeLabel =
                    rev.targetType === 'PRODUTO'
                      ? 'Produto'
                      : rev.targetType === 'OFERTA'
                      ? 'Oferta'
                      : 'Campanha';
                  const linkedProd =
                    rev.targetType === 'PRODUTO'
                      ? products.find((p) => p.id === rev.targetId)
                      : undefined;

                  return (
                    <div
                      key={rev.id}
                      className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge tone="cyan">{targetTypeLabel}</Badge>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {rev.targetName}
                            </h4>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">{rev.notes}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {linkedProd && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => openProductDetail(linkedProd, 'DOCUMENTOS')}
                            >
                              Ver dossiê do produto
                            </Button>
                          )}
                          <StatusBadge status={rev.status} />
                        </div>
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
                  );
                })}
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
      {/* DRAWER DE DETALHES COMPLETOS DO PRODUTO                              */}
      {/* ==================================================================== */}
      <Drawer
        open={Boolean(activeSelectedProduct)}
        onClose={() => setSelectedProductId(null)}
        title={activeSelectedProduct ? activeSelectedProduct.commercialName : 'Detalhes do Produto'}
        subtitle={
          activeSelectedProduct
            ? `SKU: ${activeSelectedProduct.sku} · ${activeSelectedProduct.category} · ${activeSelectedProduct.presentation}`
            : undefined
        }
        maxWidth="max-w-3xl"
        headerActions={
          activeSelectedProduct && (
            <>
              <Button
                size="xs"
                variant="secondary"
                icon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => openEditProductModal(activeSelectedProduct)}
              >
                Editar cadastro
              </Button>
              <Button
                size="xs"
                variant="secondary"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => handleDuplicateProduct(activeSelectedProduct.id)}
              >
                Duplicar
              </Button>
              <Button
                size="xs"
                variant={activeSelectedProduct.status === 'ACTIVE' ? 'danger' : 'primary'}
                onClick={() => handleToggleProductStatus(activeSelectedProduct)}
              >
                {activeSelectedProduct.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
              </Button>
            </>
          )
        }
      >
        {activeSelectedProduct && (
          <div className="space-y-6">
            {/* Resumo superior do produto */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-4">
                <img
                  src={
                    activeSelectedProduct.images[0]?.url ||
                    '/src/assets/images/product_lipotherm_pro_1790723418728.jpg'
                  }
                  alt={activeSelectedProduct.commercialName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover border border-[var(--border-subtle)] shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={activeSelectedProduct.status} />
                    <StatusBadge status={activeSelectedProduct.complianceStatus} />
                    <Badge tone="slate">{activeSelectedProduct.category}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    {activeSelectedProduct.description || 'Sem descrição comercial informada.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-abas do Drawer de Detalhes do Produto */}
            <div className="flex items-center bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
              <button
                onClick={() => setProductDetailTab('GERAL')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  productDetailTab === 'GERAL'
                    ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Visão Geral & Estoque
              </button>
              <button
                onClick={() => setProductDetailTab('ROTULO')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  productDetailTab === 'ROTULO'
                    ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Composição, Rótulo & Claims ({activeSelectedProduct.approvedClaims.length})
              </button>
              <button
                onClick={() => setProductDetailTab('DOCUMENTOS')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  productDetailTab === 'DOCUMENTOS'
                    ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Documentos & Conformidade ({activeSelectedProduct.documents.length})
              </button>
            </div>

            {/* ABA 1: VISÃO GERAL, LOTES, ESTOQUE E OFERTAS VINCULADAS */}
            {productDetailTab === 'GERAL' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block text-[11px]">SKU</span>
                    <strong className="font-mono text-sm text-[var(--text-primary)] mt-0.5 block">
                      {activeSelectedProduct.sku}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block text-[11px]">Lote Atual</span>
                    <strong className="font-mono text-sm text-[var(--text-primary)] mt-0.5 block">
                      {activeSelectedProduct.batchNumber}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block text-[11px]">Validade</span>
                    <strong className="font-mono text-sm text-[var(--text-primary)] mt-0.5 block tabular-nums">
                      {formatDateBR(activeSelectedProduct.expiryDate)}
                    </strong>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)]">
                    <span className="text-[var(--text-muted)] block text-[11px]">Apresentação</span>
                    <strong className="text-sm text-[var(--text-primary)] mt-0.5 block truncate">
                      {activeSelectedProduct.presentation}
                    </strong>
                  </div>
                </div>

                {/* Ajuste Rápido de Estoque e Custo Unitário */}
                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Controle Rápido de Estoque & Custo Físico
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Atualize o saldo de frascos no CD ou o custo de fabricação sem sair do painel.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="flex items-end gap-2">
                      <Input
                        label="Saldo em Estoque (unidades)"
                        type="number"
                        min={0}
                        value={quickStockValue}
                        onChange={(e) => setQuickStockValue(Number(e.target.value))}
                      />
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() =>
                          handleUpdateProductQuickFields(
                            activeSelectedProduct.id,
                            { stockQuantity: quickStockValue },
                            `Estoque de ${activeSelectedProduct.sku} atualizado para ${formatIntegerBR(
                              quickStockValue
                            )} un.`
                          )
                        }
                      >
                        Salvar estoque
                      </Button>
                    </div>

                    <div className="flex items-end gap-2">
                      <Input
                        label="Custo Unitário Físico (R$)"
                        type="number"
                        step="0.01"
                        min={0}
                        value={quickCostValue}
                        onChange={(e) => setQuickCostValue(Number(e.target.value))}
                      />
                      <Button
                        size="md"
                        variant="secondary"
                        onClick={() =>
                          handleUpdateProductQuickFields(
                            activeSelectedProduct.id,
                            { unitCost: quickCostValue },
                            `Custo unitário de ${activeSelectedProduct.sku} atualizado para ${formatCurrencyBRL(
                              quickCostValue
                            )}.`
                          )
                        }
                      >
                        Salvar custo
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Ofertas e Kits que vendem este Produto */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Ofertas & Kits Comerciais Vinculados a este Produto
                    </h4>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setOfferForm({
                          ...offerForm,
                          productId: activeSelectedProduct.id,
                        });
                        setOfferModalOpen(true);
                      }}
                    >
                      Criar oferta com este produto
                    </Button>
                  </div>

                  {(() => {
                    const productOffers = offers.filter((o) =>
                      o.items.some((item) => item.productId === activeSelectedProduct.id)
                    );
                    if (productOffers.length === 0) {
                      return (
                        <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                          Nenhuma oferta comercial ativa vinculada a este produto no momento.
                        </div>
                      );
                    }
                    return (
                      <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        {productOffers.map((off) => {
                          const itemInOffer = off.items.find(
                            (i) => i.productId === activeSelectedProduct.id
                          );
                          return (
                            <div
                              key={off.id}
                              className="p-3.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[var(--text-primary)]">
                                    {off.name}
                                  </span>
                                  <StatusBadge status={off.status} />
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                                  Link: /o/{off.code} · Baixa por venda: {itemInOffer?.quantity || 1} un
                                </div>
                              </div>
                              <div className="text-right font-mono shrink-0">
                                <strong className="text-sm text-indigo-600 dark:text-indigo-400 tabular-nums">
                                  {formatCurrencyBRL(off.promotionalPrice)}
                                </strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ABA 2: COMPOSIÇÃO, ROTULAGEM, ADVERTÊNCIAS E CLAIMS IN 28/2018 */}
            {productDetailTab === 'ROTULO' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Composição & Ingredientes
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {activeSelectedProduct.composition || 'Não informado.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Modo de Uso Recomendado
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {activeSelectedProduct.usageInstructions || 'Não informado.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Advertências Obrigatórias no Rótulo
                    </span>
                    <p className="text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                      {activeSelectedProduct.warnings || 'Não informado.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Restrições de Público & Rotulagem (RDC 429)
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {activeSelectedProduct.restrictions || 'Uso adulto.'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] pt-1">
                      {activeSelectedProduct.labelingInfo}
                    </p>
                  </div>
                </div>

                {/* Alegações Funcionais Aprovadas (Claims IN 28/2018) */}
                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)] space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Alegações Funcionais Autorizadas (Claims IN 28/2018)
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Frases permitidas na rotulagem e nas páginas de venda deste produto.
                    </p>
                  </div>

                  {activeSelectedProduct.approvedClaims.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-2">
                      Nenhuma alegação funcional cadastrada para este produto.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                      {activeSelectedProduct.approvedClaims.map((claim) => (
                        <div
                          key={claim.id}
                          className="p-3 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-[var(--text-primary)]">
                              “{claim.claimText}”
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] font-mono">
                              Base legal: {claim.regulatoryBasis}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={claim.status} />
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveProductClaim(activeSelectedProduct.id, claim.id)
                              }
                              title="Remover alegação"
                              className="p-1 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário para adicionar nova alegação */}
                  <form
                    onSubmit={(e) => handleAddProductClaim(e, activeSelectedProduct)}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2"
                  >
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Ex: A cafeína auxilia no aumento do estado de alerta..."
                        value={newClaimForm.claimText}
                        onChange={(e) =>
                          setNewClaimForm({ ...newClaimForm, claimText: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="IN ANVISA nº 28/2018"
                        value={newClaimForm.regulatoryBasis}
                        onChange={(e) =>
                          setNewClaimForm({ ...newClaimForm, regulatoryBasis: e.target.value })
                        }
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Adicionar
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ABA 3: DOCUMENTOS REGULATÓRIOS, LAUDOS E STATUS DE CONFORMIDADE */}
            {productDetailTab === 'DOCUMENTOS' && (
              <div className="space-y-5 text-xs">
                <div className="p-4 rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Enquadramento Regulatório (ANVISA)
                    </span>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                      {activeSelectedProduct.regulatoryInfo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={activeSelectedProduct.complianceStatus}
                      onChange={(e) =>
                        handleUpdateProductQuickFields(
                          activeSelectedProduct.id,
                          { complianceStatus: e.target.value as ComplianceState },
                          `Status regulatório de ${activeSelectedProduct.sku} alterado.`
                        )
                      }
                      options={[
                        { value: 'DRAFT', label: 'Rascunho' },
                        { value: 'UNDER_REVIEW', label: 'Em revisão' },
                        { value: 'APPROVED', label: 'Aprovado' },
                        { value: 'REJECTED', label: 'Rejeitado' },
                      ]}
                    />
                  </div>
                </div>

                {/* Lista de Documentos & Laudos Anexados */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Dossiê Técnico & Laudos Anexados ({activeSelectedProduct.documents.length})
                  </h4>

                  {activeSelectedProduct.documents.length === 0 ? (
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                      Nenhum documento ou laudo técnico anexado a este produto ainda. Utilize o formulário abaixo para anexar.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                      {activeSelectedProduct.documents.map((doc) => {
                        const docTypeLabels: Record<ProductDocument['docType'], string> = {
                          LAUDO_TECNICO: 'Laudo Laboratorial',
                          NOTIFICACAO_ANVISA: 'Notificação ANVISA',
                          FICHA_SEGURANCA: 'Ficha Técnica / Segurança',
                          ROTULO_APROVADO: 'Arte de Rótulo Aprovado',
                        };
                        return (
                          <div
                            key={doc.id}
                            className="p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[var(--text-primary)] truncate">
                                  {doc.title}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)] flex flex-wrap items-center gap-2 mt-0.5">
                                  <span>{docTypeLabels[doc.docType] || doc.docType}</span>
                                  <span>·</span>
                                  <span className="font-mono">{doc.version}</span>
                                  <span>·</span>
                                  <span>Anexado em {formatDateBR(doc.uploadedAt)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={doc.status} />
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveProductDocument(activeSelectedProduct.id, doc.id)
                                }
                                title="Remover documento"
                                className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Formulário real para anexar novo documento ao produto */}
                <form
                  onSubmit={(e) => handleAddProductDocument(e, activeSelectedProduct)}
                  className="p-4 rounded-2xl bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] space-y-3"
                >
                  <div className="font-bold text-[var(--text-primary)]">
                    Anexar Novo Documento ou Laudo Técnico
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <Input
                        label="Título do Documento / Laudo"
                        placeholder="Ex: Laudo Microbiológico Lote LT-2026-09"
                        value={newDocForm.title}
                        onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <Select
                      label="Tipo de Documento"
                      value={newDocForm.docType}
                      onChange={(e) =>
                        setNewDocForm({
                          ...newDocForm,
                          docType: e.target.value as ProductDocument['docType'],
                        })
                      }
                      options={[
                        { value: 'LAUDO_TECNICO', label: 'Laudo Laboratorial' },
                        { value: 'NOTIFICACAO_ANVISA', label: 'Notificação ANVISA' },
                        { value: 'FICHA_SEGURANCA', label: 'Ficha Técnica / Segurança' },
                        { value: 'ROTULO_APROVADO', label: 'Arte de Rótulo Aprovado' },
                      ]}
                    />
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="w-36">
                      <Input
                        label="Versão"
                        placeholder="v1.0"
                        value={newDocForm.version}
                        onChange={(e) => setNewDocForm({ ...newDocForm, version: e.target.value })}
                      />
                    </div>
                    <Button type="submit" size="sm" icon={<Plus className="w-4 h-4" />}>
                      Anexar ao Dossiê do Produto
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ==================================================================== */}
      {/* MODAL COMPLETO DE CADASTRO / EDIÇÃO DE PRODUTO                       */}
      {/* ==================================================================== */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? `Editar Produto (${editingProduct.sku})` : 'Cadastrar Novo Produto'}
        subtitle="Preencha os dados físicos, operacionais e regulatórios do item de catálogo."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-5">
          {/* Bloco 1: Identificação & Classificação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              1. Identificação no Catálogo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Código SKU"
                placeholder="Ex: LC-LIPO-60"
                value={prodForm.sku}
                onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value.toUpperCase() })}
                required
              />
              <Select
                label="Categoria"
                value={prodForm.category}
                onChange={(e) =>
                  setProdForm({ ...prodForm, category: e.target.value as ProductCategory })
                }
                options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <Select
                label="Status Inicial"
                value={prodForm.status}
                onChange={(e) =>
                  setProdForm({ ...prodForm, status: e.target.value as Product['status'] })
                }
                options={[
                  { value: 'ACTIVE', label: 'Ativo' },
                  { value: 'INACTIVE', label: 'Inativo' },
                  { value: 'ARCHIVED', label: 'Arquivado' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nome Comercial (Exibido ao Cliente)"
                placeholder="Ex: Leal LipoTherm Pro Ultra"
                value={prodForm.commercialName}
                onChange={(e) => setProdForm({ ...prodForm, commercialName: e.target.value })}
                required
              />
              <Input
                label="Nome Interno / Técnico"
                placeholder="Ex: LipoTherm Cafeína + Cromo 60 caps"
                value={prodForm.internalName}
                onChange={(e) => setProdForm({ ...prodForm, internalName: e.target.value })}
                required
              />
            </div>

            <Input
              label="Descrição Comercial Resumida"
              placeholder="Breve descrição da finalidade do suplemento..."
              value={prodForm.description}
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
            />
          </div>

          {/* Bloco 2: Apresentação, Lote, Estoque e Custo Físico */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              2. Apresentação, Lote, Estoque & Custo Físico
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Input
                label="Apresentação"
                placeholder="Ex: Frasco 60 cápsulas"
                value={prodForm.presentation}
                onChange={(e) => setProdForm({ ...prodForm, presentation: e.target.value })}
                required
              />
              <Input
                label="Qtd. por Frasco (cáps/g/ml)"
                type="number"
                min={1}
                value={prodForm.unitQuantity}
                onChange={(e) =>
                  setProdForm({ ...prodForm, unitQuantity: Number(e.target.value) })
                }
                required
              />
              <Input
                label="Lote Vigente"
                placeholder="Ex: LT-2026-09A"
                value={prodForm.batchNumber}
                onChange={(e) => setProdForm({ ...prodForm, batchNumber: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Validade do Lote"
                type="date"
                value={prodForm.expiryDate}
                onChange={(e) => setProdForm({ ...prodForm, expiryDate: e.target.value })}
                required
              />
              <Input
                label="Custo Unitário Físico (R$)"
                type="number"
                step="0.01"
                min={0}
                value={prodForm.unitCost}
                onChange={(e) => setProdForm({ ...prodForm, unitCost: Number(e.target.value) })}
                required
              />
              <Input
                label="Saldo em Estoque (un)"
                type="number"
                min={0}
                value={prodForm.stockQuantity}
                onChange={(e) =>
                  setProdForm({ ...prodForm, stockQuantity: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          {/* Bloco 3: Composição, Rótulo & Regulatório */}
          <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              3. Composição, Rotulagem & Regulatório (ANVISA)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Composição / Ingredientes"
                placeholder="Ex: Cafeína anidra (200mg), Picolinato de Cromo..."
                value={prodForm.composition}
                onChange={(e) => setProdForm({ ...prodForm, composition: e.target.value })}
              />
              <Input
                label="Modo de Uso Recomendado"
                placeholder="Ex: Ingerir 2 cápsulas ao dia..."
                value={prodForm.usageInstructions}
                onChange={(e) => setProdForm({ ...prodForm, usageInstructions: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Enquadramento Regulatório (ANVISA)"
                value={prodForm.regulatoryInfo}
                onChange={(e) => setProdForm({ ...prodForm, regulatoryInfo: e.target.value })}
              />
              <Input
                label="Restrições de Público"
                value={prodForm.restrictions}
                onChange={(e) => setProdForm({ ...prodForm, restrictions: e.target.value })}
              />
            </div>

            <Input
              label="Advertências Obrigatórias de Rotulagem"
              value={prodForm.warnings}
              onChange={(e) => setProdForm({ ...prodForm, warnings: e.target.value })}
            />

            <div className="space-y-2">
              <FileUploader
                label="Anexar Documento / Laudo Técnico ao Produto"
                onUpload={(fn) => {
                  const newDoc: ProductDocument = {
                    id: `doc_${Date.now()}`,
                    productId: editingProduct?.id || '',
                    title: fn.replace(/\.[^/.]+$/, ''),
                    docType: 'LAUDO_TECNICO',
                    fileUrl: `/docs/${fn}`,
                    version: 'v1.0',
                    status: 'VALID',
                    uploadedBy: user.id,
                    uploadedAt: new Date().toISOString(),
                  };
                  setProdForm({
                    ...prodForm,
                    documents: [...(prodForm.documents || []), newDoc],
                  });
                  onNotify(`Documento "${fn}" preparado para vinculação ao produto.`, 'info');
                }}
              />
              {prodForm.documents && prodForm.documents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prodForm.documents.map((d) => (
                    <Badge key={d.id} tone="emerald">
                      {d.title} ({d.version})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="secondary" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
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
