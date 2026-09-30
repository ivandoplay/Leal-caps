export type RoleType = 'ADMIN' | 'VENDEDOR' | 'FULFILLMENT';

export type ComplianceState = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export type ProductCategory =
  | 'Emagrecimento'
  | 'Pele, cabelos e unhas'
  | 'Queima de gordura'
  | 'Celulite'
  | 'Massa magra'
  | 'Articulações'
  | 'Ansiedade'
  | 'Endometriose'
  | 'Menopausa'
  | 'Libido';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Emagrecimento',
  'Pele, cabelos e unhas',
  'Queima de gordura',
  'Celulite',
  'Massa magra',
  'Articulações',
  'Ansiedade',
  'Endometriose',
  'Menopausa',
  'Libido',
];

export type OfferType = '1_UNIT' | 'KIT_2' | 'KIT_3_PLUS' | 'COMBO';

export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'CHARGEBACK';

export type FinancialStatus = 'pending' | 'approved' | 'declined' | 'refunded' | 'chargeback';

export type OperationalStatus =
  | 'waiting'
  | 'picking'
  | 'packing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'exception';

export type ExceptionType =
  | 'endereço inválido'
  | 'frete indisponível'
  | 'atraso'
  | 'devolução'
  | 'chargeback'
  | null;

export type LeadStage = 'LEAD' | 'INTERESSADO' | 'OFERTA' | 'CHECKOUT' | 'CLIENTE' | 'RECOMPRA';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: RoleType;
  status: 'ACTIVE' | 'INACTIVE';
  sellerCode?: string;
  commissionRate: number;
  twoFactorEnabled: boolean;
  twoFactorVerified?: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ProductDocument {
  id: string;
  productId: string;
  title: string;
  docType: 'LAUDO_TECNICO' | 'NOTIFICACAO_ANVISA' | 'FICHA_SEGURANCA' | 'ROTULO_APROVADO';
  fileUrl: string;
  version: string;
  status: 'VALID' | 'PENDING' | 'EXPIRED';
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProductClaim {
  id: string;
  productId: string;
  claimText: string;
  regulatoryBasis: string;
  status: 'APPROVED' | 'RESTRICTED' | 'REJECTED';
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  sku: string;
  internalName: string;
  commercialName: string;
  category: ProductCategory;
  description: string;
  composition: string;
  presentation: string;
  unitQuantity: number; // e.g., 60 caps
  images: ProductImage[];
  documents: ProductDocument[];
  batchNumber: string;
  expiryDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  regulatoryInfo: string;
  approvedClaims: ProductClaim[];
  warnings: string;
  usageInstructions: string;
  restrictions: string;
  labelingInfo: string;
  unitCost: number;
  stockQuantity: number;
  complianceStatus: ComplianceState;
  createdAt: string;
  updatedAt: string;
}

export interface OfferItem {
  id: string;
  offerId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export interface Offer {
  id: string;
  code: string; // e.g., 7XK29 -> /o/7XK29
  name: string;
  offerType: OfferType;
  items: OfferItem[];
  totalUnits: number;
  regularPrice: number;
  promotionalPrice: number;
  minimumPrice: number;
  basePrice: number;
  maximumPrice?: number | null;
  commissionPercent: number;
  discountPercent: number;
  maxCouponDiscountPercent: number;
  defaultCouponCode?: string;
  usageLimit: number;
  usageCount: number;
  freeShipping: boolean;
  shippingSubsidy: number;
  extras: string[];
  sellerId: string | null; // null = available to all authorized sellers
  campaignId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  complianceStatus: ComplianceState;
  eligibilityRules: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferLink {
  id: string;
  code: string; // unique negotiation code -> /o/XXXXXX
  offerId: string;
  offerName?: string;
  campaignId: string | null;
  sellerId: string;
  sellerName: string;
  salePrice: number;
  basePrice: number;
  minimumPrice: number;
  maximumPrice?: number | null;
  commissionPercent: number;
  commissionAmount: number;
  surplusAmount: number;
  sellerEarnings: number;
  couponCode?: string;
  clicks: number;
  conversions: number;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  origin: string;
  media: string;
  adName: string;
  creative: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  responsibleSellerId: string | null;
  estimatedCac: number;
  adSpend: number;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxUsesGlobal: number;
  maxUsesPerCustomer: number;
  currentUses: number;
  validUntil: string;
  authorizedSellerId: string | null;
  authorizedCampaignId: string | null;
  authorizedProductId: string | null;
  authorizedOfferId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  couponCode: string;
  customerId: string;
  customerCpf: string;
  orderId: string;
  discountApplied: number;
  usedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  marketingOptIn: boolean;
  anonymized: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  origin: string;
  campaignId: string | null;
  sellerId: string;
  stage: LeadStage;
  offersPresented: string[]; // Offer IDs presented
  offersPurchased: string[]; // Offer IDs bought
  interactions: {
    id: string;
    timestamp: string;
    actor: string;
    note: string;
    offerId?: string;
  }[];
  repurchaseEligibleAt?: string;
  createdAt: string;
  lastInteractionAt: string;
}

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  event: string;
  actor: string;
  timestamp: string;
  previousValue: string;
  newValue: string;
  note: string;
}

export interface Order {
  id: string;
  orderNumber: string; // #LC-XXXXX
  customerId: string;
  customerSnapshot: {
    name: string;
    phone: string;
    email: string;
    cpf: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  sellerId: string | null;
  sellerName: string;
  offerId: string;
  offerName: string;
  offerLinkId?: string | null;
  offerLinkCode?: string | null;
  campaignId: string | null;
  campaignName: string;
  couponCode: string | null;
  items: {
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
  }[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingSubsidy: number;
  total: number;
  paymentId: string;
  paymentMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  shippingService: string;
  estimatedDeliveryDays: number;
  trackingCode: string | null;
  financialStatus: FinancialStatus;
  operationalStatus: OperationalStatus;
  consolidatedStatus: string;
  exceptionReason: ExceptionType;
  timeline: OrderTimelineEvent[];
  repurchaseWindowDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  externalReference: string;
  idempotencyKey: string;
  method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  amount: number;
  gatewayFee: number;
  status: PaymentStatus;
  pixQrCode?: string;
  webhookEvents: {
    webhookId: string;
    statusFrom: PaymentStatus;
    statusTo: PaymentStatus;
    processedAt: string;
    signatureValid: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  serviceName: string;
  price: number;
  estimatedDays: number;
  trackingCode: string | null;
  labelUrl: string | null;
  status: 'QUOTED' | 'LABEL_GENERATED' | 'POSTED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED';
  events: {
    status: string;
    location: string;
    description: string;
    timestamp: string;
  }[];
  createdAt: string;
}

export interface Commission {
  id: string;
  sellerId: string;
  sellerName: string;
  orderId: string;
  orderNumber: string;
  offerLinkId?: string | null;
  offerLinkCode?: string | null;
  calculationBase: number;
  basePrice?: number;
  percentage: number;
  commissionAmount?: number;
  surplusAmount?: number;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  ruleUsed: string;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  triggerEvent:
    | 'checkout_abandonado'
    | 'pix_pendente'
    | 'pagamento_aprovado'
    | 'pedido_enviado'
    | 'pedido_entregue'
    | 'janela_recompra';
  delayMinutes: number;
  channel: 'WHATSAPP' | 'EMAIL';
  messageTemplate: string;
  allowedWindow: string; // e.g., "08:00 - 20:00"
  respectOptOut: boolean;
  maxLimitPerCustomer: number;
  status: 'ACTIVE' | 'INACTIVE';
  executionsCount: number;
}

export interface ComplianceReview {
  id: string;
  targetType: 'PRODUTO' | 'OFERTA' | 'LANDING_PAGE' | 'ANUNCIO' | 'CRIATIVO' | 'COPY' | 'DEPOIMENTO';
  targetId: string;
  targetName: string;
  status: ComplianceState;
  checklist: {
    documentacaoExistente: boolean;
    statusRegulatorio: boolean;
    claimsAprovados: boolean;
    rotulagem: boolean;
    comunicacaoComercial: boolean;
    advertenciasObrigatorias: boolean;
  };
  approvedBy: string | null;
  notes: string;
  updatedAt: string;
}

export interface UnitEconomicsConfig {
  taxRatePercent: number;
  gatewayFeePercent: number;
  packagingAndOpCostPerOrder: number;
  defaultCacTarget: number;
  minContributionMarginPercent: number;
  maxDiscountCeilingPercent: number;
  defaultCommissionPercent: number;
  repurchaseCycleDays: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue: string;
  newValue: string;
  timestamp: string;
  ip: string;
  metadata: string;
}

export interface PrivacyRequest {
  id: string;
  customerId: string;
  customerName: string;
  requestType: 'ACCESS' | 'CORRECTION' | 'ANONYMIZATION';
  purpose: string;
  status: 'OPEN' | 'COMPLETED';
  requestedAt: string;
  completedAt?: string;
}
