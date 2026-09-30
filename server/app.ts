import express, { Request, Response, NextFunction } from 'express';
import {
  calculateUnitEconomics,
  deriveConsolidatedOrderStatus,
  RelationalStore,
} from './db/store.ts';
import {
  DemoNotificationProviderAdapter,
  DemoPaymentGatewayAdapter,
  DemoShippingProviderAdapter,
  signWebhookPayload,
} from './providers/adapters.ts';
import {
  ComplianceState,
  Coupon,
  Customer,
  ExceptionType,
  FinancialStatus,
  Lead,
  Offer,
  OfferLink,
  OperationalStatus,
  Order,
  Payment,
  PaymentStatus,
  Product,
  ProductClaim,
  ProductDocument,
  RoleType,
  Shipment,
  User,
} from '../src/types/domain.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function createApp(customStore?: RelationalStore) {
  const app = express();
  const store = customStore || new RelationalStore(true);
  const paymentProvider = new DemoPaymentGatewayAdapter();
  const shippingProvider = new DemoShippingProviderAdapter();
  const notificationProvider = new DemoNotificationProviderAdapter();

  // Active session tokens map: token -> userId
  const sessions = new Map<string, { userId: string; expiresAt: number }>();

  // Pre-seed deterministic tokens for testing and quick demo switching
  sessions.set('tok_admin_demo', { userId: 'usr_admin_01', expiresAt: Date.now() + 86400000 * 7 });
  sessions.set('tok_seller1_demo', { userId: 'usr_seller_01', expiresAt: Date.now() + 86400000 * 7 });
  sessions.set('tok_seller2_demo', { userId: 'usr_seller_02', expiresAt: Date.now() + 86400000 * 7 });
  sessions.set('tok_fulfillment_demo', { userId: 'usr_fulfillment_01', expiresAt: Date.now() + 86400000 * 7 });

  app.use(express.json({ limit: '2mb' }));

  // Basic XSS & Input Sanitization Middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sanitize = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = sanitize(v);
        }
        return out;
      }
      return obj;
    };
    if (req.body) req.body = sanitize(req.body);
    next();
  });

  // Authentication Middleware
  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Não autenticado. Token de sessão ausente.' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
    const user = store.state.users.find((u) => u.id === session.userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado.' });
    }
    req.user = user;
    next();
  };

  // Role-Based Access Control (RBAC) Middleware
  const requireRole = (allowedRoles: RoleType[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autenticado.' });
      }
      if (!allowedRoles.includes(req.user.role)) {
        store.appendAuditLog({
          userId: req.user.id,
          userName: req.user.name,
          userRole: req.user.role,
          action: 'ACESSO_NEGADO_RBAC',
          entity: 'Endpoint',
          entityId: req.originalUrl,
          previousValue: req.user.role,
          newValue: `Requer: ${allowedRoles.join(',')}`,
          ip: req.ip || '127.0.0.1',
          metadata: JSON.stringify({ method: req.method }),
        });
        return res.status(403).json({
          error: `Permissão negada para o papel ${req.user.role}. Requer: ${allowedRoles.join(' ou ')}.`,
        });
      }
      next();
    };
  };

  const router = express.Router();

  // ============================================================================
  // 1. AUTHENTICATION & RBAC
  // ============================================================================
  router.post('/auth/login', (req: Request, res: Response) => {
    const { email, password, twoFactorCode } = req.body || {};
    const user = store.state.users.find(
      (u) => u.email.toLowerCase() === String(email || '').toLowerCase()
    );
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Conta desativada pelo administrador.' });
    }
    if (user.role === 'ADMIN' && user.twoFactorEnabled && twoFactorCode === 'INVALID_2FA') {
      return res.status(401).json({ error: 'Código 2FA inválido.' });
    }

    const token =
      user.id === 'usr_admin_01'
        ? 'tok_admin_demo'
        : user.id === 'usr_seller_01'
          ? 'tok_seller1_demo'
          : user.id === 'usr_seller_02'
            ? 'tok_seller2_demo'
            : user.id === 'usr_fulfillment_01'
              ? 'tok_fulfillment_demo'
              : `tok_${user.id}_${Date.now()}`;

    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 1000 * 60 * 60 * 12 });
    user.lastLoginAt = new Date().toISOString();

    store.appendAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_REALIZADO',
      entity: 'Session',
      entityId: user.id,
      previousValue: '-',
      newValue: 'ACTIVE_SESSION',
      ip: req.ip || '127.0.0.1',
      metadata: JSON.stringify({ twoFactorEnabled: user.twoFactorEnabled }),
    });

    const { passwordHash: _ph, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  });

  router.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (
      !['tok_admin_demo', 'tok_seller1_demo', 'tok_seller2_demo', 'tok_fulfillment_demo'].includes(
        token
      )
    ) {
      sessions.delete(token);
    }
    return res.json({ success: true });
  });

  router.post('/auth/recover-password', (req: Request, res: Response) => {
    const { email } = req.body || {};
    const user = store.state.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
    if (user) {
      store.appendAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'SOLICITACAO_RECUPERACAO_SENHA',
        entity: 'User',
        entityId: user.id,
        previousValue: '-',
        newValue: 'RECOVERY_TOKEN_SENT',
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
    }
    return res.json({
      message: 'Se o e-mail existir na base operacional, um link temporário de recuperação foi enviado.',
    });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const { passwordHash: _ph, ...safeUser } = req.user!;
    return res.json({ user: safeUser });
  });

  // ============================================================================
  // 2. CATALOG & PRODUCTS (Entidade Física)
  // ============================================================================
  router.get('/products', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.json({ products: store.state.products });
  });

  router.get('/products/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const product = store.state.products.find(
      (p) => p.id === req.params.id || p.sku.toUpperCase() === req.params.id.toUpperCase()
    );
    if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });
    return res.json({ product });
  });

  router.post(
    '/products',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body || {};
      if (!body.sku || !body.commercialName || !body.internalName || !body.category) {
        return res
          .status(400)
          .json({ error: 'Campos obrigatórios: sku, internalName, commercialName, category.' });
      }
      const normalizedSku = String(body.sku).trim().toUpperCase();
      if (store.state.products.some((p) => p.sku.toUpperCase() === normalizedSku)) {
        return res.status(409).json({ error: 'Já existe um produto cadastrado com este SKU.' });
      }

      const now = new Date().toISOString();
      const prodId = `prd_${Date.now()}`;
      const newProduct: Product = {
        id: prodId,
        sku: normalizedSku,
        internalName: String(body.internalName).trim(),
        commercialName: String(body.commercialName).trim(),
        category: body.category,
        description: String(body.description || ''),
        composition: String(body.composition || ''),
        presentation: String(body.presentation || 'Frasco 60 cápsulas'),
        unitQuantity: Number(body.unitQuantity ?? 60),
        images:
          Array.isArray(body.images) && body.images.length > 0
            ? body.images.map((img: Record<string, unknown>, idx: number) => ({
                id: String(img.id || `img_${Date.now()}_${idx}`),
                productId: prodId,
                url: String(
                  img.url || '/src/assets/images/product_lipotherm_pro_1790723418728.jpg'
                ),
                altText: String(img.altText || body.commercialName),
                isPrimary: idx === 0 ? true : Boolean(img.isPrimary),
              }))
            : [
                {
                  id: `img_${Date.now()}`,
                  productId: prodId,
                  url: '/src/assets/images/product_lipotherm_pro_1790723418728.jpg',
                  altText: String(body.commercialName),
                  isPrimary: true,
                },
              ],
        documents: Array.isArray(body.documents)
          ? body.documents.map((doc: Record<string, unknown>, idx: number) => ({
              id: String(doc.id || `doc_${Date.now()}_${idx}`),
              productId: prodId,
              title: String(doc.title || 'Documento Regulatório'),
              docType:
                (doc.docType as ProductDocument['docType']) || 'NOTIFICACAO_ANVISA',
              fileUrl: String(doc.fileUrl || `/docs/${normalizedSku.toLowerCase()}-doc.pdf`),
              version: String(doc.version || 'v1.0'),
              status: (doc.status as ProductDocument['status']) || 'VALID',
              uploadedBy: req.user!.id,
              uploadedAt: String(doc.uploadedAt || now),
            }))
          : [],
        batchNumber: String(body.batchNumber || 'LT-2026-NEW'),
        expiryDate: String(body.expiryDate || '2028-12-31'),
        status: body.status || 'INACTIVE',
        regulatoryInfo: String(body.regulatoryInfo || 'RDC 240/2018'),
        approvedClaims: Array.isArray(body.approvedClaims)
          ? body.approvedClaims.map((clm: Record<string, unknown>, idx: number) => ({
              id: String(clm.id || `clm_${Date.now()}_${idx}`),
              productId: prodId,
              claimText: String(clm.claimText || ''),
              regulatoryBasis: String(clm.regulatoryBasis || 'IN ANVISA nº 28/2018'),
              status: (clm.status as ProductClaim['status']) || 'APPROVED',
            }))
          : [],
        warnings: String(
          body.warnings ||
            'ESTE PRODUTO NÃO É UM MEDICAMENTO. NÃO EXCEDER A RECOMENDAÇÃO DIÁRIA DE CONSUMO INDICADA NA EMBALAGEM.'
        ),
        usageInstructions: String(body.usageInstructions || 'Ingerir 2 cápsulas ao dia.'),
        restrictions: String(body.restrictions || 'Uso adulto.'),
        labelingInfo: String(body.labelingInfo || 'RDC 429/2020'),
        unitCost: Number(body.unitCost ?? 25.0),
        stockQuantity: Number(body.stockQuantity ?? 100),
        complianceStatus: body.complianceStatus || 'DRAFT',
        createdAt: now,
        updatedAt: now,
      };

      store.state.products.unshift(newProduct);
      store.save();
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'PRODUTO_CRIADO',
        entity: 'Product',
        entityId: newProduct.id,
        previousValue: '-',
        newValue: `${newProduct.sku} (${newProduct.commercialName})`,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ unitCost: newProduct.unitCost }),
      });

      return res.status(201).json({ product: newProduct });
    }
  );

  router.patch(
    '/products/:id',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const product = store.state.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

      if (req.body.sku !== undefined) {
        const nextSku = String(req.body.sku).trim().toUpperCase();
        if (!nextSku) {
          return res.status(400).json({ error: 'O SKU do produto não pode ficar vazio.' });
        }
        const duplicateSku = store.state.products.some(
          (p) => p.id !== product.id && p.sku.toUpperCase() === nextSku
        );
        if (duplicateSku) {
          return res.status(409).json({ error: 'Já existe outro produto cadastrado com este SKU.' });
        }
        req.body.sku = nextSku;
      }

      if (req.body.unitCost !== undefined && Number(req.body.unitCost) < 0) {
        return res.status(422).json({ error: 'O custo unitário não pode ser negativo.' });
      }
      if (req.body.stockQuantity !== undefined && Number(req.body.stockQuantity) < 0) {
        return res.status(422).json({ error: 'A quantidade em estoque não pode ser negativa.' });
      }

      const prevSnapshot = JSON.stringify({
        status: product.status,
        unitCost: product.unitCost,
        stockQuantity: product.stockQuantity,
        complianceStatus: product.complianceStatus,
      });

      Object.assign(product, req.body, { id: product.id, updatedAt: new Date().toISOString() });

      // Propagate compliance status if there is a linked PRODUTO compliance review
      if (req.body.complianceStatus) {
        const linkedReview = store.state.complianceReviews.find(
          (r) => r.targetType === 'PRODUTO' && r.targetId === product.id
        );
        if (linkedReview) {
          linkedReview.status = product.complianceStatus;
          linkedReview.updatedAt = product.updatedAt;
        }
      }

      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'PRODUTO_ALTERADO',
        entity: 'Product',
        entityId: product.id,
        previousValue: prevSnapshot,
        newValue: JSON.stringify({
          status: product.status,
          unitCost: product.unitCost,
          stockQuantity: product.stockQuantity,
          complianceStatus: product.complianceStatus,
        }),
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });

      return res.json({ product });
    }
  );

  router.post(
    '/products/:id/duplicate',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const source = store.state.products.find((p) => p.id === req.params.id);
      if (!source) return res.status(404).json({ error: 'Produto original não encontrado.' });

      const now = new Date().toISOString();
      const copyId = `prd_${Date.now()}`;
      const copySku = `${source.sku}-COPY-${Math.floor(Math.random() * 90 + 10)}`;
      const clonedSource: Product = JSON.parse(JSON.stringify(source));

      const copy: Product = {
        ...clonedSource,
        id: copyId,
        sku: copySku,
        internalName: `${source.internalName} (Cópia)`,
        commercialName: `${source.commercialName} (Cópia)`,
        status: 'INACTIVE',
        complianceStatus: 'DRAFT',
        images: (clonedSource.images || []).map((img, idx) => ({
          ...img,
          id: `img_${Date.now()}_${idx}`,
          productId: copyId,
        })),
        documents: (clonedSource.documents || []).map((doc, idx) => ({
          ...doc,
          id: `doc_${Date.now()}_${idx}`,
          productId: copyId,
        })),
        approvedClaims: (clonedSource.approvedClaims || []).map((clm, idx) => ({
          ...clm,
          id: `clm_${Date.now()}_${idx}`,
          productId: copyId,
        })),
        createdAt: now,
        updatedAt: now,
      };
      store.state.products.unshift(copy);
      store.save();
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'PRODUTO_DUPLICADO',
        entity: 'Product',
        entityId: copy.id,
        previousValue: source.id,
        newValue: copy.sku,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
      return res.status(201).json({ product: copy });
    }
  );

  router.post(
    '/products/:id/documents',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const product = store.state.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

      const { title, docType, version, fileUrl, status } = req.body || {};
      if (!title || !String(title).trim()) {
        return res.status(400).json({ error: 'O título do documento é obrigatório.' });
      }

      const now = new Date().toISOString();
      const newDoc: ProductDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        title: String(title).trim(),
        docType: docType || 'LAUDO_TECNICO',
        fileUrl:
          fileUrl ||
          `/docs/${product.sku.toLowerCase()}-${Date.now().toString().slice(-4)}.pdf`,
        version: String(version || 'v1.0').trim(),
        status: status || 'VALID',
        uploadedBy: req.user!.id,
        uploadedAt: now,
      };

      product.documents.push(newDoc);
      product.updatedAt = now;
      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DOCUMENTO_PRODUTO_ANEXADO',
        entity: 'ProductDocument',
        entityId: newDoc.id,
        previousValue: '-',
        newValue: `${product.sku}: ${newDoc.title} (${newDoc.version})`,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ productId: product.id, docType: newDoc.docType }),
      });

      return res.status(201).json({ product, document: newDoc });
    }
  );

  router.delete(
    '/products/:id/documents/:docId',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const product = store.state.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

      const docIndex = product.documents.findIndex((d) => d.id === req.params.docId);
      if (docIndex === -1) {
        return res.status(404).json({ error: 'Documento não encontrado neste produto.' });
      }

      const [removed] = product.documents.splice(docIndex, 1);
      product.updatedAt = new Date().toISOString();
      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DOCUMENTO_PRODUTO_REMOVIDO',
        entity: 'ProductDocument',
        entityId: removed.id,
        previousValue: removed.title,
        newValue: 'REMOVED',
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ productId: product.id }),
      });

      return res.json({ product });
    }
  );

  router.post(
    '/products/:id/claims',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const product = store.state.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

      const { claimText, regulatoryBasis, status } = req.body || {};
      if (!claimText || !String(claimText).trim()) {
        return res.status(400).json({ error: 'O texto da alegação funcional é obrigatório.' });
      }

      const newClaim: ProductClaim = {
        id: `clm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        claimText: String(claimText).trim(),
        regulatoryBasis: String(regulatoryBasis || 'IN ANVISA nº 28/2018 - Anexo V').trim(),
        status: status || 'APPROVED',
      };

      product.approvedClaims.push(newClaim);
      product.updatedAt = new Date().toISOString();
      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CLAIM_PRODUTO_ADICIONADO',
        entity: 'ProductClaim',
        entityId: newClaim.id,
        previousValue: '-',
        newValue: `${product.sku}: ${newClaim.claimText}`,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ productId: product.id }),
      });

      return res.status(201).json({ product, claim: newClaim });
    }
  );

  router.delete(
    '/products/:id/claims/:claimId',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const product = store.state.products.find((p) => p.id === req.params.id);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado.' });

      const claimIndex = product.approvedClaims.findIndex((c) => c.id === req.params.claimId);
      if (claimIndex === -1) {
        return res.status(404).json({ error: 'Alegação não encontrada neste produto.' });
      }

      product.approvedClaims.splice(claimIndex, 1);
      product.updatedAt = new Date().toISOString();
      store.save();

      return res.json({ product });
    }
  );

  // ============================================================================
  // 3. OFFER ENGINE & LINKS (Condição Comercial Isolada)
  // ============================================================================
  router.get('/offers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'VENDEDOR') {
      // Vendedor vê apenas ofertas autorizadas (globais ou atribuídas a ele) e aprovadas
      const authorized = store.state.offers.filter(
        (o) =>
          (o.sellerId === null || o.sellerId === user.id) &&
          o.status === 'ACTIVE' &&
          o.complianceStatus === 'APPROVED'
      );
      return res.json({ offers: authorized });
    }
    return res.json({ offers: store.state.offers });
  });

  router.post(
    '/offers',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body || {};
      const regularPrice = Number(body.regularPrice);
      const promotionalPrice = Number(body.promotionalPrice);

      if (!body.name || !regularPrice || !promotionalPrice || promotionalPrice <= 0) {
        return res.status(400).json({ error: 'Nome, preço regular e preço promocional são obrigatórios.' });
      }

      const discountAmount = Math.max(0, regularPrice - promotionalPrice);
      const discountPercent = Number(((discountAmount / regularPrice) * 100).toFixed(2));
      const config = store.state.unitEconomicsConfig;

      // Validate Commercial Rules (Max Discount & Min Margin)
      if (discountPercent > config.maxDiscountCeilingPercent) {
        return res.status(422).json({
          error: `Desconto acima do permitido pelo motor comercial (${discountPercent}% > teto de ${config.maxDiscountCeilingPercent}%).`,
          code: 'DISCOUNT_EXCEEDS_CEILING',
        });
      }

      const items = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [
            {
              id: `ofi_${Date.now()}`,
              offerId: '',
              productId: 'prd_01',
              productName: 'Leal LipoTherm Pro 60 Cápsulas [DEMO]',
              sku: 'LC-THERM-60C',
              quantity: Number(body.totalUnits || 1),
              unitCost: 24.5,
            },
          ];

      const totalProductCost = items.reduce(
        (acc: number, it: { quantity: number; unitCost: number }) =>
          acc + Number(it.quantity) * Number(it.unitCost || 24.5),
        0
      );

      const shippingSubsidy = body.freeShipping ? Number(body.shippingSubsidy ?? 18.9) : 0;

      const economics = calculateUnitEconomics(
        {
          grossRevenue: regularPrice,
          discounts: discountAmount,
          productCost: totalProductCost,
          shippingSubsidy,
        },
        config
      );

      if (economics.violatesMinMargin) {
        return res.status(422).json({
          error: `Oferta viola a margem de contribuição mínima configurada (${economics.contributionMarginPercent}% < mínimo de ${config.minContributionMarginPercent}%).`,
          code: 'MARGIN_BELOW_MINIMUM',
          economics,
        });
      }

      const now = new Date().toISOString();
      const code =
        String(body.code || '')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '') ||
        Math.random().toString(36).substring(2, 7).toUpperCase();

      const basePrice =
        body.basePrice !== undefined && Number(body.basePrice) > 0
          ? Number(body.basePrice)
          : promotionalPrice;
      const minimumPrice =
        body.minimumPrice !== undefined && Number(body.minimumPrice) > 0
          ? Number(body.minimumPrice)
          : Number((basePrice * 0.75).toFixed(2));
      const maximumPrice =
        body.maximumPrice !== undefined && body.maximumPrice !== null && body.maximumPrice !== ''
          ? Number(body.maximumPrice)
          : null;
      const commissionPercent =
        body.commissionPercent !== undefined && Number(body.commissionPercent) > 0
          ? Number(body.commissionPercent)
          : config.defaultCommissionPercent || 12;

      const newOffer: Offer = {
        id: `off_${Date.now()}`,
        code,
        name: String(body.name),
        offerType: body.offerType || '1_UNIT',
        items,
        totalUnits: items.reduce((sum: number, i: { quantity: number }) => sum + Number(i.quantity), 0),
        regularPrice,
        promotionalPrice,
        minimumPrice,
        basePrice,
        maximumPrice,
        commissionPercent,
        discountPercent,
        maxCouponDiscountPercent: Number(body.maxCouponDiscountPercent ?? 10),
        defaultCouponCode: body.defaultCouponCode || undefined,
        usageLimit: Number(body.usageLimit || 200),
        usageCount: 0,
        freeShipping: Boolean(body.freeShipping),
        shippingSubsidy,
        extras: Array.isArray(body.extras) ? body.extras : [],
        sellerId: body.sellerId || null,
        campaignId: body.campaignId || null,
        status: 'INACTIVE', // Requires Compliance Gate before active publishing
        complianceStatus: body.complianceStatus || 'DRAFT',
        eligibilityRules: String(body.eligibilityRules || 'Regra padrão do motor comercial.'),
        startsAt: body.startsAt || now,
        endsAt: body.endsAt || new Date(Date.now() + 86400000 * 60).toISOString(),
        createdAt: now,
        updatedAt: now,
      };

      store.state.offers.unshift(newOffer);

      // Register in Compliance Gate automatically if not present
      store.state.complianceReviews.unshift({
        id: `cmp_rev_${Date.now()}`,
        targetType: 'OFERTA',
        targetId: newOffer.id,
        targetName: newOffer.name,
        status: newOffer.complianceStatus,
        checklist: {
          documentacaoExistente: true,
          statusRegulatorio: true,
          claimsAprovados: true,
          rotulagem: true,
          comunicacaoComercial: newOffer.complianceStatus === 'APPROVED',
          advertenciasObrigatorias: newOffer.complianceStatus === 'APPROVED',
        },
        approvedBy: newOffer.complianceStatus === 'APPROVED' ? req.user!.name : null,
        notes: 'Criada via Offer Engine.',
        updatedAt: now,
      });

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'OFERTA_CRIADA',
        entity: 'Offer',
        entityId: newOffer.id,
        previousValue: '-',
        newValue: `${newOffer.code} - R$ ${newOffer.promotionalPrice}`,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ economics }),
      });

      return res.status(201).json({ offer: newOffer, economics });
    }
  );

  router.patch(
    '/offers/:id',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const offer = store.state.offers.find((o) => o.id === req.params.id);
      if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });

      const newRegular = req.body.regularPrice !== undefined ? Number(req.body.regularPrice) : offer.regularPrice;
      const newPromo =
        req.body.promotionalPrice !== undefined ? Number(req.body.promotionalPrice) : offer.promotionalPrice;

      const discountAmount = Math.max(0, newRegular - newPromo);
      const discountPercent = Number(((discountAmount / newRegular) * 100).toFixed(2));
      const config = store.state.unitEconomicsConfig;

      if (discountPercent > config.maxDiscountCeilingPercent) {
        return res.status(422).json({
          error: `Alteração bloqueada: Desconto de ${discountPercent}% excede o teto de ${config.maxDiscountCeilingPercent}%.`,
        });
      }

      const prevPrice = offer.promotionalPrice;
      const newBasePrice =
        req.body.basePrice !== undefined
          ? Number(req.body.basePrice)
          : req.body.promotionalPrice !== undefined
            ? newPromo
            : offer.basePrice ?? newPromo;
      const newMinPrice =
        req.body.minimumPrice !== undefined
          ? Number(req.body.minimumPrice)
          : offer.minimumPrice ?? Number((newBasePrice * 0.75).toFixed(2));
      const newMaxPrice =
        req.body.maximumPrice !== undefined
          ? req.body.maximumPrice === null || req.body.maximumPrice === ''
            ? null
            : Number(req.body.maximumPrice)
          : offer.maximumPrice ?? null;
      const newCommissionPercent =
        req.body.commissionPercent !== undefined
          ? Number(req.body.commissionPercent)
          : offer.commissionPercent ?? config.defaultCommissionPercent;

      // Note: Updating an Offer only updates future negotiations; existing OfferLinks preserve their snapshot
      Object.assign(offer, req.body, {
        id: offer.id,
        regularPrice: newRegular,
        promotionalPrice: newPromo,
        basePrice: newBasePrice,
        minimumPrice: newMinPrice,
        maximumPrice: newMaxPrice,
        commissionPercent: newCommissionPercent,
        discountPercent,
        updatedAt: new Date().toISOString(),
      });
      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: prevPrice !== newPromo ? 'PRECO_OFERTA_ALTERADO' : 'OFERTA_ALTERADA',
        entity: 'Offer',
        entityId: offer.id,
        previousValue: `R$ ${prevPrice}`,
        newValue: `R$ ${offer.promotionalPrice}`,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });

      return res.json({ offer });
    }
  );

  router.post(
    '/offers/:id/publish',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const offer = store.state.offers.find((o) => o.id === req.params.id);
      if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });

      if (offer.complianceStatus !== 'APPROVED') {
        return res.status(422).json({
          error: `Publicação bloqueada pelo Compliance Gate: O status de compliance da oferta é "${offer.complianceStatus}" (requer APPROVED).`,
          code: 'COMPLIANCE_GATE_BLOCKED',
        });
      }

      // Verify all items in the offer have APPROVED compliance status
      for (const item of offer.items) {
        const prod = store.state.products.find((p) => p.id === item.productId);
        if (prod && prod.complianceStatus !== 'APPROVED') {
          return res.status(422).json({
            error: `Publicação bloqueada: O produto "${prod.commercialName}" está com status regulatório "${prod.complianceStatus}".`,
            code: 'PRODUCT_COMPLIANCE_BLOCKED',
          });
        }
      }

      const prevStatus = offer.status;
      offer.status = 'ACTIVE';
      offer.updatedAt = new Date().toISOString();
      store.save();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'OFERTA_PUBLICADA',
        entity: 'Offer',
        entityId: offer.id,
        previousValue: prevStatus,
        newValue: 'ACTIVE',
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });

      return res.json({ offer });
    }
  );

  // Helper: Calculate and validate seller negotiation price & earnings (Server as source of truth)
  const computeSellerNegotiation = (
    offer: Offer,
    seller: User,
    rawSalePrice: unknown
  ): {
    valid: boolean;
    status: number;
    code?: string;
    error?: string;
    salePrice: number;
    basePrice: number;
    minimumPrice: number;
    maximumPrice: number | null;
    commissionPercent: number;
    commissionAmount: number;
    surplusAmount: number;
    sellerEarnings: number;
  } => {
    const defaultComm = store.state.unitEconomicsConfig.defaultCommissionPercent || 12;
    const basePrice = Number((offer.basePrice ?? offer.promotionalPrice).toFixed(2));
    const minimumPrice = Number(
      (offer.minimumPrice ?? Number((basePrice * 0.75).toFixed(2))).toFixed(2)
    );
    const maximumPrice =
      offer.maximumPrice !== undefined && offer.maximumPrice !== null
        ? Number(Number(offer.maximumPrice).toFixed(2))
        : null;
    const commissionPercent = Number(
      offer.commissionPercent ?? seller.commissionRate ?? defaultComm
    );

    const parsedPrice =
      rawSalePrice !== undefined && rawSalePrice !== null && rawSalePrice !== ''
        ? Number(rawSalePrice)
        : basePrice;

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return {
        valid: false,
        status: 400,
        code: 'INVALID_SALE_PRICE',
        error: 'Informe um preço de venda válido maior que zero.',
        salePrice: 0,
        basePrice,
        minimumPrice,
        maximumPrice,
        commissionPercent,
        commissionAmount: 0,
        surplusAmount: 0,
        sellerEarnings: 0,
      };
    }

    const salePrice = Number(parsedPrice.toFixed(2));

    if (salePrice < minimumPrice) {
      return {
        valid: false,
        status: 422,
        code: 'PRICE_BELOW_MINIMUM',
        error: `Preço informado (R$ ${salePrice.toFixed(2)}) está abaixo do preço mínimo permitido para esta oferta (R$ ${minimumPrice.toFixed(2)}).`,
        salePrice,
        basePrice,
        minimumPrice,
        maximumPrice,
        commissionPercent,
        commissionAmount: 0,
        surplusAmount: 0,
        sellerEarnings: 0,
      };
    }

    if (maximumPrice !== null && salePrice > maximumPrice) {
      return {
        valid: false,
        status: 422,
        code: 'PRICE_ABOVE_MAXIMUM',
        error: `Preço informado (R$ ${salePrice.toFixed(2)}) excede o teto máximo permitido para esta oferta (R$ ${maximumPrice.toFixed(2)}).`,
        salePrice,
        basePrice,
        minimumPrice,
        maximumPrice,
        commissionPercent,
        commissionAmount: 0,
        surplusAmount: 0,
        sellerEarnings: 0,
      };
    }

    // Rule:
    // - commissionAmount = salePrice * (commissionPercent / 100)
    // - surplusAmount = max(0, salePrice - basePrice) -> belongs 100% to seller without a second 12% charge
    // - sellerEarnings = commissionAmount + surplusAmount
    const commissionAmount = Number(((salePrice * commissionPercent) / 100).toFixed(2));
    const surplusAmount = Number(Math.max(0, salePrice - basePrice).toFixed(2));
    const sellerEarnings = Number((commissionAmount + surplusAmount).toFixed(2));

    return {
      valid: true,
      status: 200,
      salePrice,
      basePrice,
      minimumPrice,
      maximumPrice,
      commissionPercent,
      commissionAmount,
      surplusAmount,
      sellerEarnings,
    };
  };

  // Helper: Generate guaranteed unique negotiation link code (never reuses previous links)
  const generateUniqueNegotiationCode = (offerCode: string): string => {
    const prefix = offerCode.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'LNK';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let candidate = '';
    do {
      let suffix = '';
      for (let i = 0; i < 5; i++) {
        suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      candidate = `${prefix}${suffix}`;
    } while (
      store.state.offerLinks.some((l) => l.code.toUpperCase() === candidate) ||
      store.state.offers.some((o) => o.code.toUpperCase() === candidate)
    );
    return candidate;
  };

  // Public Offer Link Resolution: /o/:code
  router.get('/o/:code', (req: Request, res: Response, next: NextFunction) => {
    if (!req.originalUrl.startsWith('/api/') && req.headers.accept?.includes('text/html')) {
      return next();
    }
    const code = String(req.params.code || '').toUpperCase();
    // Resolve specific OfferLink negotiation first so snapshot price and attribution take precedence
    const link = store.state.offerLinks.find((l) => l.code.toUpperCase() === code);
    const offer = link
      ? store.state.offers.find((o) => o.id === link.offerId)
      : store.state.offers.find((o) => o.code.toUpperCase() === code);

    if (!offer) {
      return res.status(404).json({ error: 'Link de oferta não encontrado.' });
    }

    if (offer.status !== 'ACTIVE' || (link && link.status !== 'ACTIVE')) {
      return res.status(422).json({ error: 'Esta oferta está desativada no momento.', code: 'OFFER_INACTIVE' });
    }

    if (offer.complianceStatus !== 'APPROVED') {
      return res.status(422).json({
        error: 'Oferta indisponível: pendente de aprovação no Compliance Gate.',
        code: 'OFFER_NOT_APPROVED',
      });
    }

    if (new Date(offer.endsAt).getTime() < Date.now() || (link && new Date(link.expiresAt).getTime() < Date.now())) {
      return res.status(422).json({ error: 'Esta oferta expirou.', code: 'OFFER_EXPIRED' });
    }

    if (offer.usageCount >= offer.usageLimit) {
      return res.status(422).json({
        error: 'Limite máximo de pedidos para esta condição comercial foi atingido.',
        code: 'OFFER_LIMIT_EXCEEDED',
      });
    }

    if (link) {
      link.clicks += 1;
    }

    store.state.analyticsEvents.push({
      id: `an_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      eventType: 'link_acessado',
      offerId: offer.id,
      sellerId: link?.sellerId || offer.sellerId,
      campaignId: link?.campaignId || offer.campaignId,
      timestamp: new Date().toISOString(),
    });
    store.save();

    const productsDetails = offer.items
      .map((item) => store.state.products.find((p) => p.id === item.productId))
      .filter(Boolean);

    const campaign = store.state.campaigns.find(
      (c) => c.id === (link?.campaignId || offer.campaignId)
    );
    const seller = store.state.users.find((u) => u.id === (link?.sellerId || offer.sellerId));

    // If accessed via a negotiation OfferLink, apply the link's frozen snapshot salePrice
    const effectiveSalePrice =
      link && link.salePrice !== undefined ? Number(link.salePrice) : offer.promotionalPrice;
    const effectiveRegularPrice =
      offer.regularPrice > effectiveSalePrice ? offer.regularPrice : effectiveSalePrice;
    const effectiveDiscountPercent =
      effectiveRegularPrice > effectiveSalePrice
        ? Number(
            (((effectiveRegularPrice - effectiveSalePrice) / effectiveRegularPrice) * 100).toFixed(2)
          )
        : 0;

    const offerSnapshotForCheckout: Offer = {
      ...offer,
      name: link?.offerName || offer.name,
      promotionalPrice: effectiveSalePrice,
      regularPrice: effectiveRegularPrice,
      discountPercent: effectiveDiscountPercent,
    };

    return res.json({
      offer: offerSnapshotForCheckout,
      link: link || null,
      products: productsDetails,
      campaign: campaign
        ? { id: campaign.id, name: campaign.name, utmSource: campaign.utmSource, utmCampaign: campaign.utmCampaign }
        : null,
      seller: seller ? { id: seller.id, name: seller.name, sellerCode: seller.sellerCode } : null,
    });
  });

  // Seller Link Listing (Negotiation History)
  router.get('/seller/links', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const links =
      user.role === 'ADMIN'
        ? store.state.offerLinks
        : store.state.offerLinks.filter((l) => l.sellerId === user.id);
    return res.json({ links });
  });

  // Seller Gain Simulation Endpoint (Backend as source of truth)
  router.post(
    '/seller/links/simulate',
    requireAuth,
    requireRole(['ADMIN', 'VENDEDOR']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const { offerId, salePrice, price } = req.body || {};

      const offer = store.state.offers.find((o) => o.id === offerId);
      if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });

      if (offer.status !== 'ACTIVE' || offer.complianceStatus !== 'APPROVED') {
        return res.status(422).json({
          error: 'Apenas ofertas ativas e aprovadas podem ser negociadas.',
        });
      }

      if (user.role === 'VENDEDOR' && offer.sellerId && offer.sellerId !== user.id) {
        return res.status(403).json({
          error: 'Esta oferta não está autorizada para o seu perfil de vendedor.',
        });
      }

      const sim = computeSellerNegotiation(offer, user, salePrice ?? price);
      if (!sim.valid) {
        return res.status(sim.status).json({
          valid: false,
          error: sim.error,
          code: sim.code,
          offerId: offer.id,
          minimumPrice: sim.minimumPrice,
          basePrice: sim.basePrice,
          maximumPrice: sim.maximumPrice,
          commissionPercent: sim.commissionPercent,
        });
      }

      return res.json({
        valid: true,
        offerId: offer.id,
        offerName: offer.name,
        salePrice: sim.salePrice,
        minimumPrice: sim.minimumPrice,
        basePrice: sim.basePrice,
        maximumPrice: sim.maximumPrice,
        commissionPercent: sim.commissionPercent,
        commissionAmount: sim.commissionAmount,
        surplusAmount: sim.surplusAmount,
        sellerEarnings: sim.sellerEarnings,
      });
    }
  );

  // Seller Unique Negotiation Link Creation (Never reuses previous links; saves commercial snapshot)
  router.post(
    '/seller/links',
    requireAuth,
    requireRole(['ADMIN', 'VENDEDOR']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const { offerId, campaignId, couponCode, salePrice, price, customPrice } = req.body || {};

      const offer = store.state.offers.find((o) => o.id === offerId);
      if (!offer) return res.status(404).json({ error: 'Oferta não encontrada.' });

      if (offer.status !== 'ACTIVE' || offer.complianceStatus !== 'APPROVED') {
        return res.status(422).json({ error: 'Apenas ofertas ativas e aprovadas em compliance podem gerar links.' });
      }

      if (user.role === 'VENDEDOR' && offer.sellerId && offer.sellerId !== user.id) {
        return res.status(403).json({ error: 'Esta oferta não está autorizada para o seu perfil de vendedor.' });
      }

      const requestedPrice = salePrice ?? price ?? customPrice;
      const sim = computeSellerNegotiation(offer, user, requestedPrice);
      if (!sim.valid) {
        return res.status(sim.status).json({
          error: sim.error,
          code: sim.code,
          minimumPrice: sim.minimumPrice,
          basePrice: sim.basePrice,
          maximumPrice: sim.maximumPrice,
        });
      }

      const code = generateUniqueNegotiationCode(offer.code);
      const now = new Date().toISOString();
      const newLink: OfferLink = {
        id: `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        code,
        offerId: offer.id,
        offerName: offer.name,
        campaignId: campaignId || offer.campaignId,
        sellerId: user.id,
        sellerName: user.name,
        salePrice: sim.salePrice,
        basePrice: sim.basePrice,
        minimumPrice: sim.minimumPrice,
        maximumPrice: sim.maximumPrice,
        commissionPercent: sim.commissionPercent,
        commissionAmount: sim.commissionAmount,
        surplusAmount: sim.surplusAmount,
        sellerEarnings: sim.sellerEarnings,
        couponCode: couponCode !== undefined ? (couponCode || undefined) : offer.defaultCouponCode,
        clicks: 0,
        conversions: 0,
        status: 'ACTIVE',
        expiresAt: offer.endsAt,
        createdAt: now,
      };

      store.state.offerLinks.unshift(newLink);
      store.appendAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LINK_OFERTA_GERADO',
        entity: 'OfferLink',
        entityId: newLink.id,
        previousValue: `Base R$ ${sim.basePrice.toFixed(2)}`,
        newValue: `/o/${newLink.code} (Venda R$ ${sim.salePrice.toFixed(2)} | Ganho R$ ${sim.sellerEarnings.toFixed(2)})`,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({
          offerId: offer.id,
          salePrice: sim.salePrice,
          basePrice: sim.basePrice,
          minimumPrice: sim.minimumPrice,
          commissionPercent: sim.commissionPercent,
          commissionAmount: sim.commissionAmount,
          surplusAmount: sim.surplusAmount,
          sellerEarnings: sim.sellerEarnings,
        }),
      });

      return res.status(201).json({ link: newLink });
    }
  );

  // ============================================================================
  // 4. COUPONS
  // ============================================================================
  router.get('/coupons', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const coupons =
      user.role === 'VENDEDOR'
        ? store.state.coupons.filter(
            (c) => c.authorizedSellerId === null || c.authorizedSellerId === user.id
          )
        : store.state.coupons;
    return res.json({ coupons, usages: store.state.couponUsages });
  });

  router.post(
    '/coupons',
    requireAuth,
    requireRole(['ADMIN', 'VENDEDOR']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const body = req.body || {};
      const code = String(body.code || '').toUpperCase().trim();
      const discountValue = Number(body.discountValue);
      const discountType = body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';

      if (!code || !discountValue || discountValue <= 0) {
        return res.status(400).json({ error: 'Código e valor de desconto são obrigatórios.' });
      }

      if (store.state.coupons.some((c) => c.code === code)) {
        return res.status(409).json({ error: 'Já existe um cupom com este código.' });
      }

      // Seller can only create coupons within commercial rules (max 12% or R$ 30)
      if (user.role === 'VENDEDOR') {
        if (
          (discountType === 'PERCENTAGE' && discountValue > 12) ||
          (discountType === 'FIXED' && discountValue > 30)
        ) {
          return res.status(422).json({
            error: 'Vendedor só pode gerar cupons dentro do limite autorizado pelo motor comercial (máx 12% ou R$ 30).',
          });
        }
      }

      if (
        discountType === 'PERCENTAGE' &&
        discountValue > store.state.unitEconomicsConfig.maxDiscountCeilingPercent
      ) {
        return res.status(422).json({
          error: `Desconto do cupom (${discountValue}%) excede o teto comercial de ${store.state.unitEconomicsConfig.maxDiscountCeilingPercent}%.`,
        });
      }

      const newCoupon: Coupon = {
        id: `cpn_${Date.now()}`,
        code,
        discountType,
        discountValue,
        maxUsesGlobal: Number(body.maxUsesGlobal || 100),
        maxUsesPerCustomer: Number(body.maxUsesPerCustomer || 1),
        currentUses: 0,
        validUntil: body.validUntil || new Date(Date.now() + 86400000 * 30).toISOString(),
        authorizedSellerId: user.role === 'VENDEDOR' ? user.id : body.authorizedSellerId || null,
        authorizedCampaignId: body.authorizedCampaignId || null,
        authorizedProductId: body.authorizedProductId || null,
        authorizedOfferId: body.authorizedOfferId || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      store.state.coupons.unshift(newCoupon);
      store.appendAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'CUPOM_CRIADO',
        entity: 'Coupon',
        entityId: newCoupon.id,
        previousValue: '-',
        newValue: `${newCoupon.code} (${newCoupon.discountValue} ${newCoupon.discountType})`,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });

      return res.status(201).json({ coupon: newCoupon });
    }
  );

  router.post('/coupons/validate', (req: Request, res: Response) => {
    const { code, offerId, linkCode, customerCpf, sellerId, campaignId } = req.body || {};
    const cleanCode = String(code || '').toUpperCase().trim();
    const coupon = store.state.coupons.find((c) => c.code === cleanCode);
    const link = linkCode
      ? store.state.offerLinks.find((l) => l.code.toUpperCase() === String(linkCode).toUpperCase())
      : undefined;

    if (!coupon) {
      return res.status(404).json({ valid: false, error: 'Cupom não encontrado.' });
    }
    if (coupon.status !== 'ACTIVE') {
      return res.status(422).json({ valid: false, error: 'Cupom inativo.' });
    }
    if (new Date(coupon.validUntil).getTime() < Date.now()) {
      return res.status(422).json({ valid: false, error: 'Cupom expirado.' });
    }
    if (coupon.currentUses >= coupon.maxUsesGlobal) {
      return res.status(422).json({ valid: false, error: 'Limite global de uso do cupom excedido.' });
    }
    const targetOfferId = link?.offerId || offerId;
    if (coupon.authorizedOfferId && targetOfferId && coupon.authorizedOfferId !== targetOfferId) {
      return res.status(422).json({ valid: false, error: 'Cupom não autorizado para esta oferta.' });
    }
    const targetSellerId = link?.sellerId || sellerId;
    if (coupon.authorizedSellerId && targetSellerId && coupon.authorizedSellerId !== targetSellerId) {
      return res.status(422).json({ valid: false, error: 'Cupom exclusivo de outro consultor.' });
    }
    const targetCampaignId = link?.campaignId || campaignId;
    if (coupon.authorizedCampaignId && targetCampaignId && coupon.authorizedCampaignId !== targetCampaignId) {
      return res.status(422).json({ valid: false, error: 'Cupom restrito a outra campanha.' });
    }

    if (customerCpf) {
      const cleanCpf = String(customerCpf).replace(/\D/g, '');
      const customerUsages = store.state.couponUsages.filter(
        (u) => u.couponId === coupon.id && u.customerCpf.replace(/\D/g, '') === cleanCpf
      );
      if (customerUsages.length >= coupon.maxUsesPerCustomer) {
        return res.status(422).json({
          valid: false,
          error: 'Limite de utilização deste cupom por CPF já foi atingido.',
        });
      }
    }

    const offer = targetOfferId ? store.state.offers.find((o) => o.id === targetOfferId) : undefined;
    const effectivePrice =
      link && link.salePrice !== undefined
        ? Number(link.salePrice)
        : offer?.promotionalPrice || 0;
    let discountAmount = 0;
    if (offer && effectivePrice > 0) {
      discountAmount =
        coupon.discountType === 'PERCENTAGE'
          ? Number(((effectivePrice * coupon.discountValue) / 100).toFixed(2))
          : Math.min(effectivePrice, coupon.discountValue);

      const effectiveCouponPct = (discountAmount / effectivePrice) * 100;
      if (effectiveCouponPct > offer.maxCouponDiscountPercent + 0.01) {
        return res.status(422).json({
          valid: false,
          error: `Desconto do cupom excede o limite adicional permitido para esta oferta (${offer.maxCouponDiscountPercent}%).`,
        });
      }
    }

    return res.json({
      valid: true,
      coupon,
      discountAmount,
    });
  });

  // ============================================================================
  // 5. SHIPPING QUOTE & TRACKING
  // ============================================================================
  router.post('/shipping/quote', async (req: Request, res: Response) => {
    try {
      const { cep, offerId, simulateFallback } = req.body || {};
      const offer = store.state.offers.find((o) => o.id === offerId);
      const totalUnits = offer ? offer.totalUnits : 1;

      shippingProvider.simulatePrimaryDown = Boolean(simulateFallback);
      const quoteResult = await shippingProvider.quote(String(cep || ''), totalUnits);
      shippingProvider.simulatePrimaryDown = false;

      // Apply free shipping if offer grants it
      const options = quoteResult.options.map((opt) => ({
        ...opt,
        price: offer?.freeShipping ? 0 : opt.price,
      }));

      return res.json({ ...quoteResult, options });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao cotar frete';
      return res.status(422).json({ error: message });
    }
  });

  // Public Tracking Endpoint — Strictly minimizes PII (No CPF, no street address, no phone/email)
  router.get('/shipments/:id/tracking', async (req: Request, res: Response) => {
    const queryCode = String(req.params.id || '').trim();
    const order = store.state.orders.find(
      (o) =>
        o.id === queryCode ||
        o.orderNumber.toUpperCase() === queryCode.toUpperCase() ||
        o.orderNumber.replace('#', '').toUpperCase() === queryCode.replace('#', '').toUpperCase() ||
        o.trackingCode === queryCode
    );

    if (!order) {
      return res.status(404).json({ error: 'Pedido ou rastreamento não localizado.' });
    }

    const shipment = store.state.shipments.find((s) => s.orderId === order.id);

    // Privacy By Design: Mask customer name to first name + initial, city/state only. Never expose CPF or street!
    const nameParts = order.customerSnapshot.name.replace('[DEMO]', '').trim().split(' ');
    const maskedCustomerName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
        : nameParts[0];

    return res.json({
      orderNumber: order.orderNumber,
      consolidatedStatus: order.consolidatedStatus,
      financialStatus: order.financialStatus,
      operationalStatus: order.operationalStatus,
      shippingService: order.shippingService,
      estimatedDeliveryDays: order.estimatedDeliveryDays,
      trackingCode: order.trackingCode,
      destinationSummary: `${order.customerSnapshot.city} / ${order.customerSnapshot.state}`,
      recipientFirstName: maskedCustomerName,
      itemsSummary: order.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
      events: shipment?.events || [],
      timeline: order.timeline.map((t) => ({
        event: t.event,
        timestamp: t.timestamp,
        note: t.note,
      })),
    });
  });

  // ============================================================================
  // 6. CHECKOUT & ORDER CREATION
  // ============================================================================
  router.post('/checkout', async (req: Request, res: Response) => {
    const {
      offerId,
      linkCode,
      couponCode,
      cep,
      shippingServiceCode,
      paymentMethod,
      customer,
      idempotencyKey,
    } = req.body || {};

    // Resolve OfferLink first when linkCode is provided
    const link = linkCode
      ? store.state.offerLinks.find((l) => l.code.toUpperCase() === String(linkCode).toUpperCase())
      : undefined;

    if (linkCode && !link && !store.state.offers.some((o) => o.code.toUpperCase() === String(linkCode).toUpperCase())) {
      return res.status(404).json({ error: 'Link de negociação não encontrado.' });
    }

    if (link) {
      if (link.status !== 'ACTIVE') {
        return res.status(422).json({ error: 'Este link de negociação está inativo.' });
      }
      if (new Date(link.expiresAt).getTime() < Date.now()) {
        return res.status(422).json({ error: 'Este link de negociação expirou.' });
      }
      if (offerId && offerId !== link.offerId) {
        return res.status(422).json({ error: 'O link informado não pertence à oferta selecionada.' });
      }
    }

    const resolvedOfferId = link?.offerId || offerId;
    const offer = store.state.offers.find((o) => o.id === resolvedOfferId);
    if (!offer) {
      return res.status(404).json({ error: 'Oferta não encontrada.' });
    }
    if (offer.status !== 'ACTIVE' || offer.complianceStatus !== 'APPROVED') {
      return res.status(422).json({ error: 'Oferta inativa ou não aprovada em compliance.' });
    }
    if (new Date(offer.endsAt).getTime() < Date.now()) {
      return res.status(422).json({ error: 'Oferta expirada.' });
    }
    if (offer.usageCount >= offer.usageLimit) {
      return res.status(422).json({ error: 'Limite de utilizações da oferta excedido.' });
    }

    // Validate CEP & Shipping via ShippingProvider
    let shippingQuote;
    try {
      shippingQuote = await shippingProvider.quote(String(cep || customer?.cep || ''), offer.totalUnits);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CEP inválido ou frete indisponível.';
      return res.status(422).json({ error: msg });
    }

    const chosenShipping =
      shippingQuote.options.find((o) => o.serviceCode === shippingServiceCode) ||
      shippingQuote.options[0];

    if (!customer?.name || !customer?.phone || !customer?.email || !customer?.cpf || !customer?.street || !customer?.number) {
      return res.status(400).json({
        error: 'Dados obrigatórios do cliente incompletos (nome, telefone, e-mail, CPF, endereço e número).',
      });
    }

    // Resolve attribution (CLIENT = belongs to operation; SALE = attributed to seller & specific OfferLink)
    const attributedSellerId = link?.sellerId || offer.sellerId || 'usr_seller_01';
    const seller = store.state.users.find((u) => u.id === attributedSellerId);
    const attributedCampaignId = link?.campaignId || offer.campaignId || 'cmp_01';
    const campaign = store.state.campaigns.find((c) => c.id === attributedCampaignId);

    // Authoritative price comes strictly from the OfferLink snapshot (if present) or Offer. Customer cannot alter price.
    const negotiatedSalePrice =
      link && link.salePrice !== undefined ? Number(link.salePrice) : offer.promotionalPrice;

    // Validate coupon if provided
    let discount = 0;
    let appliedCoupon: Coupon | undefined;
    if (couponCode) {
      const cleanCode = String(couponCode).toUpperCase().trim();
      appliedCoupon = store.state.coupons.find((c) => c.code === cleanCode);
      if (!appliedCoupon || appliedCoupon.status !== 'ACTIVE') {
        return res.status(422).json({ error: 'Cupom inválido ou inativo.' });
      }
      if (new Date(appliedCoupon.validUntil).getTime() < Date.now()) {
        return res.status(422).json({ error: 'Cupom expirado.' });
      }
      if (appliedCoupon.currentUses >= appliedCoupon.maxUsesGlobal) {
        return res.status(422).json({ error: 'Cupom atingiu o limite máximo de utilizações.' });
      }
      if (appliedCoupon.authorizedOfferId && appliedCoupon.authorizedOfferId !== offer.id) {
        return res.status(422).json({ error: 'Cupom não autorizado para esta oferta.' });
      }
      if (appliedCoupon.authorizedSellerId && appliedCoupon.authorizedSellerId !== attributedSellerId) {
        return res.status(422).json({ error: 'Cupom exclusivo de outro consultor.' });
      }
      if (appliedCoupon.authorizedCampaignId && appliedCoupon.authorizedCampaignId !== attributedCampaignId) {
        return res.status(422).json({ error: 'Cupom restrito a outra campanha.' });
      }
      if (customer.cpf) {
        const cleanCpf = String(customer.cpf).replace(/\D/g, '');
        const customerUsages = store.state.couponUsages.filter(
          (u) => u.couponId === appliedCoupon!.id && u.customerCpf.replace(/\D/g, '') === cleanCpf
        );
        if (customerUsages.length >= appliedCoupon.maxUsesPerCustomer) {
          return res.status(422).json({
            error: 'Limite de utilização deste cupom por CPF já foi atingido.',
          });
        }
      }
      discount =
        appliedCoupon.discountType === 'PERCENTAGE'
          ? Number(((negotiatedSalePrice * appliedCoupon.discountValue) / 100).toFixed(2))
          : Math.min(negotiatedSalePrice, appliedCoupon.discountValue);

      const effectiveCouponPct = (discount / negotiatedSalePrice) * 100;
      if (effectiveCouponPct > offer.maxCouponDiscountPercent + 0.01) {
        return res.status(422).json({
          error: `Desconto do cupom excede o teto permitido para esta oferta (${offer.maxCouponDiscountPercent}%).`,
        });
      }
    }

    const shippingCost = offer.freeShipping ? 0 : chosenShipping.price;
    const subtotal = negotiatedSalePrice;
    const total = Number(Math.max(1, subtotal - discount + shippingCost).toFixed(2));

    const idemKey = String(idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    if (store.state.payments.some((p) => p.idempotencyKey === idemKey)) {
      return res.status(409).json({ error: 'Transação duplicada bloqueada por chave de idempotência.' });
    }

    const now = new Date().toISOString();
    const orderSeq = 10424 + store.state.orders.length;
    const orderNumber = `#LC-${orderSeq}`;
    const orderId = `ord_${orderSeq}`;

    const newCustomer: Customer = {
      id: `cst_${Date.now()}`,
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),
      email: String(customer.email).trim(),
      cpf: String(customer.cpf).trim(),
      cep: shippingQuote.cep,
      street: String(customer.street || shippingQuote.street).trim(),
      number: String(customer.number).trim(),
      complement: customer.complement ? String(customer.complement).trim() : undefined,
      neighborhood: String(customer.neighborhood || shippingQuote.neighborhood || 'Centro').trim(),
      city: String(customer.city || shippingQuote.city).trim(),
      state: String(customer.state || shippingQuote.state).trim().toUpperCase(),
      marketingOptIn: customer.marketingOptIn !== undefined ? Boolean(customer.marketingOptIn) : true,
      anonymized: false,
      createdAt: now,
    };
    store.state.customers.unshift(newCustomer);

    const method =
      paymentMethod === 'CREDIT_CARD' || paymentMethod === 'BOLETO' ? paymentMethod : 'PIX';

    const paymentCreated = await paymentProvider.createPayment({
      orderId,
      orderNumber,
      amount: total,
      method,
      idempotencyKey: idemKey,
      customerEmail: newCustomer.email,
    });

    const newPayment: Payment = {
      id: `pay_${orderSeq}`,
      orderId,
      orderNumber,
      provider: paymentCreated.provider,
      externalReference: paymentCreated.externalReference,
      idempotencyKey: idemKey,
      method,
      amount: total,
      gatewayFee: paymentCreated.gatewayFee,
      status: 'PENDING',
      pixQrCode: paymentCreated.pixQrCode,
      webhookEvents: [],
      createdAt: now,
      updatedAt: now,
    };
    store.state.payments.unshift(newPayment);

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      customerId: newCustomer.id,
      customerSnapshot: {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        cpf: newCustomer.cpf,
        cep: newCustomer.cep,
        street: newCustomer.street,
        number: newCustomer.number,
        complement: newCustomer.complement,
        neighborhood: newCustomer.neighborhood,
        city: newCustomer.city,
        state: newCustomer.state,
      },
      sellerId: seller?.id || null,
      sellerName: seller?.name || 'Venda Direta Operação',
      offerId: offer.id,
      offerName: link?.offerName || offer.name,
      offerLinkId: link?.id || null,
      offerLinkCode: link?.code || null,
      campaignId: campaign?.id || null,
      campaignName: campaign?.name || 'Tráfego Direto',
      couponCode: appliedCoupon?.code || null,
      items: offer.items.map((item) => ({
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number((subtotal / offer.totalUnits).toFixed(2)),
        unitCost: item.unitCost,
      })),
      subtotal,
      discount,
      shippingCost,
      shippingSubsidy: offer.freeShipping ? chosenShipping.price : 0,
      total,
      paymentId: newPayment.id,
      paymentMethod: method,
      shippingService: chosenShipping.serviceName,
      estimatedDeliveryDays: chosenShipping.estimatedDays,
      trackingCode: null,
      financialStatus: 'pending',
      operationalStatus: 'waiting',
      consolidatedStatus: deriveConsolidatedOrderStatus('pending', 'waiting'),
      exceptionReason: null,
      timeline: [
        {
          id: `evt_${Date.now()}_1`,
          orderId,
          event: 'PEDIDO CRIADO',
          actor: 'Checkout Mobile-First',
          timestamp: now,
          previousValue: '-',
          newValue: orderNumber,
          note: `Oferta ${offer.code} iniciada. Status financeiro: pending | Status operacional: waiting.`,
        },
        {
          id: `evt_${Date.now()}_2`,
          orderId,
          event: 'PAGAMENTO PENDENTE',
          actor: paymentCreated.provider,
          timestamp: now,
          previousValue: 'CREATED',
          newValue: 'PENDING',
          note: `Aguardando confirmação oficial via Webhook do Gateway (${method}).`,
        },
      ],
      repurchaseWindowDays: store.state.unitEconomicsConfig.repurchaseCycleDays,
      createdAt: now,
      updatedAt: now,
    };

    store.state.orders.unshift(newOrder);
    offer.usageCount += 1;
    if (link) link.conversions += 1;

    if (appliedCoupon) {
      appliedCoupon.currentUses += 1;
      store.state.couponUsages.unshift({
        id: `cpu_${Date.now()}`,
        couponId: appliedCoupon.id,
        couponCode: appliedCoupon.code,
        customerId: newCustomer.id,
        customerCpf: newCustomer.cpf,
        orderId: newOrder.id,
        discountApplied: discount,
        usedAt: now,
      });
    }

    // Freeze seller commission + surplus on the order at creation time so retroactive rule changes never alter old orders
    if (seller) {
      const calcBase = Number((subtotal - discount).toFixed(2));
      const basePrice = link
        ? Number(link.basePrice ?? offer.basePrice ?? offer.promotionalPrice)
        : Number(offer.basePrice ?? offer.promotionalPrice);
      const pct = link
        ? Number(link.commissionPercent)
        : seller.commissionRate ||
          offer.commissionPercent ||
          store.state.unitEconomicsConfig.defaultCommissionPercent;

      const commissionAmount =
        link && discount === 0 && link.commissionAmount !== undefined
          ? Number(link.commissionAmount)
          : Number(((calcBase * pct) / 100).toFixed(2));
      const surplusAmount =
        link && discount === 0 && link.surplusAmount !== undefined
          ? Number(link.surplusAmount)
          : Number(Math.max(0, calcBase - basePrice).toFixed(2));
      const totalEarnings =
        link && discount === 0 && link.sellerEarnings !== undefined
          ? Number(link.sellerEarnings)
          : Number((commissionAmount + surplusAmount).toFixed(2));

      store.state.commissions.unshift({
        id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sellerId: seller.id,
        sellerName: seller.name,
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        offerLinkId: link?.id || null,
        offerLinkCode: link?.code || null,
        calculationBase: calcBase,
        basePrice,
        percentage: pct,
        commissionAmount,
        surplusAmount,
        amount: totalEarnings,
        status: 'PENDING',
        ruleUsed: `REGRA_CONGELADA_${seller.sellerCode || 'SELLER'}_${pct}PCT_BASE_${basePrice}_EXCEDENTE_${surplusAmount}_EM_${now.slice(0, 10)}`,
        createdAt: now,
      });
    }

    store.appendAuditLog({
      userId: seller?.id || 'public_checkout',
      userName: newCustomer.name,
      userRole: 'CLIENTE',
      action: 'PEDIDO_CRIADO',
      entity: 'Order',
      entityId: newOrder.id,
      previousValue: '-',
      newValue: `${newOrder.orderNumber} (R$ ${newOrder.total})`,
      ip: req.ip || '127.0.0.1',
      metadata: JSON.stringify({ offerId: offer.id, paymentId: newPayment.id }),
    });

    return res.status(201).json({
      order: newOrder,
      payment: newPayment,
      // Provide signed webhook helper in DEMO mode so user can trigger official gateway webhook from UI
      demoWebhookHelper: {
        externalReference: newPayment.externalReference,
        sampleApprovePayload: {
          webhookId: `wh_live_${Date.now()}`,
          externalReference: newPayment.externalReference,
          newStatus: 'APPROVED',
        },
      },
    });
  });

  // ============================================================================
  // 7. PAYMENTS & WEBHOOKS (Idempotency, Signature Validation, Reconciliation)
  // ============================================================================
  router.get('/payments', requireAuth, requireRole(['ADMIN']), (_req: AuthenticatedRequest, res: Response) => {
    return res.json({ payments: store.state.payments });
  });

  router.post('/payments', async (req: Request, res: Response) => {
    const { orderId, method, idempotencyKey } = req.body || {};
    if (!orderId || !idempotencyKey) {
      return res.status(400).json({ error: 'orderId e idempotencyKey são obrigatórios.' });
    }
    if (store.state.payments.some((p) => p.idempotencyKey === idempotencyKey)) {
      return res.status(409).json({ error: 'Pagamento duplicado bloqueado por idempotência.' });
    }
    const order = store.state.orders.find((o) => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const out = await paymentProvider.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      method: method || 'PIX',
      idempotencyKey,
      customerEmail: order.customerSnapshot.email,
    });

    const now = new Date().toISOString();
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: out.provider,
      externalReference: out.externalReference,
      idempotencyKey,
      method: method || 'PIX',
      amount: order.total,
      gatewayFee: out.gatewayFee,
      status: 'PENDING',
      pixQrCode: out.pixQrCode,
      webhookEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    store.state.payments.unshift(payment);
    store.save();
    return res.status(201).json({ payment });
  });

  // Official Gateway Webhook Endpoint
  router.post('/webhooks/payment', async (req: Request, res: Response) => {
    const rawPayload = JSON.stringify(req.body || {});
    const signature =
      (req.headers['x-webhook-signature'] as string | undefined) ||
      (req.body?.demoAutoSign ? signWebhookPayload(JSON.stringify({
        webhookId: req.body.webhookId,
        externalReference: req.body.externalReference,
        newStatus: req.body.newStatus,
      })) : undefined);

    const payloadToVerify = req.body?.demoAutoSign
      ? JSON.stringify({
          webhookId: req.body.webhookId,
          externalReference: req.body.externalReference,
          newStatus: req.body.newStatus,
        })
      : rawPayload;

    const validation = paymentProvider.validateWebhook(payloadToVerify, signature);
    if (!validation.valid || !validation.event) {
      return res.status(401).json({
        error: validation.reason || 'Webhook inválido.',
        code: 'INVALID_WEBHOOK_SIGNATURE',
      });
    }

    const { webhookId, externalReference, newStatus } = validation.event;

    // Check duplicate webhookId across all payments (Idempotency)
    const alreadyProcessed = store.state.payments.some((p) =>
      p.webhookEvents.some((we) => we.webhookId === webhookId)
    );
    if (alreadyProcessed) {
      return res.status(409).json({
        error: 'Evento de webhook duplicado já foi processado anteriormente.',
        code: 'DUPLICATE_WEBHOOK_EVENT',
      });
    }

    const payment = store.state.payments.find((p) => p.externalReference === externalReference);
    if (!payment) {
      return res.status(404).json({ error: 'Pagamento não localizado para a referência informada.' });
    }

    const order = store.state.orders.find((o) => o.id === payment.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Pedido associado não encontrado.' });
    }

    const prevPaymentStatus = payment.status;
    const prevFinancialStatus = order.financialStatus;
    const now = new Date().toISOString();

    payment.status = newStatus;
    payment.updatedAt = now;
    payment.webhookEvents.push({
      webhookId,
      statusFrom: prevPaymentStatus,
      statusTo: newStatus,
      processedAt: now,
      signatureValid: true,
    });

    // Map gateway PaymentStatus to Order FinancialStatus without corrupting OperationalStatus
    const statusMap: Record<PaymentStatus, FinancialStatus> = {
      CREATED: 'pending',
      PENDING: 'pending',
      APPROVED: 'approved',
      DECLINED: 'declined',
      EXPIRED: 'declined',
      REFUNDED: 'refunded',
      CHARGEBACK: 'chargeback',
    };

    order.financialStatus = statusMap[newStatus] || 'pending';
    if (newStatus === 'CHARGEBACK') {
      order.operationalStatus = 'exception';
      order.exceptionReason = 'chargeback';
    }
    order.consolidatedStatus = deriveConsolidatedOrderStatus(
      order.financialStatus,
      order.operationalStatus
    );
    order.updatedAt = now;

    order.timeline.push({
      id: `evt_${Date.now()}`,
      orderId: order.id,
      event:
        newStatus === 'APPROVED'
          ? 'PAGAMENTO APROVADO'
          : newStatus === 'DECLINED'
            ? 'PAGAMENTO RECUSADO'
            : `PAGAMENTO ${newStatus}`,
      actor: `Webhook Oficial (${payment.provider})`,
      timestamp: now,
      previousValue: prevFinancialStatus,
      newValue: order.financialStatus,
      note: `Evento de gateway #${webhookId} validado com assinatura HMAC.`,
    });

    // Update frozen commission status
    const commission = store.state.commissions.find((c) => c.orderId === order.id);
    if (commission) {
      if (newStatus === 'APPROVED') commission.status = 'APPROVED';
      if (newStatus === 'DECLINED' || newStatus === 'REFUNDED' || newStatus === 'CHARGEBACK') {
        commission.status = 'CANCELLED';
      }
    }

    if (newStatus === 'APPROVED') {
      await notificationProvider.sendWhatsApp(
        order.customerSnapshot.phone,
        `Pagamento do pedido ${order.orderNumber} confirmado! Seu produto entrou em separação.`
      );
    }

    store.appendAuditLog({
      userId: 'system_webhook',
      userName: payment.provider,
      userRole: 'SYSTEM',
      action: `PAGAMENTO_${newStatus}`,
      entity: 'Payment',
      entityId: payment.id,
      previousValue: prevPaymentStatus,
      newValue: newStatus,
      ip: req.ip || '127.0.0.1',
      metadata: JSON.stringify({ webhookId, orderId: order.id }),
    });

    return res.json({
      processed: true,
      payment,
      order,
    });
  });

  // Refund Endpoint
  router.post(
    '/payments/:id/refund',
    requireAuth,
    requireRole(['ADMIN']),
    async (req: AuthenticatedRequest, res: Response) => {
      const payment = store.state.payments.find((p) => p.id === req.params.id);
      if (!payment) return res.status(404).json({ error: 'Pagamento não encontrado.' });

      if (payment.status !== 'APPROVED') {
        return res.status(422).json({ error: 'Apenas pagamentos aprovados podem ser reembolsados.' });
      }

      const prevStatus = payment.status;
      await paymentProvider.refund(payment.externalReference, payment.amount);
      const now = new Date().toISOString();
      payment.status = 'REFUNDED';
      payment.updatedAt = now;

      const order = store.state.orders.find((o) => o.id === payment.orderId);
      if (order) {
        const prevFin = order.financialStatus;
        order.financialStatus = 'refunded';
        order.consolidatedStatus = deriveConsolidatedOrderStatus(
          order.financialStatus,
          order.operationalStatus
        );
        order.updatedAt = now;
        order.timeline.push({
          id: `evt_${Date.now()}`,
          orderId: order.id,
          event: 'REEMBOLSO EFETUADO',
          actor: req.user!.name,
          timestamp: now,
          previousValue: prevFin,
          newValue: 'refunded',
          note: req.body?.reason || 'Reembolso administrativo processado.',
        });
      }

      const commission = store.state.commissions.find((c) => c.orderId === payment.orderId);
      if (commission) {
        commission.status = 'CANCELLED';
      }

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'REEMBOLSO_EXECUTADO',
        entity: 'Payment',
        entityId: payment.id,
        previousValue: prevStatus,
        newValue: 'REFUNDED',
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ amount: payment.amount }),
      });

      return res.json({ payment, order });
    }
  );

  // ============================================================================
  // 8. ORDERS & FULFILLMENT (Decoupled Financial vs Operational Status)
  // ============================================================================
  router.get('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'VENDEDOR') {
      const sellerOrders = store.state.orders.filter((o) => o.sellerId === user.id);
      return res.json({ orders: sellerOrders });
    }
    return res.json({ orders: store.state.orders });
  });

  router.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const order = store.state.orders.find(
      (o) => o.id === req.params.id || o.orderNumber === req.params.id
    );
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

    // Horizontal access protection: VENDEDOR cannot access another seller's order
    if (user.role === 'VENDEDOR' && order.sellerId !== user.id) {
      store.appendAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'TENTATIVA_ACESSO_HORIZONTAL_BLOQUEADA',
        entity: 'Order',
        entityId: order.id,
        previousValue: user.id,
        newValue: String(order.sellerId),
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
      return res.status(403).json({
        error: 'Acesso negado (Proteção Horizontal): Este pedido pertence a outro vendedor.',
      });
    }

    return res.json({ order });
  });

  router.patch(
    '/orders/:id/status',
    requireAuth,
    requireRole(['ADMIN', 'FULFILLMENT']),
    async (req: AuthenticatedRequest, res: Response) => {
      const order = store.state.orders.find((o) => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

      const { operationalStatus, exceptionReason, note } = req.body || {};
      if (!operationalStatus) {
        return res.status(400).json({ error: 'operationalStatus é obrigatório.' });
      }

      // Block advancing operational fulfillment if order is not financially approved
      if (
        order.financialStatus !== 'approved' &&
        ['picking', 'packing', 'ready_to_ship', 'shipped', 'delivered'].includes(operationalStatus)
      ) {
        return res.status(422).json({
          error: `Operação bloqueada: Pedido com status financeiro "${order.financialStatus}" não pode avançar para "${operationalStatus}".`,
          code: 'UNPAID_ORDER_FULFILLMENT_BLOCKED',
        });
      }

      const prevOpStatus = order.operationalStatus;
      const now = new Date().toISOString();
      order.operationalStatus = operationalStatus as OperationalStatus;
      order.exceptionReason = (exceptionReason as ExceptionType) || null;
      order.consolidatedStatus = deriveConsolidatedOrderStatus(
        order.financialStatus,
        order.operationalStatus
      );
      order.updatedAt = now;

      // Generate shipment & tracking automatically when transitioning to ready_to_ship or shipped
      if (
        (operationalStatus === 'ready_to_ship' || operationalStatus === 'shipped') &&
        !order.trackingCode
      ) {
        const createdShipment = await shippingProvider.createShipment(
          order.orderNumber,
          order.customerSnapshot.cep,
          order.shippingService
        );
        order.trackingCode = createdShipment.trackingCode;

        const newShipment: Shipment = {
          id: `shp_${Date.now()}`,
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider: createdShipment.provider,
          serviceName: order.shippingService,
          price: order.shippingCost || order.shippingSubsidy,
          estimatedDays: createdShipment.estimatedDays,
          trackingCode: createdShipment.trackingCode,
          labelUrl: createdShipment.labelUrl,
          status: operationalStatus === 'shipped' ? 'IN_TRANSIT' : 'LABEL_GENERATED',
          events: [
            {
              status: operationalStatus === 'shipped' ? 'IN_TRANSIT' : 'LABEL_GENERATED',
              location: 'CD Leal Caps — Barueri/SP',
              description: `Status atualizado para ${operationalStatus}`,
              timestamp: now,
            },
          ],
          createdAt: now,
        };
        store.state.shipments.unshift(newShipment);
      }

      const eventLabels: Record<OperationalStatus, string> = {
        waiting: 'AGUARDANDO FILA',
        picking: 'SEPARAÇÃO',
        packing: 'EMBALAGEM',
        ready_to_ship: 'EXPEDIÇÃO / ETIQUETA EMITIDA',
        shipped: 'ENVIADO',
        delivered: 'ENTREGUE',
        returned: 'DEVOLUÇÃO LOGÍSTICA',
        exception: `EXCEÇÃO (${order.exceptionReason || 'operacional'})`,
      };

      order.timeline.push({
        id: `evt_${Date.now()}`,
        orderId: order.id,
        event: eventLabels[order.operationalStatus] || order.operationalStatus.toUpperCase(),
        actor: `${req.user!.name} (${req.user!.role})`,
        timestamp: now,
        previousValue: prevOpStatus,
        newValue: order.operationalStatus,
        note:
          note ||
          (order.trackingCode
            ? `Atualizado no WMS. Rastreio: ${order.trackingCode}`
            : 'Status operacional atualizado com sucesso.'),
      });

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'STATUS_OPERACIONAL_PEDIDO_ALTERADO',
        entity: 'Order',
        entityId: order.id,
        previousValue: prevOpStatus,
        newValue: order.operationalStatus,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ exceptionReason: order.exceptionReason, trackingCode: order.trackingCode }),
      });

      return res.json({ order });
    }
  );

  // ============================================================================
  // 9. CRM, LEADS, CUSTOMERS & COMMISSIONS
  // ============================================================================
  router.get('/crm/leads', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const leads =
      user.role === 'VENDEDOR'
        ? store.state.leads.filter((l) => l.sellerId === user.id)
        : store.state.leads;
    return res.json({ leads });
  });

  router.post(
    '/crm/leads',
    requireAuth,
    requireRole(['ADMIN', 'VENDEDOR']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const { name, contact, origin, campaignId, sellerId, offerPresentedId, note } = req.body || {};
      if (!name || !contact) {
        return res.status(400).json({ error: 'Nome e contato do lead são obrigatórios.' });
      }

      const now = new Date().toISOString();
      const newLead: Lead = {
        id: `ld_${Date.now()}`,
        name: String(name),
        contact: String(contact),
        origin: String(origin || 'Atendimento Consultivo WhatsApp'),
        campaignId: campaignId || 'cmp_01',
        sellerId: user.role === 'VENDEDOR' ? user.id : sellerId || 'usr_seller_01',
        stage: offerPresentedId ? 'OFERTA' : 'LEAD',
        offersPresented: offerPresentedId ? [String(offerPresentedId)] : [],
        offersPurchased: [],
        interactions: note
          ? [
              {
                id: `int_${Date.now()}`,
                timestamp: now,
                actor: user.name,
                note: String(note),
                offerId: offerPresentedId,
              },
            ]
          : [],
        createdAt: now,
        lastInteractionAt: now,
      };

      store.state.leads.unshift(newLead);
      store.save();
      return res.status(201).json({ lead: newLead });
    }
  );

  router.patch(
    '/crm/leads/:id',
    requireAuth,
    requireRole(['ADMIN', 'VENDEDOR']),
    (req: AuthenticatedRequest, res: Response) => {
      const user = req.user!;
      const lead = store.state.leads.find((l) => l.id === req.params.id);
      if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });

      if (user.role === 'VENDEDOR' && lead.sellerId !== user.id) {
        return res.status(403).json({ error: 'Acesso negado: Este lead está atribuído a outro vendedor.' });
      }

      const { stage, offerPresentedId, note } = req.body || {};
      const now = new Date().toISOString();
      if (stage) lead.stage = stage;
      if (offerPresentedId && !lead.offersPresented.includes(offerPresentedId)) {
        lead.offersPresented.push(offerPresentedId);
      }
      if (note) {
        lead.interactions.unshift({
          id: `int_${Date.now()}`,
          timestamp: now,
          actor: user.name,
          note: String(note),
          offerId: offerPresentedId,
        });
      }
      lead.lastInteractionAt = now;
      store.save();
      return res.json({ lead });
    }
  );

  router.get('/commissions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const commissions =
      user.role === 'VENDEDOR'
        ? store.state.commissions.filter((c) => c.sellerId === user.id)
        : store.state.commissions;
    return res.json({ commissions });
  });

  // ============================================================================
  // 10. COMPLIANCE GATE, UNIT ECONOMICS, ANALYTICS, PRIVACY & AUDIT LOGS
  // ============================================================================
  router.get('/compliance', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.json({ reviews: store.state.complianceReviews });
  });

  router.patch(
    '/compliance/:id',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const review = store.state.complianceReviews.find((r) => r.id === req.params.id);
      if (!review) return res.status(404).json({ error: 'Revisão de compliance não encontrada.' });

      const prevStatus = review.status;
      if (req.body.checklist) {
        review.checklist = { ...review.checklist, ...req.body.checklist };
      }
      if (req.body.status) {
        const allChecked = Object.values(review.checklist).every(Boolean);
        if (req.body.status === 'APPROVED' && !allChecked) {
          return res.status(422).json({
            error: 'Não é possível aprovar no Compliance Gate sem concluir 100% do checklist regulatório.',
          });
        }
        review.status = req.body.status as ComplianceState;
        review.approvedBy = req.body.status === 'APPROVED' ? req.user!.name : null;

        // Propagate to target Offer or Product
        if (review.targetType === 'OFERTA') {
          const offer = store.state.offers.find((o) => o.id === review.targetId);
          if (offer) offer.complianceStatus = review.status;
        } else if (review.targetType === 'PRODUTO') {
          const prod = store.state.products.find((p) => p.id === review.targetId);
          if (prod) prod.complianceStatus = review.status;
        }
      }
      if (req.body.notes !== undefined) review.notes = String(req.body.notes);
      review.updatedAt = new Date().toISOString();

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'COMPLIANCE_GATE_ATUALIZADO',
        entity: 'ComplianceReview',
        entityId: review.id,
        previousValue: prevStatus,
        newValue: review.status,
        ip: req.ip || '127.0.0.1',
        metadata: JSON.stringify({ targetId: review.targetId }),
      });

      return res.json({ review });
    }
  );

  router.get('/economics/config', requireAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.json({ config: store.state.unitEconomicsConfig });
  });

  router.patch(
    '/economics/config',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const prev = JSON.stringify(store.state.unitEconomicsConfig);
      Object.assign(store.state.unitEconomicsConfig, req.body);
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'REGRAS_ECONOMICAS_ALTERADAS',
        entity: 'UnitEconomicsConfig',
        entityId: 'global',
        previousValue: prev,
        newValue: JSON.stringify(store.state.unitEconomicsConfig),
        ip: req.ip || '127.0.0.1',
        metadata: 'Comissões e pedidos históricos permanecem congelados.',
      });
      return res.json({ config: store.state.unitEconomicsConfig });
    }
  );

  router.get('/analytics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const orders =
      user.role === 'VENDEDOR'
        ? store.state.orders.filter((o) => o.sellerId === user.id)
        : store.state.orders;

    const approvedOrders = orders.filter((o) => o.financialStatus === 'approved');
    const totalRevenue = Number(approvedOrders.reduce((acc, o) => acc + o.total, 0).toFixed(2));
    const avgTicket =
      approvedOrders.length > 0 ? Number((totalRevenue / approvedOrders.length).toFixed(2)) : 0;

    const totalClicks = store.state.offerLinks.reduce((acc, l) => acc + l.clicks, 0) || 575;
    const conversionRate = Number(((orders.length / Math.max(1, totalClicks)) * 100).toFixed(2));

    const funnel = {
      visitas: totalClicks,
      ofertas: Math.round(totalClicks * 0.68),
      checkouts: Math.round(totalClicks * 0.24),
      pagamentos: orders.length,
      pedidos: approvedOrders.length,
      entregas: orders.filter((o) => o.operationalStatus === 'delivered').length,
      recompras: store.state.leads.filter((l) => l.stage === 'RECOMPRA').length,
    };

    return res.json({
      kpis: {
        totalRevenue,
        totalOrders: orders.length,
        approvedOrdersCount: approvedOrders.length,
        avgTicket,
        conversionRate,
        cac: 36.4,
        roas: 4.85,
        ltv: 412.5,
        contributionMarginPercent: 34.2,
        refundRate: 1.2,
        chargebackRate: 0.3,
        slaHours: 14.5,
        pendingPayments: orders.filter((o) => o.financialStatus === 'pending').length,
        waitingFulfillment: orders.filter(
          (o) => o.financialStatus === 'approved' && o.operationalStatus === 'waiting'
        ).length,
        inPreparation: orders.filter((o) =>
          ['picking', 'packing', 'ready_to_ship'].includes(o.operationalStatus)
        ).length,
        shipped: orders.filter((o) => o.operationalStatus === 'shipped').length,
        delivered: orders.filter((o) => o.operationalStatus === 'delivered').length,
        exceptions: orders.filter((o) => o.operationalStatus === 'exception').length,
      },
      funnel,
      eventsCount: store.state.analyticsEvents.length,
    });
  });

  router.get(
    '/audit-logs',
    requireAuth,
    requireRole(['ADMIN']),
    (_req: AuthenticatedRequest, res: Response) => {
      return res.json({ auditLogs: store.state.auditLogs });
    }
  );

  // LGPD Privacy & Anonymization Endpoint
  router.post(
    '/privacy/anonymize/:customerId',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const customer = store.state.customers.find((c) => c.id === req.params.customerId);
      if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });

      const prevName = customer.name;
      customer.name = `TITULAR ANONIMIZADO #${customer.id.slice(-4)}`;
      customer.cpf = '***.***.***-**';
      customer.email = `anon_${customer.id}@privacidade.lealcaps.local`;
      customer.phone = '***********';
      customer.street = 'ENDEREÇO ANONIMIZADO LGPD';
      customer.anonymized = true;

      store.state.privacyRequests.unshift({
        id: `prv_${Date.now()}`,
        customerId: customer.id,
        customerName: prevName,
        requestType: 'ANONYMIZATION',
        purpose: req.body?.purpose || 'Solicitação do titular (Art. 18 LGPD)',
        status: 'COMPLETED',
        requestedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'DADOS_PESSOAIS_ANONIMIZADOS_LGPD',
        entity: 'Customer',
        entityId: customer.id,
        previousValue: prevName,
        newValue: customer.name,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });

      return res.json({ customer, privacyRequests: store.state.privacyRequests });
    }
  );

  // Create Campaign (Attribution Entity)
  router.post(
    '/campaigns',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const b = req.body || {};
      if (!b.name || !b.utmSource || !b.utmCampaign) {
        return res.status(400).json({ error: 'Nome, utmSource e utmCampaign são obrigatórios.' });
      }
      const newCampaign = {
        id: `cmp_${Date.now()}`,
        name: String(b.name),
        channel: String(b.channel || 'Paid Social'),
        origin: String(b.origin || 'Instagram / Meta'),
        media: String(b.media || 'Reels / VSL'),
        adName: String(b.adName || 'Ad_01'),
        creative: String(b.creative || 'CRIATIVO-01'),
        utmSource: String(b.utmSource),
        utmMedium: String(b.utmMedium || 'cpc'),
        utmCampaign: String(b.utmCampaign),
        utmContent: String(b.utmContent || 'v1'),
        responsibleSellerId: b.responsibleSellerId || null,
        estimatedCac: Number(b.estimatedCac || 35),
        adSpend: Number(b.adSpend || 0),
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
      };
      store.state.campaigns.unshift(newCampaign);
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'CAMPANHA_CRIADA',
        entity: 'Campaign',
        entityId: newCampaign.id,
        previousValue: '-',
        newValue: `${newCampaign.name} (${newCampaign.utmCampaign})`,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
      return res.status(201).json({ campaign: newCampaign });
    }
  );

  // Create User (Admin / Vendedor / Fulfillment)
  router.post(
    '/users',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const b = req.body || {};
      if (!b.name || !b.email || !b.role) {
        return res.status(400).json({ error: 'Nome, e-mail e papel são obrigatórios.' });
      }
      if (store.state.users.some((u) => u.email.toLowerCase() === String(b.email).toLowerCase())) {
        return res.status(409).json({ error: 'E-mail já cadastrado.' });
      }
      const newUser: User = {
        id: `usr_${Date.now()}`,
        name: String(b.name),
        email: String(b.email),
        passwordHash: String(b.password || 'Leal#2026'),
        role: b.role as RoleType,
        status: 'ACTIVE',
        sellerCode:
          b.role === 'VENDEDOR'
            ? String(b.sellerCode || `VEND-${String(b.name).split(' ')[0].toUpperCase()}`)
            : undefined,
        commissionRate: Number(b.commissionRate ?? 10),
        twoFactorEnabled: Boolean(b.twoFactorEnabled),
        createdAt: new Date().toISOString(),
      };
      store.state.users.push(newUser);
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'USUARIO_CRIADO',
        entity: 'User',
        entityId: newUser.id,
        previousValue: '-',
        newValue: `${newUser.email} (${newUser.role})`,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
      const { passwordHash: _ph, ...safe } = newUser;
      return res.status(201).json({ user: safe });
    }
  );

  // Toggle or Create Automation Rule
  router.patch(
    '/automations/:id',
    requireAuth,
    requireRole(['ADMIN']),
    (req: AuthenticatedRequest, res: Response) => {
      const rule = store.state.automationRules.find((r) => r.id === req.params.id);
      if (!rule) return res.status(404).json({ error: 'Regra não encontrada.' });
      const prev = rule.status;
      Object.assign(rule, req.body);
      store.appendAuditLog({
        userId: req.user!.id,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'AUTOMACAO_ATUALIZADA',
        entity: 'AutomationRule',
        entityId: rule.id,
        previousValue: prev,
        newValue: rule.status,
        ip: req.ip || '127.0.0.1',
        metadata: '{}',
      });
      return res.json({ rule });
    }
  );

  // Printable Shipping Label (Etiqueta Padrão Transportadora / Romaneio WMS)
  router.get('/shipments/label/:trackingCode', (req: Request, res: Response) => {
    const code = req.params.trackingCode.replace('.pdf', '');
    const order =
      store.state.orders.find((o) => o.trackingCode === code || o.id === code) ||
      store.state.orders[0];

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Etiqueta Logística ${code} — LEAL CAPS WMS</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f6; padding: 24px; color: #111; }
    .label { width: 420px; margin: 0 auto; background: #fff; border: 3px solid #000; padding: 18px; }
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .trk { font-family: monospace; font-size: 22px; font-weight: bold; text-align: center; margin: 14px 0; letter-spacing: 2px; }
    .bar { height: 54px; background: repeating-linear-gradient(90deg, #000 0 3px, #fff 3px 6px, #000 6px 8px, #fff 8px 12px); margin: 10px 0; }
    .sec { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-size: 12px; }
    .btn { display: block; width: 420px; margin: 14px auto; padding: 12px; background: #111; color: #bdf35d; font-weight: bold; text-align: center; cursor: pointer; border: 0; border-radius: 6px; }
    @media print { .btn { display: none; } body { background: #fff; padding: 0; } }
  </style>
</head>
<body>
  <button class="btn" onclick="window.print()">IMPRIMIR ETIQUETA / ROMANEIO DE EXPEDIÇÃO</button>
  <div class="label">
    <div class="hdr">
      <div><strong>LEAL CAPS FULFILLMENT CD</strong><br/><small>Barueri / SP • WMS Privado</small></div>
      <div style="text-align:right"><strong>${order.shippingService}</strong><br/><small>Pedido ${order.orderNumber}</small></div>
    </div>
    <div class="trk">${code}</div>
    <div class="bar"></div>
    <div class="sec">
      <strong>DESTINATÁRIO:</strong><br/>
      ${order.customerSnapshot.name}<br/>
      ${order.customerSnapshot.street}, ${order.customerSnapshot.number} ${order.customerSnapshot.complement || ''}<br/>
      ${order.customerSnapshot.neighborhood} — ${order.customerSnapshot.city} / ${order.customerSnapshot.state}<br/>
      <strong>CEP: ${order.customerSnapshot.cep}</strong>
    </div>
    <div class="sec">
      <strong>CONFERÊNCIA FÍSICA DE SEPARAÇÃO (PACKING LIST):</strong><br/>
      ${order.items.map((i) => `• ${i.quantity}x ${i.productName} (SKU: ${i.sku})`).join('<br/>')}
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  });

  // Full State Snapshot for Synchronized UI Views (Filtered by RBAC)
  router.get('/bootstrap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const isSeller = user.role === 'VENDEDOR';

    return res.json({
      user,
      products: store.state.products,
      offers: isSeller
        ? store.state.offers.filter(
            (o) =>
              (o.sellerId === null || o.sellerId === user.id) &&
              o.status === 'ACTIVE' &&
              o.complianceStatus === 'APPROVED'
          )
        : store.state.offers,
      offerLinks: isSeller
        ? store.state.offerLinks.filter((l) => l.sellerId === user.id)
        : store.state.offerLinks,
      campaigns: store.state.campaigns,
      coupons: isSeller
        ? store.state.coupons.filter(
            (c) => c.authorizedSellerId === null || c.authorizedSellerId === user.id
          )
        : store.state.coupons,
      couponUsages: store.state.couponUsages,
      customers: isSeller
        ? store.state.customers.filter((c) =>
            store.state.orders.some((o) => o.customerId === c.id && o.sellerId === user.id)
          )
        : store.state.customers,
      leads: isSeller
        ? store.state.leads.filter((l) => l.sellerId === user.id)
        : store.state.leads,
      orders: isSeller
        ? store.state.orders.filter((o) => o.sellerId === user.id)
        : store.state.orders,
      payments: isSeller ? [] : store.state.payments,
      shipments: store.state.shipments,
      commissions: isSeller
        ? store.state.commissions.filter((c) => c.sellerId === user.id)
        : store.state.commissions,
      automationRules: store.state.automationRules,
      complianceReviews: store.state.complianceReviews,
      unitEconomicsConfig: store.state.unitEconomicsConfig,
      auditLogs: user.role === 'ADMIN' ? store.state.auditLogs : [],
      users:
        user.role === 'ADMIN'
          ? store.state.users.map(({ passwordHash: _p, ...u }) => u)
          : [],
      privacyRequests: user.role === 'ADMIN' ? store.state.privacyRequests : [],
    });
  });

  // Mount router on both /api and / so both /api/products and /products work seamlessly
  app.use('/api', router);
  app.use('/', router);

  return { app, store };
}
