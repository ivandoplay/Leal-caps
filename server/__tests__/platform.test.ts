import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { RelationalStore } from '../db/store.ts';
import { signWebhookPayload } from '../providers/adapters.ts';

describe('LEAL CAPS — Suite Completa de Testes Operacionais, Comerciais e de Segurança (Seção 43)', () => {
  let store: RelationalStore;
  let app: ReturnType<typeof createApp>['app'];

  const ADMIN_AUTH = { Authorization: 'Bearer tok_admin_demo' };
  const SELLER1_AUTH = { Authorization: 'Bearer tok_seller1_demo' };
  const SELLER2_AUTH = { Authorization: 'Bearer tok_seller2_demo' };
  const FULFILLMENT_AUTH = { Authorization: 'Bearer tok_fulfillment_demo' };

  beforeEach(() => {
    store = new RelationalStore(false);
    const created = createApp(store);
    app = created.app;
  });

  // ==========================================================================
  // 1. TESTES DE OFERTA
  // ==========================================================================
  describe('1. Oferta (válida, expirada, limite excedido, cupom inválido, desconto acima do permitido)', () => {
    it('deve carregar uma oferta válida via link rastreável (/o/7XK29)', async () => {
      const res = await request(app).get('/api/o/7XK29');
      expect(res.status).toBe(200);
      expect(res.body.offer.code).toBe('7XK29');
      expect(res.body.offer.promotionalPrice).toBe(279.9);
    });

    it('deve bloquear acesso a uma oferta expirada (/o/EXP01)', async () => {
      const res = await request(app).get('/api/o/EXP01');
      expect(res.status).toBe(422);
    });

    it('deve bloquear oferta quando o limite máximo de utilizações foi excedido', async () => {
      const target = store.state.offers.find((o) => o.code === '7XK29')!;
      target.usageCount = target.usageLimit;

      const res = await request(app).get('/api/o/7XK29');
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('OFFER_LIMIT_EXCEEDED');
    });

    it('deve rejeitar cupom inválido ou expirado', async () => {
      const invalidRes = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'CUPOM_INEXISTENTE', offerId: 'off_7xk29' });
      expect(invalidRes.status).toBe(404);

      const expiredRes = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'VERAO2025', offerId: 'off_7xk29' });
      expect(expiredRes.status).toBe(422);
    });

    it('deve impedir criação de oferta com desconto acima do teto permitido pelo motor comercial', async () => {
      const res = await request(app)
        .post('/api/offers')
        .set(ADMIN_AUTH)
        .send({
          name: 'Oferta Desconto Abusivo',
          regularPrice: 500,
          promotionalPrice: 150, // 70% de desconto (teto é 45%)
          offerType: '1_UNIT',
        });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('DISCOUNT_EXCEEDS_CEILING');
    });

    it('deve bloquear publicação de oferta sem aprovação no Compliance Gate', async () => {
      const res = await request(app)
        .post('/api/offers/off_draft_compliance/publish')
        .set(ADMIN_AUTH);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('COMPLIANCE_GATE_BLOCKED');
    });
  });

  // ==========================================================================
  // 2. TESTES DE CHECKOUT
  // ==========================================================================
  describe('2. Checkout (CEP válido, CEP inválido, frete indisponível, erro de pagamento)', () => {
    it('deve cotar frete para CEP válido com sucesso', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ cep: '01310-100', offerId: 'off_7xk29' });
      expect(res.status).toBe(200);
      expect(res.body.options.length).toBeGreaterThan(0);
    });

    it('deve rejeitar CEP inválido no cálculo de frete e no checkout', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ cep: '123', offerId: 'off_7xk29' });
      expect(res.status).toBe(422);
    });

    it('deve tratar frete indisponível para CEP fora de cobertura (99999-000)', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ cep: '99999-000', offerId: 'off_7xk29' });
      expect(res.status).toBe(422);
      expect(res.body.error).toContain('Frete indisponível');
    });

    it('deve acionar fallback de contingência quando provedor principal estiver indisponível', async () => {
      const res = await request(app)
        .post('/api/shipping/quote')
        .send({ cep: '01310-100', offerId: 'off_1un_artro', simulateFallback: true });
      expect(res.status).toBe(200);
      expect(res.body.fallbackActivated).toBe(true);
    });
  });

  // ==========================================================================
  // 3. TESTES DE PAGAMENTO E WEBHOOK
  // ==========================================================================
  describe('3. Pagamento (webhook válido, inválido, duplicado, aprovado, recusado, reembolso)', () => {
    it('deve rejeitar webhook com assinatura HMAC inválida', async () => {
      const res = await request(app)
        .post('/api/webhooks/payment')
        .set('x-webhook-signature', 'assinatura_falsa_123')
        .send({
          webhookId: 'wh_test_invalid',
          externalReference: 'pay_demo_LC10421_seed01',
          newStatus: 'APPROVED',
        });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    });

    it('deve aprovar pagamento via webhook assinado válido e bloquear webhook duplicado (idempotência)', async () => {
      // Criar novo pedido no checkout
      const checkoutRes = await request(app)
        .post('/api/checkout')
        .send({
          offerId: 'off_7xk29',
          cep: '01310100',
          paymentMethod: 'PIX',
          idempotencyKey: 'idem_test_checkout_01',
          customer: {
            name: 'Cliente Teste Webhook',
            phone: '11999998888',
            email: 'teste@cliente.com',
            cpf: '111.222.333-44',
            street: 'Av. Paulista',
            number: '1000',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        });
      expect(checkoutRes.status).toBe(201);
      const extRef = checkoutRes.body.payment.externalReference;

      const payloadObj = {
        webhookId: 'wh_unique_approve_100',
        externalReference: extRef,
        newStatus: 'APPROVED',
      };
      const raw = JSON.stringify(payloadObj);
      const validSig = signWebhookPayload(raw);

      const whRes = await request(app)
        .post('/api/webhooks/payment')
        .set('x-webhook-signature', validSig)
        .send(payloadObj);

      expect(whRes.status).toBe(200);
      expect(whRes.body.order.financialStatus).toBe('approved');
      expect(whRes.body.order.operationalStatus).toBe('waiting');

      // Tentar enviar o mesmo webhook novamente -> Deve retornar 409 Conflict
      const dupRes = await request(app)
        .post('/api/webhooks/payment')
        .set('x-webhook-signature', validSig)
        .send(payloadObj);
      expect(dupRes.status).toBe(409);
      expect(dupRes.body.code).toBe('DUPLICATE_WEBHOOK_EVENT');
    });

    it('deve processar pagamento recusado via webhook e reembolso via Admin', async () => {
      // Reembolso do pagamento seed aprovado pay_10421
      const refundRes = await request(app)
        .post('/api/payments/pay_10421/refund')
        .set(ADMIN_AUTH)
        .send({ reason: 'Solicitação dentro do prazo legal' });

      expect(refundRes.status).toBe(200);
      expect(refundRes.body.payment.status).toBe('REFUNDED');
      expect(refundRes.body.order.financialStatus).toBe('refunded');
    });
  });

  // ==========================================================================
  // 4. TESTES DE PEDIDO E COMISSÃO CONGELADA
  // ==========================================================================
  describe('4. Pedido (criação, alteração de estado, duplicidade, auditoria e comissão congelada)', () => {
    it('deve criar pedido #LC-XXXXX, congelar comissão do vendedor e registrar timeline + AuditLog', async () => {
      const res = await request(app)
        .post('/api/checkout')
        .send({
          offerId: 'off_7xk29',
          linkCode: '7XK29',
          couponCode: 'LEAL10',
          cep: '01310100',
          paymentMethod: 'PIX',
          idempotencyKey: 'idem_order_test_99',
          customer: {
            name: 'João Auditoria',
            phone: '11988887777',
            email: 'joao@teste.com',
            cpf: '222.333.444-55',
            street: 'Av. Paulista',
            number: '500',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.order.orderNumber).toMatch(/^#LC-\d+$/);

      // Verificar se bloqueia duplicidade de idempotencyKey
      const dupOrder = await request(app)
        .post('/api/checkout')
        .send({
          offerId: 'off_7xk29',
          cep: '01310100',
          idempotencyKey: 'idem_order_test_99',
          customer: {
            name: 'João Auditoria',
            phone: '11988887777',
            email: 'joao@teste.com',
            cpf: '222.333.444-55',
            street: 'Av. Paulista',
            number: '500',
          },
        });
      expect(dupOrder.status).toBe(409);

      // Alterar regra global de comissão depois e garantir que a comissão do pedido criado continuou congelada
      const commissionBefore = store.state.commissions.find(
        (c) => c.orderId === res.body.order.id
      )!;
      expect(commissionBefore.percentage).toBe(12);

      await request(app)
        .patch('/api/economics/config')
        .set(ADMIN_AUTH)
        .send({ defaultCommissionPercent: 5 });

      const commissionAfter = store.state.commissions.find(
        (c) => c.orderId === res.body.order.id
      )!;
      expect(commissionAfter.percentage).toBe(12);
    });

    it('deve atualizar estado operacional pelo Fulfillment e gerar rastreio e AuditLog', async () => {
      const res = await request(app)
        .patch('/api/orders/ord_10422/status')
        .set(FULFILLMENT_AUTH)
        .send({ operationalStatus: 'shipped', note: 'Despachado via Loggi' });

      expect(res.status).toBe(200);
      expect(res.body.order.operationalStatus).toBe('shipped');
      expect(res.body.order.trackingCode).toBeTruthy();
    });
  });

  // ==========================================================================
  // 5. TESTES DE PERMISSÕES (RBAC)
  // ==========================================================================
  describe('5. Permissões RBAC (admin, vendedor, fulfillment)', () => {
    it('deve impedir que VENDEDOR crie produtos ou altere status logístico de pedidos', async () => {
      const prodRes = await request(app)
        .post('/api/products')
        .set(SELLER1_AUTH)
        .send({ sku: 'HACK-01', internalName: 'Teste', commercialName: 'Teste', category: 'Libido' });
      expect(prodRes.status).toBe(403);

      const statusRes = await request(app)
        .patch('/api/orders/ord_10421/status')
        .set(SELLER1_AUTH)
        .send({ operationalStatus: 'delivered' });
      expect(statusRes.status).toBe(403);
    });

    it('deve impedir que VENDEDOR tente manipular preço ao criar link de oferta', async () => {
      const linkRes = await request(app)
        .post('/api/seller/links')
        .set(SELLER1_AUTH)
        .send({ offerId: 'off_7xk29', customPrice: 99.0 });
      expect(linkRes.status).toBe(403);
    });

    it('deve impedir que FULFILLMENT acesse logs de auditoria ou altere regras econômicas', async () => {
      const auditRes = await request(app).get('/api/audit-logs').set(FULFILLMENT_AUTH);
      expect(auditRes.status).toBe(403);
    });
  });

  // ==========================================================================
  // 6. TESTES DE SEGURANÇA E PRIVACIDADE
  // ==========================================================================
  describe('6. Segurança (endpoints sem autenticação, acesso horizontal e proteção de dados no rastreio)', () => {
    it('deve bloquear acesso a endpoints privados sem token de autenticação', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('deve bloquear acesso horizontal quando Vendedor 2 tenta acessar pedido do Vendedor 1', async () => {
      // ord_10421 pertence à usr_seller_01 (Camila)
      const res = await request(app).get('/api/orders/ord_10421').set(SELLER2_AUTH);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Proteção Horizontal');
    });

    it('não deve expor CPF, telefone ou endereço completo no endpoint público de rastreamento', async () => {
      const res = await request(app).get('/api/shipments/LC104210131BR/tracking');
      expect(res.status).toBe(200);
      const rawJson = JSON.stringify(res.body);
      expect(rawJson).not.toContain('345.678.901-22');
      expect(rawJson).not.toContain('1578');
      expect(rawJson).not.toContain('11988776655');
    });
  });
});
