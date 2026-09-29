import React, { useState } from 'react';
import {
  Copy,
  DollarSign,
  ExternalLink,
  Link2,
  Lock,
  MessageSquarePlus,
  Package,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
  TrendingUp,
  UserCheck,
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Link creation state
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id || '');
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || '');
  const [selectedCouponCode, setSelectedCouponCode] = useState(coupons[0]?.code || '');
  const [creatingLink, setCreatingLink] = useState(false);

  // New coupon within seller rules
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState('10');

  // New lead interaction modal
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadOfferId, setNewLeadOfferId] = useState(offers[0]?.id || '');
  const [newLeadNote, setNewLeadNote] = useState('');

  // Horizontal access test state
  const [testingPriceTamper, setTestingPriceTamper] = useState(false);

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
    if (!selectedOfferId) return;
    setCreatingLink(true);
    try {
      const res = await fetch('/api/seller/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: selectedOfferId,
          campaignId: selectedCampaignId,
          couponCode: selectedCouponCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify(data.error || 'Erro ao gerar link.', 'error');
      } else {
        onNotify(`Link rastreável /o/${data.link.code} gerado com sucesso!`, 'success');
        onRefresh();
      }
    } finally {
      setCreatingLink(false);
    }
  };

  const handleSimulateUnauthorizedPriceTamper = async () => {
    setTestingPriceTamper(true);
    try {
      const res = await fetch('/api/seller/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          offerId: selectedOfferId || offers[0]?.id,
          customPrice: 49.9, // Tentativa ilegal de alterar preço pelo vendedor
        }),
      });
      const data = await res.json();
      onNotify(data.error || 'Bloqueado pelo backend!', 'error');
    } finally {
      setTestingPriceTamper(false);
    }
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
      onNotify(`Lead ${data.lead.name} registrado com oferta apresentada!`, 'success');
      setLeadModalOpen(false);
      setNewLeadName('');
      setNewLeadContact('');
      setNewLeadNote('');
      onRefresh();
    } else {
      onNotify(data.error || 'Erro ao criar lead.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Seller Attribution Banner */}
      <div className="bg-[#11141B] border border-[#232938] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone="lime">PAINEL DO VENDEDOR</Badge>
          <span className="text-sm font-bold text-[#F3F5F8]">{user.name}</span>
          <span className="text-xs font-mono text-[#06B6D4]">{user.sellerCode}</span>
        </div>
        <div className="text-xs text-[#94A3B8] flex items-center gap-4">
          <span>
            Regra de Atribuição:{' '}
            <strong className="text-[#F3F5F8]">CLIENTE = Pertence à Operação</strong> •{' '}
            <strong className="text-[#A3E635]">VENDA = Atribuída ao Vendedor ({user.commissionRate}%)</strong>
          </span>
        </div>
      </div>

      {/* TAB: DASHBOARD VENDEDOR */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KPI
              label="Faturamento Atribuído"
              value={`R$ ${attributedRevenue.toFixed(2)}`}
              subvalue={`${approvedOrders.length} pedidos pagos`}
              accent="lime"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KPI
              label="Comissão Acumulada"
              value={`R$ ${totalCommission.toFixed(2)}`}
              subvalue={`Alíquota: ${user.commissionRate}% congelada`}
              accent="emerald"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KPI
              label="Ticket Médio"
              value={`R$ ${avgTicket.toFixed(2)}`}
              subvalue="Apenas vendas aprovadas"
              accent="cyan"
            />
            <KPI
              label="Conversão de Links"
              value={`${conversionRate.toFixed(1)}%`}
              subvalue={`${totalClicks} cliques → ${orders.length} pedidos`}
              accent="amber"
            />
            <KPI
              label="Leads Atribuídos"
              value={leads.length}
              subvalue="Em atendimento consultivo"
              accent="lime"
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Meus Links de Oferta Rastreáveis"
              subtitle="Links ativos vinculados ao seu código de vendedor"
              action={
                <Button size="xs" onClick={() => setActiveTab('CRIAR_LINK')}>
                  + Gerar Link
                </Button>
              }
            >
              <div className="space-y-3">
                {offerLinks.map((lnk) => {
                  const fullUrl = `${window.location.origin}/o/${lnk.code}`;
                  return (
                    <div
                      key={lnk.id}
                      className="bg-[#171B24] border border-[#232938] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#A3E635]">
                            {fullUrl}
                          </span>
                          {lnk.couponCode && <Badge tone="cyan">CUPOM: {lnk.couponCode}</Badge>}
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-1">
                          Cliques: <strong className="text-white">{lnk.clicks}</strong> • Conversões:{' '}
                          <strong className="text-[#10B981]">{lnk.conversions}</strong>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={<Copy className="w-3.5 h-3.5" />}
                          onClick={() => {
                            navigator.clipboard?.writeText(fullUrl);
                            onNotify(`Link copiado: ${fullUrl}`, 'success');
                          }}
                        >
                          Copiar Link
                        </Button>
                        <Button
                          variant="primary"
                          size="xs"
                          icon={<ExternalLink className="w-3.5 h-3.5" />}
                          onClick={() => onOpenPublicLink(lnk.code)}
                        >
                          Abrir Oferta
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="Pedidos Recentes Atribuídos"
              subtitle="Acompanhe status financeiro e logístico para suporte ao cliente"
            >
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setActiveTab('PEDIDOS');
                    }}
                    className="bg-[#171B24] border border-[#232938] hover:border-[#A3E635]/40 rounded-lg p-3.5 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#F3F5F8]">
                          {ord.orderNumber}
                        </span>
                        <StatusBadge status={ord.consolidatedStatus} />
                      </div>
                      <div className="text-xs text-[#94A3B8] mt-1">
                        {ord.customerSnapshot.name} • {ord.offerName}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-[#A3E635]">
                        R$ {ord.total.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {ord.trackingCode || 'Sem rastreio'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: LEADS ATRIBUÍDOS */}
      {activeTab === 'LEADS' && (
        <Card
          title="Meus Leads & Pipeline Consultivo"
          subtitle="Registre tanto as ofertas apresentadas quanto as ofertas compradas pelo lead"
          action={
            <Button
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setLeadModalOpen(true)}
            >
              Novo Lead / Atendimento
            </Button>
          }
        >
          <div className="space-y-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="bg-[#171B24] border border-[#232938] rounded-xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#F3F5F8]">{lead.name}</h4>
                    <span className="text-xs font-mono text-[#94A3B8]">
                      {lead.contact} • Origem: {lead.origin}
                    </span>
                  </div>
                  <StatusBadge status={lead.stage} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#090B0E] p-3 rounded-lg border border-[#232938] text-xs">
                  <div>
                    <span className="text-[#94A3B8] font-semibold block mb-1">
                      Ofertas Apresentadas (Histórico Comercial):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.offersPresented.map((oid) => {
                        const o = offers.find((x) => x.id === oid);
                        return (
                          <Badge key={oid} tone="cyan">
                            {o ? `${o.code} (${o.name.slice(0, 22)}...)` : oid}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] font-semibold block mb-1">
                      Ofertas Compradas (Conversões):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.offersPurchased.length === 0 ? (
                        <span className="text-[#64748B]">Ainda não comprou</span>
                      ) : (
                        lead.offersPurchased.map((oid) => {
                          const o = offers.find((x) => x.id === oid);
                          return (
                            <Badge key={oid} tone="emerald">
                              {o ? o.code : oid}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {lead.interactions.length > 0 && (
                  <div className="text-xs text-[#94A3B8] bg-[#11141B] p-2.5 rounded border border-[#232938]">
                    <strong className="text-[#A3E635]">Última interação:</strong>{' '}
                    {lead.interactions[0].note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB: CLIENTES */}
      {activeTab === 'CLIENTES' && (
        <Card
          title="Clientes Atendidos"
          subtitle="Clientes com compras atribuídas à sua carteira (Dados sensíveis protegidos pela operação)"
        >
          {customers.length === 0 ? (
            <EmptyState
              title="Nenhum cliente atribuído"
              description="Assim que seus links converterem pedidos, os clientes aparecerão aqui."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#232938] text-[#94A3B8] uppercase">
                    <th className="py-3 px-3">Nome</th>
                    <th className="py-3 px-3">Contato</th>
                    <th className="py-3 px-3">Cidade/UF</th>
                    <th className="py-3 px-3">Titularidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2330]">
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-3 font-semibold text-[#F3F5F8]">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-[#94A3B8]">{c.phone}</td>
                      <td className="py-3 px-3 text-[#94A3B8]">
                        {c.city} / {c.state}
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone="slate">CLIENTE DA OPERAÇÃO LEAL CAPS</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB: OFERTAS AUTORIZADAS & CRIAR LINK */}
      {(activeTab === 'OFERTAS' || activeTab === 'CRIAR_LINK') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card
              title="Catálogo de Ofertas Autorizadas pelo Motor Comercial"
              subtitle="Você só visualiza e opera condições ativas e aprovadas pelo Compliance Gate. Preços são travados no servidor."
            >
              <div className="space-y-3">
                {offers.map((off) => (
                  <div
                    key={off.id}
                    className="bg-[#171B24] border border-[#232938] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="lime">/o/{off.code}</Badge>
                        <Badge tone="cyan">{off.offerType}</Badge>
                        <StatusBadge status={off.complianceStatus} />
                      </div>
                      <h4 className="text-sm font-bold text-[#F3F5F8]">{off.name}</h4>
                      <p className="text-xs text-[#94A3B8]">{off.eligibilityRules}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#64748B] line-through font-mono">
                        R$ {off.regularPrice.toFixed(2)}
                      </div>
                      <div className="text-lg font-bold font-mono text-[#A3E635]">
                        R$ {off.promotionalPrice.toFixed(2)}
                      </div>
                      <Button
                        size="xs"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => {
                          setSelectedOfferId(off.id);
                          setActiveTab('CRIAR_LINK');
                        }}
                      >
                        Selecionar Oferta
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card
              title="Gerador de Link Rastreável"
              subtitle="Associa oferta autorizada + campanha + vendedor"
            >
              <form onSubmit={handleGenerateLink} className="space-y-4">
                <Select
                  label="Oferta Autorizada"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  options={offers.map((o) => ({
                    value: o.id,
                    label: `${o.code} — ${o.name} (R$ ${o.promotionalPrice})`,
                  }))}
                />
                <Select
                  label="Campanha de Origem"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Select
                  label="Cupom Associado (Opcional)"
                  value={selectedCouponCode}
                  onChange={(e) => setSelectedCouponCode(e.target.value)}
                  options={[
                    { value: '', label: 'Sem cupom padrão' },
                    ...coupons.map((c) => ({
                      value: c.code,
                      label: `${c.code} (${c.discountValue}${c.discountType === 'PERCENTAGE' ? '%' : ' R$'})`,
                    })),
                  ]}
                />
                <Button type="submit" loading={creatingLink} className="w-full" icon={<Link2 className="w-4 h-4" />}>
                  Gerar Link Rastreável (/o/...)
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t border-[#232938] space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Meus Links Gerados ({offerLinks.length})
                </div>
                {offerLinks.slice(0, 4).map((lnk) => {
                  const fullUrl = `${window.location.origin}/o/${lnk.code}`;
                  return (
                    <div
                      key={lnk.id}
                      className="bg-[#090B0E] border border-[#232938] rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs font-mono"
                    >
                      <span className="text-[#A3E635] truncate">{fullUrl}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(fullUrl);
                            onNotify(`Copiado: ${fullUrl}`, 'success');
                          }}
                          className="px-2 py-1 rounded bg-[#171B24] hover:bg-[#232938] text-[#F3F5F8] cursor-pointer"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPublicLink(lnk.code)}
                          className="px-2 py-1 rounded bg-[#A3E635] text-[#090B0E] font-bold cursor-pointer"
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="Gerar Cupom dentro da Regra"
              subtitle="Alçada máxima do vendedor: até 12% OFF"
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
                  Criar Cupom Autorizado
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* TAB: PEDIDOS & DETALHES */}
      {activeTab === 'PEDIDOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Meus Pedidos Atribuídos — Consulta Rápida de Atendimento"
              subtitle="Fluxo Seção 08: 'Como está meu pedido #LC-XXXXX?' → pesquise o código → veja dados permitidos → responda no WhatsApp"
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
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-[#A3E635]">
                        {ord.orderNumber}
                      </span>
                      <StatusBadge status={ord.consolidatedStatus} />
                    </div>
                    <div className="text-xs text-[#F3F5F8] font-semibold mt-1">
                      {ord.customerSnapshot.name} — {ord.offerName}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8] mt-2 font-mono">
                      <span>Total: R$ {ord.total.toFixed(2)}</span>
                      <span>Rastreio: {ord.trackingCode || 'Aguardando expedição'}</span>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNotify(
                            `Mensagem WhatsApp copiada: "Olá ${ord.customerSnapshot.name.split(' ')[0]}! Seu pedido ${ord.orderNumber} está com status ${ord.consolidatedStatus} (Rastreio: ${ord.trackingCode || 'em separação'})."`,
                            'success'
                          );
                        }}
                      >
                        Responder por WhatsApp
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
                title={`Timeline ${selectedOrder.orderNumber}`}
                subtitle="Histórico de eventos para atendimento ao cliente"
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
                description="Escolha um pedido ao lado para visualizar a timeline detalhada."
              />
            )}
          </div>
        </div>
      )}

      {/* TAB: COMISSÕES & HISTÓRICO */}
      {(activeTab === 'COMISSOES' || activeTab === 'HISTORICO') && (
        <Card
          title="Extrato de Comissões Congeladas por Pedido"
          subtitle="A comissão é congelada no ato do pedido (snapshot da regra) para que mudanças futuras nunca alterem vendas passadas."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232938] text-[#94A3B8] uppercase font-mono">
                  <th className="py-3 px-3">Pedido</th>
                  <th className="py-3 px-3">Base de Cálculo</th>
                  <th className="py-3 px-3">% Congelado</th>
                  <th className="py-3 px-3">Valor Comissão</th>
                  <th className="py-3 px-3">Regra Congelada (Snapshot)</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2330] font-mono">
                {commissions.map((com) => (
                  <tr key={com.id}>
                    <td className="py-3 px-3 font-bold text-[#A3E635]">{com.orderNumber}</td>
                    <td className="py-3 px-3">R$ {com.calculationBase.toFixed(2)}</td>
                    <td className="py-3 px-3">{com.percentage}%</td>
                    <td className="py-3 px-3 font-bold text-[#10B981]">
                      R$ {com.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-[#94A3B8]">{com.ruleUsed}</td>
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

      {/* Modal: Novo Lead */}
      <Modal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title="Registrar Lead & Oferta Apresentada"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Nome do Lead"
            value={newLeadName}
            onChange={(e) => setNewLeadName(e.target.value)}
            required
          />
          <Input
            label="WhatsApp / Contato"
            value={newLeadContact}
            onChange={(e) => setNewLeadContact(e.target.value)}
            required
          />
          <Select
            label="Oferta Apresentada no Atendimento"
            value={newLeadOfferId}
            onChange={(e) => setNewLeadOfferId(e.target.value)}
            options={offers.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
          />
          <Input
            label="Observação do Atendimento"
            value={newLeadNote}
            onChange={(e) => setNewLeadNote(e.target.value)}
            placeholder="Ex: Cliente interessada no Kit 2 unidades, enviado link /o/7XK29"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLeadModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Lead</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
