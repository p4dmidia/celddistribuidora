-- Migration: Add active_until columns and CELD organization setup
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS active_until timestamp with time zone;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS active_until timestamp with time zone;

-- Create CELD organization
INSERT INTO public.organizations (id, name, domain) 
VALUES ('c01d919a-ce1d-4de5-b81d-c01d919ad151', 'CELD Distribuidora', 'celddistribuidora.com.br')
ON CONFLICT (id) DO NOTHING;

-- Update all existing records to use the new CELD organization ID
UPDATE public.affiliates SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.user_profiles SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.user_settings SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.products SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.product_categories SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.orders SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.commissions SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.withdrawals SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
UPDATE public.commission_configs SET organization_id = 'c01d919a-ce1d-4de5-b81d-c01d919ad151';
