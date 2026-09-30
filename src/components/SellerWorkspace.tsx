import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Copy,
  DollarSign,
  ExternalLink,
  Link2,
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  KPI,
  Modal,
  Select,
  StatusBadge,
  Timeline,
  formatCurrencyBRL,
  formatOrderDateTimeBR,
} from './ui/DesignSystem.tsx';
import {
  Campaign,
  Commission,
  Coupon,
  Customer,
  Lead,
  Offer,
  OfferLink,
  Order,
  User,
} from '../types/domain.ts';

export type SellerTab =
  | 'DASHBOARD'
  | 'LEADS'
  | 'CLIENTES'
  | 'OFERTAS'
  | 'CRIAR_LINK'
  | 'PEDIDOS'
  | 'COMISSOES'
  | 'HISTORICO';

interface GainSimulation {
  valid: boolean;
  error?: string;
  code?: string;
  offerId: string;
  offerName?: string;
  salePrice: number;
  minimumPrice: number;
  basePrice: number;
  maximumPrice: number | null;
  commissionPercent: number;
  commissionAmount: number;
  surplusAmount: number;
  sellerEarnings: number;
}

const cleanText = (txt?: string | null) => (txt ? txt.replace(/\s*\[DEMO\]/g, '').trim() : '');

export const SellerWorkspace: React.FC<{
  activeTab: SellerTab;
  setActiveTab: (t: SellerTab) => void;
  user: User;
  token: string;
  offers: Offer[];
  offerLinks: OfferLink[];
  campaigns: Campaign[];
  coupons: Coupon[];
  leads: Lead[];
  customers: Customer[];
  orders: Order[];
  commissions: Commission[];
  onRefresh: () => void;
  onOpenPublicLink: (code: string) => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({
  activeTab,
  setActiveTab,
  user,
  token,
  offers,
  offerLinks,
  campaigns,
  coupons,
  leads,
  customers,
  orders,
  commissions,
  onRefresh,
  onOpenPublicLink,
  onNotify,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  // Negotiation / Link Generation state
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id || '');
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) || offers[0] || null;

  const [salePriceInput, setSalePriceInput] = useState<string>(() => {
    const first = offers[0];
    if (!first) return '';
    return String(first.basePrice ?? first.promotionalPrice);
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || '');
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const [simulation, setSimulation] = useState<GainSimulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [lastCreatedLink, setLastCreatedLink] = useState<OfferLink | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New coupon within seller rules
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState('10');

  // New lead interaction modal
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadOfferId, setNewLeadOfferId] = useState(offers[0]?.id || '');
  const [newLeadNote, setNewLeadNote] = useState('');

  // Select an offer to sell and prefill its base price
  const handleSelectOfferToSell = (offer: Offer) => {
    setSelectedOfferId(offer.id);
    const defaultPrice = offer.basePrice ?? offer.promotionalPrice;
    setSalePriceInput(String(defaultPrice));
    setSelectedCampaignId(offer.campaignId || campaigns[0]?.id || '');
    setSelectedCouponCode(offer.defaultCouponCode || '');
    setLastCreatedLink(null);
    if (activeTab !== 'OFERTAS' && activeTab !== 'CRIAR_LINK') {
      setActiveTab('OFERTAS');
    }
  };

  // Query backend simulation whenever offer or price changes
  const runBackendSimulation = useCallback(
    async (offerId: string, rawPrice: string) => {
      if (!offerId) return;
      const numericPrice = Number(String(rawPrice).replace(',', '.'));
      if (!rawPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
        setSimulation(null);
        return;
      }

      setSimulating(true);
      try {
        const res = await fetch('/api/seller/links/simulate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            offerId,
            salePrice: numericPrice,
          }),
        });
        const data = await res.json();
        setSimulation(data);
      } catch {
        // Fallback if network hiccup
      } finally {
        setSimulating(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedOffer) {
      runBackendSimulation(selectedOffer.id, salePriceInput);
    }
  }, [selectedOffer?.id, salePriceInput, runBackendSimulation]);

  const approvedOrders = orders.filter((o) => o.financialStatus === 'approved');
  const attributedRevenue = approvedOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCommission = commissions
    .filter((c) => c.status !== 'CANCELLED')
    .reduce((acc, c) => acc + c.amount, 0);
  const avgTicket = approvedOrders.length > 0 ? attributedRevenue / approvedOrders.length : 0;
  const totalClicks = offerLinks.reduce((acc, l) => acc + l.clicks, 0);
  const conversionRate = totalClicks > 0 ? (orders.length / totalClicks) * 100 : 0;

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;

    const numericPrice = Number(String(salePriceInput).replace(',', '.'));
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      onNotify('Informe um preço de venda válido.', 'error');
      return;
    }

    setCreatingLink(true);
    try {
      const res = await fetch('/api/seller/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          salePrice: numericPrice,
          campaignId: selectedCampaignId || undefined,
          couponCode: selectedCouponCode || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Erro ao gerar link da venda.', 'error');
      } else {
        setLastCreatedLink(data.link);
        onNotify(
          `Novo link único /o/${data.link.code} gerado! (Venda ${formatCurrencyBRL(data.link.salePrice)} · Seu ganho ${formatCurrencyBRL(data.link.sellerEarnings)})`,
          'success'
        );
        onRefresh();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleCopyLink = (code: string) => {
    const fullUrl = `${window.location.origin}/o/${code}`;
    navigator.clipboard?.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    onNotify(`Link copiado: ${fullUrl}`, 'success');
  };

  const handleCreateSellerCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: newCouponCode,
        discountType: 'PERCENTAGE',
        discountValue: Number(newCouponPercent),
        maxUsesGlobal: 50,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotify(data.error || 'Regra comercial violada.', 'error');
    } else {
      onNotify(`Cupom ${data.coupon.code} criado dentro da alçada comercial!`, 'success');
      setNewCouponCode('');
      onRefresh();
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/crm/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newLeadName,
        contact: newLeadContact,
        offerPresentedId: newLeadOfferId,
        note: newLeadNote,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onNotify(`Atendimento de ${data.lead.name} registrado com sucesso!`, 'success');
      setLeadModalOpen(false);
      setNewLeadName('');
      setNewLeadContact('');
      setNewLeadNote('');
      onRefresh();
    } else {
      onNotify(data.error || 'Erro ao criar lead.', 'error');
    }
  };

  const renderNegotiationRow = (lnk: OfferLink) => {
    const fullUrl = `${window.location.origin}/o/${lnk.code}`;
    const offerObj = offers.find((o) => o.id === lnk.offerId);
    const displayOfferName = cleanText(lnk.offerName || offerObj?.name || lnk.offerId);
    const salePrice = lnk.salePrice ?? offerObj?.promotionalPrice ?? 0;
    const earnings = lnk.sellerEarnings ?? 0;
    const commAmt = lnk.commissionAmount ?? 0;
    const surplusAmt = lnk.surplusAmount ?? 0;

    return (
      <div
        key={lnk.id}
        className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] hover:border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all"
      >
        <div className="space-y-1.5 min-w-0">
          {/* Formato Principal Solicitado: Produto X — R$ 350 — Ganho R$ 92 — 3 acessos — 1 venda */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
            <span className="font-bold text-[var(--text-primary)]">{displayOfferName}</span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">—</span>
            <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
              {formatCurrencyBRL(salePrice)}
            </span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">—</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              Ganho {formatCurrencyBRL(earnings)}
            </span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">—</span>
            <span className="text-[var(--text-secondary)] tabular-nums">
              {lnk.clicks} {lnk.clicks === 1 ? 'acesso' : 'acessos'}
            </span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">—</span>
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">
              {lnk.conversions} {lnk.conversions === 1 ? 'venda' : 'vendas'}
            </span>
          </div>

          {/* Sublinha com código único da negociação e composição do ganho */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[var(--text-secondary)]">
            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
              /o/{lnk.code}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Comissão ({lnk.commissionPercent ?? user.commissionRate}%): {formatCurrencyBRL(commAmt)}
              {surplusAmt > 0 ? ` + Excedente: ${formatCurrencyBRL(surplusAmt)}` : ''}
            </span>
            {lnk.couponCode && (
              <>
                <span aria-hidden="true">·</span>
                <span>Cupom: {lnk.couponCode}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-muted)] tabular-nums">
              {formatOrderDateTimeBR(lnk.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="xs"
            icon={copiedCode === lnk.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={() => handleCopyLink(lnk.code)}
          >
            {copiedCode === lnk.code ? 'Copiado' : 'Copiar link'}
          </Button>
          <Button
            variant="primary"
            size="xs"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => onOpenPublicLink(lnk.code)}
            title={fullUrl}
          >
            Abrir checkout
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Seller Header Banner */}
      <div className="modern-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone="lime">Vendedor</Badge>
          <span className="text-sm font-bold text-[var(--text-primary)]">{cleanText(user.name)}</span>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
            {user.sellerCode}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span>
            Comissão base:{' '}
            <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
              {user.commissionRate}% + 100% do excedente acima do preço-base
            </strong>
          </span>
          {activeTab !== 'OFERTAS' && (
            <Button size="xs" onClick={() => setActiveTab('OFERTAS')}>
              Nova Negociação / Vender
            </Button>
          )}
        </div>
      </div>

      {/* TAB: VISÃO GERAL DO VENDEDOR */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Minhas Vendas Pagas"
              value={formatCurrencyBRL(attributedRevenue)}
              subvalue={`${approvedOrders.length} pedidos aprovados · Ticket ${formatCurrencyBRL(avgTicket)}`}
              accent="lime"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KPI
              label="Meus Ganhos (Comissão + Excedente)"
              value={formatCurrencyBRL(totalCommission)}
              subvalue={`Comissão ${user.commissionRate}% + excedente integral`}
              accent="emerald"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KPI
              label="Conversão das Negociações"
              value={`${conversionRate.toFixed(1)}%`}
              subvalue={`${totalClicks} acessos → ${orders.length} vendas`}
              accent="cyan"
              icon={<Package className="w-4 h-4" />}
            />
            <KPI
              label="Links Gerados"
              value={offerLinks.length}
              subvalue="1 link único por negociação"
              accent="amber"
              icon={<Link2 className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <Card
                title="Histórico de Negociações (Links Gerados)"
                subtitle="Cada negociação gera um link único com preço e ganho congelados"
                action={
                  <Button size="xs" onClick={() => setActiveTab('OFERTAS')}>
                    + Nova Venda / Gerar Link
                  </Button>
                }
              >
                {offerLinks.length === 0 ? (
                  <EmptyState
                    title="Nenhuma negociação gerada"
                    description="Escolha uma oferta em Minhas Ofertas, defina o preço e gere o link único para seu cliente."
                  />
                ) : (
                  <div className="space-y-3">{offerLinks.map(renderNegotiationRow)}</div>
                )}
              </Card>
            </div>

            <div className="lg:col-span-5">
              <Card
                title="Meus Pedidos Recentes"
                subtitle="Pedidos vinculados aos seus links de negociação"
              >
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setActiveTab('PEDIDOS');
                      }}
                      className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] hover:border-indigo-500/40 rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {ord.orderNumber}
                          </span>
                          {ord.offerLinkCode && (
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                              · /o/{ord.offerLinkCode}
                            </span>
                          )}
                          <StatusBadge status={ord.consolidatedStatus} />
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          {cleanText(ord.customerSnapshot.name)} · {cleanText(ord.offerName)}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {formatCurrencyBRL(ord.total)}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {ord.trackingCode || 'Em separação'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MINHAS OFERTAS → VENDER → DEFINIR PREÇO → VER MEU GANHO → GERAR LINK */}
      {(activeTab === 'OFERTAS' || activeTab === 'CRIAR_LINK') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* PASSO 1: MINHAS OFERTAS (ESCOLHER OFERTA E CLICAR EM VENDER) */}
            <div className="lg:col-span-7 space-y-4">
              <Card
                title="1. Minhas Ofertas Disponíveis"
                subtitle="Escolha a oferta que deseja negociar e clique em Vender para definir o preço"
              >
                <div className="space-y-3">
                  {offers.map((off) => {
                    const isSelected = selectedOffer?.id === off.id;
                    const minPrice = off.minimumPrice ?? Number((off.promotionalPrice * 0.75).toFixed(2));
                    const basePrice = off.basePrice ?? off.promotionalPrice;
                    const maxPrice = off.maximumPrice ?? null;
                    const commPct = off.commissionPercent ?? user.commissionRate;

                    return (
                      <div
                        key={off.id}
                        className={`rounded-xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-indigo-500/5 border-indigo-500 shadow-sm'
                            : 'bg-[var(--bg-subtle)]/60 border-[var(--border-subtle)] hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {off.totalUnits} {off.totalUnits === 1 ? 'unidade' : 'unidades'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Comissão {commPct}%</span>
                            {off.freeShipping && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  Frete Grátis
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                            {cleanText(off.name)}
                          </h4>

                          {/* Regras Comerciais da Oferta */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] font-mono pt-0.5">
                            <span>
                              Mínimo:{' '}
                              <strong className="text-[var(--text-primary)]">
                                {formatCurrencyBRL(minPrice)}
                              </strong>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Preço-base:{' '}
                              <strong className="text-indigo-600 dark:text-indigo-400">
                                {formatCurrencyBRL(basePrice)}
                              </strong>
                            </span>
                            {maxPrice !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Teto:{' '}
                                  <strong className="text-[var(--text-primary)]">
                                    {formatCurrencyBRL(maxPrice)}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={() => handleSelectOfferToSell(off)}
                          >
                            {isSelected ? 'Negociando esta oferta' : 'Vender'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* PASSOS 2 A 4: DEFINIR PREÇO → VER SIMULAÇÃO DO GANHO → GERAR LINK ÚNICO */}
            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
              <Card
                title="2. Definir Preço e Simular Ganho"
                subtitle={
                  selectedOffer
                    ? cleanText(selectedOffer.name)
                    : 'Selecione uma oferta ao lado para iniciar'
                }
              >
                {selectedOffer ? (
                  <form onSubmit={handleGenerateLink} className="space-y-4">
                    {/* Resumo das regras da oferta selecionada */}
                    <div className="grid grid-cols-3 gap-2 bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] rounded-xl p-3 text-center">
                      <div>
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          Preço mínimo
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] tabular-nums">
                          {formatCurrencyBRL(
                            selectedOffer.minimumPrice ??
                              Number((selectedOffer.promotionalPrice * 0.75).toFixed(2))
                          )}
                        </span>
                      </div>
                      <div className="border-x border-[var(--border-subtle)]">
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          Preço-base
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatCurrencyBRL(
                            selectedOffer.basePrice ?? selectedOffer.promotionalPrice
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          Comissão
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {selectedOffer.commissionPercent ?? user.commissionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Input do Preço da Negociação */}
                    <div className="space-y-2">
                      <Input
                        label="Preço que deseja cobrar do cliente (R$)"
                        type="number"
                        step="0.01"
                        value={salePriceInput}
                        onChange={(e) => {
                          setSalePriceInput(e.target.value);
                          setLastCreatedLink(null);
                        }}
                        placeholder="Ex: 350.00"
                        required
                      />

                      {/* Atalhos rápidos de preço */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] mr-1">
                          Sugestões:
                        </span>
                        {[
                          {
                            label: 'Mínimo',
                            val:
                              selectedOffer.minimumPrice ??
                              Number((selectedOffer.promotionalPrice * 0.75).toFixed(2)),
                          },
                          {
                            label: 'Preço-base',
                            val: selectedOffer.basePrice ?? selectedOffer.promotionalPrice,
                          },
                          {
                            label: '+ R$ 50',
                            val: Number(
                              (
                                (selectedOffer.basePrice ?? selectedOffer.promotionalPrice) + 50
                              ).toFixed(2)
                            ),
                          },
                          {
                            label: '+ R$ 100',
                            val: Number(
                              (
                                (selectedOffer.basePrice ?? selectedOffer.promotionalPrice) + 100
                              ).toFixed(2)
                            ),
                          },
                        ]
                          .filter(
                            (preset) =>
                              !selectedOffer.maximumPrice ||
                              preset.val <= selectedOffer.maximumPrice
                          )
                          .map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setSalePriceInput(String(preset.val));
                                setLastCreatedLink(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[var(--bg-subtle)] hover:bg-indigo-500/10 text-[var(--text-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400 border border-[var(--border-subtle)] transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {preset.label} ({formatCurrencyBRL(preset.val)})
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Simulação do Ganho em Tempo Real (Fonte da Verdade no Servidor) */}
                    {simulation && !simulation.valid && (
                      <div className="rounded-xl p-3.5 bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        {simulation.error}
                      </div>
                    )}

                    {simulation && simulation.valid && (
                      <div className="rounded-xl p-4 bg-emerald-500/5 border border-emerald-500/25 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                          <span>Simulação do seu ganho nesta venda</span>
                          {simulating && (
                            <span className="text-[11px] text-[var(--text-muted)] font-normal">
                              Calculando...
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs border-t border-emerald-500/15 pt-2.5">
                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>Preço cobrado do cliente</span>
                            <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                              {formatCurrencyBRL(simulation.salePrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>Comissão ({simulation.commissionPercent}%)</span>
                            <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                              {formatCurrencyBRL(simulation.commissionAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <span>
                              Excedente acima de {formatCurrencyBRL(simulation.basePrice)} (100% seu)
                            </span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              + {formatCurrencyBRL(simulation.surplusAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-emerald-500/20">
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            Ganho total do vendedor
                          </span>
                          <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrencyBRL(simulation.sellerEarnings)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Opções adicionais discretas (Campanha / Cupom) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                      >
                        {showAdvancedOptions
                          ? 'Ocultar campanha e cupom opcional'
                          : 'Configurar campanha ou cupom (opcional)'}
                      </button>

                      {showAdvancedOptions && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                          <Select
                            label="Campanha de Origem"
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            options={campaigns.map((c) => ({
                              value: c.id,
                              label: cleanText(c.name),
                            }))}
                          />
                          <Select
                            label="Cupom Associado (Opcional)"
                            value={selectedCouponCode}
                            onChange={(e) => setSelectedCouponCode(e.target.value)}
                            options={[
                              { value: '', label: 'Sem cupom vinculado' },
                              ...coupons.map((c) => ({
                                value: c.code,
                                label: `${c.code} (${c.discountValue}${c.discountType === 'PERCENTAGE' ? '%' : ' R$'})`,
                              })),
                            ]}
                          />
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      loading={creatingLink}
                      disabled={!simulation || !simulation.valid}
                      className="w-full"
                      icon={<Link2 className="w-4 h-4" />}
                    >
                      Gerar link da venda
                    </Button>
                  </form>
                ) : (
                  <EmptyState
                    title="Escolha uma oferta"
                    description="Clique em Vender em uma das ofertas ao lado."
                  />
                )}

                {/* Link recém-gerado pronto para copiar e enviar ao cliente */}
                {lastCreatedLink && (
                  <div className="mt-5 pt-5 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="rounded-xl p-4 bg-indigo-500/10 border border-indigo-500/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Novo link único gerado para esta negociação!
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          Ganho: {formatCurrencyBRL(lastCreatedLink.sellerEarnings)}
                        </span>
                      </div>

                      <div className="bg-[var(--bg-surface)] px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] font-mono text-xs font-bold text-[var(--text-primary)] select-all break-all">
                        {`${window.location.origin}/o/${lastCreatedLink.code}`}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          size="xs"
                          className="flex-1"
                          icon={
                            copiedCode === lastCreatedLink.code ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )
                          }
                          onClick={() => handleCopyLink(lastCreatedLink.code)}
                        >
                          {copiedCode === lastCreatedLink.code
                            ? 'Link copiado!'
                            : 'Copiar link da venda'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => onOpenPublicLink(lastCreatedLink.code)}
                        >
                          Abrir checkout
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card
                title="Criar Cupom Rápido"
                subtitle="Desconto autorizado para vendedores (até 12% OFF)"
              >
                <form onSubmit={handleCreateSellerCoupon} className="space-y-3">
                  <Input
                    label="Código do Cupom"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="Ex: CAMILA10"
                    required
                  />
                  <Input
                    label="Percentual de Desconto (Máx 12%)"
                    type="number"
                    value={newCouponPercent}
                    onChange={(e) => setNewCouponPercent(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="secondary" size="sm" className="w-full">
                    Criar Cupom
                  </Button>
                </form>
              </Card>
            </div>
          </div>

          {/* HISTÓRICO DE NEGOCIAÇÕES (CADA LINHA É UM LINK ÚNICO) */}
          <Card
            title="Histórico de Negociações (Meus Links Gerados)"
            subtitle="Cada linha representa uma negociação e um link único (/o/XXXXXX)"
          >
            {offerLinks.length === 0 ? (
              <EmptyState
                title="Nenhum link gerado ainda"
                description="Gere seu primeiro link de venda acima para acompanhar acessos e conversões."
              />
            ) : (
              <div className="space-y-3">{offerLinks.map(renderNegotiationRow)}</div>
            )}
          </Card>
        </div>
      )}

      {/* TAB: PEDIDOS */}
      {activeTab === 'PEDIDOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Meus Pedidos"
              subtitle="Acompanhe o pagamento, o link que originou a venda e o código de rastreio"
            >
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedOrder?.id === ord.id
                        ? 'bg-indigo-500/10 border-indigo-500'
                        : 'bg-[var(--bg-subtle)]/50 border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {ord.orderNumber}
                        </span>
                        {ord.offerLinkCode && (
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            · Link /o/{ord.offerLinkCode}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={ord.consolidatedStatus} />
                    </div>
                    <div className="text-xs text-[var(--text-primary)] font-semibold mt-1">
                      {cleanText(ord.customerSnapshot.name)} — {cleanText(ord.offerName)}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] mt-2 font-mono">
                      <span>Total: {formatCurrencyBRL(ord.total)}</span>
                      <span>Rastreio: {ord.trackingCode || 'Aguardando expedição'}</span>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotify(
                            `Mensagem WhatsApp copiada: "Olá ${cleanText(ord.customerSnapshot.name).split(' ')[0]}! Seu pedido ${ord.orderNumber} está com status ${ord.consolidatedStatus} (Rastreio: ${ord.trackingCode || 'em separação'})."`,
                            'success'
                          );
                        }}
                      >
                        Copiar Status p/ WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div>
            {selectedOrder ? (
              <Card
                title={`Histórico ${selectedOrder.orderNumber}`}
                subtitle={cleanText(selectedOrder.customerSnapshot.name)}
              >
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
                title="Selecione um Pedido"
                description="Escolha um pedido ao lado para ver o histórico."
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: CLIENTES */}
      {activeTab === 'CLIENTES' && (
        <Card title="Clientes Atendidos" subtitle="Clientes que compraram através dos seus links">
          {customers.length === 0 ? (
            <EmptyState
              title="Nenhum cliente atribuído"
              description="Assim que seus links gerarem pedidos, os clientes aparecerão aqui."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    <th className="py-3 px-3">Nome</th>
                    <th className="py-3 px-3">Contato</th>
                    <th className="py-3 px-3">Cidade/UF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                        {cleanText(c.name)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-secondary)]">{c.phone}</td>
                      <td className="py-3 px-3 text-[var(--text-secondary)]">
                        {c.city} / {c.state}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB: ATENDIMENTOS / LEADS */}
      {activeTab === 'LEADS' && (
        <Card
          title="Meus Atendimentos em Aberto"
          subtitle="Contatos interessados que receberam links de negociação"
          action={
            <Button
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setLeadModalOpen(true)}
            >
              Novo Atendimento
            </Button>
          }
        >
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-[var(--bg-subtle)]/50 border border-[var(--border-subtle)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {cleanText(lead.name)}
                  </h4>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {lead.contact} · Origem: {cleanText(lead.origin)}
                  </span>
                </div>
                <StatusBadge status={lead.stage} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB: COMISSÕES */}
      {(activeTab === 'COMISSOES' || activeTab === 'HISTORICO') && (
        <Card
          title="Meus Ganhos e Comissões por Pedido"
          subtitle="Comissão percentual + excedente integral acima do preço-base congelados por negociação"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <th className="py-3 px-3">Pedido</th>
                  <th className="py-3 px-3">Link</th>
                  <th className="py-3 px-3">Valor Venda</th>
                  <th className="py-3 px-3">Comissão</th>
                  <th className="py-3 px-3">Excedente</th>
                  <th className="py-3 px-3">Ganho Total</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                {commissions.map((com) => (
                  <tr key={com.id}>
                    <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {com.orderNumber}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {com.offerLinkCode ? `/o/${com.offerLinkCode}` : '-'}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {formatCurrencyBRL(com.calculationBase)}
                    </td>
                    <td className="py-3 px-3 tabular-nums">
                      {formatCurrencyBRL(com.commissionAmount ?? com.amount)} ({com.percentage}%)
                    </td>
                    <td className="py-3 px-3 tabular-nums text-[var(--text-secondary)]">
                      {com.surplusAmount && com.surplusAmount > 0
                        ? `+ ${formatCurrencyBRL(com.surplusAmount)}`
                        : 'R$ 0,00'}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrencyBRL(com.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={com.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title="Registrar Novo Atendimento"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Nome do Cliente"
            value={newLeadName}
            onChange={(e) => setNewLeadName(e.target.value)}
            required
          />
          <Input
            label="WhatsApp"
            value={newLeadContact}
            onChange={(e) => setNewLeadContact(e.target.value)}
            required
          />
          <Select
            label="Oferta Enviada"
            value={newLeadOfferId}
            onChange={(e) => setNewLeadOfferId(e.target.value)}
            options={offers.map((o) => ({ value: o.id, label: `${o.code} - ${cleanText(o.name)}` }))}
          />
          <Input
            label="Observação"
            value={newLeadNote}
            onChange={(e) => setNewLeadNote(e.target.value)}
            placeholder="Ex: Enviado link único no WhatsApp"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLeadModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
