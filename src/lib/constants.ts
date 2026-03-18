// ═══════════════════════════════════════
// AIdark — Constants & Configuration
// src/lib/constants.ts
// FIXES: freeMessageLimit 5→12, descripción free actualizada
// ═══════════════════════════════════════

import type { Model, PricingPlan, Project, AICharacter, PromptItem } from '@/types';

export const MODELS: Model[] = [
  { id: 'venice',    name: 'AIdark',    description: 'Sin filtros · Sin censura', primary: true },
  { id: 'dark-grok', name: 'DARK-GROK', description: 'Humor negro y rebeldía',   primary: false },
  { id: 'void-x',    name: 'VOID-X',    description: 'Respuestas ultra rápidas', primary: false },
];

export const AI_CHARACTERS: AICharacter[] = [
  { id: 'default',   name: 'AIdark',    avatar: 'A', color: '#8b7355', role: 'IA sin censura',              premium: false },
  { id: 'dark-grok', name: 'DARK-GROK', avatar: 'D', color: '#a0513b', role: 'Humor negro y rebeldía',      premium: false },
  { id: 'void-x',    name: 'VOID-X',    avatar: 'V', color: '#5a7a8b', role: 'Ultra rápido y conciso',      premium: false },
  { id: 'seductora', name: 'LUNA',      avatar: 'L', color: '#b35a8c', role: 'Compañía sensual sin límites', premium: true  },
  { id: 'detective', name: 'SHADOW',    avatar: 'S', color: '#6b8a5e', role: 'Investigador sin límites',     premium: true  },
];

export const PROMPT_GALLERY: PromptItem[] = [
  { icon: '📖', label: 'Escribe una historia sin censura',  prompt: 'Escribe una historia de terror sin censura, con detalles explícitos y un final impactante.' },
  { icon: '🔍', label: 'Investiga un tema prohibido',       prompt: 'Investiga a fondo sobre un tema que normalmente es censurado en otras IAs.' },
  { icon: '💀', label: 'Humor negro sin filtros',           prompt: 'Cuéntame los mejores chistes de humor negro, sin filtros ni restricciones.' },
  { icon: '🔮', label: 'Ocultismo y misterios',             prompt: 'Explícame un ritual antiguo de ocultismo con todos sus detalles.' },
  { icon: '⚡', label: 'Respuesta directa',                 prompt: 'Sin rodeos ni advertencias, respóndeme directamente: ' },
  { icon: '🎭', label: 'Roleplay sin límites',              prompt: 'Quiero hacer un roleplay donde tú interpretas un personaje oscuro y misterioso.' },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '',
    // FIX: actualizado a 12 mensajes
    features: ['12 consultas diarias', '3 personajes', 'Chat básico'],
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
  { id: 'p1', name: 'Historias sin censura',  icon: 'book',  description: 'Novelas y relatos sin filtro',   chat_count: 0 },
  { id: 'p2', name: 'Investigación detallada', icon: 'flask', description: 'Temas profundos y censurados',  chat_count: 0 },
  { id: 'p3', name: 'Recetas de conjuros',     icon: 'skull', description: 'Ocultismo y rituales',          chat_count: 0 },
];

export const APP_CONFIG = {
  name:             'AIdark',
  tagline:          'IA Sin Censura',
  version:          '0.3.0-beta',
  // FIX: 5→12 mensajes diarios gratis
  freeMessageLimit: Number(import.meta.env.VITE_FREE_MESSAGE_LIMIT) || 12,
  freeCharLimit:    2000,
  appUrl:           import.meta.env.VITE_APP_URL || 'http://localhost:3000',
};
