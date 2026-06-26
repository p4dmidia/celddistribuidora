-- Rollback Migration: Drop CELD Activation Logic (active_until)
-- Naming: 20260624_add_celd_activation_logic_rollback.sql

-- 1. Drop the trigger on orders table
DROP TRIGGER IF EXISTS trigger_handle_celd_activation ON public.orders;

-- 2. Drop the function to handle CELD activation
DROP FUNCTION IF EXISTS public.handle_celd_activation();
