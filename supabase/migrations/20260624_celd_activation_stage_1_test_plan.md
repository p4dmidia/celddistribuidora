# Plano de Testes e Homologação - Ativação Automática CELD (Etapa 1)
-- Naming: 20260624_celd_activation_stage_1_test_plan.md

Este documento descreve os cenários de teste, casos de validação, fluxo de execução e scripts SQL práticos para homologação da ativação de 30 dias baseada no campo `active_until` de afiliados CELD.

---

## 1. Casos de Teste (Scenarios)

### Caso 1: Novo Afiliado / Cadastro Recém-Criado
* **Estado Inicial**:
  * Afiliado `A` possui `active_until IS NULL` e `is_active = false`.
* **Ação**:
  * Afiliado realiza o checkout e o pedido com valor total de R$ 300,00 é atualizado para status `'Pago'` (via webhook ou manual).
* **Resultado Esperado**:
  * O campo `active_until` em `public.affiliates` e `public.user_settings` é atualizado para a data/hora atual somado de exatamente 30 dias (`NOW() + INTERVAL '30 days'`).
  * O campo `is_active` em `public.affiliates` é atualizado para `true`.

### Caso 2: Afiliado Ativo (Renovação Antecipada)
* **Estado Inicial**:
  * Afiliado `B` está ativo e expira em 10 dias (ex: `active_until = NOW() + INTERVAL '10 days'`).
* **Ação**:
  * Afiliado compra a renovação mensal (R$ 300,00) e o pedido é marcado como `'Pago'`.
* **Resultado Esperado**:
  * O campo `active_until` em ambas as tabelas é incrementado em 30 dias adicionais a partir da data de expiração futura anterior (resultando em `NOW() + 40 dias`).

### Caso 3: Afiliado Expirado (Renovação Atrasada)
* **Estado Inicial**:
  * Afiliado `C` teve sua conta expirada há 5 dias (ex: `active_until = NOW() - INTERVAL '5 days'`).
* **Ação**:
  * Afiliado realiza o pagamento da mensalidade de R$ 300,00.
* **Resultado Esperado**:
  * Como a data expirou, a nova ativação deve contar a partir do dia do pagamento.
  * O campo `active_until` é atualizado para `NOW() + INTERVAL '30 days'` (e **não** a partir da data vencida de 5 dias atrás).

### Caso 4: Pedido de Outros Itens (Não Cesta Básica)
* **Estado Inicial**:
  * Afiliado `D` possui status inativo.
* **Ação**:
  * É criado e pago um pedido contendo produtos avulsos ou de outros valores (qualquer valor diferente de R$ 300,00 e sem menção à Cesta).
* **Resultado Esperado**:
  * O trigger executa a verificação, mas o status de ativação (`active_until` e `is_active`) do afiliado permanece inalterado.

### Caso 5: Transições de Status Diferentes de 'Pago'
* **Estado Inicial**:
  * Pedido é criado com status `'Pendente'`.
* **Ação**:
  * O status do pedido muda para `'Cancelado'`, `'Preparando'` ou retorna de `'Pago'` para `'Pendente'`.
* **Resultado Esperado**:
  * O trigger não altera as datas de ativação do afiliado (garantindo proteção contra fraudes ou atualizações indesejadas de status).

---

## 2. Fluxo de Execução Técnica

Abaixo está o fluxo passo a passo de como as tabelas e objetos de banco se comportam:

```
[Cliente realiza checkout R$ 300]
               │
               ▼
   [Pedido criado com status 'Pendente']
               │
               ▼
 [Mercado Pago webhook confirma pagamento]
               │
               ▼
[Update status do pedido -> 'Pago']
               │
               ▼
[Disparo da trigger: trigger_handle_celd_activation]
               │
               ▼
[Execução de public.handle_celd_activation()]
               │
               ├─► [Se NÃO for Cesta Básica (R$ 300) ──► FIM (Ignora)]
               │
               └─► [Se Cesta Básica (R$ 300)]
                           │
                           ▼
            [Lê data active_until atual]
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
      [Se NULL ou Expira hoje/passado] [Se Expira no Futuro]
               │                       │
               ▼                       ▼
    [Define active_until:       [Define active_until:
       NOW() + 30 dias]           active_until + 30 dias]
               │                       │
               └───────────┬───────────┘
                           ▼
          [Grava active_until em affiliates]
          [Grava active_until em user_settings]
                           │
                           ▼
                         [FIM]
```

---

## 3. Scripts SQL para Verificação Manual (Playbook)

Você pode rodar os scripts abaixo em sequência no editor SQL do Supabase para validar a lógica em um usuário e pedido de testes.

### Passo A: Criar Massa de Dados para Teste
```sql
-- 1. Obter ou Criar Organização CELD
INSERT INTO public.organizations (id, name, domain)
VALUES ('c01d919a-ce1d-4de5-b81d-c01d919ad151', 'CELD Distribuidora', 'celddistribuidora.com.br')
ON CONFLICT (id) DO NOTHING;

-- 2. Criar um Usuário de Teste em user_profiles, affiliates e user_settings
-- Usar um ID fictício para testes
DO $$
DECLARE
    v_test_user_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    INSERT INTO public.user_profiles (id, email, role, organization_id)
    VALUES (v_test_user_id, 'teste_ativacao@celd.com.br', 'affiliate', 'c01d919a-ce1d-4de5-b81d-c01d919ad151')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.affiliates (user_id, email, full_name, referral_code, organization_id, is_active, active_until)
    VALUES (v_test_user_id, 'teste_ativacao@celd.com.br', 'Afiliado Teste Ativação', 'TESTEACTIV', 'c01d919a-ce1d-4de5-b81d-c01d919ad151', false, NULL)
    ON CONFLICT (user_id) DO UPDATE SET active_until = NULL, is_active = false;

    INSERT INTO public.user_settings (user_id, organization_id, active_until)
    VALUES (v_test_user_id, 'c01d919a-ce1d-4de5-b81d-c01d919ad151', NULL)
    ON CONFLICT (user_id) DO UPDATE SET active_until = NULL;
    
    -- Criar produto Cesta Básica CELD (R$ 300)
    INSERT INTO public.products (id, organization_id, name, price, description)
    VALUES ('99999999-9999-9999-9999-999999999999', 'c01d919a-ce1d-4de5-b81d-c01d919ad151', 'Plano Único Cesta CELD', 300.00, 'Ativação CELD')
    ON CONFLICT (id) DO NOTHING;
END $$;
```

### Passo B: Simular Caso 1 (Novo Afiliado - NULL -> 30 Dias)
```sql
-- 1. Criar pedido Pendente
INSERT INTO public.orders (id, organization_id, user_id, customer_name, customer_email, total_amount, status)
VALUES ('ORD-TEST-001', 'c01d919a-ce1d-4de5-b81d-c01d919ad151', '00000000-0000-0000-0000-000000000001', 'Afiliado Teste Ativação', 'teste_ativacao@celd.com.br', 300.00, 'Pendente')
ON CONFLICT (id) DO UPDATE SET status = 'Pendente';

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES ('ORD-TEST-001', '99999999-9999-9999-9999-999999999999', 1, 300.00)
ON CONFLICT DO NOTHING;

-- 2. Atualizar status para 'Pago'
UPDATE public.orders SET status = 'Pago' WHERE id = 'ORD-TEST-001';

-- 3. Verificar resultado (Deve ser NOW() + 30 dias)
SELECT user_id, is_active, active_until FROM public.affiliates WHERE user_id = '00000000-0000-0000-0000-000000000001';
SELECT user_id, active_until FROM public.user_settings WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

### Passo C: Simular Caso 2 (Ativo - Renovação Antecipada)
```sql
-- 1. Definir manualmente active_until para daqui a 10 dias no futuro
UPDATE public.affiliates SET active_until = NOW() + INTERVAL '10 days' WHERE user_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.user_settings SET active_until = NOW() + INTERVAL '10 days' WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 2. Criar novo pedido Pendente e atualizar para Pago
INSERT INTO public.orders (id, organization_id, user_id, customer_name, customer_email, total_amount, status)
VALUES ('ORD-TEST-002', 'c01d919a-ce1d-4de5-b81d-c01d919ad151', '00000000-0000-0000-0000-000000000001', 'Afiliado Teste Ativação', 'teste_ativacao@celd.com.br', 300.00, 'Pendente')
ON CONFLICT (id) DO UPDATE SET status = 'Pendente';

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES ('ORD-TEST-002', '99999999-9999-9999-9999-999999999999', 1, 300.00)
ON CONFLICT DO NOTHING;

UPDATE public.orders SET status = 'Pago' WHERE id = 'ORD-TEST-002';

-- 3. Verificar resultado (Deve ser NOW() + 40 dias)
SELECT user_id, is_active, active_until FROM public.affiliates WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

### Passo D: Simular Caso 3 (Vencido - Renovação Atrasada)
```sql
-- 1. Definir manualmente active_until vencido há 5 dias no passado
UPDATE public.affiliates SET active_until = NOW() - INTERVAL '5 days' WHERE user_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.user_settings SET active_until = NOW() - INTERVAL '5 days' WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- 2. Criar novo pedido Pendente e atualizar para Pago
INSERT INTO public.orders (id, organization_id, user_id, customer_name, customer_email, total_amount, status)
VALUES ('ORD-TEST-003', 'c01d919a-ce1d-4de5-b81d-c01d919ad151', '00000000-0000-0000-0000-000000000001', 'Afiliado Teste Ativação', 'teste_ativacao@celd.com.br', 300.00, 'Pendente')
ON CONFLICT (id) DO UPDATE SET status = 'Pendente';

INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
VALUES ('ORD-TEST-003', '99999999-9999-9999-9999-999999999999', 1, 300.00)
ON CONFLICT DO NOTHING;

UPDATE public.orders SET status = 'Pago' WHERE id = 'ORD-TEST-003';

-- 3. Verificar resultado (Deve ser NOW() + 30 dias, desconsiderando os 5 dias vencidos)
SELECT user_id, is_active, active_until FROM public.affiliates WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

### Limpeza dos dados de Teste:
```sql
-- Excluir pedidos de teste e usuário de teste criados
DELETE FROM public.order_items WHERE order_id IN ('ORD-TEST-001', 'ORD-TEST-002', 'ORD-TEST-003');
DELETE FROM public.orders WHERE id IN ('ORD-TEST-001', 'ORD-TEST-002', 'ORD-TEST-003');
DELETE FROM public.user_settings WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.affiliates WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.user_profiles WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM public.products WHERE id = '99999999-9999-9999-9999-999999999999';
```
