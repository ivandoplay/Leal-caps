-- LEAL CAPS — Normalized Relational Database Schema (Migration 001)
-- Enforces strict separation between Product, Offer, Campaign, Order, Payment, Shipment, CRM, and Governance

CREATE TABLE roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id VARCHAR(64) PRIMARY KEY,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  UNIQUE(role_id, resource, action)
);

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'VENDEDOR', 'FULFILLMENT')),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  seller_code VARCHAR(32) UNIQUE,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret VARCHAR(64),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(64) NOT NULL UNIQUE,
  internal_name VARCHAR(160) NOT NULL,
  commercial_name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  composition TEXT NOT NULL,
  presentation VARCHAR(120) NOT NULL,
  unit_quantity INTEGER NOT NULL CHECK (unit_quantity > 0),
  batch_number VARCHAR(64) NOT NULL,
  expiry_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'DRAFT')),
  regulatory_info TEXT NOT NULL,
  warnings TEXT NOT NULL,
  usage_instructions TEXT NOT NULL,
  restrictions TEXT NOT NULL,
  labeling_info TEXT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_documents (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  doc_type VARCHAR(64) NOT NULL,
  file_url TEXT NOT NULL,
  version VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('VALID', 'PENDING', 'EXPIRED')),
  uploaded_by VARCHAR(64) NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_images (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(160) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE product_claims (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  regulatory_basis VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('APPROVED', 'RESTRICTED', 'REJECTED')),
  approved_by VARCHAR(64) REFERENCES users(id),
  approved_at TIMESTAMP
);

CREATE TABLE product_regulatory_status (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  anvisa_classification VARCHAR(120) NOT NULL,
  notification_number VARCHAR(80) NOT NULL,
  compliance_status VARCHAR(32) NOT NULL CHECK (compliance_status IN ('APPROVED', 'UNDER_REVIEW', 'PENDING_DOCS', 'BLOCKED')),
  reviewed_by VARCHAR(64) REFERENCES users(id),
  reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE campaigns (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  channel VARCHAR(64) NOT NULL,
  origin VARCHAR(64) NOT NULL,
  media VARCHAR(64) NOT NULL,
  ad_name VARCHAR(160) NOT NULL,
  creative VARCHAR(160) NOT NULL,
  utm_source VARCHAR(100) NOT NULL,
  utm_medium VARCHAR(100) NOT NULL,
  utm_campaign VARCHAR(120) NOT NULL,
  utm_content VARCHAR(120) NOT NULL,
  responsible_seller_id VARCHAR(64) REFERENCES users(id),
  estimated_cac DECIMAL(10,2) NOT NULL DEFAULT 35.00,
  ad_spend DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offers (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  offer_type VARCHAR(32) NOT NULL CHECK (offer_type IN ('1_UNIT', 'KIT_2', 'KIT_3_PLUS', 'COMBO')),
  regular_price DECIMAL(10,2) NOT NULL CHECK (regular_price > 0),
  promotional_price DECIMAL(10,2) NOT NULL CHECK (promotional_price > 0),
  max_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  usage_limit INTEGER NOT NULL DEFAULT 500,
  usage_count INTEGER NOT NULL DEFAULT 0,
  free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  shipping_subsidy DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  extras TEXT,
  seller_id VARCHAR(64) REFERENCES users(id),
  campaign_id VARCHAR(64) REFERENCES campaigns(id),
  status VARCHAR(32) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED', 'DRAFT')),
  compliance_status VARCHAR(32) NOT NULL CHECK (compliance_status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offer_items (
  id VARCHAR(64) PRIMARY KEY,
  offer_id VARCHAR(64) NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE offer_rules (
  id VARCHAR(64) PRIMARY KEY,
  offer_id VARCHAR(64) NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  min_margin_percent DECIMAL(5,2) NOT NULL,
  max_coupon_discount_percent DECIMAL(5,2) NOT NULL,
  allowed_payment_methods TEXT NOT NULL,
  eligibility_notes TEXT
);

CREATE TABLE coupons (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses_global INTEGER NOT NULL CHECK (max_uses_global > 0),
  max_uses_per_customer INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMP NOT NULL,
  authorized_seller_id VARCHAR(64) REFERENCES users(id),
  authorized_campaign_id VARCHAR(64) REFERENCES campaigns(id),
  authorized_product_id VARCHAR(64) REFERENCES products(id),
  authorized_offer_id VARCHAR(64) REFERENCES offers(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(160) NOT NULL,
  cpf VARCHAR(20) NOT NULL,
  cep VARCHAR(16) NOT NULL,
  street VARCHAR(160) NOT NULL,
  number VARCHAR(32) NOT NULL,
  complement VARCHAR(80),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(8) NOT NULL,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  anonymized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupon_usages (
  id VARCHAR(64) PRIMARY KEY,
  coupon_id VARCHAR(64) NOT NULL REFERENCES coupons(id),
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
  order_id VARCHAR(64) NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leads (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  contact VARCHAR(80) NOT NULL,
  origin VARCHAR(80) NOT NULL,
  campaign_id VARCHAR(64) REFERENCES campaigns(id),
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  stage VARCHAR(32) NOT NULL CHECK (stage IN ('LEAD', 'INTERESSADO', 'OFERTA', 'CHECKOUT', 'CLIENTE', 'RECOMPRA')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_interaction_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_events (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) REFERENCES customers(id),
  lead_id VARCHAR(64) REFERENCES leads(id),
  event_type VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
  seller_id VARCHAR(64) REFERENCES users(id),
  offer_id VARCHAR(64) NOT NULL REFERENCES offers(id),
  campaign_id VARCHAR(64) REFERENCES campaigns(id),
  coupon_id VARCHAR(64) REFERENCES coupons(id),
  subtotal DECIMAL(10,2) NOT NULL,
  discount_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  financial_status VARCHAR(32) NOT NULL CHECK (financial_status IN ('pending', 'approved', 'declined', 'refunded', 'chargeback')),
  operational_status VARCHAR(32) NOT NULL CHECK (operational_status IN ('waiting', 'picking', 'packing', 'ready_to_ship', 'shipped', 'delivered', 'returned', 'exception')),
  consolidated_status VARCHAR(64) NOT NULL,
  exception_reason VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id),
  sku VARCHAR(64) NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL
);

CREATE TABLE order_events (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_name VARCHAR(64) NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  previous_value VARCHAR(120),
  new_value VARCHAR(120) NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  external_reference VARCHAR(120) NOT NULL UNIQUE,
  idempotency_key VARCHAR(120) NOT NULL UNIQUE,
  method VARCHAR(32) NOT NULL CHECK (method IN ('PIX', 'CREDIT_CARD', 'BOLETO')),
  amount DECIMAL(10,2) NOT NULL,
  gateway_fee DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('CREATED', 'PENDING', 'APPROVED', 'DECLINED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK')),
  pix_code TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_events (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  webhook_id VARCHAR(120) NOT NULL UNIQUE,
  status_from VARCHAR(32),
  status_to VARCHAR(32) NOT NULL,
  raw_payload TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  carrier_service VARCHAR(80) NOT NULL,
  quoted_price DECIMAL(10,2) NOT NULL,
  estimated_days INTEGER NOT NULL,
  tracking_code VARCHAR(64) UNIQUE,
  label_url TEXT,
  status VARCHAR(32) NOT NULL CHECK (status IN ('QUOTED', 'LABEL_GENERATED', 'POSTED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'RETURNED')),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shipment_events (
  id VARCHAR(64) PRIMARY KEY,
  shipment_id VARCHAR(64) NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(64) NOT NULL,
  location VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commissions (
  id VARCHAR(64) PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
  order_id VARCHAR(64) NOT NULL UNIQUE REFERENCES orders(id),
  calculation_base DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'RELEASED', 'PAID', 'CANCELLED')),
  rule_snapshot TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_rules (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  trigger_event VARCHAR(64) NOT NULL CHECK (trigger_event IN ('checkout_abandoned', 'pix_pending', 'payment_approved', 'order_shipped', 'order_delivered', 'repurchase_window')),
  delay_minutes INTEGER NOT NULL DEFAULT 15,
  channel VARCHAR(32) NOT NULL CHECK (channel IN ('WHATSAPP', 'EMAIL')),
  template_message TEXT NOT NULL,
  allowed_window_start VARCHAR(8) NOT NULL DEFAULT '08:00',
  allowed_window_end VARCHAR(8) NOT NULL DEFAULT '21:00',
  respect_opt_out BOOLEAN NOT NULL DEFAULT TRUE,
  max_executions_per_customer INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE automation_executions (
  id VARCHAR(64) PRIMARY KEY,
  rule_id VARCHAR(64) NOT NULL REFERENCES automation_rules(id),
  customer_id VARCHAR(64) REFERENCES customers(id),
  order_id VARCHAR(64) REFERENCES orders(id),
  status VARCHAR(32) NOT NULL CHECK (status IN ('SCHEDULED', 'SENT', 'SKIPPED_OPT_OUT', 'FAILED')),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id VARCHAR(64) PRIMARY KEY,
  recipient VARCHAR(160) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  subject VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  provider VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_reviews (
  id VARCHAR(64) PRIMARY KEY,
  target_type VARCHAR(32) NOT NULL CHECK (target_type IN ('PRODUCT', 'OFFER', 'LANDING_PAGE', 'AD', 'CREATIVE', 'COPY', 'TESTIMONIAL')),
  target_id VARCHAR(64) NOT NULL,
  target_title VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')),
  checklist_json TEXT NOT NULL,
  reviewer_id VARCHAR(64) REFERENCES users(id),
  reviewer_name VARCHAR(120),
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(120) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(64) NOT NULL,
  metadata TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
