-- Migration: Add CELD Activation Logic (active_until)
-- Naming: 20260624_add_celd_activation_logic.sql

-- 1. Create or replace the function to handle CELD activation
CREATE OR REPLACE FUNCTION public.handle_celd_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_celd_plan boolean := false;
    v_current_active_until timestamp with time zone;
    v_new_active_until timestamp with time zone;
BEGIN
    -- Only process if status transitioned to 'Pago'
    IF (OLD.status <> 'Pago' AND NEW.status = 'Pago') THEN
        
        -- Check if any order item is the R$ 300 plan or category/name contains 'Cesta'
        SELECT EXISTS (
            SELECT 1 FROM public.order_items oi
            JOIN public.products p ON oi.product_id = p.id
            LEFT JOIN public.product_categories pc ON p.category_id = pc.id
            WHERE oi.order_id = NEW.id
            AND (oi.unit_price = 300.00 OR p.price = 300.00 OR p.name ILIKE '%Cesta%' OR pc.name ILIKE '%Cesta%')
        ) INTO v_is_celd_plan;

        -- If it is the CELD activation plan and we have a valid user
        IF v_is_celd_plan AND NEW.user_id IS NOT NULL THEN
            -- Retrieve the current expiration date
            SELECT active_until INTO v_current_active_until 
            FROM public.affiliates 
            WHERE user_id = NEW.user_id 
            AND organization_id = NEW.organization_id
            LIMIT 1;

            -- Calculate the new expiration date:
            -- If currently active (future date), extend by 30 days from current expiration.
            -- If inactive/expired or null, set to 30 days from now.
            IF v_current_active_until IS NOT NULL AND v_current_active_until >= NOW() THEN
                v_new_active_until := v_current_active_until + INTERVAL '30 days';
            ELSE
                v_new_active_until := NOW() + INTERVAL '30 days';
            END IF;

            -- Update the affiliates record
            UPDATE public.affiliates 
            SET 
                active_until = v_new_active_until,
                is_active = true,
                updated_at = NOW()
            WHERE user_id = NEW.user_id 
            AND organization_id = NEW.organization_id;

            -- Update the user_settings record
            UPDATE public.user_settings 
            SET 
                active_until = v_new_active_until,
                updated_at = NOW()
            WHERE user_id = NEW.user_id 
            AND organization_id = NEW.organization_id;
            
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Create the trigger on orders table
DROP TRIGGER IF EXISTS trigger_handle_celd_activation ON public.orders;
CREATE TRIGGER trigger_handle_celd_activation
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    WHEN (OLD.status <> 'Pago' AND NEW.status = 'Pago')
    EXECUTE FUNCTION public.handle_celd_activation();
