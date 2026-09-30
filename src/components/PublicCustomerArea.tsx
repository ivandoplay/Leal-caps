import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Lock,
  MapPin,
  Package,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Truck,
  User,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  LoadingState,
  Select,
  StatusBadge,
  formatCurrencyBRL,
  formatOrderDateTimeBR,
} from './ui/DesignSystem.tsx';
import { Offer, OfferLink, Order, Payment, Product } from '../types/domain.ts';

interface PublicOfferPayload {
  offer: Offer;
  link?: OfferLink | null;
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

const cleanText = (txt?: string | null) => (txt ? txt.replace(/\s*\[DEMO\]/g, '').trim() : '');

const formatCepMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatPhoneMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpfMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCardNumberMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const formatCardExpiryMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const getFriendlyCustomerStatus = (financialStatus: string, operationalStatus: string): {
  label: string;
  tone: 'emerald' | 'amber' | 'cyan' | 'danger' | 'slate';
  stepIndex: number;
} => {
  const fin = String(financialStatus || '').toLowerCase();
  const op = String(operationalStatus || '').toLowerCase();

  if (fin === 'declined' || fin === 'refunded' || fin === 'chargeback') {
    return {
      label: fin === 'refunded' ? 'Pedido reembolsado' : 'Pagamento não confirmado',
      tone: 'danger',
      stepIndex: 0,
    };
  }

  if (fin === 'pending') {
    return { label: 'Aguardando pagamento', tone: 'amber', stepIndex: 1 };
  }

  if (op === 'delivered') {
    return { label: 'Entregue', tone: 'emerald', stepIndex: 5 };
  }
  if (op === 'shipped') {
    return { label: 'Em trânsito', tone: 'cyan', stepIndex: 4 };
  }
  if (op === 'exception') {
    return { label: 'Atenção na entrega', tone: 'danger', stepIndex: 4 };
  }
  if (['picking', 'packing', 'ready_to_ship'].includes(op)) {
    return { label: 'Em preparação para envio', tone: 'cyan', stepIndex: 3 };
  }

  return { label: 'Pagamento aprovado', tone: 'emerald', stepIndex: 2 };
};

const getFriendlyEventTitle = (event: string): string => {
  const upper = String(event || '').toUpperCase();
  if (upper.includes('PEDIDO CRIADO')) return 'Pedido realizado';
  if (upper.includes('PAGAMENTO PENDENTE')) return 'Aguardando confirmação do pagamento';
  if (upper.includes('PAGAMENTO APROVADO')) return 'Pagamento confirmado';
  if (upper.includes('SEPARAÇÃO') || upper.includes('EMBALAGEM')) return 'Pedido em preparação';
  if (upper.includes('EXPEDIÇÃO') || upper.includes('ETIQUETA')) return 'Pronto para envio';
  if (upper.includes('ENVIADO')) return 'Pedido enviado para a transportadora';
  if (upper.includes('ENTREGUE')) return 'Pedido entregue';
  if (upper.includes('EXCEÇÃO')) return 'Ocorrência na entrega';
  return cleanText(event);
};

export const PublicCustomerArea: React.FC<{
  initialOfferCode?: string;
  availableLinks?: { code: string; name: string }[];
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOrderCreatedOrUpdated: () => void;
}> = ({ initialOfferCode = '7XK29', onNotify, onOrderCreatedOrUpdated }) => {
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
  const [shippingError, setShippingError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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
    marketingOptIn: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [cardData, setCardData] = useState({
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
    installments: '3',
  });
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const idempotencyKeyRef = useRef<string>(`idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  // Created Order & Payment Confirmation
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [createdPayment, setCreatedPayment] = useState<Payment | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Public Tracking State
  const [trackingQuery, setTrackingQuery] = useState('#LC-10421');
  const [trackingResult, setTrackingResult] = useState<TrackingResponse | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [searchingTracking, setSearchingTracking] = useState(false);

  useEffect(() => {
    setOfferCode(initialOfferCode);
  }, [initialOfferCode]);

  const loadOfferByCode = async (codeToLoad: string) => {
    setLoadingOffer(true);
    setOfferError(null);
    setAppliedCoupon(null);
    setCouponFeedback(null);
    setImgError(false);
    idempotencyKeyRef.current = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch(`/api/o/${codeToLoad}`);
      const data = await res.json();
      if (!res.ok) {
        setOfferData(null);
        setOfferError(data.error || 'Esta oferta não está disponível no momento.');
      } else {
        setOfferData(data);
        const defaultCode = data.link?.couponCode || data.offer?.defaultCouponCode || '';
        setCouponInput(defaultCode);
        try {
          window.history.replaceState({}, '', `/o/${codeToLoad}`);
        } catch {
          // ignore inside restricted iframe if blocked
        }
        await handleQuoteShipping(cep, data.offer.id, true);
      }
    } catch {
      setOfferError('Não foi possível carregar os detalhes da oferta. Tente novamente em instantes.');
    } finally {
      setLoadingOffer(false);
    }
  };

  useEffect(() => {
    loadOfferByCode(offerCode);
  }, [offerCode]);

  const handleQuoteShipping = async (
    cepValue: string,
    targetOfferId?: string,
    silent = false
  ) => {
    const idToUse = targetOfferId || offerData?.offer.id;
    if (!idToUse) return;
    const cleanCepDigits = cepValue.replace(/\D/g, '');
    if (cleanCepDigits.length !== 8) {
      if (!silent) {
        setShippingError('Digite um CEP válido com 8 dígitos.');
      }
      return;
    }

    setQuotingShipping(true);
    setShippingError(null);
    try {
      const res = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: cleanCepDigits,
          offerId: idToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShippingOptions([]);
        setSelectedShipping(null);
        const errMsg = data.error || 'CEP inválido ou fora de área de cobertura.';
        setShippingError(errMsg);
        if (!silent) onNotify(errMsg, 'error');
      } else {
        const opts: ShippingOption[] = data.options || [];
        setShippingOptions(opts);
        setSelectedShipping(opts[0] || null);
        setCustomer((prev) => ({
          ...prev,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }
    } catch {
      setShippingError('Não foi possível consultar o CEP no momento.');
    } finally {
      setQuotingShipping(false);
    }
  };

  const handleCepChange = (raw: string) => {
    const masked = formatCepMask(raw);
    setCep(masked);
    if (shippingError) setShippingError(null);
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8 && offerData?.offer.id) {
      handleQuoteShipping(masked, offerData.offer.id, true);
    }
  };

  const handleValidateCoupon = async (overrideCode?: string) => {
    if (!offerData) return;
    const codeToTest = (overrideCode !== undefined ? overrideCode : couponInput).trim().toUpperCase();
    if (!codeToTest) {
      setAppliedCoupon(null);
      setCouponFeedback(null);
      return;
    }
    setValidatingCoupon(true);
    setCouponFeedback(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToTest,
          offerId: offerData.offer.id,
          linkCode: offerCode,
          customerCpf: customer.cpf || undefined,
          sellerId: offerData.seller?.id,
          campaignId: offerData.campaign?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedCoupon(null);
        const msg = data.error || 'Cupom inválido ou expirado.';
        setCouponFeedback({ text: msg, type: 'error' });
      } else {
        setCouponInput(data.coupon.code);
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
        });
        const msg = `Cupom ${data.coupon.code} aplicado (-${formatCurrencyBRL(data.discountAmount)})`;
        setCouponFeedback({ text: msg, type: 'success' });
        onNotify(msg, 'success');
      }
    } finally {
      setValidatingCoupon(false);
    }
  };

  const validateCheckoutForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (customer.name.trim().split(' ').length < 2) {
      errors.name = 'Informe seu nome e sobrenome.';
    }
    if (!customer.email.includes('@') || !customer.email.includes('.')) {
      errors.email = 'Informe um e-mail válido.';
    }
    if (customer.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Informe um WhatsApp/telefone válido com DDD.';
    }
    if (customer.cpf.replace(/\D/g, '').length !== 11) {
      errors.cpf = 'Informe um CPF válido com 11 dígitos.';
    }
    if (cep.replace(/\D/g, '').length !== 8) {
      errors.cep = 'Informe um CEP válido.';
    }
    if (!customer.street.trim()) {
      errors.street = 'Informe a rua ou avenida.';
    }
    if (!customer.number.trim()) {
      errors.number = 'Informe o número.';
    }
    if (!customer.neighborhood.trim()) {
      errors.neighborhood = 'Informe o bairro.';
    }
    if (!customer.city.trim()) {
      errors.city = 'Informe a cidade.';
    }
    if (customer.state.trim().length !== 2) {
      errors.state = 'Informe a UF.';
    }
    if (paymentMethod === 'CREDIT_CARD') {
      if (cardData.number.replace(/\D/g, '').length < 13) {
        errors.cardNumber = 'Informe o número do cartão.';
      }
      if (!cardData.holderName.trim()) {
        errors.cardHolder = 'Informe o nome impresso no cartão.';
      }
      if (cardData.expiry.length < 5) {
        errors.cardExpiry = 'Validade inválida.';
      }
      if (cardData.cvv.replace(/\D/g, '').length < 3) {
        errors.cardCvv = 'CVV inválido.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCompleteCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerData) return;

    if (!validateCheckoutForm()) {
      onNotify('Verifique os campos destacados para concluir seu pedido.', 'error');
      return;
    }

    if (!selectedShipping) {
      onNotify('Informe um CEP válido e selecione uma opção de entrega.', 'error');
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
          cep: cep.replace(/\D/g, ''),
          shippingServiceCode: selectedShipping.serviceCode,
          paymentMethod,
          idempotencyKey: idempotencyKeyRef.current,
          customer: {
            ...customer,
            cep: cep.replace(/\D/g, ''),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        idempotencyKeyRef.current = `idem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        onNotify(data.error || 'Não foi possível concluir o pedido.', 'error');
      } else {
        setCreatedOrder(data.order);
        setCreatedPayment(data.payment);
        setMode('SUCCESS');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onOrderCreatedOrUpdated();
        onNotify(`Pedido ${data.order.orderNumber} realizado com sucesso!`, 'success');
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
        onNotify(data.error || 'Não foi possível verificar o pagamento agora.', 'error');
      } else {
        setCreatedOrder(data.order);
        setCreatedPayment(data.payment);
        onOrderCreatedOrUpdated();
        onNotify(`Pagamento confirmado! Seu pedido ${data.order.orderNumber} já está em preparação.`, 'success');
      }
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleSearchTracking = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    setTrackingError(null);
    const q = (codeOverride || trackingQuery).trim();
    if (!q) return;
    setSearchingTracking(true);
    try {
      const clean = encodeURIComponent(q);
      const res = await fetch(`/api/shipments/${clean}/tracking`);
      const data = await res.json();
      if (!res.ok) {
        setTrackingResult(null);
        setTrackingError(data.error || 'Pedido não encontrado. Verifique o código informado.');
      } else {
        setTrackingResult(data);
      }
    } catch {
      setTrackingError('Não foi possível consultar o rastreamento agora.');
    } finally {
      setSearchingTracking(false);
    }
  };

  const regularPrice = offerData?.offer.regularPrice || 0;
  const subtotal = offerData?.link?.salePrice ?? offerData?.offer.promotionalPrice ?? 0;
  const offerSavings = Math.max(0, regularPrice - subtotal);
  const discount = appliedCoupon?.discountAmount || 0;
  const shippingPrice = offerData?.offer.freeShipping ? 0 : selectedShipping?.price || 0;
  const finalTotal = Math.max(1, subtotal - discount + shippingPrice);
  const suggestedCoupon = offerData?.link?.couponCode || offerData?.offer.defaultCouponCode || '';
  const sellerFirstName = offerData?.seller?.name
    ? cleanText(offerData.seller.name).split(' ')[0]
    : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-14">
      {/* CABEÇALHO DE CHECKOUT COMERCIAL — LIMPO, CONFIÁVEL E SEM ELEMENTOS DE ADMIN */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <div>
              <span className="font-semibold text-[var(--text-primary)]">Checkout 100% Seguro</span>
              <span className="hidden sm:inline text-[var(--text-muted)]">
                {' '}· Dados protegidos por criptografia ponta a ponta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode !== 'OFFER_CHECKOUT' && (
              <Button
                variant="ghost"
                size="xs"
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setMode('OFFER_CHECKOUT')}
              >
                Voltar para a compra
              </Button>
            )}
            <Button
              variant={mode === 'TRACKING' ? 'primary' : 'secondary'}
              size="xs"
              icon={<Truck className="w-3.5 h-3.5" />}
              onClick={() => {
                setMode('TRACKING');
                handleSearchTracking(undefined, trackingQuery);
              }}
            >
              Rastrear pedido
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-6">
        {/* =====================================================================
            MODO 1: RASTREAMENTO DE PEDIDO
        ===================================================================== */}
        {mode === 'TRACKING' && (
          <div className="max-w-2xl mx-auto space-y-5">
            <Card
              title="Acompanhe seu pedido"
              subtitle="Digite o número do pedido (ex: #LC-10421) ou o código de rastreio enviado por WhatsApp e e-mail."
            >
              <form onSubmit={(e) => handleSearchTracking(e)} className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  value={trackingQuery}
                  onChange={(e) => setTrackingQuery(e.target.value)}
                  placeholder="Ex: #LC-10421 ou LC104210131BR"
                />
                <Button
                  type="submit"
                  loading={searchingTracking}
                  icon={<Search className="w-4 h-4" />}
                  className="sm:w-auto w-full"
                >
                  Consultar entrega
                </Button>
              </form>

              {trackingError && (
                <div className="mt-4">
                  <ErrorState message={trackingError} />
                </div>
              )}

              {trackingResult && (() => {
                const statusMeta = getFriendlyCustomerStatus(
                  trackingResult.financialStatus,
                  trackingResult.operationalStatus
                );
                const steps = [
                  { idx: 1, label: 'Pedido recebido' },
                  { idx: 2, label: 'Pagamento aprovado' },
                  { idx: 3, label: 'Em preparação' },
                  { idx: 4, label: 'Em trânsito' },
                  { idx: 5, label: 'Entregue' },
                ];

                return (
                  <div className="space-y-6 mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    {/* Cabeçalho do Pedido */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-subtle)]/70 p-4 rounded-xl border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-xs text-[var(--text-muted)] block">Número do pedido</span>
                        <span className="text-lg font-extrabold font-mono text-[var(--text-primary)]">
                          {trackingResult.orderNumber}
                        </span>
                      </div>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>

                    {/* Barra de Progresso Visual da Entrega */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {steps.map((step) => {
                        const completed = statusMeta.stepIndex >= step.idx;
                        const isCurrent = statusMeta.stepIndex === step.idx;
                        return (
                          <div key={step.idx} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-colors ${
                                completed
                                  ? 'bg-emerald-500'
                                  : 'bg-[var(--border-subtle)]'
                              }`}
                            />
                            <div
                              className={`text-[11px] leading-tight ${
                                isCurrent
                                  ? 'font-bold text-[var(--text-primary)]'
                                  : completed
                                    ? 'font-medium text-[var(--text-secondary)]'
                                    : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {step.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumo de Entrega e Rastreio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-[var(--bg-subtle)]/40 p-4 rounded-xl border border-[var(--border-subtle)]">
                      <div>
                        <span className="text-[var(--text-muted)] block">Destinatário</span>
                        <strong className="text-[var(--text-primary)] text-sm">
                          {trackingResult.recipientFirstName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block">Cidade de destino</span>
                        <strong className="text-[var(--text-primary)] text-sm">
                          {trackingResult.destinationSummary}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block">Modalidade de envio</span>
                        <strong className="text-[var(--text-primary)]">
                          {cleanText(trackingResult.shippingService)}
                        </strong>
                        {trackingResult.estimatedDeliveryDays > 0 && (
                          <span className="text-[var(--text-secondary)]">
                            {' '}· até {trackingResult.estimatedDeliveryDays} dias úteis
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block">Código de rastreio</span>
                        {trackingResult.trackingCode ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                              {trackingResult.trackingCode}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(trackingResult.trackingCode || '');
                                onNotify('Código de rastreio copiado!', 'success');
                              }}
                              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                            >
                              Copiar
                            </button>
                          </div>
                        ) : (
                          <strong className="text-[var(--text-secondary)]">
                            Será gerado após a postagem
                          </strong>
                        )}
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    {trackingResult.itemsSummary?.length > 0 && (
                      <div className="bg-[var(--bg-subtle)]/40 p-4 rounded-xl border border-[var(--border-subtle)] space-y-2">
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          Itens do seu pedido
                        </div>
                        <div className="space-y-1.5">
                          {trackingResult.itemsSummary.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-[var(--text-secondary)]">
                                {cleanText(item.productName)}
                              </span>
                              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                                {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Histórico de Atualizações */}
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)] mb-3">
                        Atualizações do pedido
                      </h4>
                      <div className="space-y-2.5">
                        {trackingResult.timeline.map((t, i) => (
                          <div
                            key={i}
                            className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">
                                {getFriendlyEventTitle(t.event)}
                              </div>
                              <p className="text-[var(--text-secondary)] mt-0.5">
                                {cleanText(t.note)}
                              </p>
                            </div>
                            <span className="text-[11px] text-[var(--text-muted)] tabular-nums shrink-0">
                              {formatOrderDateTimeBR(t.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {/* =====================================================================
            MODO 2: CONFIRMAÇÃO DE PEDIDO & PAGAMENTO (PÓS-COMPRA)
        ===================================================================== */}
        {mode === 'SUCCESS' && createdOrder && createdPayment && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="modern-card rounded-2xl p-6 sm:p-8 space-y-6">
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      createdOrder.financialStatus === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {createdOrder.financialStatus === 'approved' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <QrCode className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Pedido <strong className="font-mono text-[var(--text-primary)]">{createdOrder.orderNumber}</strong>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold font-display text-[var(--text-primary)]">
                      {createdOrder.financialStatus === 'approved'
                        ? 'Pagamento confirmado! Seu pedido está em preparação.'
                        : createdOrder.paymentMethod === 'PIX'
                          ? 'Quase lá! Conclua o pagamento via PIX'
                          : 'Pedido recebido! Aguardando confirmação do pagamento'}
                    </h2>
                  </div>
                </div>
                <Badge tone={createdOrder.financialStatus === 'approved' ? 'emerald' : 'amber'}>
                  {createdOrder.financialStatus === 'approved'
                    ? 'Pagamento aprovado'
                    : 'Aguardando pagamento'}
                </Badge>
              </div>

              {/* Instruções de Pagamento PIX quando pendente */}
              {createdPayment.pixQrCode && createdOrder.financialStatus === 'pending' && (
                <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-5 items-center">
                    {/* Representação Visual Limpa do QR Code PIX */}
                    <div className="w-36 h-36 rounded-2xl bg-white p-3 border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm">
                      <QrCode className="w-24 h-24 text-slate-900" />
                      <span className="text-[10px] font-semibold text-slate-600 mt-1">
                        Escaneie no app do banco
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[var(--text-primary)]">
                          Pague com PIX Copia e Cola
                        </span>
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                           Reserva garantida por 30 min
                        </span>
                      </div>
                      <ol className="space-y-1 text-[var(--text-secondary)] list-decimal list-inside">
                        <li>Copie o código PIX no botão abaixo ou escaneie o QR Code.</li>
                        <li>Abra o aplicativo do seu banco na opção <strong>PIX Copia e Cola</strong>.</li>
                        <li>Confirme o pagamento de <strong>{formatCurrencyBRL(createdOrder.total)}</strong>.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] break-all select-all">
                      {createdPayment.pixQrCode}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1"
                        icon={pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        onClick={() => {
                          navigator.clipboard?.writeText(createdPayment.pixQrCode || '');
                          setPixCopied(true);
                          setTimeout(() => setPixCopied(false), 3000);
                          onNotify('Código PIX copiado! Cole no aplicativo do seu banco.', 'success');
                        }}
                      >
                        {pixCopied ? 'Código PIX copiado!' : 'Copiar código PIX'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="md"
                        loading={confirmingPayment}
                        onClick={handleConfirmPaymentWebhook}
                      >
                        Já realizei o pagamento
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmação para Cartão ou Boleto quando pendente */}
              {createdOrder.financialStatus === 'pending' && !createdPayment.pixQrCode && (
                <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-2xl p-5 space-y-4">
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {createdOrder.paymentMethod === 'CREDIT_CARD'
                      ? 'Seu pagamento com cartão de crédito está em análise automática pela operadora. Confirme abaixo para concluir a liberação imediata do pedido.'
                      : 'Seu boleto bancário foi registrado. Assim que o pagamento for compensado, seu pedido será enviado para expedição.'}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    loading={confirmingPayment}
                    onClick={handleConfirmPaymentWebhook}
                    className="w-full"
                  >
                    Já realizei o pagamento · Confirmar agora
                  </Button>
                </div>
              )}

              {/* Mensagem de Pedido Aprovado */}
              {createdOrder.financialStatus === 'approved' && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  Recebemos a confirmação do seu pagamento de{' '}
                  <strong>{formatCurrencyBRL(createdOrder.total)}</strong>. Seu pedido já foi encaminhado para
                  separação e você receberá o código de rastreamento no WhatsApp{' '}
                  <strong>{createdOrder.customerSnapshot.phone}</strong> e no e-mail{' '}
                  <strong>{createdOrder.customerSnapshot.email}</strong>.
                </div>
              )}

              {/* Resumo Completo do Pedido Realizado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Endereço de entrega</span>
                  </div>
                  <div className="text-[var(--text-secondary)] space-y-0.5 leading-relaxed">
                    <div className="font-semibold text-[var(--text-primary)]">
                      {cleanText(createdOrder.customerSnapshot.name)}
                    </div>
                    <div>
                      {createdOrder.customerSnapshot.street}, {createdOrder.customerSnapshot.number}
                      {createdOrder.customerSnapshot.complement
                        ? ` · ${createdOrder.customerSnapshot.complement}`
                        : ''}
                    </div>
                    <div>
                      {createdOrder.customerSnapshot.neighborhood} · {createdOrder.customerSnapshot.city}/
                      {createdOrder.customerSnapshot.state}
                    </div>
                    <div className="font-mono text-[11px] text-[var(--text-muted)]">
                      CEP {formatCepMask(createdOrder.customerSnapshot.cep)}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                    Envio via <strong>{cleanText(createdOrder.shippingService)}</strong> (até{' '}
                    {createdOrder.estimatedDeliveryDays} dias úteis)
                  </div>
                </div>

                <div className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 space-y-2 text-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Resumo financeiro</span>
                    </div>
                    <div className="space-y-1 text-[var(--text-secondary)]">
                      {createdOrder.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between gap-2">
                          <span className="truncate">
                            {it.quantity}x {cleanText(it.productName)}
                          </span>
                          <span className="font-mono tabular-nums shrink-0">
                            {formatCurrencyBRL(it.unitPrice * it.quantity)}
                          </span>
                        </div>
                      ))}
                      {createdOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Desconto ({createdOrder.couponCode})</span>
                          <span className="font-mono tabular-nums">
                            - {formatCurrencyBRL(createdOrder.discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Frete</span>
                        <span className="font-mono tabular-nums">
                          {createdOrder.shippingCost === 0
                            ? 'Grátis'
                            : formatCurrencyBRL(createdOrder.shippingCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center font-bold text-sm text-[var(--text-primary)]">
                    <span>Total</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrencyBRL(createdOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Finais */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="ghost" size="sm" onClick={() => setMode('OFFER_CHECKOUT')}>
                  ← Voltar para a loja
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
                  Acompanhar pedido ({createdOrder.orderNumber})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODO 3: CHECKOUT DE ALTA CONVERSÃO (MOBILE-FIRST + 2 COLUNAS DESKTOP)
        ===================================================================== */}
        {mode === 'OFFER_CHECKOUT' && (
          <div>
            {loadingOffer && <LoadingState message="Carregando sua oferta..." />}

            {!loadingOffer && offerError && (
              <div className="max-w-xl mx-auto">
                <ErrorState
                  message={offerError}
                  onRetry={() => loadOfferByCode('7XK29')}
                />
              </div>
            )}

            {!loadingOffer && offerData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* ===============================================================
                    COLUNA DA OFERTA & RESUMO DO PEDIDO (Sticky no Desktop)
                =============================================================== */}
                <div className="lg:col-span-5 lg:order-2 lg:sticky lg:top-20 space-y-4">
                  <div className="modern-card rounded-2xl overflow-hidden">
                    {/* Cabeçalho da Oferta */}
                    <div className="p-5 sm:p-6 space-y-5">
                      <div className="flex gap-4 items-center">
                        {/* Imagem do Produto com Fallback Resiliente */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shrink-0 flex items-center justify-center">
                          {!imgError && offerData.products[0]?.images[0]?.url ? (
                            <img
                              src={offerData.products[0].images[0].url}
                              alt={cleanText(offerData.offer.name)}
                              referrerPolicy="no-referrer"
                              onError={() => setImgError(true)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-indigo-500/10 to-sky-500/10 w-full h-full">
                              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {offerData.offer.totalUnits}{' '}
                              {offerData.offer.totalUnits === 1 ? 'unidade' : 'unidades'}
                            </span>
                            {offerData.offer.freeShipping && (
                              <>
                                <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Frete Grátis
                                </span>
                              </>
                            )}
                          </div>

                          <h1 className="text-base sm:text-lg font-extrabold font-display text-[var(--text-primary)] leading-snug">
                            {cleanText(offerData.offer.name)}
                          </h1>

                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                            {offerData.products
                              .map((p) => `${cleanText(p.commercialName)} (${p.presentation})`)
                              .join(' + ')}
                          </p>
                        </div>
                      </div>

                      {/* Bloco de Preço e Economia */}
                      <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-xl p-4 flex items-center justify-between gap-3">
                        <div>
                          {regularPrice > subtotal && (
                            <span className="text-xs text-[var(--text-muted)] line-through font-mono block">
                              De {formatCurrencyBRL(regularPrice)}
                            </span>
                          )}
                          <div className="text-2xl font-extrabold font-display text-[var(--text-primary)] tabular-nums">
                            {formatCurrencyBRL(subtotal)}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            ou em até 12x de{' '}
                            <strong className="text-[var(--text-primary)] tabular-nums">
                              {formatCurrencyBRL(subtotal / 12)}
                            </strong>
                          </div>
                        </div>

                        {offerSavings > 0 && (
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tabular-nums">
                              -{Math.round(offerData.offer.discountPercent)}% OFF
                            </span>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 tabular-nums">
                              Economize {formatCurrencyBRL(offerSavings)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bônus / Extras Inclusos na Oferta */}
                      {offerData.offer.extras && offerData.offer.extras.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            Incluso gratuitamente nesta oferta:
                          </div>
                          <div className="space-y-1">
                            {offerData.offer.extras.map((extra, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{cleanText(extra)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cupom de Desconto Integrado ao Resumo */}
                      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
                        {appliedCoupon ? (
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3.5 py-2.5 text-xs">
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <div>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                                  {appliedCoupon.code}
                                </span>
                                <span className="text-emerald-600 dark:text-emerald-400 ml-1.5 tabular-nums">
                                  (-{formatCurrencyBRL(appliedCoupon.discountAmount)})
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedCoupon(null);
                                setCouponFeedback(null);
                              }}
                              className="text-xs text-[var(--text-secondary)] hover:text-rose-500 font-medium cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Remover
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={couponInput}
                                onChange={(e) => {
                                  setCouponInput(e.target.value.toUpperCase());
                                  if (couponFeedback) setCouponFeedback(null);
                                }}
                                placeholder="Cupom de desconto"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="md"
                                loading={validatingCoupon}
                                onClick={() => handleValidateCoupon()}
                              >
                                Aplicar
                              </Button>
                            </div>
                            {suggestedCoupon && (
                              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-1">
                                <span>
                                  Cupom disponível: <strong className="font-mono text-[var(--text-primary)]">{suggestedCoupon}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleValidateCoupon(suggestedCoupon)}
                                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
                                >
                                  Aplicar cupom
                                </button>
                              </div>
                            )}
                            {couponFeedback && couponFeedback.type === 'error' && (
                              <div className="text-xs text-rose-500 font-medium px-1">
                                {couponFeedback.text}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resumo Financeiro Transparente */}
                      <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs">
                        <div className="flex justify-between text-[var(--text-secondary)]">
                          <span>Subtotal ({offerData.offer.totalUnits} {offerData.offer.totalUnits === 1 ? 'item' : 'itens'})</span>
                          <span className="font-mono tabular-nums text-[var(--text-primary)]">
                            {formatCurrencyBRL(subtotal)}
                          </span>
                        </div>

                        {discount > 0 && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>Desconto ({appliedCoupon?.code})</span>
                            <span className="font-mono tabular-nums">
                              - {formatCurrencyBRL(discount)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-[var(--text-secondary)]">
                          <span>
                            Entrega
                            {selectedShipping
                              ? ` (${cleanText(selectedShipping.serviceName)})`
                              : ''}
                          </span>
                          <span
                            className={`font-mono tabular-nums ${
                              shippingPrice === 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {shippingPrice === 0 ? 'Grátis' : formatCurrencyBRL(shippingPrice)}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between items-baseline">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            Total a pagar
                          </span>
                          <div className="text-right">
                            <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {formatCurrencyBRL(finalTotal)}
                            </span>
                            <span className="block text-[11px] text-[var(--text-muted)]">
                              no PIX ou em até 12x no cartão
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Benefícios da Fórmula & Garantias (Apresentação Comercial Limpa) */}
                  <div className="modern-card rounded-2xl p-5 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Benefícios e qualidade comprovada</span>
                    </div>

                    <ul className="space-y-2">
                      {offerData.products
                        .flatMap((p) => p.approvedClaims)
                        .map((c) => (
                          <li
                            key={c.id}
                            className="text-xs text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{cleanText(c.claimText)}</span>
                          </li>
                        ))}
                    </ul>

                    {offerData.products[0]?.usageInstructions && (
                      <div className="pt-2.5 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">Modo de uso: </strong>
                        {cleanText(offerData.products[0].usageInstructions)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ===============================================================
                    COLUNA PRINCIPAL: FORMULÁRIO DE CHECKOUT EM 3 ETAPAS CLARAS
                =============================================================== */}
                <div className="lg:col-span-7 lg:order-1">
                  <form onSubmit={handleCompleteCheckout} className="space-y-5" noValidate>
                    {/* ETAPA 1: DADOS PESSOAIS */}
                    <div className="modern-card rounded-2xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          1
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-[var(--text-primary)]">
                            Seus dados
                          </h2>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Para emissão da nota fiscal e envio do código de rastreio
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <Input
                          label="Nome completo"
                          placeholder="Digite seu nome e sobrenome"
                          value={customer.name}
                          error={formErrors.name}
                          onChange={(e) => {
                            setCustomer({ ...customer, name: e.target.value });
                            if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                          }}
                          required
                        />

                        <Input
                          label="E-mail"
                          type="email"
                          placeholder="seuemail@exemplo.com.br"
                          value={customer.email}
                          error={formErrors.email}
                          onChange={(e) => {
                            setCustomer({ ...customer, email: e.target.value });
                            if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                          }}
                          required
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <Input
                            label="WhatsApp com DDD"
                            placeholder="(11) 99999-9999"
                            value={customer.phone}
                            error={formErrors.phone}
                            onChange={(e) => {
                              setCustomer({ ...customer, phone: formatPhoneMask(e.target.value) });
                              if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                            }}
                            required
                          />
                          <Input
                            label="CPF (para Nota Fiscal)"
                            placeholder="000.000.000-00"
                            value={customer.cpf}
                            error={formErrors.cpf}
                            onChange={(e) => {
                              setCustomer({ ...customer, cpf: formatCpfMask(e.target.value) });
                              if (formErrors.cpf) setFormErrors({ ...formErrors, cpf: '' });
                            }}
                            required
                          />
                        </div>

                        <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={customer.marketingOptIn}
                            onChange={(e) =>
                              setCustomer({ ...customer, marketingOptIn: e.target.checked })
                            }
                            className="w-4 h-4 rounded border-[var(--border-strong)] text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-[var(--text-secondary)]">
                            Receber atualizações da entrega no WhatsApp e ofertas exclusivas
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* ETAPA 2: ENDEREÇO E OPÇÃO DE ENTREGA */}
                    <div className="modern-card rounded-2xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          2
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-[var(--text-primary)]">
                            Endereço e entrega
                          </h2>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Informe seu CEP para preencher o endereço e ver os prazos
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {/* Busca de CEP */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                          <div className="flex-1">
                            <Input
                              label="CEP"
                              value={cep}
                              error={formErrors.cep || shippingError || undefined}
                              onChange={(e) => handleCepChange(e.target.value)}
                              placeholder="00000-000"
                              required
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            loading={quotingShipping}
                            onClick={() => handleQuoteShipping(cep, offerData.offer.id, false)}
                          >
                            Calcular entrega
                          </Button>
                        </div>

                        {/* Campos de Endereço */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <div className="sm:col-span-2">
                            <Input
                              label="Rua / Avenida"
                              placeholder="Nome da rua ou avenida"
                              value={customer.street}
                              error={formErrors.street}
                              onChange={(e) => {
                                setCustomer({ ...customer, street: e.target.value });
                                if (formErrors.street) setFormErrors({ ...formErrors, street: '' });
                              }}
                              required
                            />
                          </div>
                          <Input
                            label="Número"
                            placeholder="Nº"
                            value={customer.number}
                            error={formErrors.number}
                            onChange={(e) => {
                              setCustomer({ ...customer, number: e.target.value });
                              if (formErrors.number) setFormErrors({ ...formErrors, number: '' });
                            }}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <Input
                            label="Bairro"
                            placeholder="Seu bairro"
                            value={customer.neighborhood}
                            error={formErrors.neighborhood}
                            onChange={(e) => {
                              setCustomer({ ...customer, neighborhood: e.target.value });
                              if (formErrors.neighborhood)
                                setFormErrors({ ...formErrors, neighborhood: '' });
                            }}
                            required
                          />
                          <Input
                            label="Complemento (opcional)"
                            placeholder="Apto, bloco, referência..."
                            value={customer.complement}
                            onChange={(e) =>
                              setCustomer({ ...customer, complement: e.target.value })
                            }
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3.5">
                          <div className="col-span-2">
                            <Input
                              label="Cidade"
                              placeholder="Sua cidade"
                              value={customer.city}
                              error={formErrors.city}
                              onChange={(e) => {
                                setCustomer({ ...customer, city: e.target.value });
                                if (formErrors.city) setFormErrors({ ...formErrors, city: '' });
                              }}
                              required
                            />
                          </div>
                          <Input
                            label="UF"
                            placeholder="SP"
                            maxLength={2}
                            value={customer.state}
                            error={formErrors.state}
                            onChange={(e) => {
                              setCustomer({
                                ...customer,
                                state: e.target.value.toUpperCase().slice(0, 2),
                              });
                              if (formErrors.state) setFormErrors({ ...formErrors, state: '' });
                            }}
                            required
                          />
                        </div>

                        {/* Seleção da Modalidade de Frete */}
                        {shippingOptions.length > 0 && (
                          <div className="pt-2 space-y-2">
                            <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                              Escolha a modalidade de envio
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {shippingOptions.map((opt) => {
                                const isSelected =
                                  selectedShipping?.serviceCode === opt.serviceCode;
                                const displayPrice = offerData.offer.freeShipping ? 0 : opt.price;
                                return (
                                  <button
                                    key={opt.serviceCode}
                                    type="button"
                                    onClick={() => setSelectedShipping(opt)}
                                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-500/10 border-indigo-500 shadow-xs'
                                        : 'bg-[var(--bg-subtle)]/40 border-[var(--border-subtle)] hover:border-indigo-500/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                          isSelected
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-[var(--border-strong)]'
                                        }`}
                                      >
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                                          {cleanText(opt.serviceName)}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-secondary)]">
                                          Receba em até {opt.estimatedDays} dias úteis
                                        </div>
                                      </div>
                                    </div>
                                    <div
                                      className={`font-mono text-xs font-bold shrink-0 tabular-nums ${
                                        displayPrice === 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-[var(--text-primary)]'
                                      }`}
                                    >
                                      {displayPrice === 0
                                        ? 'Grátis'
                                        : formatCurrencyBRL(displayPrice)}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ETAPA 3: FORMA DE PAGAMENTO */}
                    <div className="modern-card rounded-2xl p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border-subtle)]">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          3
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-[var(--text-primary)]">
                            Forma de pagamento
                          </h2>
                          <p className="text-[11px] text-[var(--text-secondary)]">
                            Escolha como prefere pagar seu pedido
                          </p>
                        </div>
                      </div>

                      {/* Seletor de Método */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          {
                            id: 'PIX' as const,
                            label: 'PIX',
                            sub: 'Aprovação imediata',
                            icon: <QrCode className="w-4 h-4" />,
                          },
                          {
                            id: 'CREDIT_CARD' as const,
                            label: 'Cartão',
                            sub: 'Em até 12x',
                            icon: <CreditCard className="w-4 h-4" />,
                          },
                          {
                            id: 'BOLETO' as const,
                            label: 'Boleto',
                            sub: 'À vista',
                            icon: <FileText className="w-4 h-4" />,
                          },
                        ].map((m) => {
                          const active = paymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                                active
                                  ? 'bg-indigo-500/10 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                  : 'bg-[var(--bg-subtle)]/40 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                {m.icon}
                                {m.id === 'PIX' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    Mais rápido
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-[var(--text-primary)]">
                                  {m.label}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)]">{m.sub}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Detalhe Contextual do Método Selecionado */}
                      {paymentMethod === 'PIX' && (
                        <div className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-4 flex items-start gap-3 text-xs">
                          <QrCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-[var(--text-secondary)]">
                            <div className="font-bold text-[var(--text-primary)]">
                              Liberação imediata com PIX ({formatCurrencyBRL(finalTotal)})
                            </div>
                            <p className="leading-relaxed">
                              Ao clicar em finalizar compra, você receberá o QR Code e o código{' '}
                              <strong>PIX Copia e Cola</strong> na tela seguinte. A confirmação é instantânea.
                            </p>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'CREDIT_CARD' && (
                        <div className="bg-[var(--bg-subtle)]/40 border border-[var(--border-subtle)] rounded-xl p-4 space-y-3.5">
                          <Input
                            label="Número do cartão"
                            placeholder="0000 0000 0000 0000"
                            value={cardData.number}
                            error={formErrors.cardNumber}
                            onChange={(e) => {
                              setCardData({
                                ...cardData,
                                number: formatCardNumberMask(e.target.value),
                              });
                              if (formErrors.cardNumber)
                                setFormErrors({ ...formErrors, cardNumber: '' });
                            }}
                          />
                          <Input
                            label="Nome impresso no cartão"
                            placeholder="Como está no cartão"
                            value={cardData.holderName}
                            error={formErrors.cardHolder}
                            onChange={(e) => {
                              setCardData({
                                ...cardData,
                                holderName: e.target.value.toUpperCase(),
                              });
                              if (formErrors.cardHolder)
                                setFormErrors({ ...formErrors, cardHolder: '' });
                            }}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Validade (MM/AA)"
                              placeholder="MM/AA"
                              value={cardData.expiry}
                              error={formErrors.cardExpiry}
                              onChange={(e) => {
                                setCardData({
                                  ...cardData,
                                  expiry: formatCardExpiryMask(e.target.value),
                                });
                                if (formErrors.cardExpiry)
                                  setFormErrors({ ...formErrors, cardExpiry: '' });
                              }}
                            />
                            <Input
                              label="CVV"
                              placeholder="123"
                              maxLength={4}
                              value={cardData.cvv}
                              error={formErrors.cardCvv}
                              onChange={(e) => {
                                setCardData({
                                  ...cardData,
                                  cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                                });
                                if (formErrors.cardCvv)
                                  setFormErrors({ ...formErrors, cardCvv: '' });
                              }}
                            />
                          </div>
                          <Select
                            label="Parcelamento"
                            value={cardData.installments}
                            onChange={(e) =>
                              setCardData({ ...cardData, installments: e.target.value })
                            }
                            options={Array.from({ length: 12 }, (_, i) => {
                              const n = i + 1;
                              const val = finalTotal / n;
                              return {
                                value: String(n),
                                label: `${n}x de ${formatCurrencyBRL(val)} sem juros (${formatCurrencyBRL(finalTotal)})`,
                              };
                            })}
                          />
                        </div>
                      )}

                      {paymentMethod === 'BOLETO' && (
                        <div className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-4 flex items-start gap-3 text-xs">
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-[var(--text-secondary)]">
                            <div className="font-bold text-[var(--text-primary)]">
                              Boleto Bancário à vista ({formatCurrencyBRL(finalTotal)})
                            </div>
                            <p className="leading-relaxed">
                              O boleto será gerado na confirmação do pedido com vencimento em 2 dias úteis. A compensação bancária pode levar até 48h úteis.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* CTA Principal de Conversão */}
                      <div className="pt-2 space-y-3">
                        <Button
                          type="submit"
                          size="lg"
                          loading={submittingCheckout}
                          className="w-full py-4 text-base"
                          icon={<ArrowRight className="w-5 h-5" />}
                        >
                          Finalizar compra · {formatCurrencyBRL(finalTotal)}
                        </Button>

                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)] text-center">
                          <span className="inline-flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-500" />
                            Ambiente 100% seguro
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Nota fiscal eletrônica</span>
                          <span aria-hidden="true">·</span>
                          <span>Entrega com código de rastreio</span>
                          {sellerFirstName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Atendimento por {sellerFirstName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
