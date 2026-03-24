// ═══════════════════════════════════════
// AIdark — Type Definitions v2
// src/types/index.ts
// FIXES v2:
//   [1] PlanType incluye TODOS los plan IDs (premium_* y aliases)
//   [2] ModelId expandido con más modelos Venice
// ═══════════════════════════════════════

// ── Chat ──
export type ModelId =
  | 'venice'
  | 'dark-grok'
  | 'void-x'
  | 'llama-fast'
  | 'llama-pro'
  | 'mistral';

export type CharacterId = 'default' | 'dark-grok' | 'void-x' | 'seductora' | 'detective';

export interface Model {
  id: ModelId;
  name: string;
  description: string;
  primary: boolean;
  badge?: string;
  premium?: boolean;
}

export interface AICharacter {
  id: CharacterId;
  name: string;
  avatar: string;
  color: string;
  role: string;
  premium: boolean;
  systemPrompt?: string;
}

export interface PromptItem {
  icon: string;
  label: string;
  prompt: string;
}

// ── Attachment (imagen o PDF) ──
export interface Attachment {
  type: 'image' | 'pdf';
  data: string;
  name: string;
  mimeType: string;
  preview?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: ModelId;
  character?: CharacterId;
  attachment?: Attachment;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: ModelId;
  created_at: number;
  updated_at: number;
}

// ── Auth & User ──
// FIX v2 [1]: Todos los plan IDs posibles (backend usa premium_*, frontend usa basic_/pro_/ultra_)
export type PlanType =
  | 'free'
  | 'basic_monthly'
  | 'pro_quarterly'
  | 'ultra_annual'
  | 'premium_monthly'
  | 'premium_quarterly'
  | 'premium_annual';

// Helper para verificar si un plan es premium (no free)
export function isPremiumPlan(plan: string | null | undefined): boolean {
  if (!plan) return false;
  const premiumPlans = new Set([
    'basic_monthly', 'pro_quarterly', 'ultra_annual',
    'premium_monthly', 'premium_quarterly', 'premium_annual',
  ]);
  return premiumPlans.has(plan);
}

export interface UserProfile {
  id: string;
  email: string;
  plan: PlanType;
  messages_used: number;
  messages_limit: number;
  created_at: string;
  plan_expires_at: string | null;
}

// ── API ──
export interface VeniceRequest {
  messages: { role: string; content: string | VeniceContentPart[] }[];
  model: ModelId;
  stream?: boolean;
}

export type VeniceContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface VeniceResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// ── Projects ──
export interface Project {
  id: string;
  name: string;
  icon: string;
  description?: string;
  chat_count: number;
}

// ── Pricing ──
export interface PricingPlan {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
  mercadopago_plan_id?: string;
}
