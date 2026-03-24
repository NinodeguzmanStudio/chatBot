-- ═══════════════════════════════════════
-- AIdark — Schema Migrations v2
-- supabase/schema.sql
-- NEW v2:
--   [1] payments.amount_usd — precio original en USD
--   [2] payments.exchange_rate — tipo de cambio usado
--   Esto permite auditar pagos multi-moneda
-- ═══════════════════════════════════════

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','premium_monthly','premium_quarterly','premium_annual','basic_monthly','pro_quarterly','ultra_annual'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS images_today INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS images_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS character TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- NEW v2: Columnas para soporte multi-moneda
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(10,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(12,4);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Safe: CREATE POLICY IF NOT EXISTS no existe en PG, usamos DO block
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own push subscriptions') THEN
    CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

UPDATE public.profiles SET referral_code = UPPER(SUBSTRING(MD5(id::text) FROM 1 FOR 8)) WHERE referral_code IS NULL;
