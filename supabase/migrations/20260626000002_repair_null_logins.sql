-- Migration: Repair Null Logins
-- Naming: 20260626000002_repair_null_logins.sql
-- Description: Repairs any user profiles that were created with NULL login/full_name/whatsapp during the trigger mismatch by pulling the values from the affiliates table.

UPDATE public.user_profiles up
SET login = LOWER(a.referral_code),
    full_name = a.full_name,
    whatsapp = a.whatsapp
FROM public.affiliates a
WHERE up.id = a.user_id
AND up.login IS NULL;
