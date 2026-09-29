import React, { useState } from 'react';
import {
  Copy,
  DollarSign,
  ExternalLink,
  Link2,
  Package,
  Plus,
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

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

  return (
    <div className="space-y-6">
      {/* Seller Header Banner */}
      <div className="modern-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge tone="lime">Vendedor</Badge>
          <span className="text-sm font-bold text-[var(--text-primary)]">{user.name}</span>
          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
            {user.sellerCode}
          </span>
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          Comissão ativa:{' '}
          <strong className="text-emerald-600 dark:text-emerald-400">
            {user.commissionRate}% por venda aprovada
          </strong>
        </div>
      </div>

      {/* TAB: VISÃO GERAL DO VENDEDOR */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI
              label="Minhas Vendas Pagas"
              value={`R$ ${attributedRevenue.toFixed(2)}`}
              subvalue={`${approvedOrders.length} pedidos aprovados · Ticket R$ ${avgTicket.toFixed(2)}`}
              accent="lime"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KPI
              label="Minha Comissão"
              value={`R$ ${totalCommission.toFixed(2)}`}
              subvalue={`Taxa: ${user.commissionRate}% por pedido`}
              accent="emerald"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KPI
              label="Conversão dos Links"
              value={`${conversionRate.toFixed(1)}%`}
              subvalue={`${totalClicks} cliques → ${orders.length} pedidos`}
              accent="cyan"
              icon={<Package className="w-4 h-4" />}
            />
            <KPI
              label="Contatos em Atendimento"
              value={leads.length}
              subvalue="Interessados registrados"
              accent="amber"
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Meus Links de Venda (/o/...)"
              subtitle="Copie e envie direto no WhatsApp do seu cliente"
              action={
                <Button size="xs" onClick={() => setActiveTab('OFERTAS')}>
                  + Gerar Novo Link
                </Button>
              }
            >
              <div className="space-y-3">
                {offerLinks.map((lnk) => {
                  const fullUrl = `${window.location.origin}/o/${lnk.code}`;
                  return (
                    <div
                      key={lnk.id}
                      className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {fullUrl}
                          </span>
                          {lnk.couponCode && <Badge tone="cyan">Cupom: {lnk.couponCode}</Badge>}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">
                          Cliques: <strong className="text-[var(--text-primary)]">{lnk.clicks}</strong> ·
                          Vendas:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {lnk.conversions}
                          </strong>
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
                          Abrir Checkout
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card
              title="Meus Pedidos Recentes"
              subtitle="Clique em um pedido para acompanhar o envio e atender o cliente"
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
                        <StatusBadge status={ord.consolidatedStatus} />
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] mt-1">
                        {ord.customerSnapshot.name} · {ord.offerName}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        R$ {ord.total.toFixed(2)}
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
      )}

      {/* TAB: OFERTAS & GERAR LINK */}
      {(activeTab === 'OFERTAS' || activeTab === 'CRIAR_LINK') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card
              title="Ofertas Disponíveis para Venda"
              subtitle="Escolha uma oferta abaixo para gerar seu link personalizado"
            >
              <div className="space-y-3">
                {offers.map((off) => (
                  <div
                    key={off.id}
                    className="bg-[var(--bg-subtle)]/60 border border-[var(--border-subtle)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge tone="lime">/o/{off.code}</Badge>
                        <Badge tone="cyan">{off.offerType}</Badge>
                        <StatusBadge status={off.status} />
                      </div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{off.name}</h4>
                      <p className="text-xs text-[var(--text-secondary)]">{off.eligibilityRules}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--text-muted)] line-through font-mono">
                        R$ {off.regularPrice.toFixed(2)}
                      </div>
                      <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        R$ {off.promotionalPrice.toFixed(2)}
                      </div>
                      <Button
                        size="xs"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => setSelectedOfferId(off.id)}
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
              title="Gerar Meu Link de Venda"
              subtitle="O link gerado atribui automaticamente a comissão a você"
            >
              <form onSubmit={handleGenerateLink} className="space-y-4">
                <Select
                  label="Oferta"
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
                <Button
                  type="submit"
                  loading={creatingLink}
                  className="w-full"
                  icon={<Link2 className="w-4 h-4" />}
                >
                  Gerar Link (/o/...)
                </Button>
              </form>
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
      )}

      {/* TAB: PEDIDOS */}
      {activeTab === 'PEDIDOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card
              title="Meus Pedidos"
              subtitle="Acompanhe o pagamento e o código de rastreio dos seus clientes"
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
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {ord.orderNumber}
                      </span>
                      <StatusBadge status={ord.consolidatedStatus} />
                    </div>
                    <div className="text-xs text-[var(--text-primary)] font-semibold mt-1">
                      {ord.customerSnapshot.name} — {ord.offerName}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] mt-2 font-mono">
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
                subtitle={selectedOrder.customerSnapshot.name}
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
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{c.name}</td>
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
          subtitle="Contatos interessados que receberam ofertas"
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
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{lead.name}</h4>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {lead.contact} · Origem: {lead.origin}
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
          title="Minhas Comissões por Pedido"
          subtitle="Valores calculados automaticamente sobre cada venda paga"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  <th className="py-3 px-3">Pedido</th>
                  <th className="py-3 px-3">Valor Base</th>
                  <th className="py-3 px-3">% Comissão</th>
                  <th className="py-3 px-3">Valor a Receber</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                {commissions.map((com) => (
                  <tr key={com.id}>
                    <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {com.orderNumber}
                    </td>
                    <td className="py-3 px-3">R$ {com.calculationBase.toFixed(2)}</td>
                    <td className="py-3 px-3">{com.percentage}%</td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      R$ {com.amount.toFixed(2)}
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
            options={offers.map((o) => ({ value: o.id, label: `${o.code} - ${o.name}` }))}
          />
          <Input
            label="Observação"
            value={newLeadNote}
            onChange={(e) => setNewLeadNote(e.target.value)}
            placeholder="Ex: Enviado link /o/7XK29 no WhatsApp"
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
