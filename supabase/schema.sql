-- ═══════════════════════════════════════
-- AIdark — Supabase Database Schema
-- ═══════════════════════════════════════
-- Ejecuta este SQL en tu Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/TU_PROYECTO/sql

-- ── 1. Profiles table (extends auth.users) ──
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium_monthly', 'premium_quarterly', 'premium_annual')),
  messages_used INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 5,
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Chat sessions table ──
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT DEFAULT 'Nuevo chat',
  model TEXT DEFAULT 'venice',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Messages table ──
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Payments table (MercadoPago) ──
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  mercadopago_payment_id TEXT,
  mercadopago_preference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. Projects table ──
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. Auto-create profile on signup ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 7. Increment message count function ──
CREATE OR REPLACE FUNCTION public.increment_message_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET messages_used = messages_used + 1, updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Reset monthly message counts (run via cron) ──
CREATE OR REPLACE FUNCTION public.reset_free_message_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET messages_used = 0, updated_at = NOW()
  WHERE plan = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. Row Level Security (RLS) ──
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own sessions" ON public.chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own messages" ON public.messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- ── 10. Indexes for performance ──
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
