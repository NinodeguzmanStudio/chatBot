// ═══════════════════════════════════════
// AIdark — Type Definitions (+ ATTACHMENTS)
// ═══════════════════════════════════════

// ── Chat ──
export type ModelId = 'venice' | 'dark-grok' | 'void-x';
export type CharacterId = 'default' | 'dark-grok' | 'void-x' | 'seductora' | 'detective';

export interface Model {
  id: ModelId;
  name: string;
  description: string;
  primary: boolean;
}

export interface AICharacter {
  id: CharacterId;
  name: string;
  avatar: string;
  color: string;
  role: string;
  premium: boolean;
  systemPrompt: string;
}

export interface PromptItem {
  icon: string;
  label: string;
  prompt: string;
}

// ── Attachment (imagen o PDF) ──
export interface Attachment {
  type: 'image' | 'pdf';
  data: string;       // base64 para imágenes, texto extraído para PDFs
  name: string;        // nombre del archivo
  mimeType: string;    // image/jpeg, image/png, application/pdf, etc.
  preview?: string;    // base64 thumbnail para mostrar en el chat
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: ModelId;
  character?: CharacterId;
  attachment?: Attachment;  // ← NUEVO
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
export type PlanType = 'free' | 'premium_monthly' | 'premium_quarterly' | 'premium_annual';

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

// Venice/OpenAI multimodal content parts
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
