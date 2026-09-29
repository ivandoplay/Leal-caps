import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  FileCheck2,
  Link2,
  Lock,
  MapPin,
  Package,
  QrCode,
  Search,
  ShieldCheck,
  Tag,
  Truck,
} from 'lucide-react';
import { Badge, Button, Card, ErrorState, Input, LoadingState, StatusBadge } from './ui/DesignSystem.tsx';
import { Offer, Order, Payment, Product } from '../types/domain.ts';

interface PublicOfferPayload {
  offer: Offer;
  products: Product[];
  campaign: { id: string; name: string; utmSource: string; utmCampaign: string } | null;
  seller: { id: string; name: string; sellerCode?: string } | null;
}

interface ShippingOption {
  serviceCode: string;
  serviceName: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  isFallback?: boolean;
}

interface TrackingResponse {
  orderNumber: string;
  consolidatedStatus: string;
  financialStatus: string;
  operationalStatus: string;
  shippingService: string;
  estimatedDeliveryDays: number;
  trackingCode: string | null;
  destinationSummary: string;
  recipientFirstName: string;
  itemsSummary: { productName: string; quantity: number }[];
  events: { status: string; location: string; description: string; timestamp: string }[];
  timeline: { event: string; timestamp: string; note: string }[];
}

export const PublicCustomerArea: React.FC<{
  initialOfferCode?: string;
  availableLinks?: { code: string; name: string }[];
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOrderCreatedOrUpdated: () => void;
}> = ({ initialOfferCode = '7XK29', availableLinks = [], onNotify, onOrderCreatedOrUpdated }) => {
  const [mode, setMode] = useState<'OFFER_CHECKOUT' | 'SUCCESS' | 'TRACKING'>('OFFER_CHECKOUT');
  const [offerCode, setOfferCode] = useState(initialOfferCode);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerData, setOfferData] = useState<PublicOfferPayload | null>(null);
  const [imgError, setImgError] = useState(false);

  // Checkout Flow State
  const [cep, setCep] = useState('01310-100');
  const [quotingShipping, setQuotingShipping] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [fallbackActivated, setFallbackActivated] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Created Order & Payment Confirmation
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Public Tracking State
  const [trackingQuery, setTrackingQuery] = useState('#LC-10421');
  const [trackingResult, setTrackingResult] = useState<TrackingResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    setOfferCode(initialOfferCode);
  }, [initialOfferCode]);

  const loadOfferByCode = async (codeToLoad: string) => {
    setLoadingOffer(true);
    setOfferError(null);
    setAppliedCoupon(null);
    setImgError(false);
    try {
      const res = await fetch(`/api/o/${codeToLoad}`);
      const data = await res.json();
      if (!res.ok) {
        setOfferData(null);
        setOfferError(data.error || 'Oferta indisponível.');
      } else {
        setOfferData(data);
        if (data.offer?.defaultCouponCode) {
          setCouponInput(data.offer.defaultCouponCode);
        } else {
          setCouponInput('');
        }
        try {
          window.history.replaceState({}, '', `/o/${codeToLoad}`);
        } catch {
          // ignore inside restricted iframe if blocked
        }
        await handleQuoteShipping(cep, data.offer.id);
      }
    } catch {
      setOfferError('Falha ao comunicar com o servidor de ofertas.');
    } finally {
      setLoadingOffer(false);
    }
  };

  useEffect(() => {
    loadOfferByCode(offerCode);
  }, [offerCode]);

  const handleQuoteShipping = async (cepValue: string, targetOfferId?: string) => {
    const idToUse = targetOfferId || offerData?.offer.id;
    if (!idToUse) return;
    setQuotingShipping(true);
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cepValue,
          offerId: idToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShippingOptions([]);
        setSelectedShipping(null);
        onNotify(data.error || 'CEP inválido ou fora de área de cobertura.', 'error');
      } else {
        setShippingOptions(data.options || []);
        setSelectedShipping(data.options?.[0] || null);
        setFallbackActivated(Boolean(data.fallbackActivated));
        setCustomer((prev) => ({
          ...prev,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }
    } finally {
      setQuotingShipping(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!offerData) return;
    if (!couponInput.trim()) {
      setAppliedCoupon(null);
      return;
    }
    setValidatingCoupon(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput,
          offerId: offerData.offer.id,
          customerCpf: customer.cpf || undefined,
          sellerId: offerData.seller?.id,
          campaignId: offerData.campaign?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        onNotify(data.error || 'Cupom inválido.', 'error');
      } else {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
        });
        onNotify(
          `Cupom ${data.coupon.code} aplicado (-R$ ${data.discountAmount.toFixed(2)})!`,
          'success'
        );
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCompleteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerData) return;
    if (!selectedShipping) {
      onNotify('Calcule e selecione uma opção de frete antes de continuar.', 'error');
      return;
    }
    setSubmittingCheckout(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offerData.offer.id,
          linkCode: offerCode,
          couponCode: appliedCoupon?.code || undefined,
          cep,
          shippingServiceCode: selectedShipping.serviceCode,
          paymentMethod,
          customer: { ...customer, cep },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Não foi possível concluir o pedido.', 'error');
      } else {
        setCreatedOrder(data.order);
        setCreatedPayment(data.payment);
        setMode('SUCCESS');
        onOrderCreatedOrUpdated();
        onNotify(
          `Pedido ${data.order.orderNumber} gerado! Aguardando confirmação do pagamento.`,
          'success'
        );
      }
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleConfirmPaymentWebhook = async () => {
    if (!createdPayment) return;
    setConfirmingPayment(true);
    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookId: `wh_${Date.now()}`,
          externalReference: createdPayment.externalReference,
          newStatus: 'APPROVED',
          demoAutoSign: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Erro ao confirmar pagamento.', 'error');
      } else {
        setCreatedOrder(data.order);
        setCreatedPayment(data.payment);
        onOrderCreatedOrUpdated();
        onNotify(
          `Pagamento confirmado! Pedido ${data.order.orderNumber} liberado para expedição.`,
          'success'
        );
      }
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleSearchTracking = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    setTrackingError(null);
    const q = (codeOverride || trackingQuery).trim();
    try {
      const clean = encodeURIComponent(q);
      const res = await fetch(`/api/shipments/${clean}/tracking`);
      const data = await res.json();
      if (!res.ok) {
        setTrackingResult(null);
        setTrackingError(data.error || 'Pedido não encontrado.');
      } else {
        setTrackingResult(data);
      }
    } catch {
      setTrackingError('Erro ao consultar rastreamento.');
    }
  };

  const cleanText = (txt: string) => txt.replace(/\s*\[DEMO\]/g, '');

  const subtotal = offerData?.offer.promotionalPrice || 0;
  const discount = appliedCoupon?.discountAmount || 0;
  const shippingPrice = offerData?.offer.freeShipping ? 0 : selectedShipping?.price || 0;
  const finalTotal = Math.max(0, subtotal - discount + shippingPrice);
  const fullPublicUrl = `${window.location.origin}/o/${offerCode}`;

  const linkButtons =
    availableLinks.length > 0
      ? availableLinks
      : [
          { code: '7XK29', name: 'Kit 2x LipoTherm' },
          { code: '9MP44', name: 'Kit 3x LipoTherm' },
          { code: 'CMB88', name: 'Combo Sinergia' },
          { code: 'ART10', name: '1 Un ArtroFlex' },
        ];

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 px-4 lg:px-8">
      {/* Barra de Navegação de Links Ativos & Rastreio */}
      <div className="max-w-5xl mx-auto mb-6 modern-card rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[var(--text-secondary)] font-medium">Link Direto:</span>
          <code className="bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] text-indigo-600 dark:text-indigo-400 font-mono">
            {fullPublicUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(fullPublicUrl);
              onNotify(`Link copiado: ${fullPublicUrl}`, 'success');
            }}
            className="p-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-indigo-500/10 text-[var(--text-primary)] cursor-pointer transition-colors"
            title="Copiar URL do Checkout"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {linkButtons.slice(0, 6).map((item) => (
            <button
              key={item.code}
              onClick={() => {
                setMode('OFFER_CHECKOUT');
                setOfferCode(item.code);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border transition-all whitespace-nowrap ${
                offerCode === item.code && mode === 'OFFER_CHECKOUT'
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              /o/{item.code}
            </button>
          ))}
          <Button
            variant={mode === 'TRACKING' ? 'cyan' : 'secondary'}
            size="xs"
            icon={<Truck className="w-3.5 h-3.5" />}
            onClick={() => {
              setMode('TRACKING');
              handleSearchTracking(undefined, trackingQuery);
            }}
          >
            Rastrear Pedido
          </Button>
        </div>
      </div>

      {/* MODE: RASTREAMENTO DE PEDIDO */}
      {mode === 'TRACKING' && (
        <div className="max-w-2xl mx-auto space-y-5">
          <Card
            title="Rastreamento de Pedido Leal Caps"
            subtitle="Informe o número do seu pedido (#LC-XXXXX) ou código da transportadora para acompanhar a entrega em tempo real."
          >
            <form onSubmit={(e) => handleSearchTracking(e)} className="flex gap-2 mb-4">
              <Input
                value={trackingQuery}
                onChange={(e) => setTrackingQuery(e.target.value)}
                placeholder="Ex: #LC-10421 ou código de rastreio"
              />
              <Button type="submit" icon={<Search className="w-4 h-4" />}>
                Consultar
              </Button>
            </form>

            {trackingError && <ErrorState message={trackingError} />}

            {trackingResult && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-subtle)]">
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">Número do Pedido</div>
                    <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {trackingResult.orderNumber}
                    </div>
                  </div>
                  <StatusBadge status={trackingResult.consolidatedStatus} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-subtle)]/50 p-4 rounded-xl border border-[var(--border-subtle)]">
                  <div>
                    <span className="text-[var(--text-muted)] block">Destinatário</span>
                    <strong className="text-[var(--text-primary)]">{trackingResult.recipientFirstName}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Destino</span>
                    <strong className="text-[var(--text-primary)]">{trackingResult.destinationSummary}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Modalidade de Envio</span>
                    <strong className="text-[var(--text-primary)]">{cleanText(trackingResult.shippingService)}</strong>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block">Código de Rastreio</span>
                    <strong className="text-sky-600 dark:text-sky-400 font-mono">
                      {trackingResult.trackingCode || 'Em preparação no CD'}
                    </strong>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2.5">
                    Histórico de Movimentação
                  </h4>
                  <div className="space-y-2">
                    {trackingResult.timeline.map((t, i) => (
                      <div
                        key={i}
                        className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-3.5 text-xs"
                      >
                        <div className="flex justify-between font-mono">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{t.event}</span>
                          <span className="text-[var(--text-muted)] tabular-nums">
                            {new Date(t.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] mt-1">{cleanText(t.note)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODE: CONFIRMAÇÃO DE PEDIDO & PAGAMENTO PIX/CARTÃO */}
      {mode === 'SUCCESS' && createdOrder && createdPayment && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="modern-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <Badge tone={createdOrder.financialStatus === 'approved' ? 'emerald' : 'lime'}>
                {createdOrder.financialStatus === 'approved'
                  ? 'PAGAMENTO APROVADO'
                  : 'AGUARDANDO PAGAMENTO'}
              </Badge>
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {createdOrder.orderNumber}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold font-display text-[var(--text-primary)]">
                {createdOrder.financialStatus === 'approved'
                  ? 'Seu pedido foi confirmado e já está em separação!'
                  : 'Finalize seu pagamento para liberação imediata'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                {createdOrder.financialStatus === 'approved'
                  ? 'Você receberá o código de rastreamento no seu WhatsApp e e-mail assim que o pacote for despachado.'
                  : 'Assim que o pagamento é compensado pelo banco, seu pedido entra automaticamente na fila de expedição do Centro de Distribuição.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[var(--bg-subtle)]/60 p-4 rounded-xl border border-[var(--border-subtle)] text-xs">
              <div>
                <span className="text-[var(--text-muted)] block">Status do Pagamento</span>
                <div className="mt-1">
                  <StatusBadge status={createdOrder.financialStatus} />
                </div>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Status da Entrega</span>
                <div className="mt-1">
                  <StatusBadge status={createdOrder.consolidatedStatus} />
                </div>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Valor Total</span>
                <strong className="text-base font-mono text-[var(--text-primary)] tabular-nums">
                  R$ {createdOrder.total.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block">Consultor Responsável</span>
                <strong className="text-[var(--text-primary)]">{createdOrder.sellerName}</strong>
              </div>
            </div>

            {createdPayment.pixQrCode && createdOrder.financialStatus === 'pending' && (
              <div className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <QrCode className="w-4 h-4" />
                    <span>PIX Copia e Cola Oficial</span>
                  </div>
                  <Badge tone="cyan">EXPIRA EM 30 MIN</Badge>
                </div>
                <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] break-all select-all">
                  {createdPayment.pixQrCode}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Copy className="w-3.5 h-3.5" />}
                    onClick={() => {
                      navigator.clipboard?.writeText(createdPayment.pixQrCode || '');
                      onNotify('Código PIX Copia e Cola copiado para a área de transferência!', 'success');
                    }}
                  >
                    Copiar Código PIX
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={confirmingPayment}
                    onClick={handleConfirmPaymentWebhook}
                  >
                    Já realizei o pagamento (Confirmar Recebimento)
                  </Button>
                </div>
              </div>
            )}

            {createdOrder.financialStatus === 'pending' && !createdPayment.pixQrCode && (
              <Button
                variant="primary"
                size="md"
                loading={confirmingPayment}
                onClick={handleConfirmPaymentWebhook}
                className="w-full"
              >
                Confirmar Processamento do Pagamento
              </Button>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" size="sm" onClick={() => setMode('OFFER_CHECKOUT')}>
                ← Voltar para a Oferta
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Truck className="w-4 h-4" />}
                onClick={() => {
                  setTrackingQuery(createdOrder.orderNumber);
                  setMode('TRACKING');
                  handleSearchTracking(undefined, createdOrder.orderNumber);
                }}
              >
                Acompanhar Entrega ({createdOrder.orderNumber})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODE: CHECKOUT MODERNO 2 COLUNAS (DESKTOP) / STACKED (MOBILE) */}
      {mode === 'OFFER_CHECKOUT' && (
        <div className="max-w-5xl mx-auto">
          {loadingOffer && <LoadingState message="Carregando condição comercial..." />}

          {!loadingOffer && offerError && (
            <ErrorState
              message={offerError}
              onRetry={() => loadOfferByCode('7XK29')}
            />
          )}

          {!loadingOffer && offerData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: PRODUCT SHOWCASE & REGULATORY CLAIMS */}
              <div className="lg:col-span-5 space-y-5">
                <div className="modern-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Oferta Oficial Verificada
                      </span>
                    </div>
                    <Badge tone="lime">/o/{offerData.offer.code}</Badge>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Studio Product Image with Resilient Fallback */}
                    <div className="relative rounded-2xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)] aspect-square max-h-64 w-full flex items-center justify-center">
                      {!imgError && offerData.products[0]?.images[0]?.url ? (
                        <img
                          src={offerData.products[0].images[0].url}
                          alt={cleanText(offerData.offer.name)}
                          referrerPolicy="no-referrer"
                          onError={() => setImgError(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-indigo-500/10 to-sky-500/10 w-full h-full">
                          <Package className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mb-2" />
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {cleanText(offerData.offer.name)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {offerData.offer.totalUnits}{' '}
                          {offerData.offer.totalUnits === 1 ? 'Frasco (100 cápsulas)' : 'Frascos (100 cápsulas cada)'}
                        </span>
                        {offerData.offer.freeShipping && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Frete Grátis Incluso
                            </span>
                          </>
                        )}
                      </div>
                      <h1 className="text-xl font-extrabold font-display text-[var(--text-primary)] leading-snug">
                        {cleanText(offerData.offer.name)}
                      </h1>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {offerData.products
                          .map((p) => `${cleanText(p.commercialName)} (${p.presentation})`)
                          .join(' + ')}
                      </p>
                    </div>

                    {/* Price Summary Box */}
                    <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[var(--text-muted)] line-through font-mono">
                          De R$ {offerData.offer.regularPrice.toFixed(2)}
                        </span>
                        <div className="text-2xl font-extrabold font-display text-indigo-600 dark:text-indigo-400 tabular-nums">
                          R$ {offerData.offer.promotionalPrice.toFixed(2)}
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          Economia imediata de {offerData.offer.discountPercent}%
                        </span>
                      </div>
                      <div className="text-right font-mono text-xs text-[var(--text-secondary)]">
                        <div>Disponibilidade</div>
                        <strong className="text-[var(--text-primary)]">
                          {offerData.offer.usageLimit - offerData.offer.usageCount} kits
                        </strong>
                      </div>
                    </div>

                    {/* Approved Regulatory Claims (ANVISA IN 28/2018) */}
                    <div className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Alegações Nutricionais Autorizadas
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          ANVISA IN 28/2018
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {offerData.products
                          .flatMap((p) => p.approvedClaims)
                          .map((c) => (
                            <li key={c.id} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{c.claimText}</span>
                            </li>
                          ))}
                      </ul>
                      <p className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)] leading-relaxed">
                        {offerData.products[0]?.warnings}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: INTERACTIVE CHECKOUT FORM */}
              <div className="lg:col-span-7">
                <div className="modern-card rounded-2xl p-6">
                  <form onSubmit={handleCompleteCheckout} className="space-y-6">
                    {/* STEP 1: CEP & SHIPPING QUOTE */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                          1
                        </span>
                        <span>Cálculo de Frete e Prazo por CEP</span>
                      </h3>

                      <div className="flex gap-2">
                        <Input
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          placeholder="Digite seu CEP (ex: 01310-100)"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          loading={quotingShipping}
                          onClick={() => handleQuoteShipping(cep, offerData.offer.id)}
                        >
                          Calcular Frete
                        </Button>
                      </div>

                      {fallbackActivated && (
                        <div className="text-xs bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 px-3.5 py-2 rounded-xl">
                          Cotação realizada pela tabela nacional contingencial dos Correios.
                        </div>
                      )}

                      {shippingOptions.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {shippingOptions.map((opt) => {
                            const isSelected = selectedShipping?.serviceCode === opt.serviceCode;
                            const displayPrice = offerData.offer.freeShipping ? 0 : opt.price;
                            return (
                              <div
                                key={opt.serviceCode}
                                onClick={() => setSelectedShipping(opt)}
                                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-indigo-500/10 border-indigo-500'
                                    : 'bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)] hover:border-indigo-500/40'
                                }`}
                              >
                                <div>
                                  <div className="text-xs font-bold text-[var(--text-primary)]">
                                    {cleanText(opt.serviceName)}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-secondary)]">
                                    Até {opt.estimatedDays} dias úteis
                                  </div>
                                </div>
                                <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                  {displayPrice === 0 ? 'GRÁTIS' : `R$ ${displayPrice.toFixed(2)}`}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* STEP 2: COUPON */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                          2
                        </span>
                        <span>Cupom Promocional</span>
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Possui cupom? (Ex: LEAL10 ou JEFFERSON20)"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          loading={validatingCoupon}
                          onClick={handleValidateCoupon}
                        >
                          Aplicar Cupom
                        </Button>
                      </div>
                    </div>

                    {/* STEP 3: DADOS DO CLIENTE */}
                    <div className="space-y-3.5 pt-4 border-t border-[var(--border-subtle)]">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                          3
                        </span>
                        <span>Dados de Entrega e Nota Fiscal</span>
                      </h3>
                      <Input
                        label="Nome Completo"
                        placeholder="Digite seu nome completo"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        required
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="WhatsApp com DDD"
                          placeholder="(11) 99999-9999"
                          value={customer.phone}
                          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          required
                        />
                        <Input
                          label="CPF"
                          placeholder="000.000.000-00"
                          value={customer.cpf}
                          onChange={(e) => setCustomer({ ...customer, cpf: e.target.value })}
                          required
                        />
                      </div>
                      <Input
                        label="E-mail"
                        type="email"
                        placeholder="seuemail@dominio.com.br"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        required
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Input
                            label="Rua / Avenida"
                            placeholder="Preenchido automaticamente pelo CEP"
                            value={customer.street}
                            onChange={(e) => setCustomer({ ...customer, street: e.target.value })}
                            required
                          />
                        </div>
                        <Input
                          label="Número"
                          placeholder="Nº"
                          value={customer.number}
                          onChange={(e) => setCustomer({ ...customer, number: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          label="Complemento"
                          placeholder="Apto, Bloco..."
                          value={customer.complement}
                          onChange={(e) => setCustomer({ ...customer, complement: e.target.value })}
                        />
                        <Input
                          label="Cidade"
                          value={customer.city}
                          onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                          required
                        />
                        <Input
                          label="UF"
                          value={customer.state}
                          onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* STEP 4: PAYMENT METHOD */}
                    <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                          4
                        </span>
                        <span>Forma de Pagamento</span>
                      </h3>
                      <div className="grid grid-cols-3 gap-2.5">
                        {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-all whitespace-nowrap ${
                              paymentMethod === m
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-[var(--bg-subtle)]/60 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {m === 'PIX' ? 'PIX Imediato' : m === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ORDER SUMMARY BOX */}
                    <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Subtotal ({offerData.offer.totalUnits} frascos):</span>
                        <span className="font-mono tabular-nums">R$ {subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                          <span>Desconto Cupom ({appliedCoupon?.code}):</span>
                          <span className="font-mono tabular-nums">- R$ {discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Frete ({cleanText(selectedShipping?.serviceName || 'Correios')}):</span>
                        <span className="font-mono tabular-nums">
                          {shippingPrice === 0 ? 'GRÁTIS' : `R$ ${shippingPrice.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center text-base font-bold text-[var(--text-primary)]">
                        <span>Total a Pagar</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 text-lg tabular-nums">
                          R$ {finalTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      loading={submittingCheckout}
                      className="w-full"
                      icon={<ArrowRight className="w-5 h-5" />}
                    >
                      Finalizar Pedido Seguro · R$ {finalTotal.toFixed(2)}
                    </Button>

                    {offerData.seller && (
                      <div className="text-center text-xs text-[var(--text-muted)]">
                        Atendimento vinculado a {offerData.seller.name} ({offerData.seller.sellerCode})
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
