-- AIdark runtime fix
-- Ejecutar este archivo en Supabase SQL Editor sobre la base existente.
-- Añade soporte para:
--   - tracking de producto
--   - logs permanentes de mensajes
--   - watchlist/admin
--   - rate limit
--   - funciones RPC usadas por la app

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS messages_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS messages_limit INTEGER DEFAULT 12;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pdfs_today INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pdfs_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT;

UPDATE public.profiles
SET messages_limit = 12
WHERE COALESCE(messages_limit, 0) <= 0;

CREATE TABLE IF NOT EXISTS public.app_admins (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.app_admins (email)
VALUES ('ninodeguzmanstudio@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

CREATE TABLE IF NOT EXISTS public.admin_watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id TEXT NOT NULL UNIQUE,
  session_id TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content TEXT,
  model TEXT,
  character TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_from_chat BOOLEAN DEFAULT FALSE,
  is_admin_inject BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_message_logs_user_created
  ON public.message_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_logs_session_created
  ON public.message_logs (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_user_created
  ON public.chat_rate_limits (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.product_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  plan TEXT,
  device_id TEXT,
  path TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON public.product_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON public.product_events (event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  month_granted BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON public.referrals (referrer_id, status);

-- En instalaciones viejas estas RPC pueden existir con otro tipo de retorno.
-- Postgres no permite cambiar RETURNS con CREATE OR REPLACE, así que las
-- recreamos explícitamente para que la migración sea compatible.
DROP FUNCTION IF EXISTS public.increment_message_count(UUID);
CREATE OR REPLACE FUNCTION public.increment_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET
    messages_used = COALESCE(messages_used, 0) + 1,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING messages_used INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

DROP FUNCTION IF EXISTS public.reset_free_message_counts();
CREATE OR REPLACE FUNCTION public.reset_free_message_counts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.profiles
  SET
    messages_used = 0,
    updated_at = NOW()
  WHERE plan = 'free';

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

DROP FUNCTION IF EXISTS public.check_rate_limit(UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_window_seconds INTEGER,
  p_max_messages INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_count INTEGER;
  safe_window INTEGER := GREATEST(COALESCE(p_window_seconds, 60), 1);
  safe_max INTEGER := GREATEST(COALESCE(p_max_messages, 10), 1);
BEGIN
  DELETE FROM public.chat_rate_limits
  WHERE user_id = p_user_id
    AND created_at < NOW() - make_interval(secs => safe_window);

  SELECT COUNT(*)
  INTO recent_count
  FROM public.chat_rate_limits
  WHERE user_id = p_user_id
    AND created_at >= NOW() - make_interval(secs => safe_window);

  IF recent_count >= safe_max THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.chat_rate_limits (user_id) VALUES (p_user_id);
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.message_logs (
    original_id,
    session_id,
    user_id,
    role,
    content,
    model,
    character,
    created_at
  )
  VALUES (
    NEW.id::text,
    NEW.session_id::text,
    NEW.user_id,
    NEW.role,
    NEW.content,
    NEW.model,
    NEW.character,
    COALESCE(NEW.created_at, NOW())
  )
  ON CONFLICT (original_id) DO UPDATE
  SET
    session_id = EXCLUDED.session_id,
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    content = EXCLUDED.content,
    model = EXCLUDED.model,
    character = EXCLUDED.character;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_message_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.message_logs
  SET deleted_from_chat = TRUE
  WHERE original_id = OLD.id::text;

  RETURN OLD;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_message_logs_insert'
  ) THEN
    CREATE TRIGGER trg_message_logs_insert
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.log_message_insert();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_message_logs_delete'
  ) THEN
    CREATE TRIGGER trg_message_logs_delete
    BEFORE DELETE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.log_message_delete();
  END IF;
END $$;

ALTER TABLE public.admin_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage watchlist') THEN
    CREATE POLICY "Admins manage watchlist"
    ON public.admin_watchlist
    FOR ALL
    USING (public.is_admin_email())
    WITH CHECK (public.is_admin_email());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read message logs') THEN
    CREATE POLICY "Admins read message logs"
    ON public.message_logs
    FOR SELECT
    USING (public.is_admin_email());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins read product events') THEN
    CREATE POLICY "Admins read product events"
    ON public.product_events
    FOR SELECT
    USING (public.is_admin_email());
  END IF;
END $$;

