import fs from 'fs';
import path from 'path';
import {
  AuditLog,
  AutomationRule,
  Campaign,
  Commission,
  ComplianceReview,
  Coupon,
  CouponUsage,
  Customer,
  FinancialStatus,
  Lead,
  Offer,
  OfferLink,
  OperationalStatus,
  Order,
  Payment,
  PrivacyRequest,
  Product,
  Shipment,
  UnitEconomicsConfig,
  User,
} from '../../src/types/domain.ts';

export interface AnalyticsEventRecord {
  id: string;
  eventType:
    | 'lead_criado'
    | 'oferta_visualizada'
    | 'link_acessado'
    | 'checkout_iniciado'
    | 'cupom_aplicado'
    | 'pagamento_criado'
    | 'pagamento_aprovado'
    | 'pagamento_recusado'
    | 'pedido_criado'
    | 'pedido_enviado'
    | 'pedido_entregue'
    | 'recompra';
  offerId?: string;
  orderId?: string;
  sellerId?: string | null;
  campaignId?: string | null;
  timestamp: string;
}

export interface DatabaseState {
  users: User[];
  products: Product[];
  offers: Offer[];
  offerLinks: OfferLink[];
  campaigns: Campaign[];
  coupons: Coupon[];
  couponUsages: CouponUsage[];
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
  analyticsEvents: AnalyticsEventRecord[];
  privacyRequests: PrivacyRequest[];
}

export function deriveConsolidatedOrderStatus(
  financial: FinancialStatus,
  operational: OperationalStatus
): string {
  if (financial === 'chargeback') return 'BLOQUEADO / CHARGEBACK';
  if (financial === 'refunded') return 'REEMBOLSADO';
  if (financial === 'declined') return 'PAGAMENTO RECUSADO';
  if (financial === 'pending') return 'AGUARDANDO PAGAMENTO';

  // financial === 'approved'
  switch (operational) {
    case 'waiting':
      return 'PAGO • FILA DE SEPARAÇÃO';
    case 'picking':
      return 'EM SEPARAÇÃO (WMS)';
    case 'packing':
      return 'EM EMBALAGEM';
    case 'ready_to_ship':
      return 'PRONTO PARA EXPEDIÇÃO';
    case 'shipped':
      return 'EM TRÂNSITO';
    case 'delivered':
      return 'ENTREGUE';
    case 'returned':
      return 'DEVOLVIDO LOGÍSTICA';
    case 'exception':
      return 'EXCEÇÃO OPERACIONAL';
    default:
      return 'EM PROCESSAMENTO';
  }
}

export function calculateUnitEconomics(
  params: {
    grossRevenue: number;
    discounts: number;
    productCost: number;
    shippingSubsidy: number;
    commissionRatePercent?: number;
    cacOverride?: number;
  },
  config: UnitEconomicsConfig
) {
  const netRevenueAfterDiscount = Math.max(0, params.grossRevenue - params.discounts);
  const taxesAndCharges = Number(((netRevenueAfterDiscount * config.taxRatePercent) / 100).toFixed(2));
  const gatewayFee = Number(((netRevenueAfterDiscount * config.gatewayFeePercent) / 100 + 0.99).toFixed(2));
  const commPct = params.commissionRatePercent ?? config.defaultCommissionPercent;
  const commissionAmount = Number(((netRevenueAfterDiscount * commPct) / 100).toFixed(2));
  const packagingOpCost = config.packagingAndOpCostPerOrder;
  const cac = params.cacOverride ?? config.defaultCacTarget;

  const contributionMarginValue = Number(
    (
      params.grossRevenue -
      params.discounts -
      taxesAndCharges -
      gatewayFee -
      commissionAmount -
      params.productCost -
      packagingOpCost -
      params.shippingSubsidy -
      cac
    ).toFixed(2)
  );

  const contributionMarginPercent =
    netRevenueAfterDiscount > 0
      ? Number(((contributionMarginValue / netRevenueAfterDiscount) * 100).toFixed(2))
      : -100;

  const discountPercent =
    params.grossRevenue > 0 ? Number(((params.discounts / params.grossRevenue) * 100).toFixed(2)) : 0;

  const violatesMinMargin = contributionMarginPercent < config.minContributionMarginPercent;
  const violatesMaxDiscount = discountPercent > config.maxDiscountCeilingPercent;

  return {
    grossRevenue: params.grossRevenue,
    discounts: params.discounts,
    netRevenueAfterDiscount,
    taxesAndCharges,
    gatewayFee,
    commissionAmount,
    productCost: params.productCost,
    packagingOpCost,
    shippingSubsidy: params.shippingSubsidy,
    cac,
    contributionMarginValue,
    contributionMarginPercent,
    discountPercent,
    violatesMinMargin,
    violatesMaxDiscount,
    isApprovedByEngine: !violatesMinMargin && !violatesMaxDiscount,
  };
}

export function createInitialSeedState(): DatabaseState {
  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString();

  const users: User[] = [
    {
      id: 'usr_admin_01',
      name: 'Ivan Jefferson (Admin Geral)',
      email: 'admin@lealcaps.com.br',
      passwordHash: 'LealAdmin#2026',
      role: 'ADMIN',
      status: 'ACTIVE',
      commissionRate: 0,
      twoFactorEnabled: true,
      twoFactorVerified: true,
      lastLoginAt: now,
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'usr_seller_01',
      name: 'Camila Rocha (Consultora Sênior)',
      email: 'camila@lealcaps.com.br',
      passwordHash: 'Vendedor#2026',
      role: 'VENDEDOR',
      status: 'ACTIVE',
      sellerCode: 'VEND-CAMILA',
      commissionRate: 12,
      twoFactorEnabled: false,
      lastLoginAt: now,
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 'usr_seller_02',
      name: 'Rafael Mendes (Inside Sales)',
      email: 'rafael@lealcaps.com.br',
      passwordHash: 'Vendedor#2026',
      role: 'VENDEDOR',
      status: 'ACTIVE',
      sellerCode: 'VEND-RAFAEL',
      commissionRate: 10,
      twoFactorEnabled: false,
      lastLoginAt: now,
      createdAt: '2026-02-01T10:00:00.000Z',
    },
    {
      id: 'usr_fulfillment_01',
      name: 'Marcos Oliveira (Líder Expedição WMS)',
      email: 'logistica@lealcaps.com.br',
      passwordHash: 'Logistica#2026',
      role: 'FULFILLMENT',
      status: 'ACTIVE',
      commissionRate: 0,
      twoFactorEnabled: true,
      lastLoginAt: now,
      createdAt: '2026-01-20T08:00:00.000Z',
    },
  ];

  const products: Product[] = [
    {
      id: 'prd_01',
      sku: 'LC-THERM-60C',
      internalName: '[DEMO] Formula Termo Ativa Cromo + L-Carnitina 60 Caps',
      commercialName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
      category: 'Queima de gordura',
      description:
        'Suplemento alimentar em cápsulas de alta concentração formulado com Picolinato de Cromo, L-Carnitina, Cafeína Anidra microencapsulada e Extrato de Laranja Moro.',
      composition:
        'L-Carnitina tartarato (500mg), Extrato de Laranja Moro (400mg), Cafeína Anidra (200mg), Picolinato de Cromo (250mcg), Estearato de magnésio vegetal, cápsula de gelatina.',
      presentation: 'Frasco âmbar UV-Protect com 100 cápsulas de 500mg',
      unitQuantity: 100,
      images: [
        {
          id: 'img_01',
          productId: 'prd_01',
          url: '/src/assets/images/product_lipotherm_pro_1790723418728.jpg',
          altText: 'Frasco Leal LipoTherm Pro 100 Cápsulas',
          isPrimary: true,
        },
      ],
      documents: [
        {
          id: 'doc_01',
          productId: 'prd_01',
          title: 'Notificação Obrigatória ANVISA (Regra Pós-Set/2024) & Dossiê RDC [DEMO]',
          docType: 'NOTIFICACAO_ANVISA',
          fileUrl: '/docs/demo-rdc-240-lc-therm.pdf',
          version: 'v2.4',
          status: 'VALID',
          uploadedBy: 'usr_admin_01',
          uploadedAt: '2026-02-10T14:00:00.000Z',
        },
        {
          id: 'doc_02',
          productId: 'prd_01',
          title: 'Laudo Microbiológico e Físico-Químico Lote LT2608A [DEMO]',
          docType: 'LAUDO_TECNICO',
          fileUrl: '/docs/demo-laudo-lt2608a.pdf',
          version: 'v1.0',
          status: 'VALID',
          uploadedBy: 'usr_admin_01',
          uploadedAt: '2026-03-01T11:30:00.000Z',
        },
      ],
      batchNumber: 'LT-2026-08A',
      expiryDate: '2028-08-30',
      status: 'ACTIVE',
      regulatoryInfo: 'Suplemento Alimentar notificado conforme exigência ANVISA vigente desde 01/09/2024 e IN 28/2018.',
      approvedClaims: [
        {
          id: 'clm_01',
          productId: 'prd_01',
          claimText: 'O cromo auxilia no metabolismo de proteínas, carboidratos e gorduras.',
          regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V (Alegações Autorizadas)',
          status: 'APPROVED',
        },
        {
          id: 'clm_02',
          productId: 'prd_01',
          claimText: 'A cafeína auxilia no aumento do estado de alerta e na melhora da concentração.',
          regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V',
          status: 'APPROVED',
        },
      ],
      warnings:
        'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA DE CONSUMO INDICADA NA EMBALAGEM. MANTENHA FORA DO ALCANCE DE CRIANÇAS. ESTE PRODUTO NÃO DEVE SER CONSUMIDO POR GESTANTES, LACTANTES E CRIANÇAS.',
      usageInstructions: 'Ingerir 2 (duas) cápsulas ao dia, preferencialmente 30 minutos antes da principal atividade física ou conforme orientação profissional.',
      restrictions: 'Contraindicado para indivíduos com hipertensão arterial severa não controlada ou sensibilidade à cafeína.',
      labelingInfo: 'Tabela nutricional conforme RDC 429/2020 e IN 75/2020. Alérgicos: Não contém glúten. Não contém lactose.',
      unitCost: 15.0,
      stockQuantity: 1420,
      complianceStatus: 'APPROVED',
      createdAt: '2026-01-12T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'prd_02',
      sku: 'LC-DERM-100C',
      internalName: '[DEMO] Complexo Biotina + Ácido Hialurônico + Silício Orgânico 100 Caps',
      commercialName: 'Leal DermHair Glow 100 Cápsulas [DEMO]',
      category: 'Pele, cabelos e unhas',
      description:
        'Fórmula avançada com Ácido Hialurônico bioativo, Biotina D-Ativa, Silício Orgânico estabilizado em colina e Bisglicinato de Zinco.',
      composition:
        'Hialuronato de sódio (120mg), Ácido ortosilícico estabilizado (100mg), Zinco quelato (14mg), D-Biotina (45mcg), Vitamina C revestida (90mg).',
      presentation: 'Pote premium Black Matte com 100 cápsulas softgel',
      unitQuantity: 100,
      images: [
        {
          id: 'img_02',
          productId: 'prd_02',
          url: '/src/assets/images/product_dermhair_glow_1790723429294.jpg',
          altText: 'Pote Leal DermHair Glow 100 Cápsulas',
          isPrimary: true,
        },
      ],
      documents: [
        {
          id: 'doc_03',
          productId: 'prd_02',
          title: 'Rótulo Técnico RDC 429/2020 Validado [DEMO]',
          docType: 'ROTULO_APROVADO',
          fileUrl: '/docs/demo-rotulo-dermhair.pdf',
          version: 'v3.1',
          status: 'VALID',
          uploadedBy: 'usr_admin_01',
          uploadedAt: '2026-02-18T16:20:00.000Z',
        },
      ],
      batchNumber: 'LT-2026-11C',
      expiryDate: '2028-11-15',
      status: 'ACTIVE',
      regulatoryInfo: 'Suplemento alimentar notificado conforme exigência ANVISA pós-09/2024 e IN 28/2018.',
      approvedClaims: [
        {
          id: 'clm_03',
          productId: 'prd_02',
          claimText: 'A biotina contribui para a manutenção do cabelo e da pele.',
          regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V',
          status: 'APPROVED',
        },
        {
          id: 'clm_04',
          productId: 'prd_02',
          claimText: 'O zinco contribui para a manutenção do cabelo, da pele e das unhas.',
          regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V',
          status: 'APPROVED',
        },
      ],
      warnings:
        'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA DE CONSUMO INDICADA NA EMBALAGEM.',
      usageInstructions: 'Consumir 2 (duas) cápsulas ao dia após o café da manhã.',
      restrictions: 'Uso adulto (>= 19 anos).',
      labelingInfo: 'Rotulagem nutricional padrão ANVISA RDC 429/2020. Zero açúcar, zero glúten.',
      unitCost: 15.0,
      stockQuantity: 980,
      complianceStatus: 'APPROVED',
      createdAt: '2026-01-18T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'prd_03',
      sku: 'LC-FLEX-100C',
      internalName: '[DEMO] Colágeno Tipo II Não Desnaturado + Magnésio Dimalato + Curcumina 100 Caps',
      commercialName: 'Leal ArtroFlex Ultra II 100 Cápsulas [DEMO]',
      category: 'Articulações',
      description:
        'Combinação sinérgica de Colágeno Tipo II não desnaturado (40mg), Extrato de rizoma de Curcuma longa padronizado em 95% curcuminoides e Magnésio Dimalato.',
      composition: 'Colágeno de frango com colágeno tipo II não desnaturado (40mg), Extrato de Cúrcuma (130mg), Magnésio Dimalato (260mg).',
      presentation: 'Frasco com 100 cápsulas vegetais Vcaps',
      unitQuantity: 100,
      images: [
        {
          id: 'img_03',
          productId: 'prd_03',
          url: '/src/assets/images/product_artroflex_ultra_1790723439526.jpg',
          altText: 'Frasco Leal ArtroFlex Ultra II',
          isPrimary: true,
        },
      ],
      documents: [
        {
          id: 'doc_04',
          productId: 'prd_03',
          title: 'Ficha de Segurança de Matéria-Prima Colágeno UC-II [DEMO]',
          docType: 'FICHA_SEGURANCA',
          fileUrl: '/docs/demo-fispq-ucii.pdf',
          version: 'v1.2',
          status: 'VALID',
          uploadedBy: 'usr_admin_01',
          uploadedAt: '2026-03-04T09:00:00.000Z',
        },
      ],
      batchNumber: 'LT-2026-09F',
      expiryDate: '2028-09-20',
      status: 'ACTIVE',
      regulatoryInfo: 'Suplemento Alimentar notificado conforme ANVISA pós-09/2024.',
      approvedClaims: [
        {
          id: 'clm_05',
          productId: 'prd_03',
          claimText: 'O colágeno tipo II não desnaturado auxilia na manutenção da função articular.',
          regulatoryBasis: 'IN ANVISA nº 28/2018 - Anexo V',
          status: 'APPROVED',
        },
      ],
      warnings:
        'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO DEVE SER CONSUMIDO POR GESTANTES, LACTANTES E CRIANÇAS.',
      usageInstructions: 'Ingerir 2 (duas) cápsulas ao dia em jejum.',
      restrictions: 'Uso exclusivo adulto.',
      labelingInfo: 'Sem adição de açúcares ou corantes artificiais.',
      unitCost: 15.0,
      stockQuantity: 740,
      complianceStatus: 'APPROVED',
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'prd_04',
      sku: 'LC-CALM-100C',
      internalName: '[DEMO] L-Triptofano + Inositol + Bisglicinato de Magnésio + B6 100 Caps',
      commercialName: 'Leal NeuroSeren Night 100 Cápsulas [DEMO]',
      category: 'Ansiedade',
      description:
        'Suplemento nutricional noturno com L-Triptofano puro, Inositol, Magnésio Quelato e Piridoxina ativa.',
      composition: 'L-Triptofano (250mg), Inositol (200mg), Bisglicinato de Magnésio (200mg), Vitamina B6 (1,3mg).',
      presentation: 'Frasco azul cobalto com 100 cápsulas',
      unitQuantity: 100,
      images: [
        {
          id: 'img_04',
          productId: 'prd_04',
          url: '/src/assets/images/product_neuroseren_night_1790723448446.jpg',
          altText: 'Frasco Leal NeuroSeren Night',
          isPrimary: true,
        },
      ],
      documents: [],
      batchNumber: 'LT-2026-12N',
      expiryDate: '2028-12-01',
      status: 'INACTIVE',
      regulatoryInfo: 'Aguardando aprovação final do Compliance Gate para liberação comercial.',
      approvedClaims: [
        {
          id: 'clm_06',
          productId: 'prd_04',
          claimText: 'O magnésio auxilia no funcionamento neuromuscular.',
          regulatoryBasis: 'IN ANVISA nº 28/2018',
          status: 'APPROVED',
        },
      ],
      warnings: 'ESTE PRODUTO NÃO É UM MEDICAMENTO.',
      usageInstructions: 'Ingerir 2 cápsulas 40 minutos antes de dormir.',
      restrictions: 'Uso adulto.',
      labelingInfo: 'Em revisão regulatória interna.',
      unitCost: 15.0,
      stockQuantity: 350,
      complianceStatus: 'UNDER_REVIEW',
      createdAt: '2026-03-10T10:00:00.000Z',
      updatedAt: now,
    },
  ];

  const campaigns: Campaign[] = [
    {
      id: 'cmp_01',
      name: '[DEMO] Meta Ads — Protocolo Metabólico Q3',
      channel: 'Paid Social',
      origin: 'Instagram / Facebook',
      media: 'Reels Direct Response',
      adName: 'VSL_Cromo_Metabolismo_04',
      creative: 'CRIATIVO-VIDEO-DRA-CLARA-02',
      utmSource: 'meta',
      utmMedium: 'cpc',
      utmCampaign: 'protocolo_metabolico_q3',
      utmContent: 'video_04_hook_b',
      responsibleSellerId: 'usr_seller_01',
      estimatedCac: 38.0,
      adSpend: 4560.0,
      status: 'ACTIVE',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'cmp_02',
      name: '[DEMO] WhatsApp VIP — Recompra DermHair 90D',
      channel: 'CRM / Direct',
      origin: 'WhatsApp Consultivo',
      media: 'Disparo Ativo Opt-in',
      adName: 'Sequencia_Recompra_D60',
      creative: 'TEXTO-CONSULTIVO-CAMILA-01',
      utmSource: 'whatsapp',
      utmMedium: 'crm',
      utmCampaign: 'recompra_dermhair_90d',
      utmContent: 'msg_vip_01',
      responsibleSellerId: 'usr_seller_01',
      estimatedCac: 14.0,
      adSpend: 840.0,
      status: 'ACTIVE',
      createdAt: '2026-02-15T00:00:00.000Z',
    },
    {
      id: 'cmp_03',
      name: '[DEMO] Google Search — Saúde Articular Colágeno II',
      channel: 'Paid Search',
      origin: 'Google Ads',
      media: 'Search Intent',
      adName: 'Search_Colageno_Tipo_2_Puro',
      creative: 'RSA-ARTROFLEX-01',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'search_artroflex_q3',
      utmContent: 'rsa_exact_match',
      responsibleSellerId: 'usr_seller_02',
      estimatedCac: 42.0,
      adSpend: 3120.0,
      status: 'ACTIVE',
      createdAt: '2026-02-20T00:00:00.000Z',
    },
  ];

  const offers: Offer[] = [
    {
      id: 'off_7xk29',
      code: '7XK29',
      name: 'Kit 2x Leal LipoTherm Pro (Tratamento 60 Dias) [DEMO]',
      offerType: 'KIT_2',
      items: [
        {
          id: 'ofi_01',
          offerId: 'off_7xk29',
          productId: 'prd_01',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          sku: 'LC-THERM-60C',
          quantity: 2,
          unitCost: 24.5,
        },
      ],
      totalUnits: 2,
      regularPrice: 398.0,
      promotionalPrice: 279.9,
      discountPercent: 29.67,
      maxCouponDiscountPercent: 12,
      defaultCouponCode: 'LEAL10',
      usageLimit: 500,
      usageCount: 42,
      freeShipping: true,
      shippingSubsidy: 18.9,
      extras: ['Guia Nutricional Digital PDF', 'Acompanhamento VIP 60 Dias'],
      sellerId: 'usr_seller_01',
      campaignId: 'cmp_01',
      status: 'ACTIVE',
      complianceStatus: 'APPROVED',
      eligibilityRules: 'Válido para todo o território nacional. Limite de 3 kits por CPF.',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: futureDate,
      createdAt: '2026-01-20T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'off_9mp44',
      code: '9MP44',
      name: 'Kit 3x Leal LipoTherm Pro (Protocolo Completo 90 Dias) [DEMO]',
      offerType: 'KIT_3_PLUS',
      items: [
        {
          id: 'ofi_02',
          offerId: 'off_9mp44',
          productId: 'prd_01',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          sku: 'LC-THERM-60C',
          quantity: 3,
          unitCost: 24.5,
        },
      ],
      totalUnits: 3,
      regularPrice: 597.0,
      promotionalPrice: 379.9,
      discountPercent: 36.37,
      maxCouponDiscountPercent: 10,
      usageLimit: 300,
      usageCount: 28,
      freeShipping: true,
      shippingSubsidy: 21.4,
      extras: ['Frete Expresso Subsidiado', 'Protocolo Digital 90D'],
      sellerId: null,
      campaignId: 'cmp_01',
      status: 'ACTIVE',
      complianceStatus: 'APPROVED',
      eligibilityRules: 'Condição especial Kit 3 unidades com frete subsidiado pela operação.',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: futureDate,
      createdAt: '2026-01-22T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'off_combo01',
      code: 'CMB88',
      name: 'Combo Sinergia: LipoTherm Pro + DermHair Glow [DEMO]',
      offerType: 'COMBO',
      items: [
        {
          id: 'ofi_03',
          offerId: 'off_combo01',
          productId: 'prd_01',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          sku: 'LC-THERM-60C',
          quantity: 1,
          unitCost: 24.5,
        },
        {
          id: 'ofi_04',
          offerId: 'off_combo01',
          productId: 'prd_02',
          productName: 'Leal DermHair Glow 90 Cápsulas [DEMO]',
          sku: 'LC-DERM-90C',
          quantity: 1,
          unitCost: 29.0,
        },
      ],
      totalUnits: 2,
      regularPrice: 428.0,
      promotionalPrice: 319.9,
      discountPercent: 25.26,
      maxCouponDiscountPercent: 10,
      usageLimit: 200,
      usageCount: 19,
      freeShipping: true,
      shippingSubsidy: 18.9,
      extras: ['Necessaire Exclusiva Leal Caps [DEMO]'],
      sellerId: null,
      campaignId: 'cmp_02',
      status: 'ACTIVE',
      complianceStatus: 'APPROVED',
      eligibilityRules: 'Combo multi-SKU autorizado pelo motor comercial.',
      startsAt: '2026-02-01T00:00:00.000Z',
      endsAt: futureDate,
      createdAt: '2026-02-01T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'off_1un_artro',
      code: 'ART10',
      name: '1 Unidade Leal ArtroFlex Ultra II (30 Dias) [DEMO]',
      offerType: '1_UNIT',
      items: [
        {
          id: 'ofi_05',
          offerId: 'off_1un_artro',
          productId: 'prd_03',
          productName: 'Leal ArtroFlex Ultra II 60 Cápsulas [DEMO]',
          sku: 'LC-FLEX-60C',
          quantity: 1,
          unitCost: 26.8,
        },
      ],
      totalUnits: 1,
      regularPrice: 219.0,
      promotionalPrice: 179.9,
      discountPercent: 17.85,
      maxCouponDiscountPercent: 10,
      usageLimit: 400,
      usageCount: 15,
      freeShipping: false,
      shippingSubsidy: 0,
      extras: [],
      sellerId: 'usr_seller_02',
      campaignId: 'cmp_03',
      status: 'ACTIVE',
      complianceStatus: 'APPROVED',
      eligibilityRules: 'Oferta de entrada 1 unidade. Frete calculado por CEP.',
      startsAt: '2026-02-01T00:00:00.000Z',
      endsAt: futureDate,
      createdAt: '2026-02-05T10:00:00.000Z',
      updatedAt: now,
    },
    {
      id: 'off_expired_demo',
      code: 'EXP01',
      name: 'Oferta Relâmpago Janeiro (Expirada) [DEMO]',
      offerType: '1_UNIT',
      items: [
        {
          id: 'ofi_06',
          offerId: 'off_expired_demo',
          productId: 'prd_01',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          sku: 'LC-THERM-60C',
          quantity: 1,
          unitCost: 24.5,
        },
      ],
      totalUnits: 1,
      regularPrice: 199.0,
      promotionalPrice: 159.9,
      discountPercent: 19.65,
      maxCouponDiscountPercent: 5,
      usageLimit: 100,
      usageCount: 100,
      freeShipping: false,
      shippingSubsidy: 0,
      extras: [],
      sellerId: 'usr_seller_01',
      campaignId: 'cmp_01',
      status: 'EXPIRED',
      complianceStatus: 'APPROVED',
      eligibilityRules: 'Encerrada.',
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: pastDate,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: pastDate,
    },
    {
      id: 'off_draft_compliance',
      code: 'DRF99',
      name: 'Kit 2x NeuroSeren Night (Aguardando Compliance Gate) [DEMO]',
      offerType: 'KIT_2',
      items: [
        {
          id: 'ofi_07',
          offerId: 'off_draft_compliance',
          productId: 'prd_04',
          productName: 'Leal NeuroSeren Night 60 Cápsulas [DEMO]',
          sku: 'LC-CALM-60C',
          quantity: 2,
          unitCost: 22.0,
        },
      ],
      totalUnits: 2,
      regularPrice: 380.0,
      promotionalPrice: 269.9,
      discountPercent: 28.97,
      maxCouponDiscountPercent: 10,
      usageLimit: 200,
      usageCount: 0,
      freeShipping: true,
      shippingSubsidy: 18.9,
      extras: [],
      sellerId: null,
      campaignId: 'cmp_01',
      status: 'INACTIVE',
      complianceStatus: 'UNDER_REVIEW',
      eligibilityRules: 'Bloqueada para publicação até aprovação do Compliance Gate.',
      startsAt: now,
      endsAt: futureDate,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const offerLinks: OfferLink[] = [
    {
      id: 'lnk_01',
      code: '7XK29',
      offerId: 'off_7xk29',
      campaignId: 'cmp_01',
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      couponCode: 'LEAL10',
      clicks: 318,
      conversions: 42,
      status: 'ACTIVE',
      expiresAt: futureDate,
      createdAt: '2026-02-01T10:00:00.000Z',
    },
    {
      id: 'lnk_02',
      code: 'CMB88',
      offerId: 'off_combo01',
      campaignId: 'cmp_02',
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      couponCode: 'VIP25',
      clicks: 145,
      conversions: 19,
      status: 'ACTIVE',
      expiresAt: futureDate,
      createdAt: '2026-02-10T10:00:00.000Z',
    },
    {
      id: 'lnk_03',
      code: 'ART10',
      offerId: 'off_1un_artro',
      campaignId: 'cmp_03',
      sellerId: 'usr_seller_02',
      sellerName: 'Rafael Mendes (Inside Sales)',
      clicks: 112,
      conversions: 15,
      status: 'ACTIVE',
      expiresAt: futureDate,
      createdAt: '2026-02-15T10:00:00.000Z',
    },
  ];

  const coupons: Coupon[] = [
    {
      id: 'cpn_leal10',
      code: 'LEAL10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUsesGlobal: 500,
      maxUsesPerCustomer: 2,
      currentUses: 18,
      validUntil: futureDate,
      authorizedSellerId: null,
      authorizedCampaignId: null,
      authorizedProductId: null,
      authorizedOfferId: null,
      status: 'ACTIVE',
      createdAt: '2026-01-15T00:00:00.000Z',
    },
    {
      id: 'cpn_vip25',
      code: 'VIP25',
      discountType: 'FIXED',
      discountValue: 25.0,
      maxUsesGlobal: 100,
      maxUsesPerCustomer: 1,
      currentUses: 9,
      validUntil: futureDate,
      authorizedSellerId: 'usr_seller_01',
      authorizedCampaignId: 'cmp_02',
      authorizedProductId: null,
      authorizedOfferId: 'off_combo01',
      status: 'ACTIVE',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    {
      id: 'cpn_jefferson20',
      code: 'JEFFERSON20',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUsesGlobal: 100,
      maxUsesPerCustomer: 1,
      currentUses: 4,
      validUntil: futureDate,
      authorizedSellerId: null,
      authorizedCampaignId: null,
      authorizedProductId: null,
      authorizedOfferId: null,
      status: 'ACTIVE',
      createdAt: '2026-02-10T00:00:00.000Z',
    },
    {
      id: 'cpn_expired',
      code: 'VERAO2025',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxUsesGlobal: 50,
      maxUsesPerCustomer: 1,
      currentUses: 50,
      validUntil: pastDate,
      authorizedSellerId: null,
      authorizedCampaignId: null,
      authorizedProductId: null,
      authorizedOfferId: null,
      status: 'INACTIVE',
      createdAt: '2025-12-01T00:00:00.000Z',
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cst_01',
      name: 'Mariana Costa Albuquerque [DEMO]',
      phone: '11988776655',
      email: 'mariana.demo@exemplo.com.br',
      cpf: '345.678.901-22',
      cep: '01310100',
      street: 'Av. Paulista',
      number: '1578',
      complement: 'Conj 42',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      marketingOptIn: true,
      anonymized: false,
      createdAt: '2026-03-01T14:20:00.000Z',
    },
    {
      id: 'cst_02',
      name: 'Fernanda Ribeiro Lima [DEMO]',
      phone: '21997654321',
      email: 'fernanda.demo@exemplo.com.br',
      cpf: '456.789.012-33',
      cep: '22021001',
      street: 'Av. Atlântica',
      number: '2100',
      complement: 'Apto 801',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      marketingOptIn: true,
      anonymized: false,
      createdAt: '2026-03-05T11:10:00.000Z',
    },
    {
      id: 'cst_03',
      name: 'Carlos Eduardo Nogueira [DEMO]',
      phone: '31991234567',
      email: 'carlos.demo@exemplo.com.br',
      cpf: '567.890.123-44',
      cep: '30130000',
      street: 'Av. Afonso Pena',
      number: '950',
      complement: 'Sala 12',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      marketingOptIn: true,
      anonymized: false,
      createdAt: '2026-03-10T16:40:00.000Z',
    },
  ];

  const leads: Lead[] = [
    {
      id: 'ld_01',
      name: 'Mariana Costa Albuquerque [DEMO]',
      contact: '+55 11 98877-6655',
      origin: 'Meta Ads — Protocolo Metabólico Q3',
      campaignId: 'cmp_01',
      sellerId: 'usr_seller_01',
      stage: 'RECOMPRA',
      offersPresented: ['off_1un_artro', 'off_7xk29', 'off_combo01'],
      offersPurchased: ['off_7xk29'],
      interactions: [
        {
          id: 'int_01',
          timestamp: '2026-03-01T14:00:00.000Z',
          actor: 'Camila Rocha',
          note: 'Apresentada oferta 1 unidade e Kit 2x LipoTherm (/o/7XK29). Cliente optou pelo Kit 2x com cupom LEAL10.',
          offerId: 'off_7xk29',
        },
        {
          id: 'int_02',
          timestamp: '2026-03-15T10:30:00.000Z',
          actor: 'Camila Rocha',
          note: 'Pós-venda D15 realizado. Apresentado Combo Sinergia (/o/CMB88) para próxima janela de recompra.',
          offerId: 'off_combo01',
        },
      ],
      repurchaseEligibleAt: '2026-04-25T00:00:00.000Z',
      createdAt: '2026-03-01T13:50:00.000Z',
      lastInteractionAt: '2026-03-15T10:30:00.000Z',
    },
    {
      id: 'ld_02',
      name: 'Patrícia Vasconcelos [DEMO]',
      contact: '+55 11 97711-2233',
      origin: 'Instagram Direct / Reels',
      campaignId: 'cmp_01',
      sellerId: 'usr_seller_01',
      stage: 'OFERTA',
      offersPresented: ['off_7xk29', 'off_9mp44'],
      offersPurchased: [],
      interactions: [
        {
          id: 'int_03',
          timestamp: now,
          actor: 'Camila Rocha',
          note: 'Enviado link rastreável /o/7XK29 e comparativo com Kit 3 unidades (/o/9MP44). Aguardando confirmação de CEP.',
          offerId: 'off_7xk29',
        },
      ],
      createdAt: now,
      lastInteractionAt: now,
    },
    {
      id: 'ld_03',
      name: 'Carlos Eduardo Nogueira [DEMO]',
      contact: '+55 31 99123-4567',
      origin: 'Google Search — Saúde Articular',
      campaignId: 'cmp_03',
      sellerId: 'usr_seller_02',
      stage: 'CLIENTE',
      offersPresented: ['off_1un_artro'],
      offersPurchased: ['off_1un_artro'],
      interactions: [
        {
          id: 'int_04',
          timestamp: '2026-03-10T16:30:00.000Z',
          actor: 'Rafael Mendes',
          note: 'Dúvida sobre composição de Colágeno Tipo II esclarecida conforme claims aprovados na IN 28/2018.',
          offerId: 'off_1un_artro',
        },
      ],
      createdAt: '2026-03-10T16:00:00.000Z',
      lastInteractionAt: '2026-03-10T16:45:00.000Z',
    },
  ];

  const orders: Order[] = [
    {
      id: 'ord_10421',
      orderNumber: '#LC-10421',
      customerId: 'cst_01',
      customerSnapshot: {
        name: 'Mariana Costa Albuquerque [DEMO]',
        phone: '11988776655',
        email: 'mariana.demo@exemplo.com.br',
        cpf: '345.678.901-22',
        cep: '01310100',
        street: 'Av. Paulista',
        number: '1578',
        complement: 'Conj 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      offerId: 'off_7xk29',
      offerName: 'Kit 2x Leal LipoTherm Pro (Tratamento 60 Dias) [DEMO]',
      campaignId: 'cmp_01',
      campaignName: '[DEMO] Meta Ads — Protocolo Metabólico Q3',
      couponCode: 'LEAL10',
      items: [
        {
          productId: 'prd_01',
          sku: 'LC-THERM-60C',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          quantity: 2,
          unitPrice: 139.95,
          unitCost: 24.5,
        },
      ],
      subtotal: 279.9,
      discount: 27.99,
      shippingCost: 0,
      shippingSubsidy: 18.9,
      total: 251.91,
      paymentId: 'pay_10421',
      paymentMethod: 'PIX',
      shippingService: 'Loggi Air Express [DEMO]',
      estimatedDeliveryDays: 2,
      trackingCode: 'LC104210131BR',
      financialStatus: 'approved',
      operationalStatus: 'delivered',
      consolidatedStatus: deriveConsolidatedOrderStatus('approved', 'delivered'),
      exceptionReason: null,
      timeline: [
        {
          id: 'evt_01',
          orderId: 'ord_10421',
          event: 'PEDIDO CRIADO',
          actor: 'Checkout Público (/o/7XK29)',
          timestamp: '2026-03-01T14:22:00.000Z',
          previousValue: '-',
          newValue: 'waiting / pending',
          note: 'Pedido originado via link rastreável da vendedora Camila Rocha.',
        },
        {
          id: 'evt_02',
          orderId: 'ord_10421',
          event: 'PAGAMENTO APROVADO',
          actor: 'Webhook Gateway (DEMO_PAGARME_V5)',
          timestamp: '2026-03-01T14:23:15.000Z',
          previousValue: 'pending',
          newValue: 'approved',
          note: 'Confirmação oficial via webhook assinado HMAC.',
        },
        {
          id: 'evt_03',
          orderId: 'ord_10421',
          event: 'SEPARAÇÃO & EMBALAGEM',
          actor: 'Marcos Oliveira (FULFILLMENT)',
          timestamp: '2026-03-01T16:10:00.000Z',
          previousValue: 'waiting',
          newValue: 'packing',
          note: 'Lote LT-2026-08A bipado e conferido.',
        },
        {
          id: 'evt_04',
          orderId: 'ord_10421',
          event: 'ENVIADO',
          actor: 'Marcos Oliveira (FULFILLMENT)',
          timestamp: '2026-03-01T17:45:00.000Z',
          previousValue: 'packing',
          newValue: 'shipped',
          note: 'Código de rastreio LC104210131BR emitido.',
        },
        {
          id: 'evt_05',
          orderId: 'ord_10421',
          event: 'ENTREGUE',
          actor: 'Webhook Transportadora (Loggi)',
          timestamp: '2026-03-03T11:20:00.000Z',
          previousValue: 'shipped',
          newValue: 'delivered',
          note: 'Entrega confirmada no destinatário. Jornada pós-venda D0/Entrega iniciada.',
        },
      ],
      repurchaseWindowDays: 60,
      createdAt: '2026-03-01T14:22:00.000Z',
      updatedAt: '2026-03-03T11:20:00.000Z',
    },
    {
      id: 'ord_10422',
      orderNumber: '#LC-10422',
      customerId: 'cst_02',
      customerSnapshot: {
        name: 'Fernanda Ribeiro Lima [DEMO]',
        phone: '21997654321',
        email: 'fernanda.demo@exemplo.com.br',
        cpf: '456.789.012-33',
        cep: '22021001',
        street: 'Av. Atlântica',
        number: '2100',
        complement: 'Apto 801',
        neighborhood: 'Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
      },
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      offerId: 'off_combo01',
      offerName: 'Combo Sinergia: LipoTherm Pro + DermHair Glow [DEMO]',
      campaignId: 'cmp_02',
      campaignName: '[DEMO] WhatsApp VIP — Recompra DermHair 90D',
      couponCode: 'VIP25',
      items: [
        {
          productId: 'prd_01',
          sku: 'LC-THERM-60C',
          productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
          quantity: 1,
          unitPrice: 159.95,
          unitCost: 24.5,
        },
        {
          productId: 'prd_02',
          sku: 'LC-DERM-90C',
          productName: 'Leal DermHair Glow 90 Cápsulas [DEMO]',
          quantity: 1,
          unitPrice: 159.95,
          unitCost: 29.0,
        },
      ],
      subtotal: 319.9,
      discount: 25.0,
      shippingCost: 0,
      shippingSubsidy: 18.9,
      total: 294.9,
      paymentId: 'pay_10422',
      paymentMethod: 'CREDIT_CARD',
      shippingService: 'Loggi Air Express [DEMO]',
      estimatedDeliveryDays: 3,
      trackingCode: null,
      financialStatus: 'approved',
      operationalStatus: 'waiting',
      consolidatedStatus: deriveConsolidatedOrderStatus('approved', 'waiting'),
      exceptionReason: null,
      timeline: [
        {
          id: 'evt_06',
          orderId: 'ord_10422',
          event: 'PEDIDO CRIADO',
          actor: 'Checkout Público (/o/CMB88)',
          timestamp: '2026-03-05T11:12:00.000Z',
          previousValue: '-',
          newValue: 'waiting / pending',
          note: 'Checkout mobile concluído.',
        },
        {
          id: 'evt_07',
          orderId: 'ord_10422',
          event: 'PAGAMENTO APROVADO',
          actor: 'Webhook Gateway (DEMO_PAGARME_V5)',
          timestamp: '2026-03-05T11:12:40.000Z',
          previousValue: 'pending',
          newValue: 'approved',
          note: 'Cartão de crédito aprovado. Elegível na fila de Fulfillment.',
        },
      ],
      repurchaseWindowDays: 60,
      createdAt: '2026-03-05T11:12:00.000Z',
      updatedAt: '2026-03-05T11:12:40.000Z',
    },
    {
      id: 'ord_10423',
      orderNumber: '#LC-10423',
      customerId: 'cst_03',
      customerSnapshot: {
        name: 'Carlos Eduardo Nogueira [DEMO]',
        phone: '31991234567',
        email: 'carlos.demo@exemplo.com.br',
        cpf: '567.890.123-44',
        cep: '30130000',
        street: 'Av. Afonso Pena',
        number: '950',
        complement: 'Sala 12',
        neighborhood: 'Centro',
        city: 'Belo Horizonte',
        state: 'MG',
      },
      sellerId: 'usr_seller_02',
      sellerName: 'Rafael Mendes (Inside Sales)',
      offerId: 'off_1un_artro',
      offerName: '1 Unidade Leal ArtroFlex Ultra II (30 Dias) [DEMO]',
      campaignId: 'cmp_03',
      campaignName: '[DEMO] Google Search — Saúde Articular Colágeno II',
      couponCode: null,
      items: [
        {
          productId: 'prd_03',
          sku: 'LC-FLEX-60C',
          productName: 'Leal ArtroFlex Ultra II 60 Cápsulas [DEMO]',
          quantity: 1,
          unitPrice: 179.9,
          unitCost: 26.8,
        },
      ],
      subtotal: 179.9,
      discount: 0,
      shippingCost: 17.8,
      shippingSubsidy: 0,
      total: 197.7,
      paymentId: 'pay_10423',
      paymentMethod: 'PIX',
      shippingService: 'Jadlog .Package Econômico [DEMO]',
      estimatedDeliveryDays: 5,
      trackingCode: 'LC104233013BR',
      financialStatus: 'approved',
      operationalStatus: 'exception',
      consolidatedStatus: deriveConsolidatedOrderStatus('approved', 'exception'),
      exceptionReason: 'endereço inválido',
      timeline: [
        {
          id: 'evt_08',
          orderId: 'ord_10423',
          event: 'PEDIDO CRIADO & PAGO',
          actor: 'Webhook Gateway (DEMO_PAGARME_V5)',
          timestamp: '2026-03-10T16:45:00.000Z',
          previousValue: 'pending',
          newValue: 'approved',
          note: 'PIX confirmado.',
        },
        {
          id: 'evt_09',
          orderId: 'ord_10423',
          event: 'EXCEÇÃO LOGÍSTICA',
          actor: 'Transportadora Jadlog [DEMO]',
          timestamp: '2026-03-12T14:10:00.000Z',
          previousValue: 'shipped',
          newValue: 'exception (endereço inválido)',
          note: 'Destinatário ausente / complemento comercial incompleto. Acionado atendimento.',
        },
      ],
      repurchaseWindowDays: 30,
      createdAt: '2026-03-10T16:45:00.000Z',
      updatedAt: '2026-03-12T14:10:00.000Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_10421',
      orderId: 'ord_10421',
      orderNumber: '#LC-10421',
      provider: 'DEMO_PAGARME_V5_ADAPTER',
      externalReference: 'pay_demo_LC10421_seed01',
      idempotencyKey: 'idem_seed_10421',
      method: 'PIX',
      amount: 251.91,
      gatewayFee: 8.52,
      status: 'APPROVED',
      webhookEvents: [
        {
          webhookId: 'wh_seed_01',
          statusFrom: 'PENDING',
          statusTo: 'APPROVED',
          processedAt: '2026-03-01T14:23:15.000Z',
          signatureValid: true,
        },
      ],
      createdAt: '2026-03-01T14:22:00.000Z',
      updatedAt: '2026-03-01T14:23:15.000Z',
    },
    {
      id: 'pay_10422',
      orderId: 'ord_10422',
      orderNumber: '#LC-10422',
      provider: 'DEMO_PAGARME_V5_ADAPTER',
      externalReference: 'pay_demo_LC10422_seed02',
      idempotencyKey: 'idem_seed_10422',
      method: 'CREDIT_CARD',
      amount: 294.9,
      gatewayFee: 9.81,
      status: 'APPROVED',
      webhookEvents: [
        {
          webhookId: 'wh_seed_02',
          statusFrom: 'PENDING',
          statusTo: 'APPROVED',
          processedAt: '2026-03-05T11:12:40.000Z',
          signatureValid: true,
        },
      ],
      createdAt: '2026-03-05T11:12:00.000Z',
      updatedAt: '2026-03-05T11:12:40.000Z',
    },
    {
      id: 'pay_10423',
      orderId: 'ord_10423',
      orderNumber: '#LC-10423',
      provider: 'DEMO_PAGARME_V5_ADAPTER',
      externalReference: 'pay_demo_LC10423_seed03',
      idempotencyKey: 'idem_seed_10423',
      method: 'PIX',
      amount: 197.7,
      gatewayFee: 6.9,
      status: 'APPROVED',
      webhookEvents: [
        {
          webhookId: 'wh_seed_03',
          statusFrom: 'PENDING',
          statusTo: 'APPROVED',
          processedAt: '2026-03-10T16:45:00.000Z',
          signatureValid: true,
        },
      ],
      createdAt: '2026-03-10T16:45:00.000Z',
      updatedAt: '2026-03-10T16:45:00.000Z',
    },
  ];

  const shipments: Shipment[] = [
    {
      id: 'shp_10421',
      orderId: 'ord_10421',
      orderNumber: '#LC-10421',
      provider: 'DEMO_MELHOR_ENVIO_LOGGI_ADAPTER',
      serviceName: 'Loggi Air Express [DEMO]',
      price: 18.9,
      estimatedDays: 2,
      trackingCode: 'LC104210131BR',
      labelUrl: '/api/shipments/label/LC104210131BR.pdf',
      status: 'DELIVERED',
      events: [
        {
          status: 'LABEL_GENERATED',
          location: 'CD Leal Caps — Barueri/SP',
          description: 'Etiqueta emitida e pacote conferido',
          timestamp: '2026-03-01T17:45:00.000Z',
        },
        {
          status: 'IN_TRANSIT',
          location: 'Hub São Paulo Capital',
          description: 'Saiu para entrega ao destinatário',
          timestamp: '2026-03-03T08:30:00.000Z',
        },
        {
          status: 'DELIVERED',
          location: 'São Paulo / SP',
          description: 'Objeto entregue na portaria',
          timestamp: '2026-03-03T11:20:00.000Z',
        },
      ],
      createdAt: '2026-03-01T17:45:00.000Z',
    },
    {
      id: 'shp_10423',
      orderId: 'ord_10423',
      orderNumber: '#LC-10423',
      provider: 'DEMO_MELHOR_ENVIO_LOGGI_ADAPTER',
      serviceName: 'Jadlog .Package Econômico [DEMO]',
      price: 17.8,
      estimatedDays: 5,
      trackingCode: 'LC104233013BR',
      labelUrl: '/api/shipments/label/LC104233013BR.pdf',
      status: 'EXCEPTION',
      events: [
        {
          status: 'POSTED',
          location: 'CD Leal Caps — Barueri/SP',
          description: 'Coletado pela transportadora',
          timestamp: '2026-03-11T09:00:00.000Z',
        },
        {
          status: 'EXCEPTION',
          location: 'Belo Horizonte / MG',
          description: 'Exceção: Endereço comercial sem complemento validado',
          timestamp: '2026-03-12T14:10:00.000Z',
        },
      ],
      createdAt: '2026-03-11T09:00:00.000Z',
    },
  ];

  const commissions: Commission[] = [
    {
      id: 'com_01',
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      orderId: 'ord_10421',
      orderNumber: '#LC-10421',
      calculationBase: 251.91,
      percentage: 12,
      amount: 30.23,
      status: 'PAID',
      ruleUsed: 'REGRA_CONGELADA_VENDEDOR_SENIOR_12PCT_SOBRE_RECEITA_LIQUIDA',
      createdAt: '2026-03-01T14:23:15.000Z',
    },
    {
      id: 'com_02',
      sellerId: 'usr_seller_01',
      sellerName: 'Camila Rocha (Consultora Sênior)',
      orderId: 'ord_10422',
      orderNumber: '#LC-10422',
      calculationBase: 294.9,
      percentage: 12,
      amount: 35.39,
      status: 'APPROVED',
      ruleUsed: 'REGRA_CONGELADA_VENDEDOR_SENIOR_12PCT_SOBRE_RECEITA_LIQUIDA',
      createdAt: '2026-03-05T11:12:40.000Z',
    },
    {
      id: 'com_03',
      sellerId: 'usr_seller_02',
      sellerName: 'Rafael Mendes (Inside Sales)',
      orderId: 'ord_10423',
      orderNumber: '#LC-10423',
      calculationBase: 179.9,
      percentage: 10,
      amount: 17.99,
      status: 'APPROVED',
      ruleUsed: 'REGRA_CONGELADA_INSIDE_SALES_10PCT_SOBRE_SUBTOTAL_LIQUIDO',
      createdAt: '2026-03-10T16:45:00.000Z',
    },
  ];

  const automationRules: AutomationRule[] = [
    {
      id: 'aut_01',
      name: 'Recuperação de Checkout Abandonado (15 min)',
      triggerEvent: 'checkout_abandonado',
      delayMinutes: 15,
      channel: 'WHATSAPP',
      messageTemplate:
        'Olá {{nome}}, notamos que você iniciou seu pedido da condição {{oferta}} na Leal Caps. Seu link reservado continua ativo: {{link}}',
      allowedWindow: '08:00 - 20:30',
      respectOptOut: true,
      maxLimitPerCustomer: 1,
      status: 'ACTIVE',
      executionsCount: 34,
    },
    {
      id: 'aut_02',
      name: 'Lembrete PIX Pendente (10 min)',
      triggerEvent: 'pix_pendente',
      delayMinutes: 10,
      channel: 'WHATSAPP',
      messageTemplate:
        'Olá {{nome}}! O código PIX do seu pedido {{pedido}} está aguardando confirmação para enviarmos imediatamente para separação no CD.',
      allowedWindow: '07:00 - 22:00',
      respectOptOut: true,
      maxLimitPerCustomer: 2,
      status: 'ACTIVE',
      executionsCount: 51,
    },
    {
      id: 'aut_03',
      name: 'Jornada D0 — Confirmação de Pagamento Aprovado',
      triggerEvent: 'pagamento_aprovado',
      delayMinutes: 1,
      channel: 'EMAIL',
      messageTemplate:
        'Pagamento confirmado para o pedido {{pedido}}! Seu kit Leal Caps já entrou na fila de separação física.',
      allowedWindow: '00:00 - 23:59',
      respectOptOut: false,
      maxLimitPerCustomer: 1,
      status: 'ACTIVE',
      executionsCount: 89,
    },
    {
      id: 'aut_04',
      name: 'Jornada Envio — Código de Rastreamento Ativo',
      triggerEvent: 'pedido_enviado',
      delayMinutes: 5,
      channel: 'WHATSAPP',
      messageTemplate:
        'Seu pedido {{pedido}} foi expedido! Acompanhe a entrega com segurança pelo código {{rastreio}}.',
      allowedWindow: '08:00 - 21:00',
      respectOptOut: false,
      maxLimitPerCustomer: 1,
      status: 'ACTIVE',
      executionsCount: 76,
    },
    {
      id: 'aut_05',
      name: 'Jornada Entrega + Pós-Venda Suporte (D+1 Entrega)',
      triggerEvent: 'pedido_entregue',
      delayMinutes: 60,
      channel: 'WHATSAPP',
      messageTemplate:
        'Olá {{nome}}! Confirmamos a entrega do pedido {{pedido}}. Veja as instruções de uso aprovadas no rótulo e conte com nosso time.',
      allowedWindow: '09:00 - 19:00',
      respectOptOut: true,
      maxLimitPerCustomer: 1,
      status: 'ACTIVE',
      executionsCount: 64,
    },
    {
      id: 'aut_06',
      name: 'Gatilho de Recompra Configurável (Ciclo D-10 do Fim do Kit)',
      triggerEvent: 'janela_recompra',
      delayMinutes: 1440,
      channel: 'WHATSAPP',
      messageTemplate:
        'Olá {{nome}}, seu protocolo atual está na reta final! Liberamos uma condição exclusiva de continuidade com seu consultor.',
      allowedWindow: '09:00 - 19:00',
      respectOptOut: true,
      maxLimitPerCustomer: 1,
      status: 'ACTIVE',
      executionsCount: 22,
    },
  ];

  const complianceReviews: ComplianceReview[] = [
    {
      id: 'cmp_rev_01',
      targetType: 'OFERTA',
      targetId: 'off_7xk29',
      targetName: 'Kit 2x Leal LipoTherm Pro (Tratamento 60 Dias) [DEMO]',
      status: 'APPROVED',
      checklist: {
        documentacaoExistente: true,
        statusRegulatorio: true,
        claimsAprovados: true,
        rotulagem: true,
        comunicacaoComercial: true,
        advertenciasObrigatorias: true,
      },
      approvedBy: 'Ivan Jefferson (Admin Geral)',
      notes: 'Validado conforme IN 28/2018 e RDC 240/2018. Nenhuma promessa medicamentosa ou alegação proibida.',
      updatedAt: '2026-01-20T12:00:00.000Z',
    },
    {
      id: 'cmp_rev_02',
      targetType: 'OFERTA',
      targetId: 'off_draft_compliance',
      targetName: 'Kit 2x NeuroSeren Night (Aguardando Compliance Gate) [DEMO]',
      status: 'UNDER_REVIEW',
      checklist: {
        documentacaoExistente: true,
        statusRegulatorio: true,
        claimsAprovados: true,
        rotulagem: true,
        comunicacaoComercial: false,
        advertenciasObrigatorias: false,
      },
      approvedBy: null,
      notes: 'Pendente revisão de copy comercial para garantir que a taxonomia interna "Ansiedade" não seja exibida como alegação terapêutica.',
      updatedAt: now,
    },
    {
      id: 'cmp_rev_03',
      targetType: 'CRIATIVO',
      targetId: 'ad_vsl_04',
      targetName: 'CRIATIVO-VIDEO-DRA-CLARA-02 (Meta Ads)',
      status: 'APPROVED',
      checklist: {
        documentacaoExistente: true,
        statusRegulatorio: true,
        claimsAprovados: true,
        rotulagem: true,
        comunicacaoComercial: true,
        advertenciasObrigatorias: true,
      },
      approvedBy: 'Ivan Jefferson (Admin Geral)',
      notes: 'Alegações restritas ao metabolismo energético do cromo e cafeína.',
      updatedAt: '2026-02-02T15:00:00.000Z',
    },
  ];

  const unitEconomicsConfig: UnitEconomicsConfig = {
    taxRatePercent: 8.5,
    gatewayFeePercent: 2.99,
    packagingAndOpCostPerOrder: 9.5,
    defaultCacTarget: 38.0,
    minContributionMarginPercent: 18.0,
    maxDiscountCeilingPercent: 45.0,
    defaultCommissionPercent: 12.0,
    repurchaseCycleDays: 60,
  };

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_01',
      userId: 'usr_admin_01',
      userName: 'Ivan Jefferson (Admin Geral)',
      userRole: 'ADMIN',
      action: 'OFERTA_APROVADA_COMPLIANCE',
      entity: 'Offer',
      entityId: 'off_7xk29',
      previousValue: 'UNDER_REVIEW',
      newValue: 'APPROVED',
      timestamp: '2026-01-20T12:00:00.000Z',
      ip: '189.12.44.102',
      metadata: '{"checklist":"100%","gate":"ComplianceGate"}',
    },
    {
      id: 'aud_02',
      userId: 'system_webhook',
      userName: 'Gateway Webhook Engine',
      userRole: 'SYSTEM',
      action: 'PAGAMENTO_APROVADO_WEBHOOK',
      entity: 'Payment',
      entityId: 'pay_10421',
      previousValue: 'PENDING',
      newValue: 'APPROVED',
      timestamp: '2026-03-01T14:23:15.000Z',
      ip: '54.233.112.9',
      metadata: '{"webhookId":"wh_seed_01","hmacVerified":true}',
    },
    {
      id: 'aud_03',
      userId: 'usr_fulfillment_01',
      userName: 'Marcos Oliveira (Líder Expedição WMS)',
      userRole: 'FULFILLMENT',
      action: 'PEDIDO_EXPEDIDO_RASTREIO',
      entity: 'Order',
      entityId: 'ord_10421',
      previousValue: 'packing',
      newValue: 'shipped (LC104210131BR)',
      timestamp: '2026-03-01T17:45:00.000Z',
      ip: '177.84.20.11',
      metadata: '{"carrier":"Loggi Air Express [DEMO]"}',
    },
  ];

  const analyticsEvents: AnalyticsEventRecord[] = [
    { id: 'an_1', eventType: 'link_acessado', offerId: 'off_7xk29', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_2', eventType: 'oferta_visualizada', offerId: 'off_7xk29', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_3', eventType: 'checkout_iniciado', offerId: 'off_7xk29', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_4', eventType: 'cupom_aplicado', offerId: 'off_7xk29', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_5', eventType: 'pagamento_criado', offerId: 'off_7xk29', orderId: 'ord_10421', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_6', eventType: 'pagamento_aprovado', offerId: 'off_7xk29', orderId: 'ord_10421', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_7', eventType: 'pedido_criado', offerId: 'off_7xk29', orderId: 'ord_10421', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_8', eventType: 'pedido_enviado', offerId: 'off_7xk29', orderId: 'ord_10421', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_9', eventType: 'pedido_entregue', offerId: 'off_7xk29', orderId: 'ord_10421', sellerId: 'usr_seller_01', campaignId: 'cmp_01', timestamp: now },
    { id: 'an_10', eventType: 'recompra', offerId: 'off_combo01', orderId: 'ord_10422', sellerId: 'usr_seller_01', campaignId: 'cmp_02', timestamp: now },
  ];

  const privacyRequests: PrivacyRequest[] = [
    {
      id: 'prv_01',
      customerId: 'cst_01',
      customerName: 'Mariana Costa Albuquerque [DEMO]',
      requestType: 'ACCESS',
      purpose: 'Relatório de dados cadastrais e histórico de pedidos (Art. 18 LGPD)',
      status: 'COMPLETED',
      requestedAt: '2026-03-10T10:00:00.000Z',
      completedAt: '2026-03-10T10:05:00.000Z',
    },
  ];

  return {
    users,
    products,
    offers,
    offerLinks,
    campaigns,
    coupons,
    couponUsages: [],
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
    analyticsEvents,
    privacyRequests,
  };
}

const DB_FILE_PATH = path.resolve(process.cwd(), '.lealcaps-db-v4.json');

function sanitizeOperationalState(state: DatabaseState): DatabaseState {
  const cleanJson = JSON.stringify(state)
    .replace(/\s*\[DEMO\]\s*/g, ' ')
    .replace(/"\s+/g, '"')
    .replace(/\s+"/g, '"');
  return JSON.parse(cleanJson) as DatabaseState;
}

export class RelationalStore {
  public state: DatabaseState;
  private persistToDisk: boolean;

  constructor(persistToDisk = true) {
    this.persistToDisk = persistToDisk;
    if (persistToDisk && fs.existsSync(DB_FILE_PATH)) {
      try {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.state = sanitizeOperationalState(JSON.parse(raw) as DatabaseState);
      } catch {
        this.state = sanitizeOperationalState(createInitialSeedState());
        this.save();
      }
    } else {
      this.state = sanitizeOperationalState(createInitialSeedState());
      if (persistToDisk) this.save();
    }
  }

  public save() {
    if (!this.persistToDisk) return;
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // ignore in read-only test contexts
    }
  }

  public resetToSeed() {
    this.state = sanitizeOperationalState(createInitialSeedState());
    this.save();
  }

  public appendAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    // Immutable append-only audit log
    this.state.auditLogs.unshift(log);
    this.save();
    return log;
  }
}
