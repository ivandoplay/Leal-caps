import { PaymentStatus } from '../../src/types/domain.ts';

export interface ShippingQuoteOption {
  serviceCode: string;
  serviceName: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  isFallback?: boolean;
}

export interface ShippingQuoteResult {
  cep: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string;
  providerUsed: string;
  fallbackActivated: boolean;
  options: ShippingQuoteOption[];
}

export interface ShipmentCreationResult {
  provider: string;
  trackingCode: string;
  labelUrl: string;
  estimatedDays: number;
}

export interface TrackingInfoResult {
  trackingCode: string;
  status: 'QUOTED' | 'LABEL_GENERATED' | 'POSTED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED';
  events: {
    status: string;
    location: string;
    description: string;
    timestamp: string;
  }[];
}

export interface ShippingProvider {
  readonly providerName: string;
  quote(cep: string, totalUnits: number): Promise<ShippingQuoteResult>;
  createShipment(orderNumber: string, cep: string, serviceName: string): Promise<ShipmentCreationResult>;
  getTracking(trackingCode: string): Promise<TrackingInfoResult>;
  cancelShipment(trackingCode: string): Promise<{ cancelled: boolean; timestamp: string }>;
}

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  idempotencyKey: string;
  customerEmail: string;
}

export interface CreatePaymentOutput {
  externalReference: string;
  provider: string;
  status: PaymentStatus;
  gatewayFee: number;
  pixQrCode?: string;
}

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  event?: {
    webhookId: string;
    externalReference: string;
    newStatus: PaymentStatus;
  };
}

export interface PaymentProvider {
  readonly providerName: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput>;
  getPayment(externalReference: string): Promise<{ externalReference: string; status: PaymentStatus }>;
  refund(externalReference: string, amount: number): Promise<{ refunded: boolean; status: PaymentStatus }>;
  validateWebhook(rawPayload: string, signatureHeader: string | undefined): WebhookValidationResult;
}

export interface NotificationResult {
  messageId: string;
  provider: string;
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  sentAt: string;
}

export interface NotificationProvider {
  readonly providerName: string;
  sendWhatsApp(phone: string, message: string): Promise<NotificationResult>;
  sendEmail(email: string, subject: string, body: string): Promise<NotificationResult>;
}
