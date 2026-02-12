/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_MERCADOPAGO_PUBLIC_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_FREE_MESSAGE_LIMIT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}