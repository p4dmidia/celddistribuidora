-- Rollback Migration: CELD Activation Logic (Stage 1)
-- Naming: 20260624_celd_activation_stage_1_rollback.sql
-- Description: Drops trigger, function, and removes active_until columns added in Stage 1.

-- 1. Drop the trigger on orders table
DROP TRIGGER IF EXISTS trigger_handle_celd_activation ON public.orders;

-- 2. Drop the function to handle CELD activation
DROP FUNCTION IF EXISTS public.handle_celd_activation();

-- 3. Remove active_until columns from affiliates and user_settings tables (optional/cleanup)
ALTER TABLE public.affiliates DROP COLUMN IF EXISTS active_until;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS active_until;
