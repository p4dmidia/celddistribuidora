-- Migration: Login and Activation Fixes
-- Naming: 20260626000000_login_and_activation_fixes.sql
-- Description: Adds select policy on user_profiles and affiliates for anonymous users (enabling login/registration lookup) and shifts default activation behavior to 'false'.

-- 1. Permissões de Leitura Pública (anon) para possibilitar o login e cadastro
DROP POLICY IF EXISTS "Permitir_Busca_Login_Profiles" ON public.user_profiles;
CREATE POLICY "Permitir_Busca_Login_Profiles" ON public.user_profiles 
FOR SELECT TO anon 
USING (true);

DROP POLICY IF EXISTS "Permitir_Busca_Login_Publico" ON public.affiliates;
CREATE POLICY "Permitir_Busca_Login_Publico" ON public.affiliates 
FOR SELECT TO anon 
USING (true);

-- 2. Alterar o valor default da coluna is_active para false nas duas tabelas
ALTER TABLE public.user_profiles ALTER COLUMN is_active SET DEFAULT false;
ALTER TABLE public.affiliates ALTER COLUMN is_active SET DEFAULT false;

-- 3. Atualizar a função do trigger handle_new_affiliate_user para cadastrar novos usuários como INATIVOS (false)
-- Isso obriga o usuário a comprar o plano/cesta CELD para ser ativado (active_until + is_active = true)
CREATE OR REPLACE FUNCTION public.handle_new_affiliate_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 AS $function$
 DECLARE
   v_full_name text;
   v_sponsor_id uuid;
   v_org_id uuid;
   v_sponsor_code text;
   v_error_msg text;
 BEGIN
   -- A. Log de Entrada
   INSERT INTO public.debug_logs (operation, message, metadata) 
   VALUES ('signup_start', 'Tentativa de cadastro: ' || new.email, new.raw_user_meta_data);

   -- B. Determinar Nome Completo
   v_full_name := TRIM(CONCAT_WS(' ', new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'sobrenome'));
   IF v_full_name = '' THEN v_full_name := 'Novo Afiliado'; END IF;

   -- C. Determinar Organização (Obrigatório e Estrito)
   BEGIN
     v_org_id := (new.raw_user_meta_data ->> 'organization_id')::uuid;
   EXCEPTION WHEN OTHERS THEN
     v_org_id := NULL;
   END;

   -- Fallback apenas se não vier no metadado
   IF v_org_id IS NULL THEN
      SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Classe A' LIMIT 1;
   END IF;

   -- D. Resolver ID do Padrinho (Sponsor) - APENAS NA MESMA ORGANIZAÇÃO
   v_sponsor_code := NULLIF(new.raw_user_meta_data ->> 'sponsor_code', '');
   
   IF v_sponsor_code IS NOT NULL THEN
     SELECT id INTO v_sponsor_id 
     FROM public.affiliates 
     WHERE LOWER(referral_code) = LOWER(v_sponsor_code)
     AND organization_id = v_org_id
     LIMIT 1;

     IF v_sponsor_id IS NOT NULL THEN
        INSERT INTO public.debug_logs (operation, message) 
        VALUES ('signup_sponsor_found', 'Padrinho vinculado com sucesso: ' || v_sponsor_code || ' na org: ' || v_org_id);
     ELSE
        INSERT INTO public.debug_logs (operation, message) 
        VALUES ('signup_warning', 'Padrinho NÃO CONECTADO: O código ' || v_sponsor_code || ' não pertence a esta organização.');
     END IF;
   END IF;

   -- E. Criar Perfil do Usuário
   BEGIN
     INSERT INTO public.user_profiles (id, email, role, cpf, cnpj, registration_type, organization_id, sponsor_id, created_at, updated_at)
     VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data ->> 'role', 'affiliate'), new.raw_user_meta_data ->> 'cpf', new.raw_user_meta_data ->> 'cnpj', new.raw_user_meta_data ->> 'registration_type', v_org_id, v_sponsor_id, new.created_at, new.created_at);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
     RAISE EXCEPTION 'Erro ao criar perfil CELD: %', v_error_msg;
   END;

   -- F. Criar Registro de Afiliado (is_active = false)
   BEGIN
     INSERT INTO public.affiliates (user_id, email, full_name, referral_code, cpf, cnpj, whatsapp, organization_id, sponsor_id, is_active, created_at, updated_at)
     VALUES (new.id, new.email, v_full_name, new.raw_user_meta_data ->> 'login', new.raw_user_meta_data ->> 'cpf', new.raw_user_meta_data ->> 'cnpj', new.raw_user_meta_data ->> 'whatsapp', v_org_id, v_sponsor_id, false, new.created_at, new.updated_at);
   EXCEPTION WHEN OTHERS THEN
     GET STACKED DIAGNOSTICS v_error_msg = MESSAGE_TEXT;
     RAISE EXCEPTION 'Erro ao criar afiliado CELD: %', v_error_msg;
   END;

   -- G. Criar Configurações Iniciais
   BEGIN
     INSERT INTO public.user_settings (user_id, organization_id, created_at, updated_at)
     VALUES (new.id, v_org_id, new.created_at, new.created_at);
   EXCEPTION WHEN OTHERS THEN NULL; END;
   
   RETURN new;
 END;
 $function$;
