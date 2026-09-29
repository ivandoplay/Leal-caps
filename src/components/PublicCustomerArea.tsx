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
    <div className="min-h-[calc(100vh-4rem)] bg-[#090B0E] py-6 px-4">
      {/* Barra de Navegação de Links Ativos & Rastreio */}
      <div className="max-w-3xl mx-auto mb-6 bg-[#11141B] border border-[#232938] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Link2 className="w-4 h-4 text-[#A3E635]" />
          <span className="text-[#94A3B8]">URL ativa:</span>
          <code className="bg-[#090B0E] px-2.5 py-1 rounded border border-[#232938] text-[#A3E635]">
            {fullPublicUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(fullPublicUrl);
              onNotify(`Link copiado: ${fullPublicUrl}`, 'success');
            }}
            className="p-1.5 rounded bg-[#171B24] hover:bg-[#232938] text-[#F3F5F8] cursor-pointer"
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
              className={`px-2.5 py-1 rounded text-xs font-mono cursor-pointer border transition-all ${
                offerCode === item.code && mode === 'OFFER_CHECKOUT'
                  ? 'bg-[#A3E635] text-[#090B0E] border-[#A3E635] font-bold'
                  : 'bg-[#171B24] text-[#94A3B8] border-[#232938] hover:text-white'
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
        <div className="max-w-lg mx-auto space-y-5">
          <Card
            title="Rastreamento de Pedido Leal Caps"
            subtitle="Informe o número do seu pedido (#LC-XXXXX) ou código da transportadora para acompanhar a entrega."
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
              <div className="space-y-4 mt-4 pt-4 border-t border-[#232938]">
                <div className="flex items-center justify-between bg-[#171B24] p-3.5 rounded-lg border border-[#232938]">
                  <div>
                    <div className="text-xs text-[#94A3B8]">Número do Pedido</div>
                    <div className="text-lg font-bold font-mono text-[#A3E635]">
                      {trackingResult.orderNumber}
                    </div>
                  </div>
                  <StatusBadge status={trackingResult.consolidatedStatus} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#090B0E] p-3.5 rounded-lg border border-[#232938]">
                  <div>
                    <span className="text-[#64748B] block">Destinatário</span>
                    <strong className="text-[#F3F5F8]">{trackingResult.recipientFirstName}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Destino</span>
                    <strong className="text-[#F3F5F8]">{trackingResult.destinationSummary}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Modalidade de Envio</span>
                    <strong className="text-[#F3F5F8]">{cleanText(trackingResult.shippingService)}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Código de Rastreio</span>
                    <strong className="text-[#06B6D4] font-mono">
                      {trackingResult.trackingCode || 'Em preparação no CD'}
                    </strong>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                    Histórico de Movimentação
                  </h4>
                  <div className="space-y-2">
                    {trackingResult.timeline.map((t, i) => (
                      <div
                        key={i}
                        className="bg-[#171B24] border border-[#232938] rounded-lg p-3 text-xs"
                      >
                        <div className="flex justify-between font-mono">
                          <span className="text-[#A3E635] font-bold">{t.event}</span>
                          <span className="text-[#64748B]">
                            {new Date(t.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[#94A3B8] mt-1">{cleanText(t.note)}</p>
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
        <div className="max-w-lg mx-auto space-y-5">
          <div className="bg-[#11141B] border border-[#A3E635]/40 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Badge tone={createdOrder.financialStatus === 'approved' ? 'emerald' : 'lime'}>
                {createdOrder.financialStatus === 'approved'
                  ? 'PAGAMENTO APROVADO'
                  : 'AGUARDANDO PAGAMENTO'}
              </Badge>
              <span className="font-mono text-sm font-bold text-[#A3E635]">
                {createdOrder.orderNumber}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-bold font-display text-[#F3F5F8]">
                {createdOrder.financialStatus === 'approved'
                  ? 'Seu pedido foi confirmado e já está em separação!'
                  : 'Finalize seu pagamento para liberação imediata'}
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                {createdOrder.financialStatus === 'approved'
                  ? 'Você receberá o código de rastreamento no seu WhatsApp e e-mail assim que o pacote for despachado.'
                  : 'Assim que o pagamento é compensado pelo banco, seu pedido entra automaticamente na fila de expedição do Centro de Distribuição.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#090B0E] p-4 rounded-xl border border-[#232938] text-xs">
              <div>
                <span className="text-[#64748B] block">Status do Pagamento</span>
                <div className="mt-1">
                  <StatusBadge status={createdOrder.financialStatus} />
                </div>
              </div>
              <div>
                <span className="text-[#64748B] block">Status da Entrega</span>
                <div className="mt-1">
                  <StatusBadge status={createdOrder.consolidatedStatus} />
                </div>
              </div>
              <div>
                <span className="text-[#64748B] block">Valor Total</span>
                <strong className="text-base font-mono text-[#F3F5F8]">
                  R$ {createdOrder.total.toFixed(2)}
                </strong>
              </div>
              <div>
                <span className="text-[#64748B] block">Consultor Responsável</span>
                <strong className="text-[#F3F5F8]">{createdOrder.sellerName}</strong>
              </div>
            </div>

            {createdPayment.pixQrCode && createdOrder.financialStatus === 'pending' && (
              <div className="bg-[#171B24] border border-[#232938] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A3E635]">
                    <QrCode className="w-4 h-4" />
                    <span>PIX Copia e Cola Oficial</span>
                  </div>
                  <Badge tone="cyan">EXPIRA EM 30 MIN</Badge>
                </div>
                <div className="bg-[#090B0E] p-3 rounded border border-[#232938] font-mono text-[11px] text-[#94A3B8] break-all select-all">
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

            <div className="flex justify-between items-center pt-2 border-t border-[#232938]">
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

      {/* MODE: CHECKOUT MOBILE-FIRST */}
      {mode === 'OFFER_CHECKOUT' && (
        <div className="max-w-lg mx-auto">
          {loadingOffer && <LoadingState message="Carregando condição comercial..." />}

          {!loadingOffer && offerError && (
            <ErrorState
              message={offerError}
              onRetry={() => loadOfferByCode('7XK29')}
            />
          )}

          {!loadingOffer && offerData && (
            <div className="bg-[#11141B] border border-[#232938] rounded-2xl overflow-hidden shadow-2xl">
              {/* Offer Header Banner */}
              <div className="bg-gradient-to-r from-[#171B24] to-[#11141B] px-5 py-3.5 border-b border-[#232938] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#A3E635]" />
                  <span className="text-xs font-bold tracking-wider uppercase text-[#F3F5F8]">
                    LEAL CAPS • CHECKOUT OFICIAL SEGURO
                  </span>
                </div>
                <Badge tone="lime">/o/{offerData.offer.code}</Badge>
              </div>

              {/* Product & Commercial Condition Showcase */}
              <div className="p-5 space-y-5">
                <div className="flex gap-4 items-center">
                  <img
                    src={
                      offerData.products[0]?.images[0]?.url ||
                      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'
                    }
                    alt={cleanText(offerData.offer.name)}
                    className="w-24 h-24 rounded-xl object-cover border border-[#232938] shrink-0"
                  />
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="cyan">
                        {offerData.offer.totalUnits}{' '}
                        {offerData.offer.totalUnits === 1 ? 'FRASCO (100 CAPS)' : 'FRASCOS (100 CAPS CADA)'}
                      </Badge>
                      {offerData.offer.freeShipping && <Badge tone="emerald">FRETE GRÁTIS</Badge>}
                    </div>
                    <h1 className="text-lg font-bold font-display text-[#F3F5F8] leading-snug">
                      {cleanText(offerData.offer.name)}
                    </h1>
                    <p className="text-xs text-[#94A3B8]">
                      {offerData.products
                        .map((p) => `${cleanText(p.commercialName)} (${p.presentation})`)
                        .join(' + ')}
                    </p>
                  </div>
                </div>

                {/* Price Box */}
                <div className="bg-[#090B0E] border border-[#232938] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] line-through font-mono">
                      De R$ {offerData.offer.regularPrice.toFixed(2)}
                    </span>
                    <div className="text-2xl font-bold font-display text-[#A3E635] tabular-nums">
                      R$ {offerData.offer.promotionalPrice.toFixed(2)}
                    </div>
                    <span className="text-[11px] text-[#94A3B8]">
                      Economia de {offerData.offer.discountPercent}% nesta condição especial
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs text-[#94A3B8]">
                    <div>Estoque Reservado</div>
                    <strong className="text-[#F3F5F8]">
                      {offerData.offer.usageLimit - offerData.offer.usageCount} unidades
                    </strong>
                  </div>
                </div>

                {/* Approved Regulatory Claims (ANVISA IN 28/2018) */}
                <div className="bg-[#171B24]/70 border border-[#232938] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Informação Nutricional & Alegações Autorizadas
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">ANVISA IN 28/2018</span>
                  </div>
                  <ul className="space-y-1">
                    {offerData.products
                      .flatMap((p) => p.approvedClaims)
                      .map((c) => (
                        <li key={c.id} className="text-xs text-[#F3F5F8] flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#A3E635] shrink-0 mt-0.5" />
                          <span>{c.claimText}</span>
                        </li>
                      ))}
                  </ul>
                  <p className="text-[10px] text-[#64748B] pt-1 border-t border-[#232938]">
                    {offerData.products[0]?.warnings}
                  </p>
                </div>

                {/* STEP 1: CEP & SHIPPING QUOTE */}
                <form onSubmit={handleCompleteCheckout} className="space-y-5 pt-2 border-t border-[#232938]">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3E635] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      1. Informe seu CEP para Entrega
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
                      <div className="text-[11px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] px-3 py-2 rounded-lg">
                        Cotação realizada pela tabela nacional dos Correios.
                      </div>
                    )}

                    {shippingOptions.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {shippingOptions.map((opt) => {
                          const isSelected = selectedShipping?.serviceCode === opt.serviceCode;
                          const displayPrice = offerData.offer.freeShipping ? 0 : opt.price;
                          return (
                            <div
                              key={opt.serviceCode}
                              onClick={() => setSelectedShipping(opt)}
                              className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-[#A3E635]/10 border-[#A3E635]'
                                  : 'bg-[#090B0E] border-[#232938]'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-bold text-[#F3F5F8]">
                                  {cleanText(opt.serviceName)}
                                </div>
                                <div className="text-[11px] text-[#94A3B8]">
                                  Entrega estimada em {opt.estimatedDays} dias úteis
                                </div>
                              </div>
                              <div className="font-mono text-xs font-bold text-[#A3E635]">
                                {displayPrice === 0 ? 'FRETE GRÁTIS' : `R$ ${displayPrice.toFixed(2)}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* STEP 2: COUPON */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3E635] flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      2. Cupom de Desconto
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
                        Aplicar
                      </Button>
                    </div>
                  </div>

                  {/* STEP 3: DADOS DO CLIENTE */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3E635] flex items-center gap-1.5">
                      <Package className="w-4 h-4" />
                      3. Seus Dados para Envio e Nota Fiscal
                    </h3>
                    <Input
                      label="Nome Completo"
                      placeholder="Digite seu nome completo"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3E635] flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      4. Forma de Pagamento
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2.5 px-3 rounded-lg text-xs font-bold font-mono border cursor-pointer transition-all ${
                            paymentMethod === m
                              ? 'bg-[#A3E635] text-[#090B0E] border-[#A3E635]'
                              : 'bg-[#090B0E] text-[#94A3B8] border-[#232938]'
                          }`}
                        >
                          {m === 'PIX' ? 'PIX IMEDIATO' : m === 'CREDIT_CARD' ? 'CARTÃO' : 'BOLETO'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ORDER SUMMARY BOX */}
                  <div className="bg-[#090B0E] border border-[#232938] rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Subtotal ({offerData.offer.totalUnits} frascos):</span>
                      <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[#10B981]">
                        <span>Desconto Cupom ({appliedCoupon?.code}):</span>
                        <span className="font-mono">- R$ {discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#94A3B8]">
                      <span>Frete ({cleanText(selectedShipping?.serviceName || 'Correios')}):</span>
                      <span className="font-mono">
                        {shippingPrice === 0 ? 'GRÁTIS' : `R$ ${shippingPrice.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[#232938] flex justify-between items-center text-base font-bold text-[#F3F5F8]">
                      <span>Total a Pagar</span>
                      <span className="font-mono text-[#A3E635] text-lg">
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
                    Concluir Pedido • R$ {finalTotal.toFixed(2)}
                  </Button>

                  {offerData.seller && (
                    <div className="text-center text-[11px] text-[#64748B] font-mono">
                      Consultor responsável: {offerData.seller.name} ({offerData.seller.sellerCode})
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
