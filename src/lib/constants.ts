// ═══════════════════════════════════════
// AIdark — Constants & Configuration
// src/lib/constants.ts
// MEJORA: 6 modelos de IA en el selector (antes 3)
// ═══════════════════════════════════════

import type { Model, PricingPlan, Project, AICharacter, PromptItem } from '@/types';
import { t } from '@/lib/i18n';

// Funciones para que t() se evalúe con el idioma actual en cada render
export function getModels(): Model[] {
  return [
    { id: 'venice', name: t('model.venice_name'), description: t('model.venice_desc'), primary: true, badge: '⭐' },
    { id: 'llama-fast', name: t('model.llama_fast_name'), description: t('model.llama_fast_desc'), primary: false, badge: '⚡' },
    { id: 'llama-pro', name: t('model.llama_pro_name'), description: t('model.llama_pro_desc'), primary: false, badge: '🧠', premium: true },
    { id: 'dark-grok', name: 'DARK-GROK', description: t('model.dark_grok_desc'), primary: false, badge: '💀' },
    { id: 'mistral', name: 'Mistral', description: t('model.mistral_desc'), primary: false, badge: '🌀' },
    { id: 'void-x', name: 'VOID-X', description: t('model.void_x_desc'), primary: false, badge: '🔲' },
  ];
}
// Backward compat: exportar también como constante (usa idioma al importar)
export const MODELS = getModels();

export function getCharacters(): AICharacter[] {
  return [
    { id: 'default',   name: 'AIdark',    avatar: 'A', color: '#8b7355', role: t('char.default_role'),   premium: false },
    { id: 'dark-grok', name: 'DARK-GROK', avatar: 'D', color: '#a0513b', role: t('char.dark_grok_role'), premium: false },
    { id: 'void-x',    name: 'VOID-X',    avatar: 'V', color: '#5a7a8b', role: t('char.void_x_role'),    premium: false },
    { id: 'seductora', name: 'LUNA',      avatar: 'L', color: '#b35a8c', role: t('char.luna_role'),      premium: true  },
    { id: 'detective', name: 'SHADOW',    avatar: 'S', color: '#6b8a5e', role: t('char.shadow_role'),    premium: true  },
  ];
}
export const AI_CHARACTERS = getCharacters();

export function getPromptGallery(): PromptItem[] {
  return [
    { icon: '📖', label: t('prompt.story'),    prompt: t('prompt.story_text') },
    { icon: '🔍', label: t('prompt.research'), prompt: t('prompt.research_text') },
    { icon: '💀', label: t('prompt.humor'),    prompt: t('prompt.humor_text') },
    { icon: '🔮', label: t('prompt.occult'),   prompt: t('prompt.occult_text') },
    { icon: '⚡', label: t('prompt.direct'),   prompt: t('prompt.direct_text') },
    { icon: '🎭', label: t('prompt.roleplay'), prompt: t('prompt.roleplay_text') },
  ];
}
export const PROMPT_GALLERY = getPromptGallery();

const DEFAULT_FREE_MESSAGE_LIMIT = Number(import.meta.env.VITE_FREE_MESSAGE_LIMIT) || 12;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    features: [`${DEFAULT_FREE_MESSAGE_LIMIT} consultas diarias`, '3 personajes', 'Chat básico'],
  },
  {
    id: 'basic_monthly',
    name: 'Basic',
    price: '$12',
    period: '/mes',
    features: ['Consultas ilimitadas', 'Todos los personajes', 'Historial 90 días', 'Imágenes (10/día)', 'Prioridad'],
    highlight: true,
  },
  {
    id: 'pro_quarterly',
    name: 'Pro',
    price: '$29.99',
    period: '/3 meses',
    features: ['Todo Basic', '~$10/mes', 'Imágenes anime (25/día)', 'Adjuntar archivos', 'Soporte prioritario'],
  },
  {
    id: 'ultra_annual',
    name: 'Ultra',
    price: '$99.99',
    period: '/año',
    features: ['Todo Pro', '~$8.33/mes', 'Imágenes (50/día)', 'Badge fundador', 'Primeros 1000'],
  },
];

export const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: 'Historias sin censura',   icon: 'book',  description: 'Novelas y relatos sin filtro',  chat_count: 0 },
  { id: 'p2', name: 'Investigación detallada', icon: 'flask', description: 'Temas profundos y censurados', chat_count: 0 },
  { id: 'p3', name: 'Recetas de conjuros',     icon: 'skull', description: 'Ocultismo y rituales',         chat_count: 0 },
];

export const APP_CONFIG = {
  name:             'AIdark',
  tagline:          'IA Sin Censura',
  version:          '0.3.0-beta',
  freeMessageLimit: DEFAULT_FREE_MESSAGE_LIMIT,
  freeCharLimit:    2000,
  appUrl:           import.meta.env.VITE_APP_URL || 'http://localhost:3000',
};
